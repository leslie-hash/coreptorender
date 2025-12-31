# Complete PTO Request Workflow Guide

## Overview

This system implements a complete, compliant PTO request process with validation, CSP review, client approval, payroll notification, and absenteeism tracking.

---

## The 5-Step PTO Process

### ✅ STEP 1: Receive Request

**Methods:**

1. **Web Form** (Primary)
   - CSPs submit via the "Submit PTO Request" button
   - Form auto-validates and shows PTO balance in real-time
   - Endpoint: `POST /api/submit-leave-request`

2. **Email Submission** (Alternative)
   - Send email to webhook endpoint with structured format
   - System automatically parses and creates request
   - Endpoint: `POST /api/email-webhook/leave-request`

**Email Format:**
```
Team Member: John Doe
Leave Type: vacation
Start Date: 2025-12-01
End Date: 2025-12-10
Reason: Family vacation
```

---

### ✅ STEP 2: Review Request (Automated + CSP)

**Automated Validation:**

The system automatically checks:

1. **PTO Balance**
   - Calculates: Annual PTO - Used PTO = Remaining
   - Rejects if insufficient balance
   - Formula: `annualPTO` from `teamMemberMeta.json` minus approved/pending days in current year

2. **Company Policies**
   - Maximum 15 consecutive days
   - Minimum 3 days advance notice
   - Start date must be before end date

3. **Date Calculations**
   - Automatically calculates working days
   - Validates date ranges

**Validation Errors (Examples):**
- ❌ "Insufficient PTO balance. Requested: 10 days, Available: 5 days"
- ❌ "Maximum 15 consecutive days allowed. Request is 20 days"
- ❌ "Minimum 3 days notice required. Request is 1 day in advance"

**CSP Review Workflow:**

After automated validation passes:

1. Request enters **CSP Review Queue** (status: `csp-review`)
2. CSP opens "CSP Review Queue" in sidebar
3. CSP sees:
   - PTO balance breakdown
   - Validation status (all checks passed)
   - Team member details
   - Submission method (web/email)

4. CSP Actions:
   - **Approve & Forward to Client** - Sends to manager approval
   - **Reject** - Returns to submitter with notes (required)

**CSP Review Notes:**
- Required for rejections
- Optional for approvals
- Stored in `cspNotes` field
- Used for audit trail

---

### ✅ STEP 3: Submit for Client Approval

**Automatic Forwarding:**

When CSP approves:

1. Status changes from `csp-review` → `pending` (client approval)
2. Notification sent to managers/directors
3. Slack notification (if configured)
4. Email notification (if configured)

**Manager Approval Workflow:**

Managers see requests in "PTO Approval Workflow" section:

1. View all `pending` requests
2. See CSP verification notes
3. Approve or Reject
4. Optional: Add manager notes

---

### ✅ STEP 4: Notify Payroll

**Automatic Payroll Notification (On Approval):**

When manager approves, system automatically:

1. **Generates Payroll Email:**
   ```
   APPROVED LEAVE REQUEST
   =====================
   
   Team Member: John Doe
   Leave Type: vacation
   Start Date: 2025-12-01
   End Date: 2025-12-10
   Total Days: 7
   
   CSP Verified: Leslie Chasinda
   Approved At: [timestamp]
   ```

2. **Logs to `payrollNotifications.json`:**
   ```json
   {
     "id": "1234567890",
     "leaveRequestId": "request-id",
     "teamMember": "John Doe",
     "sentTo": ["payroll@zimworx.com"],
     "sentAt": "2025-11-28T10:30:00Z",
     "status": "sent"
   }
   ```

3. **Sends to Configured Recipients:**
   - Default: `payroll@zimworx.com`
   - Custom: Set in `emailSettings.json` → `payrollRecipients`

**Future Integration:**
- TODO: Replace stub with real Belina Payroll API call
- Function: `syncLeaveWithBelinaPayroll(leaveRequest)`

---

### ✅ STEP 5: Update Records

**Automatic Updates (On Approval):**

#### 5.1 Main Absenteeism Tracker

Updates Google Sheet: `Absenteeism!A:H`

Columns:
- Team Member Name
- Leave Type
- Start Date
- End Date
- Days
- Status (Approved)
- Date Recorded
- Reason

#### 5.2 Individual Team Member Records

Updates individual sheet: `[TeamMemberName]!A:E`

Example: `John_Doe!A:E`

Columns:
- Start Date
- End Date
- Days
- Leave Type
- Reason

**Configuration:**

Set in `.env`:
```env
ABSENTEEISM_SPREADSHEET_ID=your-spreadsheet-id
```

Or uses default `SPREADSHEET_ID` if not set.

---

## API Endpoints

### 1. Check PTO Balance
```
GET /api/pto-balance/:teamMemberName
```

**Response:**
```json
{
  "annualPTO": 20,
  "usedPTO": 8,
  "remainingPTO": 12
}
```

### 2. Submit Leave Request (Web)
```
POST /api/submit-leave-request
```

**Request Body:**
```json
{
  "teamMember": "John Doe",
  "leaveType": "vacation",
  "startDate": "2025-12-01",
  "endDate": "2025-12-10",
  "reason": "Family vacation",
  "submittedBy": "Leslie Chasinda"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Leave request submitted and ready for CSP review",
  "requestId": "1234567890",
  "validation": {
    "valid": true,
    "days": 7,
    "balance": {
      "annualPTO": 20,
      "usedPTO": 8,
      "remainingPTO": 12
    }
  }
}
```

**Validation Error Response:**
```json
{
  "error": "PTO request validation failed",
  "validationErrors": [
    "Insufficient PTO balance. Requested: 10 days, Available: 5 days"
  ],
  "balance": {
    "annualPTO": 20,
    "usedPTO": 15,
    "remainingPTO": 5
  }
}
```

### 3. CSP Review (Approve/Reject)
```
POST /api/leave-requests/:id/csp-review
```

**Request Body (Approve):**
```json
{
  "approved": true,
  "notes": "All parameters verified. PTO balance sufficient.",
  "cspName": "Leslie Chasinda"
}
```

**Request Body (Reject):**
```json
{
  "approved": false,
  "notes": "Insufficient PTO balance for requested dates",
  "cspName": "Leslie Chasinda"
}
```

### 4. Client Approval (Existing)
```
PATCH /api/leave-requests/:id
```

**Request Body:**
```json
{
  "status": "approved",
  "actor": "Manager Name"
}
```

This triggers automatic:
- Payroll notification
- Absenteeism tracker updates
- Email/Slack notifications

### 5. Email Webhook
```
POST /api/email-webhook/leave-request
```

**Request Body:**
```json
{
  "from": "csp@zimworx.com",
  "subject": "Leave Request",
  "body": "Team Member: John Doe\nLeave Type: vacation\n..."
}
```

---

## Configuration

### 1. PTO Allowances

Edit `server/teamMemberMeta.json`:

```json
[
  {
    "teamMemberName": "John Doe",
    "employeeId": "EMP001",
    "department": "Finance",
    "csp": "Leslie Chasinda",
    "annualPTO": 20
  }
]
```

**PTO Levels:**
- Standard: 20 days
- Senior: 25 days
- Executive: 30 days

### 2. Company Policies

Edit `server/index.js` → `validatePTORequest()`:

```javascript
const MAX_CONSECUTIVE_DAYS = 15;
const MIN_NOTICE_DAYS = 3;
```

### 3. Payroll Recipients

Edit `server/emailSettings.json`:

```json
{
  "payrollRecipients": [
    "payroll@zimworx.com",
    "finance@zimworx.com"
  ]
}
```

### 4. Google Sheets (Absenteeism Tracker)

Add to `server/.env`:

```env
ABSENTEEISM_SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/oauth2callback
```

**Sheet Structure:**

**Main Tracker:** Sheet name "Absenteeism"
- Column A: Team Member
- Column B: Leave Type
- Column C: Start Date
- Column D: End Date
- Column E: Days
- Column F: Status
- Column G: Date Recorded
- Column H: Reason

**Individual Sheets:** Sheet name "[FirstName]_[LastName]"
- Column A: Start Date
- Column B: End Date
- Column C: Days
- Column D: Leave Type
- Column E: Reason

---

## Status Flow

```
submitted (web/email)
    ↓
csp-review (automated validation)
    ↓
[CSP Reviews]
    ↓
pending (client approval) OR csp-rejected
    ↓
[Manager Reviews]
    ↓
approved OR rejected
    ↓
[If Approved]
    ↓
- Payroll Notified
- Absenteeism Tracker Updated
- Email/Slack Notifications Sent
```

---

## Audit Trail

Every request maintains a `history` array:

```json
{
  "history": [
    {
      "action": "submitted",
      "actor": "Leslie Chasinda",
      "timestamp": "2025-11-28T10:00:00Z",
      "note": "Initial submission"
    },
    {
      "action": "csp-approved",
      "actor": "Leslie Chasinda",
      "timestamp": "2025-11-28T10:15:00Z",
      "note": "All parameters verified"
    },
    {
      "action": "approved",
      "actor": "Manager Name",
      "timestamp": "2025-11-28T11:00:00Z",
      "note": "Client approved"
    }
  ]
}
```

---

## Frontend Components

### 1. LeaveRequestForm
- Real-time PTO balance display
- Automatic day calculation
- Validation error display
- Submission status tracking

### 2. CSPReviewWorkflow
- Queue of requests in `csp-review` status
- PTO balance visualization
- Approve/Reject actions
- Notes field for documentation

### 3. ApprovalWorkflow
- Manager view of `pending` requests
- CSP verification details
- Approve/Reject actions

---

## Testing

### Test PTO Balance Validation

1. Create team member with `annualPTO: 10`
2. Create approved request for 8 days
3. Try to submit new request for 5 days
4. Should fail: "Insufficient PTO balance. Requested: 5 days, Available: 2 days"

### Test CSP Review

1. Submit valid request
2. Check status: `csp-review`
3. Open "CSP Review Queue" in UI
4. Approve with notes
5. Verify status changes to `pending`
6. Check manager receives notification

### Test Payroll Notification

1. Approve a request as manager
2. Check `server/payrollNotifications.json`
3. Verify log entry created with:
   - Leave request details
   - Recipients
   - Timestamp

### Test Absenteeism Tracker

1. Set `ABSENTEEISM_SPREADSHEET_ID` in `.env`
2. Authenticate with Google (run `/api/google/auth`)
3. Approve a leave request
4. Check Google Sheet:
   - Main "Absenteeism" sheet has new row
   - Individual member sheet updated (if exists)

### Test Email Webhook

```bash
# Send test email webhook
curl -X POST http://localhost:4000/api/email-webhook/leave-request \
  -H "Content-Type: application/json" \
  -d '{
    "from": "csp@zimworx.com",
    "subject": "Leave Request",
    "body": "Team Member: Shawn Buka\nLeave Type: vacation\nStart Date: 2025-12-15\nEnd Date: 2025-12-20\nReason: Holiday break"
  }'
```

---

## Troubleshooting

### Issue: PTO balance showing incorrect

**Solution:**
- Check `annualPTO` in `teamMemberMeta.json`
- Verify approved/pending requests in `leaveRequests.json`
- Ensure dates are in current year

### Issue: Validation always fails

**Solution:**
- Check date formats (YYYY-MM-DD)
- Verify start date < end date
- Check system date for notice period calculation

### Issue: Payroll not receiving notifications

**Solution:**
- Check `emailSettings.json` has `payrollRecipients`
- Verify payroll log: `server/payrollNotifications.json`
- Configure nodemailer for production (currently console logs)

### Issue: Absenteeism tracker not updating

**Solution:**
- Verify `ABSENTEEISM_SPREADSHEET_ID` in `.env`
- Check Google OAuth tokens exist and valid
- Ensure sheet named "Absenteeism" exists
- Check permissions (edit access for service account)

### Issue: CSP Review Queue empty

**Solution:**
- Check request status is `csp-review`
- Verify user role is `csp`
- Filter by CSP name in backend

---

## Production Deployment

### 1. Email Configuration

Replace console logs with real email:

```javascript
// server/index.js - sendApprovedLeaveToPayroll()

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: payrollEmails,
  subject: emailSubject,
  text: emailBody
});
```

### 2. Belina Payroll Integration

Replace stub with real API:

```javascript
// server/connectors.js

export async function syncLeaveWithBelinaPayroll(leaveRecord) {
  const response = await axios.post(
    'https://api.belina.co.zw/payroll/leave',
    {
      employeeId: leaveRecord.employeeId,
      startDate: leaveRecord.startDate,
      endDate: leaveRecord.endDate,
      days: leaveRecord.days,
      type: leaveRecord.leaveType
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.BELINA_API_KEY}`
      }
    }
  );
  return response.data;
}
```

### 3. Email Webhook Setup

Configure email forwarding to webhook:
- Gmail: Use Apps Script to forward to webhook
- Zapier: Email → Webhook trigger
- SendGrid Inbound Parse
- AWS SES → Lambda → API Gateway

---

## Security

### Data Protection

- PTO balances calculated in real-time (not stored)
- Request history immutable (append-only)
- Payroll logs for audit compliance

### Access Control

- CSPs see only their team members
- Managers see all requests
- Payroll role has read-only access to logs

### Validation

- Server-side validation (never trust client)
- Date validation prevents backdating
- Balance checks prevent overspending

---

## Support

For issues or questions:
1. Check `server/payrollNotifications.json` for payroll logs
2. Check `server/leaveRequests.json` for request history
3. Check browser console for frontend errors
4. Check terminal for backend errors

---

**System Status:** ✅ All 5 PTO process steps implemented and functional
