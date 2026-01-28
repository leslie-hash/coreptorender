/**
 * Fix CSP assignments - assign team member requests to their CSP
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB } from './mongodb.js';
import { LeaveRequest, TeamMember } from './models/index.js';

async function fixAssignments() {
  await connectMongoDB();
  
  // Get all CSPs and their teams
  const csps = await TeamMember.aggregate([
    { $match: { csp: { $exists: true, $ne: '' } } },
    { $group: { _id: '$csp', teamMembers: { $push: '$teamMemberName' } } }
  ]);
  
  console.log(`\nFound ${csps.length} CSPs with team members\n`);
  
  let totalUpdated = 0;
  
  for (const csp of csps) {
    const cspEmail = csp._id;
    const teamNames = csp.teamMembers;
    const cspName = cspEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Update all requests from this CSP's team
    const result = await LeaveRequest.updateMany(
      {
        $or: [
          { teamMemberName: { $in: teamNames } },
          { teamMember: { $in: teamNames } }
        ],
        assignedToEmail: { $ne: cspEmail } // Only update if not already assigned
      },
      {
        $set: {
          assignedTo: cspName,
          assignedToEmail: cspEmail
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ ${cspEmail}: Updated ${result.modifiedCount} requests`);
      totalUpdated += result.modifiedCount;
    }
  }
  
  console.log(`\n📊 Total updated: ${totalUpdated} requests\n`);
  
  // Show Anele's requests now
  const aneleRequests = await LeaveRequest.find({
    assignedToEmail: 'anele@zimworx.com'
  }).select('teamMemberName leaveType status startDate').lean();
  
  console.log(`📋 Requests for anele@zimworx.com: ${aneleRequests.length}`);
  for (const r of aneleRequests.slice(0, 10)) {
    console.log(`  - ${r.teamMemberName}: ${r.leaveType} (${r.status}) - ${r.startDate}`);
  }
  
  process.exit(0);
}

fixAssignments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
