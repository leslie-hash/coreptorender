/**
 * MongoDB Models for CorePTO
 * Mongoose schemas and models for all data entities
 */

import mongoose from 'mongoose';

// ===== USER SCHEMA =====
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'csp', 'team-member', 'client', 'director', 'finance', 'payroll'], default: 'team-member' },
  cspName: String,
  cspEmail: String,
  clientName: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ===== TEAM MEMBER SCHEMA =====
const teamMemberSchema = new mongoose.Schema({
  teamMemberName: { type: String, required: true },
  email: { type: String, lowercase: true },
  clientName: String,
  employeeId: String,
  csp: String, // CSP email
  cspName: String,
  workStation: String,
  anydesk: String,
  floor: String,
  pmsSoftware: String,
  schedule: String,
  timeZone: String,
  homeAddress: String,
  phoneNumber: String,
  birthday: String,
  annualPTO: { type: Number, default: 20 },
  currentRemainingPTO: { type: Number, default: 20 },
  sickDays: { type: Number, default: 10 },
  source: String,
  sourceTab: String,
  syncedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for fast CSP lookups
teamMemberSchema.index({ csp: 1 });
teamMemberSchema.index({ email: 1 });
teamMemberSchema.index({ teamMemberName: 1 });

// ===== LEAVE REQUEST SCHEMA =====
const leaveRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true }, // LR-xxxxx format
  teamMember: { type: String, required: true },
  teamMemberName: String,
  teamMemberEmail: String,
  client: String,
  clientName: String,
  leaveType: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  days: Number,
  reason: String,
  status: { 
    type: String, 
    enum: ['pending', 'pending-csp-review', 'csp-approved', 'csp-rejected', 'pending-client-approval', 'client-approved', 'client-rejected', 'payroll-processing', 'sent-to-payroll', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // CSP Review
  assignedTo: String,
  assignedToEmail: String,
  cspReviewedBy: String,
  cspReviewedAt: Date,
  cspNotes: String,
  
  // Client Approval
  clientApprovedBy: String,
  clientApprovedAt: Date,
  clientApprovalNotes: String,
  
  // Payroll
  sentToPayrollAt: Date,
  sentToPayrollBy: String,
  payrollPackageUrl: String,
  
  // Signatures
  teamMemberSignature: String,
  teamMemberSignedAt: Date,
  cspSignature: String,
  cspSignedAt: Date,
  
  // Attachments
  sickNoteUrl: String,
  eddDocumentUrl: String,
  attachments: [{
    url: String,
    type: String,
    name: String,
    uploadedAt: Date
  }],
  
  // Metadata - use Mixed type for dates that may have invalid values
  submittedDate: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: mongoose.Schema.Types.Mixed, default: Date.now },
  updatedAt: { type: mongoose.Schema.Types.Mixed, default: Date.now }
});

leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ teamMember: 1 });
leaveRequestSchema.index({ assignedToEmail: 1 });
leaveRequestSchema.index({ submittedDate: -1 });

// ===== CSP SUMMARY SCHEMA =====
const cspSummarySchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  teamMemberCount: { type: Number, default: 0 },
  clientCount: { type: Number, default: 0 },
  sourceTab: String,
  isActive: { type: Boolean, default: true },
  lastSyncedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ===== NOTIFICATION SCHEMA =====
const notificationSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  type: { type: String }, // Allow any notification type
  title: { type: String, required: true },
  message: String,
  teamMemberName: String,
  requestId: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userEmail: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// ===== APPROVAL HISTORY SCHEMA =====
const approvalHistorySchema = new mongoose.Schema({
  requestId: String, // Made optional for legacy data
  action: String, // Allow any action type
  performedBy: String,
  performedByEmail: String,
  notes: String,
  previousStatus: String,
  newStatus: String,
  createdAt: { type: Date, default: Date.now }
});

approvalHistorySchema.index({ requestId: 1 });
approvalHistorySchema.index({ createdAt: -1 });

// ===== SYNC LOG SCHEMA =====
const syncLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['google_sheet', 'hubspot', 'manual'] },
  status: { type: String, enum: ['success', 'failed', 'partial'] },
  teamMembersCount: Number,
  cspsCount: Number,
  clientsCount: Number,
  message: String,
  error: String,
  stack: String,
  duration: Number, // in milliseconds
  createdAt: { type: Date, default: Date.now }
});

syncLogSchema.index({ createdAt: -1 });

// ===== CLIENT SCHEMA =====
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  contactPerson: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  teamMemberCount: { type: Number, default: 0 },
  source: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

clientSchema.index({ name: 1 });

// ===== EMAIL SETTINGS SCHEMA =====
const emailSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  smtpHost: String,
  smtpPort: Number,
  smtpSecure: Boolean,
  smtpUser: String,
  smtpPassword: String,
  fromEmail: String,
  fromName: String,
  payrollRecipients: [String],
  adminRecipients: [String],
  isEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

// ===== ABSENTEEISM REPORT SCHEMA =====
const absenteeismReportSchema = new mongoose.Schema({
  // Original ID from source system (Google Sheets or PostgreSQL)
  sourceId: { type: String, index: true },
  
  // Date fields
  weekStart: Date,
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  
  // Duration
  noOfDays: { type: Number, default: 0 },
  noOfDaysNoWknd: { type: Number, default: 0 }, // Business days (excluding weekends)
  
  // Team member information
  nameOfAbsentee: { type: String, required: true, index: true },
  
  // Absence details
  reasonForAbsence: String, // e.g., "Sick Leave", "PTO", "Holiday"
  absenteeismAuthorised: { type: Boolean, default: false },
  leaveFormSent: { type: Boolean, default: false },
  comment: String,
  
  // Assignment and location
  client: { type: String, index: true },
  csp: { type: String, index: true }, // CSP email
  cspName: String,
  country: { type: String, default: 'Zimbabwe' },
  
  // Time tracking
  weekNo: Number,
  month: String,
  year: { type: Number, index: true },
  timeStamp: Date,
  
  // Metadata
  source: { type: String, enum: ['google-sheets', 'manual', 'import', 'api'], default: 'google-sheets' },
  createdBy: String, // User who created/imported the record
  syncedAt: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
absenteeismReportSchema.index({ csp: 1, startDate: -1 });
absenteeismReportSchema.index({ nameOfAbsentee: 1, year: -1 });
absenteeismReportSchema.index({ client: 1, year: -1, month: 1 });
absenteeismReportSchema.index({ year: -1, month: 1 });

// ===== CREATE MODELS =====
export const User = mongoose.model('User', userSchema);
export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export const CSPSummary = mongoose.model('CSPSummary', cspSummarySchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const ApprovalHistory = mongoose.model('ApprovalHistory', approvalHistorySchema);
export const SyncLog = mongoose.model('SyncLog', syncLogSchema);
export const Client = mongoose.model('Client', clientSchema);
export const EmailSettings = mongoose.model('EmailSettings', emailSettingsSchema);
export const AbsenteeismReport = mongoose.model('AbsenteeismReport', absenteeismReportSchema);

export default {
  User,
  TeamMember,
  LeaveRequest,
  CSPSummary,
  Notification,
  ApprovalHistory,
  SyncLog,
  Client,
  EmailSettings,
  AbsenteeismReport
};
