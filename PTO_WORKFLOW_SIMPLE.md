# 🎯 CorePTO Workflow Guide
## *The 5-Step PTO Process - Simplified*

---

## 📋 Overview

CorePTO automates your existing 5-step PTO workflow. Your team already knows the process—we just make it faster and error-free.

---

## The Complete PTO Journey

```
Team Member → CSP → Client → Payroll → Records Updated
    📝           ✅       ✅        📄           📊
```

**Time:** 40 hours/month → 2 hours/month (manual vs automated)

---

## Step 1️⃣: Receive Request

### **What Happens:**
The team member submits a PTO request via email using the official leave form.

### **Traditional Method:**
- Download blank form
- Fill manually
- Attach to email
- Send to CSP
- Hope it doesn't get lost

### **CorePTO Method:**
✅ Open CorePTO dashboard  
✅ Click "Submit Leave Request"  
✅ Fill digital form (2 minutes)  
✅ See real-time PTO balance before submitting  
✅ Submit with one click  
✅ Get instant confirmation with request ID  

### **What Gets Captured:**
- Team member name and ID
- Leave type (Annual, Sick, Unpaid, etc.)
- Start date and end date
- Number of days
- Reason for leave
- Emergency contact (if required)

### **Automatic Actions:**
- ✅ Request saved to `leaveRequests.json`
- ✅ Notification sent to CSP
- ✅ Confirmation email to team member
- ✅ Request ID assigned (e.g., REQ-2025-357)

---

## Step 2️⃣: Review Request

### **What Happens:**
The CSP reviews the request and checks all required parameters:
- ✅ Maximum allowable days
- ✅ Team member's available PTO balance
- ✅ Leave type validation
- ✅ Date conflicts

### **Traditional Method:**
- Open email
- Download attached form
- Manually check spreadsheet for PTO balance
- Calculate remaining days after approval
- Check calendar for team coverage
- Reply via email with decision

### **CorePTO Method:**
✅ Receive instant notification  
✅ Open Review Queue  
✅ See request with **all data pre-loaded**:
   - Current PTO balance: 15 days remaining
   - Requested days: 5 days
   - Balance after approval: 10 days
   - Team coverage status
✅ Click "Approve" or "Request Changes"  
✅ Done in 30 seconds  

### **Automatic Validations:**
- 🔴 **Insufficient PTO** - System flags if balance too low
- 🔴 **Exceeds maximum days** - Warns if request > allowed limit
- 🟡 **Team coverage issue** - Alerts if multiple team members out
- 🟢 **All clear** - Green light to approve

### **Automatic Actions:**
- ✅ Status updated: `pending-csp-approval` → `pending-client-approval`
- ✅ Approval timestamp logged
- ✅ Notification sent to client
- ✅ History entry created

---

## Step 3️⃣: Submit for Client Approval

### **What Happens:**
Once verified, the request is forwarded to the client for approval.

### **Traditional Method:**
- Forward CSP's email to client
- Client digs through email thread
- Client replies (eventually)
- CSP forwards client's reply to team member
- Everyone confused about status

### **CorePTO Method:**
✅ **Automatic after CSP approval**  
✅ Client receives email: "New leave request awaiting approval"  
✅ Client clicks link → Opens dashboard  
✅ Sees full context:
   - Team member details
   - Leave dates and reason
   - CSP approval confirmation
   - Impact on team coverage
✅ Client clicks "Approve" or "Decline"  
✅ Done in 1 minute  

### **Client Dashboard View:**
```
┌─────────────────────────────────────────────────┐
│ Leave Request #REQ-2025-357                     │
├─────────────────────────────────────────────────┤
│ Employee: Alice Jones                           │
│ Leave Type: Annual Leave                        │
│ Dates: Dec 20-24, 2025 (5 business days)       │
│ Reason: Family holiday                          │
│ CSP Approved: ✅ Dec 8, 2025 by Tsungi          │
│ PTO Balance: 15 → 10 days after approval       │
├─────────────────────────────────────────────────┤
│ [✅ Approve]  [❌ Decline]  [💬 Request Info]   │
└─────────────────────────────────────────────────┘
```

### **Automatic Actions:**
- ✅ Status updated: `pending-client-approval` → `client-approved`
- ✅ Approval timestamp logged
- ✅ Notification sent to Payroll
- ✅ Payroll document auto-generated
- ✅ Team member notified of approval

---

## Step 4️⃣: Notify Payroll

### **What Happens:**
After approval is received, the CSP sends the approved leave form to Payroll for record-keeping.

### **Traditional Method:**
- CSP manually fills Excel template
- Adds employee name, dates, days
- Attaches to email
- Sends to Payroll
- Payroll files manually
- Takes 15-20 minutes per request

### **CorePTO Method:**
✅ **Automatic after client approval**  
✅ System generates formatted Excel document:
   - File: `leave_357_1733850600.xlsx`
   - Contains: Employee info, leave details, approval timestamps
   - Formatted exactly as Payroll needs
✅ Email sent to Payroll: "Approved leave document ready"  
✅ Payroll clicks download link  
✅ Done in 10 seconds  

### **Generated Document Includes:**
```excel
┌──────────────────────────────────────────┐
│ APPROVED LEAVE REQUEST                   │
├──────────────────────────────────────────┤
│ Request ID: REQ-2025-357                 │
│ Employee: Alice Jones                    │
│ Employee ID: EMP-1234                    │
│ Department: Finance                      │
│ CSP: Tsungi                              │
│ Client: Acme Corp                        │
│                                          │
│ Leave Type: Annual Leave                 │
│ Start Date: December 20, 2025           │
│ End Date: December 24, 2025             │
│ Business Days: 5                         │
│                                          │
│ CSP Approved: Dec 8, 2025 14:30 UTC    │
│ Client Approved: Dec 8, 2025 16:45 UTC │
│                                          │
│ PTO Balance Before: 15 days             │
│ PTO Balance After: 10 days              │
└──────────────────────────────────────────┘
```

### **Automatic Actions:**
- ✅ Excel file saved to `server/exports/` directory
- ✅ Download link added to request record
- ✅ Payroll notification sent
- ✅ File available for download anytime

---

## Step 5️⃣: Update Records

### **What Happens:**
- Log the PTO in the main **Absenteeism tracker**
- Update the team member's individual **Absenteeism record** for internal tracking

### **Traditional Method:**
- CSP opens Google Sheet "Absenteeism tracker"
- Manually finds employee row
- Adds dates under correct month columns
- Opens Google Sheet "PTO Update"
- Manually updates PTO balance (Used/Remaining)
- Prone to typos and missed updates
- Takes 10 minutes per request

### **CorePTO Method:**
✅ **Automatic after client approval**  
✅ Click "Sync to Google Sheets" (or auto-sync enabled)  
✅ System updates **both trackers** simultaneously:

**1. Absenteeism Tracker** (Monthly Grid Format)
```
Employee Name | Jan | Feb | ... | Dec
Alice Jones   |     |     |     | 20-24 (PTO)
```

**2. PTO Balance Tracker**
```
Employee | Annual PTO | Used | Remaining
Alice    | 20         | 10   | 10
```

✅ Done in 2 seconds  

### **What Gets Updated:**

#### **Google Sheets Sync:**
- ✅ Absenteeism tracker: Dates marked in monthly grid
- ✅ PTO balance: Used/Remaining columns updated
- ✅ Leave tracker: New row added with full approval history

#### **Internal Records:**
- ✅ `teamMemberMeta.json`: PTO balance decremented
- ✅ `absenteeismRecords.json`: New absence logged
- ✅ `leaveRequests.json`: Status marked as `completed`
- ✅ `approvalHistory.json`: Full audit trail saved

#### **Neon Database (if enabled):**
- ✅ `absenteeism_reports` table: New record inserted
- ✅ Queryable for analytics and compliance reports

### **Automatic Actions:**
- ✅ All trackers synchronized
- ✅ PTO balance updated across system
- ✅ Complete audit trail maintained
- ✅ Request marked as completed

---

## 📊 The Complete Timeline

### **Traditional Manual Process:**
```
Day 1, 9am:  Team member emails request
Day 1, 3pm:  CSP finally checks email (6 hours)
Day 2, 10am: CSP manually checks spreadsheet
Day 2, 11am: CSP forwards to client (26 hours)
Day 3, 4pm:  Client approves (55 hours)
Day 4, 9am:  CSP creates payroll doc (64 hours)
Day 4, 10am: CSP updates spreadsheets (65 hours)
Day 5, 9am:  Payroll processes (120 hours / 5 days)

Manual work: 2 hours (CSP time)
Waiting time: 118 hours
Errors: High risk (typos, missed updates)
```

### **CorePTO Automated Process:**
```
Day 1, 9:00am:  Team member submits (2 minutes)
Day 1, 9:05am:  CSP reviews & approves (5 minutes)
Day 1, 9:10am:  Client notified automatically
Day 1, 10:15am: Client approves (1 minute)
Day 1, 10:15am: Payroll doc auto-generated (instant)
Day 1, 10:15am: Records auto-synced (instant)
Day 1, 10:20am: Complete (1 hour 20 minutes total)

Manual work: 8 minutes (CSP + Client time)
Waiting time: 1 hour 12 minutes
Errors: Zero (automated validation)
```

**Time Saved:** 118 hours → 1.2 hours = **99% faster**

---

## 🎯 Key Benefits Per Step

| Step | Manual Time | CorePTO Time | Automation Benefit |
|------|-------------|--------------|-------------------|
| **1. Receive** | 30 min (print, fill, email) | 2 min (digital form) | Instant submission + confirmation |
| **2. Review** | 20 min (check spreadsheets) | 30 sec (pre-validated) | Real-time balance + auto-checks |
| **3. Client** | 1-2 days (email forwarding) | 1 hour (one-click) | Direct notification + dashboard |
| **4. Payroll** | 15 min (manual doc creation) | 10 sec (auto-generated) | Pre-formatted Excel export |
| **5. Records** | 10 min (manual spreadsheet updates) | 2 sec (auto-sync) | Simultaneous tracker updates |
| **TOTAL** | **~2 hours + 2 days waiting** | **~10 minutes + 1 hour waiting** | **95% time reduction** |

---

## 🔄 The CorePTO Advantage

### **For Team Members:**
- ✅ Submit in 2 minutes (vs 30 minutes)
- ✅ See real-time PTO balance
- ✅ Get instant confirmation
- ✅ Track request status live
- ✅ No more "Did you get my email?"

### **For CSPs:**
- ✅ Review in 30 seconds (vs 20 minutes)
- ✅ Automated balance validation
- ✅ One-click approvals
- ✅ No manual spreadsheet updates
- ✅ Complete audit trail

### **For Clients:**
- ✅ Approve in 1 minute (vs email hunting)
- ✅ Full context in one view
- ✅ Dashboard or email options
- ✅ Clear approval history
- ✅ No lost requests

### **For Payroll:**
- ✅ Download ready documents (vs manual creation)
- ✅ Pre-formatted Excel files
- ✅ All approval timestamps included
- ✅ Zero data entry errors
- ✅ Instant access to 356 historical documents

---

## 📈 By The Numbers

**Before CorePTO:**
- ⏱️ 40+ hours/month managing PTO
- 📧 100+ emails per month
- ❌ 15% error rate in manual updates
- 📅 5-day average approval time
- 😤 Constant "Where's my request?" questions

**After CorePTO:**
- ⏱️ 2 hours/month (95% reduction)
- 📧 10 emails/month (90% reduction)
- ✅ 0% error rate (automated validation)
- 📅 1-hour average approval time (96% faster)
- 😊 Zero status inquiries (live tracking)

**ROI:**
- 38 hours saved/month × $35/hour = **$1,330/month saved**
- Zero payroll errors = **$500/month saved**
- **Total: $21,960/year in time savings**

---

## 🚀 Getting Started

1. **Setup** (10 minutes)
   - Configure Google Sheets connection
   - Import existing team member data
   - Set up email notifications

2. **Train** (15 minutes per user)
   - Team members: Submit request walkthrough
   - CSPs: Review queue demonstration
   - Clients: Approval dashboard overview

3. **Launch** (Same day)
   - Start accepting digital requests
   - Your existing process continues (faster)
   - Zero disruption to team

---

## 💡 Remember

**CorePTO doesn't change your process.**  
**It just removes the busywork.**

Your 5-step workflow stays exactly the same:
1. Receive → 2. Review → 3. Client Approval → 4. Payroll → 5. Update Records

We just automated the time-consuming parts:
- ⚡ Digital forms instead of email attachments
- ⚡ Real-time validation instead of manual spreadsheet checks
- ⚡ One-click approvals instead of email chains
- ⚡ Auto-generated documents instead of manual Excel creation
- ⚡ Automatic sync instead of manual updates

**Simple. Fast. Error-free.**

---

**CorePTO by ZimWorx** - *At the Core of Your Workforce*
