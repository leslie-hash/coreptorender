# Absenteeism Data Flow: Google Sheets → PostgreSQL

## Database Setup (Already Configured!)

### **Free Open-Source Database: PostgreSQL via Neon**
- **Provider**: Neon (https://neon.tech)
- **Plan**: Free tier (500MB storage)
- **Connection**: Configured in `.env` file
- **Status**: ✅ Active and ready

```env
DATABASE_URL=postgresql://neondb_owner:npg_QpM1ruI5tDUJ@ep-odd-breeze-agbl17ur-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS                                    │
│  Absenteeism Tracker (Input Sheet - Columns A-Q)                   │
│  • Historical data entered manually                                 │
│  • 17 columns of absenteeism information                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP API Call
                             │ POST /api/absenteeism/import-from-sheets
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js)                         │
│  • Reads data from Google Sheets API                               │
│  • Parses dates, validates required fields                         │
│  • Transforms data to database format                              │
│  • Filters by CSP (each CSP sees only their data)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ SQL INSERT
                             │ via pg (node-postgres)
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                POSTGRESQL DATABASE (Neon)                           │
│  Table: absenteeism_reports                                         │
│  • id (primary key)                                                 │
│  • week_start, start_date, end_date (dates)                        │
│  • no_of_days, no_of_days_no_wknd (integers)                       │
│  • name_of_absentee, reason_for_absence (text)                     │
│  • absenteeism_authorised, leave_form_sent (boolean)               │
│  • comment, client, csp, country (text)                            │
│  • week_no, month, year (integer/text)                             │
│  • time_stamp, created_at, updated_at (timestamps)                 │
│                                                                      │
│  Indexes for performance:                                           │
│  • idx_absenteeism_csp (on csp column)                             │
│  • idx_absenteeism_dates (on start_date, end_date)                 │
│  • idx_absenteeism_year (on year column)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ SQL SELECT
                             │ GET /api/absenteeism-reports
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND UI (React)                              │
│  Component: CSPAbsenteeismReport                                    │
│  • Display imported data in table                                   │
│  • Filter by status (authorized/pending)                            │
│  • Export back to Google Sheets                                     │
│  • Add/Edit/Delete entries                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Import Process Steps

### 1. **User Action**
Click "Import from Sheets" button in Absenteeism Report page

### 2. **API Request**
```javascript
POST /api/absenteeism/import-from-sheets
Headers: { Cookie: auth_token }
```

### 3. **Google Sheets Reading**
```javascript
// Backend connects to Google Sheets
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
  range: 'Input!A2:Q'  // Read from row 2 onwards (skip headers)
});
```

### 4. **Data Transformation**
For each row in Google Sheets:
```javascript
{
  // Column A
  weekStart: parseSheetDate(row[0]),
  // Column B
  startDate: parseSheetDate(row[1]),
  // Column C
  endDate: parseSheetDate(row[2]),
  // Column D
  noOfDays: parseInt(row[3]) || 0,
  // Column E
  noOfDaysNoWknd: parseInt(row[4]) || 0,
  // Column F
  nameOfAbsentee: row[5] || null,
  // Column G
  reasonForAbsence: row[6] || null,
  // Column H
  absenteeismAuthorised: row[7] === 'Yes' ? 'Yes' : 'No',
  // Column I
  leaveFormSent: row[8] === 'Yes' ? 'Yes' : 'No',
  // Column J
  comment: row[9] || '',
  // Column K
  client: row[10] || 'TBD',
  // Column L
  csp: row[11] || user.name,
  // Column M
  country: row[12] || 'Zimbabwe',
  // Column N
  weekNo: parseInt(row[13]) || 0,
  // Column O
  month: row[14] || '',
  // Column P
  year: parseInt(row[15]) || new Date().getFullYear(),
  // Column Q
  timeStamp: row[16] || new Date().toISOString()
}
```

### 5. **Database Insert**
```sql
INSERT INTO absenteeism_reports (
  id, week_start, start_date, end_date, no_of_days, no_of_days_no_wknd,
  name_of_absentee, reason_for_absence, absenteeism_authorised, 
  leave_form_sent, comment, client, csp, country, week_no, month, year,
  time_stamp, created_by, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          $15, $16, $17, $18, $19, $20, $21)
```

### 6. **Response**
```json
{
  "success": true,
  "imported": 150,
  "skipped": 5,
  "total": 155,
  "message": "Successfully imported 150 records from Google Sheets to PostgreSQL database",
  "errors": ["Row 45: Missing required fields", ...]
}
```

---

## Database Benefits

### **Why PostgreSQL (Neon)?**

✅ **Free & Open Source**: PostgreSQL is 100% open source
✅ **Cloud Hosted**: Neon provides free hosting (no local setup needed)
✅ **Scalable**: Starts free, can upgrade as you grow
✅ **SQL Standard**: Full SQL support for complex queries
✅ **ACID Compliant**: Data integrity guaranteed
✅ **Indexes**: Fast queries even with thousands of records
✅ **Backup & Recovery**: Automatic backups on Neon
✅ **Concurrent Access**: Multiple users can access simultaneously

### **Other Free Database Options** (if needed):

1. **SQLite** (file-based)
   - Pros: Zero setup, single file
   - Cons: No concurrent writes, no network access

2. **MongoDB Atlas** (NoSQL)
   - Pros: 512MB free, flexible schema
   - Cons: Different query language

3. **Supabase** (PostgreSQL)
   - Pros: 500MB free, includes auth
   - Cons: Similar to Neon

4. **CockroachDB** (PostgreSQL-compatible)
   - Pros: 5GB free, distributed
   - Cons: More complex

---

## Usage Instructions

### **Import Historical Data**

1. Open CorePTO application
2. Login as CSP (e.g., tsungirirai.samhungu@zimworx.com)
3. Navigate to "Absenteeism Report"
4. Click "Import from Sheets" button
5. Confirm import
6. Wait for success message
7. View imported data in table

### **Query Imported Data**

```javascript
// In frontend (automatic)
GET /api/absenteeism-reports

// Returns data filtered by CSP
{
  "success": true,
  "data": [
    {
      "id": "imported-1734012345-0",
      "week_start": "2024-12-08",
      "start_date": "2024-12-10",
      "end_date": "2024-12-12",
      "no_of_days": 3,
      "no_of_days_no_wknd": 3,
      "name_of_absentee": "John Doe",
      "reason_for_absence": "Annual Leave",
      "absenteeism_authorised": true,
      "leave_form_sent": true,
      "comment": "Vacation",
      "client": "Client A",
      "csp": "Tsungirirai Samhungu",
      "country": "Zimbabwe",
      "week_no": 50,
      "month": "December",
      "year": 2024,
      "time_stamp": "2024-12-10T08:00:00.000Z"
    }
  ]
}
```

---

## Configuration Required

### **1. Google Sheets Setup**
Set environment variable:
```env
ABSENTEEISM_SPREADSHEET_ID=your_spreadsheet_id_here
```

### **2. Google Sheets Format**
Input sheet must have columns A-Q:
- A: Week Start
- B: Start Date
- C: End Date
- D: No. Of Days
- E: No. Of Days (excl weekends)
- F: Name of Absentee
- G: Reason for Absence
- H: Absenteeism Authorised? (Yes/No)
- I: Leave Form Sent (Yes/No)
- J: Comment
- K: Client
- L: CSP
- M: Country
- N: Week No.
- O: Month
- P: Year
- Q: Time Stamp

### **3. Database Connection**
Already configured in `.env`! ✅

---

## Verification

### **Check Database Connection**
```bash
# From server directory
node -e "import('pg').then(async ({default: pkg}) => { const {Pool} = pkg; const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); try { const res = await pool.query('SELECT NOW()'); console.log('✅ Database connected:', res.rows[0]); } catch(e) { console.error('❌ Connection failed:', e.message); } process.exit(); });"
```

### **Check Imported Records**
```bash
# From server directory
node -e "import('pg').then(async ({default: pkg}) => { const {Pool} = pkg; const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); try { const res = await pool.query('SELECT COUNT(*) FROM absenteeism_reports'); console.log('Total records in database:', res.rows[0].count); } catch(e) { console.error('Error:', e.message); } process.exit(); });"
```

---

## Summary

✅ **Database**: PostgreSQL (Neon) - Free, open-source, cloud-hosted
✅ **Connection**: Already configured and working
✅ **Import**: Pull data from Google Sheets → PostgreSQL
✅ **API**: GET/POST/PUT/DELETE endpoints ready
✅ **UI**: "Import from Sheets" button in Absenteeism Report
✅ **Performance**: Indexed for fast queries
✅ **Security**: CSP-filtered data access
✅ **Scalability**: Can handle thousands of records

**You're all set!** Click "Import from Sheets" to start pulling historical data into your PostgreSQL database.
