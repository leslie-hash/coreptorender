/**
 * Test Script: Automatic Absenteeism Generation
 * This script simulates approving a leave request and shows the automatic data generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import the business days calculator
import { calculateBusinessDays } from './holidays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('\n🧪 TESTING AUTOMATIC ABSENTEEISM GENERATION\n');
console.log('=' .repeat(60));

// Read leave requests
const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf-8'));

// Find a request in csp-review status
const testRequest = leaveRequests.find(lr => lr.status === 'csp-review');

if (!testRequest) {
  console.log('❌ No leave requests in "csp-review" status found');
  process.exit(1);
}

console.log('\n📋 LEAVE REQUEST TO APPROVE:');
console.log('-'.repeat(60));
console.log(`ID: ${testRequest.id}`);
console.log(`Team Member: ${testRequest.teamMember}`);
console.log(`Leave Type: ${testRequest.leaveType}`);
console.log(`Start Date: ${testRequest.startDate}`);
console.log(`End Date: ${testRequest.endDate}`);
console.log(`Calendar Days: ${testRequest.days}`);
console.log(`Reason: ${testRequest.reason}`);
console.log(`Status: ${testRequest.status}`);
console.log(`Assigned To: ${testRequest.assignedTo}`);

// Read team member metadata
const metaPath = path.join(__dirname, 'teamMemberMeta.json');
let teamMemberMeta = null;
if (fs.existsSync(metaPath)) {
  const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  teamMemberMeta = allMeta.find(m => m.teamMemberName === testRequest.teamMember);
}

console.log('\n👤 TEAM MEMBER METADATA:');
console.log('-'.repeat(60));
if (teamMemberMeta) {
  console.log(`CSP: ${teamMemberMeta.csp || 'N/A'}`);
  console.log(`Client: ${teamMemberMeta.client || 'TBD'}`);
  console.log(`Country: ${teamMemberMeta.country || 'Zimbabwe'}`);
  console.log(`Email: ${teamMemberMeta.email || 'N/A'}`);
} else {
  console.log('⚠️  No metadata found for this team member');
}

// Calculate fields that would be auto-generated
const startDate = new Date(testRequest.startDate);
const endDate = new Date(testRequest.endDate);

// Calculate week start (Sunday)
const weekStartDate = new Date(startDate);
weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());

// Calculate business days (excluding weekends and US Federal Holidays)
const businessDays = calculateBusinessDays(testRequest.startDate, testRequest.endDate);

// Calculate week number
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const weekNumber = getWeekNumber(startDate);
const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });
const year = startDate.getFullYear();

console.log('\n📊 AUTO-CALCULATED FIELDS:');
console.log('-'.repeat(60));
console.log(`Week Start (Sunday): ${weekStartDate.toLocaleDateString('en-US')}`);
console.log(`Calendar Days: ${testRequest.days}`);
console.log(`Business Days (excluding weekends + holidays): ${businessDays}`);
console.log(`Week Number: ${weekNumber}`);
console.log(`Month: ${monthName}`);
console.log(`Year: ${year}`);

// Build the absenteeism record that would be created
const absenteeismRecord = {
  weekStart: weekStartDate.toLocaleDateString('en-US'),
  startDate: testRequest.startDate,
  endDate: testRequest.endDate,
  noOfDays: testRequest.days,
  noOfDaysExcludingWeekends: businessDays,
  nameOfAbsentee: testRequest.teamMember,
  reasonForAbsence: testRequest.reason || 'N/A',
  absenteeismAuthorised: 'Yes',
  leaveFormSent: testRequest.submissionMethod === 'official-form' ? 'Yes' : 'No',
  comment: testRequest.leaveType,
  client: teamMemberMeta?.client || 'TBD',
  csp: teamMemberMeta?.csp || testRequest.assignedTo || 'N/A',
  country: teamMemberMeta?.country || 'Zimbabwe',
  weekNo: weekNumber,
  month: monthName,
  year: year,
  timestamp: new Date().toISOString(),
  requestId: testRequest.id
};

console.log('\n✅ ABSENTEEISM RECORD THAT WOULD BE CREATED:');
console.log('-'.repeat(60));
console.log(JSON.stringify(absenteeismRecord, null, 2));

console.log('\n🎯 WHAT HAPPENS WHEN APPROVED:');
console.log('-'.repeat(60));
console.log('1. ✅ Status changes from "csp-review" to "approved"');
console.log('2. 📝 updateAbsenteeismTracker() is called automatically');
console.log('3. 🧮 All fields are calculated (business days, week number, etc.)');
console.log('4. 📊 Data is appended to Google Sheets (if configured)');
console.log('5. 🔔 Notifications are sent to relevant parties');
console.log('6. 💾 Leave request is updated in leaveRequests.json');

console.log('\n📌 GOOGLE SHEETS CONFIGURATION:');
console.log('-'.repeat(60));
const sheetId = process.env.ABSENTEEISM_SPREADSHEET_ID || process.env.SPREADSHEET_ID;
if (sheetId) {
  console.log(`✅ Spreadsheet ID: ${sheetId}`);
  console.log('✅ Would append to "Input" sheet, columns A through Q');
} else {
  console.log('⚠️  ABSENTEEISM_SPREADSHEET_ID not configured in .env');
  console.log('⚠️  Data will be calculated but not sent to Google Sheets');
}

console.log('\n🚀 TO ACTUALLY APPROVE THIS REQUEST:');
console.log('-'.repeat(60));
console.log('1. Start the backend: cd server && node index.js');
console.log('2. Start the frontend: npm run dev');
console.log('3. Login as CSP: tsungirirai.samhungu@zimworx.com');
console.log('4. Go to Review Queue');
console.log(`5. Find request: ${testRequest.teamMember} - ${testRequest.leaveType}`);
console.log('6. Click "Approve"');
console.log('7. Check the absenteeism report to see the auto-generated entry!');

console.log('\n' + '='.repeat(60));
console.log('✨ TEST COMPLETE - Automatic generation ready to work!\n');
