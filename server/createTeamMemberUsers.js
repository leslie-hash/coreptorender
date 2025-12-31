import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read team member metadata
const teamMemberMeta = JSON.parse(fs.readFileSync(path.join(__dirname, 'teamMemberMeta.json'), 'utf8'));
const existingUsers = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));

// Default password hash for "password123"
const defaultPasswordHash = '$2b$10$D86.SH3g7KiEEeko9CyMU.AFuTd37QvucSbWfQuEflbdZSBhxvznC';

// Extract unique emails from team member meta
const emails = new Set();
const teamMembersByEmail = new Map();

teamMemberMeta.forEach(member => {
  // The data structure has email in the "csp" field for most entries
  if (member.csp && member.csp.includes('@zimworx')) {
    emails.add(member.csp);
    if (!teamMembersByEmail.has(member.csp)) {
      teamMembersByEmail.set(member.csp, member.employeeId || member.csp.split('@')[0]);
    }
  }
  // Some entries have email in the correct "email" field
  if (member.email && member.email.includes('@zimworx')) {
    emails.add(member.email);
    if (!teamMembersByEmail.has(member.email)) {
      teamMembersByEmail.set(member.email, member.employeeId || member.email.split('@')[0]);
    }
  }
});

// Get existing user emails
const existingEmails = new Set(existingUsers.map(u => u.email));

// Create new users for team members
const newUsers = [];
emails.forEach(email => {
  if (!existingEmails.has(email) && email !== 'Leslie Chasinda') {
    const name = teamMembersByEmail.get(email);
    newUsers.push({
      name: name || email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      email: email,
      password: defaultPasswordHash,
      role: 'team-member',
      cspName: null
    });
  }
});

console.log(`Found ${emails.size} total email addresses`);
console.log(`${existingEmails.size} already have accounts`);
console.log(`Creating ${newUsers.length} new team member accounts`);

if (newUsers.length > 0) {
  // Add new users to existing users
  const allUsers = [...existingUsers, ...newUsers];
  
  // Write back to users.json
  fs.writeFileSync(
    path.join(__dirname, 'users.json'),
    JSON.stringify(allUsers, null, 2),
    'utf8'
  );
  
  console.log('✅ Successfully added all team member accounts!');
  console.log('\nNew users can login with:');
  console.log('Password: password123');
  console.log('\nSample emails:');
  newUsers.slice(0, 5).forEach(u => console.log(`  - ${u.email}`));
  if (newUsers.length > 5) {
    console.log(`  ... and ${newUsers.length - 5} more`);
  }
} else {
  console.log('✅ All team members already have user accounts!');
}
