# Payroll Officer Access - CILL Verification System

## Overview
Payroll officers now have full access to CILL Verification financial data with the same privileges as Finance and Admin roles.

---

## Payroll Officer Permissions

### ✅ **Full Access:**
- **Read** - View all CILL verification records with unmasked financial data
- **Write** - Update CILL records (verification status, comments, billing info)
- **Export** - Download encrypted CSV reports with full financial details
- **Sync** - Synchronize data from Google Sheets

### 🔐 **Security Features:**
- All financial data encrypted at rest (AES-256)
- Access automatically logged in audit trail
- Role-based authentication required
- Password-protected exports

---

## Registration

### Create Payroll Officer Account:

**API Endpoint:**
```
POST /api/register
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@zimworx.com",
  "password": "SecurePassword123!",
  "role": "payroll"
}
```

**Valid Roles:**
- `admin` - Full system access
- `finance` - Financial data access
- `payroll` - **Full CILL data access (same as finance)**
- `csp` - Limited read access
- `manager` - Read-only access
- `user` - No CILL access

---

## API Access

### 1. Login
```
POST /api/login
Body: { "email": "payroll@zimworx.com", "password": "..." }
Response: { "token": "...", "role": "payroll" }
```

### 2. View CILL Records
```
GET /api/cill-verification
Headers: { "Authorization": "Bearer <token>" }
```

**Payroll sees:**
- ✅ Full employee names and numbers
- ✅ Exact billing rates (not masked)
- ✅ Complete financial amounts
- ✅ All client and CSP information
- ✅ Leave days and working days

### 3. Export Financial Report
```
POST /api/cill-verification/export
Headers: { "Authorization": "Bearer <token>" }
Body: { "password": "YourExportPassword" }
```

Returns encrypted CSV with:
- Employee details
- Monthly billing rates
- Billable amounts
- Amount billed
- Outstanding balances

### 4. Update Records
```
PATCH /api/cill-verification/:id
Headers: { "Authorization": "Bearer <token>" }
Body: { 
  "spreadsheetId": "...",
  "updates": {
    "verifiedWithCSP": "Yes",
    "billableDaysBasedOnCSP": 20,
    "cspComments": "Verified for November",
    "amountBilled": 15000
  }
}
```

### 5. View Summary Analytics
```
GET /api/cill-verification/summary
Headers: { "Authorization": "Bearer <token>" }
```

Returns:
- Total billable amounts
- Total billed amounts
- Outstanding balances
- Billing completion rates
- Breakdowns by client and CSP
- Leave statistics

---

## Data Visibility Comparison

| Role | Employee Names | Billing Rates | Financial Data | Export | Update |
|------|---------------|---------------|----------------|--------|--------|
| **Admin** | Full | Full | Full | ✅ | ✅ |
| **Finance** | Full | Full | Full | ✅ | ✅ |
| **Payroll** | Full | Full | Full | ✅ | ✅ |
| CSP | Full | Masked (ranges) | Masked | ❌ | ❌ |
| Manager | Full | Masked (ranges) | Masked | ❌ | ❌ |
| User | ❌ No Access | ❌ No Access | ❌ No Access | ❌ | ❌ |

---

## Security & Compliance

### Audit Trail
Every CILL data access is logged:
```json
{
  "timestamp": "2025-11-25T10:30:00Z",
  "userId": "payroll@zimworx.com",
  "userRole": "payroll",
  "action": "read",
  "recordId": "CILL-EMP001"
}
```

**Logged Actions:**
- Read (view records)
- Update (modify data)
- Export (download reports)
- Sync (pull from Google Sheets)

### Encryption
- **At Rest:** AES-256 encryption for all sensitive fields
- **In Transit:** HTTPS/TLS for API communication
- **Export:** Password-protected encrypted CSV

### Access Control
- Token-based authentication (JWT)
- Role verification on every request
- Automatic session expiration
- Failed login attempt tracking

---

## Usage Example

```javascript
// 1. Login as payroll officer
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'payroll@zimworx.com',
    password: 'SecurePass123!'
  })
});
const { token } = await loginResponse.json();

// 2. Fetch CILL records
const records = await fetch('/api/cill-verification?client=ACME Corp', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await records.json();

// 3. View financial data (unmasked for payroll)
console.log(data.records[0].monthlyBillingRate); // 25000 (exact amount)
console.log(data.records[0].billableAmount);     // 20000 (exact amount)

// 4. Update billing information
await fetch('/api/cill-verification/CILL-EMP001', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    spreadsheetId: 'your-sheet-id',
    updates: {
      amountBilled: 20000,
      billingDoneInvoiceNumber: 'INV-2025-001'
    }
  })
});

// 5. Export report
const exportData = await fetch('/api/cill-verification/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: 'MySecureExportPassword'
  })
});
```

---

## Best Practices

1. **Use Strong Passwords** - Minimum 12 characters, mixed case, numbers, symbols
2. **Rotate Credentials** - Change password every 90 days
3. **Secure Export Files** - Delete encrypted CSVs after import into payroll system
4. **Verify Data** - Cross-check amounts before updating billing records
5. **Report Anomalies** - Flag discrepancies in billable vs. billed amounts
6. **Limit Access** - Don't share payroll account credentials
7. **Review Audit Logs** - Periodically check access logs for unusual activity

---

## Support

For issues or questions:
- **Technical Support:** IT Department
- **CILL Data Questions:** Finance Team
- **Access Issues:** System Administrator

**Emergency Contact:** admin@zimworx.com
