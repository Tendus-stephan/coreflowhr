# CoreFlow Candidate Scraper

A standalone service for scraping real candidate data from LinkedIn, GitHub, and job boards to integrate with CoreFlow HR.

## Overview

This scraper service operates independently from the main CoreFlow site and sources real candidates from:
- **LinkedIn** (Primary - passive candidates, all industries)
- **GitHub** (Tech roles, developers)
- **Job Boards** (Active job seekers - Indeed, Stack Overflow)

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

At least one scraping provider:
- `APIFY_API_TOKEN` - Apify API token (recommended for LinkedIn)
- `SCRAPERAPI_KEY` - ScraperAPI key (alternative/fallback)

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
- `--sources <list>` - Comma-separated sources: `linkedin`, `github`, `jobboard`
- `--max-candidates <n>` - Maximum candidates per source (default: 50)
- `--min-match-score <n>` - Minimum AI match score to save (default: 60)
- `--provider <name>` - Preferred provider: `apify` or `scraperapi`

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
2. **Scraping**: Calls provider APIs (Apify, ScraperAPI, GitHub) to fetch candidate data
3. **Processing**: Normalizes, validates, and calculates match scores
4. **Storage**: Saves candidates to database with `source: 'scraped'` and `is_test: false`

## Provider Selection

- **LinkedIn**: Apify (preferred) → ScraperAPI (fallback)
- **GitHub**: Official GitHub REST API (free, no scraping service)
- **Job Boards**: ScraperAPI (Indeed, Stack Overflow)

## Cost

- **GitHub**: FREE (5,000 requests/hour with token)
- **Apify**: FREE tier (5 compute units/month), then ~$0.25/compute unit
- **ScraperAPI**: FREE tier (1,000 requests/month), then $29/month

## Notes

- Scraped candidates are marked with `source: 'scraped'` and `is_test: false`
- Candidates are deduplicated by email + job_id
- Only candidates with match score >= min-match-score are saved
- The scraper runs independently from the main CoreFlow site

## Future Enhancements

- Phase 2: GitHub API integration
- Phase 3: Enhanced job board scraping
- Phase 4: Additional passive sources (Twitter, portfolios, conferences)


