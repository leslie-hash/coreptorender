# Centralized Google Sheet Sync Guide

## 🎯 Overview

This guide explains how to sync team member data from **ONE centralized Google Sheet** that contains all clients and team members across all 25 CSPs.

**Your Sheet:** https://docs.google.com/spreadsheets/d/e/2PACX-1vTlhC_seRY70EjAUi5T2dkBSipZnQbz1tkbL6BEwjj9W7qHZBQXqgSV623RYV1PD121s4YT8lD4H6aa/pub?output=csv

## 📊 Sheet Structure

Your centralized sheet has these columns:
| Column | Description |
|--------|-------------|
| Client Name | Client company name |
| TEAM MEMBER | Employee name |
| WORKSTATION NUMBER | Desk/workstation ID |
| ANYDESK ID | Remote access ID |
| FLOOR | Office floor number |
| PMS/SOFTWARE | Software used |
| SCHEDULE | Work schedule |
| TIME ZONE | Employee timezone |
| HOME ADDRESS | Home address |
| EMAIL | Employee email |
| PHONE NUMBER | Contact number |
| BIRTHDAY | Date of birth |

**Key Point:** This sheet does NOT have a CSP column. We'll assign CSPs based on client names.

---

## 🔧 Setup Steps

### Step 1: Configure Client-to-CSP Mapping

Edit `server/clientToCspMapping.json` to assign each client to a CSP:

```json
{
  "Akeso Oral Surgery": {
    "cspEmail": "leslie.chasinda@zimworx.org",
    "cspName": "Leslie Chasinda"
  },
  "Elite Orthodontics Nova": {
    "cspEmail": "tsungirirai.samhungu@zimworx.com",
    "cspName": "Tsungirirai Samhungu"
  },
  "Integrity Dental Specialists/EAOFDFW": {
    "cspEmail": "miriro.dzuda@zimworx.org",
    "cspName": "Miriro Dzuda"
  },
  "KLS Services": {
    "cspEmail": "tafadzwa.mapfumo@zimworx.org",
    "cspName": "Tafadzwa Mapfumo"
  }
  // ... add all 16+ clients
}
```

**Found Clients in Your Sheet:**
1. Akeso Oral Surgery
2. Elite Orthodontics Nova
3. Integrity Dental Specialists/EAOFDFW
4. Integrity Dental Specialists/EPP
5. KLS Services
6. Oral Surgery Management (College Station)
7. Oral Surgery Management (Katy)
8. Rewind Timepieces
9. Select Dental Management (Claims)
10. Select Dental Management (Finance)
11. Select Dental Management (IV)
12. Smile Brands
13. Wallace Specialty Insurance
14. West Lakes Dentistry
15. Global Imaging USA
16. Wave Dental (if exists)

### Step 2: Run the Sync

**Option A: Sync from Published CSV (RECOMMENDED)**

This is the easiest method since your sheet is already published:

```bash
POST http://localhost:4000/api/sync/centralized-sheet
Content-Type: application/json

{
  "csvUrl": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTlhC_seRY70EjAUi5T2dkBSipZnQbz1tkbL6BEwjj9W7qHZBQXqgSV623RYV1PD121s4YT8lD4H6aa/pub?output=csv"
}
```

**Option B: Sync from Google Sheet ID (requires auth)**

If you want to use the actual spreadsheet ID:

```bash
POST http://localhost:4000/api/sync/centralized-sheet
Content-Type: application/json

{
  "spreadsheetId": "YOUR_SHEET_ID",
  "range": "Sheet1!A2:L"
}
```

### Step 3: Verify Sync Results

The API response will show:

```json
{
  "success": true,
  "message": "✅ Synced 450 team members from centralized sheet",
  "totalTeamMembers": 450,
  "totalCSPs": 25,
  "totalClients": 16,
  "cspSummary": [
    {
      "cspEmail": "leslie.chasinda@zimworx.org",
      "cspName": "Leslie Chasinda",
      "teamMemberCount": 25,
      "clients": ["Akeso Oral Surgery", "Elite Orthodontics Nova"]
    }
  ],
  "unmappedClients": []
}
```

---

## 🔄 How It Works

### Data Flow

```
Centralized Google Sheet
        ↓
   Fetch CSV Data
        ↓
   Parse Team Members
        ↓
   Apply Client-to-CSP Mapping
        ↓
   Save to teamMemberMeta.json
        ↓
   Each CSP sees only their teams
```

### CSP Assignment Logic

1. **Read team member** from centralized sheet
2. **Look up client name** in clientToCspMapping.json
3. **Assign CSP email/name** to team member
4. **Tag team member** with CSP for filtering
5. **Save to database** with CSP assignment

### Example

```
Team Member: Sandisiwe Nkala
Client: Integrity Dental Specialists/EAOFDFW
         ↓
Look up "Integrity Dental Specialists/EAOFDFW" in mapping
         ↓
Found: CSP = Miriro Dzuda (miriro.dzuda@zimworx.org)
         ↓
Assign: csp = "miriro.dzuda@zimworx.org"
        cspName = "Miriro Dzuda"
         ↓
Save to teamMemberMeta.json
```

---

## 👥 CSP Experience

### After Sync, Each CSP Sees:

**Leslie Chasinda logs in:**
- Dashboard shows: Only team members from her assigned clients
- Leave requests: Only from her teams
- PTO balances: Only her team members

**Tsungirirai Samhungu logs in:**
- Dashboard shows: Only team members from his assigned clients
- Leave requests: Only from his teams
- PTO balances: Only his team members

**Completely isolated views** - CSPs cannot see each other's data!

---

## 📧 Email Notifications

Emails are automatically routed to the correct CSP:

```
Team Member (Sandisiwe Nkala) submits leave request
        ↓
System looks up: Which CSP is assigned to this team member?
        ↓
Found: Miriro Dzuda
        ↓
📧 Email sent to: miriro.dzuda@zimworx.org
        ↓
Email subject: "🆕 New Leave Request: Sandisiwe Nkala - Annual Leave"
```

---

## 🔄 Automated Sync Options

### Option 1: Manual Sync

Run the sync endpoint whenever you update the Google Sheet.

### Option 2: Scheduled Sync (Recommended)

Add to `server/automation.js`:

```javascript
import cron from 'node-cron';
import { syncFromPublishedCsv, loadClientCspMapping } from './centralizedSheetSync.js';

// Sync every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running automated centralized sheet sync...');
  try {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTlhC_seRY70EjAUi5T2dkBSipZnQbz1tkbL6BEwjj9W7qHZBQXqgSV623RYV1PD121s4YT8lD4H6aa/pub?output=csv';
    const mapping = loadClientCspMapping();
    const result = await syncFromPublishedCsv(csvUrl, mapping);
    console.log(`✅ Auto-sync completed: ${result.totalCount} team members`);
  } catch (error) {
    console.error('❌ Auto-sync failed:', error);
  }
});
```

### Option 3: Webhook Trigger

Set up Google Sheets to trigger a webhook when data changes.

---

## 🛠️ Maintenance

### Adding a New Client

1. Add client to Google Sheet
2. Add client-to-CSP mapping in `clientToCspMapping.json`:
```json
{
  "New Client Name": {
    "cspEmail": "csp@zimworx.org",
    "cspName": "CSP Name"
  }
}
```
3. Run sync endpoint

### Reassigning a Client to Different CSP

1. Update `clientToCspMapping.json`:
```json
{
  "Client Name": {
    "cspEmail": "new-csp@zimworx.org",
    "cspName": "New CSP Name"
  }
}
```
2. Run sync endpoint
3. All team members from that client automatically reassigned

### Adding a New Team Member

1. Add to centralized Google Sheet
2. Run sync endpoint
3. Automatically assigned to correct CSP based on client name

---

## 🎯 Advantages of This Approach

✅ **Single Source of Truth**
- One master sheet for all data
- No need to maintain 25 separate sheets
- Easier to update and manage

✅ **Flexible CSP Assignment**
- Easy to reassign clients to different CSPs
- Change mapping file, run sync, done!
- No need to move data between sheets

✅ **Automatic Routing**
- Leave requests automatically go to correct CSP
- Email notifications sent to right person
- No manual assignment needed

✅ **Centralized Management**
- Admin can see all data in one place
- Easy bulk updates
- Consistent data structure

✅ **Easy Onboarding**
- New CSPs: Just add to mapping file
- New clients: Add to sheet + mapping
- New team members: Add to sheet, auto-assigned

---

## 📋 Quick Reference

### Sync from Published CSV
```bash
POST /api/sync/centralized-sheet
{
  "csvUrl": "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"
}
```

### Sync from Google Sheet ID
```bash
POST /api/sync/centralized-sheet
{
  "spreadsheetId": "1abc...xyz",
  "range": "Sheet1!A2:L"
}
```

### Check Current CSP Assignments
```bash
GET /api/team-member-meta
```

### Get CSP Summary
```bash
GET /api/csp-summary
```

---

## 🆚 Comparison: Centralized vs Multi-Sheet

| Feature | Centralized Sheet | 25 Separate Sheets |
|---------|------------------|---------------------|
| **Maintenance** | Update ONE sheet | Update 25 sheets |
| **CSP Reassignment** | Change mapping file | Move data between sheets |
| **Onboarding** | Add to mapping | Create new sheet + setup |
| **Data Consistency** | Single source | Must sync 25 sources |
| **Admin View** | See all in one place | Must check 25 sheets |
| **Sync Speed** | Fast (one API call) | Slower (25 API calls) |
| **Error Handling** | One failure point | 25 potential failure points |

**Recommendation:** Use the centralized sheet approach! It's simpler, faster, and easier to maintain.

---

## 🚀 Next Steps

1. ✅ **Review** `server/clientToCspMapping.json` and update CSP assignments
2. ✅ **Test** the sync with your CSV URL
3. ✅ **Verify** that team members are correctly assigned to CSPs
4. ✅ **Set up** automated daily sync (optional)
5. ✅ **Train** CSPs on how to use the system

---

## 📞 Support

If you encounter issues:
1. Check `clientToCspMapping.json` for correct client names
2. Verify CSV URL is accessible
3. Check server logs for sync errors
4. Look for `unmappedClients` in API response
5. Ensure client names match exactly (case-sensitive)

---

**Status:** ✅ Ready to Use  
**Last Updated:** January 21, 2026  
**Recommended Approach:** Centralized Sheet with Client-to-CSP Mapping
