import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function getSheoganAttendanceReport() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Fetching Sheoga\'s Team Members and Attendance...\n');

    // Get all of Sheoga's team members
    const teamMembers = await TeamMember.find({ csp: 'sheoga@zimworx.com' }).lean();
    
    console.log('👥 Sheoga\'s Team Members: ${teamMembers.length}\n');
    console.log('='.repeat(100));
    console.log('SHEOGA ATTENDANCE REPORT');
    console.log('='.repeat(100));
    console.log();

    if (teamMembers.length === 0) {
      console.log('⚠️ No team members found for Sheoga');
      process.exit(0);
    }

    // Display team member info
    console.log('Team Members Assigned to Sheoga:\n');
    console.log('No. | Team Member Name          | Client Name              | Email');
    console.log('-'.repeat(100));

    teamMembers.slice(0, 50).forEach((member, idx) => {
      const name = (member.teamMemberName || 'Unknown').substring(0, 25).padEnd(25);
      const client = (member.clientName || 'Unknown').substring(0, 24).padEnd(24);
      const email = member.email || 'N/A';
      console.log(`${(idx + 1).toString().padStart(3)} | ${name} | ${client} | ${email}`);
    });

    if (teamMembers.length > 50) {
      console.log(`\n... and ${teamMembers.length - 50} more team members\n`);
    }

    // Summary statistics
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total Team Members: ${teamMembers.length}`);
    
    const membersWithEmails = teamMembers.filter(m => m.email).length;
    const membersWithClients = teamMembers.filter(m => m.clientName && m.clientName !== 'Unknown').length;
    
    console.log(`Members with Emails: ${membersWithEmails}`);
    console.log(`Members with Client Assignment: ${membersWithClients}`);

    // Group by client
    const clientGroups = {};
    teamMembers.forEach(member => {
      const client = member.clientName || 'Unassigned';
      if (!clientGroups[client]) {
        clientGroups[client] = [];
      }
      clientGroups[client].push(member);
    });

    console.log('\nMembers by Client:');
    Object.entries(clientGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)
      .forEach(([client, members]) => {
        console.log(`  - ${client}: ${members.length} members`);
      });

    console.log('\n✅ Sheoga\'s attendance report ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getSheoganAttendanceReport();
