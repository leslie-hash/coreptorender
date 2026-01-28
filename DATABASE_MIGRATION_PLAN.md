# Database Migration Plan: JSON → PostgreSQL (Neon)

## Current State
- **Data Storage:** JSON files (`teamMemberMeta.json`, `leaveRequests.json`)
- **Data Source:** Google Sheets (read-only for CSPs)
- **CSP Access:** Read-only filtered by email

## Target State
- **Database:** PostgreSQL (Neon - already configured in `.env`)
- **CSP Access:** Full CRUD operations on their team members
- **Admin Access:** Manage all data + sync from Google Sheets

---

## Phase 1: Database Schema Design

### Tables to Create:

#### 1. **csps** (CSP Master Table)
```sql
CREATE TABLE csps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **team_members** (Team Member Master)
```sql
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  csp_id INTEGER REFERENCES csps(id) ON DELETE CASCADE,
  employee_id VARCHAR(255) UNIQUE NOT NULL,
  team_member_name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  
  -- Work Details
  work_station VARCHAR(100),
  anydesk VARCHAR(100),
  floor VARCHAR(50),
  pms_software VARCHAR(255),
  schedule VARCHAR(255),
  time_zone VARCHAR(50) DEFAULT 'CST',
  home_address TEXT,
  birthday VARCHAR(100),
  
  -- PTO Info
  annual_pto INTEGER DEFAULT 20,
  current_remaining_pto DECIMAL(5,2) DEFAULT 20,
  sick_days INTEGER DEFAULT 10,
  
  -- Metadata
  synced_from_sheet BOOLEAN DEFAULT false,
  sheet_tab_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_members_csp ON team_members(csp_id);
CREATE INDEX idx_team_members_email ON team_members(email);
```

#### 3. **leave_requests** (Already in JSON, migrate to DB)
```sql
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
  csp_id INTEGER REFERENCES csps(id),
  
  -- Request Details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) NOT NULL, -- 'pto', 'sick', 'unpaid'
  total_days INTEGER NOT NULL,
  reason TEXT,
  
  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'pending-csp-review',
  -- pending-csp-review, csp-approved, pending-client-approval,
  -- client-approved, pending-payroll, payroll-complete, rejected
  
  csp_approved_at TIMESTAMP,
  csp_approved_by VARCHAR(255),
  client_approved_at TIMESTAMP,
  client_approved_by VARCHAR(255),
  payroll_processed_at TIMESTAMP,
  payroll_processed_by VARCHAR(255),
  
  rejection_reason TEXT,
  rejected_by VARCHAR(255),
  rejected_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_team_member ON leave_requests(team_member_id);
CREATE INDEX idx_leave_requests_csp ON leave_requests(csp_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
```

#### 4. **email_logs** (Already in JSON)
```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  leave_request_id INTEGER REFERENCES leave_requests(id),
  email_type VARCHAR(100) NOT NULL,
  recipients TEXT[] NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'skipped'
  message_id VARCHAR(255),
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_request ON email_logs(leave_request_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

---

## Phase 2: Data Migration Script

### Migration Steps:

1. **Migrate CSPs** (from `cspSummary.json`):
```javascript
// server/migrations/001_migrate_csps.js
import { pool } from '../db.js';
import fs from 'fs';

export async function migrateCsps() {
  const cspSummary = JSON.parse(fs.readFileSync('cspSummary.json', 'utf8'));
  
  for (const csp of cspSummary) {
    await pool.query(`
      INSERT INTO csps (email, full_name)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET full_name = $2
    `, [csp.cspEmail, csp.cspName]);
  }
  
  console.log(`✅ Migrated ${cspSummary.length} CSPs`);
}
```

2. **Migrate Team Members** (from `teamMemberMeta.json`):
```javascript
// server/migrations/002_migrate_team_members.js
export async function migrateTeamMembers() {
  const teamMembers = JSON.parse(fs.readFileSync('teamMemberMeta.json', 'utf8'));
  
  for (const member of teamMembers) {
    // Get CSP ID
    const cspResult = await pool.query('SELECT id FROM csps WHERE email = $1', [member.csp]);
    const cspId = cspResult.rows[0]?.id;
    
    if (!cspId) {
      console.log(`⚠️  CSP not found for ${member.csp}, skipping member ${member.teamMemberName}`);
      continue;
    }
    
    await pool.query(`
      INSERT INTO team_members (
        csp_id, employee_id, team_member_name, client_name, email, phone_number,
        work_station, anydesk, floor, pms_software, schedule, time_zone,
        home_address, birthday, annual_pto, current_remaining_pto, sick_days,
        synced_from_sheet, sheet_tab_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (employee_id) DO UPDATE SET
        team_member_name = $3, client_name = $4, email = $5,
        updated_at = NOW()
    `, [
      cspId, member.employeeId, member.teamMemberName, member.clientName,
      member.email, member.phoneNumber, member.workStation, member.anydesk,
      member.floor, member.pmsSoftware, member.schedule, member.timeZone,
      member.homeAddress, member.birthday, member.annualPTO,
      member.currentRemainingPTO, member.sickDays, true, member.sourceTab
    ]);
  }
  
  console.log(`✅ Migrated ${teamMembers.length} team members`);
}
```

3. **Migrate Leave Requests** (from `leaveRequests.json`):
```javascript
// server/migrations/003_migrate_leave_requests.js
export async function migrateLeaveRequests() {
  const leaveRequests = JSON.parse(fs.readFileSync('leaveRequests.json', 'utf8'));
  
  for (const request of leaveRequests) {
    // Get team member ID
    const memberResult = await pool.query(
      'SELECT id, csp_id FROM team_members WHERE team_member_name = $1',
      [request.teamMember]
    );
    
    if (!memberResult.rows[0]) continue;
    
    const { id: teamMemberId, csp_id: cspId } = memberResult.rows[0];
    
    await pool.query(`
      INSERT INTO leave_requests (
        team_member_id, csp_id, start_date, end_date, leave_type,
        total_days, reason, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      teamMemberId, cspId, request.startDate, request.endDate,
      request.leaveType, request.totalDays, request.reason,
      request.status, request.createdAt
    ]);
  }
  
  console.log(`✅ Migrated ${leaveRequests.length} leave requests`);
}
```

---

## Phase 3: API Update (Dual Mode)

### Support Both JSON and Database During Transition:

```javascript
// server/teamMemberService.js
import { pool } from './db.js';
import fs from 'fs';

const USE_DATABASE = process.env.USE_DATABASE === 'true'; // Feature flag

export async function getTeamMembersByCsp(cspEmail) {
  if (USE_DATABASE) {
    // Database mode
    const result = await pool.query(`
      SELECT tm.*, c.full_name as csp_name
      FROM team_members tm
      JOIN csps c ON tm.csp_id = c.id
      WHERE c.email = $1
      ORDER BY tm.team_member_name
    `, [cspEmail]);
    return result.rows;
  } else {
    // JSON mode (current)
    const teamMemberMeta = JSON.parse(fs.readFileSync('teamMemberMeta.json', 'utf8'));
    return teamMemberMeta.filter(tm => tm.csp === cspEmail);
  }
}

export async function updateTeamMember(employeeId, updates, cspEmail) {
  if (USE_DATABASE) {
    // Verify CSP owns this team member
    const result = await pool.query(`
      UPDATE team_members tm
      SET 
        team_member_name = COALESCE($1, team_member_name),
        email = COALESCE($2, email),
        phone_number = COALESCE($3, phone_number),
        annual_pto = COALESCE($4, annual_pto),
        updated_at = NOW()
      FROM csps c
      WHERE tm.csp_id = c.id 
        AND c.email = $5 
        AND tm.employee_id = $6
      RETURNING tm.*
    `, [
      updates.teamMemberName, updates.email, updates.phoneNumber,
      updates.annualPTO, cspEmail, employeeId
    ]);
    return result.rows[0];
  } else {
    throw new Error('JSON mode does not support updates');
  }
}
```

---

## Phase 4: CSP Self-Service Features

Once on database, CSPs can:

### 1. **Update Team Member Info**:
```javascript
PUT /api/team-members/:employeeId
Authorization: Bearer <csp_jwt_token>
Body: {
  "teamMemberName": "Updated Name",
  "email": "new.email@example.com",
  "phoneNumber": "+1234567890",
  "annualPTO": 25
}
```

### 2. **Add New Team Members**:
```javascript
POST /api/team-members
Authorization: Bearer <csp_jwt_token>
Body: {
  "employeeId": "EMP12345",
  "teamMemberName": "John Doe",
  "clientName": "Akeso Oral Surgery",
  "email": "john.doe@example.com",
  "annualPTO": 20
}
```

### 3. **Adjust PTO Balances**:
```javascript
PATCH /api/team-members/:employeeId/pto
Body: {
  "currentRemainingPTO": 15.5,
  "reason": "Manual adjustment after review"
}
```

### 4. **View Audit Trail**:
```javascript
GET /api/team-members/:employeeId/history
Response: [
  {
    "changedBy": "brenda.mutevera@zimworx.com",
    "changedAt": "2026-01-15T10:30:00Z",
    "field": "annualPTO",
    "oldValue": 20,
    "newValue": 25,
    "reason": "Promotion"
  }
]
```

---

## Phase 5: Migration Timeline

### Week 1: Preparation
- ✅ Create database schema (tables, indexes)
- ✅ Write migration scripts
- ✅ Test migrations with sample data

### Week 2: Dual Mode
- ✅ Deploy database schema to Neon
- ✅ Run migration scripts
- ✅ Enable dual mode (JSON + DB running in parallel)
- ✅ Verify data consistency

### Week 3: Database Primary
- ✅ Switch `USE_DATABASE=true`
- ✅ CSPs test update functionality
- ✅ Monitor for issues

### Week 4: Deprecate JSON
- ✅ Remove JSON file dependencies
- ✅ Update nightly sync to write directly to database
- ✅ Archive JSON files as backup

---

## Rollback Plan

If migration fails:
1. Set `USE_DATABASE=false` (instant rollback to JSON)
2. Investigate database issues
3. Re-sync from JSON to database
4. Retry when fixed

---

## Benefits After Migration

✅ **CSP Self-Service:** Update team member info without admin intervention  
✅ **Real-Time Updates:** No more waiting for nightly syncs  
✅ **Audit Trail:** Track all changes with timestamps and user attribution  
✅ **Data Integrity:** Foreign key constraints prevent orphaned records  
✅ **Scalability:** PostgreSQL handles 1M+ records efficiently  
✅ **Advanced Queries:** Complex reports, analytics, trends  
✅ **Concurrent Access:** Multiple CSPs updating simultaneously without conflicts  

---

## Next Steps

1. **Create migration script runner:**
   ```bash
   node server/migrations/run.js
   ```

2. **Add database connection health check:**
   ```javascript
   GET /api/health/database
   ```

3. **Create admin dashboard to monitor migration progress**

4. **Document CSP training materials for self-service features**

Ready to start Phase 1?
