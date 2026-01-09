# Scraper Setup Guide

## Required Setup Steps

### 1. Database Migration (One-time)

Run this SQL in your Supabase SQL Editor:
```sql
-- File: supabase/migrations/add_scraped_source_type.sql
ALTER TABLE candidates 
DROP CONSTRAINT IF EXISTS candidates_source_check;

ALTER TABLE candidates 
ADD CONSTRAINT candidates_source_check 
CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral', 'scraped'));
```

### 2. Choose a Scraping Provider

You need **at least one** of these providers:

#### Option A: Apify (Recommended for LinkedIn)

**Why Apify?**
- Pre-built LinkedIn scrapers (no custom code needed)
- FREE tier: 5 compute units/month
- Pay-as-you-go: ~$0.25/compute unit after free tier
- Best for LinkedIn profile scraping

**Setup Steps:**
1. Go to https://apify.com
2. Sign up for a free account
3. Go to Settings → Integrations → API tokens
4. Copy your API token
5. Add to `.env`: `APIFY_API_TOKEN=your_token_here`

**Free Tier Limits:**
- 5 compute units/month
- Each LinkedIn scrape uses ~1-2 compute units
- Enough for testing and light usage

#### Option B: ScraperAPI (Alternative/Fallback)

**Why ScraperAPI?**
- General-purpose scraping (LinkedIn, job boards, etc.)
- FREE tier: 1,000 requests/month
- Paid: $29/month (Starter plan)
- Good fallback if Apify fails

**Setup Steps:**
1. Go to https://www.scraperapi.com
2. Sign up for a free account
3. Go to Dashboard → API Key
4. Copy your API key
5. Add to `.env`: `SCRAPERAPI_KEY=your_key_here`

**Free Tier Limits:**
- 1,000 requests/month
- Good for testing and light usage

#### Option C: GitHub API (Free, Tech Roles Only)

**Why GitHub?**
- Completely FREE
- No API key needed (but recommended for higher limits)
- 5,000 requests/hour with token (vs 60 without)

**Setup Steps (Optional but Recommended):**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `public_repo` (read-only)
4. Copy token
5. Add to `.env`: `GITHUB_TOKEN=your_token_here`

**Note:** GitHub is only for tech roles. For non-tech roles, you need Apify or ScraperAPI.

### 3. Create `.env` File

Create a `.env` file in the project root:

```env
# Database (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scraping Providers (At least one required)
# Option 1: Apify (Recommended)
APIFY_API_TOKEN=your_apify_api_token

# Option 2: ScraperAPI (Alternative)
SCRAPERAPI_KEY=your_scraperapi_key

# Option 3: GitHub (Optional, for tech roles)
GITHUB_TOKEN=your_github_token

# Configuration (Optional)
SCRAPER_MAX_CANDIDATES_PER_JOB=50
SCRAPER_MIN_MATCH_SCORE=60
LOG_LEVEL=info
```

### 4. Get Your Supabase Credentials

**SUPABASE_URL:**
- Go to your Supabase project dashboard
- Settings → API
- Copy "Project URL"

**SUPABASE_SERVICE_ROLE_KEY:**
- Same page (Settings → API)
- Copy "service_role" key (⚠️ Keep this secret!)
- This key bypasses Row Level Security (RLS)

## Quick Start Recommendations

### For Testing (Free Tier)
1. Sign up for **Apify** (free tier: 5 compute units/month)
2. Sign up for **ScraperAPI** (free tier: 1,000 requests/month)
3. Get **GitHub token** (free, unlimited)
4. Set up all three in `.env`

This gives you:
- LinkedIn scraping (Apify) - 2-3 test runs/month
- Job boards (ScraperAPI) - ~100 requests/month
- GitHub (unlimited with token)

### For Production
1. Start with **Apify** free tier
2. Upgrade to paid when needed (~$0.25/compute unit)
3. Add **ScraperAPI** as fallback ($29/month)
4. Use **GitHub** for tech roles (free)

## Cost Breakdown

### Free Tier (Testing)
- Apify: 5 compute units/month (FREE)
- ScraperAPI: 1,000 requests/month (FREE)
- GitHub: Unlimited (FREE with token)

**Total: $0/month** (enough for testing)

### Light Usage (Small Team)
- Apify: ~20 compute units/month = $5/month
- ScraperAPI: 1,000 requests/month (FREE tier)
- GitHub: Unlimited (FREE)

**Total: ~$5/month**

### Production (Active Scraping)
- Apify: ~100 compute units/month = $25/month
- ScraperAPI: Starter plan = $29/month
- GitHub: Unlimited (FREE)

**Total: ~$54/month**

## Verification

After setting up, verify your configuration:

```bash
# List active jobs (tests database connection)
npm run scraper:list-jobs

# If successful, you'll see your active jobs
# If it fails, check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

## Next Steps

Once setup is complete:

1. **Run database migration** (if not done)
2. **Create `.env` file** with your credentials
3. **List jobs**: `npm run scraper:list-jobs`
4. **Scrape candidates**: `npm run scraper:job -- --job-id <uuid> --sources linkedin`

## Troubleshooting

### "Missing provider configuration"
- Make sure at least one provider API key is in `.env`
- Check that the key is correct (no extra spaces)

### "ENOTFOUND" error
- Check your `SUPABASE_URL` is correct
- Verify you have internet connection

### "No active jobs found"
- Create a job in the CoreFlow dashboard first
- Make sure the job status is "Active"

### Apify "Insufficient compute units"
- You've used your free tier (5 units/month)
- Either wait for next month or upgrade to paid

### ScraperAPI "Rate limit exceeded"
- You've used your free tier (1,000 requests/month)
- Either wait for next month or upgrade to paid


