# Fix Logo Not Showing in Emails

## Issue
Logo is not displaying in emails even after redeploying the Edge Function.

## Common Causes & Solutions

### 1. Logo URL Not Accessible (Most Common)

The default logo URL is: `https://coreflowhr.com/assets/images/coreflow-logo.png`

**Check if logo is accessible:**
- Open this URL in your browser: `https://coreflowhr.com/assets/images/coreflow-logo.png`
- If you get a 404 or error, the logo file is not at that location

**Solution - Upload to Supabase Storage (Recommended):**

1. **Create Storage Bucket (if not exists):**
   - Go to Supabase Dashboard → **Storage**
   - Click "New bucket"
   - Name: `email-assets`
   - Make it **Public** (important!)
   - Create the bucket

2. **Upload Logo:**
   - Go to the `email-assets` bucket
   - Click "Upload file"
   - Upload `coreflow-logo.png` from `public/assets/images/coreflow-logo.png`
   - Wait for upload to complete

3. **Get Public URL:**
   - Click on the uploaded logo file
   - Copy the **Public URL** (looks like: `https://[project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png`)

4. **Set Environment Variable:**
   - Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
   - Add/Update: `LOGO_URL` = `[paste the Public URL from step 3]`
   - Save

5. **Redeploy Edge Function:**
   - Go to **Edge Functions** → `send-email`
   - Click **"Deploy"** or **"Redeploy"**

### 2. Logo File Exists but Not Accessible via HTTPS

Email clients require HTTPS URLs. If your logo is hosted elsewhere:
- Ensure the URL uses `https://` not `http://`
- Ensure the server has a valid SSL certificate
- Ensure the logo is publicly accessible (no authentication required)

### 3. Logo URL Environment Variable Not Set

If you haven't set `LOGO_URL` in Supabase secrets, it will use the default URL.

**To set it:**
1. Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Add: `LOGO_URL` = `[your logo URL]`
3. Redeploy the `send-email` Edge Function

### 4. Logo Not in Email Template

Check the Edge Function logs to see what logo URL is being used:

1. Go to Supabase Dashboard → **Edge Functions** → `send-email` → **Logs**
2. Look for: `[Email Send] Logo URL configured`
3. Check the `logoUrl` value in the log

### 5. Email Client Blocking Images

Some email clients block images by default. This is normal behavior:
- Gmail: Images are blocked until user clicks "Display images"
- Outlook: Images may be blocked
- Apple Mail: Images usually display

**To test:**
- Send a test email to yourself
- Check if the logo displays (you may need to click "Display images" in Gmail)
- Check the email source code (View → Show Original in Gmail) to see if the `<img>` tag is present

## Quick Fix Checklist

- [ ] Logo file exists at `public/assets/images/coreflow-logo.png`
- [ ] Logo is accessible at `https://coreflowhr.com/assets/images/coreflow-logo.png` (open in browser)
- [ ] OR Logo is uploaded to Supabase Storage bucket `email-assets` (public bucket)
- [ ] `LOGO_URL` environment variable is set in Supabase Edge Function secrets
- [ ] Edge Function has been redeployed after setting `LOGO_URL`
- [ ] Email client is displaying images (may need to click "Display images")

## Recommended Solution: Use Supabase Storage

**Why?**
- Guaranteed HTTPS
- Publicly accessible
- Reliable CDN delivery
- Works from any environment

**Steps:**
1. Upload logo to Supabase Storage `email-assets` bucket (public)
2. Copy the Public URL
3. Set `LOGO_URL` in Supabase Edge Function secrets
4. Redeploy Edge Function
5. Test sending an email

## Verify Logo in Email

After fixing, send a test email and:
1. Check the email in your inbox
2. Right-click on where the logo should be → "View Image" or "Open Image in New Tab"
3. If it opens, the logo is there but may be blocked by email client
4. Check email source code to verify the `<img>` tag has the correct URL



