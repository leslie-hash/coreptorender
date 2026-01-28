/**
 * Check CSP assignment for team member
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB } from './mongodb.js';
import { TeamMember, LeaveRequest } from './models/index.js';

async function check() {
  await connectMongoDB();
  
  // Check Paidaishe's CSP
  const tm = await TeamMember.findOne({ email: 'paidaishe.mbishi@zimworx.org' }).lean();
  console.log('\nPaidaishe TeamMember record:');
  console.log('  CSP:', tm?.csp);
  console.log('  Client:', tm?.clientName || tm?.client);
  
  // Check leave requests
  const lr = await LeaveRequest.find({ 
    $or: [
      { teamMemberName: /paidaishe/i },
      { teamMember: /paidaishe/i }
    ]
  }).lean();
  
  console.log('\nLeave requests from Paidaishe:', lr.length);
  for (const r of lr) {
    console.log(`  - ${r.requestId}: assigned to ${r.assignedToEmail || 'none'}, status: ${r.status}`);
  }
  
  // Check Anele's team members
  const aneleTeam = await TeamMember.find({ csp: 'anele@zimworx.com' }).select('teamMemberName email').lean();
  console.log('\nAnele team members:', aneleTeam.length);
  console.log('  Sample:', aneleTeam.slice(0, 3).map(m => m.teamMemberName).join(', '));
  
  // Is Paidaishe in Anele's team?
  const isPaidaisheInAneleTeam = aneleTeam.some(m => m.email === 'paidaishe.mbishi@zimworx.org');
  console.log('\nIs Paidaishe in Anele team?', isPaidaisheInAneleTeam);
  
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
