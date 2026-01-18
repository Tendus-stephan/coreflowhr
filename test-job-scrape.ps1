# Test scraping for a specific job
# Usage: .\test-job-scrape.ps1 [job-id]

param(
    [string]$JobId = "1774c300-578d-4bf8-bf9e-b40821dd9acf",
    [int]$MaxCandidates = 5
)

Write-Host "🚀 Testing scrape for job: $JobId" -ForegroundColor Cyan
Write-Host "Requesting $MaxCandidates candidates from LinkedIn..." -ForegroundColor Gray
Write-Host ""

$body = @{
    jobId = $JobId
    sources = @("linkedin")
    maxCandidates = $MaxCandidates
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/scrape" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 300 -ErrorAction Stop
    
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ SCRAPING COMPLETED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total Saved: $($response.totalSaved)" -ForegroundColor $(if ($response.totalSaved -gt 0) { "Green" } else { "Yellow" })
    Write-Host ""
    
    foreach ($result in $response.results) {
        Write-Host "Source: $($result.source)" -ForegroundColor Cyan
        Write-Host "  Found: $($result.candidatesFound)" -ForegroundColor Gray
        Write-Host "  Saved: $($result.candidatesSaved)" -ForegroundColor $(if ($result.candidatesSaved -gt 0) { "Green" } else { "Red" })
        
        if ($result.statistics) {
            Write-Host "  Statistics:" -ForegroundColor Gray
            Write-Host "    Found: $($result.statistics.found)" -ForegroundColor Gray
            Write-Host "    Saved: $($result.statistics.saved)" -ForegroundColor Green
            Write-Host "    Invalid: $($result.statistics.invalid)" -ForegroundColor Yellow
            Write-Host "    Duplicates: $($result.statistics.duplicates)" -ForegroundColor Yellow
            Write-Host "    Save Errors: $($result.statistics.saveErrors)" -ForegroundColor Red
        }
        
        if ($result.errors -and $result.errors.Length -gt 0) {
            Write-Host "  Errors:" -ForegroundColor Red
            foreach ($error in $result.errors) {
                Write-Host "    - $error" -ForegroundColor Red
            }
        }
        
        Write-Host ""
    }
    
    Write-Host "Full Response:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        } catch {
            # Ignore stream read errors
        }
    }
}
