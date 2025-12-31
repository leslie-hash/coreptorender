import { google } from 'googleapis';  
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

/**
 * Helper function to safely parse JSON files (removes BOM)
 */
function safeJsonParse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanContent = content.replace(/^\uFEFF/, '');
  return JSON.parse(cleanContent);
}

/**
 * Get Google Service Account credentials from env or file
 */
function getGoogleCredentials() {
  try {
    if (process.env.GOOGLE_CREDENTIALS) {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    if (fs.existsSync(credentialsPath)) {
      return safeJsonParse(credentialsPath);
    }
    throw new Error('Google credentials not found');
  } catch (error) {
    console.error('Error loading Google credentials:', error.message);
    throw error;
  }
}

/**
 * Get authenticated Google Sheets client
 */
async function getAuthClient() {
  const credentials = getGoogleCredentials();
  
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
 * Parse absenteeism tracker with monthly grid format
 * Structure:
 * - Row 1: Legend header (0)
 * - Rows 2-8: Legend (Sick, PTO, Holiday, No show/No Call, Offboarded, Emergency, Funeral)
 * - Row 10: MONTH NAME (e.g., JANUARY)
 * - Row 11: Headers (Team Member Name | day numbers)
 * - Rows 12+: Attendance data per employee
 * - Repeats for each month
 */
export async function syncAbsenteeismFromSheets(spreadsheetId, range = 'Absenteesim tracker !A1:AH1000') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No absenteeism data found in sheet.');
      return { records: [], count: 0 };
    }

    const absenteeismRecords = [];
    const currentYear = new Date().getFullYear();
    
    // Parse legend (rows 2-8)
    const legend = {
      sick: 'Sick',
      pto: 'PTO',
      holiday: 'Holiday',
      noShow: 'No show/No Call',
      offboarded: 'Offboarded',
      emergency: 'Emergency',
      funeral: 'Funeral'
    };

    // Find month sections
    let i = 0;
    while (i < rows.length) {
      const row = rows[i];
      const firstCell = row[0]?.trim().toUpperCase();
      
      // Check if this is a month header
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      
      if (months.includes(firstCell)) {
        const monthName = firstCell;
        const monthNumber = months.indexOf(firstCell) + 1;
        
        i++; // Move to header row (Team Member Name | day numbers)
        const headerRow = rows[i];
        const dayColumns = [];
        
        // Extract day numbers from header
        for (let col = 1; col < headerRow.length; col++) {
          const dayNum = parseInt(headerRow[col]);
          if (!isNaN(dayNum) && dayNum > 0 && dayNum <= 31) {
            dayColumns.push({ col, day: dayNum });
          }
        }
        
        i++; // Move to first data row
        
        // Parse attendance data for this month
        while (i < rows.length) {
          const dataRow = rows[i];
          const employeeName = dataRow[0]?.trim();
          
          // Check if we've hit the next month or end of data
          if (!employeeName || employeeName === '' || months.includes(employeeName.toUpperCase())) {
            break;
          }
          
          // Check for legend keywords to stop (e.g., "Attended", "Sick" appearing again)
          if (['ATTENDED', 'SICK', 'PTO', 'HOLIDAY', 'OFFBOARDED', 'EMERGENCY', 'FUNERAL']
              .includes(employeeName.toUpperCase())) {
            break;
          }
          
          // Parse each day's attendance for this employee
          dayColumns.forEach(({ col, day }) => {
            const status = dataRow[col]?.trim();
            
            if (status && status !== '' && status.toLowerCase() !== 'attended') {
              // Record any non-attendance
              const date = new Date(currentYear, monthNumber - 1, day);
              
              absenteeismRecords.push({
                employeeName,
                date: date.toISOString().split('T')[0],
                month: monthName,
                day: day,
                year: currentYear,
                status: status,
                type: classifyAbsenceType(status, legend),
                authorised: isAuthorised(status)
              });
            }
          });
          
          i++;
        }
      } else {
        i++;
      }
    }

    // Save to JSON file
    const outputPath = path.join(__dirname, 'absenteeismRecords.json');
    fs.writeFileSync(outputPath, JSON.stringify(absenteeismRecords, null, 2));

    console.log(`✅ Synced ${absenteeismRecords.length} absenteeism records from Google Sheets`);
    return { records: absenteeismRecords, count: absenteeismRecords.length };
    
  } catch (error) {
    console.error('Error syncing absenteeism data:', error.message);
    throw error;
  }
}

/**
 * Classify the type of absence based on status
 */
function classifyAbsenceType(status, legend) {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('sick')) return 'Sick';
  if (statusLower.includes('pto') || statusLower.includes('leave')) return 'PTO';
  if (statusLower.includes('holiday')) return 'Holiday';
  if (statusLower.includes('no show') || statusLower.includes('no call')) return 'No Show/No Call';
  if (statusLower.includes('offboard')) return 'Offboarded';
  if (statusLower.includes('emergency')) return 'Emergency';
  if (statusLower.includes('funeral')) return 'Funeral';
  
  return 'Other';
}

/**
 * Determine if absence was authorised
 */
function isAuthorised(status) {
  const statusLower = status.toLowerCase();
  
  // Authorised absences
  if (statusLower.includes('pto') || 
      statusLower.includes('sick') || 
      statusLower.includes('holiday') || 
      statusLower.includes('emergency') ||
      statusLower.includes('funeral')) {
    return true;
  }
  
  // Unauthorised absences
  if (statusLower.includes('no show') || 
      statusLower.includes('no call') ||
      statusLower.includes('offboard')) {
    return false;
  }
  
  return null; // Unknown
}

/**
 * Get absenteeism summary by employee
 */
export function getAbsenteeismSummary(records) {
  const summaryMap = new Map();
  
  records.forEach(record => {
    if (!summaryMap.has(record.employeeName)) {
      summaryMap.set(record.employeeName, {
        employeeName: record.employeeName,
        totalAbsences: 0,
        authorised: 0,
        unauthorised: 0,
        byType: {
          sick: 0,
          pto: 0,
          holiday: 0,
          noShow: 0,
          emergency: 0,
          funeral: 0,
          other: 0
        },
        recentAbsences: []
      });
    }
    
    const summary = summaryMap.get(record.employeeName);
    summary.totalAbsences++;
    
    if (record.authorised === true) summary.authorised++;
    if (record.authorised === false) summary.unauthorised++;
    
    // Count by type
    const typeKey = record.type.toLowerCase().replace(/[^a-z]/g, '');
    if (summary.byType[typeKey] !== undefined) {
      summary.byType[typeKey]++;
    } else {
      summary.byType.other++;
    }
    
    // Keep recent absences (last 10)
    summary.recentAbsences.push({
      date: record.date,
      status: record.status,
      type: record.type
    });
    
    if (summary.recentAbsences.length > 10) {
      summary.recentAbsences = summary.recentAbsences
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    }
  });
  
  return Array.from(summaryMap.values());
}

export default syncAbsenteeismFromSheets;
