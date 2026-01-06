// Official Leave Form Handler
// Manages the official leave application form for the PTO process

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { calculateBusinessDays as calculateBusinessDaysWithHolidays } from './holidays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to official leave form template (in server's public directory)
const OFFICIAL_FORM_PATH = path.join(__dirname, 'public', 'LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx');

/**
 * Check if official form exists
 */
export function isOfficialFormAvailable() {
  return fs.existsSync(OFFICIAL_FORM_PATH);
}

/**
 * Get official form for download
 */
export function getOfficialFormPath() {
  if (!isOfficialFormAvailable()) {
    throw new Error('Official leave form not found at: ' + OFFICIAL_FORM_PATH);
  }
  return OFFICIAL_FORM_PATH;
}

/**
 * Copy official form to server's public directory for web access
 */
export function setupOfficialForm() {
  try {
    if (!isOfficialFormAvailable()) {
      console.warn('⚠️ Official leave form not found at:', OFFICIAL_FORM_PATH);
      return false;
    }
    
    // Create public directory if it doesn't exist
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Copy form to public directory
    const destPath = path.join(publicDir, 'LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx');
    fs.copyFileSync(OFFICIAL_FORM_PATH, destPath);
    
    console.log('✅ Official leave form copied to public directory');
    return true;
  } catch (error) {
    console.error('❌ Error setting up official form:', error.message);
    return false;
  }
}

/**
 * Parse uploaded leave form (DOCX)
 * Extracts data from submitted forms
 */
export async function parseLeaveFormUpload(filePath) {
  try {
    // For DOCX parsing, we'll use mammoth or docxtemplater
    // For now, return a placeholder structure
    
    // TODO: Install and use 'mammoth' package to parse DOCX
    // const mammoth = require('mammoth');
    // const result = await mammoth.extractRawText({ path: filePath });
    // const text = result.value;
    
    // Parse the text for form fields
    // This is a simplified version - enhance based on actual form structure
    
    return {
      parsed: false,
      message: 'DOCX parsing requires mammoth package. Install with: npm install mammoth',
      filePath
    };
  } catch (error) {
    console.error('Error parsing leave form:', error);
    return {
      parsed: false,
      error: error.message
    };
  }
}

/**
 * Generate filled leave form with request data
 * Creates a completed form ready for download
 */
export async function generateFilledLeaveForm(leaveRequestData, outputPath) {
  try {
    if (!isOfficialFormAvailable()) {
      throw new Error('Official form template not available');
    }

    // Load template
    const content = fs.readFileSync(OFFICIAL_FORM_PATH, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Calculate days if not provided
    const days = leaveRequestData.days || calculateBusinessDays(
      new Date(leaveRequestData.startDate),
      new Date(leaveRequestData.endDate)
    );

    // Prepare data for template
    const templateData = {
      employeeName: leaveRequestData.teamMember || leaveRequestData.teamMemberName || '',
      leaveType: leaveRequestData.leaveType || 'Annual Leave',
      startDate: formatDate(leaveRequestData.startDate),
      endDate: formatDate(leaveRequestData.endDate),
      days: days.toString(),
      reason: leaveRequestData.reason || '',
      submittedBy: leaveRequestData.submittedBy || leaveRequestData.teamMember || '',
      submittedDate: formatDate(leaveRequestData.submittedAt || new Date()),
      status: leaveRequestData.status || 'Pending',
      requestId: leaveRequestData.id || 'N/A',
      currentDate: formatDate(new Date()),
    };

    // Fill template with data
    doc.render(templateData);

    // Generate output
    const buf = doc.getZip().generate({ 
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    fs.writeFileSync(outputPath, buf);

    return {
      success: true,
      outputPath,
      fileName: path.basename(outputPath),
      message: 'Form generated successfully'
    };
  } catch (error) {
    console.error('Error generating filled form:', error);
    return {
      success: false,
      error: error.message,
      details: error.properties?.errors || null
    };
  }
}

/**
 * Format date for display in form
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Calculate business days between two dates (excluding weekends and US Federal Holidays)
 */
function calculateBusinessDays(startDate, endDate) {
  return calculateBusinessDaysWithHolidays(startDate, endDate);
}

/**
 * Get form metadata
 */
export function getFormMetadata() {
  try {
    if (!isOfficialFormAvailable()) {
      return {
        available: false,
        message: 'Form not found'
      };
    }
    
    const stats = fs.statSync(OFFICIAL_FORM_PATH);
    
    return {
      available: true,
      path: OFFICIAL_FORM_PATH,
      fileName: 'LABOR OUTSORSING LEAVE APPLICATION FORM.docx',
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      lastModified: stats.mtime,
      publicUrl: '/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx'
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}
