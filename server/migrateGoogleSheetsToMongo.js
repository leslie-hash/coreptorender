/**
 * Migration Script: Google Sheets Absenteeism Data → MongoDB Atlas
 * 
 * This script migrates absenteeism records from Google Sheets master spreadsheet
 * directly to MongoDB Atlas.
 * 
 * Usage:
 *   node server/migrateGoogleSheetsToMongo.js
 * 
 * Options:
 *   --dry-run    : Preview migration without saving to MongoDB
 *   --batch-size : Number of records to process at once (default: 100)
 */

import dotenv from 'dotenv';
import { connectMongoDB, isMongoConnected } from './mongodb.js';
import { AbsenteeismReport } from './models/index.js';
import { readAbsenteeismFromGoogleSheets } from './googleSheetsAbsenteeism.js';
import mongoose from 'mongoose';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

/**
 * Convert Google Sheets record to MongoDB document format
 */
function convertToMongoDocument(sheetRecord) {
  return {
    sourceId: sheetRecord.id?.toString(),
    weekStart: sheetRecord.weekStart ? new Date(sheetRecord.weekStart) : null,
    startDate: sheetRecord.startDate ? new Date(sheetRecord.startDate) : null,
    endDate: sheetRecord.endDate ? new Date(sheetRecord.endDate) : null,
    noOfDays: sheetRecord.noOfDays || 0,
    noOfDaysNoWknd: sheetRecord.noOfDaysNoWknd || 0,
    nameOfAbsentee: sheetRecord.nameOfAbsentee || 'Unknown',
    reasonForAbsence: sheetRecord.reasonForAbsence || '',
    absenteeismAuthorised: sheetRecord.absenteeismAuthorised === 'Yes' || sheetRecord.absenteeismAuthorised === true,
    leaveFormSent: sheetRecord.leaveFormSent === 'Yes' || sheetRecord.leaveFormSent === true,
    comment: sheetRecord.comment || '',
    client: sheetRecord.client || '',
    csp: sheetRecord.csp || '',
    country: sheetRecord.country || 'Zimbabwe',
    weekNo: sheetRecord.weekNo || null,
    month: sheetRecord.month || '',
    year: sheetRecord.year || new Date().getFullYear(),
    timeStamp: sheetRecord.timeStamp ? new Date(sheetRecord.timeStamp) : null,
    source: 'google-sheets',
    createdBy: 'migration',
    syncedAt: new Date(),
    createdAt: sheetRecord.syncedAt ? new Date(sheetRecord.syncedAt) : new Date(),
    updatedAt: new Date()
  };
}

/**
 * Main migration function
 */
async function migrateFromGoogleSheets() {
  console.log('\n🚀 Starting Migration: Google Sheets → MongoDB Atlas\n');
  console.log('Configuration:');
  console.log(`  - Dry Run: ${isDryRun ? 'YES (no data will be saved)' : 'NO (will save to MongoDB)'}`);
  console.log(`  - Batch Size: ${batchSize} records`);
  console.log('\n' + '='.repeat(60) + '\n');

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // Step 1: Check configuration
    console.log('🔍 Step 1: Checking configuration...\n');
    
    const spreadsheetId = process.env.ABSENTEEISM_SPREADSHEET_ID;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetName = process.env.ABSENTEEISM_SHEET_NAME || 'Sheet1';

    if (!spreadsheetId || !apiKey) {
      throw new Error('Missing configuration: ABSENTEEISM_SPREADSHEET_ID or GOOGLE_SHEETS_API_KEY');
    }

    console.log(`✅ Spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
    console.log(`✅ Sheet Name: ${sheetName}`);
    console.log(`✅ API Key configured\n`);

    // Step 2: Connect to MongoDB
    console.log('📡 Step 2: Connecting to MongoDB Atlas...\n');
    
    await connectMongoDB();
    if (!isMongoConnected()) {
      throw new Error('Failed to connect to MongoDB Atlas');
    }
    console.log('✅ MongoDB Atlas connected\n');

    // Step 3: Fetch data from Google Sheets
    console.log('📊 Step 3: Fetching records from Google Sheets...\n');
    
    const result = await readAbsenteeismFromGoogleSheets(spreadsheetId, apiKey, sheetName);
    
    if (!result.success) {
      throw new Error(`Failed to fetch from Google Sheets: ${result.error}`);
    }

    const sheetRecords = result.records || [];
    console.log(`✅ Found ${sheetRecords.length} records in Google Sheets\n`);

    if (sheetRecords.length === 0) {
      console.log('⚠️  No records to migrate. Exiting.');
      return;
    }

    // Step 4: Check existing records in MongoDB
    console.log('🔍 Step 4: Checking MongoDB for existing records...\n');
    
    const existingCount = await AbsenteeismReport.countDocuments();
    console.log(`📋 MongoDB currently has ${existingCount} absenteeism records\n`);

    // Step 5: Migrate in batches
    console.log('🔄 Step 5: Migrating records...\n');
    
    const batches = Math.ceil(sheetRecords.length / batchSize);
    console.log(`Processing ${batches} batches of up to ${batchSize} records each\n`);

    for (let i = 0; i < sheetRecords.length; i += batchSize) {
      const batch = sheetRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`\n📦 Batch ${batchNumber}/${batches} (Records ${i + 1}-${Math.min(i + batchSize, sheetRecords.length)})`);
      console.log('-'.repeat(60));

      for (const sheetRecord of batch) {
        try {
          const mongoDoc = convertToMongoDocument(sheetRecord);

          // Skip records with invalid dates
          if (!mongoDoc.startDate || !mongoDoc.endDate || !mongoDoc.nameOfAbsentee) {
            console.log(`  ⏭️  Skipped: Invalid record (missing required fields)`);
            totalSkipped++;
            continue;
          }

          // Check for duplicates
          const existing = await AbsenteeismReport.findOne({ 
            sourceId: mongoDoc.sourceId,
            nameOfAbsentee: mongoDoc.nameOfAbsentee,
            startDate: mongoDoc.startDate
          });

          if (existing) {
            console.log(`  ⏭️  Skipped: ${mongoDoc.nameOfAbsentee} (${mongoDoc.startDate?.toISOString().split('T')[0]}) - Already exists`);
            totalSkipped++;
            continue;
          }

          if (!isDryRun) {
            // Save to MongoDB
            const saved = await AbsenteeismReport.create(mongoDoc);
            console.log(`  ✅ Migrated: ${saved.nameOfAbsentee} - ${saved.startDate?.toISOString().split('T')[0]} to ${saved.endDate?.toISOString().split('T')[0]} (${saved.noOfDaysNoWknd} days) [${saved.csp}]`);
            totalMigrated++;
          } else {
            // Dry run - just show what would be migrated
            console.log(`  🔍 Would migrate: ${mongoDoc.nameOfAbsentee} - ${mongoDoc.startDate?.toISOString().split('T')[0]} to ${mongoDoc.endDate?.toISOString().split('T')[0]} (${mongoDoc.noOfDaysNoWknd} days)`);
            totalMigrated++;
          }
        } catch (error) {
          console.error(`  ❌ Error migrating record:`, error.message);
          totalErrors++;
        }
      }
    }

    // Step 6: Verification
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total records in Google Sheets: ${sheetRecords.length}`);
    console.log(`  - Successfully migrated: ${totalMigrated}`);
    console.log(`  - Skipped (duplicates/invalid): ${totalSkipped}`);
    if (totalErrors > 0) {
      console.log(`  - Errors: ${totalErrors}`);
    }

    if (!isDryRun) {
      const finalCount = await AbsenteeismReport.countDocuments();
      console.log(`  - MongoDB total records: ${finalCount}`);
      
      // Verify data integrity
      console.log('\n🔍 Verifying data integrity...');
      const sampleCheck = await AbsenteeismReport.findOne().sort({ createdAt: 1 });
      if (sampleCheck) {
        console.log(`  ✅ Sample record verified: ${sampleCheck.nameOfAbsentee} (${sampleCheck.year})`);
      }

      // Show CSP breakdown
      console.log('\n📊 Records by CSP:');
      const cspStats = await AbsenteeismReport.aggregate([
        { $group: { _id: '$csp', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      for (const stat of cspStats) {
        console.log(`  - ${stat._id || 'Unknown'}: ${stat.count} records`);
      }
    } else {
      console.log('\n⚠️  DRY RUN MODE: No data was actually saved to MongoDB');
      console.log('   Run without --dry-run to perform actual migration');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB:', err.message);
    }
  }
}

// Run migration
console.log('\n' + '='.repeat(60));
console.log('  MIGRATION: Google Sheets → MongoDB Atlas');
console.log('='.repeat(60));

migrateFromGoogleSheets()
  .then(() => {
    console.log('\n✅ Migration script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
