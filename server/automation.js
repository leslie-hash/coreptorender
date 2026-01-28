import { exportApprovedLeaveToExcel } from './exportBelinaLeave.js';
import { syncFromMultiTabSheet } from './centralizedSheetSync.js';
// Example: Email delivery stub
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import fs from 'fs';

// ✨ NIGHTLY SYNC: Sync all CSP team members from Google Sheet at 2 AM daily
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`🌙 [${timestamp}] Starting nightly Google Sheet sync at 2 AM...`);
  
  try {
    const spreadsheetId = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';
    const result = await syncFromMultiTabSheet(spreadsheetId);
    
    const successMessage = `✅ [${new Date().toISOString()}] Nightly sync complete! Synced ${result.totalTeamMembers} team members across ${result.totalCSPs} CSPs`;
    console.log(successMessage);
    
    // Write sync log to file
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'success',
      teamMembers: result.totalTeamMembers,
      csps: result.totalCSPs,
      clients: result.totalClients,
      message: successMessage
    };
    
    // Append to sync log file
    const logPath = './syncLog.json';
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }
    logs.push(logEntry);
    // Keep only last 30 days of logs
    if (logs.length > 30) logs = logs.slice(-30);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    
    console.log('📝 Sync log saved to syncLog.json');
    
  } catch (error) {
    const errorMessage = `❌ [${new Date().toISOString()}] Nightly sync failed: ${error.message}`;
    console.error(errorMessage);
    
    // Write error to sync log
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      stack: error.stack,
      message: errorMessage
    };
    
    const logPath = './syncLog.json';
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }
    logs.push(logEntry);
    if (logs.length > 30) logs = logs.slice(-30);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    
    // TODO: Send alert email to admin
  }
});

// Automated export and delivery of Belina leave file daily at 6am
cron.schedule('0 6 * * *', async () => {
  console.log('Automated Belina leave export running...');
  const success = exportApprovedLeaveToExcel();
  if (success) {
    // Email file to payroll team (stub)
    const transporter = nodemailer.createTransport({
      // Configure with real SMTP credentials
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'user@example.com', pass: 'password' }
    });
    await transporter.sendMail({
      from: 'noreply@example.com',
      to: 'payroll@example.com',
      subject: 'Daily Approved Leave Export for Belina Payroll',
      text: 'Attached is the latest approved leave export for Belina Payroll.',
      attachments: [{ path: './server/belina_leave_export.xlsx' }]
    });
    console.log('Belina leave export emailed to payroll team.');
  }
});

// Example: Scheduled job to sync data every hour
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled data sync...');
  // TODO: Call your data sync logic here
});

// Example: Scheduled job to generate report daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Generating daily report...');
  // TODO: Call your report generation logic here
});

// Data validation and deduplication
export function validateRow(row, requiredFields) {
  return requiredFields.every(f => row[f] !== undefined && row[f] !== null && row[f] !== '');
}

export function deduplicate(data, keyField) {
  const seen = new Set();
  return data.filter(row => {
    if (seen.has(row[keyField])) return false;
    seen.add(row[keyField]);
    return true;
  });
}
