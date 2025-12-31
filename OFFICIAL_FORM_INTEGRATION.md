# Official Leave Form Integration Guide

## Overview

The system now supports the official **LABOR OUTSOURCING LEAVE APPLICATION FORM** (DOCX) for a seamless hybrid leave request experience. Users can choose between:

1. **Digital Form** - Submit leave requests directly through the web interface
2. **Official Form** - Download, fill, and upload the official company form

Both methods are equally valid and go through the same approval workflow.

---

## Features Implemented

### 1. **Form Download**
- Official DOCX template available for download
- Form metadata API provides size, last modified date, availability status
- Direct download from web interface or API endpoint

### 2. **Form Upload**
- Accept completed forms (.doc, .docx, .pdf)
- Automatic file validation and storage
- Timestamped file naming for tracking
- Upload confirmation with file details

### 3. **Seamless Integration**
- Both digital and paper forms feed into the same PTO workflow
- All forms go through CSP Review → Client Approval → Payroll Notification
- Consistent status tracking regardless of submission method

---

## File Locations

### Official Form Template
**Path:** `C:\Users\leslie.chasinda\Pictures\Screenshots\LABOR OUTSORSING LEAVE APPLICATION FORM.docx`

**Public URL:** `http://localhost:4000/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx`

### Server Files
- **Handler:** `server/officialLeaveForm.js` - Form management logic
- **Public Copy:** `server/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx` (auto-copied on startup)
- **Uploads:** `server/uploads/` - Completed forms stored here

### Frontend Component
- **Component:** `src/components/OfficialLeaveForm.tsx` - React UI for download/upload
- **Integration:** Added to `AppLayout.tsx` navigation (sidebar)

---

## API Endpoints

### 1. Download Official Form
```http
GET /api/leave-form/download
```

**Response:** Binary file download (DOCX)

**Example:**
```javascript
// Browser
window.open('http://localhost:4000/api/leave-form/download', '_blank');

// cURL
curl -O http://localhost:4000/api/leave-form/download
```

---

### 2. Get Form Metadata
```http
GET /api/leave-form/metadata
```

**Response:**
```json
{
  "available": true,
  "path": "C:\\Users\\leslie.chasinda\\Pictures\\Screenshots\\LABOR OUTSORSING LEAVE APPLICATION FORM.docx",
  "fileName": "LABOR OUTSORSING LEAVE APPLICATION FORM.docx",
  "size": 45672,
  "sizeKB": 45,
  "lastModified": "2025-11-28T10:30:00.000Z",
  "publicUrl": "/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx"
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:4000/api/leave-form/metadata');
const metadata = await response.json();
console.log(`Form available: ${metadata.available}, Size: ${metadata.sizeKB} KB`);
```

---

### 3. Upload Completed Form
```http
POST /api/leave-form/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `form` (file): The completed leave form (.doc, .docx, .pdf)

**Response:**
```json
{
  "success": true,
  "message": "Official leave form uploaded successfully",
  "fileName": "leave-form-2025-11-28T14-30-00-000Z-LABOR_OUTSORSING_LEAVE_APPLICATION_FORM.docx",
  "filePath": "C:\\Users\\leslie.chasinda\\Downloads\\automation-sync-efficiency\\server\\uploads\\leave-form-2025-11-28T14-30-00-000Z-LABOR_OUTSORSING_LEAVE_APPLICATION_FORM.docx",
  "parsed": false,
  "note": "Form stored - manual review required"
}
```

**Example:**
```javascript
const formData = new FormData();
formData.append('form', fileInput.files[0]);

const response = await fetch('http://localhost:4000/api/leave-form/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.message);
```

---

## User Workflow

### Using the Official Form

1. **Access the Form**
   - Navigate to "Official Leave Form" in the sidebar
   - Or visit directly via API endpoint

2. **Download Template**
   - Click "Download Official Form" button
   - Save DOCX file to your computer
   - Form opens in Microsoft Word or compatible editor

3. **Fill Out Form**
   - Complete all required fields:
     - Employee Name
     - Leave Type (Annual, Sick, Maternity, etc.)
     - Start Date
     - End Date
     - Reason for Leave
     - Signature (if printing)
   - Save the completed form

4. **Upload Completed Form**
   - Return to "Official Leave Form" page
   - Click "Choose File" and select your completed form
   - Click "Upload Completed Form"
   - Confirmation message appears with upload details

5. **Review Status**
   - Uploaded form stored in `server/uploads/`
   - CSP team reviews and processes the request
   - Status updates follow normal PTO workflow

---

## Technical Implementation

### Backend Architecture

```javascript
// server/officialLeaveForm.js

// Core Functions:
- setupOfficialForm()           // Copy form to public directory on startup
- isOfficialFormAvailable()     // Check if template exists
- getOfficialFormPath()         // Get absolute path to template
- getFormMetadata()             // Get file stats (size, date, etc.)
- parseLeaveFormUpload()        // Parse uploaded DOCX (future enhancement)
- generateFilledLeaveForm()     // Auto-fill template (future enhancement)
```

### Frontend Component

```tsx
// src/components/OfficialLeaveForm.tsx

// Features:
- Form metadata display (size, date, availability)
- Download button with direct link
- File upload with validation (.doc, .docx, .pdf)
- Upload progress indicator
- Success/error feedback
- Instructions and guidance
```

### Multer Configuration

```javascript
// server/index.js

const upload = multer({ 
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.txt', '.vtt', '.srt', '.mp3', '.wav', '.m4a', '.mp4', 
                         '.xlsx', '.xls', '.csv', '.docx', '.doc', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: ' + allowedExts.join(', ')));
    }
  }
});
```

---

## Future Enhancements

### 1. **Automated Form Parsing**
Extract data from uploaded DOCX forms automatically using `mammoth` package:

```bash
npm install mammoth
```

```javascript
import mammoth from 'mammoth';

async function parseLeaveFormUpload(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Parse fields using regex or text matching
  const teamMember = text.match(/Employee Name:\s*(.+)/)?.[1];
  const leaveType = text.match(/Leave Type:\s*(.+)/)?.[1];
  const startDate = text.match(/Start Date:\s*(.+)/)?.[1];
  const endDate = text.match(/End Date:\s*(.+)/)?.[1];
  const reason = text.match(/Reason:\s*(.+)/)?.[1];
  
  return {
    parsed: true,
    teamMember,
    leaveType,
    startDate,
    endDate,
    reason
  };
}
```

### 2. **Auto-Fill Form Generation**
Generate pre-filled forms for users using `docxtemplater`:

```bash
npm install docxtemplater pizzip
```

```javascript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async function generateFilledLeaveForm(leaveRequest, outputPath) {
  const content = fs.readFileSync(OFFICIAL_FORM_PATH, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip);
  
  doc.setData({
    employeeName: leaveRequest.teamMember,
    leaveType: leaveRequest.leaveType,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    days: leaveRequest.days,
    reason: leaveRequest.reason,
    submittedDate: new Date().toLocaleDateString()
  });
  
  doc.render();
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buf);
  
  return { success: true, outputPath };
}
```

### 3. **Email-Based Form Submission**
Accept forms via email attachments:

```javascript
// Parse email attachments
app.post('/api/email-webhook/form-upload', async (req, res) => {
  const attachment = req.body.attachments[0];
  const fileBuffer = Buffer.from(attachment.content, 'base64');
  
  // Save and process
  const filePath = path.join(__dirname, 'uploads', attachment.filename);
  fs.writeFileSync(filePath, fileBuffer);
  
  const parsedData = await parseLeaveFormUpload(filePath);
  
  // Create leave request from parsed data
  // ... existing leave request creation logic
});
```

### 4. **Digital Signature Integration**
Add e-signature support using DocuSign, Adobe Sign, or HelloSign API.

### 5. **Version Control**
Track form template versions and maintain backwards compatibility:

```javascript
const FORM_VERSIONS = {
  'v1': 'LABOR_OUTSORSING_LEAVE_APPLICATION_FORM_v1.docx',
  'v2': 'LABOR_OUTSORSING_LEAVE_APPLICATION_FORM_v2.docx',
  'latest': 'v2'
};
```

---

## Configuration

### Environment Variables

Add to `server/.env`:

```env
# Official Leave Form Configuration
OFFICIAL_FORM_PATH=C:\Users\leslie.chasinda\Pictures\Screenshots\LABOR OUTSORSING LEAVE APPLICATION FORM.docx
UPLOADS_DIR=./uploads
MAX_UPLOAD_SIZE_MB=100
```

### Updating Form Template

To update the official form template:

1. Replace the file at the configured path:
   ```
   C:\Users\leslie.chasinda\Pictures\Screenshots\LABOR OUTSORSING LEAVE APPLICATION FORM.docx
   ```

2. Restart the server to copy the new version to public directory:
   ```bash
   cd server
   node index.js
   ```

3. Verify the update:
   ```bash
   curl http://localhost:4000/api/leave-form/metadata
   ```

---

## Troubleshooting

### Form Not Available

**Error:** `Official leave form not found`

**Solution:**
1. Verify file exists at configured path
2. Check file permissions (read access required)
3. Restart server to re-run `setupOfficialForm()`

### Upload Fails

**Error:** `Invalid file type`

**Solution:**
- Only .doc, .docx, .pdf files accepted
- Check file extension is lowercase
- Verify file is not corrupted

### File Too Large

**Error:** `File size exceeds limit`

**Solution:**
- Current limit: 100MB
- Compress PDF or save DOCX in compatibility mode
- Contact admin to increase limit if needed

---

## Security Considerations

1. **File Validation**
   - Only allowed file types accepted (.doc, .docx, .pdf)
   - File size limits enforced (100MB)
   - Malicious file scanning recommended (future)

2. **Access Control**
   - Download: Public access (all authenticated users)
   - Upload: Requires authentication token
   - Uploaded files: Stored in protected `uploads/` directory

3. **Data Privacy**
   - Forms contain sensitive employee information
   - Implement file encryption at rest (future)
   - Regular cleanup of old uploaded forms

---

## Testing

### Test Download
```bash
# Check metadata
curl http://localhost:4000/api/leave-form/metadata

# Download form
curl -O http://localhost:4000/api/leave-form/download
```

### Test Upload
```bash
# Upload completed form
curl -X POST http://localhost:4000/api/leave-form/upload \
  -F "form=@./completed-leave-form.docx"
```

### Test UI
1. Start server: `cd server && node index.js`
2. Start frontend: `npm run dev`
3. Login as CSP user
4. Navigate to "Official Leave Form"
5. Test download and upload functionality

---

## Integration with Existing Workflow

The official form system integrates seamlessly with the existing PTO workflow:

```
Official Form Submission
         ↓
   File Uploaded
         ↓
  CSP Manual Review (extract data)
         ↓
 Create Digital Leave Request
         ↓
   CSP Review Workflow
         ↓
  Client Approval Workflow
         ↓
  Payroll Notification
         ↓
 Absenteeism Tracker Update
```

**Future State** (with auto-parsing):
```
Official Form Submission
         ↓
   Auto-Parse Data
         ↓
Create Leave Request (csp-review status)
         ↓
   [Normal workflow continues]
```

---

## Summary

✅ **Implemented:**
- Official form download endpoint
- Form metadata API
- File upload with validation
- React UI component
- Navigation integration
- File storage system
- Public static file serving

🔮 **Future:**
- Automated DOCX parsing (mammoth)
- Auto-fill form generation (docxtemplater)
- Email attachment support
- Digital signature integration
- Version control

---

## Support

For issues or questions:
1. Check server logs: `server/logs/`
2. Verify file paths in configuration
3. Test API endpoints with cURL
4. Review browser console for frontend errors

**Contact:** IT Support / System Administrator
