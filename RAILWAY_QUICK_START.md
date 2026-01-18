# 🚂 Railway Quick Start - Step by Step

## ✅ Already Done
- ✅ Railway CLI installed
- ✅ `railway.json` configuration file created
- ✅ Server code ready (uses `process.env.PORT`)

## 📋 Next Steps (Follow These in Order)

### Step 1: Login to Railway
```bash
railway login
```
This opens your browser - authorize Railway to access your account.

### Step 2: Create/Initialize Project
```bash
railway init
```
Choose:
- **New Project**: Creates a new Railway project
- **Existing Project**: Links to an existing one

### Step 3: Set Environment Variables

**You need these values from your `.env.local` file:**

```bash
# Required: Apify API Token (for LinkedIn scraping)
railway variables --set "APIFY_API_TOKEN=<your-token-from-env-local>"

# Required: Supabase Configuration
railway variables --set "SUPABASE_URL=<your-supabase-url>"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
```

**Important:** Use `railway variables --set` with quotes around `"KEY=VALUE"`, NOT `railway add`!

**To get your values:**
1. Check your `.env.local` file
2. Or get from:
   - **APIFY_API_TOKEN**: https://apify.com/settings/integrations
   - **SUPABASE_URL**: Supabase Dashboard → Settings → API
   - **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API

### Step 4: Deploy
```bash
railway up
```

This will:
- Build your project
- Deploy to Railway
- Show you the deployment URL (like `https://your-app.railway.app`)

### Step 5: Update Supabase Edge Function

After deployment, Railway shows your URL. Copy it and set it in Supabase:

```bash
supabase secrets set SCRAPER_SERVER_URL=https://your-app.railway.app
```

Or in Supabase Dashboard:
1. Settings → Edge Functions → Secrets
2. Add: `SCRAPER_SERVER_URL` = `https://your-app.railway.app`

### Step 6: Test Deployment

Visit: `https://your-app.railway.app/api/health`
Should return: `{"status":"ok"}`

---

## 🔍 Quick Commands Reference

```bash
# Login (interactive - opens browser)
railway login

# Initialize project
railway init

# Add environment variable
railway add VARIABLE_NAME=value

# Deploy
railway up

# View logs
railway logs

# View variables
railway variables

# Open Railway dashboard
railway open
```

---

## ⚡ Fast Track (Copy-Paste These Commands)

```bash
# 1. Login (opens browser)
railway login

# 2. Initialize
railway init

# 3. Set variables (replace with your values!)
railway variables --set "APIFY_API_TOKEN=<your-token>"
railway variables --set "SUPABASE_URL=<your-url>"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=<your-key>"

# 4. Deploy
railway up

# 5. Copy the URL Railway shows, then update Supabase:
supabase secrets set SCRAPER_SERVER_URL=<railway-url>
```

---

## 🎯 That's It!

After these steps, your scraper will be deployed and production-ready!

The server is already configured to use `process.env.PORT` (Railway sets this automatically), so no code changes needed.
