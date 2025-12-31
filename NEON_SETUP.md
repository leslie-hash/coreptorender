# Neon Database Setup Guide

## Quick Setup (3 Steps)

### Step 1: Create a Neon Account & Database

1. Go to [console.neon.tech](https://console.neon.tech) and sign up
2. Create a new project
3. Create a new database (or use default `neondb`)
4. Note your connection credentials

### Step 2: Get Your Connection String

In your Neon dashboard:
1. Go to **Connection** tab
2. Select **Node.js** as the driver
3. Copy the connection string that looks like:
   ```
   postgresql://<user>@<org>.<region>.neon.tech/<dbname>?password=<password>&sslmode=require
   ```

**Example:**
```
postgresql://leslie@ep-young-mouse-12345.us-east-1.neon.tech/automation_sync?password=abc123xyz&sslmode=require
```

### Step 3: Set Environment Variable & Start Server

In PowerShell (Windows):

```powershell
# Navigate to server folder
cd C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\server

# Set the DATABASE_URL environment variable
$env:DATABASE_URL = "postgresql://<user>@<org>.<region>.neon.tech/<dbname>?password=<password>&sslmode=require"

# Replace with your actual connection string

# Start the server
node index.js
```

**Expected Output:**
```
Database initialized (absenteeism_reports)
Server running on http://localhost:4000
```

## Detailed Setup Steps

### 1. Create Neon Account

1. Visit [neon.tech](https://neon.tech)
2. Click "Start Free"
3. Sign up with:
   - Google account, or
   - Email + password
4. Verify your email

### 2. Create Project in Neon

1. After login, click **"Create project"**
2. Enter project name: `automation-sync-efficiency`
3. Select PostgreSQL version: **14** or **15** (latest is fine)
4. Select region close to you (or us-east-1 for default)
5. Click **"Create project"**

### 3. Get Connection String

1. On the project page, go to **"Connection strings"** tab
2. Select **"Node.js"** from the dropdown
3. Copy the full connection string

**It will look like:**
```
postgresql://neondb_owner@ep-young-mouse-abc123.us-east-1.neon.tech/neondb?password=YOUR_PASSWORD&sslmode=require
```

### 4. Set Environment Variable (PowerShell)

```powershell
# Open PowerShell in your server directory
cd C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\server

# Set the environment variable (replace with your actual connection string)
$env:DATABASE_URL = "postgresql://neondb_owner@ep-young-mouse-abc123.us-east-1.neon.tech/neondb?password=YOUR_PASSWORD&sslmode=require"

# Verify it's set
echo $env:DATABASE_URL
```

**Output should show your connection string**

### 5. Start the Server

```powershell
# Make sure you're in the server directory
cd C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\server

# Start the server
node index.js
```

**Look for this in the output:**
```
[DB] Pool created, testing connection...
[DB] Database initialized (absenteeism_reports table created)
Server running on http://localhost:4000
```

If you see this, ✅ **Neon is connected successfully!**

### 6. Test the Connection

Make a test request:

```powershell
# Test if the database is working
curl -X GET http://localhost:4000/api/absenteeism-reports `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": [],
  "message": "Retrieved 0 absenteeism reports"
}
```

## Troubleshooting

### Error: "ECONNREFUSED"
- ❌ DATABASE_URL not set
- ✅ Solution: Make sure you set `$env:DATABASE_URL` before starting the server

### Error: "password authentication failed"
- ❌ Wrong password in connection string
- ✅ Solution: Copy the connection string again from Neon dashboard (make sure you copy the password correctly)

### Error: "database does not exist"
- ❌ Wrong database name in connection string
- ✅ Solution: Check the database name in Neon dashboard (default is `neondb`)

### Error: "SSL: CERTIFICATE_VERIFY_FAILED"
- ❌ SSL certificate issue (rare)
- ✅ Solution: The config already handles this with `sslmode=require`, but if it persists, try removing `?sslmode=require` from the end

### Error: "connect ENOTFOUND"
- ❌ Network connectivity issue or host name is wrong
- ✅ Solution: Verify you copied the correct host from Neon dashboard

### Server starts but GET /api/absenteeism-reports fails
- ❌ JWT authentication issue
- ✅ Solution: Make sure you have a valid JWT token in your Authorization header

## How to Get JWT Token

If you need a JWT token for testing:

1. Login to the web app (http://localhost:8080)
2. Open browser DevTools (F12)
3. Go to **Application → Cookies**
4. Find `token` cookie
5. Copy the value
6. Use it in your requests:
   ```powershell
   curl -X GET http://localhost:4000/api/absenteeism-reports `
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## Verify Database is Working

Once the server is running with DATABASE_URL set:

### 1. Check Table Creation

The backend automatically creates the `absenteeism_reports` table. You'll see in logs:
```
[DB] Database initialized (absenteeism_reports table created)
```

### 2. Test GET Endpoint

```bash
GET /api/absenteeism-reports
```

Should return: `{ "success": true, "data": [], "message": "Retrieved 0 absenteeism reports" }`

### 3. Test Sync Endpoint

```bash
POST /api/sync/absenteeism-from-google-sheets
{
  "spreadsheetId": "1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8",
  "apiKey": "AIzaSyAAeI_njG0BVNK4XkNDxxF0piq281MR4IU",
  "sheetName": "Absenteeism"
}
```

Should return: `{ "success": true, "summary": { "fetched": X, "inserted": Y, ... } }`

### 4. Check Data in Database

After syncing, call GET again:

```bash
GET /api/absenteeism-reports
```

Should now return the synced records!

## Database Schema

Your `absenteeism_reports` table has 21 columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Unique identifier |
| `week_start` | DATE | Week starting date |
| `start_date` | DATE | Absence start date |
| `end_date` | DATE | Absence end date |
| `no_of_days` | INTEGER | Total days absent |
| `no_of_days_no_wknd` | INTEGER | Days excluding weekends |
| `name_of_absentee` | TEXT | Employee name |
| `reason_for_absence` | TEXT | Reason (sick leave, annual, etc.) |
| `absenteeism_authorised` | BOOLEAN | Is it authorized? |
| `leave_form_sent` | BOOLEAN | Leave form submitted? |
| `comment` | TEXT | Additional comments |
| `client` | TEXT | Client/Department |
| `csp` | TEXT | CSP name |
| `country` | TEXT | Country |
| `week_no` | INTEGER | Week number |
| `month` | TEXT | Month |
| `year` | INTEGER | Year |
| `time_stamp` | TIMESTAMPTZ | Record timestamp |
| `created_by` | TEXT | Who created it |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Next Steps

1. ✅ Set DATABASE_URL
2. ✅ Start server (should auto-create table)
3. ✅ Test GET /api/absenteeism-reports
4. ✅ Sync data from Google Sheets
5. ✅ Verify data appears in Neon database

## Keep DATABASE_URL Safe

⚠️ **IMPORTANT:** 
- Add `server/.env` to `.gitignore` to prevent uploading credentials to GitHub
- Never commit DATABASE_URL to version control
- Rotate password regularly in Neon dashboard

## Useful Commands

```powershell
# Check if DATABASE_URL is set
echo $env:DATABASE_URL

# Clear DATABASE_URL
$env:DATABASE_URL = ""

# Make DATABASE_URL persistent (optional - for current session only)
[Environment]::SetEnvironmentVariable("DATABASE_URL", "your_connection_string", [EnvironmentVariableTarget]::Process)
```

## Free Tier Limits (Neon)

- **1 project**: Free
- **10 GB storage**: Per project
- **Always on**: No auto-sleep
- **Unlimited connections**: 100 concurrent max

Your setup is well within free tier limits!

## Support

If you encounter issues:
1. Check the server logs for specific error messages
2. Verify DATABASE_URL is set: `echo $env:DATABASE_URL`
3. Test connection string in Neon dashboard
4. Check that Neon project is active (not in Webhook/Trial state)
