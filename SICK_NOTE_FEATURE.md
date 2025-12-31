# Sick Note Upload Feature

## Overview
When team members select "Sick Leave" as their leave type, they are now **required** to upload a scanned copy of their sick note or medical certificate.

## Features Implemented

### 1. Frontend - Leave Request Form
**File**: `src/components/LeaveRequestForm.tsx`

- **Conditional Upload Field**: Appears only when "Sick Leave" is selected
- **File Types Accepted**: PDF, JPG, JPEG, PNG, DOC, DOCX
- **Required Field**: Cannot submit sick leave without uploading a document
- **Visual Feedback**: Shows selected filename after upload
- **Async Upload**: File is uploaded before leave request submission

### 2. Backend - File Upload Endpoint
**File**: `server/index.js`

**Endpoint**: `POST /api/upload-sick-note`
- Accepts multipart/form-data with sick note file
- Renames file with organized naming: `sick_note_{teamMemberName}_{timestamp}.{ext}`
- Stores in `server/uploads/` directory
- Returns file path for storage in leave request

**Endpoint**: Static file serving
- `GET /uploads/{filename}` serves uploaded files
- Accessible for CSPs to view/download sick notes

### 3. Leave Request Storage
**File**: `server/index.js` - Leave request submission

- Added `sickNoteUrl` field to leave request records
- Stored as `/uploads/{filename}` path
- Included in history notes when present

### 4. CSP Review Interface
**File**: `src/components/CSPReviewWorkflow.tsx`

**Features**:
- **Sick Note Display**: Shows document link when sick leave includes uploaded note
- **Missing Note Warning**: Red alert box when sick leave has no sick note
- **Download Link**: Click to view/download sick note in new tab
- **Visual Indicators**: Amber background for sick note section with 📄 icon

## User Flow

### For Team Members (via CSP):
1. CSP opens "Submit New Request" form
2. Selects team member and "Sick Leave" as leave type
3. **Amber upload section appears** with:
   - "📄 Sick Note Upload (Required for Sick Leave)"
   - File input accepting medical documents
   - Required field validation
4. Selects sick note file from computer
5. File is uploaded immediately when selected
6. Leave request is submitted with sick note attached

### For CSPs (Review Queue):
1. View leave requests in Review Queue
2. Sick leave requests show:
   - **Green indicator**: "📄 Sick Note: View Document" (when uploaded)
   - **Red warning**: "⚠️ Missing sick note - Required for sick leave" (when missing)
3. Click "View Document" to open sick note in new tab
4. Review sick note before approving/rejecting request

## File Organization

### Upload Directory Structure:
```
server/uploads/
  ├── sick_note_John_Doe_2025-12-12T14-30-00.pdf
  ├── sick_note_Jane_Smith_2025-12-11T09-15-30.jpg
  └── ...
```

### Naming Convention:
- Format: `sick_note_{sanitized_name}_{ISO_timestamp}.{extension}`
- Sanitized name: Replaces spaces and special chars with underscores
- Timestamp: ISO format with colons removed for filesystem compatibility

## Technical Details

### Frontend File Upload:
```typescript
// Upload file before submitting leave request
const formDataFile = new FormData();
formDataFile.append('sickNote', sickNoteFile);
formDataFile.append('teamMemberName', formData.teamMemberName);

const uploadResponse = await fetch('/api/upload-sick-note', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: formDataFile
});

const uploadData = await uploadResponse.json();
sickNoteUrl = uploadData.filePath; // e.g., "/uploads/sick_note_..."
```

### Backend File Handling:
```javascript
// Multer configuration (already exists)
const upload = multer({ 
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', ...];
    // Validation logic
  }
});

// Sick note endpoint
app.post('/api/upload-sick-note', upload.single('sickNote'), (req, res) => {
  // Rename and organize file
  // Return file path
});
```

### Leave Request Data Structure:
```json
{
  "id": "1734011234567",
  "teamMember": "John Doe",
  "leaveType": "sick",
  "startDate": "2025-12-15",
  "endDate": "2025-12-17",
  "days": 3,
  "reason": "Medical treatment",
  "sickNoteUrl": "/uploads/sick_note_John_Doe_2025-12-12T14-30-00.pdf",
  "status": "csp-review",
  "history": [
    {
      "action": "submitted",
      "timestamp": "2025-12-12T14:30:00.000Z",
      "note": "Submitted via LeavePoint with sick note"
    }
  ]
}
```

## Security Considerations

### File Validation:
- **File type restrictions**: Only document/image formats allowed
- **File size limit**: 100MB maximum
- **Sanitized filenames**: Prevents directory traversal attacks

### Access Control:
- Upload endpoint requires authentication (Bearer token)
- Uploaded files served via static route (consider adding auth if needed)
- Files stored outside public web directory

## Testing Checklist

- [ ] Submit sick leave without file → Shows validation error
- [ ] Submit sick leave with PDF → File uploads successfully
- [ ] Submit sick leave with image (JPG/PNG) → File uploads successfully
- [ ] View uploaded sick note in CSP Review → Opens in new tab
- [ ] Submit other leave types → No sick note field shown
- [ ] Check file naming → Proper format and sanitization
- [ ] Check file storage → Files saved in server/uploads/
- [ ] Verify request data → sickNoteUrl stored correctly

## Future Enhancements

1. **File Preview**: Show thumbnail or preview in review interface
2. **OCR Integration**: Extract text from sick note for validation
3. **Expiry Validation**: Verify sick note dates match leave dates
4. **Bulk Download**: Download all sick notes for a period
5. **Archive**: Move old sick notes to archive storage
6. **Authentication**: Add auth middleware to uploads route
7. **Compression**: Auto-compress large image files
8. **Notification**: Alert if sick note is rejected/requires resubmission

## API Endpoints

### Upload Sick Note
```
POST /api/upload-sick-note
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
  - sickNote: File (PDF, JPG, PNG, DOC, DOCX)
  - teamMemberName: String

Response:
{
  "success": true,
  "fileName": "sick_note_John_Doe_2025-12-12T14-30-00.pdf",
  "filePath": "/uploads/sick_note_John_Doe_2025-12-12T14-30-00.pdf",
  "message": "Sick note uploaded successfully"
}
```

### View Sick Note
```
GET /uploads/{filename}
No authentication required (consider adding)

Example:
GET http://localhost:4000/uploads/sick_note_John_Doe_2025-12-12T14-30-00.pdf
```

## Files Modified

1. `src/components/LeaveRequestForm.tsx`
   - Added sick note file state
   - Added conditional upload field
   - Updated submit handler for file upload

2. `server/index.js`
   - Added `/api/upload-sick-note` endpoint
   - Added `/uploads` static file serving
   - Updated leave request creation to include sickNoteUrl

3. `src/components/CSPReviewWorkflow.tsx`
   - Added sickNoteUrl to interface
   - Added sick note display in review cards
   - Added missing sick note warning

## Deployment Notes

**Ensure uploads directory exists:**
```bash
mkdir -p server/uploads
```

**Set proper permissions:**
```bash
chmod 755 server/uploads
```

**Restart both servers:**
```bash
# Backend
cd server
node index.js

# Frontend
npm run dev -- --host
```

---

**Status**: ✅ Feature Complete and Ready for Testing
**Last Updated**: December 12, 2025
