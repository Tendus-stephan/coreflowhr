# Scraper Diagnostic Test

## ✅ Current Status

1. **Scraper Server**: ✅ Running on http://localhost:3005
2. **Health Check**: ✅ Responding correctly

## 🔍 Next Steps to Test

### Test 1: Check Apify Configuration
The scraper requires `APIFY_API_TOKEN` in `.env.local`. 

**To verify:**
1. Check if `.env.local` exists in project root
2. Check if it contains: `APIFY_API_TOKEN=your_token_here`
3. Restart the scraper server after adding the token

**To get Apify token:**
1. Go to https://apify.com
2. Sign up (FREE tier available)
3. Go to Settings → Integrations → API tokens
4. Copy your API token
5. Add to `.env.local`: `APIFY_API_TOKEN=your_token_here`
6. Restart: `npm run scraper-ui:server`

### Test 2: Try Scraping from UI
1. Go to `/jobs` page
2. Click "Post Job" or edit an existing Active job
3. Fill in job details
4. Click "Post Job"
5. Check the console for detailed logs

### Test 3: Check Server Logs
When you try to scrape, check the terminal where `scraper-ui:server` is running. You should see:
- `📝 Search query: "..."`
- `📋 Query details: {...}`
- `✅ LINKEDIN: Found X, Saved Y candidates`

### Common Issues

1. **0 candidates found**:
   - Apify might not be configured
   - Search query too specific
   - Apify free tier limit reached (10 runs/day)
   - Check server logs for detailed error

2. **"Failed to fetch"**:
   - Scraper server not running → Start with `npm run scraper-ui:server`
   - Network/CORS issue → Check browser console
   - Check if port 3005 is available

3. **"Apify not configured"**:
   - Missing `APIFY_API_TOKEN` in `.env.local`
   - Token expired or invalid
   - Restart scraper server after adding token

## 📋 Quick Checklist

- [ ] Scraper server running (`npm run scraper-ui:server`)
- [ ] Main app running (`npm run dev`)
- [ ] `APIFY_API_TOKEN` set in `.env.local`
- [ ] Scraper server restarted after adding token
- [ ] Check browser console for errors
- [ ] Check server terminal for detailed logs

## 🔧 Manual Test Command

You can test the scraper directly with curl:

```bash
curl -X POST http://localhost:3005/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-id-here",
    "sources": ["linkedin"],
    "maxCandidates": 5
  }'
```

Replace `your-job-id-here` with an actual job ID from your database.
