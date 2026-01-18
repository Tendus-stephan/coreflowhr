# Candidate Profiles Only - No Job Postings

## What We Scrape

We focus **exclusively on candidate profiles** - real people who can be hired, not job postings.

### ✅ LinkedIn (via Apify)
- **What**: Candidate profiles with work history, skills, education
- **Type**: Passive candidates (not actively job searching)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE tier (5 searches/month), then ~$0.25/search

### ✅ GitHub (via GitHub API)
- **What**: Developer profiles with code contributions, repositories
- **Type**: Active developers with public profiles
- **Use case**: Technical roles only
- **Cost**: FREE (5,000 requests/hour with token, 60/hour without)

## ❌ What We DON'T Scrape

### Job Boards (Indeed, Stack Overflow Jobs, etc.)
- **Why excluded**: Job boards return **job postings** (employer listings), NOT candidate profiles
- **Reality**: Job boards show available jobs, not people looking for jobs
- **Result**: Would return 0 candidate profiles (by design)

## Why This Matters

For candidate sourcing, you need:
- ✅ **Profiles of candidates** (LinkedIn, GitHub)
- ❌ **NOT job postings** (job boards)

Job boards are for **finding jobs**, not **finding candidates**.

## Current Sources Summary

| Source | What It Provides | Candidate Profiles? | Cost |
|--------|-----------------|---------------------|------|
| **LinkedIn** | Professional profiles, work history | ✅ YES | FREE tier available |
| **GitHub** | Developer profiles, code contributions | ✅ YES | FREE |
| ~~Job Boards~~ | ~~Job postings~~ | ❌ NO | N/A |

## Usage

```bash
# Scrape from LinkedIn and GitHub (technical roles)
npm run scraper:job -- --job-id <uuid> --sources linkedin,github

# Scrape from LinkedIn only (non-technical roles)
npm run scraper:job -- --job-id <uuid> --sources linkedin

# Scrape from GitHub only (technical roles, developers)
npm run scraper:job -- --job-id <uuid> --sources github
```

## Intelligent Source Selection

The system automatically selects sources based on job type:

- **Technical jobs**: GitHub (primary) → LinkedIn (secondary)
- **Non-technical jobs**: LinkedIn only (GitHub skipped)

This ensures we're always scraping **candidate profiles**, not job postings.



## What We Scrape

We focus **exclusively on candidate profiles** - real people who can be hired, not job postings.

### ✅ LinkedIn (via Apify)
- **What**: Candidate profiles with work history, skills, education
- **Type**: Passive candidates (not actively job searching)
- **Use case**: All roles (technical + non-technical)
- **Cost**: FREE tier (5 searches/month), then ~$0.25/search

### ✅ GitHub (via GitHub API)
- **What**: Developer profiles with code contributions, repositories
- **Type**: Active developers with public profiles
- **Use case**: Technical roles only
- **Cost**: FREE (5,000 requests/hour with token, 60/hour without)

## ❌ What We DON'T Scrape

### Job Boards (Indeed, Stack Overflow Jobs, etc.)
- **Why excluded**: Job boards return **job postings** (employer listings), NOT candidate profiles
- **Reality**: Job boards show available jobs, not people looking for jobs
- **Result**: Would return 0 candidate profiles (by design)

## Why This Matters

For candidate sourcing, you need:
- ✅ **Profiles of candidates** (LinkedIn, GitHub)
- ❌ **NOT job postings** (job boards)

Job boards are for **finding jobs**, not **finding candidates**.

## Current Sources Summary

| Source | What It Provides | Candidate Profiles? | Cost |
|--------|-----------------|---------------------|------|
| **LinkedIn** | Professional profiles, work history | ✅ YES | FREE tier available |
| **GitHub** | Developer profiles, code contributions | ✅ YES | FREE |
| ~~Job Boards~~ | ~~Job postings~~ | ❌ NO | N/A |

## Usage

```bash
# Scrape from LinkedIn and GitHub (technical roles)
npm run scraper:job -- --job-id <uuid> --sources linkedin,github

# Scrape from LinkedIn only (non-technical roles)
npm run scraper:job -- --job-id <uuid> --sources linkedin

# Scrape from GitHub only (technical roles, developers)
npm run scraper:job -- --job-id <uuid> --sources github
```

## Intelligent Source Selection

The system automatically selects sources based on job type:

- **Technical jobs**: GitHub (primary) → LinkedIn (secondary)
- **Non-technical jobs**: LinkedIn only (GitHub skipped)

This ensures we're always scraping **candidate profiles**, not job postings.

