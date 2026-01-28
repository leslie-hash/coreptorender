/**
 * Payroll Package Generator
 * Creates comprehensive ZIP packages for payroll including:
 * - Official Leave Form (DOCX)
 * - Excel Summary Sheet
 * - Supporting Documents (sick notes, EDD documents, etc.)
 * - README.txt with package contents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate official leave form as DOCX by filling in the template cells
 * Since the template doesn't have placeholders, we modify the XML directly
 */
async function generateOfficialLeaveForm(request) {
  try {
    const templatePath = path.join(__dirname, 'public', 'LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx');
    
    if (!fs.existsSync(templatePath)) {
      console.error('Template not found:', templatePath);
      // Fallback: generate form programmatically
      return await generateOfficialLeaveFormProgrammatic(request);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Get the document.xml content
    let docXml = zip.files['word/document.xml'].asText();
    
    // Format dates for display
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    // Prepare template data with all fields
    const data = {
      Name: request.teamMemberName || request.teamMember || request.employeeName || '',
      Department: request.department || 'GTS',
      Client: request.client || 'Zimworx',
      'Leave Type': request.leaveType || '',
      'Start Date': formatDate(request.startDate),
      'End Date': formatDate(request.endDate),
      'Days Requested': String(request.days || ''),
      'Reason for Leave': request.reason || '',
      'Contact Address': request.address || '',
      'Phone Number': request.phoneNumber || '',
      'Coverage Person': request.coverageName || '',
      'Coverage Position': request.coveragePosition || '',
      'Coverage Aware': request.coverageAware || 'Yes',
      'Request ID': request.id || request._id?.toString() || '',
      'Submitted Date': formatDate(request.createdAt || new Date().toISOString()),
      'CSP Review Date': request.cspApprovedAt ? formatDate(request.cspApprovedAt) : '',
      'CSP Notes': request.cspNotes || '',
      'Client Approval Date': request.clientApprovedAt ? formatDate(request.clientApprovedAt) : '',
      'Client Approved By': request.clientApprovedBy || '',
      'Team Member Signature': request.teamMemberSignature || '____________________',
      'CSP Signature': request.cspSignature || '____________________'
    };

    // Find and fill table cells - look for empty cells after label cells
    // The document has rows with: [Label Cell] [Value Cell (empty)]
    // We need to find label cells and fill the next cell
    
    const fieldLabels = ['Name', 'Department', 'Client', 'Leave Type', 'Start Date', 'End Date', 
      'Days Requested', 'Number of Days', 'Reason', 'Contact Address', 'Phone', 'Coverage', 
      'Request ID', 'Date Submitted', 'CSP Review', 'Client Approval'];
    
    // Insert data into empty value cells following label cells
    for (const [label, value] of Object.entries(data)) {
      if (value) {
        // Find rows that contain this label and have an empty value cell
        const labelPattern = new RegExp(
          `(<w:t[^>]*>)(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${label.split(' ')[0]})(</w:t>)`,
          'i'
        );
        
        // Try to find and fill the value cell after the label
        const rowMatch = docXml.match(new RegExp(
          `<w:tr[^>]*>.*?<w:tc[^>]*>.*?<w:t[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?</w:tc>.*?<w:tc[^>]*>.*?</w:tc>.*?</w:tr>`,
          'is'
        ));
        
        if (rowMatch) {
          const originalRow = rowMatch[0];
          // Find the second tc (value cell) and insert text
          const filledRow = originalRow.replace(
            /(<w:tc[^>]*>.*?<\/w:tc>.*?)(<w:tc[^>]*>)(.*?)(<\/w:tc>)/s,
            (match, firstCell, tcStart, cellContent, tcEnd) => {
              // Add text to the empty cell
              const textToInsert = `<w:p><w:r><w:t>${escapeXml(value)}</w:t></w:r></w:p>`;
              // Check if cell content already has paragraph
              if (cellContent.includes('<w:p')) {
                // Insert text into existing paragraph
                const updatedContent = cellContent.replace(
                  /(<w:p[^>]*>)(.*?)(<\/w:p>)/s,
                  `$1$2<w:r><w:t>${escapeXml(value)}</w:t></w:r>$3`
                );
                return `${firstCell}${tcStart}${updatedContent}${tcEnd}`;
              }
              return `${firstCell}${tcStart}${textToInsert}${tcEnd}`;
            }
          );
          docXml = docXml.replace(originalRow, filledRow);
        }
      }
    }
    
    // Update the document.xml in the zip
    zip.file('word/document.xml', docXml);
    
    const buf = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Save to temporary location
    const outputPath = path.join(__dirname, 'exports', 'temp', `Official_Leave_Form_${request.id || 'unknown'}.docx`);
    const tempDir = path.join(__dirname, 'exports', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buf);
    console.log('✅ Official form generated:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error generating official form:', error);
    // Fallback to programmatic generation
    return await generateOfficialLeaveFormProgrammatic(request);
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate official leave form programmatically as DOCX (fallback method)
 */
async function generateOfficialLeaveFormProgrammatic(request) {
  try {
    // Create a Word document using docx library approach
    // Since docx library might not be available, use a simpler XML template approach
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };
    
    const data = {
      teamMemberName: request.teamMemberName || request.teamMember || request.employeeName || '',
      department: request.department || 'GTS',
      client: request.client || 'Zimworx',
      leaveType: request.leaveType || '',
      startDate: formatDate(request.startDate),
      endDate: formatDate(request.endDate),
      days: String(request.days || ''),
      reason: request.reason || '',
      address: request.address || '',
      phoneNumber: request.phoneNumber || '',
      coverageName: request.coverageName || '',
      coveragePosition: request.coveragePosition || '',
      requestId: request.id || request._id?.toString() || '',
      submittedDate: formatDate(request.createdAt || new Date().toISOString()),
      cspApprovedDate: request.cspApprovedAt ? formatDate(request.cspApprovedAt) : '',
      cspNotes: request.cspNotes || '',
      clientApprovedDate: request.clientApprovedAt ? formatDate(request.clientApprovedAt) : '',
      clientApprovedBy: request.clientApprovedBy || '',
      cspName: request.cspName || request.assignedTo || '',
      teamMemberSignature: request.teamMemberSignature || '____________________',
      cspSignature: request.cspSignature || '____________________'
    };
    
    // Create DOCX from scratch using minimal XML structure
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>OFFICIAL LEAVE APPLICATION FORM</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Labor Outsourcing - Leave Management</w:t></w:r>
    </w:p>
    <w:p/>
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="2E75B5"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6000"/></w:tblGrid>
      ${createTableRow('Request ID', data.requestId, true)}
      ${createTableRow('Employee Name', data.teamMemberName, true)}
      ${createTableRow('Department', data.department)}
      ${createTableRow('Client', data.client)}
      ${createTableRow('Leave Type', data.leaveType, true)}
      ${createTableRow('Start Date', data.startDate, true)}
      ${createTableRow('End Date', data.endDate, true)}
      ${createTableRow('Number of Days', data.days, true)}
      ${createTableRow('Reason for Leave', data.reason)}
      ${createTableRow('Contact Address', data.address)}
      ${createTableRow('Phone Number', data.phoneNumber)}
      ${createTableRow('Coverage Person', data.coverageName)}
      ${createTableRow('Coverage Position', data.coveragePosition)}
      ${createTableRow('Date Submitted', data.submittedDate)}
    </w:tbl>
    <w:p/>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>APPROVAL HISTORY</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="10B981"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6000"/></w:tblGrid>
      ${createTableRow('CSP Review Date', data.cspApprovedDate)}
      ${createTableRow('CSP Name', data.cspName)}
      ${createTableRow('CSP Notes', data.cspNotes)}
      ${createTableRow('Client Approval Date', data.clientApprovedDate)}
      ${createTableRow('Client Approved By', data.clientApprovedBy)}
    </w:tbl>
    <w:p/>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>SIGNATURES</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="6366F1"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6000"/></w:tblGrid>
      ${createTableRow('Team Member Signature', data.teamMemberSignature)}
      ${createTableRow('Team Member Name', data.teamMemberName)}
      ${createTableRow('CSP Signature', data.cspSignature)}
      ${createTableRow('CSP Name', data.cspName)}
    </w:tbl>
    <w:p/>
    <w:p><w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr>
      <w:t>This document was automatically generated by LeavePoint PTO Management System.</w:t>
    </w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

    // Create the ZIP structure for DOCX
    const JSZip = PizZip; // PizZip is compatible
    const newZip = new JSZip();
    
    // Add required files
    newZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    
    newZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    
    newZip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
    
    newZip.file('word/document.xml', docXml);
    
    const buf = newZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
    
    const outputPath = path.join(__dirname, 'exports', 'temp', `Official_Leave_Form_${request.id || 'unknown'}.docx`);
    const tempDir = path.join(__dirname, 'exports', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buf);
    console.log('✅ Official form generated (programmatic):', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error generating official form programmatically:', error);
    return null;
  }
}

/**
 * Create a table row for the DOCX document
 */
function createTableRow(label, value, highlight = false) {
  const bgColor = highlight ? '<w:shd w:val="clear" w:fill="F0F9FF"/>' : '';
  const escapedValue = escapeXml(value || '');
  return `<w:tr>
    <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:fill="2E75B5"/></w:tcPr>
      <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r></w:p>
    </w:tc>
    <w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/>${bgColor}</w:tcPr>
      <w:p><w:r><w:t>${escapedValue}</w:t></w:r></w:p>
    </w:tc>
  </w:tr>`;
}

/**
 * Generate Excel summary sheet
 */
async function generateExcelSummary(request) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Request Summary');

    // Style the header
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add data rows
    const rows = [
      ['Request ID', request.id],
      ['Employee Name', request.employeeName || request.teamMember],
      ['Department', request.department || 'GTS'],
      ['Client', request.client || 'N/A'],
      ['Leave Type', request.leaveType],
      ['Start Date', request.startDate],
      ['End Date', request.endDate],
      ['Total Days', request.days],
      ['Reason', request.reason || 'N/A'],
      ['Status', 'Client Approved'],
      ['Submitted Date', new Date(request.createdAt || Date.now()).toLocaleDateString()],
      ['CSP Reviewed By', request.assignedTo || 'N/A'],
      ['CSP Review Date', request.cspApprovedAt ? new Date(request.cspApprovedAt).toLocaleDateString() : 'N/A'],
      ['Client Approved By', request.clientApprovedBy || 'N/A'],
      ['Client Approval Date', request.clientApprovedAt ? new Date(request.clientApprovedAt).toLocaleDateString() : 'N/A'],
      ['Coverage Person', request.coverageName || 'N/A'],
      ['Phone Number', request.phoneNumber || 'N/A'],
      ['Supporting Documents', request.sickNoteUrl ? 'Yes - Included' : 'No']
    ];

    rows.forEach(row => {
      worksheet.addRow({ field: row[0], value: row[1] });
    });

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Save
    const outputPath = path.join(__dirname, 'exports', 'temp', `Summary_Sheet_${request.id}.xlsx`);
    await workbook.xlsx.writeFile(outputPath);
    console.log('✅ Excel summary generated:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error generating Excel summary:', error);
    return null;
  }
}

/**
 * Collect supporting documents
 */
function collectSupportingDocuments(request) {
  const documents = [];

  // Sick note
  if (request.sickNoteUrl) {
    const fullPath = path.join(__dirname, request.sickNoteUrl);
    if (fs.existsSync(fullPath)) {
      documents.push({
        path: fullPath,
        name: `Sick_Note_${path.basename(fullPath)}`,
        type: 'Sick Note'
      });
    }
  }

  // EDD document (maternity)
  if (request.eddDocumentUrl) {
    const fullPath = path.join(__dirname, request.eddDocumentUrl);
    if (fs.existsSync(fullPath)) {
      documents.push({
        path: fullPath,
        name: `EDD_Document_${path.basename(fullPath)}`,
        type: 'EDD Document'
      });
    }
  }

  // Additional attachments
  if (request.attachments && Array.isArray(request.attachments)) {
    request.attachments.forEach((attachment, index) => {
      if (attachment.url) {
        const fullPath = path.join(__dirname, attachment.url);
        if (fs.existsSync(fullPath)) {
          documents.push({
            path: fullPath,
            name: `Attachment_${index + 1}_${path.basename(fullPath)}`,
            type: attachment.type || 'Additional Document'
          });
        }
      }
    });
  }

  return documents;
}

/**
 * Generate README.txt
 */
function generateReadme(request, includedDocuments) {
  const employeeName = request.employeeName || request.teamMember;
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let readme = `══════════════════════════════════════════════════════════════════
                PAYROLL LEAVE REQUEST PACKAGE
══════════════════════════════════════════════════════════════════

Employee Name:      ${employeeName}
Request ID:         ${request.id}
Leave Type:         ${request.leaveType}
Duration:           ${request.startDate} to ${request.endDate} (${request.days} days)
Package Generated:  ${date}

──────────────────────────────────────────────────────────────────
PACKAGE CONTENTS
──────────────────────────────────────────────────────────────────

1. 1_Official_Leave_Form.docx
   └─ Pre-filled official leave application form
   └─ Includes all employee details, dates, and approvals
   └─ Ready for final signature and filing

2. 2_Summary_Sheet.xlsx
   └─ Quick reference sheet for payroll data entry
   └─ Contains all key information in structured format
   └─ Includes approval history and timestamps

`;

  if (includedDocuments.length > 0) {
    readme += `3. Supporting_Documents/\n`;
    includedDocuments.forEach((doc) => {
      readme += `   └─ ${doc.name}\n`;
    });
  } else {
    readme += `3. Supporting_Documents/\n   └─ No additional documents attached\n`;
  }

  readme += `
──────────────────────────────────────────────────────────────────
APPROVAL HISTORY
──────────────────────────────────────────────────────────────────

CSP Review:
  ✓ Reviewed by:    ${request.assignedTo || 'N/A'}
  ✓ Review Date:    ${request.cspApprovedAt ? new Date(request.cspApprovedAt).toLocaleDateString() : 'N/A'}
  ✓ Notes:          ${request.cspNotes || 'None'}

Client Approval:
  ✓ Approved by:    ${request.clientApprovedBy || 'N/A'}
  ✓ Approval Date:  ${request.clientApprovedAt ? new Date(request.clientApprovedAt).toLocaleDateString() : 'N/A'}
  ✓ Notes:          ${request.clientApprovalNotes || 'None'}

──────────────────────────────────────────────────────────────────
INSTRUCTIONS FOR PAYROLL
──────────────────────────────────────────────────────────────────

1. Review the official leave form (Document #1)
2. Use the Excel summary for quick data entry
3. Verify all supporting documents are present
4. Process leave deductions as per company policy
5. File the official form for record keeping
6. Confirm processing in the system

──────────────────────────────────────────────────────────────────
NOTES
──────────────────────────────────────────────────────────────────

${request.leaveType === 'Sick Leave' && !request.sickNoteUrl ? 
  '⚠️ WARNING: Sick leave request submitted without doctor\'s note.\n   Please follow up with employee before processing.\n' : ''}
${request.leaveType === 'Maternity Leave' && !request.eddDocumentUrl ? 
  '⚠️ WARNING: Maternity leave without EDD document.\n   Verify eligibility before processing.\n' : ''}

For questions or issues, contact the CSP team.

══════════════════════════════════════════════════════════════════
                   END OF PACKAGE README
══════════════════════════════════════════════════════════════════
`;

  return readme;
}

/**
 * Create comprehensive payroll package as ZIP
 */
export async function createPayrollPackage(request) {
  try {
    console.log('📦 Starting payroll package generation for:', request.id);

    // Create output directory
    const packagesDir = path.join(__dirname, 'exports', 'payroll_packages');
    if (!fs.existsSync(packagesDir)) {
      fs.mkdirSync(packagesDir, { recursive: true });
    }

    // Generate components
    console.log('📝 Generating official leave form...');
    const officialForm = await generateOfficialLeaveForm(request);
    
    console.log('📊 Generating Excel summary...');
    const excelSummary = await generateExcelSummary(request);
    
    console.log('📎 Collecting supporting documents...');
    const supportingDocs = collectSupportingDocuments(request);

    // Generate README
    const readmeContent = generateReadme(request, supportingDocs);

    // Create ZIP file
    const employeeName = (request.employeeName || request.teamMember).replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const zipFilename = `Payroll_${employeeName}_${timestamp}_${request.id}.zip`;
    const zipPath = path.join(packagesDir, zipFilename);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log('✅ Payroll package created:', zipPath);
        console.log('📦 Package size:', (archive.pointer() / 1024 / 1024).toFixed(2), 'MB');
        
        // Clean up temporary files
        try {
          if (officialForm && fs.existsSync(officialForm)) fs.unlinkSync(officialForm);
          if (excelSummary && fs.existsSync(excelSummary)) fs.unlinkSync(excelSummary);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }

        resolve({
          success: true,
          zipPath,
          zipFilename,
          downloadUrl: `/api/payroll-packages/download/${path.basename(zipFilename)}`,
          size: archive.pointer(),
          contents: {
            officialForm: !!officialForm,
            excelSummary: !!excelSummary,
            supportingDocuments: supportingDocs.length
          }
        });
      });

      archive.on('error', (err) => {
        console.error('❌ Archive error:', err);
        reject(err);
      });

      archive.pipe(output);

      // Add official form
      if (officialForm && fs.existsSync(officialForm)) {
        archive.file(officialForm, { name: '1_Official_Leave_Form.docx' });
      }

      // Add Excel summary
      if (excelSummary && fs.existsSync(excelSummary)) {
        archive.file(excelSummary, { name: '2_Summary_Sheet.xlsx' });
      }

      // Add supporting documents
      if (supportingDocs.length > 0) {
        supportingDocs.forEach(doc => {
          archive.file(doc.path, { name: `3_Supporting_Documents/${doc.name}` });
        });
      }

      // Add README
      archive.append(readmeContent, { name: 'README.txt' });

      archive.finalize();
    });
  } catch (error) {
    console.error('❌ Error creating payroll package:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
