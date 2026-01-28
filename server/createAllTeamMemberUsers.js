import fs from 'fs';
import bcrypt from 'bcryptjs';
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

const USERS_PATH = path.join(__dirname, 'users.json');
const TEAM_MEMBER_META_PATH = FILE_PATHS.teamMemberMeta;
const DEFAULT_PASSWORD = 'Welcome2026!'; // Team members should change this on first login

async function createAllTeamMemberUsers() {
  try {
    // Read existing users
    let existingUsers = [];
    if (fs.existsSync(USERS_PATH)) {
      existingUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    }

    // Read all team members from metadata
    if (!fs.existsSync(TEAM_MEMBER_META_PATH)) {
      console.error('❌ teamMemberMeta.json not found. Run sync first.');
      return;
    }

    const teamMemberMeta = JSON.parse(fs.readFileSync(TEAM_MEMBER_META_PATH, 'utf-8'));
    console.log(`📊 Found ${teamMemberMeta.length} team members in metadata`);

    // Filter team members who have valid emails
    const teamMembersWithEmails = teamMemberMeta.filter(tm => 
      tm.email && 
      tm.email.includes('@') && 
      !tm.email.toLowerCase().includes('unknown') &&
      !tm.email.toLowerCase().includes('n/a')
    );

    console.log(`✅ ${teamMembersWithEmails.length} team members have valid emails`);

    // Get existing user emails (lowercase for comparison)
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    // Find team members who don't have accounts yet
    const newTeamMembers = teamMembersWithEmails.filter(tm => 
      !existingEmails.has(tm.email.toLowerCase())
    );

    console.log(`🆕 ${newTeamMembers.length} team members need new accounts\n`);

    if (newTeamMembers.length === 0) {
      console.log('✅ All team members with emails already have accounts!');
      return;
    }

    // Hash the default password once (more efficient)
    const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

    // Create new user accounts
    let created = 0;
    for (const tm of newTeamMembers) {
      const newUser = {
        name: tm.teamMemberName,
        email: tm.email,
        password: hashedPassword,
        role: 'team-member',
        createdAt: new Date().toISOString(),
        cspName: tm.cspName || null,
        cspEmail: tm.csp || null
      };

      existingUsers.push(newUser);
      created++;

      if (created % 100 === 0) {
        console.log(`   Created ${created} accounts...`);
      }
    }

    // Save updated users file
    fs.writeFileSync(USERS_PATH, JSON.stringify(existingUsers, null, 2));

    console.log(`\n✅ Successfully created ${created} new team member accounts!`);
    console.log(`📊 Total users in system: ${existingUsers.length}`);
    console.log(`\n🔑 Default Password for all new accounts: ${DEFAULT_PASSWORD}`);
    console.log(`⚠️  Team members should change their password on first login\n`);

    // Summary by CSP
    const newUsersByCSP = {};
    newTeamMembers.forEach(tm => {
      const csp = tm.cspName || 'Unassigned';
      if (!newUsersByCSP[csp]) {
        newUsersByCSP[csp] = 0;
      }
      newUsersByCSP[csp]++;
    });

    console.log('📋 New accounts created per CSP:');
    Object.entries(newUsersByCSP)
      .sort((a, b) => b[1] - a[1])
      .forEach(([csp, count]) => {
        console.log(`   ${csp}: ${count} accounts`);
      });

  } catch (error) {
    console.error('❌ Error creating team member users:', error);
    throw error;
  }
}

// Run the script
console.log('🚀 Creating team member accounts for all 1,557 team members...\n');
createAllTeamMemberUsers()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });

