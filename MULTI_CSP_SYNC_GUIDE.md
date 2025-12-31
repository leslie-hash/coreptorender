# Multi-CSP Google Sheets Sync Guide

## Overview
Since each of your 22 CSPs has their own Google Sheet with a "Team Member Work Details" tab, this system syncs from all CSP sheets simultaneously.

## Sheet Structure (Each CSP's Sheet)

**Tab Name:** `Team Member Work Details`

**Columns (A-I):**
1. Client Name
2. Team member
3. Role
4. Email Address
5. Anydesk
6. Work Station number
7. Floor
8. Work Start Time
9. Time Zone

## Setup Steps

### 1. Create CSP Configuration File

Create `server/cspSheetConfig.json` with all 22 CSPs:

```json
[
  {
    "cspEmail": "leslie.chasinda@zimworx.org",
    "cspName": "Leslie Chasinda",
    "spreadsheetId": "1abc...xyz",
    "range": "Team Member Work Details!A2:I"
  },
  {
    "cspEmail": "john.doe@zimworx.org",
    "cspName": "John Doe",
    "spreadsheetId": "1def...uvw",
    "range": "Team Member Work Details!A2:I"
  }
  // ... repeat for all 22 CSPs
]
```

### 2. Grant Sheet Access

Each CSP must share their Google Sheet with your service account email (found in `google-credentials.json`):
- Open Google Sheet → Share
- Add service account email with "Viewer" permission
- Do this for all 22 CSP sheets

### 3. Sync All Sheets

**API Endpoint:** `POST /api/sync/all-csp-sheets`

**Request Body:**
```json
{
  "cspConfigs": [
    { "cspEmail": "...", "cspName": "...", "spreadsheetId": "..." }
  ]
}
```

**Or load from config file on server:**
```javascript
const cspConfigs = require('./cspSheetConfig.json');
// Make API call with cspConfigs
```

### 4. Response Format

```json
{
  "success": true,
  "message": "✅ Synced 450 team members from 22 CSP sheets",
  "totalTeamMembers": 450,
  "totalCSPs": 22,
  "totalClients": 85,
  "cspSummary": [
    {
      "csp": "Leslie Chasinda",
      "email": "leslie.chasinda@zimworx.org",
      "teamMemberCount": 25,
      "clients": ["Excel Dental", "Dental Design", "Client C"]
    }
  ],
  "errors": []
}
```

## Alternative: Sync Single CSP Sheet

**API Endpoint:** `POST /api/sync/single-csp-sheet`

```json
{
  "cspEmail": "leslie.chasinda@zimworx.org",
  "cspName": "Leslie Chasinda",
  "spreadsheetId": "1abc...xyz",
  "range": "Team Member Work Details!A2:I"
}
```

## Data Flow

```
📊 CSP 1 Sheet → |
📊 CSP 2 Sheet → |
📊 CSP 3 Sheet → |--→ Sync → 📁 teamMemberMeta.json → 🖥️ CorePTO App
     ...        → |
📊 CSP 22 Sheet → |
```

## What Gets Created

After sync, these files are created/updated:

1. **`teamMembers.json`** - Simple array of team member names
2. **`teamMemberMeta.json`** - Full details with CSP assignment:
```json
[
  {
    "teamMemberName": "Laurette Paswera",
    "clientName": "Excel Dental",
    "employeeId": "Laurette Paswera",
    "role": "Operations",
    "email": "laurette.paswera@zimworx.com",
    "anydesk": "1234567890",
    "workStation": "9 T 10",
    "floor": "9",
    "workStartTime": "8:00 AM",
    "timeZone": "CAT",
    "csp": "leslie.chasinda@zimworx.org",
    "cspName": "Leslie Chasinda",
    "spreadsheetId": "1abc...xyz",
    "syncedAt": "2025-12-11T10:30:00.000Z"
  }
]
```

3. **`cspSummary.json`** - Summary per CSP

## Benefits of This Approach

✅ **Decentralized Management** - Each CSP maintains their own sheet
✅ **Auto-assignment** - Leave requests automatically route to correct CSP
✅ **Client Tracking** - Know which team member belongs to which client
✅ **Real-time Sync** - Pull latest data from all 22 sheets at once
✅ **Error Handling** - If one CSP's sheet fails, others continue syncing
✅ **Audit Trail** - Track which sheet each team member came from

## Sync Schedule Recommendation

- **Daily automatic sync:** 6:00 AM (before work starts)
- **Manual sync:** Available in Admin Panel
- **On-demand:** When CSP updates their sheet

## Troubleshooting

**Issue:** "Failed to sync CSP X's sheet"
- **Solution:** Check if sheet is shared with service account
- **Solution:** Verify spreadsheetId is correct
- **Solution:** Confirm tab name is exactly "Team Member Work Details"

**Issue:** "Duplicate team members"
- **Solution:** Team member appears in multiple CSP sheets
- **Action:** System will keep all entries (useful for tracking)

**Issue:** "CSP assignment not working"
- **Solution:** Ensure cspEmail matches exactly in config
- **Solution:** Check leave request uses correct team member name
