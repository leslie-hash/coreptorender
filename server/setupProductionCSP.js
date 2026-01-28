import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function setupProductionCSPAssignments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    const total = await TeamMember.countDocuments();
    console.log(`📊 Total team members to distribute: ${total}\n`);

    // Three CSPs for distribution
    const csps = [
      { email: 'leslie@zimworx.com', name: 'Leslie Chasinda' },
      { email: 'tsungirirai.samhungu@zimworx.com', name: 'Tsungirirai Samhungu' },
      { email: 'anele@zimworx.com', name: 'Anele Nkomo' }
    ];

    // Get all team members
    const allMembers = await TeamMember.find({}).select('_id email');
    console.log(`📥 Fetched ${allMembers.length} team members\n`);

    // Distribute evenly
    const perCSP = Math.floor(allMembers.length / csps.length);
    let updated = 0;

    for (let i = 0; i < allMembers.length; i++) {
      const cspIndex = Math.min(Math.floor(i / perCSP), csps.length - 1);
      const csp = csps[cspIndex];

      await TeamMember.findByIdAndUpdate(allMembers[i]._id, {
        csp: csp.email,
        cspName: csp.name
      });

      updated++;
      if (updated % 100 === 0) {
        console.log(`   ✅ ${updated} team members assigned...`);
      }
    }

    console.log(`\n✅ Assigned ${updated} team members\n`);

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Production CSP Distribution:');
    distribution.forEach(item => {
      console.log(`   ${item._id} (${item.cspName}): ${item.count} team members`);
    });

    console.log('\n✅ Ready for production!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupProductionCSPAssignments();
