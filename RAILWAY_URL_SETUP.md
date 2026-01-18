# ✅ Railway URL Setup

## Your Railway URL
```
https://coreflowhr-production.up.railway.app
```

## Step 1: Test Your Railway Server

### Test Health Endpoint
```
https://coreflowhr-production.up.railway.app/api/health
```
**Expected Response:** `{"status": "ok"}`

### Test Diagnostic Endpoint
```
https://coreflowhr-production.up.railway.app/api/diagnostic
```
**Expected Response:** JSON with server, Apify, and database status

---

## Step 2: Set URL in Supabase

### Option A: Supabase Dashboard (Easiest) ⭐

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **"Add New Secret"** or **"Set New Secret"**
5. **Name**: `SCRAPER_SERVER_URL`
6. **Value**: `https://coreflowhr-production.up.railway.app`
7. Click **"Save"**

### Option B: Supabase CLI (If you have it)

```bash
supabase secrets set SCRAPER_SERVER_URL=https://coreflowhr-production.up.railway.app
```

---

## Step 3: Verify Setup

After setting the secret:

1. **Test Railway directly:**
   - Visit: `https://coreflowhr-production.up.railway.app/api/health`
   - Should return: `{"status": "ok"}`

2. **Test through Supabase Edge Function:**
   - The Edge Function will automatically use the `SCRAPER_SERVER_URL` secret
   - Your frontend calls `/functions/v1/scrape-candidates`
   - This will forward to your Railway server

---

## ✅ You're Done!

Once the `SCRAPER_SERVER_URL` secret is set in Supabase, your scraper will use the Railway server in production!
