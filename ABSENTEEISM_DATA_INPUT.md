# How Absenteeism Data is Inputted

## Overview
The absenteeism data in CorePTO is inputted through **three different methods**: automatic generation, manual entry, and API queries. Here's how each works:

---

## 1. 🤖 **AUTOMATIC GENERATION** (Primary Method)

### When it happens:
Every time a leave request is **approved** in the system, an absenteeism record is automatically created.

### The Process:
1. **Leave Approval Trigger** (in `server/index.js`, line 193)
   - When status changes to `'approved'`
   - The `updateAbsenteeismTracker()` function is called

2. **Automatic Data Capture** (line 3019-3100)
   - Reads the approved leave request details
   - Fetches team member metadata (CSP, client, country)
   - Calculates all required fields automatically:
     - Week start date (Sunday of the week)
     - Calendar days (total days)
     - Business days (excluding weekends and US Federal Holidays)
     - Week number
     - Month and year

3. **Data Storage**
   - Saves to Google Sheets "Absenteeism Tracker"
   - Spreadsheet ID from environment variable: `ABSENTEEISM_SPREADSHEET_ID`
   - Appends to "Input" sheet (columns A through Q)

### Columns Auto-Generated:
```
A: Week Start
B: Start Date
C: End Date
D: No. Of Days (calendar)
E: No. Of Days (excluding weekends)
F: Name of Absentee
G: Reason for Absence
H: Absenteeism Authorised? (always "Yes" for approved leaves)
I: Leave Form/Sick Note sent
J: Comment (leave type)
K: Client
L: CSP
M: Country
N: Week No.
O: Month
P: Year
Q: Time Stamp
```

### Benefits:
✅ Zero manual input required  
✅ No data entry errors  
✅ Real-time updates  
✅ Consistent data format  
✅ Includes US Federal Holidays in business day calculations  

---

## 2. ✍️ **MANUAL ENTRY** (Optional)

### When to use:
- For retroactive entries
- For absences not tracked through leave requests
- To correct or update existing data

### How it works:
1. Navigate to **Absenteeism Report** module
2. Click **"Add Entry"** button
3. Fill in the form:
   - Select team member (from CSP's team)
   - Enter start and end dates
   - System auto-calculates:
     - Week start
     - Business days (excluding weekends/holidays)
     - Week number
     - Month and year
   - Select authorization status
   - Add comments/notes

4. Click **Save**
   - Stores in JSON file (`absenteeismRecords.json`)
   - Available for export to Google Sheets

### API Endpoints (in `server/index.js`):
- **POST** `/api/absenteeism-reports` (line 4513) - Create new entry
- **PUT** `/api/absenteeism-reports/:id` (line 4531) - Update entry
- **DELETE** `/api/absenteeism-reports/:id` (line 4553) - Delete entry

### Access Control:
- Only CSPs and Admins can create/edit entries
- CSPs see only their team's data

---

## 3. 🔍 **QUERY/RETRIEVE** (Read-Only)

### Auto-Generate Query:
**GET** `/api/absenteeism/auto-generate` (line 4907)

This endpoint generates a report on-demand from all approved leave requests:

**Query Parameters:**
- `startDate` (optional) - Filter from this date
- `endDate` (optional) - Filter to this date
- `csp` (optional) - Filter by CSP name

**Filters Applied:**
- Only includes requests with status: `approved`, `client-approved`, or `sent-to-payroll`
- If user is CSP role, automatically filters to their team
- Date range filtering (optional)

**Returns:**
```json
{
  "success": true,
  "records": [
    {
      "weekStart": "2024-12-08",
      "startDate": "2024-12-10",
      "endDate": "2024-12-12",
      "noOfDays": 3,
      "noOfDaysExcludingWeekends": 3,
      "nameOfAbsentee": "John Doe",
      "reasonForAbsence": "PTO",
      "absenteeismAuthorised": "Yes",
      "leaveFormSent": "Yes",
      "comment": "Annual Leave",
      "client": "Zimworx",
      "csp": "Tsungirirai Samhungu",
      "country": "Zimbabwe",
      "weekNo": 50,
      "month": "December",
      "year": 2024,
      "timestamp": "2024-12-10T10:00:00.000Z",
      "requestId": "LR001"
    }
  ],
  "count": 1
}
```

### View All Reports:
**GET** `/api/absenteeism-reports` (line 4499)
- Returns all absenteeism records
- Auto-filters by CSP if user is CSP role
- Used by the Absenteeism Report component

---

## 4. 📤 **EXPORT TO GOOGLE SHEETS**

**POST** `/api/absenteeism-reports/export` (line 4574)

Exports manually created entries to Google Sheets:
- Sends data to configured spreadsheet
- Matches format of auto-generated entries
- Allows CSPs to sync manual entries with automated ones

---

## Data Flow Summary

```
Leave Request Submitted
         ↓
    CSP Reviews
         ↓
 ✅ APPROVED → updateAbsenteeismTracker()
         ↓
   Calculate Fields:
   • Week start
   • Business days (excludes weekends + US Federal Holidays)
   • Week number
   • Month/Year
         ↓
   Append to Google Sheets
   (Absenteeism Tracker)
         ↓
   Available in Reports
```

---

## US Federal Holidays Included

The system automatically excludes these holidays from business day calculations:
1. New Year's Day
2. Memorial Day
3. Independence Day (July 4th)
4. Labor Day
5. Thanksgiving Day
6. Christmas Eve
7. Christmas Day

See `server/holidays.js` for implementation.

---

## Key Features

✨ **Automatic**: No manual data entry for approved leaves  
✨ **Accurate**: Uses holiday-aware business day calculations  
✨ **Real-time**: Updates immediately upon approval  
✨ **Queryable**: CSPs can request their data anytime via API  
✨ **Flexible**: Manual entry option for edge cases  
✨ **Integrated**: Syncs with Google Sheets for reporting  

---

## Component Files

**Frontend:**
- `src/components/CSPAbsenteeismReport.tsx` - Manual entry UI
- `src/components/GoogleSheetsAbsenteeismSync.tsx` - Google Sheets sync interface

**Backend:**
- `server/index.js` - All API endpoints and automatic generation
- `server/holidays.js` - Business day calculations with US Federal Holidays
- `server/absenteeismRecords.json` - Local storage for manual entries
- Google Sheets "Absenteeism Tracker" - Cloud storage for all records

---

## For CSPs

When you approve a leave request, you don't need to do anything else! The system automatically:
1. ✅ Creates the absenteeism record
2. ✅ Calculates all fields correctly
3. ✅ Updates Google Sheets
4. ✅ Makes it available in your reports

You only need manual entry for special cases like retroactive absences or corrections.
