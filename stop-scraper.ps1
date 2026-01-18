# Stop Scraper Server Process

Write-Host "Checking for scraper server on port 3005..." -ForegroundColor Yellow

# Check if port 3005 is in use
$connections = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue

if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Write-Host "Found process on port 3005:" -ForegroundColor Yellow
            Write-Host "  PID: $($process.Id)" -ForegroundColor Cyan
            Write-Host "  Name: $($process.ProcessName)" -ForegroundColor Cyan
            Write-Host "  Path: $($process.Path)" -ForegroundColor Gray
            
            # Stop the process
            Write-Host "Stopping process $($process.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            Write-Host "✅ Process $($process.Id) stopped successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error stopping process $processId : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✅ No process found on port 3005. Scraper server is not running." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
