import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function checkTeamMemberData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected\n');

    // Check actual team member data
    const teamMembers = await TeamMember.find({}).limit(10).lean();
    
    console.log('Sample TeamMember records from database:');
    teamMembers.forEach((tm, idx) => {
      console.log(`\n${idx + 1}. ${tm.teamMemberName}`);
      console.log(`   Email: ${tm.email}`);
      console.log(`   CSP: ${tm.csp}`);
      console.log(`   Client: ${tm.clientName}`);
      console.log(`   Active: ${tm.isActive}`);
      console.log(`   Fields: ${Object.keys(tm).join(', ')}`);
    });

    // Count records by type
    const total = await TeamMember.countDocuments();
    console.log(`\n\nTotal TeamMember records: ${total}`);

    // Check if records have proper team member names
    const withProperNames = await TeamMember.countDocuments({ 
      teamMemberName: { $regex: /^[A-Z]/, $not: /^(Friday|Monday|Tuesday|Wednesday|Thursday|Sunday|Start Date)/ }
    });
    
    console.log(`Records with proper team member names: ${withProperNames}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTeamMemberData();
