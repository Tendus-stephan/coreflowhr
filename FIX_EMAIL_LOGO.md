# Fix Email Logo Not Loading

## Problem
The logo image in emails is not loading because the URL `https://coreflowhr.com/assets/images/coreflow-favicon-logo.png` may not be publicly accessible or the path is incorrect.

## Solution: Upload Logo to Supabase Storage

### Step 1: Upload Logo to Supabase Storage

1. **Go to Supabase Dashboard** → **Storage**
2. **Create a new bucket** (if it doesn't exist):
   - Name: `email-assets`
   - Public: ✅ **Check this** (important!)
   - Click "Create bucket"

3. **Upload the logo**:
   - Click on the `email-assets` bucket
   - Click "Upload file"
   - Select `public/assets/images/coreflow-favicon-logo.png`
   - Upload it

4. **Get the public URL**:
   - After upload, click on the file
   - Copy the **Public URL** (looks like: `https://[project].supabase.co/storage/v1/object/public/email-assets/coreflow-favicon-logo.png`)

### Step 2: Set Environment Variable in Supabase

1. **Go to Supabase Dashboard** → **Edge Functions** → **send-email**
2. **Go to Settings** → **Environment Variables**
3. **Add new variable**:
   - **Name:** `LOGO_URL`
   - **Value:** `https://[your-project].supabase.co/storage/v1/object/public/email-assets/coreflow-favicon-logo.png`
   - (Replace `[your-project]` with your actual Supabase project ID)
4. **Save**

### Step 3: Redeploy the Edge Function

1. **Go to Edge Functions** → **send-email**
2. **Click "Deploy"** or **"Redeploy"**

## Alternative: Verify Vercel URL

If you want to use the Vercel URL instead:

1. **Check if the image is accessible**:
   - Open `https://coreflowhr.com/assets/images/coreflow-favicon-logo.png` in your browser
   - If it loads, the URL is correct
   - If it doesn't, the file might not be deployed correctly

2. **If the image doesn't load on Vercel**:
   - Make sure the file is in `public/assets/images/` folder
   - Redeploy to Vercel
   - Check Vercel build logs to ensure the file is included

## Recommended Solution

**Use Supabase Storage** - it's more reliable for emails because:
- ✅ Always publicly accessible
- ✅ Works in all email clients
- ✅ No CORS issues
- ✅ Faster loading

After setting up Supabase Storage, your emails will show the logo correctly!






