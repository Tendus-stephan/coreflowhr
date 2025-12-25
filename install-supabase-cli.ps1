# Install Supabase CLI on Windows using Scoop

Write-Host "Installing Scoop package manager..." -ForegroundColor Green

# Install Scoop if not already installed
if (!(Get-Command scoop -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    Write-Host "Scoop installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Scoop is already installed." -ForegroundColor Yellow
}

Write-Host "`nInstalling Supabase CLI..." -ForegroundColor Green

# Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Install Supabase CLI
scoop install supabase

Write-Host "`nSupabase CLI installed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run: supabase login" -ForegroundColor White
Write-Host "2. Run: supabase link --project-ref lpjyxpxkagctaibmqcoi" -ForegroundColor White
Write-Host "3. Run: supabase functions deploy stripe-webhook --no-verify-jwt" -ForegroundColor White

