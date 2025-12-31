# n8n Setup Guide for 22 CSP Email Monitoring

## Step-by-Step Configuration

### 1. Install & Start n8n

**Open PowerShell and run:**
```powershell
npx n8n
```

**Access n8n at:** http://localhost:5678

- Create your account (stored locally)
- You'll see the n8n dashboard

---

## 2. Create Workflow

### Step A: Create New Workflow
1. Click **"New Workflow"** (top right)
2. Name it: **"LeavePoint - 22 CSP Email Monitor"**
3. Save it (Ctrl+S)

---

## 3. Add Email Trigger Nodes (One per CSP)

### For CSP #1:

1. Click **"Add first step"** or click **"+"** button
2. Search for **"Email Trigger (IMAP)"**
3. Click to add it
4. Rename node: **"CSP1 Email"** (click node title)

### Configure CSP1 Email Node:

**IMAP Settings:**
```
Host: imap.gmail.com
Port: 993
User: csp1@zimworx.com
Password: [Get App Password from Gmail]
```

**How to Get Gmail App Password:**
1. Go to Gmail → Settings (gear icon) → See all settings
2. Accounts and Import → Other Google Account settings
3. Security → 2-Step Verification (enable if not enabled)
4. App passwords → Generate new app password
5. Select "Mail" and "Other (Custom name)" → Name it "n8n"
6. Copy the 16-character password
7. Use this in n8n, NOT your regular password

**Mailbox Settings:**
```
Mailbox: INBOX
Search Criteria: UNSEEN
Mark as Read: Yes (recommended - prevents duplicate processing)
```

**Polling Settings:**
```
Check Interval: 5 minutes
```

**Click "Execute Node"** to test - it should show recent emails

---

### For CSP #2 through #22:

**Duplicate Method (Faster):**
1. Right-click the "CSP1 Email" node
2. Select **"Duplicate"**
3. Rename to "CSP2 Email"
4. Click the node → Edit credentials
5. Change email to: `csp2@zimworx.com`
6. Update password with CSP2's app password
7. Click "Execute Node" to test

**Repeat for all 22 CSPs**

Your workflow will look like:
```
[CSP1 Email]    [CSP2 Email]    [CSP3 Email]  ...  [CSP22 Email]
```

---

## 4. Add HTTP Request Node

### Step A: Add Node
1. Click **"+"** after any CSP Email node
2. Search for **"HTTP Request"**
3. Add it
4. Rename to: **"Send to LeavePoint"**

### Step B: Configure HTTP Request

**Method & URL:**
```
Method: POST
URL: http://localhost:4000/api/email-webhook/leave-request
```

**Authentication:**
```
Authentication: None
```

**Headers:**
Click "Add Header":
```
Name: Content-Type
Value: application/json
```

**Send Body:**
```
✓ Enable "Send Body"
Body Content Type: JSON
```

**JSON Body:**
Click "Add Expression" and paste:
```json
{
  "from": "={{ $json.from.value[0].address }}",
  "to": "={{ $json.to.value[0].address }}",
  "subject": "={{ $json.subject }}",
  "body": "={{ $json.textPlain }}",
  "attachments": []
}
```

**Alternative if using simple fields:**
```json
{
  "from": "={{ $json.from }}",
  "to": "={{ $json.to }}",
  "subject": "={{ $json.subject }}",
  "body": "={{ $json.text || $json.textPlain || $json.body }}",
  "attachments": []
}
```

---

## 5. Connect All CSP Nodes to HTTP Request

### Connect Each CSP to the HTTP Node:

1. Hover over **"CSP1 Email"** node
2. Click the **small circle** on the right edge
3. Drag to the **"Send to LeavePoint"** node
4. Release to connect

**Repeat for all 22 CSP Email nodes**

Your final workflow:
```
[CSP1]  ─┐
[CSP2]  ─┤
[CSP3]  ─┤
[CSP4]  ─┤
  ...    ├──▶ [Send to LeavePoint HTTP]
[CSP19] ─┤
[CSP20] ─┤
[CSP21] ─┤
[CSP22] ─┘
```

---

## 6. Test the Workflow

### Test Individual CSP:
1. Click on **"CSP1 Email"** node
2. Click **"Execute Node"** button
3. You should see recent emails appear
4. Click **"Send to LeavePoint"** node
5. Click **"Execute Node"**
6. Check if it posts to your API successfully

### Send Test Email:
1. Send email from a team member to `csp1@zimworx.com`:
```
To: csp1@zimworx.com
Subject: Leave Request - Test

Team Member: John Doe
Leave Type: Annual Leave
Start Date: 2025-12-10
End Date: 2025-12-15
Reason: Testing the system
```

2. Wait 5 minutes (or manually execute CSP1 node)
3. Check if request appears in LeavePoint

---

## 7. Activate Workflow

### Make it Live:
1. Toggle **"Active"** switch (top right, next to Save)
2. Status should show: **"Active"**
3. n8n will now check all 22 inboxes every 5 minutes

---

## 8. Monitor & Manage

### View Execution History:
- Click **"Executions"** (left sidebar)
- See all workflow runs
- Click any execution to see details
- Check for errors or failed runs

### Error Handling:
If an email fails to process:
- n8n logs the error
- Email stays in inbox (if not marked as read)
- Fix the issue
- Manually execute node to retry

---

## Advanced Configuration

### Option A: Gmail Delegation (Easier Management)

Instead of 22 separate IMAP connections, use Gmail delegation:

1. Have all 22 CSPs delegate access to one "master" account
2. Gmail Settings → Accounts → Grant access to your account
3. Master account can read all 22 inboxes
4. Use Gmail API node instead of IMAP
5. One node monitors all delegated accounts

### Option B: Shared Labels

1. Create filter in each CSP's Gmail: "from:*@zimworx.com AND subject:leave request"
2. Auto-forward to central inbox with label
3. n8n monitors central inbox
4. Extracts original recipient from headers
5. Only need 1 IMAP connection

---

## Email Format for Team Members

Share this template with team members:

```
To: [Your CSP's Email]@zimworx.com
Subject: Leave Request - [Your Name]

Team Member: [Your Full Name]
Leave Type: [Annual Leave / Sick Leave / Personal]
Start Date: YYYY-MM-DD
End Date: YYYY-MM-DD
Reason: [Brief explanation]

Additional Notes: [Optional]
```

**Example:**
```
To: sarah.johnson@zimworx.com
Subject: Leave Request - Michael Chen

Team Member: Michael Chen
Leave Type: Annual Leave
Start Date: 2025-12-20
End Date: 2025-12-27
Reason: Christmas holiday with family

Additional Notes: Will check emails once daily
```

---

## Troubleshooting

### Issue: "Authentication failed"
**Solution:** Use Gmail App Password, not regular password
1. Enable 2-Step Verification in Gmail
2. Generate App Password
3. Use 16-character code in n8n

### Issue: "Connection timeout"
**Solution:** Check firewall/antivirus blocking port 993
```powershell
Test-NetConnection -ComputerName imap.gmail.com -Port 993
```

### Issue: "No emails found"
**Solution:** 
- Check Search Criteria: Use "UNSEEN" or "ALL"
- Try "Execute Node" manually
- Send test email and wait

### Issue: "HTTP Request fails"
**Solution:** Make sure LeavePoint server is running:
```powershell
cd c:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\server
node index.js
```

### Issue: Duplicate processing
**Solution:** Enable "Mark as Read" in IMAP settings

---

## Performance Notes

### 22 IMAP Connections:
- Each checks every 5 minutes
- Total: ~264 checks per hour
- Gmail rate limit: 15 requests per second (safe)
- CPU usage: Minimal when idle
- Memory: ~50MB per n8n instance

### Recommended:
- Start with 5 CSPs to test
- Add more gradually
- Monitor n8n performance
- Consider Gmail API for better efficiency at scale

---

## Security Best Practices

1. **App Passwords:** Use Gmail App Passwords, never real passwords
2. **Firewall:** Only allow n8n to access localhost:4000
3. **HTTPS:** Use SSL in production (not localhost)
4. **Rate Limiting:** Add rate limit to webhook endpoint
5. **Email Validation:** Webhook validates @zimworx.com domain
6. **Backup:** Export n8n workflow regularly (Settings → Export)

---

## Quick Commands

**Start n8n:**
```powershell
npx n8n
```

**Start LeavePoint Server:**
```powershell
cd c:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\server
node index.js
```

**Start LeavePoint Frontend:**
```powershell
cd c:\Users\leslie.chasinda\Downloads\automation-sync-efficiency
npm run dev
```

**Test Webhook Manually:**
```powershell
$body = @{
    from = "john.doe@zimworx.com"
    to = "csp1@zimworx.com"
    subject = "Leave Request - John Doe"
    body = "Team Member: John Doe`nLeave Type: Annual Leave`nStart Date: 2025-12-10`nEnd Date: 2025-12-15`nReason: Testing"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:4000/api/email-webhook/leave-request' -Method POST -Body $body -ContentType 'application/json'
```

---

## Next Steps

1. ✅ Install n8n: `npx n8n`
2. ✅ Create workflow
3. ✅ Add first CSP email trigger (test with 1 CSP first)
4. ✅ Add HTTP request node
5. ✅ Connect nodes
6. ✅ Test with sample email
7. ✅ Add remaining 21 CSPs
8. ✅ Activate workflow
9. ✅ Train team members on email format
10. ✅ Monitor for first week

---

**You're ready to automate leave requests for 22 CSPs!** 🚀
