# Script to display network information for external testing

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  NETWORK ACCESS INFORMATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get all network adapters with IPv4 addresses
$networkInfo = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.InterfaceAlias -notlike "*Loopback*" } |
    Select-Object IPAddress, InterfaceAlias

if ($networkInfo) {
    Write-Host "Your IP Addresses:" -ForegroundColor Green
    foreach ($info in $networkInfo) {
        Write-Host "  - $($info.IPAddress) ($($info.InterfaceAlias))" -ForegroundColor White
    }
    
    Write-Host "`nFrontend URLs (Port 8080):" -ForegroundColor Yellow
    foreach ($info in $networkInfo) {
        Write-Host "  http://$($info.IPAddress):8080" -ForegroundColor White
    }
    
    Write-Host "`nBackend API URLs (Port 4000):" -ForegroundColor Yellow
    foreach ($info in $networkInfo) {
        Write-Host "  http://$($info.IPAddress):4000" -ForegroundColor White
    }
} else {
    Write-Host "No network interfaces found (other than loopback)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Share the Frontend URL with testers!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
