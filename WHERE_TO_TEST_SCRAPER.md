# 🧪 Where to Test the Scraper

## Option 0: Scraper UI - Dedicated Testing Interface ⭐ **BEST FOR TESTING**

**This is a separate UI specifically for testing the scraper:**

1. **Run both UI and server together:**
   ```bash
   npm run scraper-ui
   ```
   This runs:
   - **Scraper UI**: `http://localhost:3003` (React interface)
   - **Scraper Server**: `http://localhost:3005` (API backend)

2. **Or run separately:**
   ```bash
   # Terminal 1: Scraper server
   npm run scraper-ui:server
   
   # Terminal 2: Scraper UI
   npm run scraper-ui:dev
   ```

3. **Open in browser:**
   - Go to: `http://localhost:3003`
   - You'll see:
     - **Left panel**: List of active jobs
     - **Right panel**: Scraping controls and configuration
     - **Bottom**: Results and scraped candidates

4. **Test scraping:**
   - Select a job from the list
   - Configure sources (LinkedIn, GitHub, etc.)
   - Set max candidates
   - Click "Start Scraping"
   - Watch real-time progress and results

**✅ Best for:** Dedicated scraper testing, debugging, seeing detailed results

---

## Option 1: Main App - AddJob Page ⭐ **EASIEST**

**This is the integrated way to test in your main application:**

1. **Start your main app:**
   ```bash
   npm run dev
   ```
   - Runs on: `http://localhost:5173` (or your dev port)

2. **Start scraper server (if testing locally):**
   ```bash
   npm run scraper-ui:server
   ```
   - Runs on: `http://localhost:3005`
   - **Note:** In production, this runs on Railway automatically

3. **Test in the app:**
   - Go to **Jobs** → **+ Post a Job**
   - Fill in job details (title, location, skills, experience level)
   - Click **"Post Job"** or **"Source Candidates"**
   - Watch the terminal for detailed logs
   - Check browser console for any errors

**✅ Best for:** Testing the full workflow, seeing candidates in your actual app

---

## Option 2: Railway Server (Production)

**Your scraper server is deployed on Railway:**

**URL:** `https://coreflowhr-production.up.railway.app`

**Test endpoints:**
- Health: `https://coreflowhr-production.up.railway.app/api/health`
- Diagnostic: `https://coreflowhr-production.up.railway.app/api/diagnostic`
- Jobs: `https://coreflowhr-production.up.railway.app/api/jobs`

**Test with PowerShell:**
```powershell
# Test health
Invoke-RestMethod -Uri "https://coreflowhr-production.up.railway.app/api/health"

# List jobs
Invoke-RestMethod -Uri "https://coreflowhr-production.up.railway.app/api/jobs"
```

**✅ Best for:** Testing production deployment, verifying Railway setup

---

## Option 3: Test Scripts

### PowerShell Scripts

**Health & Diagnostic Test:**
```powershell
.\test-scraping.ps1 [job-id] [max-candidates]
```
Example:
```powershell
.\test-scraping.ps1 abc123-456-def 5
```

**List Active Jobs:**
```powershell
.\get-jobs.ps1
```

**Test Scraper Setup:**
```powershell
.\test-scraper.ps1
```

**✅ Best for:** Quick terminal-based testing, debugging

---

## Option 4: Direct API Calls (Advanced)

**Test the scraper API directly:**

```bash
# Local scraper server
curl -X POST http://localhost:3005/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-id-here",
    "sources": ["linkedin"],
    "maxCandidates": 5
  }'
```

**Or using PowerShell:**
```powershell
$body = @{
    jobId = "your-job-id-here"
    sources = @("linkedin")
    maxCandidates = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3005/api/scrape" -Method Post -Body $body -ContentType "application/json"
```

**✅ Best for:** Advanced debugging, automation, integration testing

---

## 🎯 Recommended Testing Flow

### Quick Test (5 minutes):
1. ✅ Start main app: `npm run dev`
2. ✅ Start scraper server: `npm run scraper-ui:server` (if local)
3. ✅ Go to AddJob page in your app
4. ✅ Post a job with simple requirements
5. ✅ Click "Source Candidates"
6. ✅ Watch terminal logs

### Full Test (Verify Everything):
1. ✅ Test health endpoint: `.\test-scraping.ps1` (no args)
2. ✅ List jobs: `.\get-jobs.ps1`
3. ✅ Test with job ID: `.\test-scraping.ps1 <job-id> 5`
4. ✅ Check Railway: Visit health endpoint in browser
5. ✅ Test in main app: AddJob page

---

## 📋 What to Check in Logs

**Good signs:**
- ✅ `✅ LINKEDIN: Found X, Saved Y candidates`
- ✅ `📊 Statistics: X invalid, Y duplicates, Z save errors`
- ✅ Candidates appear in database

**Problem signs:**
- ❌ `Found 0 profiles` → Apify actor issue or query too specific
- ❌ `Apify not configured` → Missing API token
- ❌ `Error scraping` → Check error details in logs

---

## 🚀 Quick Start Command

**To test everything at once:**

```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: Scraper server (if testing locally)
npm run scraper-ui:server

# Terminal 3: Run test script
.\test-scraping.ps1
```

Then open your browser → AddJob page → Post a job → Source candidates!
