# 🚂 Railway Setup Guide for Scraper Server

## ✅ Step 1: Install Railway CLI (Done!)
Railway CLI has been installed globally.

## 🔐 Step 2: Login to Railway

**You need to do this interactively (opens browser):**

```bash
railway login
```

This will:
1. Open your browser
2. Ask you to authorize Railway
3. Return to terminal when done

## 📦 Step 3: Initialize Railway Project

```bash
railway init
```

This will:
1. Create a new Railway project (or link to existing)
2. Ask you to create/select a project
3. Add Railway configuration to your project

## 🔑 Step 4: Set Environment Variables

You need to set these environment variables in Railway:

```bash
# Apify API Token (Required for LinkedIn scraping)
railway add APIFY_API_TOKEN=<your-apify-token>

# Supabase Configuration (Required)
railway add SUPABASE_URL=<your-supabase-url>
railway add SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional: Supabase Anon Key (if needed)
railway add VITE_SUPABASE_URL=<your-supabase-url>
railway add VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**To get your values:**
- **APIFY_API_TOKEN**: Get from https://apify.com/settings/integrations
- **SUPABASE_URL**: Get from Supabase Dashboard → Settings → API
- **SUPABASE_SERVICE_ROLE_KEY**: Get from Supabase Dashboard → Settings → API
- **VITE_SUPABASE_ANON_KEY**: Get from Supabase Dashboard → Settings → API

## 🚀 Step 5: Deploy

```bash
railway up
```

This will:
1. Build your project
2. Deploy to Railway
3. Show you the deployment URL

## 📋 Step 6: Get Your Deployment URL

After deployment, Railway will show you a URL like:
```
https://your-app-name.railway.app
```

**Copy this URL!** You'll need it for the next step.

## 🔗 Step 7: Update Supabase Edge Function

Set the scraper server URL in Supabase:

```bash
supabase secrets set SCRAPER_SERVER_URL=https://your-app-name.railway.app
```

Or set it in Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add: `SCRAPER_SERVER_URL` = `https://your-app-name.railway.app`

## ✅ Step 8: Verify Deployment

1. Visit: `https://your-app-name.railway.app/api/health`
   - Should return: `{"status":"ok"}`

2. Visit: `https://your-app-name.railway.app/api/diagnostic`
   - Should show configuration status

## 📝 Quick Reference

### Railway Commands

```bash
# Login (first time only)
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

### Update Deployment

After making code changes:
```bash
railway up
```

### View Logs

```bash
railway logs
```

### Update Environment Variables

```bash
railway add VARIABLE_NAME=new_value
```

## 🔍 Troubleshooting

### Issue: "Not authenticated"
**Fix:** Run `railway login` again

### Issue: Build fails
**Fix:** 
- Check `railway.json` is in project root
- Check `package.json` has the correct start command
- View logs: `railway logs`

### Issue: Environment variables not working
**Fix:**
- Check variables are set: `railway variables`
- Redeploy: `railway up`

### Issue: Server crashes on startup
**Fix:**
- Check logs: `railway logs`
- Verify environment variables are set
- Check server code for errors

## 💰 Railway Pricing

- **Free Tier**: $5 credit/month (enough for small apps)
- **Hobby Plan**: $5/month (more resources)
- **Pro Plan**: $20/month (production-ready)

The scraper server should run fine on the free tier for development/testing.

## 📚 Next Steps

1. ✅ Login: `railway login`
2. ✅ Initialize: `railway init`
3. ✅ Set environment variables
4. ✅ Deploy: `railway up`
5. ✅ Get URL and update Supabase
6. ✅ Test deployment

## 🎯 What Happens After Deployment

1. **In Development**: UI calls `http://localhost:3005/api/scrape` (local server)
2. **In Production**: UI calls Supabase Edge Function → Edge Function calls Railway server → Scraping happens

Your scraper server on Railway will be accessible at your Railway URL, and the Edge Function will proxy requests to it.
