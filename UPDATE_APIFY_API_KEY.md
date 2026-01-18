# 🔑 Update Apify API Key

## 📍 Places Where API Key is Used

The Apify API token is read from **environment variables**, so you need to update it in these places:

### 1. **`.env.local`** (Local Development) ⚠️ **MOST IMPORTANT**

**Location:** Project root (`C:\Users\Tendu\Downloads\coreflow\.env.local`)

**Update:**
```bash
APIFY_API_TOKEN=your_new_api_key_here
```

**Note:** `.env.local` is gitignored, so you need to manually update it in your editor or terminal.

---

### 2. **Railway Variables** (Production Deployment) 🚂

**If deployed to Railway, update via CLI:**

```bash
railway variables --set "APIFY_API_TOKEN=your_new_api_key_here"
```

**Or via Railway Dashboard:**
1. Go to: https://railway.app/dashboard
2. Select your project
3. Go to **Variables** tab
4. Find `APIFY_API_TOKEN`
5. Click **Edit** → Update value → **Save**

---

### 3. **Supabase Secrets** (If Using Edge Functions) 🔐

**If using Supabase Edge Functions, update via CLI:**

```bash
supabase secrets set APIFY_API_TOKEN=your_new_api_key_here
```

---

### 4. **Reference Files** (Optional - For Documentation)

These files are just references/examples (not actively used by code):

- `RAILWAY_VARIABLES_JSON.json` - JSON reference for Railway
- `test-apify-simple.js` - Test file (has fallback, but uses `.env.local` first)

---

## ✅ Quick Update Steps

### **Option 1: Let AI Update It** (Recommended)
Just paste your new API key and say "update Apify API key to: `<new_key>`"

I'll update:
- `.env.local` 
- `RAILWAY_VARIABLES_JSON.json`
- `test-apify-simple.js` (fallback value)

**You'll still need to:**
- Update Railway variables manually (via CLI or Dashboard)
- Update Supabase secrets manually (if using Edge Functions)

### **Option 2: Manual Update**

1. **Update `.env.local`:**
   ```bash
   # Open .env.local in your editor and change:
   APIFY_API_TOKEN=your_new_api_key_here
   ```

2. **Update Railway (if deployed):**
   ```bash
   railway variables --set "APIFY_API_TOKEN=your_new_api_key_here"
   ```

3. **Restart scraper server:**
   ```bash
   npm run scraper-ui:server
   ```

---

## 🔍 How Code Reads API Key

The code reads from **environment variables** in this order:

```typescript
// From: scraper/src/config/providers.ts
apiToken: process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN
```

**Priority:**
1. `APIFY_API_TOKEN` (used by scraper server)
2. `VITE_APIFY_API_TOKEN` (fallback, not typically used)

**Source:** `.env.local` → Loaded by `dotenv.config()` → Available as `process.env.APIFY_API_TOKEN`

---

## ✅ After Updating

1. **Restart scraper server** (if running):
   ```bash
   # Stop current server (Ctrl+C)
   npm run scraper-ui:server
   ```

2. **Test the new key:**
   ```bash
   # Check diagnostic endpoint
   curl http://localhost:3005/api/diagnostic
   ```

3. **Verify in logs:**
   - Should show: `[Apify Init] Token value (first 10 chars): apify_api_...`
   - Should show: `ApifyClient initialized successfully`

---

## 📝 Current Key (Reference)

**Current key (being replaced):**
```
YOUR_APIFY_API_TOKEN_HERE
```

**Get new key:**
- Go to: https://apify.com/settings/integrations
- Copy your **API Token**
