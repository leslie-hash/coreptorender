import 'dotenv/config';
import axios from 'axios';
import { connectMongoDB } from './mongodb.js';
import { TeamMember, User } from './models/index.js';

const SPREADSHEET_ID = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function readAllCSPSheets() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching all CSP sheets...');
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaResponse = await axios.get(metaUrl);
    
    const sheets = metaResponse.data.sheets;
    console.log(`✅ Found ${sheets.length} CSP sheets\n`);

    // Map CSP names to their actual emails from users
    const cspNameToEmail = {};
    const users = await User.find({ role: 'csp' }).lean();
    users.forEach(user => {
      if (user.name) {
        cspNameToEmail[user.name.toLowerCase()] = {
          email: user.email,
          name: user.name
        };
      }
    });

    console.log('🔍 CSP Email Mappings:');
    Object.entries(cspNameToEmail).forEach(([name, data]) => {
      console.log(`   ${name} → ${data.email}`);
    });
    console.log();

    let totalUpdated = 0;
    const cspStats = {};

    // Process each CSP sheet (skip the first one if it's not a CSP)
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title.trim();
      
      // Skip non-CSP sheets
      if (['Input', 'Reporting', 'Dashboard', 'Validation'].some(s => sheetName.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }

      console.log(`\n📄 Processing CSP: ${sheetName}`);

      try {
        // Get values from this sheet
        const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodeURIComponent(sheetName)}'?key=${API_KEY}`;
        const response = await axios.get(valuesUrl);
        const rows = response.data.values;

        if (!rows || rows.length < 2) {
          console.log('   ⚠️  Sheet is empty');
          continue;
        }

        const headers = rows[0];
        
        // Find email column(s)
        const emailColIdx = headers.findIndex(h => 
          h && h.toLowerCase().includes('email')
        );

        if (emailColIdx === -1) {
          console.log(`   ⚠️  No email column found. Headers: ${headers.slice(0, 5).join(', ')}`);
          continue;
        }

        console.log(`   📋 Headers: ${headers.slice(0, 3).join(' | ')}`);

        // Find CSP email for this sheet
        const cspLowerName = sheetName.toLowerCase();
        let cspEmail = null;
        let cspFullName = null;

        // Try exact match first
        if (cspNameToEmail[cspLowerName]) {
          cspEmail = cspNameToEmail[cspLowerName].email;
          cspFullName = cspNameToEmail[cspLowerName].name;
        } else {
          // Try partial match
          for (const [name, data] of Object.entries(cspNameToEmail)) {
            if (cspLowerName.includes(name.split(' ')[0]) || name.includes(cspLowerName)) {
              cspEmail = data.email;
              cspFullName = data.name;
              break;
            }
          }
        }

        if (!cspEmail) {
          console.log(`   ⚠️  Could not map CSP name "${sheetName}" to a user`);
          continue;
        }

        console.log(`   ✅ Mapped to: ${cspFullName} (${cspEmail})`);

        // Process rows
        let sheetUpdated = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const email = row[emailColIdx]?.trim().toLowerCase();

          if (!email || !email.includes('@')) {
            continue;
          }

          try {
            const result = await TeamMember.findOneAndUpdate(
              { email: email },
              { 
                csp: cspEmail,
                cspName: cspFullName
              }
            );

            if (result) {
              sheetUpdated++;
            }
          } catch (error) {
            // Continue on individual errors
          }
        }

        console.log(`   ✅ Updated ${sheetUpdated} team members`);
        cspStats[cspFullName] = sheetUpdated;
        totalUpdated += sheetUpdated;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Total team members updated: ${totalUpdated}\n`);

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Final Team Member Distribution by CSP:');
    distribution.forEach(item => {
      console.log(`   ${item.cspName || 'Unassigned'} (${item._id}): ${item.count} team members`);
    });

    console.log('\n✅ Production CSP setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

readAllCSPSheets();
