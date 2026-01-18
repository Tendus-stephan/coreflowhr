# FREE Candidate Sources - Job Seekers Only

## Overview

All sources are **FREE** and provide **candidate profiles** (job seekers), not job postings. Perfect for finding people actively looking for jobs without any monthly fees!

## Current Sources (All FREE!)

### ✅ LinkedIn (via Apify)
- **What**: Candidate profiles with work history, skills, education
- **Type**: Passive candidates (not actively job searching) + Active job seekers
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE tier (5 searches/month), then ~$0.25/search
- **Setup**: Set `APIFY_API_TOKEN` in `.env.local`

### ✅ GitHub (via GitHub API)
- **What**: Developer profiles with code contributions, repositories
- **Type**: Active developers with public profiles
- **Use case**: Technical roles only
- **Cost**: FREE (5,000 requests/hour with token, 60/hour without)
- **Setup**: Optional - set `GITHUB_TOKEN` for higher rate limits

### ✅ MightyRecruiter (Web Scraping)
- **What**: Resume database with 21+ million resumes
- **Type**: Active job seekers (people actively looking for jobs)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE (no API key, no fees)
- **Setup**: No setup required - automatically available!

### ✅ JobSpider (Web Scraping)
- **What**: Resume database with job seeker profiles
- **Type**: Active job seekers (people actively looking for jobs)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE (no API key, no fees)
- **Setup**: No setup required - automatically available!

## Why These Sources?

All sources provide **candidate profiles** from **job seekers**:
- ✅ **Resume databases** (MightyRecruiter, JobSpider) - People actively looking for jobs
- ✅ **Professional profiles** (LinkedIn) - Both passive and active job seekers
- ✅ **Developer profiles** (GitHub) - Technical professionals

**NOT included:**
- ❌ Job boards (Indeed, Stack Overflow Jobs) - These show **job postings**, not candidates
- ❌ Freelance platforms (Fiverr, Upwork) - These are for **gigs**, not full-time job seekers

## Cost Breakdown

| Source | Cost | Setup Required |
|--------|------|----------------|
| **LinkedIn** | FREE tier (5 searches/month), then ~$0.25/search | Apify token |
| **GitHub** | FREE (unlimited with token) | Optional token |
| **MightyRecruiter** | FREE (21M+ resumes) | None - automatic! |
| **JobSpider** | FREE (resume database) | None - automatic! |
| **Total** | **$0/month** for light usage! | Minimal setup |

## Intelligent Source Selection

The system automatically selects sources based on job type:

### Technical Jobs
Priority: GitHub → LinkedIn → MightyRecruiter → JobSpider
- **GitHub**: Developer profiles with actual code (Priority 4)
- **LinkedIn**: Professional profiles (Priority 3)
- **MightyRecruiter**: 21M+ resumes including technical professionals (Priority 2)
- **JobSpider**: Resume database with technical job seekers (Priority 1)

### Non-Technical Jobs
Priority: LinkedIn → MightyRecruiter → JobSpider
- **LinkedIn**: All industries (Priority 3)
- **MightyRecruiter**: 21M+ resumes from all industries (Priority 2)
- **JobSpider**: Resume database from all industries (Priority 1)
- **GitHub**: Skipped (not relevant)

## Usage Examples

### Technical Job (Full-Stack Developer)
```bash
# Scrape from all sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,github,mightyrecruiter,jobspider

# Priority order: GitHub → LinkedIn → MightyRecruiter → JobSpider
```

### Non-Technical Job (Marketing Manager)
```bash
# Scrape from non-technical sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,mightyrecruiter,jobspider

# Priority order: LinkedIn → MightyRecruiter → JobSpider (GitHub skipped)
```

### Maximum Coverage (All Sources)
```bash
# Get candidates from all FREE sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,github,mightyrecruiter,jobspider --max-candidates 100
```

## Candidate Distribution

Candidates are distributed **equally** across selected sources:

**Example**: Technical job requesting 60 candidates
- GitHub: 15 candidates (FREE API)
- LinkedIn: 15 candidates (FREE tier available)
- MightyRecruiter: 15 candidates (FREE)
- JobSpider: 15 candidates (FREE)
- Total: 60 candidates - **$0 cost!**

## Setup Requirements

### Required (LinkedIn)
- Set `APIFY_API_TOKEN` in `.env.local`
- Sign up at https://apify.com (FREE)

### Optional (GitHub)
- Set `GITHUB_TOKEN` in `.env.local` for higher rate limits
- Get token at https://github.com/settings/tokens
- **Note**: Works without token (60 requests/hour vs 5,000/hour with token)

### Automatic (No Setup Needed!)
- **MightyRecruiter**: Automatically available - no API key needed
- **JobSpider**: Automatically available - no API key needed

## Next Steps

1. ✅ **Set up Apify token** for LinkedIn (if not already done)
2. ✅ **Test with a technical job** - should use GitHub, LinkedIn, MightyRecruiter, JobSpider
3. ✅ **Test with a non-technical job** - should use LinkedIn, MightyRecruiter, JobSpider
4. ✅ **Monitor results** - check which sources return the most candidates
5. ✅ **Enjoy FREE candidate sourcing!** - No monthly fees required



## Overview

All sources are **FREE** and provide **candidate profiles** (job seekers), not job postings. Perfect for finding people actively looking for jobs without any monthly fees!

## Current Sources (All FREE!)

### ✅ LinkedIn (via Apify)
- **What**: Candidate profiles with work history, skills, education
- **Type**: Passive candidates (not actively job searching) + Active job seekers
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE tier (5 searches/month), then ~$0.25/search
- **Setup**: Set `APIFY_API_TOKEN` in `.env.local`

### ✅ GitHub (via GitHub API)
- **What**: Developer profiles with code contributions, repositories
- **Type**: Active developers with public profiles
- **Use case**: Technical roles only
- **Cost**: FREE (5,000 requests/hour with token, 60/hour without)
- **Setup**: Optional - set `GITHUB_TOKEN` for higher rate limits

### ✅ MightyRecruiter (Web Scraping)
- **What**: Resume database with 21+ million resumes
- **Type**: Active job seekers (people actively looking for jobs)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE (no API key, no fees)
- **Setup**: No setup required - automatically available!

### ✅ JobSpider (Web Scraping)
- **What**: Resume database with job seeker profiles
- **Type**: Active job seekers (people actively looking for jobs)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE (no API key, no fees)
- **Setup**: No setup required - automatically available!

## Why These Sources?

All sources provide **candidate profiles** from **job seekers**:
- ✅ **Resume databases** (MightyRecruiter, JobSpider) - People actively looking for jobs
- ✅ **Professional profiles** (LinkedIn) - Both passive and active job seekers
- ✅ **Developer profiles** (GitHub) - Technical professionals

**NOT included:**
- ❌ Job boards (Indeed, Stack Overflow Jobs) - These show **job postings**, not candidates
- ❌ Freelance platforms (Fiverr, Upwork) - These are for **gigs**, not full-time job seekers

## Cost Breakdown

| Source | Cost | Setup Required |
|--------|------|----------------|
| **LinkedIn** | FREE tier (5 searches/month), then ~$0.25/search | Apify token |
| **GitHub** | FREE (unlimited with token) | Optional token |
| **MightyRecruiter** | FREE (21M+ resumes) | None - automatic! |
| **JobSpider** | FREE (resume database) | None - automatic! |
| **Total** | **$0/month** for light usage! | Minimal setup |

## Intelligent Source Selection

The system automatically selects sources based on job type:

### Technical Jobs
Priority: GitHub → LinkedIn → MightyRecruiter → JobSpider
- **GitHub**: Developer profiles with actual code (Priority 4)
- **LinkedIn**: Professional profiles (Priority 3)
- **MightyRecruiter**: 21M+ resumes including technical professionals (Priority 2)
- **JobSpider**: Resume database with technical job seekers (Priority 1)

### Non-Technical Jobs
Priority: LinkedIn → MightyRecruiter → JobSpider
- **LinkedIn**: All industries (Priority 3)
- **MightyRecruiter**: 21M+ resumes from all industries (Priority 2)
- **JobSpider**: Resume database from all industries (Priority 1)
- **GitHub**: Skipped (not relevant)

## Usage Examples

### Technical Job (Full-Stack Developer)
```bash
# Scrape from all sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,github,mightyrecruiter,jobspider

# Priority order: GitHub → LinkedIn → MightyRecruiter → JobSpider
```

### Non-Technical Job (Marketing Manager)
```bash
# Scrape from non-technical sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,mightyrecruiter,jobspider

# Priority order: LinkedIn → MightyRecruiter → JobSpider (GitHub skipped)
```

### Maximum Coverage (All Sources)
```bash
# Get candidates from all FREE sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,github,mightyrecruiter,jobspider --max-candidates 100
```

## Candidate Distribution

Candidates are distributed **equally** across selected sources:

**Example**: Technical job requesting 60 candidates
- GitHub: 15 candidates (FREE API)
- LinkedIn: 15 candidates (FREE tier available)
- MightyRecruiter: 15 candidates (FREE)
- JobSpider: 15 candidates (FREE)
- Total: 60 candidates - **$0 cost!**

## Setup Requirements

### Required (LinkedIn)
- Set `APIFY_API_TOKEN` in `.env.local`
- Sign up at https://apify.com (FREE)

### Optional (GitHub)
- Set `GITHUB_TOKEN` in `.env.local` for higher rate limits
- Get token at https://github.com/settings/tokens
- **Note**: Works without token (60 requests/hour vs 5,000/hour with token)

### Automatic (No Setup Needed!)
- **MightyRecruiter**: Automatically available - no API key needed
- **JobSpider**: Automatically available - no API key needed

## Next Steps

1. ✅ **Set up Apify token** for LinkedIn (if not already done)
2. ✅ **Test with a technical job** - should use GitHub, LinkedIn, MightyRecruiter, JobSpider
3. ✅ **Test with a non-technical job** - should use LinkedIn, MightyRecruiter, JobSpider
4. ✅ **Monitor results** - check which sources return the most candidates
5. ✅ **Enjoy FREE candidate sourcing!** - No monthly fees required

