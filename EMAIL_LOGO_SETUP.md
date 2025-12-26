# Email Logo Setup Guide

## Problem
The logo image in emails isn't showing up, even though it's stored in Supabase Storage.

## Solution

### Step 1: Create the Email Assets Bucket

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `CREATE_EMAIL_ASSETS_BUCKET.sql`
3. Click **Run**
4. Verify: Go to **Storage** → You should see `email-assets` bucket listed

### Step 2: Upload Your Logo

1. Go to **Supabase Dashboard** → **Storage** → **email-assets**
2. Click **Upload file**
3. Upload your logo image (PNG, JPG, or SVG recommended)
4. **Important:** Name it something simple like `logo.png` or `coreflow-logo.png`

### Step 3: Get the Public URL

1. In the **email-assets** bucket, click on your uploaded logo file
2. You'll see a **Public URL** section
3. **Copy the full URL** - it should look like:
   ```
   https://[your-project-id].supabase.co/storage/v1/object/public/email-assets/logo.png
   ```

### Step 4: Set the LOGO_URL Environment Variable

1. Go to **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Add or update the secret:
   - **Name:** `LOGO_URL`
   - **Value:** The public URL you copied (e.g., `https://[project-id].supabase.co/storage/v1/object/public/email-assets/logo.png`)
3. Click **Save**

### Step 5: Verify It Works

1. Send a test email
2. Check the email - the logo should now appear
3. If it doesn't appear, check:
   - Is the bucket set to **Public**? (Go to Storage → email-assets → Settings → Public bucket should be checked)
   - Does the URL work when you paste it in a browser?
   - Check Supabase Edge Function logs for `[Email Send] Logo URL configured` to see what URL is being used

## Common Issues

### Logo Still Not Showing?

1. **Check if bucket is public:**
   - Go to Storage → email-assets → Settings
   - Ensure "Public bucket" is checked ✅

2. **Check the URL in browser:**
   - Copy the LOGO_URL and paste it in a new browser tab
   - If it doesn't load, the URL is wrong or the file doesn't exist

3. **Check email client settings:**
   - Some email clients (Gmail, Outlook) block external images by default
   - The user needs to click "Display images" or add you to trusted senders
   - This is normal behavior for email security

4. **Check logs:**
   - Go to Supabase Dashboard → Edge Functions → send-email → Logs
   - Look for `[Email Send] Logo URL configured` to see what URL is being used

### URL Format

The correct format for Supabase Storage public URLs is:
```
https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
```

Example:
```
https://abcdefghijklmnop.supabase.co/storage/v1/object/public/email-assets/logo.png
```

## Testing

After setting up, you can test by:
1. Sending a test email from your app
2. Checking the email in your inbox
3. If images are blocked, click "Display images" or check the email in a different client

## Notes

- The bucket **must** be public for email clients to access images
- Use HTTPS URLs (not HTTP)
- PNG or JPG formats work best for email clients
- Keep file size reasonable (< 500KB recommended)

