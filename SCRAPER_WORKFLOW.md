# Scraper Workflow Guide

## Complete Workflow: From Job to Candidates

### Step 1: Create/Activate a Job in CoreFlow

1. **Go to CoreFlow**: http://localhost:3002
2. **Log in** with your account
3. **Navigate to Jobs** section
4. **Create a new job** or **activate an existing job**:
   - Job status must be **"Active"** (not Draft or Closed)
   - Fill in job details:
     - **Title** (e.g., "Senior Software Engineer")
     - **Department**
     - **Location**
     - **Skills** (important for matching candidates)
     - **Experience Level**
     - **Description**

### Step 2: Scrape Candidates

1. **Open Scraper UI**: http://localhost:3003
2. **Check Provider Status**:
   - ✅ Green dots = Providers configured and ready
   - ❌ Red dots = Need to add API keys to `.env.local`
3. **Select Your Job**:
   - Click "Refresh" if you don't see your job
   - Click on the job to select it
4. **Configure Scraping**:
   - **Sources**: Select which sources to scrape
     - LinkedIn (requires Apify or ScraperAPI)
     - GitHub (requires GitHub token, tech roles only)
     - Job Boards (requires ScraperAPI)
   - **Max Candidates**: Default 50, max 200 per job
     - This cap prevents excessive API usage and costs
   - **Min Match Score**: Default 60 (0-100)
     - Higher = more selective, fewer candidates
     - Lower = more candidates, may include less relevant ones
5. **Start Scraping**:
   - Click "Start Scraping"
   - Watch progress in real-time
   - See results by source (Found vs Saved)

### Step 3: View Candidates in CoreFlow

1. **Go back to CoreFlow**: http://localhost:3002
2. **Navigate to Candidates** section
3. **Filter by Source**: Look for candidates with `source: 'scraped'`
4. **View Candidate Details**:
   - All scraped candidates are associated with the **admin account** (tendusstephan@gmail.com)
   - They appear under the job you scraped for
   - Each candidate has:
     - Match score (AI-generated)
     - Skills
     - Location
     - Profile URL (if available)
     - Stage: "New"

## Important Details

### Admin Account

- **All scraped candidates** are saved under the admin account: **tendusstephan@gmail.com**
- This keeps scraped candidates separate from user-specific candidates
- The admin account owns all scraped candidates, but they're linked to the specific job
- This prevents mixing scraped candidates with user's own candidates

### Candidate Caps

- **Default**: 50 candidates per job per scraping session
- **Maximum**: 200 candidates per job (hard limit)
- **Why caps?**
  - Control API costs (Apify, ScraperAPI charge per request)
  - Prevent excessive database growth
  - Focus on quality over quantity
  - Each scraping session respects the cap

### Cost Control

The caps help control costs:
- **Apify**: ~$0.25 per compute unit (after free tier)
- **ScraperAPI**: $29/month (after free tier)
- **GitHub**: Free (unlimited with token)

**Example costs:**
- 50 candidates from LinkedIn ≈ 1-2 Apify compute units ≈ $0.25-$0.50
- 200 candidates ≈ 4-8 compute units ≈ $1-$2

### Match Score

- **60-70**: Good balance (default)
- **70-80**: More selective, higher quality
- **80-90**: Very selective, top candidates only
- **Below 60**: More candidates, may include less relevant ones

## Troubleshooting

### "No active jobs found"
- Make sure job status is "Active" in CoreFlow
- Click "Refresh" in scraper UI
- Verify you're logged into the same account

### "No candidates saved"
- Check match score threshold (try lowering to 50)
- Verify job has skills/requirements filled in
- Check provider logs for errors
- Some providers may have rate limits on free tier

### Candidates not appearing in CoreFlow
- Check that candidates have `source: 'scraped'`
- Verify they're linked to the correct job
- Check admin account (tendusstephan@gmail.com) has access

### High API costs
- Reduce "Max Candidates" (try 20-30 for testing)
- Increase "Min Match Score" (70-80) to get fewer, better candidates
- Use only one source at a time for testing
- Monitor provider usage dashboards

## Best Practices

1. **Start Small**: Test with 10-20 candidates first
2. **Adjust Match Score**: Start at 60, increase if too many low-quality candidates
3. **One Source at a Time**: Test LinkedIn first, then add GitHub/Job Boards
4. **Monitor Costs**: Check provider dashboards regularly
5. **Review Candidates**: Check quality before scraping more
6. **Use Admin Account**: All scraped candidates go to tendusstephan@gmail.com

## Next Steps After Scraping

Once candidates are in CoreFlow:
1. **Review Candidates**: Check match scores and profiles
2. **Move to Screening**: For promising candidates
3. **Upload CVs**: If candidates have profile URLs
4. **Start Workflow**: Candidates in "New" stage trigger email workflows
5. **Track Progress**: Move candidates through stages



## Complete Workflow: From Job to Candidates

### Step 1: Create/Activate a Job in CoreFlow

1. **Go to CoreFlow**: http://localhost:3002
2. **Log in** with your account
3. **Navigate to Jobs** section
4. **Create a new job** or **activate an existing job**:
   - Job status must be **"Active"** (not Draft or Closed)
   - Fill in job details:
     - **Title** (e.g., "Senior Software Engineer")
     - **Department**
     - **Location**
     - **Skills** (important for matching candidates)
     - **Experience Level**
     - **Description**

### Step 2: Scrape Candidates

1. **Open Scraper UI**: http://localhost:3003
2. **Check Provider Status**:
   - ✅ Green dots = Providers configured and ready
   - ❌ Red dots = Need to add API keys to `.env.local`
3. **Select Your Job**:
   - Click "Refresh" if you don't see your job
   - Click on the job to select it
4. **Configure Scraping**:
   - **Sources**: Select which sources to scrape
     - LinkedIn (requires Apify or ScraperAPI)
     - GitHub (requires GitHub token, tech roles only)
     - Job Boards (requires ScraperAPI)
   - **Max Candidates**: Default 50, max 200 per job
     - This cap prevents excessive API usage and costs
   - **Min Match Score**: Default 60 (0-100)
     - Higher = more selective, fewer candidates
     - Lower = more candidates, may include less relevant ones
5. **Start Scraping**:
   - Click "Start Scraping"
   - Watch progress in real-time
   - See results by source (Found vs Saved)

### Step 3: View Candidates in CoreFlow

1. **Go back to CoreFlow**: http://localhost:3002
2. **Navigate to Candidates** section
3. **Filter by Source**: Look for candidates with `source: 'scraped'`
4. **View Candidate Details**:
   - All scraped candidates are associated with the **admin account** (tendusstephan@gmail.com)
   - They appear under the job you scraped for
   - Each candidate has:
     - Match score (AI-generated)
     - Skills
     - Location
     - Profile URL (if available)
     - Stage: "New"

## Important Details

### Admin Account

- **All scraped candidates** are saved under the admin account: **tendusstephan@gmail.com**
- This keeps scraped candidates separate from user-specific candidates
- The admin account owns all scraped candidates, but they're linked to the specific job
- This prevents mixing scraped candidates with user's own candidates

### Candidate Caps

- **Default**: 50 candidates per job per scraping session
- **Maximum**: 200 candidates per job (hard limit)
- **Why caps?**
  - Control API costs (Apify, ScraperAPI charge per request)
  - Prevent excessive database growth
  - Focus on quality over quantity
  - Each scraping session respects the cap

### Cost Control

The caps help control costs:
- **Apify**: ~$0.25 per compute unit (after free tier)
- **ScraperAPI**: $29/month (after free tier)
- **GitHub**: Free (unlimited with token)

**Example costs:**
- 50 candidates from LinkedIn ≈ 1-2 Apify compute units ≈ $0.25-$0.50
- 200 candidates ≈ 4-8 compute units ≈ $1-$2

### Match Score

- **60-70**: Good balance (default)
- **70-80**: More selective, higher quality
- **80-90**: Very selective, top candidates only
- **Below 60**: More candidates, may include less relevant ones

## Troubleshooting

### "No active jobs found"
- Make sure job status is "Active" in CoreFlow
- Click "Refresh" in scraper UI
- Verify you're logged into the same account

### "No candidates saved"
- Check match score threshold (try lowering to 50)
- Verify job has skills/requirements filled in
- Check provider logs for errors
- Some providers may have rate limits on free tier

### Candidates not appearing in CoreFlow
- Check that candidates have `source: 'scraped'`
- Verify they're linked to the correct job
- Check admin account (tendusstephan@gmail.com) has access

### High API costs
- Reduce "Max Candidates" (try 20-30 for testing)
- Increase "Min Match Score" (70-80) to get fewer, better candidates
- Use only one source at a time for testing
- Monitor provider usage dashboards

## Best Practices

1. **Start Small**: Test with 10-20 candidates first
2. **Adjust Match Score**: Start at 60, increase if too many low-quality candidates
3. **One Source at a Time**: Test LinkedIn first, then add GitHub/Job Boards
4. **Monitor Costs**: Check provider dashboards regularly
5. **Review Candidates**: Check quality before scraping more
6. **Use Admin Account**: All scraped candidates go to tendusstephan@gmail.com

## Next Steps After Scraping

Once candidates are in CoreFlow:
1. **Review Candidates**: Check match scores and profiles
2. **Move to Screening**: For promising candidates
3. **Upload CVs**: If candidates have profile URLs
4. **Start Workflow**: Candidates in "New" stage trigger email workflows
5. **Track Progress**: Move candidates through stages

