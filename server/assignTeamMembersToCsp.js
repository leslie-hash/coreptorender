import dotenv from 'dotenv';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

dotenv.config();

async function assignTeamMembers() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');
    
    const cspEmail = process.argv[2] || 'anele@zimworx.com';
    const limit = parseInt(process.argv[3]) || 50;
    
    console.log(`Assigning ${limit} team members to ${cspEmail}...`);
    
    // Get unassigned team members
    const result = await TeamMember.updateMany(
      { csp: 'unassigned@zimworx.org' },
      { 
        $set: { 
          csp: cspEmail,
          cspName: cspEmail.split('@')[0].replace('.', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        } 
      },
      { limit }
    );
    
    console.log(`✅ Assigned ${result.modifiedCount} team members to ${cspEmail}`);
    
    // Verify
    const count = await TeamMember.countDocuments({ csp: cspEmail });
    console.log(`✅ ${cspEmail} now has ${count} team members total`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignTeamMembers();
