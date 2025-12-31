import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, 'google-tokens.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

/**
 * Get authenticated Google Sheets client
 */
async function getAuthClient() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error('Google credentials file not found.');
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      throw new Error('Google token not found. Please authenticate first.');
    }
  } catch (error) {
    console.error('Error getting auth client:', error.message);
    throw error;
  }
}

/**
 * Sync CILL Verification CSP Schedule from Google Sheets
 * 
 * Expected columns:
 * - Employee Number
 * - Name
 * - Surname
 * - Client
 * - Start Date
 * - End Date
 * - Leave Days
 * - Verified with CSP
 * - Please select Option 1 or 2 as per agreed by client
 * - Client Termination or Resignation
 * - Billable Days Based on CSP Comments
 * - CSP
 * - CSP Comments
 * - Monthly Billing Rate
 * - # of Days
 * - Billable Rate
 * - Billable Amount
 * - Billing Done Invoice #
 * - Amount Billed
 */
export async function syncCILLVerificationSchedule(spreadsheetId, range = 'CILL Verification!A2:S') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No CILL verification data found.');
      return [];
    }

    const cillRecords = rows.map((row, index) => {
      const [
        employeeNumber,
        name,
        surname,
        client,
        startDate,
        endDate,
        leaveDays,
        verifiedWithCSP,
        clientOption,
        terminationOrResignation,
        billableDaysBasedOnCSP,
        csp,
        cspComments,
        monthlyBillingRate,
        numberOfDays,
        billableRate,
        billableAmount,
        billingDoneInvoiceNumber,
        amountBilled
      ] = row;

      // Calculate actual working days (Days in period - Leave Days)
      const totalDays = parseFloat(numberOfDays) || 0;
      const leave = parseFloat(leaveDays) || 0;
      const workingDays = totalDays - leave;

      // Parse financial data
      const monthlyRate = parseFloat(monthlyBillingRate?.replace(/[^0-9.-]+/g, '')) || 0;
      const dailyRate = parseFloat(billableRate?.replace(/[^0-9.-]+/g, '')) || 0;
      const totalBillable = parseFloat(billableAmount?.replace(/[^0-9.-]+/g, '')) || 0;
      const billed = parseFloat(amountBilled?.replace(/[^0-9.-]+/g, '')) || 0;

      return {
        id: `CILL-${employeeNumber || index + 1}`,
        employeeNumber: employeeNumber?.trim() || '',
        name: name?.trim() || '',
        surname: surname?.trim() || '',
        fullName: `${name?.trim() || ''} ${surname?.trim() || ''}`.trim(),
        client: client?.trim() || '',
        
        // Date information
        startDate: startDate?.trim() || '',
        endDate: endDate?.trim() || '',
        
        // Leave tracking
        leaveDays: leave,
        verifiedWithCSP: verifiedWithCSP?.trim() || '',
        
        // Client status
        clientOption: clientOption?.trim() || '',
        terminationOrResignation: terminationOrResignation?.trim() || '',
        
        // Billing calculations
        billableDaysBasedOnCSP: parseFloat(billableDaysBasedOnCSP) || workingDays,
        workingDays: workingDays,
        
        // CSP information
        csp: csp?.trim() || '',
        cspComments: cspComments?.trim() || '',
        
        // Financial data
        monthlyBillingRate: monthlyRate,
        numberOfDays: totalDays,
        billableRate: dailyRate,
        billableAmount: totalBillable,
        
        // Invoice tracking
        billingDoneInvoiceNumber: billingDoneInvoiceNumber?.trim() || '',
        amountBilled: billed,
        outstandingAmount: totalBillable - billed,
        billingStatus: billed >= totalBillable ? 'Fully Billed' : billed > 0 ? 'Partially Billed' : 'Pending',
        
        // Metadata
        syncedAt: new Date().toISOString(),
        isActive: terminationOrResignation?.trim() === '' || terminationOrResignation?.trim()?.toLowerCase() === 'active',
      };
    });

    // Save to local JSON file
    const filePath = path.join(__dirname, 'cillVerificationRecords.json');
    fs.writeFileSync(filePath, JSON.stringify(cillRecords, null, 2));

    console.log(`✅ Synced ${cillRecords.length} CILL verification records from Google Sheets`);
    
    // Generate summary statistics
    const summary = generateCILLSummary(cillRecords);
    
    return { records: cillRecords, summary, count: cillRecords.length };
  } catch (error) {
    console.error('Error syncing CILL verification data:', error.message);
    throw error;
  }
}

/**
 * Generate summary statistics for CILL verification data
 */
function generateCILLSummary(records) {
  const totalRecords = records.length;
  const activeEmployees = records.filter(r => r.isActive).length;
  
  const totalBillableAmount = records.reduce((sum, r) => sum + r.billableAmount, 0);
  const totalAmountBilled = records.reduce((sum, r) => sum + r.amountBilled, 0);
  const totalOutstanding = records.reduce((sum, r) => sum + r.outstandingAmount, 0);
  
  const totalLeaveDays = records.reduce((sum, r) => sum + r.leaveDays, 0);
  const totalWorkingDays = records.reduce((sum, r) => sum + r.workingDays, 0);
  
  const byClient = records.reduce((acc, r) => {
    if (!acc[r.client]) {
      acc[r.client] = { count: 0, billable: 0, billed: 0, outstanding: 0 };
    }
    acc[r.client].count++;
    acc[r.client].billable += r.billableAmount;
    acc[r.client].billed += r.amountBilled;
    acc[r.client].outstanding += r.outstandingAmount;
    return acc;
  }, {});
  
  const byCSP = records.reduce((acc, r) => {
    if (!acc[r.csp]) {
      acc[r.csp] = { count: 0, billable: 0, leaveDays: 0 };
    }
    acc[r.csp].count++;
    acc[r.csp].billable += r.billableAmount;
    acc[r.csp].leaveDays += r.leaveDays;
    return acc;
  }, {});
  
  const billingStatusBreakdown = records.reduce((acc, r) => {
    acc[r.billingStatus] = (acc[r.billingStatus] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRecords,
    activeEmployees,
    inactiveEmployees: totalRecords - activeEmployees,
    
    financial: {
      totalBillableAmount,
      totalAmountBilled,
      totalOutstanding,
      billingCompletionRate: totalBillableAmount > 0 ? ((totalAmountBilled / totalBillableAmount) * 100).toFixed(2) : 0,
    },
    
    workDays: {
      totalLeaveDays,
      totalWorkingDays,
      averageLeaveDaysPerEmployee: totalRecords > 0 ? (totalLeaveDays / totalRecords).toFixed(2) : 0,
    },
    
    byClient,
    byCSP,
    billingStatusBreakdown,
    
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Update a specific CILL record in Google Sheets
 */
export async function updateCILLRecord(spreadsheetId, rowIndex, updates, sheetName = 'CILL Verification') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Map column indices (0-based)
    const columnMap = {
      verifiedWithCSP: 7,      // Column H
      clientOption: 8,          // Column I
      terminationOrResignation: 9, // Column J
      billableDaysBasedOnCSP: 10, // Column K
      cspComments: 12,          // Column M
      billingDoneInvoiceNumber: 17, // Column R
      amountBilled: 18,         // Column S
    };
    
    const updateRequests = [];
    
    for (const [field, value] of Object.entries(updates)) {
      if (columnMap[field] !== undefined) {
        const columnLetter = String.fromCharCode(65 + columnMap[field]);
        const range = `${sheetName}!${columnLetter}${rowIndex + 2}`; // +2 for header row and 0-index
        
        updateRequests.push({
          range,
          values: [[value]]
        });
      }
    }
    
    if (updateRequests.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updateRequests,
        },
      });
      
      console.log(`✅ Updated CILL record at row ${rowIndex + 2}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating CILL record:', error.message);
    throw error;
  }
}

/**
 * Get CILL records filtered by various criteria
 */
export function getCILLRecords(filters = {}) {
  try {
    const filePath = path.join(__dirname, 'cillVerificationRecords.json');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    let records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Apply filters
    if (filters.csp) {
      records = records.filter(r => r.csp?.toLowerCase() === filters.csp.toLowerCase());
    }
    
    if (filters.client) {
      records = records.filter(r => r.client?.toLowerCase().includes(filters.client.toLowerCase()));
    }
    
    if (filters.isActive !== undefined) {
      records = records.filter(r => r.isActive === filters.isActive);
    }
    
    if (filters.billingStatus) {
      records = records.filter(r => r.billingStatus === filters.billingStatus);
    }
    
    if (filters.startDate) {
      records = records.filter(r => r.startDate >= filters.startDate);
    }
    
    if (filters.endDate) {
      records = records.filter(r => r.endDate <= filters.endDate);
    }
    
    return records;
  } catch (error) {
    console.error('Error reading CILL records:', error.message);
    return [];
  }
}

export { generateCILLSummary };
