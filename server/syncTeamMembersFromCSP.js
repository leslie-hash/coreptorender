import 'dotenv/config';
import axios from 'axios';
import { connectMongoDB } from './mongodb.js';
import { TeamMember, User } from './models/index.js';

const SPREADSHEET_ID = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function syncTeamMembersFromCSPSheets() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching all CSP sheets...');
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaResponse = await axios.get(metaUrl);
    
    const sheets = metaResponse.data.sheets;
    console.log(`✅ Found ${sheets.length} sheets\n`);

    // Map CSP names to emails
    const cspNameToEmail = {};
    const users = await User.find({ role: 'csp' }).lean();
    users.forEach(user => {
      const nameLower = user.name.toLowerCase();
      cspNameToEmail[nameLower] = {
        email: user.email,
        name: user.name
      };
    });

    let totalMatched = 0;
    let totalNotFound = 0;

    // Process each CSP sheet
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title.trim();
      
      // Skip non-CSP sheets
      if (['Input', 'Reporting', 'Dashboard', 'Validation'].some(s => sheetName.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }

      console.log(`\n📄 Processing CSP: ${sheetName}`);

      try {
        const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodeURIComponent(sheetName)}'?key=${API_KEY}`;
        const response = await axios.get(valuesUrl);
        const rows = response.data.values;

        if (!rows || rows.length < 2) {
          console.log('   ⚠️  Sheet is empty');
          continue;
        }

        const headers = rows[0];
        
        // Find team member and email columns (case-insensitive, flexible matching)
        const tmColIdx = headers.findIndex(h => 
          h && (h.toLowerCase().includes('team member') || h.toLowerCase().includes('member') || h.toLowerCase() === 'name')
        );
        
        const emailColIdx = headers.findIndex(h => 
          h && h.toLowerCase().includes('email')
        );

        if (tmColIdx === -1) {
          console.log(`   ⚠️  No "Team Member" column found`);
          continue;
        }

        // Find CSP email
        const cspLower = sheetName.toLowerCase();
        let cspEmail = null;
        let cspFullName = null;

        // Try exact match
        if (cspNameToEmail[cspLower]) {
          cspEmail = cspNameToEmail[cspLower].email;
          cspFullName = cspNameToEmail[cspLower].name;
        } else {
          // Try partial match on first name
          const firstName = cspLower.split(' ')[0];
          for (const [name, data] of Object.entries(cspNameToEmail)) {
            if (name.includes(firstName) || cspLower.includes(name.split(' ')[0])) {
              cspEmail = data.email;
              cspFullName = data.name;
              break;
            }
          }
        }

        if (!cspEmail) {
          console.log(`   ⚠️  Could not map CSP name to user`);
          continue;
        }

        console.log(`   ✅ Mapped to: ${cspFullName} (${cspEmail})`);
        console.log(`   📍 Team Member column: ${tmColIdx}, Email column: ${emailColIdx}`);

        // Process rows
        let sheetMatched = 0;
        let sheetNotFound = 0;
        const processedNames = new Set();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const teamMemberName = row[tmColIdx]?.trim();
          const teamMemberEmail = emailColIdx !== -1 ? row[emailColIdx]?.trim().toLowerCase() : null;

          if (!teamMemberName) continue;
          if (processedNames.has(teamMemberName)) continue; // Skip duplicates

          processedNames.add(teamMemberName);

          try {
            // Try matching by email first
            let result = null;
            if (teamMemberEmail && teamMemberEmail.includes('@')) {
              result = await TeamMember.findOneAndUpdate(
                { email: teamMemberEmail },
                { 
                  csp: cspEmail,
                  cspName: cspFullName,
                  teamMemberName: teamMemberName
                }
              );
            }

            // If email match didn't work, try name match
            if (!result) {
              result = await TeamMember.findOneAndUpdate(
                { teamMemberName: teamMemberName },
                { 
                  csp: cspEmail,
                  cspName: cspFullName,
                  email: teamMemberEmail || undefined
                }
              );
            }

            if (result) {
              sheetMatched++;
            } else {
              sheetNotFound++;
            }
          } catch (error) {
            // Continue on error
          }
        }

        console.log(`   ✅ Matched: ${sheetMatched}, Not Found: ${sheetNotFound}`);
        totalMatched += sheetMatched;
        totalNotFound += sheetNotFound;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Total matched: ${totalMatched} team members`);
    console.log(`⚠️  Not found: ${totalNotFound}\n`);

    // Show final distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Final Team Member Distribution by CSP:');
    distribution.forEach(item => {
      console.log(`   ${(item.cspName || 'Unassigned').padEnd(25)}: ${item.count} team members`);
    });

    console.log('\n✅ Team member sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncTeamMembersFromCSPSheets();
