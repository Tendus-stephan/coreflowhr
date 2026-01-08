# Fix Email HTML and Logo Issues

## Problem
1. HTML links are showing as raw text (e.g., `<a href="...">` instead of rendered links)
2. Logo is not displaying in emails

## Solution

### 1. HTML Links Showing as Raw Text

**Root Cause:** The Edge Function code has been updated to properly detect and preserve HTML, but it needs to be **redeployed** for the changes to take effect.

**Fix:**
1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find the `send-email` function
3. Click **"Deploy"** or **"Redeploy"** button

The updated code now:
- Detects HTML tags more reliably (including `<a>`, `<p>`, `<br>`, etc.)
- Preserves HTML content without escaping it
- Only escapes plain text content
- Removes dangerous elements while preserving valid HTML

### 2. Logo Not Displaying

**Root Cause:** The logo URL might not be publicly accessible, or email clients are blocking it.

**Fix Options:**

#### Option A: Use Supabase Storage (Recommended)

1. **Create Storage Bucket** (if not already created):
   - Go to Supabase Dashboard → **Storage**
   - Create a new bucket named `email-assets`
   - Set it to **Public** (important!)

2. **Upload Logo:**
   - Go to the `email-assets` bucket
   - Upload your logo file (e.g., `coreflow-logo.png`)
   - Make sure it's publicly accessible

3. **Get Public URL:**
   - Click on the uploaded logo file
   - Copy the **Public URL** (format: `https://[project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png`)

4. **Set Environment Variable:**
   - Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
   - Add/Update: `LOGO_URL` = `[paste the Public URL from step 3]`
   - Or use CLI: `supabase secrets set LOGO_URL="https://[project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png"`

5. **Redeploy the Edge Function:**
   - Go to **Edge Functions** → `send-email`
   - Click **"Deploy"** or **"Redeploy"**

#### Option B: Use Your Domain (Current Default)

The default logo URL is: `https://coreflowhr.com/assets/images/coreflow-logo.png`

**To make it work:**
1. Ensure the logo file exists at that path on your website
2. Verify it's publicly accessible (try opening the URL in a browser)
3. Ensure your website serves the file via HTTPS (required by email clients)
4. No Edge Function redeploy needed if using default URL

**To test logo accessibility:**
```bash
curl -I https://coreflowhr.com/assets/images/coreflow-logo.png
```

If you get a `200 OK` response, the logo URL is accessible.

### 3. Verify the Fix

1. **Send a test email** (e.g., create an offer or schedule an interview)
2. **Check the email:**
   - HTML links should render as clickable links (not raw HTML)
   - Logo should display at the top of the email

3. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → **Edge Functions** → `send-email` → **Logs**
   - Look for: `[Email Send] Logo URL configured`
   - Verify the logo URL is correct

## Summary

**Most Important Steps:**
1. ✅ **Redeploy the `send-email` Edge Function** (for HTML fix)
2. ✅ **Set `LOGO_URL` in Supabase Edge Function secrets** (for logo fix)
3. ✅ **Redeploy the Edge Function again** (if you set a new LOGO_URL)

The code changes are already in place - you just need to deploy them!



