import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function distributeTeamMembers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    // Get total count
    const total = await TeamMember.countDocuments();
    console.log(`📊 Total team members: ${total}\n`);

    // Split between two CSPs
    const halfPoint = Math.floor(total / 2);

    // Assign first half to Leslie
    await TeamMember.updateMany(
      { csp: 'leslie@zimworx.com' },
      { csp: 'leslie@zimworx.com', cspName: 'Leslie Chasinda' }
    );

    // Get Leslie's count
    const leslieMember = await TeamMember.find({ csp: 'leslie@zimworx.com' }).limit(1).lean();
    
    // Assign roughly half to anele
    const aneleCspEmail = 'anele@zimworx.com';
    const aneleCspName = 'Anele Nkomo';

    // Update team members by slicing
    const teamMembers = await TeamMember.find({}).limit(halfPoint).select('_id');
    const ids = teamMembers.map(tm => tm._id);

    if (ids.length > 0) {
      await TeamMember.updateMany(
        { _id: { $in: ids } },
        { csp: aneleCspEmail, cspName: aneleCspName }
      );
    }

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('✅ Team Members Distribution:');
    distribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} team members`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

distributeTeamMembers();
