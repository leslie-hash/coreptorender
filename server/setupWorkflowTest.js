/**
 * Setup test accounts for full workflow testing
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB } from './mongodb.js';
import { TeamMember, User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function setupWorkflowTest() {
  await connectMongoDB();
  
  const testPassword = bcrypt.hashSync('test123', 10);
  
  // Find a team member with a CSP assigned
  const tm = await TeamMember.findOne({ 
    csp: { $exists: true, $ne: '' },
    email: { $exists: true, $ne: '' }
  }).lean();
  
  if (!tm) {
    console.log('No team member with CSP found!');
    process.exit(1);
  }
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          TEST ACCOUNTS FOR LEAVE WORKFLOW                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Ensure team member user exists with password
  let tmUser = await User.findOne({ email: tm.email.toLowerCase() });
  if (!tmUser) {
    await User.create({
      email: tm.email.toLowerCase(),
      name: tm.teamMemberName,
      password: testPassword,
      role: 'team-member',
      cspEmail: tm.csp,
      clientName: tm.clientName || tm.client,
      isActive: true
    });
    console.log('Created team member user account');
  } else {
    await User.updateOne({ _id: tmUser._id }, { password: testPassword });
  }
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: LOGIN AS TEAM MEMBER                                │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ Email:    ${tm.email.padEnd(48)}│`);
  console.log(`│ Name:     ${tm.teamMemberName.padEnd(48)}│`);
  console.log(`│ Client:   ${(tm.clientName || tm.client || 'N/A').padEnd(48)}│`);
  console.log(`│ Password: ${'test123'.padEnd(48)}│`);
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Ensure CSP user exists with password
  let cspUser = await User.findOne({ email: tm.csp.toLowerCase() });
  if (!cspUser) {
    const cspName = tm.csp.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    await User.create({
      email: tm.csp.toLowerCase(),
      name: cspName,
      password: testPassword,
      role: 'csp',
      isActive: true
    });
    cspUser = { name: cspName, email: tm.csp };
    console.log('Created CSP user account');
  } else {
    await User.updateOne({ _id: cspUser._id }, { password: testPassword });
  }
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: LOGIN AS CSP (Approver)                             │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ Email:    ${tm.csp.padEnd(48)}│`);
  console.log(`│ Name:     ${(cspUser.name || 'CSP').padEnd(48)}│`);
  console.log(`│ Password: ${'test123'.padEnd(48)}│`);
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    WORKFLOW STEPS                            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 1. Login as TEAM MEMBER                                      ║');
  console.log('║ 2. Go to "Submit Leave Request"                              ║');
  console.log('║ 3. Fill out the form and submit                              ║');
  console.log('║ 4. Logout                                                    ║');
  console.log('║ 5. Login as CSP                                              ║');
  console.log('║ 6. Go to "Leave Requests" or Dashboard                       ║');
  console.log('║ 7. Find the request and click "Review"                       ║');
  console.log('║ 8. Approve the request                                       ║');
  console.log('║ 9. Send to Client/Payroll                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  process.exit(0);
}

setupWorkflowTest().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
