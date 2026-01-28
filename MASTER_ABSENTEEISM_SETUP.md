# Master Absenteeism Spreadsheet Setup Guide

## 📊 Overview

This guide explains how to configure CorePTO to pull absenteeism data from your master Google Spreadsheet, with automatic CSP-specific filtering.

**Master Spreadsheet:** `1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8`

---

## 🔧 Configuration

### Step 1: Get Your Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key
5. (Optional) Restrict the API key:
   - Click on the API key
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Sheets API"
   - Save

### Step 2: Make Spreadsheet Accessible

Your master spreadsheet must be **publicly readable** or **shared with the service account**:

**Option A: Public Access (Easiest)**
1. Open your spreadsheet: https://docs.google.com/spreadsheets/d/1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8/edit
2. Click "Share" button
3. Under "General access", select "Anyone with the link"
4. Set permission to "Viewer"
5. Click "Done"

**Option B: Service Account (More Secure)**
1. Create a service account in Google Cloud Console
2. Download the JSON key
3. Share the spreadsheet with the service account email
4. Place the JSON file as `server/google-credentials.json`

### Step 3: Update Environment Variables

Edit your `.env` file:

```env
# Master Absenteeism Spreadsheet Configuration
ABSENTEEISM_SPREADSHEET_ID=1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8
ABSENTEEISM_SHEET_NAME=Sheet1
GOOGLE_SHEETS_API_KEY=AIzaSyD-your-actual-api-key-here
```

**Note:** Replace `Sheet1` with your actual sheet name if different.

---

## 📋 Spreadsheet Format

Your master spreadsheet should have these **16 columns** (A-P):

| Column | Field Name | Example |
|--------|------------|---------|
| A | Week Start | 2024-12-08 |
| B | Start Date | 2024-12-10 |
| C | End Date | 2024-12-12 |
| D | No. Of Days | 3 |
| E | No. Of Days (No Weekend) | 2 |
| F | Name of Absentee | John Doe |
| G | Reason for Absence | Sick Leave |
| H | Absenteeism Authorised? | Yes |
| I | Leave Form/Sick Note sent | Yes |
| J | Comment | Medical certificate provided |
| K | Client | ABC Corporation |
| L | CSP | tsungirirai.mukombe@zimworx.com |
| M | Country | Zimbabwe |
| N | Week No. | 50 |
| O | Month | December |
| P | Year | 2024 |

**Important:** The **CSP column (L)** must contain the CSP's email address for filtering to work.

---

## 🔐 How CSP Filtering Works

### For CSPs:
When a CSP logs in and accesses absenteeism reports:
- System reads their email from the session
- Filters all records where `CSP` column matches their email
- They only see their own team's absenteeism data

### For Admins/Directors:
- See ALL absenteeism records from all CSPs
- No filtering applied

### Example:

**Master Sheet has:**
```
Name              | CSP                                    | Client
John Doe          | tsungirirai.mukombe@zimworx.com       | ABC Corp
Jane Smith        | belina.zimworx@gmail.com              | XYZ Ltd
Alice Johnson     | tsungirirai.mukombe@zimworx.com       | ABC Corp
```

**When Tsungirirai logs in, he sees:**
```
Name              | CSP                                    | Client
John Doe          | tsungirirai.mukombe@zimworx.com       | ABC Corp
Alice Johnson     | tsungirirai.mukombe@zimworx.com       | ABC Corp
```

---

## 🚀 Using the API

### Fetch CSP-Specific Data

```javascript
// Frontend API call
const response = await fetch('/api/absenteeism-reports/master-sync', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

const data = await response.json();
console.log('My absenteeism records:', data.data);
```

### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "sheet-1234567890-1",
      "weekStart": "2024-12-08",
      "startDate": "2024-12-10",
      "endDate": "2024-12-12",
      "noOfDays": 3,
      "noOfDaysNoWknd": 2,
      "nameOfAbsentee": "John Doe",
      "reasonForAbsence": "Sick Leave",
      "absenteeismAuthorised": "Yes",
      "leaveFormSent": "Yes",
      "comment": "Medical certificate provided",
      "client": "ABC Corporation",
      "csp": "tsungirirai.mukombe@zimworx.com",
      "country": "Zimbabwe",
      "weekNo": 50,
      "month": "December",
      "year": 2024,
      "syncedAt": "2026-01-23T10:30:00Z",
      "source": "google-sheets"
    }
  ],
  "totalRecords": 150,
  "filteredRecords": 25,
  "cspFilter": "tsungirirai.mukombe@zimworx.com",
  "syncedAt": "2026-01-23T10:30:00Z",
  "fromCache": false
}
```

### Save to Database (Optional)

Add `?saveToDb=true` to automatically save records to PostgreSQL:

```javascript
const response = await fetch('/api/absenteeism-reports/master-sync?saveToDb=true');
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────┐
│   Master Google Spreadsheet            │
│   (All CSPs' absenteeism data)         │
│   ID: 1Jzu-uUuq4JhV2u85Fn7r31nabJVE... │
└─────────────────────────────────────────┘
                    │
                    │ Google Sheets API
                    │ (READ-ONLY)
                    ▼
┌─────────────────────────────────────────┐
│   CorePTO Backend                        │
│   - Fetches all records                  │
│   - Identifies logged-in user            │
│   - Filters by CSP email                 │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐       ┌──────────────┐
│   CSP View   │       │  Admin View  │
│  (Filtered)  │       │    (All)     │
└──────────────┘       └──────────────┘
```

---

## 📱 Frontend Integration

### React Component Example

```tsx
import { useEffect, useState } from 'react';

function AbsenteeismReport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbsenteeism() {
      try {
        const response = await fetch('/api/absenteeism-reports/master-sync');
        const data = await response.json();
        
        if (data.success) {
          setRecords(data.data);
          console.log(`Showing ${data.filteredRecords} of ${data.totalRecords} records`);
        }
      } catch (error) {
        console.error('Failed to fetch absenteeism data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAbsenteeism();
  }, []);

  if (loading) return <div>Loading absenteeism data...</div>;

  return (
    <div>
      <h2>My Team Absenteeism Report</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Authorised</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.nameOfAbsentee}</td>
              <td>{record.startDate}</td>
              <td>{record.endDate}</td>
              <td>{record.noOfDaysNoWknd}</td>
              <td>{record.reasonForAbsence}</td>
              <td>{record.absenteeismAuthorised}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ Testing

### 1. Test API Configuration

```bash
# Start the server
npm run dev

# Test the endpoint
curl http://localhost:4000/api/absenteeism-reports/master-sync
```

### 2. Verify CSP Filtering

1. Log in as a CSP
2. Navigate to Absenteeism Reports
3. Verify you only see your team's data
4. Check the response includes `cspFilter` field

### 3. Test Admin Access

1. Log in as admin/director
2. Navigate to Absenteeism Reports
3. Verify you see ALL records
4. Check `cspFilter` shows "none (admin view)"

---

## 🔧 Troubleshooting

### Error: "Master absenteeism spreadsheet not configured"

**Solution:** Check your `.env` file has:
- `ABSENTEEISM_SPREADSHEET_ID`
- `GOOGLE_SHEETS_API_KEY`

### Error: "The caller does not have permission"

**Solution:** Make sure spreadsheet is publicly readable or shared with service account.

### No records returned

**Solution:** 
1. Check the sheet name in `.env` matches actual sheet name
2. Verify CSP email in spreadsheet matches logged-in user's email
3. Check sheet has data starting from row 2 (row 1 is headers)

### Wrong CSP sees wrong data

**Solution:** Verify the CSP column (L) in your spreadsheet contains the correct email addresses.

---

## 🎯 Best Practices

1. **Regular Syncs**: Set up a cron job to periodically fetch and cache data
2. **Cache Strategy**: Data is cached locally - subsequent requests are faster
3. **Database Backup**: Use `?saveToDb=true` to backup critical records
4. **Access Control**: Never expose API keys in frontend code
5. **Data Validation**: System validates all 16 columns automatically

---

## 📊 Benefits

✅ **Single Source of Truth**: One master spreadsheet for all CSPs  
✅ **Automatic Filtering**: CSPs only see their data  
✅ **Real-time Access**: Latest data from Google Sheets  
✅ **Read-Only**: Original spreadsheet never modified  
✅ **Secure**: Role-based access control  
✅ **Fast**: Local caching for performance  

---

## 📞 Support

For issues or questions:
- Check logs: `server/logs/` or console output
- Review cache: `server/cache/absenteeism-sheets-cache.json`
- Test endpoint: `GET /api/absenteeism-reports/master-sync`

---

**Last Updated:** January 23, 2026  
**Version:** 1.0
