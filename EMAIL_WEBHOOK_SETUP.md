# Email to Webhook Setup Guide (n8n - Free & Open Source)

## Overview
This guide will help you set up automatic processing of leave request emails using **n8n** - a free, open-source automation tool you can run locally.

## Why n8n?
- ✅ **Free & Open Source** - No subscription fees
- ✅ **Self-hosted** - Full control over your data
- ✅ **Easy Setup** - Run locally with npm or Docker
- ✅ **Visual Workflow** - Drag-and-drop like Zapier
- ✅ **No Limits** - Unlimited workflows and executions

---

## Option 1: n8n Setup (Recommended - Free!)

### Step 1: Install n8n
**Option A - Using npx (Quick Start):**
```powershell
npx n8n
```
n8n will start at http://localhost:5678

**Option B - Using Docker:**
```powershell
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

**Option C - Global Install:**
```powershell
npm install n8n -g
n8n start
```

### Step 2: Create n8n Account
1. Open http://localhost:5678
2. Create your account (stored locally)
3. You'll see the n8n dashboard

### Step 3: Create Email Workflow
1. Click **"+ New Workflow"**
2. Name it: "Leave Request Email Processor"

### Step 4: Add Email Trigger Node
1. Click **"+ Add node"**
2. Search for **"Email Trigger (IMAP)"**
3. **Configure**:
   - **Host**: `imap.gmail.com` (or your email provider)
   - **Port**: `993`
   - **User**: `your-email@company.com`
   - **Password**: Your email password or [App Password](https://support.google.com/accounts/answer/185833)
   - **Check Interval**: `5 minutes`
   - **Mailbox**: `INBOX`
   - **Search Criteria**: `SUBJECT "Leave Request"`

**Alternative - Use Webhook Trigger:**
If you want emails forwarded to n8n:
1. Add **"Webhook"** node instead
2. Copy webhook URL (e.g., `http://localhost:5678/webhook/leave-request`)
3. Set up Gmail filter to forward to webhook via script

### Step 5: Add HTTP Request Node
1. Click **"+"** after Email Trigger
2. Search for **"HTTP Request"**
3. **Configure**:

```
Method: POST
URL: http://localhost:4000/api/email-webhook/leave-request

Authentication: None

Headers:
Name: Content-Type
Value: application/json

Body:
Send Body: JSON

JSON:
{
  "from": "={{ $json.from }}",
  "subject": "={{ $json.subject }}",
  "body": "={{ $json.textPlain }}",
  "attachments": []
}
```

### Step 6: Test & Activate
1. Click **"Execute Node"** on Email Trigger
2. Send test email with "Leave Request" subject
3. Check if data flows to HTTP Request node
4. Click **"Activate"** toggle (top right)
5. Workflow now runs automatically!

---

## Visual Workflow in n8n

Your workflow will look like this:

```
┌─────────────────┐       ┌─────────────────┐
│  Email Trigger  │  ───▶ │  HTTP Request   │
│  (IMAP Gmail)   │       │  (POST to API)  │
└─────────────────┘       └─────────────────┘
```

**Node Configuration:**

**Email Trigger Node:**
- Monitors your inbox every 5 minutes
- Filters emails with "Leave Request" in subject
- Outputs: from, subject, body, attachments

**HTTP Request Node:**
- Sends POST to your LeavePoint server
- Maps email data to webhook format
- Receives confirmation response

---

## Advanced: Multiple Email Accounts

You can monitor multiple inboxes:

1. Add multiple Email Trigger nodes
2. Connect all to same HTTP Request node
3. Process leave requests from different departments

```
┌─────────────┐
│  HR Inbox   │──┐
└─────────────┘  │
                 │    ┌─────────────────┐
┌─────────────┐  ├───▶│  HTTP Request   │
│  IT Inbox   │──┤    │  (POST to API)  │
└─────────────┘  │    └─────────────────┘
                 │
┌─────────────┐  │
│ Sales Inbox │──┘
└─────────────┘
```

---

## Expected Email Format

For best results, have team members send emails with this structure:

```
To: leave-requests@yourcompany.com
Subject: Leave Request - [Team Member Name]

Team Member: John Doe
Leave Type: Annual Leave
Start Date: 2025-12-10
End Date: 2025-12-15
Reason: Family vacation

Additional Notes: Will be available via phone for emergencies.
```

---

## Webhook Endpoint Details

### URL
```
Production: https://your-domain.com/api/email-webhook/leave-request
Development: http://localhost:4000/api/email-webhook/leave-request
```

### Expected Payload
```json
{
  "from": "john.doe@company.com",
  "subject": "Leave Request - John Doe",
  "body": "Team Member: John Doe\nLeave Type: Annual Leave\nStart Date: 2025-12-10\nEnd Date: 2025-12-15\nReason: Family vacation",
  "attachments": []
}
```

### Response
```json
{
  "success": true,
  "message": "Leave request received and processed",
  "requestId": "1701619200000",
  "validation": {
    "days": 4,
    "balance": {
      "annualPTO": 20,
      "usedPTO": 5,
      "remainingPTO": 15
    }
  }
}
```

---

## Troubleshooting

### Issue: Webhook not receiving data
**Solution**: 
- Check your server URL is publicly accessible
- Use ngrok for testing: `ngrok http 4000`
- Update webhook URL to ngrok URL

### Issue: Email not parsing correctly
**Solution**:
- Check email format matches expected structure
- View raw email body in Zapier/Make logs
- Adjust parsing logic in server if needed

### Issue: Validation failing
**Solution**:
- Ensure team member exists in system
- Check PTO balance is sufficient
- Verify date format: YYYY-MM-DD

---

## Advanced: Custom Email Parser

If your emails have a different format, update the parsing function in `server/index.js`:

```javascript
function parseLeaveRequestEmail(body) {
  // Customize this regex to match your email format
  const patterns = {
    teamMember: /Team Member:\s*(.+)/i,
    leaveType: /Leave Type:\s*(.+)/i,
    startDate: /Start Date:\s*(\d{4}-\d{2}-\d{2})/i,
    endDate: /End Date:\s*(\d{4}-\d{2}-\d{2})/i,
    reason: /Reason:\s*(.+)/i
  };
  
  // Extract data
  const data = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = body.match(pattern);
    data[key] = match ? match[1].trim() : null;
  }
  
  return data;
}
```

---

## Security Considerations

1. **API Key Authentication**: Add header verification
2. **Rate Limiting**: Prevent spam
3. **Email Whitelist**: Only accept from authorized domains
4. **HTTPS**: Use SSL in production

---

## Quick Start Commands

**Start n8n:**
```powershell
npx n8n
```

**Start LeavePoint Server:**
```powershell
cd server
node index.js
```

**Access:**
- n8n Dashboard: http://localhost:5678
- LeavePoint: http://localhost:8080
- API: http://localhost:4000

---

## Next Steps

1. ✅ Install n8n: `npx n8n`
2. ✅ Create workflow in n8n dashboard
3. ✅ Add Email Trigger node (IMAP)
4. ✅ Add HTTP Request node (POST)
5. ✅ Configure email credentials
6. ✅ Test with sample email
7. ✅ Activate workflow
8. ✅ Train team on email format
9. ✅ Go live!

---

## Support

For issues or questions:
- Check server logs: `node index.js`
- View webhook logs in Zapier/Make.com
- Test webhook manually with Postman/curl

---

**Ready to automate your leave request process!** 🚀
