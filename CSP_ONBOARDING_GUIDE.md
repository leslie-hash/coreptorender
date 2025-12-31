# Getting Started with CorePTO
## An Onboarding Guide for Client Success Partners

---

## Welcome to CorePTO! 🎯

This guide will help you get started with CorePTO, ZimWorx's automated PTO management system. As a Client Success Partner (CSP), you play a crucial role in the leave approval process.

---

## Table of Contents

1. [What is CorePTO?](#what-is-corepto)
2. [Your Role as a CSP](#your-role-as-a-csp)
3. [Initial Setup](#initial-setup)
4. [Logging In](#logging-in)
5. [Dashboard Overview](#dashboard-overview)
6. [Reviewing Leave Requests](#reviewing-leave-requests)
7. [Managing Your Team](#managing-your-team)
8. [Common Tasks](#common-tasks)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

---

## What is CorePTO?

CorePTO is an automated leave management system that streamlines the entire PTO (Paid Time Off) approval process from submission to payroll.

### **Before CorePTO:**
- ⏰ 40+ hours monthly managing leave requests
- 📧 Email chains for every approval
- 📊 Manual spreadsheet updates
- 🔥 Lost requests and errors
- 😤 Constant balance inquiries

### **After CorePTO:**
- ⚡ 2 hours monthly (95% time savings)
- 🚀 10-minute approval cycles
- ✅ Automatic tracking and updates
- 📍 Complete audit trail
- 💡 Self-service for team members

---

## Your Role as a CSP

As a Client Success Partner, you are the **first line of review** for leave requests from your assigned team members.

### **Your Responsibilities:**

1. **Review Leave Requests**
   - Check PTO balance availability
   - Validate leave type and duration
   - Consider team coverage needs
   - Ensure client commitments are met

2. **Approve or Deny Requests**
   - Approve valid requests (forwarded to client)
   - Deny with clear explanations when necessary
   - Add notes for payroll or clients

3. **Manage Your Team**
   - Keep team member data current
   - Sync your Google Sheet regularly
   - Monitor PTO usage patterns

4. **Support Your Team Members**
   - Answer questions about PTO balances
   - Help with form submissions
   - Provide guidance on leave policies

### **What CorePTO Does for You:**

✅ **Auto-assigns requests** - Your team's requests come directly to you  
✅ **Shows PTO balances** - No manual calculations needed  
✅ **Validates parameters** - Flags issues before approval  
✅ **Tracks everything** - Complete history and audit trail  
✅ **Syncs automatically** - Google Sheets stay updated  

---

## Initial Setup

### **Step 1: Verify Your Account**

You should have received:
- **Email:** Your @zimworx.com email address (CSPs)
- **Password:** `password123` (change this on first login!)
- **Role:** CSP

**Note:** Team members use @zimworx.org email addresses, while CSPs and admins use @zimworx.com

If you don't have credentials, contact your administrator.

### **Step 2: Prepare Your Google Sheet**

Each CSP manages their team data through a Google Spreadsheet with 4 tabs:

#### **Required Tabs:**

1. **Team Member Work Details** (Columns A-I)
   - Client Name
   - Team member
   - Role
   - Email Address
   - Anydesk
   - Work Station number
   - Floor
   - Work Start Time
   - Time Zone

2. **Leave Tracker**
   - All leave requests and approvals

3. **Absenteeism Tracker**
   - Attendance and absence records

4. **PTO Update** (Columns A-BJ)
   - Employee names and PTO balances
   - Total days, used days, remaining days

#### **Grant Access to Service Account:**

1. Open your Google Sheet
2. Click **Share** (top right)
3. Add this email: `[service-account-email from google-credentials.json]`
4. Grant **Viewer** permission
5. Click **Send**

#### **Get Your Spreadsheet ID:**

From your Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es/edit
                                          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                          This is your Spreadsheet ID
```

Copy this ID - you'll need it in Step 3.

### **Step 3: Configure CorePTO Sync**

1. Log into CorePTO
2. Navigate to **Admin Panel** → **CSP Sheet Sync**
3. Enter your information:
   - **CSP Email:** Your @zimworx.com email
   - **CSP Name:** Your full name
   - **Spreadsheet ID:** Paste the ID from Step 2
   - **Range:** `Team Member Work Details!A2:I` (default)
4. Click **Sync CSP Sheet**
5. Verify: You should see a success message with your team member count

### **Step 4: Change Your Password**

For security:
1. Go to **Settings** or **Profile**
2. Click **Change Password**
3. Create a strong, unique password
4. Save changes

---

## Logging In

### **Access CorePTO:**

**Development:** http://localhost:8080  
**Production:** [Your AWS staging URL]

### **Login Steps:**

1. Open CorePTO in your browser
2. Enter your credentials:
   - **Email:** your.name@zimworx.com (CSPs use .com)
   - **Password:** Your password
3. Click **Login**

**Note:** Team members log in with @zimworx.org addresses

### **First Login:**

On your first login, you'll see:
- Welcome message
- Dashboard overview
- Pending requests (if any)

---

## Quick Demo: Your First 15 Minutes

Let's walk through a complete example using **Tsungirirai Samhungu** as our CSP.

### **Scenario:**
Tsungirirai manages 30 team members, primarily from Wave Dental. One of his team members, Joseph Hove (Financial Controller), just submitted a leave request for a family vacation.

---

### **Step 1: Log In (1 minute)**

1. Open your browser to: http://localhost:8080
2. Enter credentials:
   ```
   Email: tsungirirai.samhungu@zimworx.com
   Password: password123
   ```
3. Click **Login**

**What you'll see:**
```
✅ Login successful!
Redirecting to dashboard...
```

---

### **Step 2: View Your Dashboard (2 minutes)**

Upon login, Tsungirirai sees:

```
┌─────────────────────────────────────────────┐
│ Welcome back, Tsungirirai! 👋               │
│                                             │
│ 📊 Your Team Overview                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ⏳ Pending Reviews: 3                       │
│ ✅ Approved Today: 2                        │
│ 👥 Total Team Members: 30                   │
│ 📅 Active Leave This Week: 4                │
│                                             │
│ 🔔 Recent Notifications:                    │
│ • New request from Joseph Hove (5 min ago)  │
│ • Request approved by client (2 hrs ago)    │
│ • PTO balance updated for Rudolph Matanga   │
└─────────────────────────────────────────────┘
```

**Action:** Click on the notification "New request from Joseph Hove" or navigate to **CSP Review**

---

### **Step 3: Review Team Member Request (5 minutes)**

Tsungirirai clicks **CSP Review** in the sidebar and sees the pending request:

```
┌──────────────────────────────────────────────────────┐
│ 🆕 NEW REQUEST - Requires Your Review                │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 👤 Team Member: Joseph Hove                         │
│ 🏢 Client: Wave Dental                              │
│ 💼 Role: Financial Controller                       │
│ 📧 Email: joseph.hove@zimworx.org                   │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 📅 LEAVE REQUEST DETAILS                            │
│                                                      │
│ Leave Type: 🏖️ Annual Leave                         │
│ Start Date: January 15, 2026 (Wednesday)            │
│ End Date: January 19, 2026 (Sunday)                 │
│ Duration: 5 business days                           │
│ Return Date: January 20, 2026                       │
│                                                      │
│ 📝 Reason Provided:                                 │
│ "Family vacation to Victoria Falls. Booked 3        │
│  months ago. All work deliverables up to date."     │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 💼 PTO BALANCE CHECK                                │
│                                                      │
│ Total Annual Leave Allocation: 20 days              │
│ Already Used This Year: 8 days                      │
│ Currently Remaining: 12 days                        │
│ This Request: -5 days                               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━                        │
│ Balance After Approval: 7 days ✅ (Sufficient)      │
│                                                      │
│ 📎 Attachments: None required (Annual Leave)        │
│ 🕐 Submitted: Dec 31, 2025 at 2:35 PM              │
│ 🆔 Request ID: #LR-20251231-042                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Tsungirirai's Review Checklist:**

✅ **PTO Balance:** 12 days available, requesting 5 days → ✅ Sufficient  
✅ **Leave Type:** Annual Leave is appropriate for family vacation  
✅ **Notice Period:** Submitted Dec 31 for Jan 15 → 15 days advance notice ✅  
✅ **Team Coverage:** Joseph is Financial Controller, need to verify coverage  
✅ **Client Impact:** Check Wave Dental's January schedule  
✅ **Documentation:** No sick note needed for annual leave  

**Decision:** Tsungirirai decides to APPROVE but wants to add a note about coverage.

---

### **Step 4: Approve the Request (3 minutes)**

1. **Scroll to the bottom** of the request details
2. **Add CSP Notes** in the text box:
   ```
   Approved. Joseph provided 15 days advance notice. 
   Confirmed with Munyaradzi Ngondonga (Payroll) to provide 
   coverage for financial reports. All Q4 deliverables 
   completed. Client (Wave Dental) already informally notified.
   ```

3. **Click the green "Approve" button**

**System Response:**
```
┌──────────────────────────────────────────┐
│ ✅ SUCCESS!                              │
│                                          │
│ Request #LR-20251231-042 Approved        │
│                                          │
│ Next Steps:                              │
│ • Forwarded to Wave Dental for approval  │
│ • Joseph Hove notified via email         │
│ • Your notes saved to request history    │
│                                          │
│ [View Next Request] [Back to Dashboard]  │
└──────────────────────────────────────────┘
```

**What Happens Behind the Scenes:**
- ✉️ Email sent to Joseph: "Your leave request has been approved by your CSP"
- 📧 Email sent to Wave Dental client portal
- 📊 Request moved to "Pending Client Approval" status
- 📝 Tsungirirai's notes attached to the request
- 🔔 Notification logged in system

---

### **Step 5: Check Your Team (2 minutes)**

Curious about his team, Tsungirirai clicks **Team Members** in the sidebar:

```
┌──────────────────────────────────────────────────┐
│ 👥 YOUR TEAM - TSUNGIRIRAI SAMHUNGU             │
│                                                  │
│ Total Members: 30                                │
│ Clients: Wave Dental (19), Excel Dental (2),    │
│          Dental Design (2), Others (7)           │
├──────────────────────────────────────────────────┤
│                                                  │
│ 🏢 WAVE DENTAL TEAM (19 members)                │
│                                                  │
│ 1. Joseph Hove                                   │
│    Financial Controller | 12 days PTO left      │
│    📅 Leave: Jan 15-19 (Pending Client)         │
│                                                  │
│ 2. Munyaradzi Ngondonga                         │
│    Payroll | 18 days PTO left                   │
│    📅 No upcoming leave                          │
│                                                  │
│ 3. Tamanda Mandeya                              │
│    Insurance Verification | 15 days PTO left    │
│    📅 No upcoming leave                          │
│                                                  │
│ 4. Rudolph Matanga                              │
│    RCM-Claims Follow Up | 9 days PTO left       │
│    📅 No upcoming leave                          │
│                                                  │
│ 5. Chido Mawire                                 │
│    Insurance Verification | 20 days PTO left    │
│    📅 No upcoming leave                          │
│                                                  │
│ ... [View All 30 Members]                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Insights Tsungirirai notices:**
- Most team members have healthy PTO balances
- Wave Dental is his largest client (19 members)
- No scheduling conflicts for Joseph's leave dates
- Team coverage looks good

---

### **Step 6: Check Another Request - Denial Example (3 minutes)**

Tsungirirai sees another pending request:

```
┌──────────────────────────────────────────────────────┐
│ 👤 Team Member: Chido Mawire                        │
│ 🏢 Client: Wave Dental                              │
│ 💼 Role: Insurance Verification                     │
│                                                      │
│ 📅 Leave Type: 🤒 Sick Leave                        │
│ Duration: 7 business days                           │
│ Start Date: Jan 2, 2026                             │
│                                                      │
│ 📝 Reason: "Severe flu, need rest"                 │
│                                                      │
│ 💼 PTO Balance: 20 days remaining ✅                │
│                                                      │
│ ⚠️ ISSUE DETECTED:                                  │
│ 📎 Sick Note: MISSING                               │
│                                                      │
│ ⚠️ Policy: Sick leave >3 days requires medical     │
│    certificate/sick note from doctor                │
└──────────────────────────────────────────────────────┘
```

**Tsungirirai's Decision:** Must DENY - sick note required for 7-day sick leave

**Action:**
1. Scroll to denial section
2. **Add Required Notes:**
   ```
   Hi Chido, I cannot approve this request without a sick note. 
   
   Company policy requires a medical certificate for sick leave 
   exceeding 3 days. You're requesting 7 days.
   
   Please:
   1. Visit a doctor and obtain a sick note
   2. Upload it to this request (or email to me)
   3. I'll re-review immediately once received
   
   Feel better soon! Let me know if you need any assistance.
   ```

3. **Click red "Deny" button**

**System Response:**
```
┌──────────────────────────────────────────┐
│ ⚠️ REQUEST DENIED                        │
│                                          │
│ Request #LR-20251231-043 has been denied │
│                                          │
│ Team member notified with your feedback  │
│ They can resubmit once issue resolved    │
│                                          │
│ [Back to Review Queue]                   │
└──────────────────────────────────────────┘
```

**Key Learning:** Always provide clear, helpful explanations when denying. Chido now knows exactly what to do to get her request approved.

---

### **Step 7: Sync Your Google Sheet (2 minutes)**

Tsungirirai wants to ensure his team data is current. He navigates to **Admin Panel** → **CSP Sheet Sync**:

```
┌──────────────────────────────────────────────────┐
│ 📊 CSP SHEET SYNC                                │
├──────────────────────────────────────────────────┤
│                                                  │
│ CSP Email:                                       │
│ [tsungirirai.samhungu@zimworx.com]              │
│                                                  │
│ CSP Name:                                        │
│ [Tsungirirai Samhungu]                          │
│                                                  │
│ Spreadsheet ID:                                  │
│ [1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es]  │
│                                                  │
│ Range:                                           │
│ [Team Member Work Details!A2:I]                  │
│                                                  │
│ Last Sync: 2 days ago                           │
│                                                  │
│ [🔄 Sync CSP Sheet]                             │
└──────────────────────────────────────────────────┘
```

**Action:** Click **Sync CSP Sheet**

**Progress:**
```
🔄 Syncing... Please wait

Connecting to Google Sheets...         ✅
Reading Team Member Work Details...    ✅
Reading Leave Tracker...                ✅
Reading Absenteeism Tracker...          ✅
Reading PTO Update...                   ✅

Updating database...                    ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SYNC COMPLETED SUCCESSFULLY!

Summary:
• 30 team members synced
• 0 new members added
• 12 PTO balances updated
• 45 attendance records synced
• 8 active leave requests tracked

Last Sync: Just now (Dec 31, 2025 at 3:15 PM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[View Team Members] [Back to Dashboard]
```

---

### **Step 8: View Notifications & Wrap Up (1 minute)**

Before logging out, Tsungirirai checks his **Notifications**:

```
┌──────────────────────────────────────────┐
│ 🔔 NOTIFICATIONS (5 new)                 │
├──────────────────────────────────────────┤
│                                          │
│ ✅ Just now                              │
│ Sheet sync completed - 30 members synced │
│                                          │
│ ⚠️ 5 minutes ago                         │
│ Request denied - Chido Mawire notified   │
│                                          │
│ ✅ 15 minutes ago                        │
│ Request approved - Joseph Hove notified  │
│                                          │
│ 🆕 25 minutes ago                        │
│ New request submitted by Joseph Hove     │
│                                          │
│ 📊 2 hours ago                           │
│ PTO balances updated from Google Sheets  │
│                                          │
│ [Mark All as Read] [Clear]              │
└──────────────────────────────────────────┘
```

**Perfect!** Everything is tracked and documented.

---

### **Demo Summary: What Tsungirirai Accomplished in 15 Minutes**

✅ **Logged in** successfully  
✅ **Reviewed 2 leave requests**:
   - ✅ Approved Joseph Hove's vacation (with coverage notes)
   - ❌ Denied Chido Mawire's sick leave (clear guidance provided)
✅ **Checked team roster** (30 members across multiple clients)  
✅ **Synced Google Sheet** (30 members, 12 PTO updates)  
✅ **Maintained clear communication** with team members  
✅ **Documented everything** with notes and audit trail  

---

### **What Happens Next?**

**For Joseph Hove's Approved Request:**
1. ⏳ Client (Wave Dental) receives notification
2. 👍 Client approves (or denies)
3. 📧 Payroll automatically notified if approved
4. 📊 Google Sheets updated automatically
5. 🎉 Joseph enjoys his vacation!

**For Chido Mawire's Denied Request:**
1. 📧 Chido receives email with Tsungirirai's explanation
2. 🏥 Chido visits doctor, gets sick note
3. 📎 Chido uploads sick note and resubmits
4. 🔄 Tsungirirai receives new notification
5. ✅ Reviews and approves (if sick note valid)

---

### **Key Takeaways from the Demo:**

1. **Speed:** 2 requests reviewed in under 10 minutes
2. **Clarity:** Both team members know exactly what's happening
3. **Compliance:** Policies enforced (sick note requirement)
4. **Documentation:** Full audit trail with notes
5. **Automation:** Sheet syncs, notifications, emails all automatic
6. **Efficiency:** 95% less time than manual process

**Traditional Process Would Have Taken:**
- 📧 Multiple email threads (30+ minutes)
- 📊 Manual spreadsheet updates (20 minutes)
- 📁 Finding previous requests (15 minutes)
- 🧮 Calculating PTO balances (10 minutes)
- **Total: 75+ minutes for 2 requests**

**CorePTO Process:**
- ⚡ **Total: 15 minutes for 2 requests + sheet sync**

---

## Dashboard Overview

After logging in, you'll see the **CSP Dashboard** with these sections:

### **1. Quick Stats Card**
```
┌─────────────────────────────────┐
│ Pending Reviews: 5              │
│ Approved Today: 12              │
│ Team Members: 30                │
│ Active Requests: 8              │
└─────────────────────────────────┘
```

### **2. Navigation Sidebar**

- **Dashboard** - Overview and stats
- **CSP Review** - Your pending requests queue ⭐ (Most important!)
- **Team Members** - Your team roster
- **Leave History** - All past requests
- **PTO Balances** - View team balances
- **Admin Panel** - Sync settings (if admin)
- **Notifications** - Alerts and updates
- **Help** - Documentation and guides

### **3. Notifications Panel**

Real-time alerts for:
- ✉️ New leave requests submitted
- ✅ Requests approved by client
- ❌ Requests denied
- 📊 Sync updates
- ⚠️ Urgent items

---

## Reviewing Leave Requests

This is your **primary task** as a CSP. Here's how to do it efficiently:

### **Step 1: Access Your Review Queue**

1. Click **"CSP Review"** in the sidebar
2. You'll see only requests from YOUR team members
3. Requests are sorted by submission date (newest first)

### **Step 2: Review Request Details**

Each request shows:

```
┌──────────────────────────────────────────────────┐
│ 👤 Team Member: John Doe                         │
│ 🏢 Client: Wave Dental                           │
│ 📧 Email: john.doe@zimworx.org                   │
│                                                  │
│ 📅 Leave Type: Annual Leave                      │
│ 📆 Start Date: Jan 5, 2026                       │
│ 📆 End Date: Jan 9, 2026                         │
│ 📊 Duration: 5 business days                     │
│                                                  │
│ 📝 Reason:                                       │
│ "Family vacation - booked months ago"            │
│                                                  │
│ 💼 PTO Balance:                                  │
│ • Total Annual Leave: 20 days                    │
│ • Already Used: 10 days                          │
│ • Remaining: 10 days                             │
│ • After This Request: 5 days                     │
│                                                  │
│ 📎 Sick Note: None                               │
│ 🕐 Submitted: Dec 20, 2025 at 10:30 AM          │
│ 🆔 Request ID: #LR-20251220-001                  │
└──────────────────────────────────────────────────┘
```

### **Step 3: Review Checklist**

Before approving, verify:

✅ **PTO Balance:** Does team member have enough days?
- If remaining days < 0, deny the request

✅ **Leave Type:** Is it appropriate?
- Annual Leave: Pre-planned time off
- Sick Leave: Illness (may require sick note if >3 days)
- Maternity/Paternity: Birth or adoption
- Bereavement: Family loss
- Unpaid Leave: No PTO deduction

✅ **Notice Period:** Was adequate notice given?
- Annual Leave: Minimum 2 weeks preferred
- Sick Leave: Same day is acceptable
- Emergency: Case-by-case basis

✅ **Team Coverage:** Will this affect operations?
- Check team calendar
- Consider client deliverables
- Ensure coverage is available

✅ **Client Impact:** Any conflicts with client needs?
- Peak periods or deadlines
- Critical projects
- Client preferences

✅ **Sick Note:** Required for sick leave >3 days
- Check if attached
- Verify validity

### **Step 4: Take Action**

#### **Option A: Approve ✅**

1. Review is complete and satisfactory
2. Add optional notes:
   ```
   Examples:
   - "Approved. Coverage arranged with Sarah."
   - "Approved. Client notified of dates."
   - "Approved. No impact on deliverables."
   ```
3. Click **"Approve"** button
4. Request moves to **Client Approval** stage
5. Team member receives notification

#### **Option B: Deny ❌**

1. Issue identified that prevents approval
2. **Required:** Add clear explanation:
   ```
   Examples:
   - "Insufficient PTO balance (only 3 days remaining)"
   - "Conflicts with critical client deadline on Jan 7"
   - "Sick note required for 5-day sick leave"
   - "Please resubmit with at least 2 weeks notice"
   ```
3. Click **"Deny"** button
4. Team member receives notification with your explanation
5. They can resubmit if issue is resolved

### **Step 5: Add Notes (Optional but Recommended)**

Notes help:
- Payroll understand special circumstances
- Clients make informed decisions
- Create clear documentation
- Future reference for similar cases

**Good Note Examples:**
- "Team coverage confirmed with backup person"
- "Client already approved verbally"
- "Emergency situation - family illness"
- "Part of planned rotation schedule"

---

## Managing Your Team

### **View Your Team Members**

1. Click **"Team Members"** in sidebar
2. See all assigned team members
3. View details:
   - Name and email
   - Client assignment
   - Role/Department
   - PTO balances
   - Recent leave history

### **Check PTO Balances**

1. Click **"PTO Balances"** or view in team member list
2. See real-time balances for each person:
   - Total annual leave allocation
   - Days used this year
   - Remaining days
   - Pending requests (not yet approved)

### **Update Team Data**

1. Update your Google Sheet:
   - Add new team members
   - Update roles or client assignments
   - Correct email addresses
2. Return to CorePTO
3. Go to **Admin Panel** → **CSP Sheet Sync**
4. Click **"Sync CSP Sheet"**
5. Verify changes appear in system

### **View Leave History**

1. Click **"Leave History"** in sidebar
2. Filter by:
   - Date range
   - Team member
   - Leave type
   - Status (approved/denied/pending)
3. Export to Excel if needed

---

## Common Tasks

### **Task 1: Process a New Leave Request**

**Time Required:** 5 minutes

1. Receive notification: "New leave request from [Name]"
2. Go to **CSP Review**
3. Click on the request
4. Review all details (use checklist above)
5. Approve or deny with notes
6. Done! ✅

### **Task 2: Answer "How many days do I have?"**

**Time Required:** 30 seconds

1. Go to **PTO Balances** or **Team Members**
2. Search for team member name
3. View their balance card
4. Share the information:
   - "You have X days remaining"
   - "You've used Y days so far"

### **Task 3: Handle Urgent/Emergency Leave**

**Time Required:** 2 minutes

1. Team member calls about emergency
2. Ask them to submit request ASAP (even from phone)
3. Go to **CSP Review**
4. Approve immediately if legitimate
5. Add note: "Emergency situation - approved per phone call"
6. Notify client directly if needed

### **Task 4: Sync Your Team Data**

**Time Required:** 2 minutes

**Frequency:** Weekly or after team changes

1. Update your Google Sheet first
2. Go to **Admin Panel** → **CSP Sheet Sync**
3. Click **"Sync CSP Sheet"**
4. Verify success message
5. Check team members list for updates

### **Task 5: Review Month-End Reports**

**Time Required:** 10 minutes

**Frequency:** Monthly

1. Go to **Leave History**
2. Filter: Last 30 days
3. Review approval patterns
4. Check for any issues
5. Export report if needed
6. Share insights with team or management

---

## Tips & Best Practices

### **⚡ Speed Tips**

1. **Batch Review:** Review multiple requests at once instead of one-by-one
2. **Use Filters:** Sort by urgent or date to prioritize
3. **Keyboard Shortcuts:** Learn common shortcuts (if available)
4. **Mobile Access:** Check requests on phone when away from desk

### **✅ Quality Tips**

1. **Always Add Notes:** Even brief notes help create context
2. **Check Calendar:** Look at team calendar before approving
3. **Communicate:** Talk to team member if something is unclear
4. **Be Consistent:** Apply same standards to all team members
5. **Document Exceptions:** Note special circumstances clearly

### **🤝 Team Management Tips**

1. **Regular Syncs:** Update your sheet weekly
2. **Proactive Communication:** Let team know busy periods in advance
3. **Quick Turnaround:** Try to review within 24 hours
4. **Be Available:** Let team know how to reach you for urgent needs
5. **Educate Team:** Help them understand PTO policies

### **⚠️ Common Mistakes to Avoid**

❌ **Don't:**
- Approve without checking PTO balance
- Forget to add notes when denying
- Ignore sick note requirements
- Delay reviews unnecessarily
- Approve conflicting leave dates

✅ **Do:**
- Verify all information before deciding
- Communicate clearly when denying
- Check for team coverage
- Respond promptly
- Keep team calendar updated

---

## Troubleshooting

### **Issue: Can't See My Team Members**

**Causes:**
1. Spreadsheet not synced yet
2. Wrong spreadsheet ID entered
3. Sheet access not granted

**Solutions:**
1. Go to **Admin Panel** → **CSP Sheet Sync**
2. Verify your Spreadsheet ID is correct
3. Ensure service account has access to your sheet
4. Click **"Sync CSP Sheet"** again
5. Contact admin if issue persists

### **Issue: Leave Request Not Appearing**

**Causes:**
1. Team member assigned to wrong CSP
2. System sync delay
3. Request stuck in submission

**Solutions:**
1. Check **All Requests** (if you have access)
2. Ask team member for request ID
3. Refresh the page (F5)
4. Check **Notifications** for confirmation
5. Contact admin with request ID

### **Issue: PTO Balance Shows Incorrect**

**Causes:**
1. Google Sheet out of date
2. Pending requests not counted
3. Manual spreadsheet error

**Solutions:**
1. Check "PTO Update" tab in your Google Sheet
2. Verify calculations are correct
3. Sync your sheet again
4. Check for pending/approved requests not reflected
5. Correct in Google Sheet and re-sync

### **Issue: Can't Approve or Deny**

**Causes:**
1. Request already processed
2. Permission issue
3. System error

**Solutions:**
1. Refresh the page
2. Check request status (may be approved by someone else)
3. Verify your role is "CSP"
4. Try logging out and back in
5. Contact admin if error persists

### **Issue: Login Failed / 401 Error**

**Causes:**
1. Wrong email or password
2. Account not activated
3. Session expired

**Solutions:**
1. Verify email is @zimworx.com (CSPs) or @zimworx.org (Team Members)
2. Try password reset
3. Clear browser cache and cookies
4. Try different browser
5. Contact admin to verify account status

### **Issue: Google Sheet Sync Failing**

**Causes:**
1. Service account doesn't have access
2. Sheet structure changed
3. Invalid range specified

**Solutions:**
1. Re-share sheet with service account
2. Verify tab names match exactly:
   - "Team Member Work Details"
   - "Leave Tracker"
   - "Absenteeism Tracker"
   - "PTO Update"
3. Check range format: `Team Member Work Details!A2:I`
4. Ensure data starts at row 2 (row 1 = headers)
5. Contact admin for assistance

---

## Quick Reference Card

### **Daily Workflow**

```
Morning:
☐ Log into CorePTO
☐ Check notifications
☐ Review pending requests (target: within 24hrs)
☐ Respond to team inquiries

Throughout Day:
☐ Monitor new request notifications
☐ Approve urgent requests immediately
☐ Add clear notes to all decisions

End of Day:
☐ Ensure no pending reviews over 24hrs old
☐ Check for any escalations needed
```

### **Weekly Tasks**

```
☐ Sync Google Sheet if team changes
☐ Review upcoming team leave calendar
☐ Check PTO balance reports
☐ Clear old notifications
```

### **Monthly Tasks**

```
☐ Export leave history report
☐ Review approval patterns
☐ Update team member data
☐ Report any issues to admin
```

---

## Getting Help

### **Support Channels**

1. **In-App Help:**
   - Click **"Help"** in sidebar
   - Browse documentation
   - View video tutorials (if available)

2. **Technical Support:**
   - Email: [support@zimworx.com]
   - Slack: #corepto-support
   - Phone: [Support number]

3. **Admin Contact:**
   - For urgent issues
   - System configuration
   - Account problems

4. **CSP Community:**
   - Share tips with other CSPs
   - Learn best practices
   - Discuss challenges

### **Additional Resources**

- **CSP Guide:** Full detailed guide for CSPs
- **Team Member Guide:** Share with your team
- **Video Tutorials:** [Link to videos]
- **Policy Documents:** Company PTO policies
- **FAQ:** Frequently asked questions

---

## Success Metrics

Track your performance:

- **Approval Speed:** Target <24 hours per request
- **Team Satisfaction:** Happy team = fewer issues
- **Error Rate:** Minimize incorrect approvals
- **Communication Quality:** Clear, helpful notes
- **Sync Frequency:** Keep data current

---

## Welcome to the Team! 🎉

You're now ready to use CorePTO effectively! Remember:

1. ✅ Keep your Google Sheet updated
2. ⚡ Review requests within 24 hours
3. 📝 Always add clear notes
4. 🤝 Support your team members
5. 🔄 Sync regularly

**Questions?** Don't hesitate to reach out to support or fellow CSPs.

**Thank you for being a crucial part of the CorePTO workflow!**

---

*Last Updated: December 31, 2025*  
*Version: 1.0*
