# Setup Email Logo - Simple Guide

## Problem
The logo image in emails isn't loading. We need to upload it to Supabase Storage and update the code.

## Solution (3 Steps)

### Step 1: Upload Logo to Supabase Storage

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Click "Storage"** in the left sidebar
3. **Create a bucket** (if it doesn't exist):
   - Click **"New bucket"**
   - Name: `email-assets`
   - ✅ **Check "Public bucket"** (IMPORTANT!)
   - Click **"Create bucket"**
4. **Upload the logo**:
   - Click on the `email-assets` bucket
   - Click **"Upload file"**
   - Select: `public/assets/images/coreflow-favicon-logo.png`
   - Wait for upload to complete
5. **Get the Public URL**:
   - Click on the uploaded file (`coreflow-favicon-logo.png`)
   - You'll see a **"Public URL"** - it looks like:
     ```
     https://[your-project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-favicon-logo.png
     ```
   - **Copy this entire URL** (you'll need it in Step 2)

### Step 2: Update the Code

1. **Open**: `supabase/functions/send-email/index.ts`
2. **Find line 243** (around there) - it says:
   ```typescript
   const logoUrl = Deno.env.get('LOGO_URL') || 'https://coreflowhr.com/assets/images/coreflow-favicon-logo.png';
   ```
3. **Replace** the URL after `||` with your Supabase Storage URL from Step 1:
   ```typescript
   const logoUrl = Deno.env.get('LOGO_URL') || 'https://[your-project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-favicon-logo.png';
   ```
   (Replace `[your-project-id]` with your actual project ID)

### Step 3: Redeploy the Function

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Click on `send-email`**
3. **Click "Deploy"** or **"Redeploy"**
4. **Wait for deployment to complete**

## Done! ✅

After these steps, your emails will show the logo correctly!

## Alternative: Using Secrets (If You Can Find It)

If you can find the Secrets section:
1. **Go to**: Settings (⚙️) → **Edge Functions** → **Secrets**
2. **Add**: `LOGO_URL` = `[your Supabase Storage URL]`
3. **Redeploy** the function

But the hardcoded URL method (Step 2) is simpler and works just as well!













