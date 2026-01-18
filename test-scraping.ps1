# Test Scraping Endpoint - PowerShell Script
# Tests the Railway scraper server and shows detailed logs

$railwayUrl = "https://coreflowhr-production.up.railway.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SCRAPING TEST & DIAGNOSTICS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Test Health Endpoint
Write-Host "[1/3] Testing Health Endpoint..." -ForegroundColor Yellow
Write-Host "GET $railwayUrl/api/health" -ForegroundColor Gray

try {
    $healthResponse = Invoke-RestMethod -Uri "$railwayUrl/api/health" -Method Get -ErrorAction Stop
    Write-Host "✅ Health Check: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test Diagnostic Endpoint
Write-Host "[2/3] Testing Diagnostic Endpoint..." -ForegroundColor Yellow
Write-Host "GET $railwayUrl/api/diagnostic" -ForegroundColor Gray

try {
    $diagnosticResponse = Invoke-RestMethod -Uri "$railwayUrl/api/diagnostic" -Method Get -ErrorAction Stop
    Write-Host "✅ Diagnostic Check: SUCCESS" -ForegroundColor Green
    Write-Host ""
    Write-Host "Server Status: $($diagnosticResponse.server.status)" -ForegroundColor Green
    Write-Host "Apify Configured: $($diagnosticResponse.apify.configured)" -ForegroundColor $(if ($diagnosticResponse.apify.configured) { "Green" } else { "Yellow" })
    Write-Host "Apify Has Token: $($diagnosticResponse.apify.hasToken)" -ForegroundColor $(if ($diagnosticResponse.apify.hasToken) { "Green" } else { "Red" })
    Write-Host "Database Connected: $($diagnosticResponse.database.connected)" -ForegroundColor $(if ($diagnosticResponse.database.connected) { "Green" } else { "Red" })
    
    if ($diagnosticResponse.database.connected) {
        Write-Host "Active Jobs Count: $($diagnosticResponse.database.jobsCount)" -ForegroundColor Green
    }
    
    if ($diagnosticResponse.apify.error) {
        Write-Host "Apify Error: $($diagnosticResponse.apify.error)" -ForegroundColor Red
    }
    
    if ($diagnosticResponse.database.error) {
        Write-Host "Database Error: $($diagnosticResponse.database.error)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Full Diagnostic Response:" -ForegroundColor Gray
    Write-Host ($diagnosticResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Diagnostic Check: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Test Scraping Endpoint (if job ID provided)
if ($args.Length -gt 0) {
    $jobId = $args[0]
    $maxCandidates = if ($args.Length -gt 1) { $args[1] } else { 5 }
    
    Write-Host "[3/3] Testing Scraping Endpoint..." -ForegroundColor Yellow
    Write-Host "POST $railwayUrl/api/scrape" -ForegroundColor Gray
    Write-Host "Job ID: $jobId" -ForegroundColor Gray
    Write-Host "Max Candidates: $maxCandidates" -ForegroundColor Gray
    Write-Host ""
    
    $scrapeBody = @{
        jobId = $jobId
        sources = @("linkedin")
        maxCandidates = $maxCandidates
    } | ConvertTo-Json
    
    try {
        Write-Host "Starting scrape... (this may take a few minutes)" -ForegroundColor Yellow
        $scrapeResponse = Invoke-RestMethod -Uri "$railwayUrl/api/scrape" -Method Post -Body $scrapeBody -ContentType "application/json" -TimeoutSec 300 -ErrorAction Stop
        
        Write-Host "✅ Scraping: SUCCESS" -ForegroundColor Green
        Write-Host ""
        Write-Host "Results:" -ForegroundColor Cyan
        Write-Host "  Total Saved: $($scrapeResponse.totalSaved)" -ForegroundColor Green
        Write-Host ""
        
        foreach ($result in $scrapeResponse.results) {
            Write-Host "  Source: $($result.source)" -ForegroundColor Cyan
            Write-Host "    Found: $($result.candidatesFound)" -ForegroundColor Gray
            Write-Host "    Saved: $($result.candidatesSaved)" -ForegroundColor Green
            if ($result.statistics) {
                Write-Host "    Statistics:" -ForegroundColor Gray
                Write-Host "      Found: $($result.statistics.found)" -ForegroundColor Gray
                Write-Host "      Saved: $($result.statistics.saved)" -ForegroundColor Green
                Write-Host "      Invalid: $($result.statistics.invalid)" -ForegroundColor Yellow
                Write-Host "      Duplicates: $($result.statistics.duplicates)" -ForegroundColor Yellow
                Write-Host "      Save Errors: $($result.statistics.saveErrors)" -ForegroundColor Red
            }
            if ($result.errors -and $result.errors.Length -gt 0) {
                Write-Host "    Errors:" -ForegroundColor Red
                foreach ($error in $result.errors) {
                    Write-Host "      - $error" -ForegroundColor Red
                }
            }
            Write-Host ""
        }
        
        Write-Host "Full Response:" -ForegroundColor Gray
        Write-Host ($scrapeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Scraping: FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        # Try to get response body if available
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        }
    }
} else {
    Write-Host "[3/3] Skipping Scraping Test (no job ID provided)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To test scraping, provide a job ID:" -ForegroundColor Cyan
    Write-Host "  .\test-scraping.ps1 <job-id> [max-candidates]" -ForegroundColor Cyan
    Write-Host "  Example: .\test-scraping.ps1 abc123-456-def 5" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
