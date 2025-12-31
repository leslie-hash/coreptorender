# Quick Test Guide - BPO Client Management System

## Testing the New Features

### 1. Data Integrity Monitor

**Access**: Click "Data Integrity" in the left sidebar

**What to Test**:
1. **Initial Load**: Should display data integrity dashboard
2. **Check for Issues**: Click "Check Data Integrity" button
3. **View Results**: Should see integrity score (0-100%)
4. **Issue List**: Review detected issues:
   - Duplicates (high severity - red)
   - Missing data (medium severity - yellow)
   - Inconsistencies (high severity - red)
5. **Resolve Issues**: Click "Resolve" on any issue
6. **Sync Data**: Click "Sync All Sources" button
7. **Data Sources**: View sync status of different data sources

**Expected Behavior**:
- With empty client data, should show 100% integrity score
- After adding test clients with issues, score should decrease
- Issue count should display in status cards

### 2. Client Analytics Dashboard

**Access**: Click "Client Analytics" in the left sidebar

**What to Test**:
1. **Regional Breakdown**: View analytics cards for each region
   - Client count
   - Active clients
   - Data volume (GB)
   - Average downloads
2. **Filter by Region**: Use dropdown to filter by specific region
3. **Date Range**: Select time period (last 30/60/90 days, all time)
4. **Trend Chart**: View monthly trends for:
   - New clients added
   - Data uploads
   - Download activity
5. **Export Report**: Click "Export Report" to download CSV

**Expected Behavior**:
- Cards update when region filter changes
- Trends display sample data (will populate with real data over time)
- Export generates CSV file for Excel

### 3. Client Management (Enhanced)

**Access**: Default view or click "Client Management" in sidebar

**What to Test**:
1. **Add Client**: Click "+ Add Client" button
   - Fill in: Name, Region, Status, Industry, Contact Email
   - Save and verify it appears in list
2. **Filter by Region**: Use region dropdown
3. **Search**: Type client name in search box
4. **View Details**: Click "View Details" on a client
5. **Upload Data**: In client details:
   - Click "Upload Data" button
   - Enter file name, type, size
   - Verify upload appears in tracking
6. **Download Data**: Click download icon on uploaded file
   - Verify download count increments
7. **Edit Client**: Click "Edit" icon, modify details, save
8. **Delete Client**: Click "Delete" icon (use with caution)

**Expected Behavior**:
- Client list updates in real-time
- Filters work correctly
- Upload/download tracking persists

## Sample Test Data

### Test Client 1 (Clean Data)
```
Name: Acme Corporation
Region: North America
Status: Active
Industry: Technology
Contact Email: contact@acme.com
```

### Test Client 2 (Missing Data - will trigger integrity issue)
```
Name: Beta Industries
Region: Europe
Status: Active
Industry: (leave empty)
Contact Email: (leave empty)
```

### Test Client 3 (Invalid Email - will trigger integrity issue)
```
Name: Gamma Services
Region: Asia Pacific
Status: Active
Industry: Healthcare
Contact Email: invalid-email (no @)
```

### Test Client 4 (Duplicate - will trigger integrity issue)
```
Name: Acme Corporation
Region: North America
Status: Inactive
Industry: Manufacturing
Contact Email: duplicate@acme.com
```

## Testing Data Integrity Flow

### Step-by-Step:

1. **Start with empty data**: Delete any existing clients
2. **Add Test Client 1** (clean): Verify no issues detected
3. **Add Test Client 2** (missing data): Run integrity check
   - Should detect 1 issue: "Missing required fields: industry, email"
   - Severity: Medium
4. **Add Test Client 3** (invalid email): Run integrity check
   - Should detect 2 issues total
   - New issue: "Invalid email format"
   - Severity: High
5. **Add Test Client 4** (duplicate): Run integrity check
   - Should detect 3 issues total
   - New issue: "Duplicate client entry detected"
   - Severity: High
6. **Check Integrity Score**: Should be around 25% (1 clean / 4 total)
7. **Resolve Issues**: Click resolve on each, verify status changes
8. **Fix the actual data**: Edit clients to correct issues
9. **Re-check**: Integrity score should improve to 100%

## Testing Analytics

### Generate Analytics Data:

1. **Add clients across multiple regions**:
   - 3 in North America
   - 2 in Europe
   - 2 in Asia Pacific
   - 1 in Latin America

2. **Upload data for each client**:
   - Add 2-3 files per client
   - Vary file sizes (100KB, 5MB, 10MB, etc.)

3. **Simulate downloads**:
   - Click download on various files multiple times
   - Track which regions have most activity

4. **View Analytics**:
   - Regional breakdown should show correct counts
   - Data volume should aggregate
   - Download averages should calculate

5. **Test Filters**:
   - Select "North America" - should show only those clients
   - Select "Europe" - should switch data
   - Select "All Regions" - should show everything

6. **Export Report**:
   - Click "Export Report"
   - Open CSV in Excel
   - Verify data matches dashboard

## API Testing (Optional)

### Using Browser DevTools or Postman:

#### Check Data Integrity
```
GET http://localhost:4000/api/data-integrity/check
```
Response should include:
- `issues` array
- `sources` array
- `stats` object with integrity score

#### Get Analytics
```
GET http://localhost:4000/api/analytics/clients?region=all&range=all-time
```
Response should include:
- `analytics` array (regional breakdown)
- `trends` array (monthly data)

#### Get All Clients
```
GET http://localhost:4000/api/clients
```
Response should be array of client objects

#### Create Client
```
POST http://localhost:4000/api/clients
Content-Type: application/json

{
  "name": "Test Corp",
  "region": "North America",
  "status": "active",
  "industry": "Technology",
  "contactEmail": "test@testcorp.com"
}
```

## Common Issues & Solutions

### Issue: Integrity check shows no issues but data is bad
**Solution**: Ensure you clicked "Check Data Integrity" button to run scan

### Issue: Analytics shows empty/zero data
**Solution**: 
1. Add test clients first
2. Upload data files for clients
3. Trigger analytics refresh

### Issue: Export button doesn't work
**Solution**: Check browser console for errors, ensure backend is running

### Issue: Can't add clients
**Solution**: 
1. Verify backend server is running on port 4000
2. Check browser console for API errors
3. Ensure all required fields are filled

### Issue: Changes don't persist after refresh
**Solution**: 
1. Check that `clients.json` and `clientData.json` exist in `server/` folder
2. Verify write permissions on these files
3. Check server logs for file write errors

## Performance Expectations

- **Client List**: Should load < 100ms with up to 100 clients
- **Integrity Check**: Should complete < 500ms with up to 100 clients
- **Analytics Load**: Should render < 200ms
- **File Upload Tracking**: Instant update
- **Download Tracking**: Instant counter increment

## Next Testing Phase

Once basic features are validated:

1. **Stress Test**: Add 50+ clients, verify performance
2. **Concurrent Users**: Open multiple browser tabs, test simultaneous edits
3. **Large Files**: Upload tracking with GB-sized files
4. **Data Corruption**: Test with malformed JSON, verify error handling
5. **Browser Compatibility**: Test in Chrome, Firefox, Edge, Safari

---

## Quick Reference: Keyboard Shortcuts

- **Escape**: Close modals/dialogs
- **Ctrl+F**: Focus search (if implemented)
- **Tab**: Navigate between form fields
- **Enter**: Submit forms

## Status Indicators

- 🟢 **Active** (green): Client is active
- 🔴 **Inactive** (red): Client is inactive  
- 🟡 **Pending** (yellow): Awaiting setup
- 🟣 **High Priority** (purple): Critical issue
- 🔵 **Medium Priority** (blue): Warning
- ⚪ **Low Priority** (gray): Info only

---

**Testing Checklist**:
- [ ] Add minimum 4 test clients
- [ ] Trigger at least 3 data integrity issues
- [ ] Run integrity check successfully
- [ ] Upload data files (min 2 per client)
- [ ] Track downloads (click download buttons)
- [ ] View analytics by region
- [ ] Export CSV report
- [ ] Resolve all integrity issues
- [ ] Verify 100% integrity score
- [ ] Test all sidebar navigation

**System is ready for testing! 🚀**
