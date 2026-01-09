# CoreFlow Scraper Testing UI

A standalone web interface for testing and monitoring candidate scraping operations. This is completely separate from the main CoreFlow application.

## Features

- **Job Selection**: View and select active jobs from your database
- **Scraping Controls**: Configure and trigger scraping operations
  - Select sources (LinkedIn, GitHub, Job Boards)
  - Set max candidates and minimum match score
  - Real-time progress monitoring
- **Results View**: See scraped candidates with match scores and details
- **Provider Status**: Check which scraping providers are configured

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Make sure your `.env` file has the required variables (same as the scraper):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APIFY_API_TOKEN=your_apify_token  # Optional
SCRAPERAPI_KEY=your_scraperapi_key  # Optional
GITHUB_TOKEN=your_github_token  # Optional
```

### 3. Run the Application

Start both the API server and frontend:

```bash
npm run scraper-ui
```

This will start:
- **API Server**: http://localhost:3003
- **Frontend**: http://localhost:3004

Or run them separately:

```bash
# Terminal 1: API Server
npm run scraper-ui:server

# Terminal 2: Frontend
npm run scraper-ui:dev
```

## Usage

1. **Open the UI**: Navigate to http://localhost:3004
2. **Check Provider Status**: Verify which scraping providers are configured
3. **Select a Job**: Choose an active job from the list
4. **Configure Scraping**:
   - Select sources (LinkedIn, GitHub, Job Boards)
   - Set max candidates (default: 50)
   - Set minimum match score (default: 60)
5. **Start Scraping**: Click "Start Scraping" and monitor progress
6. **View Results**: See scraped candidates with their match scores and details

## API Endpoints

The server exposes the following REST API endpoints:

- `GET /api/jobs` - List all active jobs
- `GET /api/jobs/:jobId` - Get job details
- `GET /api/jobs/:jobId/candidates` - Get scraped candidates for a job
- `POST /api/jobs/:jobId/scrape` - Start scraping for a job
- `GET /api/jobs/:jobId/scrape/status` - Get scraping status
- `GET /api/providers/status` - Check provider configuration
- `GET /api/health` - Health check

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js REST API
- **Scraping**: Uses the existing `ScrapingService` from `scraper/src/services/`

## Notes

- This is a **testing/development tool** - not part of the main CoreFlow application
- Scraping runs asynchronously - you can monitor progress in real-time
- Results are stored in the same Supabase database as the main application
- All scraped candidates have `source: 'scraped'` and `is_test: false`

