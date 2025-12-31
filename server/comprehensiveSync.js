import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncPTOBalancesFromSheets } from './googleSheetsSync.js';
import { syncAbsenteeismFromSheets as syncAbsenteeismGrid } from './absenteeismParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

/**
 * Helper function to safely parse JSON files (removes BOM)
 */
function safeJsonParse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  return JSON.parse(cleanContent);
}

/**
 * Get authenticated Google Sheets client
 */
async function getAuthClient() {
  const credentials = safeJsonParse(CREDENTIALS_PATH);
  
  if (credentials.type === 'service_account') {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    return auth.getClient();
  }
  throw new Error('Service account credentials required');
}

/**
 * Generic function to sync any sheet by name
 */
async function syncSheetByName(sheets, spreadsheetId, sheetName, label) {
  try {
    console.log(`Syncing ${label} from sheet: ${sheetName}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log(`No data found in ${label}`);
      return [];
    }

    // Determine header row based on sheet type
    let headerRowIndex = 0;
    let dataStartIndex = 1;
    
    // Leave Tracker has headers in row 2 (row 1 is "June/July")
    if (label === 'Leave Tracker' && rows[0]?.length === 1) {
      headerRowIndex = 1;
      dataStartIndex = 2;
    }

    const headers = rows[headerRowIndex]?.map(h => h?.toLowerCase().trim()) || [];
    const data = rows.slice(dataStartIndex);

    const parsed = data.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      return record;
    }).filter(r => {
      // Filter out empty rows - must have at least a name field
      return r.name || r.surname || r['team member'] || r['team member name'] || r['employee name'] || r['name of absentee'];
    });

    console.log(`✓ ${label}: Found ${parsed.length} records`);
    return parsed;
  } catch (error) {
    console.error(`Error syncing ${label} (${sheetName}):`, error.message);
    return [];
  }
}

/**
 * Sync all 4 tabs from the CSP's Google Sheet
 */
export async function syncAllSheets(spreadsheetId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('Starting comprehensive sync from Google Sheets...');
    
    // First, get all available sheet names
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const availableSheets = spreadsheetMeta.data.sheets.map(s => s.properties.title);
    console.log('Available sheets:', availableSheets);
    
    // Map common tab name variations to their actual names in the spreadsheet
    const sheetMap = {
      teamMembers: availableSheets.find(name => 
        /team.*member.*work|team.*details|team.*member/i.test(name)
      ) || availableSheets[0],
      leaveTracker: availableSheets.find(name => 
        /leave.*track|leave.*request|leave/i.test(name)
      ) || availableSheets[1],
      absenteeism: availableSheets.find(name => 
        /absent|input.*spread/i.test(name)
      ) || availableSheets[0],
      pto: availableSheets.find(name => 
        /pto.*update|pto|time.*off/i.test(name)
      ) || availableSheets[2]
    };
    
    console.log('Detected sheet mapping:', sheetMap);
    
    // Sync all tabs using detected names
    const [teamMembersData, leaveTrackerData, absenteeismData, ptoData] = await Promise.all([
      syncSheetByName(sheets, spreadsheetId, sheetMap.teamMembers, 'Team Members'),
      syncSheetByName(sheets, spreadsheetId, sheetMap.leaveTracker, 'Leave Tracker'),
      syncSheetByName(sheets, spreadsheetId, sheetMap.absenteeism, 'Absenteeism'),
      syncSheetByName(sheets, spreadsheetId, sheetMap.pto, 'PTO')
    ]);

    // Sync PTO balances from "PTO Update" sheet with monthly tracking
    console.log('Syncing detailed PTO balances from Google Sheets...');
    const ptoSyncResult = await syncPTOBalancesFromSheets(spreadsheetId, 'PTO Update!A2:BJ');
    console.log(`✓ PTO Balances: Synced ${ptoSyncResult.count} employees`);

    // Sync absenteeism grid data
    console.log('Syncing absenteeism tracker (grid format)...');
    const absenteeismSyncResult = await syncAbsenteeismGrid(spreadsheetId, 'Absenteesim tracker !A1:AH1000');
    console.log(`✓ Absenteeism Grid: Synced ${absenteeismSyncResult.count} records`);

    // Cross-reference and enrich data
    const enrichedTeamMembers = enrichTeamMemberData(
      teamMembersData,
      leaveTrackerData,
      absenteeismData,
      ptoData
    );

    // Save enriched data
    fs.writeFileSync(
      path.join(__dirname, 'teamMembers.json'),
      JSON.stringify(enrichedTeamMembers, null, 2)
    );

    // Save leave requests with approval history
    const approvalHistory = buildApprovalHistory(leaveTrackerData);
    fs.writeFileSync(
      path.join(__dirname, 'approvalHistory.json'),
      JSON.stringify(approvalHistory, null, 2)
    );

    // Save absenteeism records
    fs.writeFileSync(
      path.join(__dirname, 'absenteeismRecords.json'),
      JSON.stringify(absenteeismData, null, 2)
    );

    console.log('✅ Comprehensive sync completed successfully');
    console.log(`- Team Members: ${enrichedTeamMembers.length}`);
    console.log(`- Leave Requests: ${leaveTrackerData.length}`);
    console.log(`- Absenteeism Records: ${absenteeismData.length}`);
    console.log(`- Absenteeism Grid: ${absenteeismSyncResult.count}`);
    console.log(`- PTO Balances: ${ptoSyncResult.count}`);
    console.log(`- Approval History: ${approvalHistory.length}`);

    return {
      success: true,
      stats: {
        teamMembers: enrichedTeamMembers.length,
        leaveRequests: leaveTrackerData.length,
        absenteeismRecords: absenteeismData.length,
        absenteeismGrid: absenteeismSyncResult.count,
        ptoBalances: ptoSyncResult.count,
        approvalHistory: approvalHistory.length
      }
    };
  } catch (error) {
    console.error('Error in comprehensive sync:', error);
    throw error;
  }
}

/**
 * Enrich team member data by combining all sources
 */
function enrichTeamMemberData(teamData, leaveData, absenteeismData, ptoData) {
  const teamMemberMap = new Map();

  // Start with team member work details
  teamData.forEach(member => {
    const name = member.name || member['team member'] || member['team member name'] || member['employee name'];
    if (!name) return;

    teamMemberMap.set(name, {
      id: member['employee id'] || member.id || `TM${Date.now()}${Math.random()}`,
      name: name,
      email: member['email address'] || member.email || `${name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      department: member.department || 'Unassigned',
      role: member.role || member.position || 'Team Member',
      status: 'available',
      supervisor: member.supervisor || member.csp || member['csp name'],
      client: member['client name'] || member.client,
      joinDate: member['join date'] || member['start date'] || member.startdate,
      ptoBalance: {
        accrued: 20,
        used: 0,
        remaining: 20
      }
    });
  });

  // Enrich with PTO data
  ptoData.forEach(pto => {
    const name = pto.name || pto['employee name'];
    if (!name || !teamMemberMap.has(name)) return;

    const member = teamMemberMap.get(name);
    member.ptoBalance = {
      accrued: parseInt(pto.accrued || pto['pto accrued'] || 20),
      used: parseInt(pto.used || pto['pto used'] || 0),
      remaining: parseInt(pto.remaining || pto.balance || 20)
    };
  });

  // Update status based on leave tracker
  const currentDate = new Date();
  leaveData.forEach(leave => {
    // Combine name and surname for Leave Tracker
    const firstName = leave.name || '';
    const lastName = leave.surname || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const name = fullName || leave['employee name'] || leave['team member'];
    if (!name || !teamMemberMap.has(name)) return;

    const startDate = new Date(leave['start of leave'] || leave['start date'] || leave.startdate);
    const endDate = new Date(leave['end of leave'] || leave['end date'] || leave.enddate);
    
    if (startDate <= currentDate && endDate >= currentDate) {
      const member = teamMemberMap.get(name);
      member.status = 'on-leave';
      member.currentLeave = {
        type: leave['leave type'] || leave.type,
        startDate: leave['start of leave'] || leave['start date'],
        endDate: leave['end of leave'] || leave['end date'],
        days: leave['number of days taken'] || leave.days || leave['no. of days']
      };
    }
  });

  // Calculate absenteeism stats
  const absenteeismMap = new Map();
  absenteeismData.forEach(record => {
    const name = record['name of absentee'] || record.name;
    if (!name) return;

    if (!absenteeismMap.has(name)) {
      absenteeismMap.set(name, { count: 0, unauthorised: 0 });
    }
    const stats = absenteeismMap.get(name);
    stats.count++;
    if (record['absenteeism authorised?']?.toLowerCase() === 'no') {
      stats.unauthorised++;
    }
  });

  absenteeismMap.forEach((stats, name) => {
    if (teamMemberMap.has(name)) {
      const member = teamMemberMap.get(name);
      member.absenteeismStats = stats;
    }
  });

  return Array.from(teamMemberMap.values());
}

/**
 * Build approval history from leave tracker
 */
function buildApprovalHistory(leaveData) {
  return leaveData
    .filter(leave => {
      const firstName = leave.name || '';
      const lastName = leave.surname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const name = fullName || leave['employee name'] || leave['team member'];
      return name && (leave['approved/ declined'] || leave.status || leave.approved);
    })
    .map((leave, index) => {
      const firstName = leave.name || '';
      const lastName = leave.surname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      return {
        id: `AH${String(index + 1).padStart(4, '0')}`,
        employeeName: fullName || leave['employee name'] || leave['team member'],
        leaveType: leave['leave type'] || leave.type || 'Leave',
        startDate: leave['start of leave'] || leave['start date'] || leave.startdate,
        endDate: leave['end of leave'] || leave['end date'] || leave.enddate,
        days: parseInt(leave['number of days taken'] || leave.days || leave['no. of days'] || 1),
        status: leave['approved/ declined']?.toLowerCase().includes('approve') || leave.status?.toLowerCase().includes('approve') || leave.approved?.toLowerCase() === 'yes' ? 'approved' : 'rejected',
        approver: leave.approver || leave.supervisor || leave.csp,
        approvalDate: leave['approval date'] || leave.timestamp || new Date().toISOString(),
        comment: leave.comment || leave.notes || '',
        timestamp: leave.timestamp || new Date().toISOString()
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50); // Keep last 50 records
}

export default syncAllSheets;
