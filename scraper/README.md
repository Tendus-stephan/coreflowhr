# CoreFlow Candidate Scraper

A standalone service for scraping **candidate profiles** (not job postings) from LinkedIn and GitHub to integrate with CoreFlow HR.

## Overview

This scraper service operates independently from the main CoreFlow site and sources **real candidate profiles** from:
- **LinkedIn** (Candidate profiles - passive candidates, all industries)
- **GitHub** (Developer profiles - technical roles, active contributors)
- **MightyRecruiter** (Resume database - 21M+ resumes, all roles, FREE)
- **JobSpider** (Resume database - all roles, FREE)

⚠️ **Important**: We scrape **candidate profiles** (job seekers), not job postings. All sources are FREE and provide actual candidate profiles matching your job criteria.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp scraper/.env.example .env
```

Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)

Required scraping provider:
- `APIFY_API_TOKEN` - Apify API token (FREE tier: 5 compute units/month, then ~$0.25/unit)

Optional:
- `GITHUB_TOKEN` - GitHub personal access token (for higher rate limits)

### 3. Run Database Migration

Execute the migration to add the 'scraped' source type:

```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/add_scraped_source_type.sql
```

## Usage

### Scrape Candidates for a Job

```bash
# Scrape from all sources
npm run scraper:job -- --job-id <job-uuid>

# Scrape only from LinkedIn
npm run scraper:job -- --job-id <job-uuid> --sources linkedin

# Scrape with custom limits
npm run scraper:job -- --job-id <job-uuid> --max-candidates 100 --min-match-score 70

# Scrape from multiple sources
npm run scraper:job -- --job-id <job-uuid> --sources linkedin,github
```

### Options

- `--job-id <uuid>` - **Required**. Job ID to scrape candidates for
- `--sources <list>` - Comma-separated sources: `linkedin`, `github`, `mightyrecruiter`, `jobspider` (all FREE and provide candidate profiles)
- `--max-candidates <n>` - Maximum candidates per source (default: 50)
- `--min-match-score <n>` - Minimum AI match score to save (default: 60)

## Architecture

```
scraper/
├── src/
│   ├── config/          # Database and provider configuration
│   ├── services/        # Core services
│   │   ├── providers/   # Scraping provider implementations
│   │   ├── ScrapingService.ts    # Main orchestrator
│   │   ├── DatabaseService.ts     # Database operations
│   │   └── CandidateProcessor.ts # Data processing & scoring
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Utilities (logger, query builder)
└── scripts/             # CLI scripts
```

## How It Works

1. **Query Building**: Converts job requirements to provider-specific search queries
2. **Scraping**: Calls Apify for LinkedIn/job boards, GitHub API for developers
3. **Processing**: Normalizes, validates, and calculates match scores
4. **Storage**: Saves candidates to database with `source: 'scraped'` and `is_test: false`

## Provider Selection

- **LinkedIn**: Apify (FREE tier: 5 compute units/month, then ~$0.25/unit)
- **GitHub**: Official GitHub REST API (FREE, no scraping service needed)
- **MightyRecruiter**: Web scraping (FREE - 21M+ resumes, no API key needed)
- **JobSpider**: Web scraping (FREE resume database, no API key needed)

⚠️ **Important**: 
- All sources are **FREE** and provide **candidate profiles** (job seekers)
- No monthly fees - $0/month for all sources
- All sources actively maintained by job seekers (resumes, profiles)

## Cost

- **GitHub**: FREE (5,000 requests/hour with token, 60/hour without)
- **LinkedIn (Apify)**: FREE tier (5 compute units/month), then ~$0.25/compute unit
- **MightyRecruiter**: FREE (21M+ resumes, no fees)
- **JobSpider**: FREE (resume database, no fees)
- **Total**: $0/month for all sources!

## Notes

- Scraped candidates are marked with `source: 'scraped'` and `is_test: false`
- Candidates are deduplicated by email + job_id
- Only candidates with match score >= min-match-score are saved
- The scraper runs independently from the main CoreFlow site

## Future Enhancements

- Phase 2: GitHub API integration
- Phase 3: Enhanced job board scraping
- Phase 4: Additional passive sources (Twitter, portfolios, conferences)




## Future Enhancements

- Phase 2: GitHub API integration
- Phase 3: Enhanced job board scraping
- Phase 4: Additional passive sources (Twitter, portfolios, conferences)


