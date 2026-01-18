# 🔧 Fix: Railway Shared Variables Syntax Error

## ❌ Error Message
```
ERROR: invalid key-value pair "= APIFY_API_TOKEN=": empty key
Error: Docker build failed
```

## 🔍 Root Cause

This error happens when **Shared Variables** in Railway have incorrect syntax:
- Extra `=` signs
- Variable name starts with `=`
- Variable value has `=` at the start
- Malformed variable entries

## ✅ Fix in Railway Dashboard

### Step 1: Check Shared Variables

1. Go to **Railway Dashboard** → Your Project
2. Click **"Shared Variables"** (or go to your Service → Variables)
3. Look at all variables listed

### Step 2: Delete Malformed Variables

**Look for variables that:**
- Show as empty
- Have `=` in the name field
- Have `=` at the start of the value
- Look like `= APIFY_API_TOKEN=` or `APIFY_API_TOKEN= =`

**Delete these:**
1. Click the `...` menu (three dots) next to the variable
2. Click **"Delete"** or **"Remove"**
3. Confirm deletion

### Step 3: Re-add Variables Correctly

**For each variable:**

1. Click **"+ New Variable"** or **"Add Variable"**
2. **Variable Name**: Type exactly `APIFY_API_TOKEN` 
   - ❌ NOT `= APIFY_API_TOKEN`
   - ❌ NOT `APIFY_API_TOKEN=`
   - ✅ Just `APIFY_API_TOKEN`
3. **Value**: Paste your token directly
   - ❌ NOT `= apify_api_...`
   - ❌ NOT `apify_api_...=`
   - ✅ Just `YOUR_APIFY_API_TOKEN_HERE`
4. Click **"Add"**

### Step 4: Required Variables

Add these 3 variables correctly:

| Variable Name | Value (Example) |
|--------------|----------------|
| `APIFY_API_TOKEN` | `YOUR_APIFY_API_TOKEN_HERE` |
| `SUPABASE_URL` | `https://lpjyxpxkagctaibmqcoi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

---

## 📋 Step-by-Step Fix

1. **Open Railway Dashboard**
   - https://railway.app/dashboard

2. **Go to Shared Variables**
   - Click your project
   - Click **"Variables"** → **"Shared Variables"** tab
   - Or go to your service → **"Variables"** tab

3. **Delete ALL variables** (to start fresh)
   - Click `...` → **Delete** on each one
   - Or select all and delete

4. **Add each variable one by one:**
   ```
   Variable 1:
   Name: APIFY_API_TOKEN
   Value: [paste your token - no = signs, no quotes]
   
   Variable 2:
   Name: SUPABASE_URL
   Value: https://lpjyxpxkagctaibmqcoi.supabase.co
   
   Variable 3:
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: [paste your key - no = signs, no quotes]
   ```

5. **Link Shared Variables to Service** (if using Shared Variables)
   - Go to your **service** (scraper server)
   - Click **"Variables"** tab
   - Click **"Add from Shared"**
   - Select the 3 variables you just created
   - OR add them directly to the service (not as shared)

6. **Redeploy**
   - Railway will auto-redeploy, or click **"Redeploy"**

---

## ✅ Correct Format Examples

### ✅ CORRECT:
```
Variable Name: APIFY_API_TOKEN
Value: YOUR_APIFY_API_TOKEN_HERE
```

### ❌ WRONG:
```
Variable Name: = APIFY_API_TOKEN
Value: apify_api_...
```

```
Variable Name: APIFY_API_TOKEN=
Value: apify_api_...
```

```
Variable Name: APIFY_API_TOKEN
Value: = apify_api_...
```

---

## 🎯 Quick Fix Checklist

- [ ] Go to Railway Dashboard
- [ ] Check Shared Variables for `=` signs
- [ ] Delete ALL malformed/empty variables
- [ ] Re-add variables with correct syntax (no `=`, no spaces)
- [ ] Make sure variables are linked to your service
- [ ] Redeploy

---

## 💡 Why This Happens

- Copy-paste from `.env.local` files can include `=` signs
- Railway Dashboard sometimes auto-formats incorrectly
- Shared Variables with syntax errors break the Docker build
- Variables must be clean: `KEY` and `VALUE` with nothing extra

---

**After fixing, your build should succeed!** 🚀
