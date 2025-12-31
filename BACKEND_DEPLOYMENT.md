# Deploy Backend to Render.com

## Quick Backend Deployment (15 minutes)

### Step 1: Push Code to GitHub (if not already)

```bash
git init
git add .
git commit -m "CorePTO backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/corepto.git
git push -u origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `corepto` repository
3. Configure:
   - **Name:** `corepto-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** Leave empty
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server/index.js`
   - **Instance Type:** Free

### Step 4: Add Environment Variables

In Render dashboard, add these environment variables:

```
DATABASE_URL=your-neon-database-url-here

NODE_ENV=production

PORT=4000

ABSENTEEISM_SPREADSHEET_ID=your-spreadsheet-id-here

GOOGLE_CLIENT_ID=your-google-client-id-here

GOOGLE_CLIENT_SECRET=your-google-client-secret-here

GOOGLE_REDIRECT_URI=https://corepto-zimworx.web.app/oauth2callback
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Your backend URL will be: `https://corepto-backend.onrender.com`

### Step 6: Update Frontend

Update CORS in `server/index.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://corepto-zimworx.web.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Then create `.env.production`:

```
VITE_API_URL=https://corepto-backend.onrender.com
```

Rebuild and redeploy frontend:

```bash
npm run build:prod
firebase deploy --only hosting
```

---

## Alternative: Railway.app (Similar Process)

1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub repo
4. Add same environment variables
5. Deploy automatically

Your backend URL: `https://corepto-backend.up.railway.app`

---

## Testing After Deployment

1. Test backend health: `https://your-backend-url.com/api/health`
2. Test login from Firebase app: https://corepto-zimworx.web.app
3. Check logs in Render/Railway dashboard

---

## Troubleshooting

**Issue: 401 Unauthorized**
- Check CORS configuration includes your frontend URL
- Verify environment variables are set correctly

**Issue: Database Connection Failed**
- Verify DATABASE_URL is correct
- Check Neon database is accessible from Render

**Issue: Google Sheets Sync Failing**
- Upload `google-credentials.json` as environment variable
- Or use Render Secret Files feature

---

Would you like me to help with any of these steps?
