import 'dotenv/config';
import axios from 'axios';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

const SPREADSHEET_ID = '1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function getAllSheets() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching all sheets from master spreadsheet...');
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaResponse = await axios.get(metadataUrl);
    
    const sheets = metaResponse.data.sheets;
    console.log(`✅ Found ${sheets.length} sheets\n`);

    // Log sheet names
    console.log('📋 Available Sheets:');
    sheets.forEach((sheet, idx) => {
      console.log(`   ${idx}: ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
    });
    console.log();

    // Process each sheet
    let totalUpdated = 0;
    const cspData = {};

    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      console.log(`\n🔄 Processing sheet: "${sheetName}"`);

      try {
        const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodeURIComponent(sheetName)}'?key=${API_KEY}`;
        const response = await axios.get(valuesUrl);
        const rows = response.data.values;

        if (!rows || rows.length < 2) {
          console.log('   ⚠️  Sheet is empty or has no data');
          continue;
        }

        console.log(`   📊 Found ${rows.length} rows`);

        // Parse header row
        const headers = rows[0];
        console.log(`   📋 Headers: ${headers.join(', ')}`);

        // Find column indices
        const emailColIdx = headers.findIndex(h => h?.toLowerCase().includes('email') && h?.toLowerCase().includes('team'));
        const clientColIdx = headers.findIndex(h => h?.toLowerCase().includes('client') || h?.toLowerCase().includes('office'));

        if (emailColIdx === -1) {
          console.log('   ⚠️  No "Email" column found');
          continue;
        }

        console.log(`   📍 Email column: ${emailColIdx}, Client column: ${clientColIdx}`);

        // Process data rows
        let sheetUpdated = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const email = row[emailColIdx]?.trim().toLowerCase();
          const client = row[clientColIdx]?.trim();
          const cspName = sheetName; // Use sheet name as CSP name

          if (!email || !email.includes('@')) {
            continue;
          }

          try {
            const result = await TeamMember.findOneAndUpdate(
              { email: email },
              { 
                csp: email, // Temporarily use email as csp identifier
                cspName: cspName,
                clientName: client || 'Unknown'
              }
            );

            if (result) {
              sheetUpdated++;
              if (sheetUpdated % 50 === 0) {
                console.log(`     ✅ ${sheetUpdated} team members updated...`);
              }
            }
          } catch (error) {
            // Silently skip errors for individual records
          }
        }

        console.log(`   ✅ Updated ${sheetUpdated} team members from "${sheetName}"`);
        totalUpdated += sheetUpdated;
      } catch (error) {
        console.log(`   ❌ Error processing sheet: ${error.message}`);
      }
    }

    console.log(`\n✅ Total updated: ${totalUpdated} team members\n`);

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$cspName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Team Member Distribution by CSP/Sheet:');
    distribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} team members`);
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

getAllSheets();
