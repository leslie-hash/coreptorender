# Historical Data Tracking - Complete Guide

## Overview
The system now captures **complete historical data** for both PTO and Absenteeism, starting from 2024 onwards. This enables trend analysis, reporting, and data-driven decision making.

## Changes Made

### 1. PTO Historical Tracking (`server/googleSheetsSync.js`)
- Updated `syncPTOBalancesFromSheets()` to capture monthly PTO data from June 2024 through November 2025
- Extracts 4 columns per month: Days Accrued, Current PTO, Total Taken, Leave Balance
- Stores complete monthly history in `ptoMonthlyHistory` array for each team member
- Each month record includes: year, month, monthName, daysAccrued, currentPTO, totalTaken, leaveBalance

### 2. Absenteeism Historical Tracking (`server/absenteeismParser.js`)
- **FIXED**: Now captures data from **all years** (2024 onwards), not just current year
- Automatically detects year markers in the sheet (e.g., "2024", "2025", "2026")
- Detects year rollovers when December transitions to January
- Defaults to starting from 2024 for complete historical tracking
- All absenteeism records now include the correct historical year

### 3. API Endpoint (`server/index.js`)
- Updated `/api/team-members-details` to include `ptoMonthlyHistory` in response
- Frontend can now access complete historical PTO data for each team member

### 4. New UI Component (`src/components/PTOHistoryChart.tsx`)
- Visual bar chart comparing Leave Balance vs Total Taken month-over-month
- Trend indicator showing 3-month trend (increasing/decreasing balance)
- Detailed monthly breakdown table with all PTO metrics
- Expandable/collapsible view to keep UI clean

### 5. Team Members List (`src/components/TeamMembersList.tsx`)
- Added "View History" button next to PTO balance
- Shows/hides PTOHistoryChart component on click
- Only displays button if historical data exists

## How to Test

### Step 1: Sync Data
Run comprehensive sync to populate historical data:

\`\`\`powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/sync/comprehensive" -Method POST -ContentType "application/json" -Body '{"spreadsheetId":"1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es"}'
\`\`\`

### Step 2: Verify Data Structure
Check that teamMemberMeta.json now contains ptoMonthlyHistory:

\`\`\`powershell
Get-Content server/teamMemberMeta.json | ConvertFrom-Json | Select-Object -First 1 -ExpandProperty ptoMonthlyHistory
\`\`\`

Expected output:
\`\`\`json
[
  {
    "year": 2024,
    "month": 6,
    "monthName": "June 2024",
    "daysAccrued": 1.67,
    "currentPTO": 20,
    "totalTaken": 0,
    "leaveBalance": 20
  },
  {
    "year": 2024,
    "month": 7,
    "monthName": "July 2024",
    "daysAccrued": 1.67,
    "currentPTO": 20,
### Step 3: Verify Absenteeism Historical Data
Check that absenteeismRecords.json contains records from all years (2024, 2025, 2026):

\`\`\`powershell
Get-Content server/absenteeismRecords.json | ConvertFrom-Json | Group-Object -Property year | Select-Object Name, Count
\`\`\`

Expected output:
\`\`\`
Name Count
---- -----
2024   150
2025   200
2026    50
\`\`\`

### Step 4: View in UI
1. Start frontend: `npm run dev`
2. Navigate to Team Members page
3. Look for "View History" button next to PTO balance
4. Click to expand and see:
   - Bar chart visualization
   - Trend indicator
   - Detailed monthly table
5. Navigate to Absenteeism Report to see all historical records

## Data Structure

### Google Sheets Layouts

#### "PTO Update" Tab Layout
- Column A: Client
- Column B: NAME
- Column C: Start Date
- Columns D-G: June 2024 (Days Accrued, Current PTO, Total Taken, Leave Balance)
- Columns H-K: July 2024
- Columns L-O: August 2024
- ... continues through November 2025

#### "Absenteesim tracker" Tab Layout
- Rows 1-8: Legend
- Row 10+: Year marker (optional, e.g., "2024")
- Next row: MONTH NAME (e.g., "JANUARY")
- Next row: Headers (Team Member Name | 1 | 2 | 3 | ... | 31)
- Following rows: Employee attendance data
- Repeats for each month
- **Automatic year detection**: System detects December → January transitions

### Stored Format (teamMemberMeta.json)
\`\`\`json
{
  "employeeId": "John Doe",
  "client": "Adelberg Montalvan",
  "annualPTO": 20,
  "currentUsedPTO": 5.5,
  "currentRemainingPTO": 14.5,
  "ptoMonthlyHistory": [
    {
      "year": 2024,
      "month": 6,
      "monthName": "June 2024",
      "daysAccrued": 1.67,
      "currentPTO": 20,
      "totalTaken": 0,
      "leaveBalance": 20
    },
    ...
  ],
  "ptoLastSynced": "2026-01-07T..."
}
\`\`\`

## Features

### PTO Historical Tracking
#### Visual Chart
- Dual bar chart: Blue bars for leave balance, Red bars for days taken
- Responsive height based on maximum value
- Month labels with exact values
- Hover states for better UX

#### Trend Analysis
- Calculates 3-month trend
- Shows trending up (green) or down (red) indicator
- Displays net change in days

#### Detailed Table
- Scrollable table with all monthly records
- Columns: Month, Accrued, Current PTO, Taken, Balance
- Color-coded values for easy scanning
- Sticky header for long lists

### Absenteeism Historical Tracking
- **Multi-Year Support**: Captures data from 2024 onwards
- **Automatic Year Detection**: Recognizes year markers and transitions
- **Complete Records**: All historical absenteeism entries preserved
- **Date Accuracy**: Each record tagged with correct year/month/day
- **Trend Analysis**: Can analyze absenteeism patterns over multiple years

## Benefits

1. **Complete Historical Visibility**: See how PTO and absenteeism has evolved over time
2. **Multi-Year Tracking**: Track data across 2024, 2025, 2026, and beyond
3. **Trend Identification**: Quickly spot increasing or decreasing patterns
4. **Data-Driven Decisions**: Make informed decisions based on historical patterns
5. **Transparency**: Team members and CSPs can see complete history
6. **Audit Trail**: Full record of all PTO and absenteeism events
7. **Year-over-Year Comparison**: Compare 2024 vs 2025 vs 2026 performance

## Key Fix: Absenteeism Multi-Year Support

### Before
- ❌ Only captured current year (2026)
- ❌ Lost all historical data from 2024 and 2025
- ❌ No way to track trends over time

### After
- ✅ Captures ALL years from 2024 onwards
- ✅ Automatically detects year markers in sheet
- ✅ Detects year rollovers (December → January)
- ✅ Preserves complete historical record
- ✅ Enables year-over-year analysis

## Next Steps (Optional Enhancements)

1. **Export to PDF**: Add PDF export for historical reports
2. **Date Range Filters**: Filter by custom date ranges
3. **Year-over-Year Comparison**: Side-by-side comparison charts
4. **Alerts**: Notify when patterns deviate from historical norms
5. **Forecasting**: Predict future trends based on historical data
6. **Dashboard**: Historical trends dashboard with key metrics
