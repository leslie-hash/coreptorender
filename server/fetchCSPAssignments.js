import 'dotenv/config';
import axios from 'axios';
import { connectMongoDB } from './mongodb.js';
import { TeamMember, User } from './models/index.js';

const SPREADSHEET_ID = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';
const SHEET_GID = 210807108;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function fetchCSPAssignments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching CSP assignments from Google Sheet...');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'Sheet1'?key=${API_KEY}`;
    
    const response = await axios.get(url);
    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('❌ No data found in sheet');
      process.exit(1);
    }

    console.log(`✅ Fetched ${rows.length} rows\n`);
    
    // Log first few rows to understand structure
    console.log('📋 Sheet Structure:');
    rows.slice(0, 5).forEach((row, idx) => {
      console.log(`   Row ${idx}: ${JSON.stringify(row)}`);
    });

    // Parse CSP and team member assignments
    const cspAssignments = {};
    
    // Assuming format: CSP Name | Email | Team Member Name | Team Member Email
    for (let i = 1; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      if (row && row.length >= 2) {
        const cspName = row[0]?.trim();
        const cspEmail = row[1]?.trim();
        
        if (cspEmail && cspEmail.includes('@zimworx')) {
          if (!cspAssignments[cspEmail]) {
            cspAssignments[cspEmail] = {
              name: cspName,
              teamMembers: []
            };
          }
          
          // If there's team member info
          if (row.length > 2) {
            const tmName = row[2]?.trim();
            const tmEmail = row[3]?.trim();
            if (tmEmail) {
              cspAssignments[cspEmail].teamMembers.push({
                name: tmName,
                email: tmEmail
              });
            }
          }
        }
      }
    }

    console.log('\n📊 CSP Assignments Found:');
    Object.entries(cspAssignments).forEach(([email, data]) => {
      console.log(`   ${email} (${data.name}): ${data.teamMembers.length} team members`);
    });

    // Now update team members in MongoDB based on assignments
    console.log('\n🔄 Updating team member assignments...\n');

    let updated = 0;
    for (const [cspEmail, cspData] of Object.entries(cspAssignments)) {
      for (const tmData of cspData.teamMembers) {
        const result = await TeamMember.findOneAndUpdate(
          { email: tmData.email.toLowerCase() },
          { 
            csp: cspEmail,
            cspName: cspData.name
          }
        );
        if (result) {
          updated++;
        }
      }
    }

    console.log(`✅ Updated ${updated} team members\n`);

    // Show final distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Final Team Member Distribution by CSP:');
    distribution.forEach(item => {
      console.log(`   ${item._id} (${item.cspName}): ${item.count} team members`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', error.response.data);
    }
    process.exit(1);
  }
}

fetchCSPAssignments();
