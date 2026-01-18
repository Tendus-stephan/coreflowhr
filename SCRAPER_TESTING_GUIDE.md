# Scraper Testing Guide

## Step 1: Set Up Environment Variables

Create a `.env` file in the project root with:

```env
# Database (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scraping Providers (At least one required)
# Option 1: Apify (Recommended for LinkedIn)
APIFY_API_TOKEN=your_apify_token

# Option 2: ScraperAPI (Alternative)
SCRAPERAPI_KEY=your_scraperapi_key

# Option 3: GitHub (Optional, for tech roles)
GITHUB_TOKEN=your_github_token
```

**Where to get these:**
- **Supabase**: Go to your Supabase project → Settings → API
- **Apify**: https://apify.com → Settings → Integrations → API tokens
- **ScraperAPI**: https://www.scraperapi.com → Dashboard → API Key
- **GitHub**: https://github.com/settings/tokens → Generate new token (classic)

## Step 2: Create an Active Job

The scraper needs an active job to scrape candidates for. 

1. **Open your main CoreFlow site**: http://localhost:3002
2. **Log in** to your account
3. **Go to Jobs** section
4. **Create a new job** or **activate an existing job**:
   - Job must have status: **"Active"**
   - Fill in job details:
     - Title (e.g., "Senior Software Engineer")
     - Department
     - Location
     - Skills (important for matching)
     - Experience level
     - Description

## Step 3: Navigate the Scraper UI

1. **Open Scraper UI**: http://localhost:3003

2. **Check Provider Status** (top section):
   - ✅ Green dot = Provider configured and ready
   - ❌ Red dot = Provider not configured
   - Configure at least one provider to start scraping

3. **View Active Jobs** (left panel):
   - Click "Refresh" if you don't see your job
   - Click on a job to select it
   - You'll see: Job title, department, location, applicant count

4. **Configure Scraping** (right panel, after selecting a job):
   - **Sources**: Select which sources to scrape
     - LinkedIn (requires Apify or ScraperAPI)
     - GitHub (requires GitHub token, tech roles only)
     - Job Boards (requires ScraperAPI)
   - **Max Candidates**: How many candidates to scrape per source (default: 50)
   - **Min Match Score**: Minimum AI match score to save (default: 60)

5. **Start Scraping**:
   - Click "Start Scraping" button
   - Watch the progress bar
   - See real-time status updates

6. **View Results**:
   - After scraping completes, see results by source:
     - Found: How many candidates were found
     - Saved: How many passed validation and match score
   - Scroll down to see **Scraped Candidates**:
     - Candidate name
     - Email
     - Match score (percentage)
     - Stage (usually "New")
     - Skills
     - Location
     - Profile URL (if available)

## Step 4: Verify Results in Main Site

1. **Go back to main CoreFlow site**: http://localhost:3002
2. **Navigate to Candidates** section
3. **Filter by Source**: Look for candidates with `source: 'scraped'`
4. **Check candidate details**:
   - All scraped candidates should have `source: 'scraped'`
   - `is_test: false` (production candidates)
   - Stage: "New"
   - AI match score should be visible

## Testing Checklist

### ✅ Basic Test
- [ ] Provider status shows at least one green dot
- [ ] Active jobs list shows your job
- [ ] Can select a job
- [ ] Can configure scraping options
- [ ] Can start scraping
- [ ] See progress updates
- [ ] See results after completion

### ✅ Data Quality Test
- [ ] Scraped candidates appear in main site
- [ ] Candidates have valid email addresses
- [ ] Match scores are reasonable (60-100)
- [ ] Skills are populated
- [ ] Location is populated
- [ ] Profile URLs work (if provided)

### ✅ Error Handling Test
- [ ] No providers configured → Shows warning
- [ ] Invalid job ID → Shows error
- [ ] Network error → Shows error message
- [ ] API rate limit → Shows appropriate error

## Troubleshooting

### "No active jobs found"
- Make sure you created a job in the main site
- Job status must be "Active" (not "Draft" or "Closed")
- Click "Refresh" button in scraper UI
- Check that you're logged into the same account

### "Provider not configured"
- Check your `.env` file has the API key
- Restart the scraper UI server after adding keys
- Verify the API key is correct (no extra spaces)

### "Error fetching active jobs"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Verify Supabase credentials are correct
- Check internet connection

### "No candidates saved"
- Check match score threshold (try lowering to 50)
- Verify job has skills/requirements filled in
- Check provider logs for errors
- Some providers may have rate limits on free tier

### Scraping takes too long
- Reduce "Max Candidates" (try 10-20 for testing)
- Select only one source at a time
- Check provider API status

## Quick Test Workflow

1. **Setup** (one-time):
   ```bash
   # Add to .env file
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   APIFY_API_TOKEN=your_token  # or SCRAPERAPI_KEY
   ```

2. **Create Job**:
   - Main site → Jobs → Create/Activate job

3. **Test Scraping**:
   - Scraper UI → Select job → Configure → Start
   - Wait for completion
   - Check results

4. **Verify**:
   - Main site → Candidates → Filter by "scraped" source

## Next Steps After Testing

Once basic scraping works:
- Test with different job types (tech vs non-tech)
- Test with different sources (LinkedIn, GitHub, Job Boards)
- Adjust match score thresholds
- Monitor API usage and costs
- Set up scheduled scraping (future feature)



## Step 1: Set Up Environment Variables

Create a `.env` file in the project root with:

```env
# Database (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scraping Providers (At least one required)
# Option 1: Apify (Recommended for LinkedIn)
APIFY_API_TOKEN=your_apify_token

# Option 2: ScraperAPI (Alternative)
SCRAPERAPI_KEY=your_scraperapi_key

# Option 3: GitHub (Optional, for tech roles)
GITHUB_TOKEN=your_github_token
```

**Where to get these:**
- **Supabase**: Go to your Supabase project → Settings → API
- **Apify**: https://apify.com → Settings → Integrations → API tokens
- **ScraperAPI**: https://www.scraperapi.com → Dashboard → API Key
- **GitHub**: https://github.com/settings/tokens → Generate new token (classic)

## Step 2: Create an Active Job

The scraper needs an active job to scrape candidates for. 

1. **Open your main CoreFlow site**: http://localhost:3002
2. **Log in** to your account
3. **Go to Jobs** section
4. **Create a new job** or **activate an existing job**:
   - Job must have status: **"Active"**
   - Fill in job details:
     - Title (e.g., "Senior Software Engineer")
     - Department
     - Location
     - Skills (important for matching)
     - Experience level
     - Description

## Step 3: Navigate the Scraper UI

1. **Open Scraper UI**: http://localhost:3003

2. **Check Provider Status** (top section):
   - ✅ Green dot = Provider configured and ready
   - ❌ Red dot = Provider not configured
   - Configure at least one provider to start scraping

3. **View Active Jobs** (left panel):
   - Click "Refresh" if you don't see your job
   - Click on a job to select it
   - You'll see: Job title, department, location, applicant count

4. **Configure Scraping** (right panel, after selecting a job):
   - **Sources**: Select which sources to scrape
     - LinkedIn (requires Apify or ScraperAPI)
     - GitHub (requires GitHub token, tech roles only)
     - Job Boards (requires ScraperAPI)
   - **Max Candidates**: How many candidates to scrape per source (default: 50)
   - **Min Match Score**: Minimum AI match score to save (default: 60)

5. **Start Scraping**:
   - Click "Start Scraping" button
   - Watch the progress bar
   - See real-time status updates

6. **View Results**:
   - After scraping completes, see results by source:
     - Found: How many candidates were found
     - Saved: How many passed validation and match score
   - Scroll down to see **Scraped Candidates**:
     - Candidate name
     - Email
     - Match score (percentage)
     - Stage (usually "New")
     - Skills
     - Location
     - Profile URL (if available)

## Step 4: Verify Results in Main Site

1. **Go back to main CoreFlow site**: http://localhost:3002
2. **Navigate to Candidates** section
3. **Filter by Source**: Look for candidates with `source: 'scraped'`
4. **Check candidate details**:
   - All scraped candidates should have `source: 'scraped'`
   - `is_test: false` (production candidates)
   - Stage: "New"
   - AI match score should be visible

## Testing Checklist

### ✅ Basic Test
- [ ] Provider status shows at least one green dot
- [ ] Active jobs list shows your job
- [ ] Can select a job
- [ ] Can configure scraping options
- [ ] Can start scraping
- [ ] See progress updates
- [ ] See results after completion

### ✅ Data Quality Test
- [ ] Scraped candidates appear in main site
- [ ] Candidates have valid email addresses
- [ ] Match scores are reasonable (60-100)
- [ ] Skills are populated
- [ ] Location is populated
- [ ] Profile URLs work (if provided)

### ✅ Error Handling Test
- [ ] No providers configured → Shows warning
- [ ] Invalid job ID → Shows error
- [ ] Network error → Shows error message
- [ ] API rate limit → Shows appropriate error

## Troubleshooting

### "No active jobs found"
- Make sure you created a job in the main site
- Job status must be "Active" (not "Draft" or "Closed")
- Click "Refresh" button in scraper UI
- Check that you're logged into the same account

### "Provider not configured"
- Check your `.env` file has the API key
- Restart the scraper UI server after adding keys
- Verify the API key is correct (no extra spaces)

### "Error fetching active jobs"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Verify Supabase credentials are correct
- Check internet connection

### "No candidates saved"
- Check match score threshold (try lowering to 50)
- Verify job has skills/requirements filled in
- Check provider logs for errors
- Some providers may have rate limits on free tier

### Scraping takes too long
- Reduce "Max Candidates" (try 10-20 for testing)
- Select only one source at a time
- Check provider API status

## Quick Test Workflow

1. **Setup** (one-time):
   ```bash
   # Add to .env file
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   APIFY_API_TOKEN=your_token  # or SCRAPERAPI_KEY
   ```

2. **Create Job**:
   - Main site → Jobs → Create/Activate job

3. **Test Scraping**:
   - Scraper UI → Select job → Configure → Start
   - Wait for completion
   - Check results

4. **Verify**:
   - Main site → Candidates → Filter by "scraped" source

## Next Steps After Testing

Once basic scraping works:
- Test with different job types (tech vs non-tech)
- Test with different sources (LinkedIn, GitHub, Job Boards)
- Adjust match score thresholds
- Monitor API usage and costs
- Set up scheduled scraping (future feature)

