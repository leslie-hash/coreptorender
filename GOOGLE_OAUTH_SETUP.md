# Google OAuth Setup - Authorization Error Fix

## Problem
You're getting "Access blocked: Authorization Error" because the redirect URI isn't configured in Google Cloud Console.

## Solution: Configure Redirect URI in Google Cloud Console

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com
2. Select project: **automationsyncefficiency**

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. If not already done:
   - User Type: **External** (or Internal if you have Google Workspace)
   - App name: **CorePTO Automation**
   - User support email: Your email
   - Developer contact: Your email
3. Click **SAVE AND CONTINUE**
4. Scopes: Click **ADD OR REMOVE SCOPES**
   - Add: `https://www.googleapis.com/auth/spreadsheets`
   - Add: `https://www.googleapis.com/auth/gmail.send` (if needed)
5. Click **SAVE AND CONTINUE**
6. Test users: Add your email address
7. Click **SAVE AND CONTINUE**

### Step 3: Add Authorized Redirect URI
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID:
   - Client ID: `435987348931-th5u0905ld2rleamjjmpkh7n642mbjdl.apps.googleusercontent.com`
3. Under **Authorized redirect URIs**, click **+ ADD URI**
4. Add this exact URI:
   ```
   http://localhost:4000/oauth2callback
   ```
5. Click **SAVE**

### Step 4: Enable Required APIs
Make sure these APIs are enabled:
1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API** (optional, for file access)

### Step 5: Test Authentication
1. Open browser: http://localhost:4000/auth
2. Sign in with your Google account
3. Grant permissions
4. You should see "Authentication successful!"

---

## Alternative: Use Service Account (Simpler)

If you prefer to avoid OAuth setup, you can use the existing service account:

### Service Account Setup (Already Done!)
You already have a service account configured in `server/google-credentials.json`

To use it:
1. Share your Google Sheet with the service account email:
   ```
   reportinghub@reportinghub-479913.iam.gserviceaccount.com
   ```
2. Give it **Editor** access
3. The import will work without OAuth!

### How to Share Sheet with Service Account:
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1p3X4ie1lIrSVNaRrCsGdJURLnIrFj0dyzaorIahnGN4
2. Click **Share** button (top right)
3. Add email: `reportinghub@reportinghub-479913.iam.gserviceaccount.com`
4. Set permission: **Editor**
5. Uncheck "Notify people"
6. Click **Share**

---

## Which Method to Use?

### **Recommended: Service Account** ✅
- ✅ No OAuth consent screen needed
- ✅ No user authentication required
- ✅ Works automatically
- ✅ Just share the sheet with the service account email
- ⚠️ Sheet must be shared with service account

### OAuth (User Authentication)
- ⚠️ Requires Google Cloud Console configuration
- ⚠️ Needs consent screen approval
- ⚠️ Tokens expire and need refresh
- ✅ Uses your personal Google account permissions

---

## Quick Fix: Switch to Service Account

I can update the import endpoint to use the service account instead of OAuth. This will work immediately after you share the sheet!

Would you like me to:
1. Update the code to use service account authentication? (Recommended - works immediately)
2. Or keep OAuth and help you configure Google Cloud Console?

Let me know!
