# ✅ Railway: Correct Way to Set Environment Variables

## 🔑 Correct CLI Command

**Use `railway variables --set` NOT `railway add`**

```bash
# ✅ CORRECT - Set a single variable
railway variables --set "SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"

# ✅ CORRECT - Set multiple variables (one at a time)
railway variables --set "APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE"
railway variables --set "SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Important:**
- ✅ Wrap entire `"KEY=VALUE"` in quotes
- ✅ Use `railway variables --set` command
- ❌ NOT `railway add` (that's for adding services)

---

## 📋 Step-by-Step: Set All Variables

### Option 1: Railway CLI (Command Line)

```bash
# Make sure you're in your project directory and logged in
railway login

# Set each variable (replace with YOUR actual values)
railway variables --set "APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE"

railway variables --set "SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"

railway variables --set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwanl4cHhrYWdjdGFpYm1xY29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5..."

# Verify they're set
railway variables
```

### Option 2: Railway Dashboard (Web UI) ⭐ Recommended

1. **Go to Railway Dashboard** → Your Project → Your Service
2. **Click "Variables" tab**
3. **Click "+ New Variable"**
4. **For each variable:**
   - **Name**: `APIFY_API_TOKEN`
   - **Value**: Paste your token (no quotes)
   - **Click "Add"**
5. **Repeat for all 3 variables:**
   - `APIFY_API_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔍 Verify Variables Are Set

```bash
# List all variables
railway variables

# Should show your variables (values may be hidden/masked)
```

Or check in Railway Dashboard → Your Service → Variables tab.

---

## 📝 Full Example

```bash
# 1. Login (if not already)
railway login

# 2. Set all 3 required variables
railway variables --set "APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE"
railway variables --set "SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Verify
railway variables

# 4. Deploy
railway up
```

---

## ⚠️ Common Mistakes

❌ **WRONG:**
```bash
railway add SUPABASE_URL=https://...
# ❌ 'railway add' is for adding SERVICES, not variables
```

✅ **CORRECT:**
```bash
railway variables --set "SUPABASE_URL=https://..."
# ✅ 'railway variables --set' is for setting variables
```

---

## 🎯 That's It!

After setting variables, your scraper server will have access to them when it runs. No need to restart or redeploy - Railway injects them at runtime.
