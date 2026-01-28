/**
 * Sync leave requests from JSON to MongoDB
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB } from './mongodb.js';
import { LeaveRequest, TeamMember } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Centralized file paths
const FILE_PATHS = {
  leaveRequests: path.join(__dirname, 'leaveRequests.json'),
  teamMemberMeta: path.join(__dirname, 'teamMemberMeta.json'),
  users: path.join(__dirname, 'users.json'),
  emailSettings: path.join(__dirname, 'emailSettings.json'),
  integrationSettings: path.join(__dirname, 'integrationSettings.json'),
  approvalHistory: path.join(__dirname, 'approvalHistory.json')
};

async function syncLeaveRequests() {
  await connectMongoDB();
  
  const filePath = FILE_PATHS.leaveRequests;
  if (!fs.existsSync(filePath)) {
    console.log('No leaveRequests.json found');
    process.exit(1);
  }
  
  const requests = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\nFound ${requests.length} leave requests in JSON file`);
  
  let synced = 0;
  let skipped = 0;
  
  for (const req of requests) {
    if (!req.teamMember && !req.teamMemberName) {
      skipped++;
      continue;
    }
    
    try {
      const requestId = req.id || `LR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Look up CSP from team member data
      const teamMemberName = req.teamMemberName || req.teamMember;
      const tmData = await TeamMember.findOne({
        $or: [
          { teamMemberName: teamMemberName },
          { employeeId: teamMemberName }
        ]
      }).lean();
      
      const assignedToEmail = req.assignedToEmail || tmData?.csp || null;
      
      await LeaveRequest.findOneAndUpdate(
        { requestId: requestId },
        {
          requestId: requestId,
          teamMember: req.teamMember || req.teamMemberName,
          teamMemberName: req.teamMemberName || req.teamMember,
          teamMemberEmail: req.teamMemberEmail,
          client: req.client || req.clientName,
          clientName: req.clientName || req.client || tmData?.clientName,
          leaveType: req.leaveType || 'Annual Leave',
          startDate: req.startDate,
          endDate: req.endDate,
          days: req.days || 1,
          reason: req.reason,
          status: req.status || 'pending',
          assignedTo: req.assignedTo,
          assignedToEmail: assignedToEmail,
          cspReviewedBy: req.cspReviewedBy,
          cspNotes: req.cspNotes,
          sickNoteUrl: req.sickNoteUrl,
          submittedDate: req.submittedAt ? new Date(req.submittedAt) : new Date(),
          createdAt: req.submittedAt ? new Date(req.submittedAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      synced++;
    } catch (error) {
      console.error(`Error syncing ${req.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Synced ${synced} leave requests to MongoDB`);
  console.log(`⏭️  Skipped ${skipped} empty requests`);
  
  // Show requests for Anele
  const aneleRequests = await LeaveRequest.find({
    assignedToEmail: 'anele@zimworx.com'
  }).lean();
  console.log(`\n📋 Requests assigned to anele@zimworx.com: ${aneleRequests.length}`);
  
  // Show requests from Anele's team
  const aneleTeam = await TeamMember.find({ csp: 'anele@zimworx.com' }).select('teamMemberName').lean();
  const teamNames = aneleTeam.map(m => m.teamMemberName);
  
  const teamRequests = await LeaveRequest.find({
    $or: [
      { teamMemberName: { $in: teamNames } },
      { teamMember: { $in: teamNames } }
    ]
  }).lean();
  console.log(`📋 Requests from Anele's team members: ${teamRequests.length}`);
  
  if (teamRequests.length > 0) {
    console.log('\nSample requests:');
    for (const r of teamRequests.slice(0, 5)) {
      console.log(`  - ${r.teamMemberName || r.teamMember}: ${r.leaveType} (${r.status})`);
    }
  }
  
  process.exit(0);
}

syncLeaveRequests().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

