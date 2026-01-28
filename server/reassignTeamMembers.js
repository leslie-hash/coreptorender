import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reassignTeamMembers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    // Read client to CSP mapping
    const mappingPath = path.join(__dirname, 'clientToCspMapping.json');
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    console.log(`📋 Loaded ${Object.keys(mapping).length} client-to-CSP mappings\n`);

    // Get all unassigned team members
    const unassigned = await TeamMember.find({ csp: 'unassigned@zimworx.org' }).lean();
    console.log(`👥 Found ${unassigned.length} unassigned team members\n`);

    let reassigned = 0;
    let stillUnassigned = 0;

    for (const member of unassigned) {
      const clientName = member.clientName || member.client;
      
      if (mapping[clientName]) {
        // Update with mapped CSP
        await TeamMember.findByIdAndUpdate(
          member._id,
          { 
            csp: mapping[clientName].cspEmail,
            cspName: mapping[clientName].cspName
          }
        );
        reassigned++;
        if (reassigned % 100 === 0) {
          console.log(`   ✅ ${reassigned} team members reassigned...`);
        }
      } else {
        // Assign to Leslie as default if no mapping found
        await TeamMember.findByIdAndUpdate(
          member._id,
          { 
            csp: 'leslie@zimworx.com',
            cspName: 'Leslie Chasinda'
          }
        );
        stillUnassigned++;
      }
    }

    console.log(`\n✅ Reassigned ${reassigned} team members using client mapping`);
    console.log(`✅ Assigned ${stillUnassigned} team members to default (Leslie Chasinda)\n`);

    // Show new distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 New CSP Assignment Distribution:');
    distribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} team members`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

reassignTeamMembers();
