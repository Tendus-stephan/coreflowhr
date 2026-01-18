# ✅ Scraping Status & Availability

## 🎯 Current Setup

### ✅ Railway Server (Always Up)
- **URL**: `https://coreflowhr-production.up.railway.app`
- **Status**: ✅ Running 24/7 on Railway
- **Availability**: Always available (as long as Railway service is active)

### ⚠️ Supabase Edge Function (Needs Configuration)
- **Requires**: `SCRAPER_SERVER_URL` secret in Supabase
- **Status**: Waiting for you to set the secret

---

## 🔄 How Scraping Works

### Development Mode (localhost)
```
Frontend → Local Server (localhost:3005) → Scrapes candidates
```
**Requires**: Local scraper server running (`npm run scraper-ui:server`)

### Production Mode (Your Live Site)
```
Frontend → Supabase Edge Function → Railway Server → Scrapes candidates
```
**Requires**: 
- ✅ Railway server (already deployed)
- ⚠️ `SCRAPER_SERVER_URL` secret in Supabase (needs to be set)

---

## ✅ Can You Scrape Now?

### Development (localhost)
- ✅ **Yes, if local server is running**
- Run: `npm run scraper-ui:server` (or `npm run scraper-ui` for both UI + server)
- Then scraping will work on `localhost:5173` (or your dev port)

### Production (Your Live Site)
- ⚠️ **Not yet** - Need to set Supabase secret first
- Once `SCRAPER_SERVER_URL` is set, it will work immediately
- Railway is ready and waiting!

---

## 🚀 Next Step: Set Supabase Secret

**One-time setup to enable production scraping:**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Add Secret:
   - **Name**: `SCRAPER_SERVER_URL`
   - **Value**: `https://coreflowhr-production.up.railway.app`
5. Click **Save**

**After this, scraping will work on your live site!**

---

## ✅ Summary

- **Railway Server**: ✅ Always up (24/7)
- **Development Scraping**: ✅ Works if local server is running
- **Production Scraping**: ⚠️ Ready, just needs Supabase secret set
