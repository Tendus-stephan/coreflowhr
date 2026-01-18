# 🚀 Best Deployment Option for Scraper

## ✅ **RECOMMENDED: Option A - Deploy Scraper Server Separately**

### Why This Is Best

1. **⏱️ Timeout Limits**
   - Edge Functions: 60-120 seconds max
   - Scraping: Can take 5-10+ minutes
   - **Edge functions will timeout before scraping completes!**

2. **📦 No Code Changes**
   - Your scraper already works in Node.js
   - Just deploy it as-is

3. **🔧 Easier Maintenance**
   - Single codebase
   - Easier debugging (separate logs)
   - Can scale independently

4. **💰 Cost-Effective**
   - Many platforms offer free tiers
   - Only pay for what you use

### Recommended Platforms (Easiest → More Control)

#### 1. **Railway** ⭐ (Easiest - Recommended)
- **Free tier**: $5 credit/month
- **Setup time**: 5 minutes
- **Why**: Automatic deploys, zero config, built for Node.js

**Steps:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd scraper-ui/server
railway init
railway up
```

**Set environment variables in Railway dashboard:**
- `APIFY_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (auto-set, but you'll get the URL)

#### 2. **Render** ⭐ (Very Easy)
- **Free tier**: Yes (with limits)
- **Setup time**: 10 minutes
- **Why**: Simple dashboard, auto-deploys from Git

**Steps:**
1. Push code to GitHub
2. Go to render.com
3. New → Web Service
4. Connect GitHub repo
5. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm run scraper-ui:server`
   - **Environment**: Node
6. Add environment variables

#### 3. **Fly.io** (Good balance)
- **Free tier**: Generous
- **Setup time**: 15 minutes
- **Why**: Global deployment, good free tier

#### 4. **DigitalOcean App Platform**
- **Free tier**: $200 credit
- **Setup time**: 15 minutes
- **Why**: Reliable, good for production

### Quick Setup for Railway (Fastest)

1. **Create `railway.json` in project root:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm run scraper-ui:server",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Update `scraper-ui/server/index.ts` to use Railway's PORT:**
```typescript
const PORT = process.env.PORT || 3005;
```

3. **Deploy:**
```bash
railway login
railway init
railway link
railway add APIFY_API_TOKEN=<your-token>
railway add SUPABASE_URL=<your-url>
railway add SUPABASE_SERVICE_ROLE_KEY=<your-key>
railway up
```

4. **Get your URL:**
   - Railway will give you a URL like: `https://your-app.railway.app`
   - Copy this URL

5. **Update Supabase Edge Function:**
   - Set secret: `SCRAPER_SERVER_URL=https://your-app.railway.app`

### Update Edge Function

After deploying, update the edge function to use your deployed server:

```bash
supabase secrets set SCRAPER_SERVER_URL=https://your-app.railway.app
```

---

## ❌ **NOT RECOMMENDED: Option B - Port to Deno**

### Why Not Recommended

1. **⏱️ Timeout Issues**
   - Edge functions timeout at 60-120 seconds
   - Scraping takes 5-10+ minutes
   - Will fail before completing

2. **🔄 Major Refactoring**
   - Rewrite entire scraper for Deno
   - Apify client may not work
   - All dependencies need porting

3. **🐛 Harder to Debug**
   - Mixed Node.js/Deno codebases
   - Limited debugging tools in edge functions

4. **💰 Same Cost**
   - Edge functions aren't free
   - Separate server can be free/cheap

---

## 📋 Deployment Checklist

After deploying scraper server:

- [ ] Deploy scraper server to Railway/Render/Fly.io
- [ ] Get deployed URL
- [ ] Set `SCRAPER_SERVER_URL` secret in Supabase
- [ ] Test edge function with deployed URL
- [ ] Update frontend to use production mode
- [ ] Monitor logs in deployment platform

---

## 🎯 Quick Start: Railway (Recommended)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. In your project root
railway init

# 4. Set environment variables
railway add APIFY_API_TOKEN=<your-token>
railway add SUPABASE_URL=<your-url>
railway add SUPABASE_SERVICE_ROLE_KEY=<your-key>

# 5. Deploy
railway up

# 6. Get URL and set in Supabase
supabase secrets set SCRAPER_SERVER_URL=<railway-url>
```

**That's it!** Your scraper will be live in ~5 minutes.
