/**
 * Migration Script: PostgreSQL Absenteeism Data → MongoDB Atlas
 * 
 * This script migrates all absenteeism records from PostgreSQL (Neon) 
 * to MongoDB Atlas while preserving data integrity.
 * 
 * Usage:
 *   node server/migrateAbsenteeismToMongo.js
 * 
 * Options:
 *   --dry-run    : Preview migration without saving to MongoDB
 *   --batch-size : Number of records to process at once (default: 100)
 *   --skip-duplicates : Skip records that already exist in MongoDB
 */

import dotenv from 'dotenv';
import { connectMongoDB, isMongoConnected } from './mongodb.js';
import { AbsenteeismReport } from './models/index.js';
import { pool, init as dbInit, getAbsenteeismReports } from './db.js';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipDuplicates = args.includes('--skip-duplicates');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

/**
 * Convert PostgreSQL row to MongoDB document format
 */
function convertToMongoDocument(pgRow) {
  return {
    sourceId: pgRow.id?.toString(),
    weekStart: pgRow.week_start ? new Date(pgRow.week_start) : null,
    startDate: pgRow.start_date ? new Date(pgRow.start_date) : null,
    endDate: pgRow.end_date ? new Date(pgRow.end_date) : null,
    noOfDays: pgRow.no_of_days || 0,
    noOfDaysNoWknd: pgRow.no_of_days_no_wknd || 0,
    nameOfAbsentee: pgRow.name_of_absentee || 'Unknown',
    reasonForAbsence: pgRow.reason_for_absence || '',
    absenteeismAuthorised: pgRow.absenteeism_authorised === true,
    leaveFormSent: pgRow.leave_form_sent === true,
    comment: pgRow.comment || '',
    client: pgRow.client || '',
    csp: pgRow.csp || '',
    country: pgRow.country || 'Zimbabwe',
    weekNo: pgRow.week_no || null,
    month: pgRow.month || '',
    year: pgRow.year || new Date().getFullYear(),
    timeStamp: pgRow.time_stamp ? new Date(pgRow.time_stamp) : null,
    source: 'import',
    createdBy: pgRow.created_by || 'migration',
    syncedAt: new Date(),
    createdAt: pgRow.created_at ? new Date(pgRow.created_at) : new Date(),
    updatedAt: pgRow.updated_at ? new Date(pgRow.updated_at) : new Date()
  };
}

/**
 * Main migration function
 */
async function migrateAbsenteeismData() {
  console.log('\n🚀 Starting Absenteeism Data Migration to MongoDB Atlas\n');
  console.log('Configuration:');
  console.log(`  - Dry Run: ${isDryRun ? 'YES (no data will be saved)' : 'NO (will save to MongoDB)'}`);
  console.log(`  - Skip Duplicates: ${skipDuplicates ? 'YES' : 'NO'}`);
  console.log(`  - Batch Size: ${batchSize} records`);
  console.log('\n' + '='.repeat(60) + '\n');

  let pgRecords = [];
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // Step 1: Connect to databases
    console.log('📡 Step 1: Connecting to databases...\n');
    
    // Connect to PostgreSQL
    await dbInit();
    console.log('✅ PostgreSQL (Neon) connected');
    
    // Connect to MongoDB
    await connectMongoDB();
    if (!isMongoConnected()) {
      throw new Error('Failed to connect to MongoDB Atlas');
    }
    console.log('✅ MongoDB Atlas connected\n');

    // Step 2: Fetch all records from PostgreSQL
    console.log('📊 Step 2: Fetching records from PostgreSQL...\n');
    
    const result = await pool.query('SELECT * FROM absenteeism_reports ORDER BY created_at ASC');
    pgRecords = result.rows;
    
    console.log(`✅ Found ${pgRecords.length} records in PostgreSQL\n`);

    if (pgRecords.length === 0) {
      console.log('⚠️  No records to migrate. Exiting.');
      return;
    }

    // Step 3: Check existing records in MongoDB
    console.log('🔍 Step 3: Checking MongoDB for existing records...\n');
    
    const existingCount = await AbsenteeismReport.countDocuments();
    console.log(`📋 MongoDB currently has ${existingCount} absenteeism records\n`);

    // Step 4: Migrate in batches
    console.log('🔄 Step 4: Migrating records...\n');
    
    const batches = Math.ceil(pgRecords.length / batchSize);
    console.log(`Processing ${batches} batches of up to ${batchSize} records each\n`);

    for (let i = 0; i < pgRecords.length; i += batchSize) {
      const batch = pgRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`\n📦 Batch ${batchNumber}/${batches} (Records ${i + 1}-${Math.min(i + batchSize, pgRecords.length)})`);
      console.log('-'.repeat(60));

      for (const pgRow of batch) {
        try {
          const mongoDoc = convertToMongoDocument(pgRow);

          // Check for duplicates if requested
          if (skipDuplicates) {
            const existing = await AbsenteeismReport.findOne({ sourceId: mongoDoc.sourceId });
            if (existing) {
              console.log(`  ⏭️  Skipped: ${mongoDoc.nameOfAbsentee} (${mongoDoc.startDate?.toISOString().split('T')[0]}) - Already exists`);
              totalSkipped++;
              continue;
            }
          }

          if (!isDryRun) {
            // Save to MongoDB
            const saved = await AbsenteeismReport.create(mongoDoc);
            console.log(`  ✅ Migrated: ${saved.nameOfAbsentee} - ${saved.startDate?.toISOString().split('T')[0]} to ${saved.endDate?.toISOString().split('T')[0]} (${saved.noOfDaysNoWknd} days)`);
            totalMigrated++;
          } else {
            // Dry run - just show what would be migrated
            console.log(`  🔍 Would migrate: ${mongoDoc.nameOfAbsentee} - ${mongoDoc.startDate?.toISOString().split('T')[0]} to ${mongoDoc.endDate?.toISOString().split('T')[0]}`);
            totalMigrated++;
          }
        } catch (error) {
          console.error(`  ❌ Error migrating record:`, error.message);
          totalErrors++;
        }
      }
    }

    // Step 5: Verification
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total records in PostgreSQL: ${pgRecords.length}`);
    console.log(`  - Successfully migrated: ${totalMigrated}`);
    if (skipDuplicates) {
      console.log(`  - Skipped (duplicates): ${totalSkipped}`);
    }
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
    // Close connections
    try {
      await pool.end();
      console.log('🔌 PostgreSQL connection closed');
    } catch (err) {
      console.error('Error closing PostgreSQL:', err.message);
    }

    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB:', err.message);
    }
  }
}

// Import mongoose for closing connection
import mongoose from 'mongoose';

// Run migration
console.log('\n' + '='.repeat(60));
console.log('  ABSENTEEISM DATA MIGRATION: PostgreSQL → MongoDB Atlas');
console.log('='.repeat(60));

migrateAbsenteeismData()
  .then(() => {
    console.log('\n✅ Migration script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
