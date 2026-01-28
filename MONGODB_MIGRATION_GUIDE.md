# MongoDB Atlas Migration Guide
## Absenteeism Data: PostgreSQL → MongoDB Atlas

---

## 📋 Overview

This guide walks you through migrating absenteeism records from PostgreSQL (Neon) to MongoDB Atlas, providing a modern, scalable NoSQL solution.

---

## 🗄️ MongoDB Schema

### AbsenteeismReport Collection

```javascript
{
  _id: ObjectId,
  sourceId: String,              // Original PostgreSQL ID
  
  // Dates
  weekStart: Date,
  startDate: Date,               // Required, indexed
  endDate: Date,                 // Required, indexed
  
  // Duration
  noOfDays: Number,
  noOfDaysNoWknd: Number,        // Business days
  
  // Team Member
  nameOfAbsentee: String,        // Required, indexed
  
  // Details
  reasonForAbsence: String,
  absenteeismAuthorised: Boolean,
  leaveFormSent: Boolean,
  comment: String,
  
  // Assignment
  client: String,                // Indexed
  csp: String,                   // CSP email, indexed
  cspName: String,
  country: String,
  
  // Time Tracking
  weekNo: Number,
  month: String,
  year: Number,                  // Indexed
  timeStamp: Date,
  
  // Metadata
  source: String,                // 'google-sheets' | 'manual' | 'import' | 'api'
  createdBy: String,
  syncedAt: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

The schema includes optimized indexes for common queries:

```javascript
// Single field indexes
{ csp: 1, startDate: -1 }
{ nameOfAbsentee: 1, year: -1 }
{ client: 1, year: -1, month: 1 }
{ year: -1, month: 1 }
{ sourceId: 1 }
{ startDate: 1 }
{ endDate: 1 }
```

---

## 🚀 Migration Steps

### Step 1: Setup MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier (M0 Sandbox - 512MB)

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "M0 FREE" tier
   - Select region closest to you
   - Name your cluster (e.g., "corepto-cluster")

3. **Configure Database Access**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Authentication Method: Password
   - Username: `corepto_admin`
   - Password: Generate secure password
   - Database User Privileges: "Atlas admin"

4. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add specific IP addresses

5. **Get Connection String**
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Driver: Node.js
   - Copy the connection string:
   ```
   mongodb+srv://corepto_admin:<password>@corepto-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 2: Update Environment Variables

Edit your `.env` file:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://corepto_admin:YOUR_PASSWORD@corepto-cluster.xxxxx.mongodb.net/corepto?retryWrites=true&w=majority

# PostgreSQL (Neon) - Keep for migration
DATABASE_URL=your-postgresql-connection-string
```

**Important:** Replace:
- `<password>` with your actual database password
- `xxxxx` with your cluster ID
- Add database name `/corepto` before the `?` parameters

### Step 3: Verify Connections

Test both database connections:

```bash
# Start the server
npm run dev
```

Check the console output:
```
✅ PostgreSQL (Neon) connected
✅ MongoDB Atlas connected
```

---

## 🔄 Running the Migration

### Dry Run (Recommended First)

Preview what will be migrated without making changes:

```bash
node server/migrateAbsenteeismToMongo.js --dry-run
```

**Output:**
```
🚀 Starting Absenteeism Data Migration to MongoDB Atlas

Configuration:
  - Dry Run: YES (no data will be saved)
  - Skip Duplicates: NO
  - Batch Size: 100 records

📡 Step 1: Connecting to databases...
✅ PostgreSQL (Neon) connected
✅ MongoDB Atlas connected

📊 Step 2: Fetching records from PostgreSQL...
✅ Found 1,523 records in PostgreSQL

🔍 Step 3: Checking MongoDB for existing records...
📋 MongoDB currently has 0 absenteeism records

🔄 Step 4: Migrating records...
Processing 16 batches of up to 100 records each

📦 Batch 1/16 (Records 1-100)
  🔍 Would migrate: John Doe - 2024-01-15 to 2024-01-17
  🔍 Would migrate: Jane Smith - 2024-01-20 to 2024-01-22
  ...
```

### Full Migration

Execute the actual migration:

```bash
node server/migrateAbsenteeismToMongo.js
```

### Migration with Options

```bash
# Skip records that already exist in MongoDB
node server/migrateAbsenteeismToMongo.js --skip-duplicates

# Process in smaller batches (50 records at a time)
node server/migrateAbsenteeismToMongo.js --batch-size=50

# Combine options
node server/migrateAbsenteeismToMongo.js --skip-duplicates --batch-size=50
```

---

## 📊 Migration Output Example

```
============================================================
  ABSENTEEISM DATA MIGRATION: PostgreSQL → MongoDB Atlas
============================================================

🚀 Starting Absenteeism Data Migration to MongoDB Atlas

Configuration:
  - Dry Run: NO (will save to MongoDB)
  - Skip Duplicates: YES
  - Batch Size: 100 records

============================================================

📡 Step 1: Connecting to databases...

✅ PostgreSQL (Neon) connected
✅ MongoDB Atlas connected

📊 Step 2: Fetching records from PostgreSQL...

✅ Found 1,523 records in PostgreSQL

🔍 Step 3: Checking MongoDB for existing records...

📋 MongoDB currently has 0 absenteeism records

🔄 Step 4: Migrating records...

Processing 16 batches of up to 100 records each

📦 Batch 1/16 (Records 1-100)
------------------------------------------------------------
  ✅ Migrated: John Doe - 2024-01-15 to 2024-01-17 (2 days)
  ✅ Migrated: Jane Smith - 2024-01-20 to 2024-01-22 (2 days)
  ...

📦 Batch 2/16 (Records 101-200)
------------------------------------------------------------
  ✅ Migrated: Alice Johnson - 2024-02-01 to 2024-02-03 (2 days)
  ...

============================================================

✅ Migration Complete!

📊 Summary:
  - Total records in PostgreSQL: 1,523
  - Successfully migrated: 1,523
  - Errors: 0
  - MongoDB total records: 1,523

🔍 Verifying data integrity...
  ✅ Sample record verified: John Doe (2024)

============================================================

🔌 PostgreSQL connection closed
🔌 MongoDB connection closed

✅ Migration script completed successfully
```

---

## ✅ Post-Migration Verification

### 1. Check Record Counts

```bash
# MongoDB Shell (mongosh)
use corepto
db.absenteeismreports.countDocuments()
```

Should match PostgreSQL count:
```sql
SELECT COUNT(*) FROM absenteeism_reports;
```

### 2. Verify Sample Records

```javascript
// MongoDB
db.absenteeismreports.findOne()
```

```sql
-- PostgreSQL
SELECT * FROM absenteeism_reports LIMIT 1;
```

### 3. Test API Endpoints

```bash
# Fetch from MongoDB (add new endpoint)
curl http://localhost:4000/api/absenteeism-reports/mongo

# Compare with PostgreSQL
curl http://localhost:4000/api/absenteeism-reports
```

---

## 🔧 Updating API to Use MongoDB

After migration, update your API endpoints to use MongoDB:

### Option 1: Dual Mode (Both Databases)

Keep both PostgreSQL and MongoDB active:

```javascript
// Get from MongoDB if available, fallback to PostgreSQL
app.get('/api/absenteeism-reports', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const cspEmail = user?.role === 'csp' ? user.email : null;
    
    let reports;
    if (isMongoConnected()) {
      // Use MongoDB
      const query = cspEmail ? { csp: cspEmail } : {};
      reports = await AbsenteeismReport.find(query).sort({ startDate: -1 });
    } else {
      // Fallback to PostgreSQL
      reports = await getAbsenteeismReports(cspEmail);
    }
    
    res.json({ success: true, data: reports, source: isMongoConnected() ? 'mongodb' : 'postgresql' });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});
```

### Option 2: MongoDB Only

Switch completely to MongoDB:

```javascript
app.get('/api/absenteeism-reports', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const cspEmail = user?.role === 'csp' ? user.email : null;
    
    const query = cspEmail ? { csp: cspEmail } : {};
    const reports = await AbsenteeismReport.find(query)
      .sort({ startDate: -1 })
      .lean(); // Convert to plain JS objects
    
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});
```

---

## 🎯 Benefits of MongoDB Atlas

### Performance
- **Faster Queries**: Optimized indexes for common patterns
- **Horizontal Scaling**: Easy sharding for large datasets
- **Cloud-Native**: Managed infrastructure

### Features
- **Flexible Schema**: Easy to add new fields
- **Aggregation Pipeline**: Powerful analytics
- **Change Streams**: Real-time data monitoring
- **Full-Text Search**: Built-in search capabilities

### Cost
- **Free Tier**: 512MB storage (perfect for starting)
- **Pay-as-You-Grow**: Scale only when needed
- **No Infrastructure**: No server management

---

## 📈 Common Queries with MongoDB

### CSP-Specific Records

```javascript
// All records for a CSP
await AbsenteeismReport.find({ csp: 'tsungirirai.mukombe@zimworx.com' })
  .sort({ startDate: -1 });

// Records for current year
await AbsenteeismReport.find({ 
  csp: 'tsungirirai.mukombe@zimworx.com',
  year: 2026 
});
```

### Date Range Queries

```javascript
// Records between dates
await AbsenteeismReport.find({
  startDate: { $gte: new Date('2026-01-01') },
  endDate: { $lte: new Date('2026-12-31') }
});
```

### Aggregations

```javascript
// Total days by CSP
await AbsenteeismReport.aggregate([
  { $match: { year: 2026 } },
  { $group: { 
    _id: '$csp', 
    totalDays: { $sum: '$noOfDaysNoWknd' },
    count: { $sum: 1 }
  }},
  { $sort: { totalDays: -1 } }
]);

// Monthly breakdown
await AbsenteeismReport.aggregate([
  { $match: { csp: 'email@example.com', year: 2026 } },
  { $group: { 
    _id: '$month', 
    totalAbsences: { $sum: 1 },
    totalDays: { $sum: '$noOfDaysNoWknd' }
  }},
  { $sort: { _id: 1 } }
]);
```

---

## 🔒 Security Best Practices

1. **Rotate Passwords Regularly**
   - Change MongoDB Atlas password every 90 days

2. **Restrict Network Access**
   - Use specific IP addresses in production
   - Never use 0.0.0.0/0 in production

3. **Enable Audit Logging**
   - Track database access and changes
   - Available in M10+ tiers

4. **Use Role-Based Access**
   - Create separate users for different services
   - Limit permissions to necessary operations

---

## 🛠️ Troubleshooting

### Migration Errors

**Error: "Failed to connect to MongoDB Atlas"**
```bash
# Check connection string format
# Ensure password is URL-encoded
# Verify network access whitelist
```

**Error: "Duplicate key error"**
```bash
# Use --skip-duplicates flag
node server/migrateAbsenteeismToMongo.js --skip-duplicates
```

### Performance Issues

**Slow Queries**
```javascript
// Check if indexes are created
db.absenteeismreports.getIndexes()

// Analyze query performance
db.absenteeismreports.find({ csp: 'email' }).explain('executionStats')
```

---

## 📞 Support Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/
- **Migration Support**: Check server logs in `server/logs/`

---

**Last Updated:** January 23, 2026  
**Schema Version:** 1.0  
**Migration Script:** `server/migrateAbsenteeismToMongo.js`
