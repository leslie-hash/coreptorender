import axios from 'axios';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createSession, verifySession } from './session.js';
import { registerUser, validateLogin, resetPassword } from './auth.js';
import { bulkImportTeamMetaFromExcel } from './bulkImportTeamMeta.js';
import { exportApprovedLeaveToExcel } from './exportBelinaLeave.js';
import { getAttendanceRecords, updateAttendanceForLeave } from './attendance.js';
import { getApprovalHistory } from './history.js';
import { fetchCRMData, fetchERPData, fetchEmailData, fetchSpreadsheetData, sendGmailNotification, syncLeaveWithBelinaPayroll, fetchHubSpotContactByEmail, fetchHubSpotContactsByIds, fetchHubSpotCompanies } from './connectors.js';
import { syncHubSpotToTeamMembers, getHubSpotSyncStats } from './hubspotSync.js';
import { syncHubSpotClients, linkTeamMembersToClients, syncClientsToCILL, getClientSyncStats } from './hubspotClientSync.js';
import { normalizeSheetData } from './normalizeSheetData.js';
import { setupOfficialForm, getOfficialFormPath, isOfficialFormAvailable, getFormMetadata, parseLeaveFormUpload, generateFilledLeaveForm } from './officialLeaveForm.js';
import { init as dbInit, getAbsenteeismReports, createAbsenteeismReport, updateAbsenteeismReport, deleteAbsenteeismReport } from './db.js';
import { syncAbsenteeismFromSheets, deduplicateRecords, validateAbsenteeismRecord, getCachedRecords } from './absenteeismSync.js';
import { readAbsenteeismFromGoogleSheets, getCachedAbsenteeismRecords, getAbsenteeismCacheMetadata } from './googleSheetsAbsenteeism.js';
import { aggregate, groupBy, trend, predict, analyzeSentiment } from './analytics.js';
import { validateRow, deduplicate } from './automation.js';
import { syncTeamMembersFromSheets, syncTeamMembersFromWorkDetails, syncCSPSheet, syncAllCSPSheets, syncLeaveRequestsFromSheets, appendLeaveRequestToSheet, validateSheetConnection, syncPTOBalancesFromSheets } from './googleSheetsSync.js';
import syncAllSheets from './comprehensiveSync.js';
import { syncAbsenteeismFromSheets as syncAbsenteeismGrid, getAbsenteeismSummary } from './absenteeismParser.js';
import { syncCILLVerificationSchedule, updateCILLRecord, getCILLRecords } from './cillVerificationSync.js';
import { calculateBusinessDays as calculateBusinessDaysWithHolidays, getUSFederalHolidayNames, countHolidaysInRange } from './holidays.js';
import multer from 'multer';
import './automation.js'; // Start scheduled jobs

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const TOKEN_PATH = './google-tokens.json';

// Configure CORS to allow credentials
app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://corepto-zimworx.web.app',
    'https://corepto-zimworx.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve public directory for static files (official forms)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve uploads directory for sick notes and other uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup official leave form on startup
setupOfficialForm();

// Helper function to safely parse JSON files (removes BOM)
function safeJsonParse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  return JSON.parse(cleanContent);
}

// Middleware to extract user from token
const getUserFromRequest = (req) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return null;
  try {
    return verifySession(token);
  } catch (error) {
    return null;
  }
};

// AI-powered meeting notes endpoint using Mistral 7B
app.post('/api/meeting-notes/ai', async (req, res) => {
  const { transcript, title } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required.' });
  }
  try {
    const mistralRes = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert meeting assistant. Analyze the meeting transcript and provide: 1) A concise summary (2-3 sentences), 2) A list of action items with responsible parties if mentioned. Format action items as bullet points.' 
          },
          { role: 'user', content: transcript }
        ],
        max_tokens: 1000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': 'Bearer QUm19i6wmTwN3xkk8HfngSBMu1IUC63I',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const aiContent = mistralRes.data.choices?.[0]?.message?.content || '';
    const lines = aiContent.split('\n').filter(line => line.trim());
    
    let summary = '';
    let actionItems = [];
    let inActionItems = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('action item') || line.toLowerCase().includes('action:')) {
        inActionItems = true;
        continue;
      }
      
      if (inActionItems) {
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (cleaned) actionItems.push(cleaned);
      } else {
        if (line && !line.toLowerCase().includes('summary:')) {
          summary += line + ' ';
        }
      }
    }

    res.json({ 
      summary: summary.trim() || 'Summary generated from transcript.',
      actionItems: actionItems.length > 0 ? actionItems : ['Review meeting recording', 'Follow up on discussed topics'],
      title: title || 'AI-Generated Meeting Notes'
    });
  } catch (err) {
    console.error('Mistral AI error:', err?.response?.data || err?.message || err);
    res.status(500).json({ error: 'Failed to process transcript with AI.', details: err?.response?.data || err?.message || err });
  }
});

// ============= LEAVE REQUEST ENDPOINTS =============

// Endpoint to update leave request status
app.patch('/api/leave-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found.' });
  }
  
  let leaveRequests = [];
  try {
    leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read leave requests.' });
  }
  
  let updated = false;
  let updatedRequest = null;
  const actor = req.body.actor || 'system';
  const timestamp = new Date().toISOString();
  
  leaveRequests = leaveRequests.map(lr => {
    if (lr.id === id) {
      updated = true;
      const history = lr.history || [];
      history.push({
        action: status,
        actor,
        timestamp
      });
      const newLr = { ...lr, status, history };
      updatedRequest = newLr;
      return newLr;
    }
    return lr;
  });
  
  if (!updated) {
    return res.status(404).json({ error: 'Leave request not found.' });
  }
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
    
    // STEP 4: If approved, notify payroll and update absenteeism tracker
    if (status === 'approved' && updatedRequest) {
      // Send to Payroll
      await sendApprovedLeaveToPayroll(updatedRequest);
      
      // Update Absenteeism Tracker in Google Sheets
      await updateAbsenteeismTracker(updatedRequest);
    }
    
    // Create notification for CSP who submitted the request
    if (updatedRequest) {
      createNotification({
        type: status === 'approved' ? 'approved' : 'rejected',
        title: `PTO Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `The ${updatedRequest.leaveType} request for ${updatedRequest.teamMember} (${updatedRequest.startDate} - ${updatedRequest.endDate}) has been ${status}`,
        recipientRole: 'csp',
        relatedId: id,
        priority: status === 'approved' ? 'medium' : 'high',
        teamMember: updatedRequest.teamMember,
        leaveType: updatedRequest.leaveType
      });
      
      // Send Slack notification
      const integrationSettingsPath = path.join(__dirname, 'integrationSettings.json');
      if (fs.existsSync(integrationSettingsPath)) {
        const intSettings = JSON.parse(fs.readFileSync(integrationSettingsPath, 'utf8'));
        const shouldNotify = (status === 'approved' && intSettings.slack?.notifyOnApproval) ||
                            (status === 'rejected' && intSettings.slack?.notifyOnRejection);
        if (intSettings.slack?.enabled && shouldNotify) {
          const emoji = status === 'approved' ? '✅' : '❌';
          sendSlackNotification(
            `${emoji} *PTO Request ${status === 'approved' ? 'Approved' : 'Rejected'}*\n👤 ${updatedRequest.teamMember}\n📅 ${updatedRequest.startDate} - ${updatedRequest.endDate}\n🏷️ ${updatedRequest.leaveType}`,
            intSettings.slack.webhookUrl
          );
        }
      }
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error('Error updating leave request:', e);
    res.status(500).json({ error: 'Failed to update leave request.' });
  }
});

// Endpoint to get all submitted leave requests with pagination
app.get('/api/leave-requests', (req, res) => {
  const user = getUserFromRequest(req);
  const filePath = path.join(__dirname, 'leaveRequests.json');
  let leaveRequests = [];
  
  if (fs.existsSync(filePath)) {
    try {
      leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read leave requests.' });
    }
  }
  
  // Filter by CSP if user is CSP role
  if (user && user.role === 'csp') {
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (fs.existsSync(metaPath)) {
      const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      
      // Match by email (with domain tolerance) or by name
      const userEmailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : '';
      const userName = user.name ? user.name.toLowerCase() : '';
      const cspName = user.cspName ? user.cspName.toLowerCase() : '';
      
      const allowedNames = metaData
        .filter(m => {
          if (!m.csp) return false;
          const cspEmailPrefix = m.csp.split('@')[0].toLowerCase();
          const cspFullName = m.csp.toLowerCase();
          
          // Match by email prefix (ignore domain) or full name
          return cspEmailPrefix === userEmailPrefix || 
                 cspFullName === userName || 
                 cspFullName === cspName ||
                 m.csp === user.email ||
                 m.csp === user.name;
        })
        .map(m => m.employeeId || m.teamMemberName);
      
      console.log(`CSP Filter - User: ${user.email}, Allowed team members: ${allowedNames.length}`);
      leaveRequests = leaveRequests.filter(lr => allowedNames.includes(lr.teamMemberName) || allowedNames.includes(lr.teamMember));
      console.log(`After CSP filter: ${leaveRequests.length} requests`);
    }
  }
  
  // Filter by Client if user is client role
  if (user && user.role === 'client' && user.clientName) {
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (fs.existsSync(metaPath)) {
      const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      // Find team members assigned to this client
      const allowedNames = metaData
        .filter(m => m.client === user.clientName || m.clientEmail === user.email)
        .map(m => m.teamMemberName);
      leaveRequests = leaveRequests.filter(lr => allowedNames.includes(lr.teamMember) && lr.status === 'pending-client-approval');
    }
  }
  
  // Directors see all leave requests
  
  // Pagination logic
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = leaveRequests.slice(start, end);
  
  res.json({
    data: paginated,
    page,
    limit,
    total: leaveRequests.length
  });
});

// Helper: Calculate PTO balance for team member
function calculatePTOBalance(teamMemberName) {
  const metaPath = path.join(__dirname, 'teamMemberMeta.json');
  const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
  
  // Get team member's annual PTO allowance (default 12 days)
  let annualPTO = 12;
  let clientName = null;
  if (fs.existsSync(metaPath)) {
    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    // Match by employeeId (the actual person name) not teamMemberName (client name)
    const member = metaData.find(m => m.employeeId === teamMemberName || m.teamMemberName === teamMemberName);
    annualPTO = member?.annualPTO || 12;
    clientName = member?.clientName || null;
  }
  
  // Calculate used PTO from approved/pending requests for current year
  let usedPTO = 0;
  if (fs.existsSync(leaveRequestsPath)) {
    const requests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    const currentYear = new Date().getFullYear();
    usedPTO = requests
      .filter(r => r.teamMember === teamMemberName && 
                   (r.status === 'approved' || r.status === 'pending' || r.status === 'csp-review' || r.status === 'pending-client-approval' || r.status === 'client-approved') &&
                   new Date(r.startDate).getFullYear() === currentYear)
      .reduce((sum, r) => sum + (r.days || 0), 0);
  }
  
  return {
    annualPTO,
    usedPTO,
    remainingPTO: annualPTO - usedPTO,
    clientName
  };
}

// Helper: Validate PTO request against company policies
function validatePTORequest(leaveRequest) {
  const errors = [];
  const MAX_CONSECUTIVE_DAYS = 15; // Company policy
  const MIN_NOTICE_DAYS = 3; // Minimum notice period
  
  // Calculate days
  const startDate = new Date(leaveRequest.startDate);
  const endDate = new Date(leaveRequest.endDate);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Check minimum notice
  const today = new Date();
  const noticeDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
  if (noticeDays < MIN_NOTICE_DAYS) {
    errors.push(`Minimum ${MIN_NOTICE_DAYS} days notice required. Request is ${noticeDays} days in advance.`);
  }
  
  // Check maximum consecutive days
  if (days > MAX_CONSECUTIVE_DAYS) {
    errors.push(`Maximum ${MAX_CONSECUTIVE_DAYS} consecutive days allowed. Request is ${days} days.`);
  }
  
  // Check PTO balance
  const balance = calculatePTOBalance(leaveRequest.teamMember);
  if (days > balance.remainingPTO) {
    errors.push(`Insufficient PTO balance. Requested: ${days} days, Available: ${balance.remainingPTO} days.`);
  }
  
  // Check dates are valid
  if (startDate > endDate) {
    errors.push('Start date must be before end date.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    days,
    balance
  };
}

// Endpoint to check PTO balance
app.get('/api/pto-balance/:teamMemberName', (req, res) => {
  try {
    const { teamMemberName } = req.params;
    const balance = calculatePTOBalance(decodeURIComponent(teamMemberName));
    res.json(balance);
  } catch (error) {
    console.error('Error calculating PTO balance:', error);
    res.status(500).json({ error: 'Failed to calculate PTO balance' });
  }
});

// Endpoint to submit leave request (STEP 1: CSP submits)
app.post('/api/submit-leave-request', (req, res) => {
  const leaveRequest = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  let leaveRequests = [];
  
  if (fs.existsSync(filePath)) {
    try {
      leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      leaveRequests = [];
    }
  }
  
  // Auto-assign to CSP and get client information based on team member
  let assignedCSP = null;
  let assignedCSPEmail = null;
  let clientName = null;
  let teamMemberRole = null;
  
  try {
    const teamMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (fs.existsSync(teamMetaPath)) {
      const teamMeta = JSON.parse(fs.readFileSync(teamMetaPath, 'utf8'));
      
      // Search by employeeId (which contains the actual team member name in your structure)
      const teamMemberData = teamMeta.find(tm => 
        tm.employeeId === leaveRequest.teamMember || 
        tm.teamMemberName === leaveRequest.teamMember ||
        (tm.email && tm.email.toLowerCase().includes(leaveRequest.teamMember.toLowerCase()))
      );
      
      if (teamMemberData) {
        // Extract CSP information
        if (teamMemberData.csp) {
          // Check if csp field contains email or name
          if (teamMemberData.csp.includes('@')) {
            assignedCSPEmail = teamMemberData.csp;
            assignedCSP = teamMemberData.csp.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } else {
            // CSP field contains name, try to find email
            assignedCSP = teamMemberData.csp;
            // Construct likely email format
            const cspEmailGuess = teamMemberData.csp.toLowerCase().replace(/\s+/g, '.') + '@zimworx.org';
            assignedCSPEmail = cspEmailGuess;
          }
        }
        
        // Extract client information (teamMemberName contains client in your structure)
        clientName = teamMemberData.teamMemberName || 'Unassigned Client';
        teamMemberRole = teamMemberData.department || 'Unassigned';
        
        console.log(`✓ Team Member: ${leaveRequest.teamMember}`);
        console.log(`✓ Client: ${clientName}`);
        console.log(`✓ CSP: ${assignedCSP} (${assignedCSPEmail})`);
        console.log(`✓ Role: ${teamMemberRole}`);
      } else {
        console.log(`⚠ Team member not found in metadata: ${leaveRequest.teamMember}`);
      }
    }
  } catch (error) {
    console.log('Could not auto-assign CSP:', error.message);
  }
  
  // STEP 2: Validate PTO request
  const validation = validatePTORequest(leaveRequest);
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'PTO request validation failed', 
      validationErrors: validation.errors,
      balance: validation.balance
    });
  }
  
  const newRequest = {
    ...leaveRequest,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: 'csp-review', // Start with CSP review
    assignedTo: assignedCSP,
    assignedToEmail: assignedCSPEmail,
    clientName: clientName, // Track which client this team member belongs to
    teamMemberRole: teamMemberRole, // Track team member's role
    days: validation.days,
    ptoBalance: validation.balance,
    sickNoteUrl: leaveRequest.sickNoteUrl || null, // Store sick note file path
    history: [{
      action: 'submitted',
      actor: leaveRequest.submittedBy || leaveRequest.teamMember,
      timestamp: new Date().toISOString(),
      note: leaveRequest.sickNoteUrl ? 'Submitted via LeavePoint with sick note' : 'Submitted via LeavePoint'
    }],
    validationPassed: true
  };
  
  // Add auto-assignment to history if CSP was found
  if (assignedCSP) {
    newRequest.history.push({
      action: 'auto-assigned',
      actor: 'System',
      timestamp: new Date().toISOString(),
      note: `Automatically assigned to ${assignedCSP}`
    });
  }
  
  leaveRequests.push(newRequest);
  
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  // Create notification for assigned CSP
  createNotification({
    type: 'new_request',
    title: assignedCSP ? `PTO Request Assigned to You` : 'PTO Request Ready for Review',
    message: `${leaveRequest.teamMember} submitted ${validation.days} days of ${leaveRequest.leaveType} (${leaveRequest.startDate} to ${leaveRequest.endDate}). Balance: ${validation.balance.remainingPTO}/${validation.balance.annualPTO} days remaining.`,
    recipientRole: 'csp',
    recipient: assignedCSP,
    recipientEmail: assignedCSPEmail,
    relatedId: newRequest.id,
    priority: 'high',
    teamMember: leaveRequest.teamMember,
    leaveType: leaveRequest.leaveType
  });
  
  res.status(201).json({ 
    success: true, 
    message: assignedCSP 
      ? `Leave request submitted and assigned to ${assignedCSP}` 
      : 'Leave request submitted and ready for CSP review.',
    requestId: newRequest.id,
    assignedTo: assignedCSP,
    assignedToEmail: assignedCSPEmail,
    validation: validation
  });
});

// STEP 3: CSP Review & Forward to Client
app.post('/api/leave-requests/:id/csp-review', (req, res) => {
  const { id } = req.params;
  const { approved, notes, cspName } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  console.log(`CSP Review endpoint called - ID: ${id}, Approved: ${approved}, CSP: ${cspName}`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    console.log(`Request not found: ${id}`);
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  console.log(`Current request status: ${request.status}`);
  
  if (request.status !== 'csp-review') {
    console.log(`Invalid status for CSP review: ${request.status}`);
    return res.status(400).json({ error: 'Request is not in CSP review status' });
  }
  
  if (approved) {
    // CSP approved - forward to client/manager
    request.status = 'pending-client-approval'; // Pending client approval
    request.cspApprovedAt = new Date().toISOString();
    request.cspApprovedBy = cspName;
    request.cspNotes = notes;
    request.history.push({
      action: 'csp-approved',
      actor: cspName || 'CSP',
      timestamp: new Date().toISOString(),
      note: notes || 'CSP verified and forwarded to client for approval'
    });
    
    // Notify client/manager for approval
    createNotification({
      type: 'client_approval_needed',
      title: 'Client Approval Required',
      message: `${request.teamMember} - ${request.leaveType}: ${request.days} days (${request.startDate} to ${request.endDate}). CSP ${cspName} verified. Please approve or deny.`,
      recipientRole: 'manager',
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
    // Notify CSP that request was sent to client
    createNotification({
      type: 'forwarded_to_client',
      title: 'Request Forwarded to Client',
      message: `${request.teamMember}'s leave request has been sent to the client for approval.`,
      recipientRole: 'csp',
      recipient: cspName,
      recipientEmail: request.assignedToEmail,
      relatedId: id,
      priority: 'normal',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
    // Send Slack notification
    const integrationSettingsPath = path.join(__dirname, 'integrationSettings.json');
    if (fs.existsSync(integrationSettingsPath)) {
      const intSettings = JSON.parse(fs.readFileSync(integrationSettingsPath, 'utf8'));
      if (intSettings.slack?.enabled && intSettings.slack?.notifyOnSubmit) {
        sendSlackNotification(
          `📝 *New PTO Request - Client Approval Needed*\n👤 ${request.teamMember}\n📅 ${request.startDate} - ${request.endDate} (${request.days} days)\n🏷️ Type: ${request.leaveType}\n✅ CSP Verified by ${cspName}`,
          intSettings.slack.webhookUrl
        );
      }
    }
  } else {
    // CSP rejected
    console.log(`CSP rejecting request ${id} with reason: ${notes}`);
    request.status = 'csp-rejected';
    request.cspRejectedAt = new Date().toISOString();
    request.cspRejectedBy = cspName;
    request.cspNotes = notes;
    request.history.push({
      action: 'csp-rejected',
      actor: cspName || 'CSP',
      timestamp: new Date().toISOString(),
      note: notes || 'CSP rejected - policy violation'
    });
    
    console.log(`Creating notification for team member: ${request.teamMember}`);
    // Notify team member of rejection
    createNotification({
      type: 'request_denied',
      title: 'Leave Request Rejected',
      message: `Your ${request.leaveType} request for ${request.days} days was rejected by CSP. Reason: ${notes}`,
      recipientRole: 'user',
      recipient: request.teamMember,
      recipientEmail: request.submittedBy,
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    console.log(`Request ${id} rejection complete`);
  }
  
  leaveRequests[requestIndex] = request;
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  console.log(`Sending success response for request ${id}`);
  res.json({ success: true, request });
});

// STEP 4a: CSP Marks Client Approval (Offline - Email/Call/Meeting)
app.post('/api/leave-requests/:id/mark-client-approved', (req, res) => {
  const { id } = req.params;
  const { approvalMethod, notes, clientName, cspName } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  if (request.status !== 'pending-client-approval') {
    return res.status(400).json({ error: 'Request is not pending client approval' });
  }

  // CSP confirms client approved offline
  request.status = 'client-approved';
  request.clientApprovedAt = new Date().toISOString();
  request.clientApprovedBy = clientName || 'Client';
  request.clientApprovalMethod = approvalMethod || 'offline'; // email, call, meeting, system
  request.clientNotes = notes;
  request.history.push({
    action: 'client-approved-offline',
    actor: cspName || 'CSP',
    timestamp: new Date().toISOString(),
    note: `Client approved via ${approvalMethod || 'offline method'}. ${notes || ''}`
  });

  // Notify CSP confirmation
  createNotification({
    type: 'client_approved',
    title: 'Client Approval Recorded',
    message: `${request.teamMember}'s leave request marked as client approved. Ready to send to payroll.`,
    recipientRole: 'csp',
    recipient: cspName,
    recipientEmail: request.assignedToEmail,
    relatedId: id,
    priority: 'normal',
    teamMember: request.teamMember,
    leaveType: request.leaveType
  });

  // Notify team member
  createNotification({
    type: 'client_approved',
    title: 'Leave Request Approved by Client',
    message: `Your ${request.leaveType} request for ${request.days} days has been approved by the client. Awaiting final payroll processing.`,
    recipientRole: 'user',
    recipient: request.teamMember,
    relatedId: id,
    priority: 'normal',
    teamMember: request.teamMember,
    leaveType: request.leaveType
  });

  leaveRequests[requestIndex] = request;
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  res.json({ success: true, request });
});

// STEP 4b: CSP Marks Client Rejection (Offline - Email/Call/Meeting)
app.post('/api/leave-requests/:id/mark-client-rejected', (req, res) => {
  const { id } = req.params;
  const { approvalMethod, notes, clientName, cspName } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  if (request.status !== 'pending-client-approval') {
    return res.status(400).json({ error: 'Request is not pending client approval' });
  }

  // CSP confirms client rejected offline
  request.status = 'client-rejected';
  request.clientRejectedAt = new Date().toISOString();
  request.clientRejectedBy = clientName || 'Client';
  request.clientApprovalMethod = approvalMethod || 'offline';
  request.clientNotes = notes;
  request.history.push({
    action: 'client-rejected-offline',
    actor: cspName || 'CSP',
    timestamp: new Date().toISOString(),
    note: `Client rejected via ${approvalMethod || 'offline method'}. ${notes || ''}`
  });

  // Notify CSP confirmation
  createNotification({
    type: 'client_rejected',
    title: 'Client Rejection Recorded',
    message: `${request.teamMember}'s leave request was rejected by client. Team member has been notified.`,
    recipientRole: 'csp',
    recipient: cspName,
    recipientEmail: request.assignedToEmail,
    relatedId: id,
    priority: 'normal',
    teamMember: request.teamMember,
    leaveType: request.leaveType
  });

  // Notify team member of rejection
  createNotification({
    type: 'request_denied',
    title: 'Leave Request Rejected',
    message: `Your ${request.leaveType} request for ${request.days} days was rejected by the client. Reason: ${notes}`,
    recipientRole: 'user',
    recipient: request.teamMember,
    recipientEmail: request.submittedBy,
    relatedId: id,
    priority: 'high',
    teamMember: request.teamMember,
    leaveType: request.leaveType
  });

  leaveRequests[requestIndex] = request;
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  res.json({ success: true, request });
});

/* DISABLED: Client system login removed - clients approve offline and CSP marks approval
// STEP 4b: Client Approval (For Clients with System Access) - DISABLED - Clients approve offline
app.post('/api/leave-requests/:id/client-approval', (req, res) => {
  const { id } = req.params;
  const { approved, notes, clientName } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  if (request.status !== 'pending-client-approval') {
    return res.status(400).json({ error: 'Request is not pending client approval' });
  }
  
  if (approved) {
    // Client approved via system
    request.status = 'client-approved';
    request.clientApprovedAt = new Date().toISOString();
    request.clientApprovedBy = clientName;
    request.clientApprovalMethod = 'system'; // Approved directly in system
    request.clientNotes = notes;
    request.history.push({
      action: 'client-approved',
      actor: clientName || 'Client',
      timestamp: new Date().toISOString(),
      note: notes || 'Client approved the leave request via system'
    });
    
    // Notify CSP that client approved - they can now send to payroll
    createNotification({
      type: 'client_approved',
      title: 'Client Approved - Ready for Payroll',
      message: `${request.teamMember}'s leave request approved by client. You can now send to payroll for processing.`,
      recipientRole: 'csp',
      recipient: request.cspApprovedBy,
      recipientEmail: request.assignedToEmail,
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
    // Notify team member
    createNotification({
      type: 'client_approved',
      title: 'Leave Request Approved by Client',
      message: `Your ${request.leaveType} request for ${request.days} days has been approved by the client. Awaiting final payroll processing.`,
      recipientRole: 'user',
      recipient: request.teamMember,
      relatedId: id,
      priority: 'normal',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
  } else {
    // Client denied
    request.status = 'client-denied';
    request.clientDeniedAt = new Date().toISOString();
    request.clientDeniedBy = clientName;
    request.clientNotes = notes;
    request.history.push({
      action: 'client-denied',
      actor: clientName || 'Client',
      timestamp: new Date().toISOString(),
      note: notes || 'Client denied the leave request'
    });
    
    // Notify CSP
    createNotification({
      type: 'client_denied',
      title: 'Client Denied Leave Request',
      message: `${request.teamMember}'s leave request was denied by client. Reason: ${notes}`,
      recipientRole: 'csp',
      recipient: request.cspApprovedBy,
      recipientEmail: request.assignedToEmail,
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
    // Notify team member
    createNotification({
      type: 'request_denied',
      title: 'Leave Request Denied',
      message: `Your ${request.leaveType} request was denied by the client. Reason: ${notes}`,
      recipientRole: 'user',
      recipient: request.teamMember,
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
  }
  
  leaveRequests[requestIndex] = request;
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  res.json({ success: true, request });
});
*/

// STEP 5: CSP Sends to Payroll (after client approval)
app.post('/api/leave-requests/:id/send-to-payroll', async (req, res) => {
  const { id } = req.params;
  const { cspName, notes, generateDocument } = req.body;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  if (request.status !== 'client-approved') {
    return res.status(400).json({ error: 'Request must be client-approved before sending to payroll' });
  }
  
  // Generate export document if requested
  let documentPath = null;
  if (generateDocument !== false) {
    try {
      // Export to Excel for payroll
      const exportPath = path.join(__dirname, 'exports', `leave_${id}_${Date.now()}.xlsx`);
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Leave Request');
      
      // Add headers
      worksheet.columns = [
        { header: 'Employee Name', key: 'employeeName', width: 20 },
        { header: 'Leave Type', key: 'leaveType', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 12 },
        { header: 'End Date', key: 'endDate', width: 12 },
        { header: 'Days', key: 'days', width: 8 },
        { header: 'Reason', key: 'reason', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Client Approved', key: 'clientApproved', width: 15 }
      ];
      
      // Add request data
      worksheet.addRow({
        employeeName: request.employeeName || request.teamMember,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
        reason: request.reason,
        status: 'Client Approved',
        clientApproved: new Date(request.clientApprovedAt).toLocaleDateString()
      });
      
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      await workbook.xlsx.writeFile(exportPath);
      documentPath = `/api/leave-requests/${id}/download-export`;
      request.exportDocument = exportPath;
      
    } catch (exportError) {
      console.error('Document generation error:', exportError);
      // Continue without document if export fails
    }
  }
  
  // Send to payroll
  request.status = 'payroll-processing';
  request.sentToPayrollAt = new Date().toISOString();
  request.sentToPayrollBy = cspName;
  request.history.push({
    action: 'sent-to-payroll',
    actor: cspName || 'CSP',
    timestamp: new Date().toISOString(),
    note: notes || 'Sent to payroll for processing',
    documentGenerated: !!documentPath
  });
  
  leaveRequests[requestIndex] = request;
  fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
  
  // Send to payroll system
  try {
    await sendApprovedLeaveToPayroll(request);
    
    // Notify payroll
    createNotification({
      type: 'payroll_processing',
      title: 'New Leave Request for Processing',
      message: `${request.teamMember} - ${request.leaveType}: ${request.days} days (${request.startDate} to ${request.endDate}). Client approved. ${documentPath ? 'Document available for download.' : ''}`,
      recipientRole: 'payroll',
      relatedId: id,
      priority: 'high',
      teamMember: request.teamMember,
      leaveType: request.leaveType,
      actionUrl: documentPath
    });
    
    // Notify CSP confirmation
    createNotification({
      type: 'sent_to_payroll',
      title: 'Request Sent to Payroll',
      message: `${request.teamMember}'s leave request has been sent to payroll for processing.`,
      recipientRole: 'csp',
      recipient: cspName,
      recipientEmail: request.assignedToEmail,
      relatedId: id,
      priority: 'normal',
      teamMember: request.teamMember,
      leaveType: request.leaveType
    });
    
    res.json({ 
      success: true, 
      request, 
      message: 'Request sent to payroll successfully',
      documentUrl: documentPath
    });
  } catch (error) {
    console.error('Error sending to payroll:', error);
    res.status(500).json({ error: 'Failed to send to payroll' });
  }
});

// Download individual leave request export document
app.get('/api/leave-requests/:id/download-export', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  const leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const request = leaveRequests.find(r => r.id === id);
  
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  if (!request.exportDocument || !fs.existsSync(request.exportDocument)) {
    return res.status(404).json({ error: 'Export document not found. Please generate it first.' });
  }
  
  const fileName = `Leave_Request_${request.employeeName || request.teamMember}_${request.startDate}.xlsx`;
  res.download(request.exportDocument, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });
});

// Export all leave requests to Excel (for All Requests View)
app.post('/api/leave-requests/export', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Requests');

    // Define columns
    worksheet.columns = [
      { header: 'Request ID', key: 'id', width: 15 },
      { header: 'Team Member', key: 'teamMember', width: 20 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'End Date', key: 'endDate', width: 12 },
      { header: 'Days', key: 'days', width: 8 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Submitted Date', key: 'submittedDate', width: 15 },
      { header: 'Submitted By', key: 'submittedBy', width: 20 },
      { header: 'CSP Approved By', key: 'cspApprovedBy', width: 20 },
      { header: 'Client Approved By', key: 'clientApprovedBy', width: 20 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0050AA' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    requests.forEach(request => {
      worksheet.addRow({
        id: request.id,
        teamMember: request.teamMember || request.teamMemberName,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
        status: request.status === 'payroll-processing' ? 'sent-to-payroll' : request.status,
        submittedDate: request.submittedDate,
        submittedBy: request.submittedBy,
        cspApprovedBy: request.cspApprovedBy || '-',
        clientApprovedBy: request.clientApprovedBy || '-',
        reason: request.reason
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.values) {
        const maxLength = Math.max(
          ...column.values.map(v => v ? v.toString().length : 0)
        );
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `leave-requests-${timestamp}.xlsx`;
    const exportPath = path.join(__dirname, 'exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write file
    await workbook.xlsx.writeFile(exportPath);

    // Send file
    res.download(exportPath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
      // Optionally delete file after sending
      // fs.unlinkSync(exportPath);
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Generate and download leave request document without sending to payroll
app.post('/api/leave-requests/:id/generate-export', async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, 'leaveRequests.json');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No leave requests found' });
  }
  
  let leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const requestIndex = leaveRequests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  
  const request = leaveRequests[requestIndex];
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Request');
    
    worksheet.columns = [
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'End Date', key: 'endDate', width: 12 },
      { header: 'Days', key: 'days', width: 8 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    
    worksheet.addRow({
      employeeName: request.employeeName || request.teamMember,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days,
      reason: request.reason,
      status: request.status
    });
    
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const exportPath = path.join(exportsDir, `leave_${id}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(exportPath);
    request.exportDocument = exportPath;
    
    leaveRequests[requestIndex] = request;
    fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Document generated successfully',
      downloadUrl: `/api/leave-requests/${id}/download-export`
    });
    
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// ============= AUTHENTICATION ENDPOINTS =============

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Load tokens from file if available
if (fs.existsSync(TOKEN_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(tokens);
  } catch (e) {
    console.error('Failed to load Google tokens:', e);
  }
}

// Register new user
app.post('/api/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  // Validate allowed roles
  const allowedRoles = ['admin', 'csp', 'finance', 'payroll', 'manager', 'user'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` });
  }
  
  if (role === 'csp' && !email.endsWith('@zimworx.com')) {
    return res.status(400).json({ error: 'CSPs must use @zimworx.com email' });
  }
  
  try {
    const success = registerUser({ name, email, password, role });
    if (!success) {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.json({ success: true, message: `User registered as ${role}` });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, hasPassword: !!password });
  
  if (!email || !password) {
    console.log('Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  try {
    const user = validateLogin(email, password);
    if (!user) {
      console.log('Invalid credentials for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = createSession(user);
    console.log('Login successful for:', email);
    res.json({ success: true, user, token });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Verify session token
app.post('/api/verify-session', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }
  
  try {
    const user = verifySession(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: 'Session verification failed' });
  }
});

// Password reset
app.post('/api/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  try {
    const success = resetPassword(email, newPassword);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Get team member metadata (for CSP filtering)
app.get('/api/team-member-meta', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'teamMemberMeta.json');
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }
    const teamMemberMeta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(teamMemberMeta);
  } catch (error) {
    console.error('Error fetching team member meta:', error);
    res.status(500).json({ error: 'Failed to fetch team member metadata' });
  }
});

// ============= FILE UPLOAD ENDPOINTS =============

const upload = multer({ 
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.txt', '.vtt', '.srt', '.mp3', '.wav', '.m4a', '.mp4', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: ' + allowedExts.join(', ')));
    }
  }
});

// File upload endpoint for meeting notes with transcript file
app.post('/api/meeting-notes/upload', upload.single('file'), async (req, res) => {
  const uploadedFile = req.file;
  const title = req.body.title || 'Meeting Notes';

  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = path.join(__dirname, 'uploads', uploadedFile.filename);
  let transcript = '';

  try {
    // Check if it's a text file (transcript)
    if (uploadedFile.mimetype.includes('text') || 
        uploadedFile.originalname.endsWith('.txt') || 
        uploadedFile.originalname.endsWith('.vtt') ||
        uploadedFile.originalname.endsWith('.srt')) {
      transcript = fs.readFileSync(filePath, 'utf8');
    } 
    // If it's audio/video, we'd need transcription service (placeholder for now)
    else if (uploadedFile.mimetype.includes('audio') || uploadedFile.mimetype.includes('video')) {
      // Clean up the file
      fs.unlinkSync(filePath);
      return res.status(501).json({ 
        error: 'Audio/video transcription not yet implemented. Please upload a transcript file (.txt, .vtt, .srt) or paste the text directly.',
        suggestion: 'Use a transcription service like Otter.ai, Rev.com, or your meeting platform\'s built-in transcription, then upload the text file.'
      });
    }
    
    // Clean up the uploaded file after reading
    fs.unlinkSync(filePath);

    // Process with AI
    const mistralRes = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert meeting assistant. Analyze the meeting transcript and provide: 1) A concise summary (2-3 sentences), 2) A list of action items with responsible parties if mentioned. Format action items as bullet points.' 
          },
          { role: 'user', content: transcript }
        ],
        max_tokens: 1000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': 'Bearer QUm19i6wmTwN3xkk8HfngSBMu1IUC63I',
          'Content-Type': 'application/json'
        }
      }
    );

    const aiContent = mistralRes.data.choices?.[0]?.message?.content || '';
    const lines = aiContent.split('\n').filter(line => line.trim());
    
    let summary = '';
    let actionItems = [];
    let inActionItems = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('action item') || line.toLowerCase().includes('action:')) {
        inActionItems = true;
        continue;
      }
      
      if (inActionItems) {
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (cleaned) actionItems.push(cleaned);
      } else {
        if (line && !line.toLowerCase().includes('summary:')) {
          summary += line + ' ';
        }
      }
    }

    res.json({ 
      summary: summary.trim() || 'Summary generated from transcript.',
      actionItems: actionItems.length > 0 ? actionItems : ['Review meeting recording', 'Follow up on discussed topics'],
      title: title || uploadedFile.originalname
    });

  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Meeting notes processing error:', err?.response?.data || err?.message || err);
    res.status(500).json({ 
      error: 'Failed to process transcript.',
      details: err?.response?.data || err?.message 
    });
  }
});

// Upload sick note for leave requests
app.post('/api/upload-sick-note', upload.single('sickNote'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const teamMemberName = req.body.teamMemberName || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(req.file.originalname);
    const sanitizedName = teamMemberName.replace(/[^a-zA-Z0-9]/g, '_');
    const newFileName = `sick_note_${sanitizedName}_${timestamp}${ext}`;
    const newPath = path.join(__dirname, 'uploads', newFileName);

    // Rename file to organized name
    fs.renameSync(req.file.path, newPath);

    console.log(`✅ Sick note uploaded: ${newFileName} for ${teamMemberName}`);

    res.json({
      success: true,
      fileName: newFileName,
      filePath: `/uploads/${newFileName}`,
      message: 'Sick note uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading sick note:', error);
    res.status(500).json({ error: 'Failed to upload sick note' });
  }
});

// Bulk import team member metadata from Excel
app.post('/api/import-team-meta', upload.single('file'), (req, res) => {
  try {
    const filePath = req.file.path;
    const count = bulkImportTeamMetaFromExcel(filePath);
    res.json({ success: true, imported: count });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import team metadata.' });
  }
});

// Export approved leave data to Excel for Belina Payroll
app.get('/api/export-belina-leave', (req, res) => {
  try {
    const success = exportApprovedLeaveToExcel();
    if (success) {
      res.download('./server/belina_leave_export.xlsx');
    } else {
      res.status(404).json({ error: 'No approved leave data to export.' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export leave data.' });
  }
});

// ============= OFFICIAL LEAVE FORM ENDPOINTS =============

// Download official leave application form template
app.get('/api/leave-form/download', (req, res) => {
  try {
    if (!isOfficialFormAvailable()) {
      return res.status(404).json({ 
        error: 'Official leave form not found',
        message: 'The official leave form template is not available on this server.'
      });
    }

    const formPath = getOfficialFormPath();
    res.download(formPath, 'LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx', (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download form' });
        }
      }
    });
  } catch (error) {
    console.error('Form download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get official form metadata (availability, size, URL)
app.get('/api/leave-form/metadata', (req, res) => {
  try {
    const metadata = getFormMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Form metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload completed official leave form
app.post('/api/leave-form/upload', upload.single('form'), async (req, res) => {
  const uploadedFile = req.file;
  
  if (!uploadedFile) {
    return res.status(400).json({ error: 'No form uploaded' });
  }

  const filePath = path.join(__dirname, 'uploads', uploadedFile.filename);
  
  try {
    // Parse the uploaded form (extract data from DOCX)
    const parsedData = await parseLeaveFormUpload(filePath);
    
    // Store the uploaded form with a meaningful name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savedFileName = `leave-form-${timestamp}-${uploadedFile.originalname}`;
    const savedFilePath = path.join(__dirname, 'uploads', savedFileName);
    
    fs.renameSync(filePath, savedFilePath);
    
    res.json({
      success: true,
      message: 'Official leave form uploaded successfully',
      fileName: savedFileName,
      filePath: savedFilePath,
      parsed: parsedData.parsed,
      parsedData: parsedData.parsed ? parsedData : null,
      note: parsedData.parsed ? 'Data extracted from form' : 'Form stored - manual review required'
    });
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Form upload error:', error);
    res.status(500).json({ error: 'Failed to process uploaded form', details: error.message });
  }
});

// Generate pre-filled official leave form
app.post('/api/leave-form/generate', async (req, res) => {
  try {
    const leaveRequestData = req.body;

    if (!leaveRequestData.teamMember && !leaveRequestData.teamMemberName) {
      return res.status(400).json({ error: 'Team member name is required' });
    }

    if (!leaveRequestData.startDate || !leaveRequestData.endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Create output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const teamMember = (leaveRequestData.teamMember || leaveRequestData.teamMemberName).replace(/\s+/g, '_');
    const fileName = `Leave_Form_${teamMember}_${timestamp}.docx`;
    const outputPath = path.join(__dirname, 'uploads', fileName);

    // Generate filled form
    const result = await generateFilledLeaveForm(leaveRequestData, outputPath);

    if (result.success) {
      // Send file for download
      res.download(outputPath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download form' });
          }
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }, 5000);
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate form',
        details: result.error,
        message: result.details
      });
    }
  } catch (error) {
    console.error('Form generation error:', error);
    res.status(500).json({ error: 'Failed to generate form', details: error.message });
  }
});

// Generate pre-filled form from existing leave request
app.get('/api/leave-requests/:id/generate-form', async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // Load leave requests
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    
    const leaveRequest = leaveRequests.find(r => r.id === requestId);
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Create output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const teamMember = leaveRequest.teamMember.replace(/\s+/g, '_');
    const fileName = `Leave_Form_${teamMember}_${requestId}_${timestamp}.docx`;
    const outputPath = path.join(__dirname, 'uploads', fileName);

    // Generate filled form
    const result = await generateFilledLeaveForm(leaveRequest, outputPath);

    if (result.success) {
      // Send file for download
      res.download(outputPath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download form' });
          }
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }, 5000);
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate form',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Form generation error:', error);
    res.status(500).json({ error: 'Failed to generate form', details: error.message });
  }
});

// ============= DATA ENDPOINTS =============

// Get attendance/PTO records
app.get('/api/attendance-records', (req, res) => {
  try {
    const records = getAttendanceRecords();
    res.json({ records });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get approval history for reporting/audit
app.get('/api/approval-history', (req, res) => {
  try {
    const history = getApprovalHistory();
    res.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
});

// Serve team member names from JSON file
app.get('/api/team-members', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const data = fs.readFileSync(path.join(__dirname, 'teamMembers.json'), 'utf-8');
    const teamMembers = JSON.parse(data);
    
    // Filter by CSP if user is CSP role
    if (user && user.role === 'csp' && user.cspName) {
      // Load metadata to check CSP assignments
      const metaPath = path.join(__dirname, 'teamMemberMeta.json');
      if (fs.existsSync(metaPath)) {
        const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const allowedNames = metaData
          .filter(m => m.csp === user.cspName)
          .map(m => m.teamMemberName);
        const filtered = teamMembers.filter(name => allowedNames.includes(name));
        return res.json({ teamMembers: filtered });
      }
    }
    // Directors see all team members
    
    res.json({ teamMembers });
  } catch (error) {
    console.error('Team members fetch error:', error);
    res.status(500).json({ error: 'Failed to load team member names' });
  }
});

// Get detailed team member information with PTO balances
app.get('/api/team-members-details', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    
    // Read team member metadata (contains actual member info)
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (!fs.existsSync(metaPath)) {
      return res.json({ teamMembers: [] });
    }
    
    let teamMemberMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    
    // Skip header row if present (where teamMemberName is "Client Name")
    teamMemberMeta = teamMemberMeta.filter(m => m.teamMemberName !== 'Client Name');
    
    // Filter by CSP if user is CSP role
    if (user && user.role === 'csp' && user.cspName) {
      teamMemberMeta = teamMemberMeta.filter(m => m.csp === user.cspName);
    }
    // Directors see all team members
    
    // Read leave requests to calculate PTO
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    let leaveRequests = [];
    if (fs.existsSync(leaveRequestsPath)) {
      leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf-8'));
    }

    // Build detailed team member info
    const teamMembers = teamMemberMeta.map((meta, index) => {
      // The actual team member name is in employeeId field (due to data structure issue)
      const memberName = meta.employeeId || meta.teamMemberName;
      
      // Find all leave requests for this member
      const memberLeaves = leaveRequests.filter(lr => 
        lr.teamMemberName === memberName || lr.employeeName === memberName || lr.teamMember === memberName
      );
      
      // Calculate PTO from actual approved leaves
      const approvedLeaves = memberLeaves.filter(lr => 
        lr.status === 'approved' || lr.status === 'client-approved'
      );
      
      let usedDays = 0;
      approvedLeaves.forEach(leave => {
        if (leave.startDate && leave.endDate) {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (days > 0 && days < 365) { // Sanity check
            usedDays += days;
          }
        } else if (leave.days && typeof leave.days === 'number') {
          usedDays += leave.days;
        }
      });
      
      // Default annual PTO (can be customized per employee later)
      const accruedDays = meta.annualPTO || 12;
      const remainingDays = Math.max(0, accruedDays - usedDays);
      
      // Check current status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentStatus = 'available';
      let currentLeave = undefined;
      
      // Check for approved leave (reuse approvedLeaves from above)
      const activeLeave = approvedLeaves.find(lr => {
        const start = new Date(lr.startDate);
        const end = new Date(lr.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return today >= start && today <= end;
      });
      
      if (activeLeave) {
        currentStatus = 'on-leave';
        const start = new Date(activeLeave.startDate);
        const end = new Date(activeLeave.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        currentLeave = {
          type: activeLeave.leaveType || 'vacation',
          startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          endDate: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          days
        };
      } else {
        // Check for pending leave
        const pendingLeaves = memberLeaves.filter(lr => 
          lr.status === 'pending' || lr.status === 'csp-review' || lr.status === 'pending-client-approval'
        );
        const upcomingPending = pendingLeaves.find(lr => {
          const start = new Date(lr.startDate);
          start.setHours(0, 0, 0, 0);
          return start >= today;
        });
        
        if (upcomingPending) {
          currentStatus = 'pending';
          const start = new Date(upcomingPending.startDate);
          const end = new Date(upcomingPending.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          currentLeave = {
            type: upcomingPending.leaveType || 'vacation',
            startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            endDate: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            days
          };
        }
      }
      
      return {
        id: `member-${index + 1}`,
        name: memberName,
        email: meta.email || meta.csp || `${memberName.toLowerCase().replace(/\s+/g, '.')}@zimworx.org`,
        department: meta.department || 'Operations',
        client: meta.teamMemberName || 'Unassigned',
        ptoBalance: {
          accrued: accruedDays,
          used: usedDays,
          remaining: remainingDays
        },
        currentStatus,
        currentLeave
      };
    });
    
    res.json({ teamMembers });
  } catch (error) {
    console.error('Team members details fetch error:', error);
    res.status(500).json({ error: 'Failed to load team member details', details: error.message });
  }
});

// ============= NOTIFICATION ENDPOINTS =============

// Send Gmail notification for leave approval/rejection
app.post('/api/notify-leave', async (req, res) => {
  const { to, subject, message, approval } = req.body;
  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'Missing to, subject, or message' });
  }
  
  try {
    await sendGmailNotification(oauth2Client, to, subject, message);
    
    // Log approval history
    if (approval) {
      const historyPath = './server/approvalHistory.json';
      let history = [];
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      }
      
      const action = subject.toLowerCase().includes('approve') ? 'approved' : 'rejected';
      const record = {
        ...approval,
        action,
        timestamp: new Date().toISOString(),
        actor: 'system',
      };
      
      history.push(record);
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      
      // Update attendance/PTO records if approved
      if (action === 'approved') {
        updateAttendanceForLeave(record);
        // Sync with Belina Payroll system
        await syncLeaveWithBelinaPayroll(record);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to send Gmail notification' });
  }
});

// ============= GOOGLE SHEETS INTEGRATION =============

// Authorization Route
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  });
  res.redirect(authUrl);
});

// Callback Route
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Authentication successful!');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Fetch Google Sheets data
app.get('/api/google-sheets', async (req, res) => {
  const { spreadsheetId, range } = req.query;
  if (!spreadsheetId || !range) {
    return res.status(400).json({ error: 'Missing spreadsheetId or range' });
  }
  
  try {
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    const normalized = normalizeSheetData(response.data.values);
    res.json({ values: response.data.values, normalized });
  } catch (error) {
    console.error('Google Sheets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Google Sheets data' });
  }
});

// Merge multiple sheets
app.post('/api/merge-sheets', async (req, res) => {
  const { sheets } = req.body;
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return res.status(400).json({ error: 'Missing sheets array' });
  }
  
  try {
    const merged = [];
    for (const { spreadsheetId, range } of sheets) {
      const api = google.sheets({ version: 'v4', auth: oauth2Client });
      const response = await api.spreadsheets.values.get({ spreadsheetId, range });
      const normalized = normalizeSheetData(response.data.values);
      merged.push(...normalized);
    }
    res.json({ merged });
  } catch (error) {
    console.error('Merge sheets error:', error);
    res.status(500).json({ error: 'Failed to merge sheets' });
  }
});

// ============= ANALYTICS ENDPOINTS =============

// Aggregation endpoint
app.post('/api/aggregate', (req, res) => {
  const { data, field, op } = req.body;
  if (!data || !field || !op) {
    return res.status(400).json({ error: 'Missing params' });
  }
  
  try {
    const result = aggregate(data, field, op);
    res.json({ result });
  } catch (error) {
    console.error('Aggregate error:', error);
    res.status(500).json({ error: 'Aggregation failed' });
  }
});

// Group-by endpoint
app.post('/api/group-by', (req, res) => {
  const { data, field } = req.body;
  if (!data || !field) {
    return res.status(400).json({ error: 'Missing params' });
  }
  
  try {
    const result = groupBy(data, field);
    res.json({ result });
  } catch (error) {
    console.error('Group-by error:', error);
    res.status(500).json({ error: 'Group-by failed' });
  }
});

// Trend analysis endpoint
app.post('/api/trend', (req, res) => {
  const { data, dateField, valueField } = req.body;
  if (!data || !dateField || !valueField) {
    return res.status(400).json({ error: 'Missing params' });
  }
  
  try {
    const result = trend(data, dateField, valueField);
    res.json({ result });
  } catch (error) {
    console.error('Trend error:', error);
    res.status(500).json({ error: 'Trend analysis failed' });
  }
});

// Predictive analytics endpoint
app.post('/api/predict', (req, res) => {
  const { series } = req.body;
  if (!series) {
    return res.status(400).json({ error: 'Missing series' });
  }
  
  try {
    const result = predict(series);
    res.json({ result });
  } catch (error) {
    console.error('Predict error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Sentiment analysis endpoint
app.post('/api/sentiment', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }
  
  try {
    const result = analyzeSentiment(text);
    res.json({ result });
  } catch (error) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

// ============= DATA INTEGRATION ENDPOINTS =============

// Placeholder for client data aggregation endpoint
app.get('/api/client-data', async (req, res) => {
  try {
    const [crm, erp, email, sheets] = await Promise.all([
      fetchCRMData(),
      fetchERPData(),
      fetchEmailData(),
      fetchSpreadsheetData(),
    ]);
    res.json({ clients: [...crm, ...erp, ...email, ...sheets] });
  } catch (error) {
    console.error('Client data error:', error);
    res.status(500).json({ error: 'Failed to aggregate client data' });
  }
});

// ============= HUBSPOT CRM ENDPOINTS (READ-ONLY) =============

// Get all HubSpot contacts (READ ONLY)
app.get('/api/hubspot/contacts', async (req, res) => {
  try {
    const contacts = await fetchCRMData();
    res.json({ success: true, contacts, count: contacts.length });
  } catch (error) {
    console.error('HubSpot contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch HubSpot contacts' });
  }
});

// Search HubSpot contact by email (READ ONLY)
app.get('/api/hubspot/contact/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const contact = await fetchHubSpotContactByEmail(email);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found in HubSpot' });
    }
    
    res.json({ success: true, contact });
  } catch (error) {
    console.error('HubSpot contact search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch read contacts by IDs (READ ONLY)
app.post('/api/hubspot/contacts/batch', async (req, res) => {
  try {
    const { contactIds } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }
    
    const contacts = await fetchHubSpotContactsByIds(contactIds);
    res.json({ success: true, contacts, count: contacts.length });
  } catch (error) {
    console.error('HubSpot batch read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync HubSpot contacts to team members (READ ONLY)
app.post('/api/sync/hubspot-team-members', async (req, res) => {
  try {
    console.log('📥 Starting HubSpot to Team Members sync...');
    const result = await syncHubSpotToTeamMembers();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Synced ${result.synced} team members from HubSpot`,
        synced: result.synced,
        teamMembers: result.teamMembers,
        summary: {
          departments: [...new Set(result.teamMemberMeta.map(m => m.department))],
          csps: [...new Set(result.teamMemberMeta.map(m => m.csp))],
          avgPTO: Math.round(result.teamMemberMeta.reduce((sum, m) => sum + m.annualPTO, 0) / result.teamMemberMeta.length)
        }
      });
    } else {
      res.status(500).json({ success: false, error: result.error || result.message });
    }
  } catch (error) {
    console.error('HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync HubSpot contacts' });
  }
});

// Get HubSpot sync status
app.get('/api/sync/hubspot-team-members/status', (req, res) => {
  try {
    const stats = getHubSpotSyncStats();
    res.json(stats);
  } catch (error) {
    console.error('HubSpot sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Sync HubSpot companies (clients) (READ ONLY)
app.post('/api/sync/hubspot-clients', async (req, res) => {
  try {
    console.log('🏢 Starting HubSpot Companies sync...');
    const result = await syncHubSpotClients();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Synced ${result.synced} clients from HubSpot`,
        synced: result.synced,
        clients: result.clients
      });
    } else {
      res.status(500).json({ success: false, error: result.error || result.message });
    }
  } catch (error) {
    console.error('HubSpot clients sync error:', error);
    res.status(500).json({ error: 'Failed to sync HubSpot clients' });
  }
});

// Link team members to clients
app.post('/api/sync/link-members-clients', async (req, res) => {
  try {
    console.log('🔗 Linking team members to clients...');
    const result = await linkTeamMembersToClients();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Linked ${result.linked} of ${result.totalMembers} team members to clients`,
        linked: result.linked,
        totalMembers: result.totalMembers,
        totalClients: result.totalClients
      });
    } else {
      res.status(500).json({ success: false, error: result.error || result.message });
    }
  } catch (error) {
    console.error('Linking error:', error);
    res.status(500).json({ error: 'Failed to link members to clients' });
  }
});

// Sync clients to CILL Verification
app.post('/api/sync/clients-to-cill', async (req, res) => {
  try {
    console.log('📊 Syncing clients to CILL...');
    const result = await syncClientsToCILL();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Enriched CILL data with ${result.clients} clients from HubSpot`,
        clients: result.clients
      });
    } else {
      res.status(500).json({ success: false, error: result.error || result.message });
    }
  } catch (error) {
    console.error('CILL sync error:', error);
    res.status(500).json({ error: 'Failed to sync clients to CILL' });
  }
});

// Get client sync status
app.get('/api/sync/hubspot-clients/status', (req, res) => {
  try {
    const stats = getClientSyncStats();
    res.json(stats);
  } catch (error) {
    console.error('Client sync status error:', error);
    res.status(500).json({ error: 'Failed to get client sync status' });
  }
});

// Get all HubSpot companies (READ ONLY)
app.get('/api/hubspot/companies', async (req, res) => {
  try {
    const companies = await fetchHubSpotCompanies();
    res.json({ success: true, companies, count: companies.length });
  } catch (error) {
    console.error('HubSpot companies error:', error);
    res.status(500).json({ error: 'Failed to fetch HubSpot companies' });
  }
});

// Webhook endpoint for real-time data push
app.post('/api/webhook', (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Missing data' });
  }
  
  try {
    const requiredFields = ['id', 'name'];
    const validData = data.filter(row => validateRow(row, requiredFields));
    const dedupedData = deduplicate(validData, 'id');
    res.json({ status: 'ok', count: dedupedData.length });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============= NOTIFICATIONS ENDPOINTS =============

// Helper function to create a notification
function createNotification(notificationData) {
  const notificationsPath = path.join(__dirname, 'notifications.json');
  let notifications = [];
  
  if (fs.existsSync(notificationsPath)) {
    try {
      notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    } catch (e) {
      notifications = [];
    }
  }
  
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...notificationData
  };
  
  notifications.unshift(notification); // Add to beginning
  
  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }
  
  fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
  return notification;
}

// Get all notifications for current user
app.get('/api/notifications', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const notificationsPath = path.join(__dirname, 'notifications.json');
    let notifications = [];
    
    if (fs.existsSync(notificationsPath)) {
      notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    }
    
    // Filter by CSP if user is CSP role
    if (user && user.role === 'csp' && user.cspName) {
      const metaPath = path.join(__dirname, 'teamMemberMeta.json');
      if (fs.existsSync(metaPath)) {
        const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const allowedNames = metaData
          .filter(m => m.csp === user.cspName)
          .map(m => m.teamMemberName);
        // Filter notifications related to user's team members
        notifications = notifications.filter(n => 
          !n.teamMemberName || allowedNames.includes(n.teamMemberName)
        );
      }
    }
    // Directors see all notifications
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const notificationsPath = path.join(__dirname, 'notifications.json');
    
    if (!fs.existsSync(notificationsPath)) {
      return res.status(404).json({ error: 'No notifications found' });
    }
    
    let notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    let found = false;
    
    notifications = notifications.map(n => {
      if (n.id === id) {
        found = true;
        return { ...n, read: true };
      }
      return n;
    });
    
    if (!found) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const notificationsPath = path.join(__dirname, 'notifications.json');
    
    if (!fs.existsSync(notificationsPath)) {
      return res.status(404).json({ error: 'No notifications found' });
    }
    
    let notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    const initialLength = notifications.length;
    
    notifications = notifications.filter(n => n.id !== id);
    
    if (notifications.length === initialLength) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Create upcoming leave reminders (can be called by scheduled job)
app.post('/api/notifications/create-reminders', (req, res) => {
  try {
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    if (!fs.existsSync(leaveRequestsPath)) {
      return res.json({ created: 0 });
    }
    
    const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    let created = 0;
    
    leaveRequests.forEach(request => {
      if (request.status === 'approved') {
        const startDate = new Date(request.startDate);
        
        // Create reminder for leaves starting in 3 days
        if (startDate >= today && startDate <= threeDaysFromNow) {
          createNotification({
            type: 'upcoming_leave',
            title: 'Upcoming Leave Reminder',
            message: `${request.teamMember} will be on ${request.leaveType} leave starting ${request.startDate}`,
            recipientRole: 'all',
            relatedId: request.id,
            priority: 'medium',
            teamMember: request.teamMember,
            leaveType: request.leaveType
          });
          created++;
        }
      }
    });
    
    res.json({ success: true, created });
  } catch (error) {
    console.error('Error creating reminders:', error);
    res.status(500).json({ error: 'Failed to create reminders' });
  }
});

// ============= ANALYTICS ENDPOINTS =============

// Get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    const { timeRange = 'year', department = 'all' } = req.query;
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    
    if (!fs.existsSync(leaveRequestsPath) || !fs.existsSync(teamMembersPath)) {
      return res.json({
        usageTrends: { monthly: [], quarterly: [] },
        leaveTypes: [],
        departmentBreakdown: [],
        peakPeriods: [],
        topUsers: [],
        approvalMetrics: { approved: 0, rejected: 0, pending: 0, avgApprovalTime: 0 }
      });
    }

    const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    const teamMembers = JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'));
    
    // Filter by department if specified
    let filteredRequests = leaveRequests;
    if (department !== 'all') {
      const deptMembers = teamMembers
        .filter(m => m.department === department)
        .map(m => m.name);
      filteredRequests = leaveRequests.filter(req => deptMembers.includes(req.teamMember));
    }

    // Calculate monthly trends
    const monthlyData = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().substring(0, 7); // YYYY-MM
      monthlyData[key] = { days: 0, requests: 0 };
    }

    filteredRequests.forEach(req => {
      const month = req.startDate.substring(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].days += req.days || 0;
        monthlyData[month].requests += 1;
      }
    });

    const monthly = Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      days: data.days,
      requests: data.requests
    }));

    // Calculate quarterly trends
    const quarterlyData = {};
    for (let i = 3; i >= 0; i--) {
      const quarter = Math.floor((now.getMonth() - i * 3) / 3) + 1;
      const year = now.getFullYear();
      const key = `Q${quarter} ${year}`;
      quarterlyData[key] = { days: 0, requests: 0 };
    }

    filteredRequests.forEach(req => {
      const date = new Date(req.startDate);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const key = `Q${quarter} ${date.getFullYear()}`;
      if (quarterlyData[key]) {
        quarterlyData[key].days += req.days || 0;
        quarterlyData[key].requests += 1;
      }
    });

    const quarterly = Object.entries(quarterlyData).map(([quarter, data]) => ({
      quarter,
      days: data.days,
      requests: data.requests
    }));

    // Leave types analysis
    const leaveTypeData = {};
    let totalRequests = filteredRequests.length;
    
    filteredRequests.forEach(req => {
      const type = req.leaveType || 'other';
      if (!leaveTypeData[type]) {
        leaveTypeData[type] = { count: 0, days: 0 };
      }
      leaveTypeData[type].count += 1;
      leaveTypeData[type].days += req.days || 0;
    });

    const leaveTypes = Object.entries(leaveTypeData).map(([type, data]) => ({
      type,
      count: data.count,
      days: data.days,
      percentage: totalRequests > 0 ? (data.count / totalRequests) * 100 : 0
    }));

    // Department breakdown
    const deptData = {};
    teamMembers.forEach(member => {
      const dept = member.department || 'N/A';
      if (!deptData[dept]) {
        deptData[dept] = { days: 0, members: 0 };
      }
      deptData[dept].members += 1;
      
      const memberRequests = leaveRequests.filter(
        req => req.teamMember === member.name && req.status === 'approved'
      );
      deptData[dept].days += memberRequests.reduce((sum, req) => sum + (req.days || 0), 0);
    });

    const departmentBreakdown = Object.entries(deptData).map(([department, data]) => ({
      department,
      days: data.days,
      members: data.members
    }));

    // Peak periods (find dates with most concurrent leaves)
    const dateOccupancy = {};
    filteredRequests
      .filter(req => req.status === 'approved')
      .forEach(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          if (!dateOccupancy[dateKey]) {
            dateOccupancy[dateKey] = [];
          }
          dateOccupancy[dateKey].push(req.teamMember);
        }
      });

    const peakPeriods = Object.entries(dateOccupancy)
      .map(([date, members]) => ({
        date,
        count: members.length,
        members
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    // Top users
    const userStats = {};
    filteredRequests
      .filter(req => req.status === 'approved')
      .forEach(req => {
        if (!userStats[req.teamMember]) {
          userStats[req.teamMember] = { days: 0, requests: 0 };
        }
        userStats[req.teamMember].days += req.days || 0;
        userStats[req.teamMember].requests += 1;
      });

    const topUsers = Object.entries(userStats)
      .map(([name, stats]) => ({
        name,
        days: stats.days,
        requests: stats.requests
      }))
      .sort((a, b) => b.days - a.days);

    // Approval metrics
    const approved = leaveRequests.filter(req => req.status === 'approved').length;
    const rejected = leaveRequests.filter(req => req.status === 'rejected').length;
    const pending = leaveRequests.filter(req => req.status === 'pending').length;
    
    // Calculate average approval time
    let totalApprovalTime = 0;
    let approvalCount = 0;
    
    leaveRequests.forEach(req => {
      if (req.status !== 'pending' && req.history && req.history.length > 0) {
        const submittedTime = new Date(req.submittedAt);
        const lastAction = req.history[req.history.length - 1];
        const actionTime = new Date(lastAction.timestamp);
        const diffHours = (actionTime.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);
        totalApprovalTime += diffHours;
        approvalCount += 1;
      }
    });

    const avgApprovalTime = approvalCount > 0 ? totalApprovalTime / approvalCount : 0;

    res.json({
      usageTrends: { monthly, quarterly },
      leaveTypes,
      departmentBreakdown,
      peakPeriods,
      topUsers,
      approvalMetrics: { approved, rejected, pending, avgApprovalTime }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Export analytics (simplified - returns JSON for now)
app.get('/api/analytics/export', (req, res) => {
  try {
    const { format = 'excel', timeRange = 'year', department = 'all' } = req.query;
    
    // In a real implementation, you would generate Excel/PDF here
    // For now, return JSON data that frontend can convert
    const analyticsEndpoint = `/api/analytics?timeRange=${timeRange}&department=${department}`;
    
    // Redirect to analytics endpoint for JSON
    // In production, implement actual Excel/PDF generation using libraries like:
    // - exceljs for Excel
    // - pdfkit or puppeteer for PDF
    res.redirect(analyticsEndpoint);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// ============= EMAIL ENDPOINTS =============

// Get email settings
app.get('/api/email/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'emailSettings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      // Don't send password to frontend
      res.json({ ...settings, smtpPassword: settings.smtpPassword ? '••••••••' : '' });
    } else {
      res.json({
        enabled: false,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: 'noreply@company.com',
        fromName: 'Team Leave Management',
        notifications: {
          newRequest: true,
          approval: true,
          rejection: true,
          upcomingLeave: true,
          pendingReminder: true
        },
        digest: {
          enabled: true,
          frequency: 'daily',
          time: '09:00',
          recipients: []
        }
      });
    }
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// Save email settings
app.post('/api/email/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'emailSettings.json');
    const newSettings = req.body;
    
    // If password is masked, keep existing password
    if (newSettings.smtpPassword === '••••••••' && fs.existsSync(settingsPath)) {
      const existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      newSettings.smtpPassword = existingSettings.smtpPassword;
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving email settings:', error);
    res.status(500).json({ error: 'Failed to save email settings' });
  }
});

// Send test email
app.post('/api/email/test', async (req, res) => {
  try {
    const { to } = req.body;
    const settingsPath = path.join(__dirname, 'emailSettings.json');
    
    if (!fs.existsSync(settingsPath)) {
      return res.status(400).json({ error: 'Email settings not configured' });
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (!settings.enabled) {
      return res.status(400).json({ error: 'Email notifications are disabled' });
    }
    
    // In production, use nodemailer or similar library to send actual email
    // For now, simulate success
    console.log(`Would send test email to ${to} using ${settings.smtpHost}`);
    
    res.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      note: 'Email sending requires nodemailer configuration in production'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Send digest email
app.post('/api/email/digest', async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'emailSettings.json');
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    
    if (!fs.existsSync(settingsPath)) {
      return res.status(400).json({ error: 'Email settings not configured' });
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (!settings.enabled || !settings.digest.enabled) {
      return res.status(400).json({ error: 'Digest emails are disabled' });
    }
    
    const leaveRequests = fs.existsSync(leaveRequestsPath) 
      ? JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'))
      : [];
    
    const teamMembers = fs.existsSync(teamMembersPath)
      ? JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'))
      : [];
    
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    // Calculate digest statistics
    const pending = leaveRequests.filter(r => r.status === 'pending').length;
    const approvedToday = leaveRequests.filter(r => {
      if (r.status !== 'approved' || !r.history) return false;
      const lastAction = r.history[r.history.length - 1];
      return lastAction && new Date(lastAction.timestamp).toDateString() === today.toDateString();
    }).length;
    
    const onLeaveToday = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return today >= start && today <= end;
    }).length;
    
    const upcomingLeave = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const start = new Date(r.startDate);
      return start > today && start <= nextWeek;
    }).length;
    
    const digestData = {
      date: today.toISOString().split('T')[0],
      pending,
      approvedToday,
      onLeaveToday,
      upcomingLeave,
      recipients: settings.digest.recipients
    };
    
    // In production, send actual email using nodemailer
    console.log('Digest email would be sent:', digestData);
    
    res.json({ 
      success: true, 
      message: `Digest sent to ${settings.digest.recipients.length} recipient(s)`,
      data: digestData,
      note: 'Email sending requires nodemailer configuration in production'
    });
  } catch (error) {
    console.error('Error sending digest email:', error);
    res.status(500).json({ error: 'Failed to send digest email' });
  }
});

// Send notification email (called internally)
function sendNotificationEmail(type, data) {
  const settingsPath = path.join(__dirname, 'emailSettings.json');
  
  if (!fs.existsSync(settingsPath)) return;
  
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  if (!settings.enabled) return;
  
  // Check if this notification type is enabled
  const notificationEnabled = {
    new_request: settings.notifications.newRequest,
    approved: settings.notifications.approval,
    rejected: settings.notifications.rejection,
    upcoming_leave: settings.notifications.upcomingLeave,
    pending_reminder: settings.notifications.pendingReminder
  }[type];
  
  if (!notificationEnabled) return;
  
  // In production, use nodemailer to send email
  console.log(`Would send ${type} email:`, data);
}

// ============= INTEGRATION ENDPOINTS =============

// Export leave data to Google Sheets
app.post('/api/export/google-sheets', async (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    
    if (!fs.existsSync(leaveRequestsPath)) {
      return res.status(404).json({ error: 'No leave requests found' });
    }
    
    const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    const teamMembers = fs.existsSync(teamMembersPath) 
      ? JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'))
      : [];
    
    // Prepare data for sheets
    const headers = ['Team Member', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Submitted By', 'Submitted At'];
    const rows = leaveRequests.map(req => [
      req.teamMember,
      req.leaveType,
      req.startDate,
      req.endDate,
      req.days || 0,
      req.status,
      req.submittedBy || 'N/A',
      new Date(req.submittedAt).toLocaleString()
    ]);
    
    const values = [headers, ...rows];
    
    // In production, use Google Sheets API with oauth2Client
    // const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    // await sheets.spreadsheets.values.update({
    //   spreadsheetId,
    //   range: 'Leave Requests!A1',
    //   valueInputOption: 'RAW',
    //   resource: { values }
    // });
    
    console.log(`Would export ${rows.length} leave requests to Google Sheets`);
    
    res.json({ 
      success: true, 
      exported: rows.length,
      message: 'Data ready for Google Sheets export',
      data: values,
      note: 'Requires Google Sheets API authentication in production'
    });
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    res.status(500).json({ error: 'Failed to export to Google Sheets' });
  }
});

// Generate CSV export
app.get('/api/export/csv', (req, res) => {
  try {
    const { type = 'leave_requests' } = req.query;
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    
    let csvContent = '';
    let filename = '';
    
    if (type === 'leave_requests' && fs.existsSync(leaveRequestsPath)) {
      const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
      csvContent = 'Team Member,Leave Type,Start Date,End Date,Days,Status,Submitted By,Submitted At\n';
      csvContent += leaveRequests.map(req => 
        `"${req.teamMember}","${req.leaveType}","${req.startDate}","${req.endDate}",${req.days || 0},"${req.status}","${req.submittedBy || 'N/A'}","${new Date(req.submittedAt).toLocaleString()}"`
      ).join('\n');
      filename = `leave_requests_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'team_members' && fs.existsSync(teamMembersPath)) {
      const teamMembers = JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'));
      csvContent = 'Name,Email,Department,ID\n';
      csvContent += teamMembers.map(member => 
        `"${member.name}","${member.email}","${member.department || 'N/A'}","${member.id}"`
      ).join('\n');
      filename = `team_members_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return res.status(404).json({ error: 'Data not found' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Send Slack notification
async function sendSlackNotification(message, webhookUrl) {
  if (!webhookUrl) {
    console.log('Slack webhook not configured');
    return;
  }
  
  try {
    await axios.post(webhookUrl, {
      text: message,
      username: 'Team Leave Management',
      icon_emoji: ':calendar:'
    });
    console.log('Slack notification sent:', message);
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
  }
}

// STEP 4: Send approved leave to Payroll
async function sendApprovedLeaveToPayroll(leaveRequest) {
  try {
    // Read email settings for payroll recipients
    const emailSettingsPath = path.join(__dirname, 'emailSettings.json');
    let payrollEmails = ['payroll@zimworx.com']; // Default
    
    if (fs.existsSync(emailSettingsPath)) {
      const emailSettings = JSON.parse(fs.readFileSync(emailSettingsPath, 'utf8'));
      if (emailSettings.payrollRecipients && emailSettings.payrollRecipients.length > 0) {
        payrollEmails = emailSettings.payrollRecipients;
      }
    }
    
    // Format email content
    const emailSubject = `APPROVED: Leave Request for ${leaveRequest.teamMember}`;
    const emailBody = `
      APPROVED LEAVE REQUEST
      =====================
      
      Team Member: ${leaveRequest.teamMember}
      Leave Type: ${leaveRequest.leaveType}
      Start Date: ${leaveRequest.startDate}
      End Date: ${leaveRequest.endDate}
      Total Days: ${leaveRequest.days}
      Reason: ${leaveRequest.reason || 'N/A'}
      
      Submitted By: ${leaveRequest.submittedBy}
      Submitted At: ${new Date(leaveRequest.submittedAt).toLocaleString()}
      Approved At: ${new Date().toLocaleString()}
      
      CSP Verified: ${leaveRequest.cspApprovedBy || 'N/A'}
      CSP Notes: ${leaveRequest.cspNotes || 'N/A'}
      
      Please update payroll records accordingly.
    `;
    
    // In production: Send actual email using nodemailer with Excel attachment
    console.log('\\n[PAYROLL NOTIFICATION - EXCEL DOCUMENT]');
    console.log('To:', payrollEmails.join(', '));
    console.log('Subject:', emailSubject);
    console.log('Excel Attachment:', leaveRequest.exportDocument || 'Document not generated');
    console.log('Body:', emailBody);
    console.log('\\n✅ Excel document would be sent to:', payrollEmails.join(', '));
    
    // Log to file for audit
    const payrollLogPath = path.join(__dirname, 'payrollNotifications.json');
    let logs = [];
    if (fs.existsSync(payrollLogPath)) {
      logs = JSON.parse(fs.readFileSync(payrollLogPath, 'utf8'));
    }
    logs.push({
      id: Date.now().toString(),
      leaveRequestId: leaveRequest.id,
      teamMember: leaveRequest.teamMember,
      sentTo: payrollEmails,
      sentAt: new Date().toISOString(),
      subject: emailSubject,
      excelDocument: leaveRequest.exportDocument || null,
      status: 'sent'
    });
    fs.writeFileSync(payrollLogPath, JSON.stringify(logs, null, 2));
    
    // TODO: Replace with actual Belina Payroll API call
    // await syncLeaveWithBelinaPayroll(leaveRequest);
    
  } catch (error) {
    console.error('Error sending to payroll:', error);
  }
}

// STEP 5: Update Absenteeism Tracker in Google Sheets
async function updateAbsenteeismTracker(leaveRequest) {
  try {
    const ABSENTEEISM_SPREADSHEET_ID = process.env.ABSENTEEISM_SPREADSHEET_ID || process.env.SPREADSHEET_ID;
    
    if (!ABSENTEEISM_SPREADSHEET_ID) {
      console.log('Absenteeism tracker spreadsheet not configured');
      return;
    }
    
    // Check if Google auth is available
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      console.log('Google Sheets not authenticated. Skipping absenteeism tracker update.');
      return;
    }
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // Helper function to calculate business days (excluding weekends and US Federal Holidays)
    const getBusinessDays = (startDate, endDate) => {
      return calculateBusinessDaysWithHolidays(startDate, endDate);
    };
    
    // Helper function to get week number
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(new Date(date).getFullYear(), new Date(date).getMonth(), new Date(date).getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    
    // Get team member metadata for CSP, Client, and Country
    let teamMemberMeta = null;
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (fs.existsSync(metaPath)) {
      const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      teamMemberMeta = allMeta.find(m => m.teamMemberName === leaveRequest.teamMember);
    }
    
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    
    // Calculate all required fields
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()); // Get Sunday of week
    
    const businessDays = getBusinessDays(leaveRequest.startDate, leaveRequest.endDate);
    const calendarDays = leaveRequest.days;
    const weekNumber = getWeekNumber(leaveRequest.startDate);
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });
    const year = startDate.getFullYear();
    const cspName = teamMemberMeta?.csp || 'N/A';
    const clientName = teamMemberMeta?.client || 'TBD';
    const country = teamMemberMeta?.country || 'Zimbabwe';
    
    // Build row data with all required columns
    const rowData = [
      weekStartDate.toLocaleDateString('en-US'), // Week Start
      leaveRequest.startDate,                     // Start Date
      leaveRequest.endDate,                       // End Date
      calendarDays,                                // No. Of Days
      businessDays,                                // No. Of Days (Where Wknd = Sat & Sun)
      leaveRequest.teamMember,                    // Name of Absentee
      leaveRequest.reason || 'N/A',               // Reason for Absence
      'Yes',                                       // Absenteeism Authorised?
      leaveRequest.submissionMethod === 'official-form' ? 'Yes' : 'No', // Leave Form/Sick Note sent
      `${leaveRequest.leaveType}`,                // Comment
      clientName,                                  // Client
      cspName,                                     // CSP
      country,                                     // Country
      weekNumber,                                  // Week No.
      monthName,                                   // Month
      year,                                        // Year
      new Date().toISOString()                    // Time Stamp
    ];
    
    // Update main Absenteeism tracker (input sheet)
    const inputRange = 'Input!A:Q';
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: inputRange,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [rowData] }
    });
    
    console.log(`✅ Updated Absenteeism Input sheet for ${leaveRequest.teamMember}`);
    
    // Update Reporting sheet (same data structure)
    const reportingRange = 'Reporting!A:Q';
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: reportingRange,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [rowData] }
    });
    
    console.log(`✅ Updated Absenteeism Reporting sheet for ${leaveRequest.teamMember}`);
    
    // Update individual team member's sheet (if exists)
    const memberSheetName = leaveRequest.teamMember.replace(/\s+/g, '_');
    const memberRange = `${memberSheetName}!A:Q`;
    
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
        range: memberRange,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      console.log(`✅ Updated individual Absenteeism record for ${leaveRequest.teamMember}`);
    } catch (err) {
      // Sheet for individual member may not exist, create it or log warning
      console.log(`⚠️ Individual sheet for ${leaveRequest.teamMember} not found. Will use main sheets only.`);
    }
    
  } catch (error) {
    console.error('Error updating Absenteeism tracker:', error.message);
  }
}

// Get integration settings
app.get('/api/integrations/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'integrationSettings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      res.json(settings);
    } else {
      res.json({
        slack: {
          enabled: false,
          webhookUrl: '',
          notifyOnSubmit: true,
          notifyOnApproval: true,
          notifyOnRejection: true
        },
        googleSheets: {
          enabled: false,
          spreadsheetId: '',
          autoSync: false
        }
      });
    }
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save integration settings
app.post('/api/integrations/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'integrationSettings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving integration settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Generate iCal feed
app.get('/api/calendar/ical', (req, res) => {
  try {
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    
    if (!fs.existsSync(leaveRequestsPath)) {
      return res.status(404).json({ error: 'No leave requests found' });
    }
    
    const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    const approvedLeaves = leaveRequests.filter(req => req.status === 'approved');
    
    // Generate iCal format
    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Team Leave Management//PTO Calendar//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';
    ical += 'METHOD:PUBLISH\n';
    ical += 'X-WR-CALNAME:Team PTO Calendar\n';
    ical += 'X-WR-TIMEZONE:UTC\n';
    
    approvedLeaves.forEach(leave => {
      const uid = `pto-${leave.id}@teamleave.com`;
      const startDate = leave.startDate.replace(/-/g, '');
      const endDate = leave.endDate.replace(/-/g, '');
      const created = new Date(leave.submittedAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${uid}\n`;
      ical += `DTSTAMP:${created}\n`;
      ical += `DTSTART;VALUE=DATE:${startDate}\n`;
      ical += `DTEND;VALUE=DATE:${endDate}\n`;
      ical += `SUMMARY:${leave.teamMember} - ${leave.leaveType}\n`;
      ical += `DESCRIPTION:${leave.teamMember} is on ${leave.leaveType} leave for ${leave.days} days\n`;
      ical += `STATUS:CONFIRMED\n`;
      ical += `TRANSP:TRANSPARENT\n`;
      ical += 'END:VEVENT\n';
    });
    
    ical += 'END:VCALENDAR\n';
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="team_pto_calendar.ics"');
    res.send(ical);
  } catch (error) {
    console.error('Error generating iCal:', error);
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

// Test Slack webhook
app.post('/api/integrations/slack/test', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL required' });
    }
    
    await sendSlackNotification('🎉 Slack integration test successful! Your notifications are working.', webhookUrl);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Error testing Slack:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ============= UTILITY ENDPOINTS =============

// ============= GOOGLE SHEETS SYNC ENDPOINTS =============

// Comprehensive sync - All 4 tabs from CSP's Google Sheet
app.post('/api/sync/comprehensive', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    let { spreadsheetId } = req.body;
    
    // If no spreadsheetId provided, try to get from CSP settings or global settings
    if (!spreadsheetId) {
      const settingsPath = path.join(__dirname, 'syncSettings.json');
      if (fs.existsSync(settingsPath)) {
        const allSettings = safeJsonParse(settingsPath);
        
        // Check for CSP-specific settings first
        if (user && user.role === 'csp' && user.cspName && allSettings.cspSettings?.[user.cspName]) {
          spreadsheetId = allSettings.cspSettings[user.cspName].spreadsheetId;
          console.log(`Using CSP-specific spreadsheet for ${user.cspName}`);
        } else {
          spreadsheetId = allSettings.spreadsheetId;
          console.log('Using global spreadsheet ID');
        }
      }
    }
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required. Please configure sync settings first.' });
    }

    console.log('Starting comprehensive sync for all 4 tabs...');
    const result = await syncAllSheets(spreadsheetId);
    
    // Update last sync timestamp
    const settingsPath = path.join(__dirname, 'syncSettings.json');
    if (fs.existsSync(settingsPath)) {
      const allSettings = safeJsonParse(settingsPath);
      const now = new Date().toISOString();
      
      if (user && user.role === 'csp' && user.cspName && allSettings.cspSettings?.[user.cspName]) {
        allSettings.cspSettings[user.cspName].lastSync = now;
      } else {
        allSettings.lastSync = now;
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(allSettings, null, 2));
    }
    
    res.json({ 
      success: true, 
      message: 'Comprehensive sync completed successfully',
      stats: result.stats,
      syncedBy: user?.cspName || user?.name || 'System'
    });
  } catch (error) {
    console.error('Comprehensive sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync ALL CSP sheets at once (RECOMMENDED for 22 CSPs)
app.post('/api/sync/all-csp-sheets', async (req, res) => {
  try {
    const { cspConfigs } = req.body;
    
    if (!cspConfigs || !Array.isArray(cspConfigs) || cspConfigs.length === 0) {
      return res.status(400).json({ 
        error: 'cspConfigs array is required',
        example: {
          cspConfigs: [
            { cspEmail: "leslie.chasinda@zimworx.org", cspName: "Leslie Chasinda", spreadsheetId: "xxx" },
            { cspEmail: "john.doe@zimworx.org", cspName: "John Doe", spreadsheetId: "yyy" }
          ]
        }
      });
    }

    const result = await syncAllCSPSheets(cspConfigs);
    
    res.json({ 
      success: true, 
      message: `✅ Synced ${result.totalCount} team members from ${result.totalCSPs} CSP sheets`,
      totalTeamMembers: result.totalCount,
      totalCSPs: result.totalCSPs,
      totalClients: result.totalClients,
      cspSummary: result.cspSummary,
      clients: result.clients,
      errors: result.errors
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync single CSP sheet
app.post('/api/sync/single-csp-sheet', async (req, res) => {
  try {
    const { cspEmail, cspName, spreadsheetId, range } = req.body;
    
    if (!cspEmail || !cspName || !spreadsheetId) {
      return res.status(400).json({ 
        error: 'cspEmail, cspName, and spreadsheetId are required' 
      });
    }

    const result = await syncCSPSheet(
      cspEmail,
      cspName,
      spreadsheetId,
      range || 'Team Member Work Details!A2:I'
    );
    
    res.json({ 
      success: true, 
      message: `✅ Synced ${result.count} team members from ${cspName}'s sheet`,
      csp: cspName,
      teamMemberCount: result.count,
      teamMembers: result.teamMembers
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync team members from Team Member Work Details sheet (single sheet fallback)
app.post('/api/sync/team-members-work-details', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await syncTeamMembersFromWorkDetails(
      spreadsheetId, 
      range || 'Team Member Work Details!A2:I'
    );
    
    res.json({ 
      success: true, 
      message: `✅ Synced ${result.count} team members from Work Details`,
      count: result.count,
      warning: 'Consider using /api/sync/all-csp-sheets for multiple CSP sheets'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync team members from Google Sheets (LEGACY METHOD - kept for backward compatibility)
app.post('/api/sync/team-members', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await syncTeamMembersFromSheets(spreadsheetId, range);
    res.json({ 
      success: true, 
      message: `Synced ${result.count} team members from Google Sheets (legacy method)`,
      count: result.count,
      warning: 'Consider using /api/sync/team-members-work-details for better data structure'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync leave requests from Google Sheets
app.post('/api/sync/leave-requests', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const leaveRequests = await syncLeaveRequestsFromSheets(spreadsheetId, range);
    res.json({ 
      success: true, 
      message: `Synced ${leaveRequests.length} leave requests`,
      count: leaveRequests.length 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync PTO balances from Google Sheets "PTO Update" tab
app.post('/api/sync/pto-balances', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await syncPTOBalancesFromSheets(spreadsheetId, range || 'PTO Update!A2:BJ');
    res.json({ 
      success: true, 
      message: `Synced PTO balances for ${result.count} employees from Google Sheets`,
      count: result.count,
      data: result.ptoData
    });
  } catch (error) {
    console.error('PTO sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync absenteeism tracker from Google Sheets (grid format)
app.post('/api/sync/absenteeism-grid', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await syncAbsenteeismGrid(spreadsheetId, range || 'Absenteesim tracker !A1:AH1000');
    const summary = getAbsenteeismSummary(result.records);
    
    res.json({ 
      success: true, 
      message: `Synced ${result.count} absenteeism records from Google Sheets`,
      count: result.count,
      records: result.records,
      summary: summary
    });
  } catch (error) {
    console.error('Absenteeism sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get absenteeism summary for all employees
app.get('/api/absenteeism/summary', (req, res) => {
  try {
    const recordsPath = path.join(__dirname, 'absenteeismRecords.json');
    
    if (!fs.existsSync(recordsPath)) {
      return res.json({ success: true, summary: [] });
    }
    
    const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    const summary = getAbsenteeismSummary(records);
    
    res.json({ success: true, summary, totalRecords: records.length });
  } catch (error) {
    console.error('Error getting absenteeism summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate Google Sheets connection
app.post('/api/sync/validate', async (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await validateSheetConnection(spreadsheetId);
    res.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Read raw data from Google Sheets (for debugging)
app.post('/api/sync/read-sheet', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId || !range) {
      return res.status(400).json({ error: 'spreadsheetId and range are required' });
    }

    const credentials = safeJsonParse(path.join(__dirname, 'google-credentials.json'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json({
      success: true,
      range,
      rowCount: response.data.values?.length || 0,
      values: response.data.values || []
    });
  } catch (error) {
    console.error('Read sheet error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sync settings (per-CSP or global)
app.get('/api/sync/settings', (req, res) => {
  const user = getUserFromRequest(req);
  const settingsPath = path.join(__dirname, 'syncSettings.json');
  
  if (fs.existsSync(settingsPath)) {
    const allSettings = safeJsonParse(settingsPath);
    
    // If user is CSP, return their specific settings or global settings
    if (user && user.role === 'csp' && user.cspName) {
      const cspSettings = allSettings.cspSettings?.[user.cspName];
      if (cspSettings) {
        // Return CSP-specific settings
        return res.json({ ...allSettings, ...cspSettings, isCspSpecific: true });
      }
    }
    
    // Return global settings for admins or CSPs without specific settings
    res.json({ ...allSettings, isCspSpecific: false });
  } else {
    res.json({ 
      spreadsheetId: '',
      teamMembersRange: 'Team member work details!A1:Z',
      leaveTrackerRange: 'Leave Tracker!A1:Z',
      absenteeismRange: 'Absenteesim tracker !A1:AH1000',
      ptoUpdateRange: 'PTO Update!A2:BJ',
      autoSync: false,
      syncIntervalMinutes: 30,
      isCspSpecific: false
    });
  }
});

// Save sync settings (per-CSP or global)
app.post('/api/sync/settings', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const settingsPath = path.join(__dirname, 'syncSettings.json');
    
    // Load existing settings
    let allSettings = {};
    if (fs.existsSync(settingsPath)) {
      allSettings = safeJsonParse(settingsPath);
    }
    
    // If user is CSP, save their specific settings
    if (user && user.role === 'csp' && user.cspName) {
      if (!allSettings.cspSettings) {
        allSettings.cspSettings = {};
      }
      
      // Save CSP-specific settings
      allSettings.cspSettings[user.cspName] = {
        spreadsheetId: req.body.spreadsheetId,
        teamMembersRange: req.body.teamMembersRange || 'Team member work details!A1:Z',
        leaveTrackerRange: req.body.leaveTrackerRange || 'Leave Tracker!A1:Z',
        absenteeismRange: req.body.absenteeismRange || 'Absenteesim tracker !A1:AH1000',
        ptoUpdateRange: req.body.ptoUpdateRange || 'PTO Update!A2:BJ',
        lastSync: null,
        lastSyncBy: user.email || user.name
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(allSettings, null, 2));
      return res.json({ 
        success: true, 
        message: `Sync settings saved for CSP: ${user.cspName}`,
        isCspSpecific: true
      });
    }
    
    // Admin or non-CSP: save global settings
    const newSettings = {
      ...allSettings,
      spreadsheetId: req.body.spreadsheetId,
      teamMembersRange: req.body.teamMembersRange || 'Team member work details!A1:Z',
      leaveTrackerRange: req.body.leaveTrackerRange || 'Leave Tracker!A1:Z',
      absenteeismRange: req.body.absenteeismRange || 'Absenteesim tracker !A1:AH1000',
      ptoUpdateRange: req.body.ptoUpdateRange || 'PTO Update!A2:BJ',
      autoSync: req.body.autoSync,
      syncIntervalMinutes: req.body.syncIntervalMinutes,
      lastSync: allSettings.lastSync
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    res.json({ 
      success: true, 
      message: 'Global sync settings saved',
      isCspSpecific: false
    });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============= CILL VERIFICATION ENDPOINTS =============

// Middleware to check CILL access permissions
const checkCILLPermission = (action) => {
  return async (req, res, next) => {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please login' });
    }
    
    const { checkCILLAccess } = await import('./secureCILLSync.js');
    if (!checkCILLAccess(user.role, action)) {
      return res.status(403).json({ 
        error: `Forbidden: ${user.role} role does not have ${action} permission for CILL data` 
      });
    }
    
    req.user = user;
    next();
  };
};

// Sync CILL Verification Schedule from Google Sheets
app.post('/api/sync/cill-verification', checkCILLPermission('sync'), async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    const result = await syncCILLVerificationSchedule(spreadsheetId, range);
    res.json({ 
      success: true, 
      message: `Synced ${result.count} CILL verification records`,
      count: result.count,
      summary: result.summary
    });
  } catch (error) {
    console.error('CILL sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get CILL verification records with filters
app.get('/api/cill-verification', checkCILLPermission('read'), async (req, res) => {
  try {
    const filters = {
      csp: req.query.csp,
      client: req.query.client,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      billingStatus: req.query.billingStatus,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const records = getCILLRecords(filters);
    
    // Decrypt records based on user role
    const { decryptCILLRecord } = await import('./secureCILLSync.js');
    const decryptedRecords = records.map(r => {
      try {
        return decryptCILLRecord(r, req.user.role);
      } catch (err) {
        return null;
      }
    }).filter(r => r !== null);
    
    res.json({ success: true, records: decryptedRecords, count: decryptedRecords.length });
  } catch (error) {
    console.error('Error fetching CILL records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get CILL verification record by ID
app.get('/api/cill-verification/:id', checkCILLPermission('read'), async (req, res) => {
  try {
    const { id } = req.params;
    const records = getCILLRecords();
    const record = records.find(r => r.id === id || r.employeeNumber === id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Decrypt record based on user role
    const { decryptCILLRecord } = await import('./secureCILLSync.js');
    const decryptedRecord = decryptCILLRecord(record, req.user.role);
    
    res.json({ success: true, record: decryptedRecord });
  } catch (error) {
    console.error('Error fetching CILL record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update CILL verification record
app.patch('/api/cill-verification/:id', checkCILLPermission('write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { spreadsheetId, updates } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    
    // Find record index
    const records = getCILLRecords();
    const recordIndex = records.findIndex(r => r.id === id || r.employeeNumber === id);
    
    if (recordIndex === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    await updateCILLRecord(spreadsheetId, recordIndex, updates);
    
    // Log the update
    const { logCILLAccess } = await import('./secureCILLSync.js');
    logCILLAccess(req.user.email, 'update', id, req.user.role);
    
    res.json({ 
      success: true, 
      message: 'CILL record updated successfully'
    });
  } catch (error) {
    console.error('Error updating CILL record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get CILL verification summary/analytics
app.get('/api/cill-verification/summary', checkCILLPermission('read'), async (req, res) => {
  try {
    const records = getCILLRecords();
    const { generateCILLSummary } = await import('./cillVerificationSync.js');
    const summary = generateCILLSummary(records);
    
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error generating CILL summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= REPORTING ENDPOINTS =============

// Generate monthly report with real data
app.post('/api/reports/generate', async (req, res) => {
  const { month, year, sendEmail, recipients } = req.body;
  const user = getUserFromRequest(req);

  try {
    // Default to current month/year if not provided
    const reportMonth = month || new Date().getMonth();
    const reportYear = year || new Date().getFullYear();
    const reportDate = new Date(reportYear, reportMonth, 1);
    const nextMonth = new Date(reportYear, reportMonth + 1, 1);

    // Load data files
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    const teamMetaPath = path.join(__dirname, 'teamMemberMeta.json');

    let leaveRequests = [];
    let teamMembers = [];
    let teamMeta = [];

    if (fs.existsSync(leaveRequestsPath)) {
      leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    }
    if (fs.existsSync(teamMembersPath)) {
      teamMembers = JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'));
    }
    if (fs.existsSync(teamMetaPath)) {
      teamMeta = JSON.parse(fs.readFileSync(teamMetaPath, 'utf8'));
    }

    // Filter leave requests for the reporting period
    const monthLeaveRequests = leaveRequests.filter(req => {
      const startDate = new Date(req.startDate);
      return startDate >= reportDate && startDate < nextMonth;
    });

    // Calculate metrics
    const totalTeamMembers = teamMembers.length || teamMeta.length;
    const workingDaysInMonth = 22; // Average working days per month
    const totalPossibleWorkDays = totalTeamMembers * workingDaysInMonth;

    // Calculate leave days (approved only)
    const approvedLeaveRequests = monthLeaveRequests.filter(req => req.status === 'approved');
    const totalLeaveDays = approvedLeaveRequests.reduce((sum, req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Calculate billable days
    const billableDays = totalPossibleWorkDays - totalLeaveDays;
    const absenteeismRate = ((totalLeaveDays / totalPossibleWorkDays) * 100).toFixed(1);

    // Breakdown by leave type
    const leaveTypeBreakdown = {};
    approvedLeaveRequests.forEach(req => {
      const type = req.leaveType || 'Other';
      if (!leaveTypeBreakdown[type]) {
        leaveTypeBreakdown[type] = 0;
      }
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      leaveTypeBreakdown[type] += days;
    });

    // Top leave takers
    const leaveByPerson = {};
    approvedLeaveRequests.forEach(req => {
      const person = req.teamMemberName || req.name || 'Unknown';
      if (!leaveByPerson[person]) {
        leaveByPerson[person] = 0;
      }
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      leaveByPerson[person] += days;
    });
    const topLeaveTakers = Object.entries(leaveByPerson)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, days]) => ({ name, days }));

    // Calculate trends (compare with previous month)
    const prevMonth = new Date(reportYear, reportMonth - 1, 1);
    const currentMonth = new Date(reportYear, reportMonth, 1);
    const prevMonthLeaveRequests = leaveRequests.filter(req => {
      const startDate = new Date(req.startDate);
      return startDate >= prevMonth && startDate < currentMonth && req.status === 'approved';
    });
    const prevMonthLeaveDays = prevMonthLeaveRequests.reduce((sum, req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);
    
    const leaveTrend = totalLeaveDays - prevMonthLeaveDays;
    const utilizationChange = ((billableDays / totalPossibleWorkDays) * 100) - 
                               (((totalPossibleWorkDays - prevMonthLeaveDays) / totalPossibleWorkDays) * 100);

    // Generate AI insights
    const insights = [];
    if (utilizationChange > 5) {
      insights.push(`Billable utilization up ${utilizationChange.toFixed(1)}% vs last month - excellent productivity`);
    } else if (utilizationChange < -5) {
      insights.push(`Billable utilization down ${Math.abs(utilizationChange).toFixed(1)}% vs last month - review capacity planning`);
    }
    
    if (parseFloat(absenteeismRate) > 10) {
      insights.push(`Absenteeism rate at ${absenteeismRate}% - consider wellness initiatives and team morale checks`);
    } else {
      insights.push(`Absenteeism rate at ${absenteeismRate}% - within healthy range`);
    }

    if (leaveTrend > 0) {
      insights.push(`Leave requests increased by ${leaveTrend} days compared to previous month`);
    } else if (leaveTrend < 0) {
      insights.push(`Leave requests decreased by ${Math.abs(leaveTrend)} days compared to previous month`);
    }

    const mostCommonLeaveType = Object.entries(leaveTypeBreakdown).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonLeaveType) {
      insights.push(`Most common leave type: ${mostCommonLeaveType[0]} (${mostCommonLeaveType[1]} days)`);
    }

    // Prepare report data
    const reportData = {
      period: {
        month: reportDate.toLocaleString('default', { month: 'long' }),
        year: reportYear,
        generatedAt: new Date().toISOString()
      },
      metrics: {
        billableDays,
        leaveDays: totalLeaveDays,
        absenteeismRate: `${absenteeismRate}%`,
        teamSize: totalTeamMembers,
        utilizationRate: `${((billableDays / totalPossibleWorkDays) * 100).toFixed(1)}%`
      },
      breakdown: {
        byLeaveType: leaveTypeBreakdown,
        topLeaveTakers,
        totalRequests: monthLeaveRequests.length,
        approvedRequests: approvedLeaveRequests.length,
        pendingRequests: monthLeaveRequests.filter(r => r.status === 'pending').length,
        rejectedRequests: monthLeaveRequests.filter(r => r.status === 'rejected').length
      },
      trends: {
        leaveDaysChange: leaveTrend,
        utilizationChange: utilizationChange.toFixed(1),
        comparisonMonth: prevMonth.toLocaleString('default', { month: 'long' })
      },
      insights
    };

    // Send email if requested
    if (sendEmail && recipients && recipients.length > 0) {
      try {
        const nodemailer = await import('nodemailer');
        
        // Create transporter (using Gmail as example, configure with your SMTP)
        const transporter = nodemailer.default.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASSWORD || 'your-app-password'
          }
        });

        // Create email content
        const emailHtml = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #0050AA; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .metric { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .metric-value { font-size: 24px; font-weight: bold; color: #0050AA; }
                .insight { background: #e8f4f8; padding: 10px; margin: 5px 0; border-left: 4px solid #0050AA; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #0050AA; color: white; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Monthly Leave Management Report</h1>
                <p>${reportData.period.month} ${reportData.period.year}</p>
              </div>
              <div class="content">
                <h2>Key Metrics</h2>
                <div class="metric">
                  <div>Billable Days</div>
                  <div class="metric-value">${reportData.metrics.billableDays}</div>
                </div>
                <div class="metric">
                  <div>Leave Days</div>
                  <div class="metric-value">${reportData.metrics.leaveDays}</div>
                </div>
                <div class="metric">
                  <div>Absenteeism Rate</div>
                  <div class="metric-value">${reportData.metrics.absenteeismRate}</div>
                </div>
                <div class="metric">
                  <div>Team Utilization</div>
                  <div class="metric-value">${reportData.metrics.utilizationRate}</div>
                </div>

                <h2>AI Insights</h2>
                ${insights.map(insight => `<div class="insight">• ${insight}</div>`).join('')}

                <h2>Leave Type Breakdown</h2>
                <table>
                  <thead>
                    <tr><th>Leave Type</th><th>Days</th></tr>
                  </thead>
                  <tbody>
                    ${Object.entries(reportData.breakdown.byLeaveType)
                      .map(([type, days]) => `<tr><td>${type}</td><td>${days}</td></tr>`)
                      .join('')}
                  </tbody>
                </table>

                <h2>Top Leave Takers</h2>
                <table>
                  <thead>
                    <tr><th>Team Member</th><th>Days</th></tr>
                  </thead>
                  <tbody>
                    ${topLeaveTakers.map(({ name, days }) => `<tr><td>${name}</td><td>${days}</td></tr>`).join('')}
                  </tbody>
                </table>

                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  Report generated on ${new Date(reportData.period.generatedAt).toLocaleString()}<br>
                  ZimWorX Leave Management System
                </p>
              </div>
            </body>
          </html>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'Leave Management System <noreply@zimworx.com>',
          to: recipients.join(', '),
          subject: `Monthly Leave Report - ${reportData.period.month} ${reportData.period.year}`,
          html: emailHtml
        });

        reportData.emailSent = true;
        reportData.emailRecipients = recipients;
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        reportData.emailSent = false;
        reportData.emailError = emailError.message;
      }
    }

    res.json({ success: true, report: reportData });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
});

// Get report statistics for dashboard
app.get('/api/reports/stats', (req, res) => {
  try {
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');

    let leaveRequests = [];
    let teamMembers = [];

    if (fs.existsSync(leaveRequestsPath)) {
      leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
    }
    if (fs.existsSync(teamMembersPath)) {
      teamMembers = JSON.parse(fs.readFileSync(teamMembersPath, 'utf8'));
    }

    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    const monthLeaveRequests = leaveRequests.filter(req => {
      const startDate = new Date(req.startDate);
      return startDate >= currentMonth && startDate < nextMonth;
    });

    const workingDaysInMonth = 22;
    const totalTeamMembers = teamMembers.length || 1;
    const totalPossibleWorkDays = totalTeamMembers * workingDaysInMonth;

    const approvedLeaveRequests = monthLeaveRequests.filter(req => req.status === 'approved');
    const totalLeaveDays = approvedLeaveRequests.reduce((sum, req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    const billableDays = totalPossibleWorkDays - totalLeaveDays;
    const absenteeismRate = ((totalLeaveDays / totalPossibleWorkDays) * 100).toFixed(1);

    res.json({
      billableDays,
      leaveDays: totalLeaveDays,
      absenteeismRate: `${absenteeismRate}%`,
      teamSize: totalTeamMembers
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============= UTILITY ENDPOINTS =============

// Email webhook for receiving leave requests via email
app.post('/api/email-webhook/leave-request', async (req, res) => {
  try {
    const { from, to, subject, body, attachments } = req.body;
    
    console.log('\n[EMAIL WEBHOOK] Received leave request email');
    console.log('From (Team Member):', from);
    console.log('To (CSP):', to);
    console.log('Subject:', subject);
    
    // Parse email body to extract leave request details
    const leaveData = parseLeaveRequestEmail(body);
    
    if (!leaveData) {
      return res.status(400).json({ error: 'Could not parse leave request from email' });
    }
    
    // Extract CSP info from recipient email (the CSP who received the email)
    const cspEmail = to || from; // Fallback to 'from' for backwards compatibility
    const cspName = cspEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Extract team member info from sender email
    const teamMemberEmail = from;
    const teamMemberName = teamMemberEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Create leave request
    const filePath = path.join(__dirname, 'leaveRequests.json');
    let leaveRequests = [];
    
    if (fs.existsSync(filePath)) {
      try {
        leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        leaveRequests = [];
      }
    }
    
    // Validate PTO request
    const validation = validatePTORequest(leaveData);
    if (!validation.valid) {
      // Send rejection email back to CSP
      console.log('[EMAIL WEBHOOK] Validation failed:', validation.errors);
      return res.status(400).json({ 
        error: 'PTO request validation failed', 
        validationErrors: validation.errors,
        note: 'Rejection email would be sent to ' + cspEmail
      });
    }
    
    const newRequest = {
      ...leaveData,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      status: 'csp-review',
      assignedTo: cspName,
      assignedToEmail: cspEmail,
      days: validation.days,
      ptoBalance: validation.balance,
      history: [{
        action: 'submitted-via-email',
        actor: teamMemberName,
        timestamp: new Date().toISOString(),
        note: `Team member ${teamMemberName} (${from}) emailed CSP ${cspName} (${cspEmail})`
      }, {
        action: 'auto-assigned-to-csp',
        actor: 'System',
        timestamp: new Date().toISOString(),
        note: `Automatically assigned to ${cspName} based on recipient email`
      }],
      validationPassed: true,
      submittedBy: teamMemberName,
      submittedByEmail: from,
      submissionMethod: 'email'
    };
    
    leaveRequests.push(newRequest);
    fs.writeFileSync(filePath, JSON.stringify(leaveRequests, null, 2));
    
    // Create notification for the assigned CSP
    createNotification({
      type: 'new_request',
      title: 'PTO Request Assigned to You',
      message: `${teamMemberName} submitted leave request via email: ${validation.days} days of ${leaveData.leaveType}`,
      recipientRole: 'csp',
      recipient: cspName,
      recipientEmail: cspEmail,
      relatedId: newRequest.id,
      priority: 'high',
      teamMember: leaveData.teamMember || teamMemberName,
      leaveType: leaveData.leaveType
    });
    
    console.log('✅ Leave request created from email:', newRequest.id);
    console.log(`✅ Auto-assigned to CSP: ${cspName} (${cspEmail})`);
    
    res.json({ 
      success: true, 
      message: 'Leave request received and processed',
      requestId: newRequest.id,
      assignedTo: cspName,
      assignedToEmail: cspEmail,
      validation: {
        days: validation.days,
        balance: validation.balance
      }
    });
    
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Failed to process email leave request' });
  }
});

// Helper: Parse leave request from email body
function parseLeaveRequestEmail(emailBody) {
  try {
    // Expected format in email:
    // Team Member: John Doe
    // Leave Type: vacation
    // Start Date: 2025-12-01
    // End Date: 2025-12-10
    // Reason: Family vacation
    
    const lines = emailBody.split('\n');
    const data = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().startsWith('team member:')) {
        data.teamMember = trimmed.split(':')[1].trim();
      } else if (trimmed.toLowerCase().startsWith('leave type:')) {
        data.leaveType = trimmed.split(':')[1].trim().toLowerCase();
      } else if (trimmed.toLowerCase().startsWith('start date:')) {
        data.startDate = trimmed.split(':')[1].trim();
      } else if (trimmed.toLowerCase().startsWith('end date:')) {
        data.endDate = trimmed.split(':')[1].trim();
      } else if (trimmed.toLowerCase().startsWith('reason:')) {
        data.reason = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      }
    }
    
    // Validate required fields
    if (!data.teamMember || !data.leaveType || !data.startDate || !data.endDate) {
      console.log('Missing required fields in email:', data);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
}

// ============= ABSENTEEISM SYNC FROM GOOGLE SHEETS (READ-ONLY) =============
// 
// IMPORTANT: This sync endpoint ONLY READS from Google Sheets.
// It does NOT modify, delete, or write to the original Google Sheets.
// Data flows: Google Sheets (READ) → Local Cache → Neon DB (Your Local Storage)
// 
// Sync absenteeism data directly from your Google Sheets
app.post('/api/sync/absenteeism-from-google-sheets', async (req, res) => {
  try {
    const { spreadsheetId, apiKey, sheetName } = req.body;
    if (!spreadsheetId || !apiKey) {
      return res.status(400).json({ error: 'spreadsheetId and apiKey are required' });
    }

    console.log(`[API] Starting READ-ONLY sync from Google Sheets`);
    console.log(`[API] Spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
    console.log(`[API] Sheet: ${sheetName || 'Absenteeism'}`);
    console.log(`[API] Note: Original Google Sheets will NOT be modified`);

    // READ-ONLY: Fetch directly from Google Sheets API (no modifications)
    const syncResult = await readAbsenteeismFromGoogleSheets(spreadsheetId, apiKey, sheetName || 'Absenteeism');

    if (!syncResult.success) {
      console.error('[API] Sync failed:', syncResult.error);
      return res.status(400).json({ 
        error: syncResult.error,
        details: 'Failed to read from Google Sheets',
        fullError: syncResult
      });
    }

    let records = syncResult.records;
    console.log(`[API] Fetched ${records.length} records, deduplicating...`);

    // Deduplicate records
    records = deduplicateRecords(records);

    // Validate and clean each record
    const validationResults = records.map(r => validateAbsenteeismRecord(r));
    const validRecords = validationResults
      .filter(v => v.valid)
      .map(v => v.cleanedRecord);

    const invalidCount = records.length - validRecords.length;
    if (invalidCount > 0) {
      console.warn(`[API] ${invalidCount} records failed validation`);
    }

    // Insert into LOCAL Neon database only (not back to Google Sheets)
    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of validRecords) {
      try {
        // Writing to local Neon database only, never to Google Sheets
        await createAbsenteeismReport(record);
        insertedCount++;
      } catch (err) {
        console.warn(`[API] Failed to insert record for ${record.nameOfAbsentee}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`[API] Sync complete: ${insertedCount} inserted, ${skippedCount} skipped, ${invalidCount} invalid`);

    res.json({
      success: true,
      summary: {
        fetched: syncResult.totalFetched,
        normalized: syncResult.totalNormalized,
        deduplicated: records.length,
        validated: validRecords.length,
        inserted: insertedCount,
        skipped: skippedCount,
        invalid: invalidCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Sync error:', error);
    res.status(500).json({ error: 'Failed to sync absenteeism data', details: error.message });
  }
});

// Get Google Sheets sync status
app.get('/api/sync/absenteeism-sheets-status', (req, res) => {
  try {
    // Allow unauthenticated access to check sync status
    const metadata = getAbsenteeismCacheMetadata();
    if (!metadata) {
      return res.json({
        status: 'not-synced',
        message: 'No sync has been performed yet'
      });
    }

    res.json({
      status: 'synced',
      ...metadata
    });
  } catch (error) {
    console.error('[API] Status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// ============= ABSENTEEISM SYNC FROM GOOGLE SHEETS =============

// Sync absenteeism data from your Google Sheets API
app.post('/api/sync/absenteeism-from-sheets', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return res.status(403).json({ error: 'Only admins/managers can sync absenteeism data' });
    }

    const { sheetsApiUrl } = req.body;
    if (!sheetsApiUrl) {
      return res.status(400).json({ error: 'sheetsApiUrl is required' });
    }

    console.log(`[API] Starting READ-ONLY sync from: ${sheetsApiUrl}`);
    console.log(`[API] Note: Original Google Sheets will NOT be modified`);

    // READ-ONLY: Fetch from Google Sheets API (GET requests only)
    const syncResult = await syncAbsenteeismFromSheets(sheetsApiUrl);

    if (!syncResult.success) {
      return res.status(400).json({ 
        error: syncResult.error,
        details: 'Failed to fetch from Google Sheets API'
      });
    }

    let records = syncResult.records;
    console.log(`[API] Fetched ${records.length} records, deduplicating...`);

    // Deduplicate records
    records = deduplicateRecords(records);

    // Validate and clean each record
    const validationResults = records.map(r => validateAbsenteeismRecord(r));
    const validRecords = validationResults
      .filter(v => v.valid)
      .map(v => v.cleanedRecord);

    const invalidCount = records.length - validRecords.length;
    if (invalidCount > 0) {
      console.warn(`[API] ${invalidCount} records failed validation`);
    }

    // Insert into LOCAL Neon database only (not back to Google Sheets)
    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of validRecords) {
      try {
        // Writing to local Neon database only, never to Google Sheets
        await createAbsenteeismReport(record);
        insertedCount++;
      } catch (err) {
        console.warn(`[API] Failed to insert record for ${record.nameOfAbsentee}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`[API] Sync complete: ${insertedCount} inserted, ${skippedCount} skipped, ${invalidCount} invalid`);

    res.json({
      success: true,
      summary: {
        fetched: syncResult.totalFetched,
        normalized: syncResult.totalNormalized,
        deduplicated: records.length,
        validated: validRecords.length,
        inserted: insertedCount,
        skipped: skippedCount,
        invalid: invalidCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Sync error:', error);
    res.status(500).json({ error: 'Failed to sync absenteeism data', details: error.message });
  }
});

// Get sync status and cached records
app.get('/api/sync/absenteeism-status', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const cachedRecords = getCachedRecords();
    res.json({
      status: 'ready',
      cachedRecords: cachedRecords.length,
      lastSync: cachedRecords.length > 0 ? cachedRecords[0].syncedAt : null,
      cacheFile: 'server/cache/absenteeism-sync-cache.json'
    });
  } catch (error) {
    console.error('[API] Status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Absenteeism Reports API

// Get all absenteeism reports (with CSP filtering)
app.get('/api/absenteeism-reports', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    // Allow unauthenticated access to view synced data
    // Use DB
    const reports = await getAbsenteeismReports(user && user.role === 'csp' ? user.name : null);
    res.json({ success: true, data: reports || [] });
  } catch (error) {
    console.error('Error fetching absenteeism reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create absenteeism report
app.post('/api/absenteeism-reports', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'csp' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only CSPs can create reports' });
    }
    const reportData = req.body;
    // ensure csp is set to creator
    reportData.csp = user.name;
    const created = await createAbsenteeismReport(reportData);
    res.json({ success: true, id: created.id, data: created });
  } catch (error) {
    console.error('Error creating absenteeism report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update absenteeism report
app.put('/api/absenteeism-reports/:id', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'csp' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only CSPs can update reports' });
    }

    const { id } = req.params;
    // fetch existing to verify ownership
    const existing = (await getAbsenteeismReports(user.role === 'csp' ? user.name : null)).find(r => r.id === id);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (user.role === 'csp' && existing.csp !== user.name) return res.status(403).json({ error: 'You can only update your own reports' });

    const updated = await updateAbsenteeismReport(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating absenteeism report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete absenteeism report
app.delete('/api/absenteeism-reports/:id', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'csp' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only CSPs can delete reports' });
    }

    const { id } = req.params;
    const existing = (await getAbsenteeismReports(user.role === 'csp' ? user.name : null)).find(r => r.id === id);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (user.role === 'csp' && existing.csp !== user.name) return res.status(403).json({ error: 'You can only delete your own reports' });

    await deleteAbsenteeismReport(id);
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting absenteeism report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Export absenteeism reports to Google Sheets
app.post('/api/absenteeism-reports/export', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'csp' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only CSPs can export reports' });
    }

    const { entries, csp } = req.body;

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'No entries to export' });
    }

    const ABSENTEEISM_SPREADSHEET_ID = process.env.ABSENTEEISM_SPREADSHEET_ID || process.env.SPREADSHEET_ID;

    if (!ABSENTEEISM_SPREADSHEET_ID) {
      return res.status(400).json({ error: 'Absenteeism spreadsheet not configured' });
    }

    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      return res.status(400).json({ error: 'Google Sheets not authenticated' });
    }

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Prepare rows for export
    const rows = entries.map((entry) => [
      entry.weekStart,
      entry.startDate,
      entry.endDate,
      entry.noOfDays,
      entry.noOfDaysNoWknd,
      entry.nameOfAbsentee,
      entry.reasonForAbsence,
      entry.absenteeismAuthorised,
      entry.leaveFormSent,
      entry.comment,
      entry.client,
      entry.csp,
      entry.country,
      entry.weekNo,
      entry.month,
      entry.year,
      entry.timeStamp
    ]);

    // Append to Input sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: 'Input!A:Q',
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });

    // Append to Reporting sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: 'Reporting!A:Q',
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });

    console.log(`✅ Exported ${rows.length} absenteeism entries to Google Sheets`);
    res.json({ success: true, message: `Exported ${rows.length} entries` });
  } catch (error) {
    console.error('Error exporting absenteeism reports:', error);
    res.status(500).json({ error: 'Failed to export reports' });
  }
});

// System Settings API
app.get('/api/settings/system', (req, res) => {
  try {
    const settingsPath = join(__dirname, 'systemSettings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = safeJsonParse(fs.readFileSync(settingsPath, 'utf8'));
      res.json(settings);
    } else {
      // Return default settings
      res.json({
        general: {
          companyName: 'ZimWorx',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          workingDaysPerWeek: 5,
        },
        pto: {
          defaultAnnualDays: 15,
          defaultSickDays: 10,
          carryOverEnabled: true,
          maxCarryOverDays: 5,
          requireDocumentation: false,
          autoApproveLimit: 0,
        },
        notifications: {
          emailEnabled: true,
          pushEnabled: false,
          digestEnabled: true,
          reminderDaysBefore: 3,
        },
        security: {
          sessionTimeout: 30,
          requirePasswordChange: false,
          passwordExpiryDays: 90,
          twoFactorEnabled: false,
        },
        integrations: {
          googleSheetsEnabled: true,
          slackEnabled: false,
          teamsEnabled: false,
        },
      });
    }
  } catch (error) {
    console.error('Error reading system settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

app.post('/api/settings/system', (req, res) => {
  try {
    const settingsPath = join(__dirname, 'systemSettings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving system settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Leave Query/Messaging Endpoint
app.post('/api/leave-queries', (req, res) => {
  const { requestId, teamMember, message, timestamp } = req.body;
  const queriesPath = path.join(__dirname, 'leaveQueries.json');
  
  let queries = [];
  if (fs.existsSync(queriesPath)) {
    try {
      queries = JSON.parse(fs.readFileSync(queriesPath, 'utf8'));
    } catch (e) {
      queries = [];
    }
  }
  
  // Find CSP assigned to this team member
  let assignedCSP = null;
  let assignedCSPEmail = null;
  
  try {
    const teamMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (fs.existsSync(teamMetaPath)) {
      const teamMeta = JSON.parse(fs.readFileSync(teamMetaPath, 'utf8'));
      const teamMemberData = teamMeta.find(tm => 
        tm.employeeId === teamMember || tm.teamMemberName === teamMember
      );
      
      if (teamMemberData && teamMemberData.csp) {
        assignedCSPEmail = teamMemberData.csp;
        assignedCSP = teamMemberData.csp.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  } catch (error) {
    console.log('Could not find assigned CSP:', error.message);
  }
  
  const newQuery = {
    id: Date.now().toString(),
    requestId: requestId || 'general',
    teamMember,
    message,
    timestamp: timestamp || new Date().toISOString(),
    assignedCSP,
    assignedCSPEmail,
    status: 'pending',
    response: null
  };
  
  queries.push(newQuery);
  fs.writeFileSync(queriesPath, JSON.stringify(queries, null, 2));
  
  // Create notification for CSP
  createNotification({
    type: 'leave_query',
    title: 'Leave Request Query',
    message: `${teamMember} sent a query: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
    recipientRole: 'csp',
    recipient: assignedCSP,
    recipientEmail: assignedCSPEmail,
    relatedId: requestId,
    priority: 'medium',
    teamMember: teamMember
  });
  
  res.status(201).json({ 
    success: true, 
    message: 'Query sent to CSP',
    queryId: newQuery.id,
    assignedCSP
  });
});

// Get leave queries (for CSP to view)
app.get('/api/leave-queries', (req, res) => {
  const queriesPath = path.join(__dirname, 'leaveQueries.json');
  
  if (!fs.existsSync(queriesPath)) {
    return res.json([]);
  }
  
  try {
    const queries = JSON.parse(fs.readFileSync(queriesPath, 'utf8'));
    res.json(queries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load queries' });
  }
});

// Get CSP's assigned team members and clients
app.get('/api/csp/my-team', (req, res) => {
  const { cspEmail } = req.query;
  
  if (!cspEmail) {
    return res.status(400).json({ error: 'CSP email required' });
  }
  
  try {
    const teamMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    if (!fs.existsSync(teamMetaPath)) {
      return res.json({ teamMembers: [], clients: [] });
    }
    
    const teamMeta = JSON.parse(fs.readFileSync(teamMetaPath, 'utf8'));
    
    // Find all team members assigned to this CSP
    const myTeamMembers = teamMeta.filter(tm => {
      if (!tm.csp) return false;
      // Handle both email and name formats
      if (tm.csp.includes('@')) {
        return tm.csp.toLowerCase() === cspEmail.toLowerCase();
      } else {
        // If CSP field contains name, construct email and compare
        const cspEmailGuess = tm.csp.toLowerCase().replace(/\s+/g, '.') + '@zimworx.org';
        return cspEmailGuess === cspEmail.toLowerCase();
      }
    });
    
    // Extract unique clients
    const clients = [...new Set(myTeamMembers.map(tm => tm.teamMemberName).filter(Boolean))];
    
    // Group team members by client
    const teamByClient = {};
    myTeamMembers.forEach(tm => {
      const client = tm.teamMemberName || 'Unassigned';
      if (!teamByClient[client]) {
        teamByClient[client] = [];
      }
      teamByClient[client].push({
        name: tm.employeeId,
        email: tm.email,
        role: tm.department,
        client: client
      });
    });
    
    res.json({
      csp: cspEmail,
      totalTeamMembers: myTeamMembers.length,
      totalClients: clients.length,
      clients: clients,
      teamMembers: myTeamMembers.map(tm => ({
        name: tm.employeeId,
        email: tm.email,
        client: tm.teamMemberName,
        role: tm.department,
        joinDate: tm.joinDate
      })),
      teamByClient: teamByClient
    });
  } catch (error) {
    console.error('Error fetching CSP team:', error);
    res.status(500).json({ error: 'Failed to load team data' });
  }
});

// Get leave requests filtered by CSP
app.get('/api/csp/my-requests', (req, res) => {
  const { cspEmail } = req.query;
  
  if (!cspEmail) {
    return res.status(400).json({ error: 'CSP email required' });
  }
  
  try {
    const filePath = path.join(__dirname, 'leaveRequests.json');
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }
    
    const leaveRequests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Filter requests assigned to this CSP
    const myRequests = leaveRequests.filter(req => {
      if (!req.assignedToEmail) return false;
      return req.assignedToEmail.toLowerCase() === cspEmail.toLowerCase();
    });
    
    // Group by client
    const requestsByClient = {};
    myRequests.forEach(req => {
      const client = req.clientName || 'Unassigned Client';
      if (!requestsByClient[client]) {
        requestsByClient[client] = [];
      }
      requestsByClient[client].push(req);
    });
    
    res.json({
      csp: cspEmail,
      totalRequests: myRequests.length,
      requests: myRequests,
      requestsByClient: requestsByClient,
      summary: {
        pending: myRequests.filter(r => r.status === 'csp-review').length,
        approved: myRequests.filter(r => r.status === 'client-approved' || r.status === 'approved').length,
        rejected: myRequests.filter(r => r.status === 'rejected' || r.status === 'client-declined').length
      }
    });
  } catch (error) {
    console.error('Error fetching CSP requests:', error);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

// Auto-generate Absenteeism Report from Approved Leave Requests
app.get('/api/absenteeism/auto-generate', (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { startDate, endDate, csp } = req.query;
    
    // Read leave requests
    const leaveRequestsPath = path.join(__dirname, 'leaveRequests.json');
    if (!fs.existsSync(leaveRequestsPath)) {
      return res.json({ success: true, records: [] });
    }
    
    let leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf-8'));
    
    // Filter approved requests
    leaveRequests = leaveRequests.filter(lr => 
      lr.status === 'approved' || lr.status === 'client-approved' || lr.status === 'sent-to-payroll'
    );
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      leaveRequests = leaveRequests.filter(lr => {
        const leaveStart = new Date(lr.startDate);
        const leaveEnd = new Date(lr.endDate);
        return (leaveStart >= start && leaveStart <= end) || 
               (leaveEnd >= start && leaveEnd <= end) ||
               (leaveStart <= start && leaveEnd >= end);
      });
    }
    
    // Filter by CSP if user is CSP role
    if (user && user.role === 'csp') {
      leaveRequests = leaveRequests.filter(lr => lr.assignedTo === user.name);
    } else if (csp) {
      leaveRequests = leaveRequests.filter(lr => lr.assignedTo === csp);
    }
    
    // Read team member metadata
    const metaPath = path.join(__dirname, 'teamMemberMeta.json');
    let teamMemberMeta = [];
    if (fs.existsSync(metaPath)) {
      teamMemberMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    
    // Generate absenteeism records
    const records = leaveRequests.map(lr => {
      const meta = teamMemberMeta.find(m => 
        m.employeeId === lr.teamMember || 
        m.teamMemberName === lr.teamMember ||
        m.email === lr.teamMemberEmail
      );
      
      const startDate = new Date(lr.startDate);
      const endDate = new Date(lr.endDate);
      
      // Calculate week start (Sunday)
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      // Calculate business days (excluding weekends and holidays)
      const businessDays = calculateBusinessDaysWithHolidays(lr.startDate, lr.endDate);
      
      // Calculate calendar days
      const calendarDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Get week number
      const weekNumber = getWeekNumber(startDate);
      
      return {
        weekStart: weekStart.toISOString().split('T')[0],
        startDate: lr.startDate,
        endDate: lr.endDate,
        noOfDays: calendarDays,
        noOfDaysExcludingWeekends: businessDays,
        nameOfAbsentee: lr.teamMember || lr.employeeName,
        reasonForAbsence: lr.leaveType || 'PTO',
        absenteeismAuthorised: 'Yes',
        leaveFormSent: lr.submissionMethod === 'official-form' ? 'Yes' : 'No',
        comment: lr.reason || '',
        client: meta?.teamMemberName || 'Unassigned',
        csp: lr.assignedTo || meta?.csp || 'N/A',
        country: meta?.country || 'Zimbabwe',
        weekNo: weekNumber,
        month: startDate.toLocaleDateString('en-US', { month: 'long' }),
        year: startDate.getFullYear(),
        timestamp: lr.approvedAt || lr.timestamp || new Date().toISOString(),
        requestId: lr.id
      };
    });
    
    res.json({
      success: true,
      count: records.length,
      records: records.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    });
    
  } catch (error) {
    console.error('Error auto-generating absenteeism report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

// Import historical absenteeism data from Google Sheets
app.post('/api/absenteeism/import-from-sheets', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== 'csp' && user.role !== 'admin' && user.role !== 'director')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const ABSENTEEISM_SPREADSHEET_ID = process.env.ABSENTEEISM_SPREADSHEET_ID || process.env.SPREADSHEET_ID;
    
    if (!ABSENTEEISM_SPREADSHEET_ID) {
      return res.status(400).json({ error: 'Absenteeism spreadsheet not configured. Please add ABSENTEEISM_SPREADSHEET_ID to your .env file.' });
    }

    // Use service account authentication (simpler and more reliable)
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'google-credentials.json'), 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    console.log('=== IMPORT STARTING ===');
    console.log('Spreadsheet ID:', ABSENTEEISM_SPREADSHEET_ID);
    
    // Get spreadsheet metadata to find available sheets
    console.log('Fetching spreadsheet metadata...');
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
    });
    
    const availableSheets = metadata.data.sheets.map(s => s.properties.title);
    console.log('✅ Available sheets:', availableSheets);
    
    // Try to find the right sheet (Input, Sheet1, or first available)
    const sheetName = availableSheets.find(name => 
      name.toLowerCase() === 'input' || 
      name.toLowerCase() === 'absenteeism' ||
      name.toLowerCase() === 'sheet1'
    ) || availableSheets[0];
    
    console.log(`Using sheet: ${sheetName}`);
    
    // Read from the selected sheet (columns A through Q)
    const range = `${sheetName}!A2:Q`; // Start from row 2 to skip headers
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return res.json({ success: true, imported: 0, message: 'No data found in Google Sheets' });
    }

    // Helper function to parse dates from Google Sheets
    const parseSheetDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        // Try parsing as ISO date first
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    // Map Google Sheets rows to absenteeism records
    const records = [];
    let importedCount = 0;
    let skippedCount = 0;
    let errorLog = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows
      if (!row[0] && !row[1] && !row[5]) continue;

      try {
        const record = {
          id: `imported-${Date.now()}-${importedCount}`,
          weekStart: parseSheetDate(row[0]),
          startDate: parseSheetDate(row[1]),
          endDate: parseSheetDate(row[2]),
          noOfDays: parseInt(row[3]) || 0,
          noOfDaysNoWknd: parseInt(row[4]) || 0,
          nameOfAbsentee: row[5] || null,
          reasonForAbsence: row[6] || null,
          absenteeismAuthorised: row[7] === 'Yes' || row[7] === 'TRUE' || row[7] === true ? 'Yes' : 'No',
          leaveFormSent: row[8] === 'Yes' || row[8] === 'TRUE' || row[8] === true ? 'Yes' : 'No',
          comment: row[9] || '',
          client: row[10] || 'TBD',
          csp: row[11] || user.name,
          country: row[12] || 'Zimbabwe',
          weekNo: parseInt(row[13]) || 0,
          month: row[14] || '',
          year: parseInt(row[15]) || new Date().getFullYear(),
          timeStamp: parseSheetDate(row[16]) ? new Date(row[16]).toISOString() : new Date().toISOString()
        };
        
        // Validate required fields
        if (!record.nameOfAbsentee || !record.startDate || !record.endDate) {
          errorLog.push(`Row ${i + 2}: Missing required fields`);
          skippedCount++;
          continue;
        }

        // Filter by CSP if user is CSP role
        if (user.role === 'csp' && record.csp !== user.name) {
          skippedCount++;
          continue;
        }

        // Save to PostgreSQL database via Neon
        await createAbsenteeismReport(record);
        records.push(record);
        importedCount++;
        
      } catch (error) {
        console.error(`Error importing row ${i + 2}:`, error.message);
        errorLog.push(`Row ${i + 2}: ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`✅ Import complete: ${importedCount} imported, ${skippedCount} skipped`);
    if (errorLog.length > 0) {
      console.log('Import errors:', errorLog.slice(0, 10)); // Log first 10 errors
    }

    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: rows.length,
      message: `Successfully imported ${importedCount} records from Google Sheets to PostgreSQL database`,
      errors: errorLog.length > 0 ? errorLog.slice(0, 10) : undefined
    });

  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errors: error.errors
    });
    res.status(500).json({ 
      error: 'Failed to import data', 
      details: error.message,
      hint: error.message.includes('403') || error.message.includes('permission') 
        ? 'Make sure the Google Sheet is shared with: reportinghub@reportinghub-479913.iam.gserviceaccount.com'
        : undefined
    });
  }
});

// Get historical absenteeism data from Google Sheets (read-only preview)
app.get('/api/absenteeism/sheets-preview', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ABSENTEEISM_SPREADSHEET_ID = process.env.ABSENTEEISM_SPREADSHEET_ID || process.env.SPREADSHEET_ID;
    
    if (!ABSENTEEISM_SPREADSHEET_ID) {
      return res.status(400).json({ error: 'Absenteeism spreadsheet not configured' });
    }

    // Check if Google auth is available
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      return res.status(401).json({ error: 'Google Sheets not authenticated' });
    }

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // Read from Input sheet
    const range = 'Input!A2:Q100'; // Get first 100 rows
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ABSENTEEISM_SPREADSHEET_ID,
      range: range,
    });

    const rows = response.data.values || [];
    
    // Map to structured data
    const records = rows
      .filter(row => row[0] || row[1]) // Filter out empty rows
      .map((row, index) => ({
        id: `preview-${index}`,
        weekStart: row[0] || null,
        startDate: row[1] || null,
        endDate: row[2] || null,
        noOfDays: parseInt(row[3]) || 0,
        noOfDaysNoWknd: parseInt(row[4]) || 0,
        nameOfAbsentee: row[5] || null,
        reasonForAbsence: row[6] || null,
        absenteeismAuthorised: row[7] || 'No',
        leaveFormSent: row[8] || 'No',
        comment: row[9] || '',
        client: row[10] || 'TBD',
        csp: row[11] || 'N/A',
        country: row[12] || 'Zimbabwe',
        weekNo: parseInt(row[13]) || 0,
        month: row[14] || '',
        year: parseInt(row[15]) || new Date().getFullYear(),
        timeStamp: row[16] || ''
      }));

    // Filter by CSP if user is CSP role
    const filteredRecords = user.role === 'csp' 
      ? records.filter(r => r.csp === user.name)
      : records;

    res.json({
      success: true,
      count: filteredRecords.length,
      total: records.length,
      records: filteredRecords
    });

  } catch (error) {
    console.error('Error previewing Google Sheets data:', error);
    res.status(500).json({ error: 'Failed to preview data', details: error.message });
  }
});

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(new Date(date).getFullYear(), new Date(date).getMonth(), new Date(date).getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get US Federal Holidays
app.get('/api/holidays/:year', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const holidays = getUSFederalHolidayNames(year);
    
    res.json({
      year,
      holidays: holidays.map(h => ({
        date: h.date.toISOString().split('T')[0],
        name: h.name,
        dayOfWeek: h.date.toLocaleDateString('en-US', { weekday: 'long' })
      })),
      count: holidays.length
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Get current year holidays
app.get('/api/holidays', (req, res) => {
  try {
    const year = new Date().getFullYear();
    const holidays = getUSFederalHolidayNames(year);
    
    res.json({
      year,
      holidays: holidays.map(h => ({
        date: h.date.toISOString().split('T')[0],
        name: h.name,
        dayOfWeek: h.date.toLocaleDateString('en-US', { weekday: 'long' })
      })),
      count: holidays.length
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Initialize DB and then start server
dbInit().then(() => {
  console.log('Database initialized (absenteeism_reports)');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
    console.log(`Access from network: http://<your-ip>:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  // still start server but warn
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT} (DB init failed)`);
    console.log(`Access from network: http://<your-ip>:${PORT}`);
  });
});
