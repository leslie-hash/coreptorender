/**
 * MongoDB Migration Script
 * Migrates data from JSON files to MongoDB
 * 
 * Usage: node migrateToMongoDB.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB, disconnectMongoDB } from './mongodb.js';
import { 
  User, 
  TeamMember, 
  LeaveRequest, 
  CSPSummary, 
  Notification, 
  ApprovalHistory, 
  SyncLog, 
  Client 
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to read JSON file safely
function readJsonFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filename}`);
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return null;
  }
}

// Migrate Users
async function migrateUsers() {
  console.log('\n📦 Migrating Users...');
  const users = readJsonFile('users.json');
  if (!users || users.length === 0) {
    console.log('   No users to migrate');
    return 0;
  }

  let count = 0;
  for (const user of users) {
    try {
      await User.findOneAndUpdate(
        { email: user.email.toLowerCase() },
        {
          email: user.email.toLowerCase(),
          password: user.password,
          name: user.name || user.email.split('@')[0],
          role: user.role || 'team-member',
          cspName: user.cspName,
          cspEmail: user.cspEmail,
          clientName: user.clientName,
          phone: user.phone,
          isActive: true,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} users`);
  return count;
}

// Migrate Team Members
async function migrateTeamMembers() {
  console.log('\n📦 Migrating Team Members...');
  const teamMembers = readJsonFile('teamMemberMeta.json');
  if (!teamMembers || teamMembers.length === 0) {
    console.log('   No team members to migrate');
    return 0;
  }

  let count = 0;
  for (const member of teamMembers) {
    try {
      await TeamMember.findOneAndUpdate(
        { 
          teamMemberName: member.teamMemberName,
          clientName: member.clientName || 'Unknown'
        },
        {
          teamMemberName: member.teamMemberName,
          email: member.email?.toLowerCase(),
          clientName: member.clientName,
          employeeId: member.employeeId,
          csp: member.csp,
          cspName: member.cspName,
          workStation: member.workStation,
          anydesk: member.anydesk,
          floor: member.floor,
          pmsSoftware: member.pmsSoftware,
          schedule: member.schedule,
          timeZone: member.timeZone,
          homeAddress: member.homeAddress,
          phoneNumber: member.phoneNumber,
          birthday: member.birthday,
          annualPTO: member.annualPTO || 20,
          currentRemainingPTO: member.currentRemainingPTO || 20,
          sickDays: member.sickDays || 10,
          source: member.source,
          sourceTab: member.sourceTab,
          syncedAt: member.syncedAt ? new Date(member.syncedAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating team member ${member.teamMemberName}:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} team members`);
  return count;
}

// Migrate Leave Requests
async function migrateLeaveRequests() {
  console.log('\n📦 Migrating Leave Requests...');
  const requests = readJsonFile('leaveRequests.json');
  if (!requests || requests.length === 0) {
    console.log('   No leave requests to migrate');
    return 0;
  }

  // Helper to safely parse dates
  const safeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  let count = 0;
  let skipped = 0;
  for (const req of requests) {
    // Skip empty/invalid requests
    if (!req.teamMember && !req.teamMemberName) {
      skipped++;
      continue;
    }

    try {
      const requestId = req.id || `LR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      await LeaveRequest.findOneAndUpdate(
        { requestId: requestId },
        {
          requestId: requestId,
          teamMember: req.teamMember || req.teamMemberName,
          teamMemberName: req.teamMemberName || req.teamMember,
          teamMemberEmail: req.teamMemberEmail,
          client: req.client || req.clientName,
          clientName: req.clientName || req.client,
          leaveType: req.leaveType || 'Annual Leave',
          startDate: req.startDate,
          endDate: req.endDate,
          days: req.days || 1,
          reason: req.reason,
          status: req.status || 'pending',
          assignedTo: req.assignedTo,
          assignedToEmail: req.assignedToEmail,
          cspReviewedBy: req.cspReviewedBy,
          cspReviewedAt: safeDate(req.cspReviewedAt),
          cspNotes: req.cspNotes,
          clientApprovedBy: req.clientApprovedBy,
          clientApprovedAt: safeDate(req.clientApprovedAt),
          clientApprovalNotes: req.clientApprovalNotes,
          sentToPayrollAt: safeDate(req.sentToPayrollAt),
          sentToPayrollBy: req.sentToPayrollBy,
          payrollPackageUrl: req.payrollPackageUrl,
          sickNoteUrl: req.sickNoteUrl,
          eddDocumentUrl: req.eddDocumentUrl,
          submittedDate: safeDate(req.submittedDate) || safeDate(req.createdAt) || new Date(),
          createdAt: safeDate(req.createdAt) || new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating request ${req.id}:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} leave requests (skipped ${skipped} empty)`);
  return count;
}

// Migrate CSP Summary
async function migrateCSPSummary() {
  console.log('\n📦 Migrating CSP Summary...');
  const summary = readJsonFile('cspSummary.json');
  if (!summary) {
    console.log('   No CSP summary to migrate');
    return 0;
  }

  let count = 0;
  // Handle both array and object formats
  const cspEntries = Array.isArray(summary) ? summary : Object.entries(summary).map(([email, data]) => ({
    email,
    ...data
  }));

  for (const csp of cspEntries) {
    try {
      const email = csp.email || csp.cspEmail;
      if (!email) continue;

      await CSPSummary.findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          email: email.toLowerCase(),
          name: csp.name || csp.cspName,
          teamMemberCount: csp.teamMemberCount || csp.count || 0,
          sourceTab: csp.sourceTab,
          isActive: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating CSP:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} CSP records`);
  return count;
}

// Migrate Notifications
async function migrateNotifications() {
  console.log('\n📦 Migrating Notifications...');
  const notifications = readJsonFile('notifications.json');
  if (!notifications || notifications.length === 0) {
    console.log('   No notifications to migrate');
    return 0;
  }

  let count = 0;
  for (const notif of notifications) {
    try {
      await Notification.create({
        userId: notif.userId,
        userEmail: notif.userEmail,
        type: notif.type || 'info',
        title: notif.title || notif.message,
        message: notif.message,
        teamMemberName: notif.teamMemberName,
        requestId: notif.requestId,
        isRead: notif.isRead || notif.read || false,
        createdAt: notif.createdAt ? new Date(notif.createdAt) : new Date()
      });
      count++;
    } catch (error) {
      // Skip duplicates
      if (error.code !== 11000) {
        console.error(`   ❌ Error migrating notification:`, error.message);
      }
    }
  }
  console.log(`   ✅ Migrated ${count} notifications`);
  return count;
}

// Migrate Approval History
async function migrateApprovalHistory() {
  console.log('\n📦 Migrating Approval History...');
  const history = readJsonFile('approvalHistory.json');
  if (!history || history.length === 0) {
    console.log('   No approval history to migrate');
    return 0;
  }

  let count = 0;
  for (const entry of history) {
    try {
      await ApprovalHistory.create({
        requestId: entry.requestId,
        action: entry.action,
        performedBy: entry.performedBy || entry.user,
        performedByEmail: entry.performedByEmail || entry.userEmail,
        notes: entry.notes,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus || entry.status,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
      });
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating history entry:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} approval history entries`);
  return count;
}

// Migrate Clients
async function migrateClients() {
  console.log('\n📦 Migrating Clients...');
  const clients = readJsonFile('clients.json');
  if (!clients || clients.length === 0) {
    // Try to extract clients from team member meta
    const teamMembers = readJsonFile('teamMemberMeta.json');
    if (teamMembers) {
      const uniqueClients = [...new Set(teamMembers.map(m => m.clientName).filter(Boolean))];
      let count = 0;
      for (const clientName of uniqueClients) {
        try {
          const teamMemberCount = teamMembers.filter(m => m.clientName === clientName).length;
          await Client.findOneAndUpdate(
            { name: clientName },
            {
              name: clientName,
              isActive: true,
              teamMemberCount,
              source: 'extracted_from_team_members',
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
          count++;
        } catch (error) {
          console.error(`   ❌ Error creating client ${clientName}:`, error.message);
        }
      }
      console.log(`   ✅ Created ${count} clients from team member data`);
      return count;
    }
    console.log('   No clients to migrate');
    return 0;
  }

  let count = 0;
  for (const client of clients) {
    try {
      await Client.findOneAndUpdate(
        { name: client.name },
        {
          name: client.name,
          email: client.email,
          contactPerson: client.contactPerson,
          phone: client.phone,
          isActive: client.isActive !== false,
          teamMemberCount: client.teamMemberCount || 0,
          source: 'json_migration',
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      console.error(`   ❌ Error migrating client ${client.name}:`, error.message);
    }
  }
  console.log(`   ✅ Migrated ${count} clients`);
  return count;
}

// Main Migration Function
async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           CorePTO MongoDB Migration');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Run all migrations
    const results = {
      users: await migrateUsers(),
      teamMembers: await migrateTeamMembers(),
      leaveRequests: await migrateLeaveRequests(),
      cspSummary: await migrateCSPSummary(),
      notifications: await migrateNotifications(),
      approvalHistory: await migrateApprovalHistory(),
      clients: await migrateClients()
    };

    // Log migration to SyncLog
    await SyncLog.create({
      type: 'manual',
      status: 'success',
      message: 'JSON to MongoDB migration completed',
      teamMembersCount: results.teamMembers,
      cspsCount: results.cspSummary,
      clientsCount: results.clients,
      createdAt: new Date()
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                  Migration Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Users:           ${results.users}`);
    console.log(`✅ Team Members:    ${results.teamMembers}`);
    console.log(`✅ Leave Requests:  ${results.leaveRequests}`);
    console.log(`✅ CSP Summary:     ${results.cspSummary}`);
    console.log(`✅ Notifications:   ${results.notifications}`);
    console.log(`✅ Approval History: ${results.approvalHistory}`);
    console.log(`✅ Clients:         ${results.clients}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n🎉 Migration completed successfully at ${new Date().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
}

// Run migration
runMigration();
