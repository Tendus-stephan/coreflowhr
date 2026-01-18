# Job Board Scraping Limitations

## Important Reality Check

**Job boards show JOB POSTINGS, not candidate profiles.**

Most job board scrapers (Indeed, Stack Overflow Jobs, etc.) return job listings from employers, NOT candidate profiles or resumes. This is a fundamental limitation for candidate sourcing.

## What Job Boards Actually Provide

### Job Postings (What we get)
- Job titles and descriptions
- Employer information
- Requirements and skills
- Salary ranges
- Application links

### Candidate Profiles (What we need - usually NOT available)
- Resume/resume data
- Candidate skills and experience
- Candidate contact info
- Work history

## Why This Matters

For **candidate sourcing**, you need:
- ✅ **LinkedIn**: Candidate profiles (what we're using Apify for)
- ✅ **GitHub**: Developer profiles (GitHub API - FREE)
- ⚠️ **Job Boards**: Job postings (not candidates)

## What We're Doing

Our job board scraping will:
1. Try to extract candidate info from job postings if available (rare)
2. Return 0 candidates in most cases (this is expected and normal)
3. Focus on LinkedIn + GitHub for actual candidate sourcing

## Expected Results

When scraping job boards:
- **Indeed**: Will return job postings, likely 0 candidates extracted
- **Stack Overflow Jobs**: Will return job postings, likely 0 candidates extracted
- **LinkedIn**: Will return candidate profiles ✅ (primary source)
- **GitHub**: Will return developer profiles ✅ (for technical roles)

## Recommendation

**For Candidate Sourcing:**
- **Primary**: LinkedIn (via Apify) - Gets actual candidate profiles
- **Secondary**: GitHub (via GitHub API) - Gets developer profiles (FREE, for technical roles)
- **Tertiary**: Job boards - Limited value, may return 0 candidates

## Cost-Effective Strategy

1. **LinkedIn**: Use Apify (FREE tier: 5 searches/month)
2. **GitHub**: Use GitHub API (FREE, unlimited with token)
3. **Job Boards**: Skip or use only if candidate profiles are available

This keeps costs at **$0/month** for light usage, and scales affordably.



## Important Reality Check

**Job boards show JOB POSTINGS, not candidate profiles.**

Most job board scrapers (Indeed, Stack Overflow Jobs, etc.) return job listings from employers, NOT candidate profiles or resumes. This is a fundamental limitation for candidate sourcing.

## What Job Boards Actually Provide

### Job Postings (What we get)
- Job titles and descriptions
- Employer information
- Requirements and skills
- Salary ranges
- Application links

### Candidate Profiles (What we need - usually NOT available)
- Resume/resume data
- Candidate skills and experience
- Candidate contact info
- Work history

## Why This Matters

For **candidate sourcing**, you need:
- ✅ **LinkedIn**: Candidate profiles (what we're using Apify for)
- ✅ **GitHub**: Developer profiles (GitHub API - FREE)
- ⚠️ **Job Boards**: Job postings (not candidates)

## What We're Doing

Our job board scraping will:
1. Try to extract candidate info from job postings if available (rare)
2. Return 0 candidates in most cases (this is expected and normal)
3. Focus on LinkedIn + GitHub for actual candidate sourcing

## Expected Results

When scraping job boards:
- **Indeed**: Will return job postings, likely 0 candidates extracted
- **Stack Overflow Jobs**: Will return job postings, likely 0 candidates extracted
- **LinkedIn**: Will return candidate profiles ✅ (primary source)
- **GitHub**: Will return developer profiles ✅ (for technical roles)

## Recommendation

**For Candidate Sourcing:**
- **Primary**: LinkedIn (via Apify) - Gets actual candidate profiles
- **Secondary**: GitHub (via GitHub API) - Gets developer profiles (FREE, for technical roles)
- **Tertiary**: Job boards - Limited value, may return 0 candidates

## Cost-Effective Strategy

1. **LinkedIn**: Use Apify (FREE tier: 5 searches/month)
2. **GitHub**: Use GitHub API (FREE, unlimited with token)
3. **Job Boards**: Skip or use only if candidate profiles are available

This keeps costs at **$0/month** for light usage, and scales affordably.

