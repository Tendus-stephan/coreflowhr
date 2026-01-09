# Candidate Sourcing & Scraping System - Implementation Plan

## Overview
This document outlines the plan for developing a **separate** candidate sourcing and scraping system that operates independently from the main CoreFlow HR site. This system will scrape real candidate data from various sources and integrate with the CoreFlow database.

## Key Requirements
- ✅ **Separate from main CoreFlow site** - Not accessible through normal site routes
- ✅ **Real candidate scraping** - Extract actual candidate data from external sources
- ✅ **Database integration** - Store scraped candidates in existing CoreFlow database
- ⏸️ **No workflow automation** - Email workflows and automation excluded for now
- ⏸️ **No candidate replies** - Reply handling excluded for now

---

## Architecture Options

### Option 1: Standalone Node.js Service (Recommended)
- **Type**: Background service/daemon
- **Access**: CLI, API endpoints, or admin dashboard
- **Deployment**: Can run on same server or separate instance
- **Pros**: 
  - Complete isolation from main app
  - Can run 24/7 as background service
  - Easy to scale independently
- **Cons**: 
  - Requires separate deployment setup
  - Need to manage service lifecycle

### Option 2: Supabase Edge Function + Scheduled Jobs
- **Type**: Serverless functions with cron triggers
- **Access**: Supabase dashboard or API calls
- **Deployment**: Supabase Edge Functions
- **Pros**: 
  - No server management
  - Built-in scheduling
  - Easy to deploy
- **Cons**: 
  - Limited execution time (60s default)
  - May need multiple function calls for large scraping jobs

### Option 3: Separate React App (Admin Panel)
- **Type**: Separate frontend application
- **Access**: Admin-only route or subdomain (e.g., `scraper.coreflowhr.com`)
- **Deployment**: Separate Vite build or subdirectory
- **Pros**: 
  - Visual interface for managing scraping
  - Easy to monitor and control
  - Can reuse existing UI components
- **Cons**: 
  - Requires authentication/authorization setup
  - More complex routing

**Recommendation**: **Option 1 (Standalone Node.js Service)** for maximum flexibility and isolation.

---

## Data Sources to Scrape

### Phase 1: Initial Sources
1. **LinkedIn** (via API or web scraping)
   - Profile data: name, title, location, experience
   - Skills, education, work history
   - Contact information (if available)

2. **GitHub** (via GitHub API)
   - Developer profiles
   - Repositories and technologies used
   - Contribution history
   - Location and bio

3. **Job Boards** (web scraping)
   - Indeed candidate profiles
   - Stack Overflow Jobs
   - AngelList profiles
   - Remote job board profiles

### Phase 2: Additional Sources (Future)
- Twitter/X (developer profiles)
- Personal websites/portfolios
- Conference speaker lists
- Open source contributor databases

---

## Technical Stack

### Core Technologies
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Database**: Supabase (existing CoreFlow database)
- **Scraping Libraries**:
  - `puppeteer` or `playwright` for browser automation
  - `cheerio` for HTML parsing
  - `axios` for HTTP requests
- **Rate Limiting**: `bottleneck` or `p-limit`
- **Queue System**: `bull` or `bee-queue` (Redis-based) for job management

### Dependencies to Add
```json
{
  "puppeteer": "^21.0.0",
  "cheerio": "^1.0.0-rc.12",
  "axios": "^1.6.0",
  "@supabase/supabase-js": "^2.84.0",
  "bull": "^4.11.0",
  "ioredis": "^5.3.0",
  "dotenv": "^16.3.0"
}
```

---

## Project Structure

```
coreflow/
├── scraper/                          # New separate scraper directory
│   ├── src/
│   │   ├── index.ts                  # Main entry point
│   │   ├── config/
│   │   │   ├── database.ts           # Supabase client setup
│   │   │   └── scraper.ts            # Scraper configuration
│   │   ├── scrapers/
│   │   │   ├── base/
│   │   │   │   └── BaseScraper.ts   # Abstract base scraper class
│   │   │   ├── linkedin/
│   │   │   │   └── LinkedInScraper.ts
│   │   │   ├── github/
│   │   │   │   └── GitHubScraper.ts
│   │   │   ├── jobboards/
│   │   │   │   ├── IndeedScraper.ts
│   │   │   │   └── StackOverflowScraper.ts
│   │   ├── processors/
│   │   │   ├── CandidateProcessor.ts # Process and normalize scraped data
│   │   │   └── MatchScorer.ts       # Calculate match scores
│   │   ├── services/
│   │   │   ├── DatabaseService.ts    # Database operations
│   │   │   ├── QueueService.ts       # Job queue management
│   │   │   └── RateLimiter.ts       # Rate limiting
│   │   ├── utils/
│   │   │   ├── logger.ts            # Logging utility
│   │   │   ├── emailValidator.ts    # Email validation
│   │   │   └── dataCleaner.ts       # Clean and normalize data
│   │   └── types/
│   │       └── index.ts             # TypeScript types
│   ├── scripts/
│   │   ├── scrape-job.ts            # CLI script to scrape for a job
│   │   └── run-scheduler.ts          # Scheduled scraping jobs
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── ... (existing CoreFlow files)
```

---

## Database Integration

### Using Existing Schema
The scraper will use the existing `candidates` table with these fields:
- `user_id` - The recruiter/user who owns the job
- `job_id` - The job this candidate is sourced for
- `name`, `email`, `location`, `experience`, `skills`
- `resume_summary` - Generated from scraped profile data
- `ai_match_score` - Calculated based on job requirements
- `source` - Set to `'scraped'` (new source type) or `'ai_sourced'`
- `is_test` - Set to `false` (real candidates)
- `stage` - Default to `'New'`

### New Source Type
Add `'scraped'` to the source enum:
```sql
ALTER TABLE candidates 
DROP CONSTRAINT IF EXISTS candidates_source_check;

ALTER TABLE candidates 
ADD CONSTRAINT candidates_source_check 
CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral', 'scraped'));
```

---

## Scraper Implementation Details

### Base Scraper Class
```typescript
abstract class BaseScraper {
  protected rateLimiter: RateLimiter;
  protected browser: Browser | null = null;
  
  abstract scrape(job: Job, options: ScrapeOptions): Promise<Candidate[]>;
  abstract validateSource(source: string): boolean;
  
  protected async initBrowser(): Promise<void>;
  protected async closeBrowser(): Promise<void>;
  protected async delay(ms: number): Promise<void>;
}
```

### Candidate Data Structure
```typescript
interface ScrapedCandidate {
  name: string;
  email?: string;              // May not always be available
  location?: string;
  experience?: number;
  skills: string[];
  resumeSummary: string;        // Generated from profile
  profileUrl?: string;          // Source profile URL
  workExperience?: WorkExperience[];
  education?: Education[];
  portfolioUrls?: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
}
```

### Processing Pipeline
1. **Scrape** → Extract raw data from source
2. **Validate** → Check data quality and completeness
3. **Normalize** → Standardize format and clean data
4. **Match** → Calculate match score against job requirements
5. **Deduplicate** → Check if candidate already exists (by email + job_id)
6. **Store** → Save to database

---

## Scraping Strategies

### 1. LinkedIn Scraping
**Approach**: Use LinkedIn API (if available) or web scraping with browser automation
- **API**: LinkedIn API v2 (requires OAuth, limited access)
- **Scraping**: Puppeteer/Playwright with proper headers and delays
- **Data**: Profile URL, name, headline, location, experience, skills, education
- **Rate Limits**: Respect LinkedIn's rate limits (use delays, rotate IPs if needed)

### 2. GitHub Scraping
**Approach**: GitHub REST API (no authentication needed for public data)
- **API Endpoint**: `https://api.github.com/search/users?q=language:typescript+location:new-york`
- **Data**: Username, name, location, bio, public repos, languages used
- **Rate Limits**: 60 requests/hour unauthenticated, 5000/hour with auth
- **Email**: Not available via API (would need to scrape profile page)

### 3. Job Board Scraping
**Approach**: Web scraping with proper user agents and delays
- **Indeed**: Search candidate profiles by skills/location
- **Stack Overflow**: Developer profiles and tags
- **Rate Limits**: Implement delays (1-2 seconds between requests)
- **Legal**: Ensure compliance with robots.txt and terms of service

---

## Configuration

### Environment Variables
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scraping Configuration
SCRAPER_USER_AGENT=Mozilla/5.0...
SCRAPER_DELAY_MS=2000
SCRAPER_MAX_CONCURRENT=3
SCRAPER_TIMEOUT_MS=30000

# LinkedIn (if using API)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=

# GitHub (optional, for higher rate limits)
GITHUB_TOKEN=

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

---

## Usage & CLI

### Command Line Interface
```bash
# Scrape candidates for a specific job
npm run scraper:job -- --job-id <uuid> --source linkedin --count 20

# Scrape from multiple sources
npm run scraper:job -- --job-id <uuid> --sources linkedin,github --count 50

# Run scheduled scraping (cron job)
npm run scraper:schedule

# Check scraper status
npm run scraper:status
```

### Programmatic Usage
```typescript
import { ScraperService } from './scraper/src/services/ScraperService';

const scraper = new ScraperService();

// Scrape for a job
await scraper.scrapeForJob(jobId, {
  sources: ['linkedin', 'github'],
  maxCandidates: 50,
  minMatchScore: 60
});
```

---

## Rate Limiting & Ethics

### Rate Limiting Strategy
- **Delays between requests**: 1-3 seconds minimum
- **Concurrent requests**: Max 3-5 at a time
- **Daily limits**: Respect source-specific limits
- **Exponential backoff**: On rate limit errors

### Ethical Considerations
- ✅ Respect `robots.txt` files
- ✅ Use proper user agents
- ✅ Don't overload servers
- ✅ Only scrape public data
- ✅ Comply with terms of service
- ⚠️ Consider legal implications (GDPR, data privacy)
- ⚠️ Some sources may require API access instead of scraping

---

## Error Handling & Logging

### Error Types
- **Network errors**: Retry with exponential backoff
- **Rate limit errors**: Wait and retry
- **Parsing errors**: Log and skip candidate
- **Validation errors**: Skip invalid candidates

### Logging
- Use structured logging (Winston or Pino)
- Log all scraping activities
- Track success/failure rates
- Monitor rate limit hits

---

## Testing Strategy

### Unit Tests
- Test individual scraper classes
- Test data processing and normalization
- Test match score calculation

### Integration Tests
- Test database integration
- Test end-to-end scraping flow
- Test error handling

### Manual Testing
- Test with real job postings
- Verify data quality
- Check for duplicates

---

## Deployment

### Development
```bash
cd scraper
npm install
npm run dev
```

### Production
1. **Option A: Same Server**
   - Deploy as separate Node.js service
   - Use PM2 or systemd to manage process
   - Run on different port (e.g., 3003)

2. **Option B: Separate Server**
   - Deploy to separate VPS/container
   - Configure environment variables
   - Set up monitoring and logging

3. **Option C: Serverless**
   - Deploy as Supabase Edge Function
   - Use Supabase cron jobs for scheduling
   - Limited to 60s execution time

---

## Security Considerations

1. **API Keys**: Store securely in environment variables
2. **Database Access**: Use service role key (read-only if possible)
3. **Rate Limiting**: Implement to avoid IP bans
4. **User Agent Rotation**: Rotate user agents to appear more natural
5. **Proxy Support**: Optional proxy rotation for large-scale scraping

---

## Future Enhancements (Out of Scope for Now)

- ⏸️ Email automation for scraped candidates
- ⏸️ Candidate reply handling
- ⏸️ Automated outreach workflows
- ⏸️ AI-powered candidate ranking
- ⏸️ Real-time scraping dashboard
- ⏸️ Multi-language support
- ⏸️ Resume/CV parsing from scraped profiles

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up project structure
- [ ] Configure database connection
- [ ] Create base scraper class
- [ ] Implement basic GitHub scraper (API-based)
- [ ] Test database integration

### Phase 2: Core Scrapers (Week 2)
- [ ] Implement LinkedIn scraper
- [ ] Implement job board scrapers (Indeed, Stack Overflow)
- [ ] Add data validation and normalization
- [ ] Implement match score calculation

### Phase 3: Queue & Scheduling (Week 3)
- [ ] Set up job queue system (Bull/Redis)
- [ ] Implement rate limiting
- [ ] Add CLI interface
- [ ] Create scheduled job runner

### Phase 4: Polish & Testing (Week 4)
- [ ] Error handling improvements
- [ ] Logging and monitoring
- [ ] Documentation
- [ ] Testing and bug fixes

---

## Questions to Resolve

1. **Authentication**: How should the scraper authenticate to access jobs? (Service role key, or user-specific tokens?)
2. **Job Selection**: Should scraping be automatic for all active jobs, or manual trigger only?
3. **Deduplication**: How strict should duplicate detection be? (Exact email match, or fuzzy matching?)
4. **Data Quality**: What's the minimum required data to create a candidate? (Name + email? Or can we create with just name + skills?)
5. **Legal Compliance**: Do we need to add disclaimers or consent mechanisms for scraped candidates?

---

## Next Steps

1. **Review and approve this plan**
2. **Set up project structure** (`scraper/` directory)
3. **Choose initial scraping source** (recommend starting with GitHub API)
4. **Implement MVP** (single source, basic functionality)
5. **Test with real job data**
6. **Iterate and expand**

---

## Notes

- This system is **completely separate** from the main CoreFlow site
- No routes or UI components will be added to the main app
- The scraper can be run independently via CLI or scheduled jobs
- All scraped candidates will be marked with `source: 'scraped'` and `is_test: false`
- No email automation will be triggered for scraped candidates (for now)


