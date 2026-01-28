import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function checkTeamMemberEmails() {
  try {
    await connectMongoDB();
    
    const sample = await TeamMember.find({}).limit(10).lean();
    console.log('Sample team members from database:');
    sample.forEach(tm => {
      console.log(`  - ${tm.teamMemberName} | Email: ${tm.email} | CSP: ${tm.csp}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTeamMemberEmails();
