# 🔧 Complete Fix: Railway Empty Key Error

## The Problem
```
ERROR: invalid key-value pair "= APIFY_API_TOKEN=": empty key
Error: Docker build failed
```

Even after fixing variables, Railway is still seeing malformed syntax during Docker build.

## ✅ Complete Solution: Nuclear Option

### Step 1: Delete ALL Variables (Start Fresh)

**In Railway Dashboard:**

1. Go to **Railway Dashboard** → Your Project
2. **Go to "Shared Variables"**
   - Delete EVERY variable (even correct ones)
   - This ensures no malformed ones exist
3. **Go to Your Service** → **Variables Tab**
   - Delete EVERY variable here too
   - Start completely fresh

### Step 2: Check for Hidden/Raw Editor Issues

1. In Railway Dashboard → Your Service → **Variables Tab**
2. Look for a **"RAW Editor"** button/tab
3. If you see JSON or raw text, check for:
   - Lines starting with `=`
   - Empty keys: `"": "value"`
   - Malformed syntax
4. Clear everything in RAW editor if it exists

### Step 3: Add Variables ONE at a Time (Very Carefully)

**Do this in Railway Dashboard (NOT Shared Variables):**

1. Go to **Your Service** (the scraper server)
2. Click **"Variables"** tab (NOT Shared Variables)
3. Click **"+ New Variable"**
4. **For Variable 1:**
   - Name field: Type `APIFY_API_TOKEN` (copy exactly, no spaces before/after)
   - Value field: Paste your token (start typing, don't copy-paste if it has issues)
   - Click **"Add"**
   - Verify it shows correctly (name has no `=`, value has no `=` at start)

5. **For Variable 2:**
   - Click **"+ New Variable"** again
   - Name: `SUPABASE_URL`
   - Value: `https://lpjyxpxkagctaibmqcoi.supabase.co`
   - Click **"Add"**

6. **For Variable 3:**
   - Click **"+ New Variable"** again
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your full service role key
   - Click **"Add"**

### Step 4: Verify Before Deploying

**Check each variable:**
- Name shows: `APIFY_API_TOKEN` (not `= APIFY_API_TOKEN`)
- Value shows: Starts with `apify_api_` (not `= apify_api_`)
- No spaces around the `=`

### Step 5: Try a Different Approach - Use Service Variables Only

**Don't use Shared Variables for now:**
- Add variables directly to your SERVICE
- Not as "Shared Variables"
- This avoids any cross-service syntax issues

---

## 🔍 Alternative: Check Railway Build Logs

1. Go to Railway Dashboard → Your Service
2. Click on the **latest failed deployment**
3. Open **"Build Logs"**
4. Look for where it says `"= APIFY_API_TOKEN="`
5. This will show WHERE Railway is reading it from

---

## 💡 Nuclear Option: Recreate Service

If nothing works:

1. **Note your Railway URL** (you'll need it later)
2. **Create a NEW service** in Railway
3. **Link it to the same GitHub repo** (or deploy fresh)
4. **Add variables to the NEW service** (clean slate)
5. **Test deployment**
6. **Update Supabase** with new URL if it changed

---

## 🎯 Quick Checklist

- [ ] Deleted ALL variables from Shared Variables
- [ ] Deleted ALL variables from Service Variables  
- [ ] Added variables directly to Service (not shared)
- [ ] Verified each variable has correct name (no `=`)
- [ ] Verified each variable has correct value (no `=` at start)
- [ ] Checked Build Logs for source of error
- [ ] Tried redeploying

---

## 📞 If Still Failing

**Check Railway Build Logs:**
- The exact line showing `"= APIFY_API_TOKEN="` will tell us WHERE Railway is reading it from
- Might be:
  - A Dockerfile `ENV` statement
  - A build script
  - Auto-detection from code
  - A hidden config file

**Share the full error from Build Logs** - it will show the exact source!
