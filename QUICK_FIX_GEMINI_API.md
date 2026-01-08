# Quick Fix: Gemini API Key Referrer Blocking

## The Error
```
API_KEY_HTTP_REFERRER_BLOCKED: Requests from referer http://localhost:3002/ are blocked.
```

This means your API key has HTTP referrer restrictions that block localhost.

## Quick Fix (2 minutes)

### Step 1: Open Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account

### Step 2: Find Your API Key
1. Look for "API keys" section
2. Click on your Gemini API key (or create one if you don't have one)

### Step 3: Fix Referrer Restriction

**Option A: Add Localhost (Recommended)**
1. Under **"Application restrictions"**
2. Select **"HTTP referrers (websites)"**
3. Click **"Add an item"**
4. Add these one by one:
   - `http://localhost:3002/*`
   - `http://localhost:5173/*`
   - `http://localhost:3000/*` (if you use port 3000)
   - `https://coreflowhr.com/*`
   - `https://www.coreflowhr.com/*`
5. Click **"Save"** at the bottom

**Option B: Remove Restriction (Development Only)**
⚠️ **Only for development!**
1. Under **"Application restrictions"**
2. Select **"None"**
3. Click **"Save"**

### Step 4: Wait & Test
- Wait 1-2 minutes for changes to propagate
- Refresh your browser
- Try the AI chat again

## If You Don't Have an API Key Yet

1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key
4. Add to your `.env` file:
   ```
   VITE_API_KEY=your_api_key_here
   ```
5. Restart your dev server (`npm run dev`)

## Still Not Working?

- Make sure you saved the changes in Google Cloud Console
- Wait 2-3 minutes for propagation
- Check that `VITE_API_KEY` is in your `.env` file
- Restart your development server
- Clear browser cache

