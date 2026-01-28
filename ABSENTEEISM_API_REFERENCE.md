# Quick Reference: Absenteeism Data API

## 🎯 Master Spreadsheet Info

**Spreadsheet ID:** `1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8`  
**URL:** https://docs.google.com/spreadsheets/d/1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8/edit?gid=1620072412#gid=1620072412

---

## 🚀 API Endpoints

### 1. Fetch CSP-Specific Data (New - Master Sheet)

**Endpoint:** `GET /api/absenteeism-reports/master-sync`

**Description:** Pulls data from master Google Spreadsheet with automatic CSP filtering

**Authentication:** Required (session token)

**Query Parameters:**
- `saveToDb=true` - Optional: Save records to PostgreSQL database

**Response:**
```json
{
  "success": true,
  "data": [...],
  "totalRecords": 150,
  "filteredRecords": 25,
  "cspFilter": "csp@email.com",
  "syncedAt": "2026-01-23T10:30:00Z",
  "fromCache": false,
  "savedToDb": 0
}
```

**Filtering Logic:**
- CSPs: Only see records where `CSP` column matches their email
- Admins/Directors: See ALL records

---

### 2. Get Absenteeism Reports (Database)

**Endpoint:** `GET /api/absenteeism-reports`

**Description:** Fetches absenteeism reports from PostgreSQL database

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

---

### 3. Create Absenteeism Report

**Endpoint:** `POST /api/absenteeism-reports`

**Authentication:** Required (CSP/Admin/Director only)

**Body:**
```json
{
  "weekStart": "2024-12-08",
  "startDate": "2024-12-10",
  "endDate": "2024-12-12",
  "noOfDays": 3,
  "noOfDaysNoWknd": 2,
  "nameOfAbsentee": "John Doe",
  "reasonForAbsence": "Sick Leave",
  "absenteeismAuthorised": "Yes",
  "leaveFormSent": "Yes",
  "comment": "Medical certificate",
  "client": "ABC Corp",
  "country": "Zimbabwe",
  "weekNo": 50,
  "month": "December",
  "year": 2024
}
```

---

## 📋 Required Environment Variables

```env
# Master Absenteeism Spreadsheet
ABSENTEEISM_SPREADSHEET_ID=1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8
ABSENTEEISM_SHEET_NAME=Sheet1
GOOGLE_SHEETS_API_KEY=your-api-key-here
```

---

## 🔍 Testing Commands

```bash
# Test master sync endpoint
curl http://localhost:4000/api/absenteeism-reports/master-sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with database save
curl http://localhost:4000/api/absenteeism-reports/master-sync?saveToDb=true \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get database reports
curl http://localhost:4000/api/absenteeism-reports
```

---

## 📊 Data Fields (16 Columns)

| # | Field | Type | Required |
|---|-------|------|----------|
| 1 | weekStart | Date | Yes |
| 2 | startDate | Date | Yes |
| 3 | endDate | Date | Yes |
| 4 | noOfDays | Number | Yes |
| 5 | noOfDaysNoWknd | Number | Yes |
| 6 | nameOfAbsentee | String | Yes |
| 7 | reasonForAbsence | String | No |
| 8 | absenteeismAuthorised | Yes/No | No |
| 9 | leaveFormSent | Yes/No | No |
| 10 | comment | String | No |
| 11 | client | String | No |
| 12 | csp | Email | **Yes** (for filtering) |
| 13 | country | String | No |
| 14 | weekNo | Number | No |
| 15 | month | String | No |
| 16 | year | Number | No |

**Critical:** The `csp` field must contain the CSP's email address for filtering to work properly.

---

## ✅ Setup Checklist

- [ ] Add `ABSENTEEISM_SPREADSHEET_ID` to `.env`
- [ ] Add `GOOGLE_SHEETS_API_KEY` to `.env`
- [ ] Set `ABSENTEEISM_SHEET_NAME` (default: Sheet1)
- [ ] Make spreadsheet publicly readable or share with service account
- [ ] Verify CSP column contains email addresses
- [ ] Test endpoint: `/api/absenteeism-reports/master-sync`
- [ ] Verify CSP filtering works correctly
- [ ] Test admin access (sees all records)

---

## 🎯 Key Features

✅ **READ-ONLY** - Never modifies your Google Sheet  
✅ **CSP Filtering** - Automatic based on logged-in user  
✅ **Admin Override** - Admins/Directors see everything  
✅ **Caching** - Fast subsequent requests  
✅ **Optional DB Save** - Backup to PostgreSQL  
✅ **Error Handling** - Falls back to cache if API fails  

---

**See full documentation:** [MASTER_ABSENTEEISM_SETUP.md](MASTER_ABSENTEEISM_SETUP.md)
