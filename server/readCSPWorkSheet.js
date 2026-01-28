import 'dotenv/config';
import axios from 'axios';
import { connectMongoDB } from './mongodb.js';
import { TeamMember, User } from './models/index.js';

// Master sheet with all CSP work info
const SPREADSHEET_ID = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function readCSPSheet() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching CSP work info sheet...');
    
    // Try to get metadata first
    try {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
      const metaResponse = await axios.get(metaUrl);
      console.log(`✅ Spreadsheet found: ${metaResponse.data.properties.title}\n`);
      
      console.log('📋 Available sheets:');
      metaResponse.data.sheets.forEach(sheet => {
        console.log(`   - ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
      });
      console.log();
    } catch (metaError) {
      console.log('⚠️  Could not fetch metadata, trying direct values read\n');
    }

    // Try reading the specific sheet by GID
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values?key=${API_KEY}`;
    const response = await axios.get(valuesUrl);
    
    if (!response.data.sheets || response.data.sheets.length === 0) {
      console.log('❌ No sheets found in spreadsheet');
      process.exit(1);
    }

    console.log(`✅ Found ${response.data.sheets.length} sheet(s)\n`);

    // Process each sheet range
    for (const range of response.data.sheets) {
      const sheetName = range.range.split('!')[0].replace(/'/g, '');
      const values = range.values;

      if (!values || values.length < 2) {
        console.log(`⏭️  Skipping empty sheet: ${sheetName}`);
        continue;
      }

      console.log(`\n📄 Sheet: ${sheetName}`);
      console.log(`   Rows: ${values.length}`);
      
      // Show header
      const headers = values[0];
      console.log(`   Headers: ${headers.slice(0, 5).join(' | ')}...`);

      // Find the team member email column
      const emailColIdx = headers.findIndex(h => 
        h && h.toLowerCase().includes('email') && 
        (h.toLowerCase().includes('team') || h.toLowerCase().includes('member'))
      );

      if (emailColIdx === -1) {
        console.log(`   ⚠️  No team member email column found`);
        continue;
      }

      // Find CSP-related columns
      const cspColIdx = headers.findIndex(h => h && h.toLowerCase().includes('csp'));
      const clientColIdx = headers.findIndex(h => h && (h.toLowerCase().includes('client') || h.toLowerCase().includes('office')));

      console.log(`   📍 Email column: ${emailColIdx}, CSP: ${cspColIdx}, Client: ${clientColIdx}`);

      // Process rows
      let updated = 0;
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;

        const email = row[emailColIdx]?.trim().toLowerCase();
        const cspEmail = cspColIdx !== -1 ? row[cspColIdx]?.trim().toLowerCase() : null;
        const client = clientColIdx !== -1 ? row[clientColIdx]?.trim() : null;

        if (!email || !email.includes('@')) continue;

        try {
          let updateData = { clientName: client || 'Unknown' };

          // If there's CSP info in the sheet, use it
          if (cspEmail && cspEmail.includes('@')) {
            updateData.csp = cspEmail;
          }

          const result = await TeamMember.findOneAndUpdate(
            { email: email },
            updateData
          );

          if (result) {
            updated++;
            if (updated % 100 === 0) {
              console.log(`   ✅ ${updated} team members updated...`);
            }
          }
        } catch (error) {
          // Continue on error
        }
      }

      console.log(`   ✅ Updated ${updated} team members`);
    }

    // Show final distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Final Distribution:');
    distribution.forEach(item => {
      console.log(`   ${item._id || 'unassigned'}: ${item.count} team members`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.status === 403) {
      console.error('   The API key does not have access to this sheet.');
      console.error('   Please verify the sheet is shared and the API key is correct.');
    }
    process.exit(1);
  }
}

readCSPSheet();
