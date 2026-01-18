# ✅ Next Steps: Connect Supabase to Railway Scraper

## 🎯 What You Need to Do

Your Railway scraper server is now live! Now connect Supabase Edge Functions to it.

---

## Step 1: Get Your Railway URL

**In Railway Dashboard:**
1. Go to your service (the scraper server)
2. Look for the **domain/URL** at the top
3. It should look like: `https://your-app.railway.app` or `https://your-app.up.railway.app`
4. **Copy this URL** - you'll need it!

---

## Step 2: Set the URL in Supabase

### Option A: Supabase Dashboard (Easiest) ⭐

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **"Add New Secret"**
5. **Name**: `SCRAPER_SERVER_URL`
6. **Value**: `https://your-app.railway.app` (paste your Railway URL)
7. Click **"Save"**

### Option B: Supabase CLI (If you have it)

```bash
supabase secrets set SCRAPER_SERVER_URL=https://your-app.railway.app
```

---

## Step 3: Test the Setup

### Test Railway Server Directly:

Visit in your browser:
```
https://your-app.railway.app/api/health
```

Should return:
```json
{"status":"ok"}
```

### Test Railway Diagnostic Endpoint:

Visit:
```
https://your-app.railway.app/api/diagnostic
```

Should show:
```json
{
  "server": { "status": "running" },
  "apify": { "configured": true },
  "database": { "connected": true }
}
```

---

## Step 4: Test Full Flow (From Your App)

1. **Go to your app** (Vercel deployment)
2. **Create or edit a job** (AddJob page)
3. **Click "Start Sourcing"**
4. **Should call**:
   - Frontend → Supabase Edge Function → Railway Scraper Server
5. **Check for candidates being saved**

---

## ✅ Complete Setup Checklist

- [x] Railway scraper server deployed
- [ ] Railway URL copied
- [ ] `SCRAPER_SERVER_URL` set in Supabase Edge Function secrets
- [ ] Test Railway `/api/health` endpoint - returns `{"status":"ok"}`
- [ ] Test Railway `/api/diagnostic` endpoint - shows configured=true
- [ ] Test scraping from your app - candidates are saved

---

## 🐛 Troubleshooting

### Railway URL not working?
- Check Railway dashboard - service should show "Active" status
- Copy the exact URL (including `https://`)
- No trailing slash at the end

### Supabase can't reach Railway?
- Check Railway service logs for errors
- Verify Railway server is actually running (visit `/api/health`)
- Make sure `SCRAPER_SERVER_URL` in Supabase matches exactly (no extra spaces)

### Scraping not working?
- Check Supabase Edge Function logs
- Check Railway server logs
- Verify Apify token is set correctly in Railway

---

## 🎉 That's It!

Once you set `SCRAPER_SERVER_URL` in Supabase, your complete flow is:
1. User creates job → Frontend
2. Frontend calls → Supabase Edge Function
3. Edge Function calls → Railway Scraper Server
4. Scraper Server → Scrapes candidates & saves to database

Everything is connected! 🚀
