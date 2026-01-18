# Get Active Jobs from Railway Server

$railwayUrl = "https://coreflowhr-production.up.railway.app"

Write-Host "Fetching active jobs..." -ForegroundColor Yellow

try {
    $jobs = Invoke-RestMethod -Uri "$railwayUrl/api/jobs" -Method Get -TimeoutSec 10 -ErrorAction Stop
    
    if ($jobs -and $jobs.Length -gt 0) {
        Write-Host "✅ Found $($jobs.Length) job(s):" -ForegroundColor Green
        Write-Host ""
        
        foreach ($job in $jobs) {
            Write-Host "  Job ID: $($job.id)" -ForegroundColor Cyan
            Write-Host "  Title: $($job.title)" -ForegroundColor White
            Write-Host "  Status: $($job.status)" -ForegroundColor Gray
            Write-Host ""
        }
        
        Write-Host "To test scraping with the first job, run:" -ForegroundColor Yellow
        Write-Host "  .\test-scraping.ps1 $($jobs[0].id) 5" -ForegroundColor Cyan
    } else {
        Write-Host "❌ No active jobs found. Please create a job first." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error fetching jobs: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
