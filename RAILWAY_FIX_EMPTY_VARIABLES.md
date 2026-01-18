# 🔧 Fix: Railway Empty Variables & Syntax Errors

## ❌ Common Syntax Errors

### Error: `invalid key-value pair "= SUPABASE_URL=": empty key`

This happens when:
- Extra `=` signs
- Spaces around `=`
- Copy-paste issues

## ✅ Correct Syntax for Railway

### Option 1: Railway CLI (Recommended - Most Reliable)

**Correct format:**
```bash
railway add VARIABLE_NAME=value_without_spaces
```

**⚠️ Important:**
- ❌ NO spaces around `=`
- ❌ NO quotes needed
- ✅ Value immediately after `=`

**Examples:**
```bash
# ✅ CORRECT
railway add APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE

# ✅ CORRECT (URLs)
railway add SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co

# ✅ CORRECT (Long tokens)
railway add SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwanl4cHhrYWdjdGFpYm1xY29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5...

# ❌ WRONG (spaces around =)
railway add SUPABASE_URL = https://...

# ❌ WRONG (extra =)
railway add = SUPABASE_URL=https://...

# ❌ WRONG (quotes)
railway add SUPABASE_URL="https://..."
```

---

### Option 2: Railway Dashboard (Web UI)

**Steps:**
1. Go to your **service** (not Shared Variables - the actual service)
2. Click **Variables** tab
3. Click **+ New Variable**
4. **Variable Name**: `APIFY_API_TOKEN` (no spaces, no =)
5. **Value**: Paste your token (no quotes, no spaces)
6. Click **Add**

**⚠️ Common Mistakes:**
- ❌ Typing `= APIFY_API_TOKEN` in the name field
- ❌ Including quotes in the value field
- ❌ Adding spaces before/after the value
- ❌ Setting in "Shared Variables" but not linking to service

---

## 🔍 Fix: Variables Showing as Empty

### Problem 1: Set in Shared Variables, Not Service Variables

**Solution:**
1. Go to your **service** (the scraper server deployment)
2. Click **Variables** tab
3. Click **"Add from Shared"** or **"Add Variable"**
4. Select the shared variables you created
5. Or add them directly to the service

### Problem 2: Typo in Variable Name

**Check exact spelling:**
- ✅ `APIFY_API_TOKEN` (not `APIFY_TOKEN`)
- ✅ `SUPABASE_URL` (not `SUPABASE_URL` - wait, that's the same)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_KEY`)

### Problem 3: Value Has Hidden Characters

**Solution:**
- Copy from `.env.local` (not from browser)
- Or type manually
- Don't include quotes or spaces

---

## ✅ Step-by-Step: Fix Empty Variables

### Method 1: CLI (Recommended)

```bash
# 1. Get your values from .env.local
# Open .env.local and copy each value

# 2. Set each variable (replace with YOUR actual values)
railway add APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN_HERE

railway add SUPABASE_URL=https://lpjyxpxkagctaibmqcoi.supabase.co

railway add SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Verify they're set
railway variables

# 4. Check output - should show values (even if masked)
```

### Method 2: Dashboard (If CLI doesn't work)

1. **Go to Railway Dashboard** → Your Project → Your Service
2. **Click "Variables" tab**
3. **Delete any empty/malformed variables:**
   - Click the `...` menu on empty variables
   - Select "Delete"
4. **Add each variable one by one:**
   - Click **+ New Variable**
   - **Name**: `APIFY_API_TOKEN`
   - **Value**: Paste token (no spaces, no quotes)
   - Click **Add**
   - Repeat for each variable

---

## 🔍 Verify Variables Are Set Correctly

### Check via CLI:
```bash
railway variables
```

Should show:
```
APIFY_API_TOKEN          [hidden]
SUPABASE_URL             https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY [hidden]
```

### Check via Dashboard:
1. Go to your service
2. Variables tab
3. Should see all variables listed (values hidden but visible)
4. If showing "Empty" or blank, they're not set correctly

---

## 🚨 Quick Fix: Delete and Re-add

If variables keep showing empty:

1. **Via CLI:**
   ```bash
   # List current variables
   railway variables
   
   # Delete problematic ones (if Railway CLI supports it)
   # Or delete via dashboard, then re-add:
   railway add APIFY_API_TOKEN=<your-token>
   ```

2. **Via Dashboard:**
   - Delete all variables for the service
   - Add them again one by one
   - Double-check no spaces/quotes

---

## 📋 Required Variables Checklist

Make sure you have these 3 variables set:

- [ ] `APIFY_API_TOKEN` - From https://apify.com/settings/integrations
- [ ] `SUPABASE_URL` - From Supabase Dashboard → Settings → API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API

---

## 💡 Pro Tip

**Get values from your `.env.local` file:**
```bash
# On Windows (PowerShell)
Get-Content .env.local | Select-String "APIFY_API_TOKEN"

# Or just open .env.local in your editor and copy values
```

Then paste directly into Railway (no quotes, no spaces).
