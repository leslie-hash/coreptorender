# Official Leave Form - Quick Reference

## 🚀 What's New?

The system now supports the **official LABOR OUTSOURCING LEAVE APPLICATION FORM** alongside the digital form!

## 📋 Two Ways to Submit Leave Requests

### Option 1: Digital Form (Existing)
- Click "Submit Leave Request" button
- Fill out web form
- Instant validation and submission

### Option 2: Official Form (NEW)
- Download official DOCX template
- Fill out in Microsoft Word
- Upload completed form

**Both are official and equally valid!**

---

## 🖥️ How to Use

### Download Official Form

1. **Via Web UI:**
   - Click sidebar → "Official Leave Form"
   - Click "Download Official Form" button
   - Save and open in Word

2. **Direct Link:**
   ```
   http://localhost:4000/api/leave-form/download
   ```

### Upload Completed Form

1. **Via Web UI:**
   - Go to "Official Leave Form" page
   - Click "Choose File"
   - Select your completed form (.doc, .docx, .pdf)
   - Click "Upload Completed Form"
   - Wait for confirmation

2. **Via API:**
   ```bash
   curl -X POST http://localhost:4000/api/leave-form/upload \
     -F "form=@./my-completed-form.docx"
   ```

---

## 📍 Where to Find It

### Frontend
- **Sidebar:** "Official Leave Form" (📥 icon)
- **Location:** Leave Management section

### Files
- **Template Path:** `C:\Users\leslie.chasinda\Pictures\Screenshots\LABOR OUTSORSING LEAVE APPLICATION FORM.docx`
- **Public Copy:** `server/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx`
- **Uploaded Forms:** `server/uploads/leave-form-[timestamp]-[filename]`

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leave-form/download` | GET | Download official form template |
| `/api/leave-form/metadata` | GET | Get form info (size, availability) |
| `/api/leave-form/upload` | POST | Upload completed form |

---

## ✅ Server Status Check

**Server Output:**
```
✅ Official leave form copied to public directory
Backend server running on port 4000
```

**Test Form Availability:**
```bash
curl http://localhost:4000/api/leave-form/metadata
```

**Expected Response:**
```json
{
  "available": true,
  "fileName": "LABOR OUTSORSING LEAVE APPLICATION FORM.docx",
  "sizeKB": 45,
  "publicUrl": "/public/LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM.docx"
}
```

---

## 🎯 Benefits

### For Employees
- ✅ **Choice:** Use digital or paper form
- ✅ **Familiar:** Same form used for years
- ✅ **Offline:** Fill out form without internet
- ✅ **Print:** Sign physical copies if needed

### For CSP Team
- ✅ **Flexibility:** Accept both submission methods
- ✅ **Consistency:** All forms go through same workflow
- ✅ **Tracking:** Uploaded forms timestamped and stored
- ✅ **Audit Trail:** Complete record of submissions

### For System
- ✅ **Hybrid Workflow:** Digital + Traditional forms
- ✅ **No Changes:** Existing digital flow unchanged
- ✅ **Scalable:** Easy to add more form types
- ✅ **Future-Ready:** Auto-parsing can be added later

---

## 🔄 Workflow Integration

```
User Action
    ↓
┌─────────────────┬─────────────────┐
│  Digital Form   │  Official Form  │
└────────┬────────┴────────┬────────┘
         │                 │
         │         Upload & Manual Review
         │                 │
         └────────┬────────┘
                  ↓
         CSP Review Workflow
                  ↓
        Client Approval Workflow
                  ↓
        Payroll Notification
                  ↓
      Absenteeism Tracker Update
```

---

## 📝 Accepted File Types

- `.doc` - Microsoft Word 97-2003
- `.docx` - Microsoft Word 2007+
- `.pdf` - Scanned or exported forms

**Max Size:** 100 MB

---

## 🚨 Common Issues

### "Form not available"
- **Cause:** Template file missing
- **Fix:** Verify file exists at path, restart server

### "Invalid file type"
- **Cause:** Wrong file format
- **Fix:** Save as .docx or .pdf

### Upload fails
- **Cause:** File too large or network issue
- **Fix:** Compress file, check connection

---

## 🎓 User Instructions

### For Team Members Submitting Leave

**Step 1:** Choose Your Method
- Quick request? → Use digital form
- Need printed copy? → Use official form

**Step 2:** If Using Official Form
1. Download from "Official Leave Form" page
2. Open in Microsoft Word
3. Fill all required fields:
   - Your name
   - Leave type
   - Start date
   - End date
   - Reason
4. Save the file
5. Return to website
6. Upload completed form

**Step 3:** Wait for Approval
- CSP reviews submission
- You'll receive status updates
- Same timeline as digital submissions

---

## 💡 Pro Tips

1. **Download Once, Use Multiple Times**
   - Save template to your computer
   - Reuse for future requests

2. **Name Your Files**
   - Save as: `Leave-Request-[Your-Name]-[Date].docx`
   - Easier to track and find later

3. **Keep a Copy**
   - Save completed form before uploading
   - Reference for your records

4. **Check Status**
   - After upload, check "CSP Review Queue"
   - Same tracking as digital submissions

---

## 🔮 Coming Soon

- **Auto-Parsing:** Extract data from uploaded forms automatically
- **Auto-Fill:** Generate pre-filled forms from system data
- **Email Submissions:** Send forms via email attachment
- **Digital Signatures:** E-sign forms online

---

## 📞 Need Help?

- **Documentation:** See `OFFICIAL_FORM_INTEGRATION.md`
- **API Reference:** Check endpoint examples above
- **Support:** Contact IT or system administrator

---

**Status:** ✅ LIVE and READY TO USE!

Server running with official form integration enabled.
