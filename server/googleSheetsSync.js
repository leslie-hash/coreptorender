import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to safely parse JSON files (removes BOM)
 */
function safeJsonParse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanContent = content.replace(/^\uFEFF/, '');
  return JSON.parse(cleanContent);
}

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = path.join(__dirname, 'google-tokens.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

/**
 * Get authenticated Google Sheets client
 */
async function getAuthClient() {
  try {
    // Load credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error('Google credentials file not found. Please set up OAuth2 credentials.');
    }

    const credentials = safeJsonParse(CREDENTIALS_PATH);
    
    // Check if it's a service account (preferred for server-to-server)
    if (credentials.type === 'service_account') {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });
      return auth.getClient();
    }
    
    // Fallback to OAuth2 if not service account
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Load token
    if (fs.existsSync(TOKEN_PATH)) {
      const token = safeJsonParse(TOKEN_PATH);
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      throw new Error('Google token not found. Please authenticate first using /api/google-auth endpoint.');
    }
  } catch (error) {
    console.error('Error getting auth client:', error.message);
    throw error;
  }
}

/**
 * Fetch team members from Google Sheets
 * Expected columns: Team Member Name | Employee ID | Department | CSP Name | Email | Join Date
 */
/**
 * Sync from a single CSP's sheet - Team Member Work Details tab
 * Columns: Client Name | Team member | Role | Email Address | Anydesk | Work Station number | Floor | Work Start Time | Time Zone
 */
export async function syncCSPSheet(cspEmail, cspName, spreadsheetId, range = 'Team Member Work Details!A2:I') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log(`No data found in ${cspName}'s sheet.`);
      return { teamMembers: [], count: 0 };
    }

    const teamMembers = [];

    rows.forEach((row, index) => {
      // Map columns: Client Name | Team member | Role | Email Address | Anydesk | Work Station | Floor | Work Start Time | Time Zone
      const [clientName, teamMemberName, role, emailAddress, anydesk, workStation, floor, workStartTime, timeZone] = row;
      
      if (teamMemberName && teamMemberName.trim()) {
        const email = emailAddress?.trim() || null;
        
        // Auto-assign based on email domain:
        // @zimworx.org = Team Members (assigned to their CSP)
        // @zimworx.com = CSPs themselves
        let assignedCSP = cspName; // Default to the CSP who owns this sheet
        
        // Team members use @zimworx.org - they are assigned to the CSP from this sheet
        if (email && email.toLowerCase().endsWith('@zimworx.org')) {
          assignedCSP = cspName; // Assign to the CSP who owns this sheet
        }
        // CSPs use @zimworx.com - they manage team members but aren't assigned to anyone
        else if (email && email.toLowerCase().endsWith('@zimworx.com')) {
          assignedCSP = 'Self-Managed'; // CSPs manage themselves
        }
        
        teamMembers.push({
          teamMemberName: teamMemberName.trim(),
          clientName: clientName?.trim() || 'Unassigned Client',
          employeeId: teamMemberName.trim(),
          role: role?.trim() || 'Unassigned',
          email: email,
          anydesk: anydesk?.trim() || null,
          workStation: workStation?.trim() || null,
          floor: floor?.trim() || null,
          workStartTime: workStartTime?.trim() || null,
          timeZone: timeZone?.trim() || null,
          csp: assignedCSP, // Use full name of managing CSP
          cspName: assignedCSP,
          spreadsheetId: spreadsheetId, // Track source sheet
          syncedAt: new Date().toISOString()
        });
      }
    });

    console.log(`✅ Synced ${teamMembers.length} team members from ${cspName}'s sheet`);
    return { teamMembers, count: teamMembers.length };
  } catch (error) {
    console.error(`Error syncing ${cspName}'s sheet:`, error.message);
    throw error;
  }
}

/**
 * Sync from ALL CSP sheets at once
 * Takes array of CSP configurations: [{ cspEmail, cspName, spreadsheetId, range? }]
 */
export async function syncAllCSPSheets(cspConfigs) {
  try {
    console.log(`🔄 Starting sync for ${cspConfigs.length} CSP sheets...`);
    
    const allTeamMembers = [];
    const allTeamMemberMeta = [];
    const cspSummary = [];
    const errors = [];

    for (const config of cspConfigs) {
      try {
        const result = await syncCSPSheet(
          config.cspEmail,
          config.cspName,
          config.spreadsheetId,
          config.range
        );
        
        allTeamMembers.push(...result.teamMembers.map(tm => tm.teamMemberName));
        allTeamMemberMeta.push(...result.teamMembers);
        
        cspSummary.push({
          csp: config.cspName,
          email: config.cspEmail,
          teamMemberCount: result.count,
          clients: [...new Set(result.teamMembers.map(tm => tm.clientName))]
        });
      } catch (error) {
        console.error(`❌ Failed to sync ${config.cspName}'s sheet:`, error.message);
        errors.push({
          csp: config.cspName,
          error: error.message
        });
      }
    }

    // Save consolidated data
    fs.writeFileSync(
      path.join(__dirname, 'teamMembers.json'),
      JSON.stringify(allTeamMembers, null, 2)
    );
    
    fs.writeFileSync(
      path.join(__dirname, 'teamMemberMeta.json'),
      JSON.stringify(allTeamMemberMeta, null, 2)
    );

    fs.writeFileSync(
      path.join(__dirname, 'cspSummary.json'),
      JSON.stringify(cspSummary, null, 2)
    );

    const totalClients = [...new Set(allTeamMemberMeta.map(tm => tm.clientName))];

    console.log(`\n✅ SYNC COMPLETE`);
    console.log(`   📊 Total Team Members: ${allTeamMembers.length}`);
    console.log(`   👥 Total CSPs: ${cspConfigs.length}`);
    console.log(`   🏢 Total Clients: ${totalClients.length}`);
    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length}`);
    }
    
    return { 
      teamMembers: allTeamMembers,
      teamMemberMeta: allTeamMemberMeta,
      cspSummary,
      totalCount: allTeamMembers.length,
      totalCSPs: cspConfigs.length,
      totalClients: totalClients.length,
      clients: totalClients,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error syncing CSP sheets:', error.message);
    throw error;
  }
}

/**
 * Legacy: Sync from Team Member Work Details sheet (single sheet approach)
 */
export async function syncTeamMembersFromWorkDetails(spreadsheetId, range = 'Team Member Work Details!A2:I') {
  console.log('⚠️  Using single-sheet sync. Consider using syncAllCSPSheets() for multiple CSP sheets.');
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { teamMembers: [], teamMemberMeta: [], csps: [] };
    }

    const teamMembers = [];
    const teamMemberMeta = [];

    rows.forEach((row) => {
      const [clientName, teamMemberName, role, emailAddress, anydesk, workStation, floor, workStartTime, timeZone] = row;
      
      if (teamMemberName && teamMemberName.trim()) {
        teamMembers.push(teamMemberName.trim());
        
        teamMemberMeta.push({
          teamMemberName: teamMemberName.trim(),
          clientName: clientName?.trim() || 'Unassigned Client',
          employeeId: teamMemberName.trim(),
          role: role?.trim() || 'Unassigned',
          email: emailAddress?.trim() || null,
          anydesk: anydesk?.trim() || null,
          workStation: workStation?.trim() || null,
          floor: floor?.trim() || null,
          workStartTime: workStartTime?.trim() || null,
          timeZone: timeZone?.trim() || null,
          syncedAt: new Date().toISOString()
        });
      }
    });

    fs.writeFileSync(path.join(__dirname, 'teamMembers.json'), JSON.stringify(teamMembers, null, 2));
    fs.writeFileSync(path.join(__dirname, 'teamMemberMeta.json'), JSON.stringify(teamMemberMeta, null, 2));

    return { teamMembers, teamMemberMeta, count: teamMembers.length };
  } catch (error) {
    console.error('Error syncing:', error.message);
    throw error;
  }
}

// Keep old function for backward compatibility
export async function syncTeamMembersFromSheets(spreadsheetId, range = 'Input Spreadsheet!A2:F') {
  console.log('⚠️  Using legacy sync method. Consider using syncTeamMembersFromWorkDetails() instead.');
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in sheet.');
      return { teamMembers: [], teamMemberMeta: [] };
    }

    // Parse rows into structured data
    const teamMembers = [];
    const teamMemberMeta = [];

    rows.forEach((row, index) => {
      const [name, employeeId, department, cspName, email, joinDate] = row;
      
      if (name) {
        // Add to simple team members list
        teamMembers.push(name.trim());
        
        // Add to metadata with CSP assignment
        teamMemberMeta.push({
          teamMemberName: name.trim(),
          employeeId: employeeId?.trim() || `EMP${String(index + 1).padStart(3, '0')}`,
          department: department?.trim() || 'Unassigned',
          csp: cspName?.trim() || null,
          email: email?.trim() || null,
          joinDate: joinDate?.trim() || null,
        });
      }
    });

    // Save to local JSON files
    fs.writeFileSync(
      path.join(__dirname, 'teamMembers.json'),
      JSON.stringify(teamMembers, null, 2)
    );
    
    fs.writeFileSync(
      path.join(__dirname, 'teamMemberMeta.json'),
      JSON.stringify(teamMemberMeta, null, 2)
    );

    console.log(`✅ Synced ${teamMembers.length} team members from Google Sheets`);
    return { teamMembers, teamMemberMeta, count: teamMembers.length };
  } catch (error) {
    console.error('Error syncing from Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Fetch leave requests from Google Sheets
 * Expected columns: Request ID | Team Member Name | Leave Type | Start Date | End Date | Status | Submitted Date
 */
export async function syncLeaveRequestsFromSheets(spreadsheetId, range = 'LeaveRequests!A2:G') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const leaveRequests = rows.map((row, index) => {
      const [requestId, teamMemberName, leaveType, startDate, endDate, status, submittedDate] = row;
      
      return {
        id: requestId?.trim() || `LR${Date.now()}-${index}`,
        teamMemberName: teamMemberName?.trim(),
        leaveType: leaveType?.trim() || 'Annual Leave',
        startDate: startDate?.trim(),
        endDate: endDate?.trim(),
        status: status?.trim().toLowerCase() || 'pending',
        submittedDate: submittedDate?.trim() || new Date().toISOString().split('T')[0],
      };
    });

    fs.writeFileSync(
      path.join(__dirname, 'leaveRequests.json'),
      JSON.stringify(leaveRequests, null, 2)
    );

    console.log(`✅ Synced ${leaveRequests.length} leave requests from Google Sheets`);
    return leaveRequests;
  } catch (error) {
    console.error('Error syncing leave requests:', error.message);
    throw error;
  }
}

/**
 * Update Google Sheet with new leave request
 */
export async function appendLeaveRequestToSheet(spreadsheetId, leaveRequest, range = 'LeaveRequests!A:G') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const values = [[
      leaveRequest.id,
      leaveRequest.teamMemberName,
      leaveRequest.leaveType,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.status,
      leaveRequest.submittedDate || new Date().toISOString().split('T')[0]
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    console.log('✅ Appended leave request to Google Sheets');
    return true;
  } catch (error) {
    console.error('Error appending to Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Get spreadsheet info and validate connection
 */
export async function validateSheetConnection(spreadsheetId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      success: true,
      title: response.data.properties.title,
      sheets: response.data.sheets.map(sheet => sheet.properties.title),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sync PTO balances from Google Sheets "PTO Update" tab
 * Pulls current month's data: Client, NAME, Current PTO, Total Taken, Leave Balance
 */
export async function syncPTOBalancesFromSheets(spreadsheetId, range = 'PTO Update!A2:BJ') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No PTO data found in sheet.');
      return [];
    }

    // Determine current month column indices
    // December 2025 columns: Days Accrued (col 26), Current PTO (col 27), Total Taken (col 28), Leave Balance (col 29)
    const currentMonth = new Date().getMonth(); // 0-11 (December = 11)
    const currentYear = new Date().getFullYear();
    
    // Calculate column offset for current month
    // June 2024 starts at column 3, then 4 columns per month
    const monthsSinceJune2024 = (currentYear - 2024) * 12 + currentMonth - 5; // June = month 5
    const baseColumn = 3; // June 2024 starts at column index 3
    const columnsPerMonth = 4;
    const currentMonthStartCol = baseColumn + (monthsSinceJune2024 * columnsPerMonth);
    
    const ptoData = rows.map(row => {
      const client = row[0]?.trim();
      const name = row[1]?.trim();
      const startDate = row[2]?.trim();
      
      // Get current month's data
      const currentPTO = parseFloat(row[currentMonthStartCol + 1]) || 20; // Current PTO as of month
      const totalTaken = parseFloat(row[currentMonthStartCol + 2]) || 0; // Total taken as of month
      const leaveBalance = parseFloat(row[currentMonthStartCol + 3]) || currentPTO - totalTaken; // Leave balance
      
      return {
        employeeId: name,
        client: client,
        startDate: startDate,
        annualPTO: currentPTO,
        usedPTO: totalTaken,
        remainingPTO: leaveBalance
      };
    }).filter(item => item.employeeId); // Filter out empty rows

    // Merge with existing teamMemberMeta.json
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    let teamMemberMeta = [];
    
    if (fs.existsSync(metaPath)) {
      teamMemberMeta = safeJsonParse(metaPath);
    }

    // Update PTO data for matching employees
    ptoData.forEach(ptoRecord => {
      const member = teamMemberMeta.find(m => 
        m.employeeId === ptoRecord.employeeId || 
        m.teamMemberName === ptoRecord.employeeId
      );
      
      if (member) {
        member.annualPTO = ptoRecord.annualPTO;
        member.currentUsedPTO = ptoRecord.usedPTO;
        member.currentRemainingPTO = ptoRecord.remainingPTO;
        member.ptoLastSynced = new Date().toISOString();
      }
    });

    // Save updated metadata
    fs.writeFileSync(metaPath, JSON.stringify(teamMemberMeta, null, 2));

    console.log(`✅ Synced PTO balances for ${ptoData.length} employees from Google Sheets`);
    return { ptoData, count: ptoData.length };
  } catch (error) {
    console.error('Error syncing PTO balances:', error.message);
    throw error;
  }
}
