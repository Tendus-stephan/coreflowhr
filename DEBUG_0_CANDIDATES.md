# 🔍 Debugging: 0 Candidates Found

## 📺 Where to Check

### 1. **SERVER TERMINAL** (Most Important!)
Check the terminal where you ran `npm run scraper-ui:server`

Look for these logs:
```
📝 Search query: "Software Engineer React New York"
📋 Query details: { jobTitle: "...", skills: [...], location: "..." }
📤 Actor input sent: { searchQuery: "...", locations: [...], maxResults: 10 }
🔄 Trying Apify actor: harvestapi/linkedin-profile-search
📊 Run created: ID=xxx, Status=RUNNING, Actor=harvestapi/linkedin-profile-search
📋 Run details: { id: "...", status: "SUCCEEDED", statusMessage: "...", ... }
📊 Dataset response: 0 items found
⚠️ WARNING: Apify returned 0 profiles for search query: "..."
```

### 2. **Browser Console**
Check the detailed warning message with diagnostic information.

### 3. **Diagnostic Endpoint**
Visit: `http://localhost:3005/api/diagnostic`

This shows:
- Apify configuration status
- Whether token is set
- Database connection status

---

## 🔧 Common Issues & Fixes

### Issue 1: Apify Not Configured
**Symptoms:**
- Server logs: "Apify API token not configured"
- Diagnostic endpoint: `apify.configured: false`

**Fix:**
1. Add `APIFY_API_TOKEN` to `.env.local` in project root
2. Get token from: https://apify.com/settings/integrations
3. Restart scraper server: `npm run scraper-ui:server`

### Issue 2: Apify Free Tier Limit Reached
**Symptoms:**
- Server logs: "Free Tier Limit Reached" or "free user run limit"
- Diagnostic: Check Apify dashboard

**Fix:**
- Wait 24 hours for limit to reset
- Or upgrade Apify plan: https://apify.com/pricing
- Or use a different Apify account

### Issue 3: Search Query Too Specific
**Symptoms:**
- Run succeeds but returns 0 items
- Server logs show successful run but empty dataset

**Fix:**
- Remove location filter or use broader location
- Remove some skills from search
- Try a more generic job title

### Issue 4: Actor Issues
**Symptoms:**
- Multiple actors tried, all failed
- Errors in server logs about actor calls

**Fix:**
- Check Apify dashboard for actor status
- Some actors may be temporarily unavailable
- The scraper automatically tries multiple actors

---

## 🧪 Quick Test

1. **Check if scraper server is running:**
   ```
   Visit: http://localhost:3005/api/health
   Should return: {"status":"ok"}
   ```

2. **Check diagnostic info:**
   ```
   Visit: http://localhost:3005/api/diagnostic
   Check apify.configured and apify.hasToken
   ```

3. **Try a simple job:**
   - Title: "Software Engineer"
   - Location: Leave empty or use "United States"
   - Skills: Leave empty or just "JavaScript"
   - Experience: Any level

4. **Check server logs while scraping:**
   - Watch the terminal where scraper server is running
   - Look for detailed logs about the Apify call

---

## 📋 What to Share When Asking for Help

If you need help, share:
1. Server terminal logs (full output during scraping)
2. Browser console output
3. Diagnostic endpoint result: `http://localhost:3005/api/diagnostic`
4. Job details you're trying to scrape (title, location, skills, experience)

This will help diagnose the exact issue!
