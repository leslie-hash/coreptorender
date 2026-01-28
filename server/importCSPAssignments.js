import 'dotenv/config';
import fs from 'fs';
import csv from 'csv-parse/sync';
import { connectMongoDB } from './mongodb.js';
import { TeamMember } from './models/index.js';

async function importCSPAssignments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    const csvPath = process.argv[2] || './csp_assignments.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      console.log('\nUsage: node importCSPAssignments.js <path-to-csv-file>');
      console.log('\nExpected CSV columns:');
      console.log('  CLIENT/OFFICE, TEAM MEMBER, EMAIL, CSP_EMAIL, CSP_NAME');
      process.exit(1);
    }

    console.log(`📥 Reading CSV: ${csvPath}\n`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`✅ Parsed ${records.length} records\n`);

    let updated = 0;
    let failed = 0;

    for (const record of records) {
      try {
        const email = record['Email for Team Member(s)'] || record.EMAIL;
        const cspEmail = record.CSP_EMAIL;
        const cspName = record.CSP_NAME;

        if (!email || !cspEmail) {
          console.log(`   ⚠️  Skipping row - missing email or CSP: ${JSON.stringify(record)}`);
          failed++;
          continue;
        }

        const result = await TeamMember.findOneAndUpdate(
          { email: email.toLowerCase() },
          { 
            csp: cspEmail.toLowerCase(),
            cspName: cspName || cspEmail
          }
        );

        if (result) {
          updated++;
          if (updated % 50 === 0) {
            console.log(`   ✅ ${updated} team members updated...`);
          }
        } else {
          console.log(`   ⚠️  Team member not found: ${email}`);
          failed++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing record:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Updated ${updated} team members`);
    if (failed > 0) {
      console.log(`⚠️  ${failed} records failed or skipped`);
    }

    // Show distribution
    const distribution = await TeamMember.aggregate([
      { $group: { _id: '$csp', count: { $sum: 1 }, cspName: { $first: '$cspName' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Team Member Distribution by CSP:');
    distribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} team members`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importCSPAssignments();
