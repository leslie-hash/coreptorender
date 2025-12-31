# 📦 CorePTO Data Storage: What Stores What and Where

## 🎯 The Simple Answer

CorePTO uses a **3-layer storage architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYERS                            │
└─────────────────────────────────────────────────────────────┘

1️⃣ JSON FILES (server/)           → Simple data, fast access
2️⃣ NEON POSTGRESQL (Cloud)        → Complex queries, absenteeism
3️⃣ EXCEL EXPORTS (server/exports/) → Payroll documents
4️⃣ GOOGLE SHEETS (Your Drive)     → Source of truth, backup
```

---

## 📊 Storage Map: What Goes Where

### **JSON Files** (`server/` directory)
**Purpose**: Primary storage for most CorePTO data  
**Why**: Fast, simple, human-readable, Google Sheets compatible

| File | What It Stores | Count | Example |
|------|---------------|-------|---------|
| `leaveRequests.json` | All leave requests | 356 records | Submissions, approvals, status |
| `teamMemberMeta.json` | Team roster + PTO | 87 members | Names, CSPs, clients, balances |
| `teamMembers.json` | Client names | N/A | Client company list |
| `approvalHistory.json` | Approval audit trail | All actions | Who approved what, when |
| `notifications.json` | Communication log | All alerts | Sent notifications, read status |
| `absenteeismRecords.json` | Absence cache | 87 records | Temp storage before Neon sync |
| `clientData.json` | Client information | Multiple | Client details, contacts |
| `users.json` | System users | All users | Login credentials, roles |
| `syncSettings.json` | Google Sheets config | Per CSP | Spreadsheet IDs, ranges |
| `emailSettings.json` | Email configuration | Global | SMTP settings, templates |
| `integrationSettings.json` | Third-party configs | Global | API keys, endpoints |

---

### **Neon PostgreSQL** (Cloud Database)
**Purpose**: Structured storage for complex absenteeism queries  
**Why**: SQL queries, concurrent access, data integrity, analytics

| Table | What It Stores | Why Not JSON? |
|-------|---------------|---------------|
| `absenteeism_reports` | Absence records with 20+ fields | Need complex date queries, CSP filtering, aggregations, concurrent writes |

**Example Queries JSON Can't Do:**
```sql
-- Find all unauthorized absences in Q4 2025
SELECT * FROM absenteeism_reports 
WHERE absenteeism_authorised = false 
  AND month IN ('OCTOBER', 'NOVEMBER', 'DECEMBER')
  AND year = 2025;

-- Calculate average sick days by CSP
SELECT csp, AVG(no_of_days_no_wknd) as avg_sick_days
FROM absenteeism_reports
WHERE reason_for_absence = 'Sick'
GROUP BY csp;
```

---

### **Excel Exports** (`server/exports/` directory)
**Purpose**: Auto-generated payroll documents  
**Why**: Payroll needs Excel files, not JSON

| File Pattern | What It Stores | When Created | Count |
|--------------|---------------|--------------|-------|
| `leave_{id}_{timestamp}.xlsx` | Individual leave request formatted for payroll | When client approves | 356 files (1 per approved request) |

**Each file contains:**
- Employee name, ID, department, CSP
- Leave type, dates, days (business days only)
- All approval timestamps and actors
- Full audit trail in Excel format
- Ready for payroll system import

---

### **Google Sheets** (Your Google Drive)
**Purpose**: Source of truth, manual data entry, backup  
**Why**: Team comfort zone, visual editing, easy sharing

| Tab | What It Stores | Sync Direction |
|-----|---------------|----------------|
| **Team member work details** | 87 team members, CSPs, clients, PTO | Sheets → CorePTO (read-only) |
| **Leave Tracker** | 356 leave requests, historical data | Sheets → CorePTO (read-only) |
| **Absenteeism tracker** | 87 absence records in complex grid | Sheets → CorePTO (read-only) |
| **PTO Update** | 115 PTO balances, 62+ monthly columns | Sheets → CorePTO (read-only) |

**Note**: CorePTO **reads** from Google Sheets but **never writes back**. Your sheets stay clean.

---

## 🔄 Data Flow Summary

### **The Complete Journey:**

```
1. DATA ENTRY (Where it starts)
   ↓
   Google Sheets (Manual entry by CSPs)
   - Team roster added
   - Leave requests logged
   - Absences marked
   - PTO balances updated

2. DATA SYNC (How it gets into CorePTO)
   ↓
   Click "Sync All Sheets" button
   ↓
   CorePTO reads 4 tabs in parallel
   ↓
   Validates, enriches, deduplicates

3. DATA STORAGE (Where it lives)
   ↓
   ├─ Simple data → JSON files (leaveRequests.json, etc.)
   ├─ Complex data → Neon PostgreSQL (absenteeism_reports table)
   └─ Documents → Excel exports (server/exports/)

4. DATA RETRIEVAL (How you get it back)
   ↓
   ├─ UI: Review Queue, Analytics, Reports
   ├─ API: GET /api/leave-requests, /api/absenteeism-reports
   └─ Direct: Open JSON files or Excel exports

5. DATA BACKUP (Safety net)
   ↓
   Google Sheets remains your permanent backup
   (Never modified by CorePTO, always your source of truth)
```

---

## 🎯 Quick Decision Guide

### **When CorePTO Needs to Store Something...**

#### **Use JSON Files When:**
- ✅ Simple key-value data (leave requests, team members)
- ✅ Append-only logs (notifications, history)
- ✅ Config settings (sync settings, email settings)
- ✅ Fast read/write needed
- ✅ Google Sheets compatibility important

**Examples**: Leave requests, team roster, PTO balances, notifications

---

#### **Use Neon PostgreSQL When:**
- ✅ Complex SQL queries needed (WHERE, JOIN, GROUP BY)
- ✅ Date range filtering required
- ✅ Concurrent writes from multiple users
- ✅ Aggregations and analytics (SUM, AVG, COUNT)
- ✅ Role-based filtering (CSPs see only their data)

**Examples**: Absenteeism reports (only use case currently)

---

#### **Use Excel Exports When:**
- ✅ External system needs documents (payroll)
- ✅ Human-readable formatted output
- ✅ Permanent downloadable artifacts
- ✅ Audit trail in document form

**Examples**: Payroll leave documents (1 per approved request)

---

#### **Use Google Sheets When:**
- ✅ Manual data entry by CSPs
- ✅ Visual editing needed (grid format)
- ✅ Team collaboration (multiple people editing)
- ✅ Backup and source of truth

**Examples**: All 4 tabs (team roster, leave tracker, absenteeism, PTO)

---

## 📋 Real-World Scenarios

### **Scenario 1: New Leave Request Submitted**

```
1. Employee submits via CorePTO UI
   ↓
2. Stored in: leaveRequests.json
   {
     "id": "REQ-2025-357",
     "teamMember": "Alice Jones",
     "status": "pending-csp-approval",
     "startDate": "2025-12-15",
     ...
   }
   ↓
3. Also logged in: notifications.json
   {
     "type": "new_request",
     "recipient": "CSP Tsungi",
     "message": "New leave request from Alice Jones"
   }
   ↓
4. Available via: GET /api/leave-requests
```

---

### **Scenario 2: Client Approves Leave Request**

```
1. Client clicks "Approve" (or CSP marks offline approval)
   ↓
2. Updated in: leaveRequests.json
   {
     "id": "REQ-2025-357",
     "status": "client-approved", ← Updated
     "clientApprovedAt": "2025-12-10T14:30:00Z",
     "history": [...] ← New entry added
   }
   ↓
3. Excel document auto-generated: server/exports/leave_357_1733850600.xlsx
   - Contains: All request details formatted for payroll
   - Link saved in: request.exportDocument field
   ↓
4. Notification sent to: Payroll team
   - Stored in: notifications.json
   - Alert: "Document ready for download"
```

---

### **Scenario 3: Absenteeism Data Synced**

```
1. CSP clicks "Sync All Sheets"
   ↓
2. CorePTO reads: Google Sheets "Absenteeism tracker" tab
   - 87 rows with complex monthly grid
   ↓
3. Parses grid format:
   - Detects absence dates (marked with "Sick", "PTO", etc.)
   - Calculates consecutive date ranges
   - Counts business days
   ↓
4. Temp stored in: absenteeismRecords.json (cache)
   ↓
5. Permanently stored in: Neon PostgreSQL absenteeism_reports table
   {
     "id": "ABS-2025-088",
     "name_of_absentee": "Bob Wilson",
     "reason_for_absence": "Sick",
     "start_date": "2025-12-08",
     "no_of_days_no_wknd": 2,
     "csp": "Tsungi",
     ...
   }
   ↓
6. Queryable via: GET /api/absenteeism-reports
   - Automatic CSP filtering applied
   - SQL queries available for analytics
```

---

### **Scenario 4: PTO Balance Check**

```
1. Employee opens CorePTO dashboard
   ↓
2. System reads: teamMemberMeta.json
   {
     "teamMemberName": "Alice Jones",
     "annualPTO": 20,
     "currentUsedPTO": 5,
     "currentRemainingPTO": 15
   }
   ↓
3. Also reads: leaveRequests.json (to verify)
   - Filters: requests where teamMember = "Alice Jones"
   - Calculates: Total days used from approved requests
   ↓
4. Displays: Live PTO balance
   - Accrued: 20 days
   - Used: 5 days
   - Remaining: 15 days
   - Visual bar: 75% remaining
```

---

## 💾 Storage Locations (File Paths)

### **On Your Server:**

```
C:\Users\leslie.chasinda\Downloads\automation-sync-efficiency\
│
├─ server/
│  ├─ leaveRequests.json          ← 356 leave requests
│  ├─ teamMemberMeta.json         ← 87 team members + PTO
│  ├─ teamMembers.json            ← Client names
│  ├─ approvalHistory.json        ← Approval audit trail
│  ├─ notifications.json          ← Communication log
│  ├─ absenteeismRecords.json     ← Absence cache
│  ├─ clientData.json             ← Client info
│  ├─ users.json                  ← System users
│  ├─ syncSettings.json           ← Google Sheets config
│  ├─ emailSettings.json          ← Email config
│  ├─ integrationSettings.json    ← API configs
│  │
│  └─ exports/                    ← Auto-generated Excel files
│     ├─ leave_1_1733162460.xlsx
│     ├─ leave_2_1733163500.xlsx
│     └─ ... (356 total)
```

### **In the Cloud:**

```
Neon PostgreSQL (eu-central-1.aws.neon.tech)
└─ Database: neondb
   └─ Table: absenteeism_reports (87+ records)
```

### **In Google Drive:**

```
Your Google Sheet: "Team Member Work Details & Leave Tracker"
├─ Tab 1: Team member work details (87 rows)
├─ Tab 2: Leave Tracker (356 rows)
├─ Tab 3: Absenteesim tracker (87 rows, complex grid)
└─ Tab 4: PTO Update (115 rows, 62+ columns)
```

---

## 🎯 The Bottom Line

### **What Stores What:**

| Data Type | Storage Location | Why? |
|-----------|------------------|------|
| **Leave Requests** | JSON (`leaveRequests.json`) | Simple, fast, Google Sheets compatible |
| **Team Roster** | JSON (`teamMemberMeta.json`) | Simple key-value, frequently read |
| **PTO Balances** | JSON (`teamMemberMeta.json`) | Part of team member data |
| **Absenteeism Reports** | Neon PostgreSQL | Complex queries, date filtering, analytics |
| **Notifications** | JSON (`notifications.json`) | Append-only log, fast reads |
| **Approval History** | JSON (`approvalHistory.json`) | Audit trail, chronological |
| **Payroll Documents** | Excel (`server/exports/*.xlsx`) | External system format requirement |
| **Source Data** | Google Sheets | Manual entry, backup, source of truth |

### **Where It Lives:**

- **JSON Files**: `server/` directory (356 leave requests, 87 team members, etc.)
- **Neon Database**: Cloud (87+ absenteeism reports)
- **Excel Exports**: `server/exports/` (356 payroll documents)
- **Google Sheets**: Your Google Drive (all source data, 4 tabs)

### **How You Access It:**

- **UI**: Review Queue, Analytics, Team Members, Reports
- **API**: GET/POST/PUT/DELETE endpoints
- **Direct**: Open JSON files or Excel exports
- **SQL**: Query Neon database directly

---

## 🚀 Key Takeaways

1. **JSON = 95% of data** (fast, simple, good enough for most use cases)
2. **Neon = 5% of data** (only absenteeism, because it needs SQL power)
3. **Excel = Output only** (auto-generated from JSON/Neon data)
4. **Google Sheets = Input only** (CorePTO reads, never writes back)

**The Philosophy**:
- **Store simple data simply** (JSON)
- **Store complex data structurally** (PostgreSQL)
- **Keep source data safe** (Google Sheets never modified)
- **Generate documents on demand** (Excel exports)

---

**CorePTO Storage Architecture:**  
*Simple where possible. Structured where necessary. Always accessible.*

🎯 **One system. Multiple storage layers. Zero confusion.**
