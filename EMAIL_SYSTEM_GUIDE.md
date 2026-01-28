# Email Notification System - Configuration & Traceability Guide

## Overview

The LeavePoint system now includes comprehensive email notifications at every stage of the leave request workflow. All emails are logged for complete traceability and compliance.

## ✅ Key Features

### 1. **Automated Email Notifications**
- **New Leave Request** → CSP receives notification
- **CSP Approval** → Client receives approval request
- **Client Approval** → Payroll and CSP receive notification
- **Payroll Package Ready** → Payroll receives download link with complete package
- **Rejections** → Relevant stakeholders notified

### 2. **Full Traceability**
- All email sends are logged to `server/emailLogs.json`
- Each log entry includes:
  - Timestamp
  - Recipients (to, cc, bcc)
  - Subject line
  - Status (sent, failed, skipped)
  - Message ID (for sent emails)
  - Request ID and metadata
  - Error details (if failed)

### 3. **Configurable Settings**
- Enable/disable email system
- Configure SMTP settings
- Set notification preferences
- Define recipient lists

## 📧 Email Configuration

### Step 1: Configure SMTP Settings

Edit `server/emailSettings.json`:

```json
{
  "enabled": true,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "your-email@zimworx.com",
  "smtpPassword": "your-app-password",
  "fromEmail": "noreply@zimworx.com",
  "fromName": "LeavePoint - Team Leave Management",
  "payrollRecipients": [
    "leslie@zimworx.com",
    "hr@zimworx.com",
    "payroll@zimworx.org"
  ],
  "teamExperienceEmail": "teamexperience@zimworx.org",
  "notifications": {
    "newRequest": true,
    "approval": true,
    "rejection": true,
    "upcomingLeave": true,
    "pendingReminder": true
  }
}
```

### Step 2: Gmail App Password Setup (Recommended)

For Gmail accounts:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Other (Custom name)"
5. Generate password
6. Copy the 16-character password
7. Use this as `smtpPassword` in `emailSettings.json`

### Step 3: Enable the Email System

Set `"enabled": true` in `emailSettings.json`

## 📊 Email Workflow

### Stage 1: New Leave Request Submitted
```
Team Member submits request
  ↓
📧 Email sent to: Assigned CSP
  Subject: 🆕 New Leave Request: [Name] - [Type]
  Content: Request details, action button
  Logged: ✅ emailLogs.json
```

### Stage 2: CSP Reviews & Approves
```
CSP approves request
  ↓
📧 Email sent to: Client/Manager
  Subject: ✅ Leave Approval Required: [Name] - [Type]
  Content: CSP approval, client action needed
  Logged: ✅ emailLogs.json
```

### Stage 3: Client Approves
```
Client approves request
  ↓
📧 Email sent to: Payroll team (all recipients)
  Subject: ✅ Client Approved: [Name] - [Type]
  Content: Approval confirmation, awaiting package
  Logged: ✅ emailLogs.json
  ↓
📧 Email sent to: CSP
  Subject: ✅ Client Approved: [Name] - [Type]
  Content: Notification to send payroll package
  Logged: ✅ emailLogs.json
```

### Stage 4: CSP Sends to Payroll
```
CSP sends payroll package
  ↓
📧 Email sent to: Payroll team (all recipients)
  Subject: 📦 Payroll Package Ready: [Name] - [Type]
  Content: Download link, package contents, instructions
  Logged: ✅ emailLogs.json
```

### Stage 5: Rejection (if applicable)
```
CSP or Client rejects
  ↓
📧 Email sent to: Relevant stakeholders
  Subject: ❌ Leave Request Rejected: [Name] - [Type]
  Content: Rejection reason, details
  Logged: ✅ emailLogs.json
```

## 🔍 Email Traceability & Monitoring

### View Email Logs via API

**Get all email logs:**
```bash
GET http://localhost:4000/api/email-logs
```

**Filter by request ID:**
```bash
GET http://localhost:4000/api/email-logs?requestId=LR-12345
```

**Filter by status:**
```bash
GET http://localhost:4000/api/email-logs?status=sent
GET http://localhost:4000/api/email-logs?status=failed
```

**Filter by type:**
```bash
GET http://localhost:4000/api/email-logs?type=payroll_package_ready
```

**Filter by date:**
```bash
GET http://localhost:4000/api/email-logs?since=2026-01-01
```

**Limit results:**
```bash
GET http://localhost:4000/api/email-logs?limit=50
```

### Email Log Entry Structure

```json
{
  "id": "email-1737494520-abc123",
  "timestamp": "2026-01-21T10:15:20.123Z",
  "to": "payroll@zimworx.org",
  "cc": null,
  "bcc": null,
  "subject": "📦 Payroll Package Ready: Joseph Hove - Annual Leave",
  "status": "sent",
  "messageId": "<abc123@smtp.gmail.com>",
  "response": "250 2.0.0 OK",
  "metadata": {
    "type": "payroll_package_ready",
    "requestId": "LR-TEST-001",
    "teamMember": "Joseph Hove",
    "packageUrl": "/api/payroll-packages/Payroll_JosephHove_2026-01-21_001.zip",
    "cspName": "Tsungirirai Samhungu"
  }
}
```

### Failed Email Entry

```json
{
  "id": "email-1737494530-def456",
  "timestamp": "2026-01-21T10:15:30.456Z",
  "to": "client@example.com",
  "subject": "✅ Leave Approval Required",
  "status": "failed",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout at...",
  "metadata": {
    "type": "csp_approved_needs_client",
    "requestId": "LR-TEST-002"
  }
}
```

### Skipped Email Entry (Service Disabled)

```json
{
  "id": "email-1737494540-ghi789",
  "timestamp": "2026-01-21T10:15:40.789Z",
  "to": "payroll@zimworx.org",
  "subject": "📦 Payroll Package Ready",
  "status": "skipped",
  "reason": "Email service disabled",
  "metadata": {
    "type": "payroll_package_ready",
    "requestId": "LR-TEST-003"
  }
}
```

## 📋 Email Types & Recipients

| Email Type | Trigger | Recipients | Subject |
|------------|---------|------------|---------|
| `new_leave_request` | Team member submits request | Assigned CSP | 🆕 New Leave Request: [Name] - [Type] |
| `csp_approved_needs_client` | CSP approves | Client/Manager | ✅ Leave Approval Required: [Name] - [Type] |
| `client_approved` | Client approves | Payroll team | ✅ Client Approved: [Name] - [Type] |
| `client_approved_notify_csp` | Client approves | CSP | ✅ Client Approved: [Name] - [Type] |
| `payroll_package_ready` | CSP sends to payroll | Payroll team | 📦 Payroll Package Ready: [Name] - [Type] |
| `rejection` | CSP/Client rejects | Submitter, CSP | ❌ Leave Request Rejected: [Name] - [Type] |

## 🎨 Email Templates

All emails use professional HTML templates with:
- Company branding
- Clear call-to-action buttons
- Responsive design
- Plain text fallback
- Request details in formatted tables
- Color-coded status indicators

## 🔐 Security & Compliance

### Email Security
- SMTP authentication required
- TLS/SSL encryption supported
- App passwords recommended (no plaintext passwords)
- Credentials never sent to frontend

### Audit Trail
- Every email logged with full metadata
- Logs retained for compliance (500 most recent)
- Searchable and filterable
- Timestamps in ISO 8601 format
- Unique message IDs for tracking

### Data Privacy
- Only necessary information included in emails
- No sensitive data in subject lines
- Secure download links with authentication
- Email logs stored locally (not in cloud)

## 🛠️ Troubleshooting

### Email Not Sending

1. **Check if service is enabled:**
   ```bash
   GET http://localhost:4000/api/email-settings
   ```

2. **Check email logs for errors:**
   ```bash
   GET http://localhost:4000/api/email-logs?status=failed
   ```

3. **Verify SMTP credentials:**
   - Ensure `smtpUser` and `smtpPassword` are set
   - Test credentials with Gmail or your SMTP provider
   - Check for 2FA requirements (use app passwords)

4. **Check firewall/network:**
   - Ensure port 587 (or 465) is open
   - Check if SMTP server is reachable
   - Try telnet: `telnet smtp.gmail.com 587`

5. **Check server logs:**
   - Look for console output: `📧` or `❌` emoji
   - Check backend terminal for errors

### Common Errors

**"SMTP not configured"**
- `smtpUser` or `smtpPassword` missing in `emailSettings.json`

**"Email service disabled"**
- Set `"enabled": true` in `emailSettings.json`

**"Connection timeout"**
- Check network connectivity
- Verify SMTP server and port
- Check firewall rules

**"Authentication failed"**
- Verify credentials
- Use app password for Gmail
- Check if 2FA is enabled

## 📈 Monitoring & Reporting

### Email Statistics

To get email statistics, query the logs:

```javascript
// Count sent emails
GET /api/email-logs?status=sent

// Count failed emails
GET /api/email-logs?status=failed

// Get emails for specific request
GET /api/email-logs?requestId=LR-12345

// Get recent emails (last 24 hours)
GET /api/email-logs?since=2026-01-20T00:00:00Z
```

### Dashboard Integration (Future)

The email logs can be integrated into an admin dashboard to show:
- Email delivery rate
- Failed email alerts
- Email volume by type
- Most active recipients

## 🚀 Testing Email Configuration

### Test Email Endpoint (Development)

Create a test endpoint to verify email configuration:

```javascript
// In server/index.js
app.post('/api/test-email', async (req, res) => {
  const { sendEmail } = await import('./emailService.js');
  const result = await sendEmail({
    to: req.body.to || 'test@zimworx.com',
    subject: 'Test Email from LeavePoint',
    html: '<h1>Email Configuration Test</h1><p>If you receive this, emails are working correctly!</p>',
    text: 'Email Configuration Test - If you receive this, emails are working correctly!',
    metadata: { type: 'test' }
  });
  
  res.json(result);
});
```

### Send Test Email

```bash
POST http://localhost:4000/api/test-email
Content-Type: application/json

{
  "to": "your-email@zimworx.com"
}
```

## 📞 Support

For email configuration issues:
1. Check `server/emailLogs.json` for error details
2. Verify `server/emailSettings.json` configuration
3. Test SMTP connection separately
4. Contact IT for firewall/network issues
5. Review Gmail App Password documentation

## 🔄 Email Service Updates

### Update Email Settings via API

```bash
PUT http://localhost:4000/api/email-settings
Content-Type: application/json

{
  "enabled": true,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "updated-email@zimworx.com",
  "smtpPassword": "new-app-password",
  "payrollRecipients": [
    "new-payroll@zimworx.org"
  ]
}
```

### Get Current Email Settings

```bash
GET http://localhost:4000/api/email-settings
```

**Note:** SMTP password is never returned in GET requests for security.

## ✨ Benefits

1. **Complete Transparency** - Every stakeholder knows the status
2. **Full Audit Trail** - All communications logged and traceable
3. **Compliance Ready** - Meets audit and compliance requirements
4. **Reduced Manual Work** - Automated notifications save time
5. **Improved Communication** - No missed updates or delays
6. **Professional Image** - Branded, well-formatted emails
7. **Error Recovery** - Failed emails logged for retry

---

**Email System Version:** 1.0.0  
**Last Updated:** January 21, 2026  
**Status:** ✅ Production Ready
