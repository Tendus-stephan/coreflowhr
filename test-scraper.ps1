# PowerShell script to test scraper
# Run with: .\test-scraper.ps1

Write-Host "🧪 Testing Scraper Setup..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if scraper server is running
Write-Host "1️⃣ Checking scraper server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3005/api/health" -Method GET -UseBasicParsing
    Write-Host "   ✅ Scraper server is running" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Scraper server not running or not accessible" -ForegroundColor Red
    Write-Host "   → Start it with: npm run scraper-ui:server" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check diagnostic endpoint
Write-Host ""
Write-Host "2️⃣ Checking scraper configuration..." -ForegroundColor Yellow
try {
    $diag = Invoke-WebRequest -Uri "http://localhost:3005/api/diagnostic" -Method GET -UseBasicParsing
    $diagnostics = $diag.Content | ConvertFrom-Json
    
    Write-Host "   Server Status: $($diagnostics.server.status)" -ForegroundColor $(if ($diagnostics.server.status -eq 'running') { 'Green' } else { 'Red' })
    Write-Host "   Apify Configured: $($diagnostics.apify.configured)" -ForegroundColor $(if ($diagnostics.apify.configured) { 'Green' } else { 'Yellow' })
    Write-Host "   Apify Token: $($diagnostics.apify.hasToken) (length: $($diagnostics.apify.tokenLength))" -ForegroundColor $(if ($diagnostics.apify.hasToken) { 'Green' } else { 'Red' })
    Write-Host "   Database Connected: $($diagnostics.database.connected)" -ForegroundColor $(if ($diagnostics.database.connected) { 'Green' } else { 'Red' })
    
    if (-not $diagnostics.apify.configured) {
        Write-Host ""
        Write-Host "   ⚠️  Apify not configured!" -ForegroundColor Yellow
        Write-Host "   → Add APIFY_API_TOKEN to .env.local" -ForegroundColor Yellow
        Write-Host "   → Get token from: https://apify.com/settings/integrations" -ForegroundColor Yellow
        Write-Host "   → Restart scraper server after adding token" -ForegroundColor Yellow
    }
    
    if ($diagnostics.apify.error) {
        Write-Host "   ❌ Apify Error: $($diagnostics.apify.error)" -ForegroundColor Red
    }
    
    if ($diagnostics.database.error) {
        Write-Host "   ❌ Database Error: $($diagnostics.database.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   ❌ Error checking diagnostics: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check browser console when scraping" -ForegroundColor White
Write-Host "  2. Check server terminal for detailed logs" -ForegroundColor White
Write-Host "  3. Try posting a job from the UI" -ForegroundColor White
