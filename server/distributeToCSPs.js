import dotenv from 'dotenv';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

dotenv.config();

async function distributeTeamMembersToCSPs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected\n');

    // Get all unassigned team members
    const unassignedMembers = await TeamMember.find({ $or: [{ csp: { $exists: false } }, { csp: null }, { csp: 'unassigned@zimworx.org' }] });
    console.log(`📊 Found ${unassignedMembers.length} unassigned team members\n`);

    // Define CSP distribution
    const csps = [
      { email: 'leslie@zimworx.com', name: 'Leslie Chasinda' },
      { email: 'tsungirirai.samhungu@zimworx.com', name: 'Tsungirirai Samhungu' },
      { email: 'anele@zimworx.com', name: 'Anele Nkomo' },
      { email: 'csp@zimworx.com', name: 'CSP User' },
      { email: 'tendai.senga@zimworx.com', name: 'Tendai Senga' },
      { email: 'rudo.takaendisa@zimworx.com', name: 'Rudo Takaendisa' },
      { email: 'moses.mushaikwa@zimworx.com', name: 'Moses Mushaikwa' },
      { email: 'miranda.chirove@zimworx.com', name: 'Miranda Chirove' },
      { email: 'gladness.njanji@zimworx.com', name: 'Gladness Njanji' },
      { email: 'joseph.ayema@zimworx.com', name: 'Joseph Ayema' }
    ];

    // Calculate team members per CSP
    const membersPerCsp = Math.ceil(unassignedMembers.length / csps.length);
    console.log(`📋 Distribution: ${membersPerCsp} team members per CSP\n`);

    let totalUpdated = 0;
    for (let i = 0; i < csps.length; i++) {
      const csp = csps[i];
      const startIdx = i * membersPerCsp;
      const endIdx = Math.min((i + 1) * membersPerCsp, unassignedMembers.length);
      const membersForThisCsp = unassignedMembers.slice(startIdx, endIdx);

      if (membersForThisCsp.length === 0) break;

      // Update these team members with CSP info
      const ids = membersForThisCsp.map(m => m._id);
      const result = await TeamMember.updateMany(
        { _id: { $in: ids } },
        { 
          csp: csp.email,
          cspName: csp.name,
          updatedAt: new Date()
        }
      );

      totalUpdated += result.modifiedCount;
      console.log(`✅ Assigned ${result.modifiedCount} team members to ${csp.name}`);
    }

    console.log(`\n🎉 Total team members reassigned: ${totalUpdated}`);

    // Show final distribution
    console.log('\n📊 Final CSP Distribution:');
    for (const csp of csps) {
      const count = await TeamMember.countDocuments({ csp: csp.email });
      console.log(`   ${csp.name}: ${count} team members`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

distributeTeamMembersToCSPs();
