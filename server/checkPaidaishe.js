import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB } from './mongodb.js';
import { LeaveRequest } from './models/index.js';

async function main() {
  await connectMongoDB();
  
  const req = await LeaveRequest.findOne({ teamMemberName: 'Paidaishe Mbishi' }).lean();
  
  if (req) {
    console.log('Request found:');
    console.log('  ID:', req._id.toString());
    console.log('  Status:', req.status);
    console.log('  Team Member:', req.teamMemberName);
    console.log('  Leave Type:', req.leaveType);
    console.log('  Days:', req.days);
    console.log('  Start:', req.startDate);
    console.log('  End:', req.endDate);
  } else {
    console.log('Request not found');
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
