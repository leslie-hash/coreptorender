import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email log file for traceability
const EMAIL_LOG_FILE = path.join(__dirname, 'emailLogs.json');

// Initialize email log if it doesn't exist
if (!fs.existsSync(EMAIL_LOG_FILE)) {
  fs.writeFileSync(EMAIL_LOG_FILE, JSON.stringify([], null, 2));
}

/**
 * Load email settings from emailSettings.json
 */
function loadEmailSettings() {
  const settingsPath = path.join(__dirname, 'emailSettings.json');
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }
  return null;
}

/**
 * Create email transporter using SMTP settings
 */
function createTransporter() {
  const settings = loadEmailSettings();
  
  if (!settings || !settings.enabled) {
    console.log('📧 Email service is disabled in emailSettings.json');
    return null;
  }
  
  // Test mode - log emails instead of sending
  if (settings.testMode) {
    console.log('📧 Email service in TEST MODE - emails will be logged but not sent');
    return 'test-mode';
  }
  
  if (!settings.smtpUser || !settings.smtpPassword) {
    console.warn('⚠️  SMTP credentials not configured in emailSettings.json');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword
    },
    tls: {
      rejectUnauthorized: false // For development - remove in production
    }
  });
}

/**
 * Log email send attempt for traceability
 */
function logEmail(logEntry) {
  try {
    let logs = [];
    if (fs.existsSync(EMAIL_LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(EMAIL_LOG_FILE, 'utf8'));
    }
    
    logs.unshift({
      ...logEntry,
      timestamp: new Date().toISOString(),
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Keep only last 500 emails
    if (logs.length > 500) {
      logs = logs.slice(0, 500);
    }
    
    fs.writeFileSync(EMAIL_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

/**
 * Send email with full traceability
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 * @param {string} options.cc - CC recipients
 * @param {string} options.bcc - BCC recipients
 * @param {Array} options.attachments - File attachments
 * @param {Object} options.metadata - Additional metadata for logging
 * @returns {Promise<Object>} Result with success status and details
 */
export async function sendEmail(options) {
  const settings = loadEmailSettings();
  const transporter = createTransporter();
  
  const logEntry = {
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    metadata: options.metadata || {},
    status: 'pending'
  };
  
  // If email is disabled, log and return
  if (!settings || !settings.enabled) {
    logEntry.status = 'skipped';
    logEntry.reason = 'Email service disabled';
    logEmail(logEntry);
    console.log(`📧 [SKIPPED] Email would be sent to ${options.to}: ${options.subject}`);
    return { success: true, skipped: true, reason: 'Email service disabled' };
  }
  
  // Test mode - log the email content instead of sending
  if (transporter === 'test-mode') {
    logEntry.status = 'test-mode';
    logEntry.reason = 'Test mode enabled - email logged but not sent';
    logEntry.htmlContent = options.html;
    logEntry.textContent = options.text;
    logEmail(logEntry);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📧 [TEST MODE] EMAIL PREVIEW`);
    console.log(`${'='.repeat(60)}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`From: ${settings.fromName} <${settings.fromEmail}>`);
    if (options.cc) console.log(`CC: ${options.cc}`);
    if (options.attachments?.length) console.log(`Attachments: ${options.attachments.length} file(s)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`HTML Content Preview:`);
    // Strip HTML tags for console preview
    const textPreview = options.html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
    console.log(textPreview + (textPreview?.length >= 500 ? '...' : ''));
    console.log(`${'='.repeat(60)}\n`);
    
    return { success: true, testMode: true, logged: true };
  }
  
  if (!transporter) {
    logEntry.status = 'failed';
    logEntry.reason = 'SMTP not configured';
    logEmail(logEntry);
    console.error('❌ Email send failed: SMTP not configured');
    return { success: false, error: 'SMTP not configured' };
  }
  
  try {
    const mailOptions = {
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logEntry.status = 'sent';
    logEntry.messageId = info.messageId;
    logEntry.response = info.response;
    logEmail(logEntry);
    
    console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
    console.log(`   Message ID: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.error = error.message;
    logEntry.stack = error.stack;
    logEmail(logEntry);
    
    console.error(`❌ Email send failed to ${options.to}:`, error.message);
    
    return { success: false, error: error.message };
  }
}

/**
 * Send new leave request notification email
 */
export async function sendNewLeaveRequestEmail(request, cspEmail) {
  const settings = loadEmailSettings();
  
  if (!settings?.notifications?.newRequest) {
    return { success: true, skipped: true, reason: 'New request notifications disabled' };
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0050AA;">🆕 New Leave Request Submitted</h2>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Team Member:</strong></td>
            <td style="padding: 8px 0;">${request.teamMember}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0;">${request.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Dates:</strong></td>
            <td style="padding: 8px 0;">${request.startDate} to ${request.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${request.days} business days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Reason:</strong></td>
            <td style="padding: 8px 0;">${request.reason || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Client:</strong></td>
            <td style="padding: 8px 0;">${request.clientName || 'Not assigned'}</td>
          </tr>
        </table>
      </div>
      
      <p><strong>Action Required:</strong> Please review and process this leave request in the system.</p>
      
      <div style="margin: 20px 0;">
        <a href="${process.env.VITE_API_URL || 'http://localhost:8080'}" 
           style="background: #0050AA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Review Request
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LeavePoint. Request ID: ${request.id}
      </p>
    </div>
  `;
  
  return await sendEmail({
    to: cspEmail,
    subject: `🆕 New Leave Request: ${request.teamMember} - ${request.leaveType}`,
    html,
    text: `New leave request from ${request.teamMember} for ${request.leaveType} (${request.days} days). Please review in the system.`,
    metadata: {
      type: 'new_leave_request',
      requestId: request.id,
      teamMember: request.teamMember,
      leaveType: request.leaveType
    }
  });
}

/**
 * Send CSP approval notification to client
 */
export async function sendCSPApprovalToClientEmail(request, clientEmail, cspName) {
  const settings = loadEmailSettings();
  
  if (!settings?.notifications?.approval) {
    return { success: true, skipped: true, reason: 'Approval notifications disabled' };
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">✅ Leave Request Pending Your Approval</h2>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
        <p><strong>${cspName}</strong> has reviewed and approved the following leave request. Your approval is now required.</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Team Member:</strong></td>
            <td style="padding: 8px 0;">${request.teamMember}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0;">${request.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Dates:</strong></td>
            <td style="padding: 8px 0;">${request.startDate} to ${request.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${request.days} business days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Reason:</strong></td>
            <td style="padding: 8px 0;">${request.reason || 'Not provided'}</td>
          </tr>
        </table>
      </div>
      
      <p><strong>Action Required:</strong> Please review and approve/reject this leave request.</p>
      
      <div style="margin: 20px 0;">
        <a href="${process.env.VITE_API_URL || 'http://localhost:8080'}" 
           style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Review & Approve
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LeavePoint. Request ID: ${request.id}
      </p>
    </div>
  `;
  
  return await sendEmail({
    to: clientEmail,
    subject: `✅ Leave Approval Required: ${request.teamMember} - ${request.leaveType}`,
    html,
    text: `${cspName} has approved ${request.teamMember}'s leave request. Your approval is required.`,
    metadata: {
      type: 'csp_approved_needs_client',
      requestId: request.id,
      teamMember: request.teamMember,
      cspName: cspName
    }
  });
}

/**
 * Send client approval notification to payroll
 */
export async function sendClientApprovalToPayrollEmail(request, clientName) {
  const settings = loadEmailSettings();
  
  if (!settings?.payrollRecipients || settings.payrollRecipients.length === 0) {
    return { success: true, skipped: true, reason: 'No payroll recipients configured' };
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0050AA;">✅ Leave Request Approved by Client</h2>
      
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0050AA;">
        <p><strong>${clientName}</strong> has approved the following leave request. The CSP will send the complete payroll package shortly.</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Team Member:</strong></td>
            <td style="padding: 8px 0;">${request.teamMember}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0;">${request.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Dates:</strong></td>
            <td style="padding: 8px 0;">${request.startDate} to ${request.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${request.days} business days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Client:</strong></td>
            <td style="padding: 8px 0;">${request.clientName || 'Not assigned'}</td>
          </tr>
        </table>
      </div>
      
      <p><strong>Next Steps:</strong> The CSP will send you the complete payroll package with the official form and supporting documents.</p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LeavePoint. Request ID: ${request.id}
      </p>
    </div>
  `;
  
  return await sendEmail({
    to: settings.payrollRecipients.join(','),
    subject: `✅ Client Approved: ${request.teamMember} - ${request.leaveType}`,
    html,
    text: `${clientName} has approved ${request.teamMember}'s leave request for ${request.days} days.`,
    metadata: {
      type: 'client_approved',
      requestId: request.id,
      teamMember: request.teamMember,
      clientName: clientName
    }
  });
}

/**
 * Send payroll package notification email with download link
 */
export async function sendPayrollPackageEmail(request, packageUrl, cspName) {
  const settings = loadEmailSettings();
  
  if (!settings?.payrollRecipients || settings.payrollRecipients.length === 0) {
    return { success: true, skipped: true, reason: 'No payroll recipients configured' };
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7C3AED;">📦 Comprehensive Payroll Package Ready</h2>
      
      <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
        <p><strong>Complete leave request package is now available for processing.</strong></p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Employee Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Team Member:</strong></td>
            <td style="padding: 8px 0;">${request.teamMember}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0;">${request.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Dates:</strong></td>
            <td style="padding: 8px 0;">${request.startDate} to ${request.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${request.days} business days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Client:</strong></td>
            <td style="padding: 8px 0;">${request.clientName || 'Not assigned'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Processed By:</strong></td>
            <td style="padding: 8px 0;">${cspName}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0;">📦 Package Contents</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>✅ Official Leave Application Form (Pre-filled DOCX)</li>
          <li>✅ Detailed Summary Sheet (Excel)</li>
          <li>✅ All Supporting Documents (Sick notes, EDD, etc.)</li>
          <li>✅ README with Instructions and Approval History</li>
        </ul>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${packageUrl}" 
           style="background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          📥 Download Complete Package (ZIP)
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>Note:</strong> This package contains all required documentation for payroll processing. 
        Please download and process at your earliest convenience.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LeavePoint. Request ID: ${request.id}<br>
        Package prepared by: ${cspName}<br>
        Timestamp: ${new Date().toLocaleString()}
      </p>
    </div>
  `;
  
  return await sendEmail({
    to: settings.payrollRecipients.join(','),
    subject: `📦 Payroll Package Ready: ${request.teamMember} - ${request.leaveType}`,
    html,
    text: `Complete payroll package for ${request.teamMember} (${request.leaveType}, ${request.days} days) is ready. Download: ${packageUrl}`,
    metadata: {
      type: 'payroll_package_ready',
      requestId: request.id,
      teamMember: request.teamMember,
      packageUrl: packageUrl,
      cspName: cspName
    }
  });
}

/**
 * Send rejection notification email
 */
export async function sendRejectionEmail(request, rejectedBy, reason, recipientEmail) {
  const settings = loadEmailSettings();
  
  if (!settings?.notifications?.rejection) {
    return { success: true, skipped: true, reason: 'Rejection notifications disabled' };
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">❌ Leave Request Rejected</h2>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
        <p>The following leave request has been rejected by <strong>${rejectedBy}</strong>.</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Team Member:</strong></td>
            <td style="padding: 8px 0;">${request.teamMember}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0;">${request.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Dates:</strong></td>
            <td style="padding: 8px 0;">${request.startDate} to ${request.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${request.days} business days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Rejection Reason:</strong></td>
            <td style="padding: 8px 0; color: #EF4444;">${reason || 'Not provided'}</td>
          </tr>
        </table>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LeavePoint. Request ID: ${request.id}
      </p>
    </div>
  `;
  
  return await sendEmail({
    to: recipientEmail,
    subject: `❌ Leave Request Rejected: ${request.teamMember} - ${request.leaveType}`,
    html,
    text: `Leave request for ${request.teamMember} (${request.leaveType}) has been rejected by ${rejectedBy}. Reason: ${reason}`,
    metadata: {
      type: 'rejection',
      requestId: request.id,
      teamMember: request.teamMember,
      rejectedBy: rejectedBy
    }
  });
}

/**
 * Get email logs for traceability
 */
export function getEmailLogs(filters = {}) {
  try {
    if (!fs.existsSync(EMAIL_LOG_FILE)) {
      return [];
    }
    
    let logs = JSON.parse(fs.readFileSync(EMAIL_LOG_FILE, 'utf8'));
    
    // Apply filters
    if (filters.requestId) {
      logs = logs.filter(log => log.metadata?.requestId === filters.requestId);
    }
    
    if (filters.status) {
      logs = logs.filter(log => log.status === filters.status);
    }
    
    if (filters.type) {
      logs = logs.filter(log => log.metadata?.type === filters.type);
    }
    
    if (filters.since) {
      const sinceDate = new Date(filters.since);
      logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
    }
    
    return logs;
  } catch (error) {
    console.error('Failed to get email logs:', error);
    return [];
  }
}

export default {
  sendEmail,
  sendNewLeaveRequestEmail,
  sendCSPApprovalToClientEmail,
  sendClientApprovalToPayrollEmail,
  sendPayrollPackageEmail,
  sendRejectionEmail,
  getEmailLogs
};
