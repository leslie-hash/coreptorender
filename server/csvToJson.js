/**
 * Quick CSV to JSON converter for team members
 * Usage: node csvToJson.js team_members.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Centralized file paths
const FILE_PATHS = {
  leaveRequests: path.join(__dirname, 'leaveRequests.json'),
  teamMemberMeta: path.join(__dirname, 'teamMemberMeta.json'),
  users: path.join(__dirname, 'users.json'),
  emailSettings: path.join(__dirname, 'emailSettings.json'),
  integrationSettings: path.join(__dirname, 'integrationSettings.json'),
  approvalHistory: path.join(__dirname, 'approvalHistory.json')
};

const csvFile = process.argv[2];

if (!csvFile) {
  console.error('Usage: node csvToJson.js <csv-file>');
  console.error('Example: node csvToJson.js team_members.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`File not found: ${csvFile}`);
  process.exit(1);
}

// Read CSV file
const csvContent = fs.readFileSync(csvFile, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse header
const headers = lines[0].split(',').map(h => h.trim());
console.log('📋 Headers found:', headers);

// Expected headers
const expectedHeaders = ['Team Member Name', 'Employee ID', 'Department', 'CSP Name', 'Email', 'Join Date'];
const hasCorrectHeaders = expectedHeaders.every(h => headers.includes(h));

if (!hasCorrectHeaders) {
  console.warn('⚠️  Warning: CSV headers do not match expected format');
  console.log('Expected:', expectedHeaders);
  console.log('Found:', headers);
}

// Parse data rows
const teamMembers = [];
const teamMemberMeta = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.trim());
  
  if (values.length < 4 || !values[0]) continue;
  
  const [name, employeeId, department, cspName, email, joinDate] = values;
  
  // Add to simple list
  teamMembers.push(name);
  
  // Add to metadata
  teamMemberMeta.push({
    teamMemberName: name,
    employeeId: employeeId || `EMP${String(i).padStart(3, '0')}`,
    department: department || 'Unassigned',
    csp: cspName || null,
    email: email || null,
    joinDate: joinDate || null,
  });
}

// Save to JSON files
fs.writeFileSync(
  path.join(__dirname, 'teamMembers.json'),
  JSON.stringify(teamMembers, null, 2)
);

fs.writeFileSync(
  FILE_PATHS.teamMemberMeta,
  JSON.stringify(teamMemberMeta, null, 2)
);

console.log(`\n✅ Successfully converted ${teamMembers.length} team members`);
console.log('📁 Created files:');
console.log('   - teamMembers.json');
console.log('   - teamMemberMeta.json');

// Show CSP distribution
const cspGroups = teamMemberMeta.reduce((acc, member) => {
  const csp = member.csp || 'Unassigned';
  acc[csp] = (acc[csp] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Team members by CSP:');
Object.entries(cspGroups).forEach(([csp, count]) => {
  console.log(`   ${csp}: ${count} member(s)`);
});


