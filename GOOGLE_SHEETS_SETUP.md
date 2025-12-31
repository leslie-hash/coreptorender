# Google Sheets Integration Guide

## Overview
This system allows you to sync team member data and leave requests directly from Google Sheets. Your CSPs will automatically see only their assigned team members based on the "CSP Name" column in your spreadsheet.

## Quick Start (3 Easy Steps)

### Your Google Sheets Details
- **Spreadsheet**: https://docs.google.com/spreadsheets/d/1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8/edit?usp=sharing
- **Spreadsheet ID**: `1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8`
- **API Key**: Already configured ✅

### 1. Prepare Your Google Sheet

Your Google Sheets should have the following structure with **two sheets**:

#### Sheet 1: Team Members (main sheet)
Columns (in this order):
```
| Team Member Name | Employee ID | Department | CSP Name         | Email                | Join Date  |
|------------------|-------------|------------|------------------|----------------------|------------|
| Shawn Buka       | EMP001      | Finance    | Leslie Chasinda  | shawn@company.com    | 2024-01-15 |
| Roy Kagoro       | EMP002      | IT         | Leslie Chasinda  | roy@company.com      | 2024-02-01 |
| Tadiwa Chibwe    | EMP004      | Operations | CSP User         | tadiwa@company.com   | 2024-03-10 |
```

**Important**: The "CSP Name" column must exactly match the names in your `server/users.json` file:
- "Leslie Chasinda" (for leslie@zimworx.com)
- "CSP User" (for csp@zimworx.com)
- Leave blank for directors (they see all)

#### Sheet 2: LeaveRequests (optional)
Columns (in this order):
```
| Request ID | Team Member Name | Leave Type    | Start Date | End Date   | Status   | Submitted Date |
|------------|------------------|---------------|------------|------------|----------|----------------|
| LR001      | Shawn Buka       | Annual Leave  | 2025-12-20 | 2025-12-27 | approved | 2025-11-15     |
| LR002      | Roy Kagoro       | Sick Leave    | 2025-12-01 | 2025-12-03 | pending  | 2025-11-20     |
```

### 2. Get Your Spreadsheet ID

Your Spreadsheet ID is already provided:
```
1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8
```

You can verify it in the URL:
```
https://docs.google.com/spreadsheets/d/1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8/edit?usp=sharing
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          Your Spreadsheet ID
```

### 3. Sync Your Data

#### Option A: Sync Absenteeism Data (New - READ-ONLY)

Your system now supports syncing absenteeism data directly from your Google Sheets API.

**Setup:**

1. Make sure your Google Sheet has an **Absenteeism** sheet with these 17 columns:
   ```
   Week Start | Start Date | End Date | No. Of Days | No. Of Days (Where Wknd = Sat & Sun) | 
   Name of Absentee | Reason for Absence | Absenteeism Authorised? | Leave Form/Sick Note sent | 
   Comment | Client | CSP | Country | Week No. | Month | Year | Time Stamp
   ```

2. **Start the backend server** and configure the DATABASE_URL:
   ```powershell
   cd server
   $env:DATABASE_URL = "postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
   node index.js
   ```

3. **Trigger the sync** by making a POST request:
   ```bash
   curl -X POST http://localhost:4000/api/sync/absenteeism-from-sheets \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{
       "sheetsApiUrl": "https://your-absenteeism-api-endpoint.com/api/absenteeism"
     }'
   ```

   Or from your admin dashboard (once UI is built):
   - Navigate to "Administration → Data Sync"
   - Enter your absenteeism API endpoint
   - Click "Sync Absenteeism Data"

4. **Verify the sync** succeeded:
   ```bash
   GET http://localhost:4000/api/sync/absenteeism-status
   ```

   Response will show:
   ```json
   {
     "status": "ready",
     "cachedRecords": 95,
     "lastSync": "2025-12-01T10:30:45.123Z",
     "cacheFile": "server/cache/absenteeism-sync-cache.json"
   }
   ```

**Important: READ-ONLY ✅**
- The sync **only reads** from your Google Sheets API (GET requests only)
- Your original Google Sheets are **never modified**
- Data is normalized, deduplicated, and validated locally
- Results are stored in your Neon database for persistence and querying
- No POST, PUT, PATCH, or DELETE requests are made to your sheets

**Data Flow:**
```
Your Google Sheets API (READ-ONLY)
          ↓
   Normalized to 17 columns
          ↓
   Deduplicated by (name, start date, end date)
          ↓
   Validated for data quality
          ↓
   Stored in Local Neon Database
```

#### Option B: Sync Team Members & Leave Requests (Existing)

1. Login to your Leave Manager system
2. Go to **Administration → Google Sheets Sync** in the sidebar
3. Paste your Spreadsheet ID: `1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8`
4. Click **"Test Connection"** to verify it works
5. Click **"Sync Team Members"** to import your data
6. Done! ✅

### 2. Get Your Spreadsheet ID

Open your Google Sheet and look at the URL:

## Detailed Setup (for technical users)

### A. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### B. Create OAuth2 Credentials

1. In Google Cloud Console, go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Desktop app**
4. Download the credentials JSON file
5. Rename it to `google-credentials.json`
6. Place it in your `server/` directory:
   ```
   server/
     ├── google-credentials.json  ← Place here
     ├── index.js
     └── ...
   ```

### C. Authenticate (First Time Only)

Run this command in your server directory:
```bash
cd server
node -e "
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = './google-tokens.json';
const CREDENTIALS_PATH = './google-credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const {client_secret, client_id, redirect_uris} = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);
console.log('\nAfter authorization, enter the code from that page here:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Code: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to', TOKEN_PATH);
  });
});
"
```

This will:
1. Print a URL - open it in your browser
2. Login with your Google account
3. Copy the authorization code
4. Paste it back in the terminal
5. Create `google-tokens.json` automatically

### D. Configure and Sync

1. Start your backend server: `cd server && node index.js`
2. Start your frontend: `npm run dev`
3. Login to the system
4. Navigate to "Google Sheets Sync"
5. Enter your Spreadsheet ID
6. Configure ranges (defaults work if your columns match):
   - Team Members Range: `Sheet1!A2:F`
   - Leave Requests Range: `LeaveRequests!A2:G`
7. Click "Save Settings"
8. Click "Sync Team Members"

## How It Works

### Data Flow
```
Google Sheets → Backend API → JSON Files → Role-Based Filtering → Frontend
```

1. **Sync**: When you click "Sync Team Members", the system:
   - Fetches data from Google Sheets
   - Saves to `server/teamMembers.json` (simple list)
   - Saves to `server/teamMemberMeta.json` (with CSP assignments)

2. **Access Control**: When a CSP logs in:
   - Backend checks their `cspName` (e.g., "Leslie Chasinda")
   - Filters `teamMemberMeta.json` to only include their team
   - Returns filtered team members to frontend

3. **Director Access**: When a director logs in:
   - No filtering applied
   - Sees all team members across all CSPs

### API Endpoints

```javascript
// ===== ABSENTEEISM SYNC (NEW - READ-ONLY) =====

// Sync absenteeism data from your Google Sheets API
// Only admins/managers can trigger
// READ-ONLY: Never modifies your original Google Sheets
POST /api/sync/absenteeism-from-sheets
Body: {
  "sheetsApiUrl": "https://your-sheets-api.com/api/absenteeism"
}
Response: {
  "success": true,
  "summary": {
    "fetched": 100,           // Total records from your API
    "normalized": 98,         // Records normalized to 17-column format
    "deduplicated": 95,       // After removing duplicates
    "validated": 94,          // Passed validation checks
    "inserted": 94,           // Successfully stored in Neon DB
    "skipped": 0,
    "invalid": 1
  },
  "timestamp": "2025-12-01T10:30:45.123Z"
}

// Check sync status and cached records
GET /api/sync/absenteeism-status
Response: {
  "status": "ready",
  "cachedRecords": 95,
  "lastSync": "2025-12-01T10:30:45.123Z",
  "cacheFile": "server/cache/absenteeism-sync-cache.json"
}

// ===== EXISTING TEAM MEMBERS & LEAVE SYNC =====

// Sync team members from Google Sheets
POST /api/sync/team-members
Body: {
  "spreadsheetId": "1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8",
  "range": "Sheet1!A2:F"
}

// Sync leave requests
POST /api/sync/leave-requests
Body: {
  "spreadsheetId": "1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8",
  "range": "LeaveRequests!A2:G"
}

// Test connection
POST /api/sync/validate
Body: {
  "spreadsheetId": "1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8"
}

// Get/save sync settings
GET /api/sync/settings
POST /api/sync/settings
```

## Troubleshooting

### "Authentication failed"
- Make sure `google-credentials.json` is in the `server/` directory
- Run the authentication script again to regenerate `google-tokens.json`

### "Failed to connect"
- Check that your Spreadsheet ID is correct
- Verify the Google account you authenticated with has access to the spreadsheet
- Make sure the spreadsheet is not private

### "No data synced"
- Check that your column headers match exactly (case-sensitive)
- Verify data starts at row 2 (row 1 should be headers)
- Ensure the range is correct (e.g., `Sheet1!A2:F`)

### "CSPs see wrong team members"
- Check the "CSP Name" column in your sheet
- It must exactly match the user's name in `server/users.json`
- Case-sensitive: "Leslie Chasinda" ≠ "leslie chasinda"

### "Sync button disabled"
- Enter a Spreadsheet ID first
- Click "Save Settings" before syncing

## Best Practices

1. **Regular Syncs**: Sync team members when:
   - New employees join
   - CSP assignments change
   - Employee data is updated

2. **Data Validation**: Before syncing, verify:
   - All CSP names match your user database
   - No duplicate employee IDs
   - Dates are in consistent format (YYYY-MM-DD)

3. **Security**:
   - Keep `google-credentials.json` private (add to .gitignore)
   - Keep `google-tokens.json` private (add to .gitignore)
   - Only share spreadsheet access with authorized users

4. **Backup**: Before major syncs:
   - Backup `server/teamMembers.json`
   - Backup `server/teamMemberMeta.json`

## Alternative: Manual Upload

If you prefer not to use Google Sheets API, you can manually export your spreadsheet:

1. In Google Sheets: File → Download → CSV
2. Convert CSV data to JSON format
3. Manually update `server/teamMembers.json` and `server/teamMemberMeta.json`
4. Restart the backend server

## Support

For issues or questions:
- Check the console logs in browser (F12 → Console)
- Check backend logs in terminal
- Verify your Google Sheets structure matches the expected format
 
---

## Neon / Postgres (Absenteeism DB) Setup

The absenteeism reports are now stored in a Postgres database (Neon). The backend will initialize the `absenteeism_reports` table automatically on startup if `DATABASE_URL` is configured.

Steps:

1. Install the Postgres client in the server folder:

```powershell
cd server
npm install pg
```

2. Set the `DATABASE_URL` environment variable (PowerShell example):

```powershell
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
```

For Neon, the connection string typically looks like:

```
postgresql://<user>@<org>.<region>.neon.tech/<db_name>?password=<password>&sslmode=require
```

3. Start the server (it will create the `absenteeism_reports` table if it doesn't exist):

```powershell
cd server
node index.js
```

4. Verify the table was created by checking the server logs. The server prints `Database initialized (absenteeism_reports)` on success.

Notes:
- If your Neon DB requires SSL, the `pg` Pool is already configured to allow SSL with `rejectUnauthorized: false` to accommodate common Neon setups. Adjust as needed for stricter SSL validation.
- The API endpoints for absenteeism reports remain the same (`/api/absenteeism-reports`) but now persist to the database.
- After setting up the DB, you can still use the `Export to Sheets` button in the CSP Absenteeism Report to append rows to your Google Sheets.

If you want help wiring a Neon connection string or running migrations locally, tell me your Neon connection details (or share a redacted connection string) and I'll provide exact commands.
