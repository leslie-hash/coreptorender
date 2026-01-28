/**
 * Set test password for sample users to enable login testing
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB } from './mongodb.js';
import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function setTestPasswords() {
  await connectMongoDB();
  
  const testPassword = bcrypt.hashSync('test123', 10);
  
  console.log('\n========================================');
  console.log('  Setting test password: test123');
  console.log('========================================\n');
  
  // Update CSPs
  const csps = await User.find({ role: 'csp' }).limit(5).lean();
  console.log('CSP Accounts:');
  for (const csp of csps) {
    await User.updateOne({ _id: csp._id }, { password: testPassword });
    console.log(`  ✅ ${csp.email} (${csp.name})`);
  }
  
  // Update team members
  const members = await User.find({ role: 'team-member' }).limit(5).lean();
  if (members.length > 0) {
    console.log('\nTeam Member Accounts:');
    for (const m of members) {
      await User.updateOne({ _id: m._id }, { password: testPassword });
      console.log(`  ✅ ${m.email} (${m.name})`);
    }
  }
  
  // Update admin
  const admin = await User.findOne({ role: 'admin' }).lean();
  if (admin) {
    await User.updateOne({ _id: admin._id }, { password: testPassword });
    console.log('\nAdmin Account:');
    console.log(`  ✅ ${admin.email} (${admin.name})`);
  }
  
  console.log('\n========================================');
  console.log('  All accounts above can login with:');
  console.log('  Password: test123');
  console.log('========================================\n');
  
  process.exit(0);
}

setTestPasswords().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
