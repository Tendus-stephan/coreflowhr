# 🔑 Railway Environment Variables Setup

## Two Ways to Set Environment Variables

### Option 1: Railway CLI (Command Line) ⚡ Recommended

**Set variables using commands:**

```bash
# Use 'railway variables --set' command (NOT 'railway add')
railway variables --set "APIFY_API_TOKEN=<your-token>"
railway variables --set "SUPABASE_URL=<your-supabase-url>"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
railway variables --set "VITE_SUPABASE_URL=<your-supabase-url>"
railway variables --set "VITE_SUPABASE_ANON_KEY=<your-anon-key>"
```

**Important:** Wrap each `"KEY=VALUE"` in quotes!

**Replace `<your-token>`, `<your-supabase-url>`, etc. with actual values from your `.env.local` file!**

### Option 2: Railway Dashboard (Web Interface) 🌐

**Set variables via web dashboard:**

1. Run: `railway up` (deploys your project)
2. Railway will show you a dashboard URL, or visit: https://railway.app/dashboard
3. Select your project
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable:
   - Name: `APIFY_API_TOKEN`
   - Value: `<your-token>`
   - Click **Add**
7. Repeat for all variables

---

## 📋 Required Environment Variables

You need to set these in Railway:

### Required for Scraper Server:

1. **APIFY_API_TOKEN** ⚠️ Critical
   - Get from: https://apify.com/settings/integrations
   - Used for LinkedIn scraping

2. **SUPABASE_URL** ⚠️ Critical
   - Get from: Supabase Dashboard → Settings → API
   - Example: `https://xxxxx.supabase.co`

3. **SUPABASE_SERVICE_ROLE_KEY** ⚠️ Critical
   - Get from: Supabase Dashboard → Settings → API
   - **⚠️ Keep this secret!** (Service role key has admin access)

### Optional (if your code uses them):

4. **VITE_SUPABASE_URL**
   - Same as SUPABASE_URL

5. **VITE_SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Settings → API
   - This is safe to expose (anon key)

---

## 🔍 How to Get Your Values

### From Your Local `.env.local` File:

Open `.env.local` in your project root and copy values:

```bash
# Example .env.local
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxx
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # If you have this
```

### From Supabase Dashboard:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy:
   - **Project URL** → Use for `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### From Apify:

1. Go to: https://apify.com/settings/integrations
2. Copy your **API Token**

---

## ✅ Quick Setup Checklist

- [ ] Get `APIFY_API_TOKEN` from Apify
- [ ] Get `SUPABASE_URL` from Supabase Dashboard
- [ ] Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard
- [ ] Set variables in Railway (CLI or Dashboard)
- [ ] Verify variables are set: `railway variables`
- [ ] Deploy: `railway up`

---

## 🔍 Verify Variables Are Set

After setting variables, verify:

```bash
railway variables
```

This shows all environment variables set for your project.

Or check in Railway Dashboard:
- Go to your project
- Click **Variables** tab
- See all set variables

---

## ⚠️ Important Notes

1. **Don't commit `.env.local` to Git** - It contains secrets!
2. **Service Role Key is secret** - Never expose it publicly
3. **Set variables BEFORE deploying** - They're needed at runtime
4. **Update variables anytime** - Just rerun `railway add` or update in dashboard

---

## 📝 Example Setup

```bash
# After 'railway init', set all variables:

railway variables --set "APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE"
railway variables --set "SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
railway variables --set "VITE_SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"
railway variables --set "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Verify they're set
railway variables

# Deploy
railway up
```

That's it! Railway will use these variables when your server runs.
