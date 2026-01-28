# Test Historical Data Tracking
Write-Host "`n=== HISTORICAL DATA TRACKING TEST ===" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# Test PTO Monthly History
Write-Host "`n📊 PTO Historical Tracking:" -ForegroundColor Yellow
$members = Get-Content server\teamMemberMeta.json | ConvertFrom-Json
$withHistory = $members | Where-Object { $_.ptoMonthlyHistory -and $_.ptoMonthlyHistory.Count -gt 0 }

Write-Host "  Total members: $($members.Count)" -ForegroundColor White
Write-Host "  With PTO history: $($withHistory.Count)" -ForegroundColor Green

if ($withHistory.Count -gt 0) {
    $sample = $withHistory | Select-Object -First 1
    Write-Host "`n  Sample: $($sample.employeeId)" -ForegroundColor Cyan
    Write-Host "  Months tracked: $($sample.ptoMonthlyHistory.Count)" -ForegroundColor White
    
    Write-Host "`n  Recent months:" -ForegroundColor Yellow
    $sample.ptoMonthlyHistory | Select-Object -Last 3 | ForEach-Object {
        Write-Host "    $($_.monthName): Balance=$($_.leaveBalance), Taken=$($_.totalTaken)" -ForegroundColor White
    }
    
    # Year distribution
    Write-Host "`n  Year coverage:" -ForegroundColor Yellow
    $years = $sample.ptoMonthlyHistory | Group-Object -Property year | Sort-Object Name
    $years | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count) months" -ForegroundColor White
    }
}

# Test Absenteeism Historical Data
Write-Host "`n📊 Absenteeism Historical Tracking:" -ForegroundColor Yellow
$absRecords = Get-Content server\absenteeismRecords.json | ConvertFrom-Json

if ($absRecords.Count -gt 0) {
    Write-Host "  Total records: $($absRecords.Count)" -ForegroundColor Green
    
    $byYear = $absRecords | Group-Object -Property year | Sort-Object Name
    Write-Host "`n  Records by year:" -ForegroundColor Yellow
    $byYear | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count) records" -ForegroundColor White
    }
    
    Write-Host "`n  Sample records:" -ForegroundColor Cyan
    $absRecords | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.employeeName) - $($_.date) - $($_.status)" -ForegroundColor White
    }
} else {
    Write-Host "  ⚠️  No absenteeism records found (file may be empty)" -ForegroundColor Yellow
    Write-Host "  Note: absenteeismRecords.json vs absenteeismReports.json" -ForegroundColor Gray
}

Write-Host "`n" -ForegroundColor Gray
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray
