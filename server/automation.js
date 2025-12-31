import { exportApprovedLeaveToExcel } from './exportBelinaLeave.js';
// Example: Email delivery stub
import nodemailer from 'nodemailer';

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
import cron from 'node-cron';
import fs from 'fs';

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
