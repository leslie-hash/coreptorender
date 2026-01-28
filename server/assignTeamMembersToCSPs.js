import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { User, TeamMember } from './models/index.js';

async function assignTeamMembersToCSPs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    // Get all CSP users
    const csps = await User.find({ role: 'csp' }).lean();
    console.log(`📊 Found ${csps.length} CSPs\n`);

    if (csps.length === 0) {
      console.log('❌ No CSPs found in system');
      process.exit(1);
    }

    // Get all team members
    const totalTeamMembers = await TeamMember.countDocuments();
    console.log(`👥 Total team members: ${totalTeamMembers}\n`);

    // Calculate members per CSP
    const membersPerCSP = Math.floor(totalTeamMembers / csps.length);
    console.log(`📈 Distributing ~${membersPerCSP} team members per CSP\n`);

    // Get all team members and assign them
    const allMembers = await TeamMember.find({}).select('_id email').lean();
    
    let assignedCount = 0;
    for (let i = 0; i < allMembers.length; i++) {
      const cspIndex = Math.min(Math.floor(i / membersPerCSP), csps.length - 1);
      const csp = csps[cspIndex];

      await TeamMember.findByIdAndUpdate(allMembers[i]._id, {
        csp: csp.email,
        cspName: csp.name
      });

      assignedCount++;
      if (assignedCount % 100 === 0) {
        console.log(`   ✅ ${assignedCount} team members assigned...`);
      }
    }

    console.log(`\n✅ Assigned ${assignedCount} team members\n`);

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Final CSP Team Member Distribution:');
    distribution.forEach(item => {
      const percentage = ((item.count / totalTeamMembers) * 100).toFixed(1);
      console.log(`   ${item.cspName.padEnd(25)} (${item._id}): ${item.count.toString().padStart(4)} team members (${percentage}%)`);
    });

    console.log('\n✅ Production CSP setup complete! All CSPs now have team members assigned.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignTeamMembersToCSPs();
