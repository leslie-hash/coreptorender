# Client Approval Process Guide

## Overview

CorePTO supports **flexible client approval methods** to accommodate different client preferences and workflows. CSPs can handle approvals either **offline** (email/call/meeting) or **online** (for clients with system access).

---

## Approval Workflow

```
Team Member Submits → CSP Reviews → Client Approves → CSP Sends to Payroll → Payroll Processes
```

### Step-by-Step:

1. **Team Member** submits leave request via web form
2. **CSP** receives notification and reviews request
3. **CSP approves** → Request status changes to `pending-client-approval`
4. **Client approval happens** (varies by client - see methods below)
5. **CSP marks as approved** → Request status changes to `client-approved`
6. **CSP sends to payroll** → Request status changes to `payroll-processing`
7. **Payroll** processes and finalizes

---

## Client Approval Methods

### Option 1: Offline Approval (Default)

Most common method. Client approves via their preferred communication channel.

**Supported Methods:**
- ✉️ **Email** - Client replies to approval request email
- 📞 **Phone Call** - Client approves during phone conversation
- 🤝 **Meeting/Check-in** - Client approves during scheduled meeting
- 💬 **Messaging** - Client approves via Slack, Teams, WhatsApp, etc.

**CSP Workflow:**
1. CSP forwards request to client (email, call, meeting)
2. Client provides verbal/written approval
3. CSP logs into CorePTO system
4. CSP navigates to "Awaiting Client Approval" section
5. CSP enters:
   - Client name
   - Approval method (email/call/meeting/other)
   - Approval details (e.g., "Approved via email on 12/5/2025")
6. CSP clicks "Mark as Client Approved"
7. Request moves to "Ready for Payroll" section
8. CSP clicks "Send to Payroll"

**Benefits:**
- Flexible - works with any communication method
- No client login required
- Maintains existing client relationships
- Audit trail of approval method

---

### Option 2: System Approval (Optional)

For clients who want direct system access to approve requests online.

**Setup Required:**
1. Create client user account with `role: "client"`
2. Add client assignment to `teamMemberMeta.json`:
   ```json
   {
     "teamMemberName": "John Doe",
     "employeeId": "EMP001",
     "department": "Engineering",
     "csp": "csp@zimworx.com",
     "client": "Acme Corp",
     "clientEmail": "manager@acmecorp.com"
   }
   ```
3. Provide client with login credentials

**Client Workflow:**
1. Client receives email notification of pending request
2. Client logs into CorePTO system
3. Client navigates to "Client Approval Dashboard"
4. Client sees only requests for their assigned team members
5. Client reviews CSP notes and team member details
6. Client clicks "Approve" or "Deny" with optional notes
7. System automatically notifies CSP
8. CSP sends approved requests to payroll

**Benefits:**
- Real-time approval
- Full visibility for client
- Automated notifications
- Digital audit trail
- Self-service for clients

---

## Setting Up Client Access (System Approval)

### 1. Create Client User Account

**Via Registration:**
```
POST /api/register
{
  "name": "Jane Manager",
  "email": "jane@clientcompany.com",
  "password": "secure_password",
  "role": "client"
}
```

**Manual Addition to users.json:**
```json
{
  "name": "Jane Manager",
  "email": "jane@clientcompany.com",
  "password": "$2b$10$...",  // bcrypt hash
  "role": "client",
  "clientName": "Acme Corporation"
}
```

### 2. Link Team Members to Client

Edit `server/teamMemberMeta.json`:

```json
[
  {
    "teamMemberName": "John Doe",
    "employeeId": "EMP001",
    "department": "Engineering",
    "csp": "leslie@zimworx.com",
    "client": "Acme Corporation",
    "clientEmail": "jane@clientcompany.com",
    "email": "john.doe@zimworx.com",
    "joinDate": "2024-01-15"
  }
]
```

### 3. Test Client Login

1. Client logs in with credentials
2. Client sees "Client Approval Dashboard"
3. Pending requests appear automatically
4. Client can approve/deny requests

---

## CSP Dashboard Features

### Section 1: Pending My Review
- Requests requiring CSP verification
- PTO balance validation
- Action: Approve & Forward to Client / Reject

### Section 2: Awaiting Client Approval
- Requests sent to client (offline approval)
- Form to record client approval details:
  - Client name
  - Approval method dropdown
  - Approval notes (required)
- Action: Mark as Client Approved

### Section 3: Client Approved - Ready for Payroll
- Requests with confirmed client approval
- Action: Send to Payroll

---

## API Endpoints

### Mark Client Approved (Offline)
```http
POST /api/leave-requests/:id/mark-client-approved
Content-Type: application/json

{
  "approvalMethod": "email",  // email|call|meeting|system|other
  "notes": "Approved via email on 12/5/2025 at 2:30 PM",
  "clientName": "Jane Manager",
  "cspName": "Leslie Chasinda"
}
```

### Client Approval (System)
```http
POST /api/leave-requests/:id/client-approval
Content-Type: application/json

{
  "approved": true,
  "notes": "Approved - dates work with project timeline",
  "clientName": "Jane Manager"
}
```

### Send to Payroll
```http
POST /api/leave-requests/:id/send-to-payroll
Content-Type: application/json

{
  "cspName": "Leslie Chasinda",
  "notes": "Sent to payroll for processing"
}
```

---

## Request Status Flow

| Status | Description | Who Can Act |
|--------|-------------|-------------|
| `submitted` | Newly submitted | System (auto-assigns to CSP) |
| `csp-review` | Awaiting CSP verification | CSP |
| `pending-client-approval` | With client for approval | Client (system) or CSP (offline) |
| `client-approved` | Client approved, ready for payroll | CSP |
| `payroll-processing` | Sent to payroll | Payroll team |
| `completed` | Processed and finalized | System |
| `csp-rejected` | Rejected by CSP | - |
| `client-denied` | Denied by client | - |

---

## Best Practices

### For CSPs:
1. **Document everything** - Always add detailed notes when marking offline approvals
2. **Use consistent format** - Include date, time, and method in approval notes
3. **Respond quickly** - Mark approvals promptly after receiving client confirmation
4. **Verify before sending** - Double-check client approval before sending to payroll
5. **Maintain communication** - Keep clients informed of request status

### For Clients (System Access):
1. **Review CSP notes** - CSP verification provides important context
2. **Check PTO balance** - Ensure team member has sufficient leave available
3. **Add context** - Include notes about project impact or conditions
4. **Act promptly** - Approve or deny within 24-48 hours
5. **Communicate issues** - Contact CSP if you need clarification

### For Administrators:
1. **Choose per client** - Some clients want system access, others prefer offline
2. **Train CSPs** - Ensure CSPs understand both approval methods
3. **Monitor audit trail** - Review approval history regularly
4. **Update assignments** - Keep `teamMemberMeta.json` current
5. **Set expectations** - Clarify approval SLA with clients

---

## Troubleshooting

### Request Not Showing for Client
- Verify client role in `users.json`
- Check team member assignment in `teamMemberMeta.json`
- Ensure `client` or `clientEmail` field matches client user
- Confirm request status is `pending-client-approval`

### CSP Can't Mark Approval
- Verify request is assigned to this CSP
- Check request status (must be `pending-client-approval`)
- Ensure all required fields are filled (notes, method, client name)

### Request Stuck in Pending
- Check if client received notification
- Verify client can access system (if using system approval)
- Contact client for status update
- Use offline approval method if needed

---

## Migration Guide

### Moving from Offline to System Approval

1. **Create client accounts** for willing clients
2. **Update team member assignments** with client emails
3. **Train clients** on dashboard usage
4. **Keep offline option** as backup
5. **Monitor adoption** and gather feedback

### Moving from System to Offline Approval

1. **Keep client account active** (they may need reports)
2. **Update CSP workflow** to use offline marking
3. **Set client expectations** about new process
4. **Document preferred communication** method

---

## Security Considerations

- **Client access** is limited to their assigned team members only
- **CSPs** only see requests for team members they manage
- **Approval history** is immutable and timestamped
- **Passwords** are bcrypt hashed
- **Sessions** expire after inactivity
- **Audit trail** tracks all approval actions

---

## Support

For questions or issues:
- **CSPs**: Contact your Client Success Director
- **Clients**: Contact your assigned Client Success Partner
- **Technical**: Email support@zimworx.com
- **Documentation**: See README.md and CSP_GUIDE.md

---

**Last Updated:** December 5, 2025  
**Version:** 2.0 (Flexible Client Approval)
