# Deploy Scrape Candidates Edge Function

## 📍 Current Edge Function Location
`supabase/functions/scrape-candidates/index.ts`

## 🚀 Deploy to Supabase

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you have Supabase CLI installed
supabase functions deploy scrape-candidates

# Set environment variables
supabase secrets set SCRAPER_SERVER_URL=https://your-scraper-server-url.com
supabase secrets set APIFY_API_TOKEN=your_apify_token
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **Create Function** or **Edit** if it exists
4. Name: `scrape-candidates`
5. Copy the contents of `supabase/functions/scrape-candidates/index.ts`
6. Paste into the editor
7. Set environment variables:
   - `SCRAPER_SERVER_URL` (if deploying scraper server separately)
   - `APIFY_API_TOKEN` (for LinkedIn scraping)
   - `SUPABASE_URL` (auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

## ⚠️ Important Note

**Current Implementation**: The edge function calls your scraper server via HTTP.

For production, you have two options:

### Option A: Deploy Scraper Server Separately
- Deploy the `scraper-ui/server` to a service like:
  - Railway
  - Render
  - Fly.io
  - DigitalOcean App Platform
- Set `SCRAPER_SERVER_URL` to your deployed server URL

### Option B: Run Scraper Logic in Edge Function (Future)
- Adapt the Node.js scraper code to work in Deno
- This would require porting the ScrapingService to Deno-compatible code

## 📋 Required Environment Variables

```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
APIFY_API_TOKEN=your_apify_token_here
SCRAPER_SERVER_URL=https://your-scraper-server.com  # If using Option A
```

## ✅ Verify Deployment

After deploying, test the function:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/scrape-candidates \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-id",
    "sources": ["linkedin"],
    "maxCandidates": 10
  }'
```

## 🔍 Current Status

✅ Edge function exists: `supabase/functions/scrape-candidates/index.ts`
⚠️ Currently calls external scraper server (needs to be deployed separately for production)
✅ Handles authentication and error cases
✅ Updates job scraping status in database
