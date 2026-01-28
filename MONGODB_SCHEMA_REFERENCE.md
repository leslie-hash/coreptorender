# Quick Reference: MongoDB Absenteeism Schema

## 🗄️ Collection Name
`absenteeismreports`

## 📋 Document Structure

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  sourceId: "1704067200000-1",
  
  weekStart: ISODate("2024-01-01T00:00:00Z"),
  startDate: ISODate("2024-01-15T00:00:00Z"),
  endDate: ISODate("2024-01-17T00:00:00Z"),
  
  noOfDays: 3,
  noOfDaysNoWknd: 2,
  
  nameOfAbsentee: "John Doe",
  reasonForAbsence: "Sick Leave",
  absenteeismAuthorised: true,
  leaveFormSent: true,
  comment: "Medical certificate provided",
  
  client: "ABC Corporation",
  csp: "tsungirirai.mukombe@zimworx.com",
  cspName: "Tsungirirai Mukombe",
  country: "Zimbabwe",
  
  weekNo: 3,
  month: "January",
  year: 2024,
  timeStamp: ISODate("2024-01-15T09:30:00Z"),
  
  source: "google-sheets",
  createdBy: "system",
  syncedAt: ISODate("2024-01-23T10:00:00Z"),
  
  createdAt: ISODate("2024-01-15T09:30:00Z"),
  updatedAt: ISODate("2024-01-23T10:00:00Z")
}
```

## 🔑 Indexes

```javascript
{ _id: 1 }                                    // Default primary key
{ csp: 1, startDate: -1 }                    // CSP queries
{ nameOfAbsentee: 1, year: -1 }              // Employee history
{ client: 1, year: -1, month: 1 }            // Client reports
{ year: -1, month: 1 }                       // Time-based queries
{ sourceId: 1 }                              // Migration tracking
```

## 🚀 Quick Commands

### Migration

```bash
# Dry run (preview only)
node server/migrateAbsenteeismToMongo.js --dry-run

# Full migration
node server/migrateAbsenteeismToMongo.js

# Skip duplicates
node server/migrateAbsenteeismToMongo.js --skip-duplicates

# Custom batch size
node server/migrateAbsenteeismToMongo.js --batch-size=50
```

### MongoDB Queries

```javascript
// Find by CSP
db.absenteeismreports.find({ csp: "email@example.com" })

// Find by date range
db.absenteeismreports.find({
  startDate: { $gte: ISODate("2024-01-01") },
  endDate: { $lte: ISODate("2024-12-31") }
})

// Count by year
db.absenteeismreports.countDocuments({ year: 2024 })

// Aggregation - Total days by CSP
db.absenteeismreports.aggregate([
  { $group: { 
    _id: "$csp", 
    totalDays: { $sum: "$noOfDaysNoWknd" },
    count: { $sum: 1 }
  }}
])
```

## 📊 Mongoose Queries

```javascript
// Find all for CSP
await AbsenteeismReport.find({ csp: cspEmail })
  .sort({ startDate: -1 });

// Find with date range
await AbsenteeismReport.find({
  startDate: { $gte: new Date('2024-01-01') },
  endDate: { $lte: new Date('2024-12-31') }
});

// Create new record
await AbsenteeismReport.create({
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-17'),
  nameOfAbsentee: 'John Doe',
  csp: 'email@example.com',
  // ... other fields
});

// Update record
await AbsenteeismReport.findByIdAndUpdate(
  id,
  { $set: { comment: 'Updated comment' } },
  { new: true }
);

// Delete record
await AbsenteeismReport.findByIdAndDelete(id);
```

## 🔧 Environment Setup

```env
# Add to .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/corepto?retryWrites=true&w=majority
```

## ✅ Validation Rules

| Field | Type | Required | Indexed | Default |
|-------|------|----------|---------|---------|
| sourceId | String | No | Yes | - |
| startDate | Date | **Yes** | Yes | - |
| endDate | Date | **Yes** | Yes | - |
| nameOfAbsentee | String | **Yes** | Yes | - |
| csp | String | No | Yes | - |
| client | String | No | Yes | - |
| year | Number | No | Yes | Current year |
| absenteeismAuthorised | Boolean | No | No | false |
| source | Enum | No | No | 'google-sheets' |

## 📈 Performance Tips

1. **Use Lean Queries** for read-only operations:
   ```javascript
   await AbsenteeismReport.find().lean()
   ```

2. **Project Only Needed Fields**:
   ```javascript
   await AbsenteeismReport.find().select('nameOfAbsentee startDate endDate')
   ```

3. **Use Indexes** for filtering:
   ```javascript
   // Good (uses index)
   await AbsenteeismReport.find({ csp: 'email@example.com' })
   
   // Bad (full collection scan)
   await AbsenteeismReport.find({ comment: { $regex: /sick/ } })
   ```

## 🔍 Useful Aggregations

### Monthly Summary
```javascript
await AbsenteeismReport.aggregate([
  { $match: { year: 2024 } },
  { $group: {
    _id: { month: '$month', csp: '$csp' },
    totalDays: { $sum: '$noOfDaysNoWknd' },
    count: { $sum: 1 }
  }},
  { $sort: { '_id.month': 1 } }
])
```

### Top Absentees
```javascript
await AbsenteeismReport.aggregate([
  { $match: { year: 2024 } },
  { $group: {
    _id: '$nameOfAbsentee',
    totalDays: { $sum: '$noOfDaysNoWknd' },
    occurrences: { $sum: 1 }
  }},
  { $sort: { totalDays: -1 } },
  { $limit: 10 }
])
```

---

**See full documentation:** [MONGODB_MIGRATION_GUIDE.md](MONGODB_MIGRATION_GUIDE.md)
