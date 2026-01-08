# Debug: Logo Still Not Showing in Emails

## Step-by-Step Debugging

### 1. Check Edge Function Logs

The Edge Function logs the logo URL being used. Check this:

1. Go to **Supabase Dashboard** → **Edge Functions** → `send-email` → **Logs**
2. Send a test email
3. Look for log entry: `[Email Send] Logo URL configured`
4. Check what `logoUrl` value is being used

**Expected log:**
```json
{
  "logoUrl": "https://[project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png",
  "isSupabaseStorage": true,
  "isHttps": true,
  "timestamp": "2025-01-XX..."
}
```

**If logoUrl is wrong:**
- The LOGO_URL secret might not be set correctly
- Redeploy the Edge Function after setting the secret

### 2. Verify Logo URL is Accessible

Test if the logo URL works:

1. Copy the logo URL from the logs (or from Supabase Storage)
2. Open it in a browser (new tab)
3. **Does the image load?**
   - ✅ If YES: Logo URL is correct, issue is with email client
   - ❌ If NO: Logo URL is wrong or file doesn't exist

### 3. Check Email Source Code

View the actual email HTML to see if the logo tag is there:

**In Gmail:**
1. Open the email
2. Click the three dots (⋮) → "Show original"
3. Search for `<img` or `logo`
4. Look for the logo image tag

**In Outlook:**
1. Right-click the email → "View Source"
2. Search for `<img` or `logo`

**What to look for:**
```html
<img src="https://[project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png" 
     alt="CoreFlow" 
     width="180" 
     height="auto" 
     style="display: block; max-width: 180px; height: auto; border: 0; outline: none; text-decoration: none;" />
```

**If the `<img>` tag is missing:**
- The email template isn't being used correctly
- Check Edge Function deployment

**If the `<img>` tag is there but image doesn't show:**
- Email client is blocking the image (normal behavior)
- URL might be wrong (verify in browser)
- Image might be too large

### 4. Email Client Image Blocking

Many email clients block images by default:

**Gmail:**
- Images are blocked until user clicks "Display images"
- Look for: "Images are not displayed. Display images below" at top of email

**Outlook:**
- May block external images
- Check security settings

**Apple Mail:**
- Usually displays images
- Check Privacy settings

**Solution:** This is normal behavior. Users need to click "Display images" in Gmail.

### 5. Test Logo URL Directly

Copy this command and run in your terminal (replace with your actual logo URL):

```bash
curl -I https://[your-project-id].supabase.co/storage/v1/object/public/email-assets/coreflow-logo.png
```

**Expected response:**
```
HTTP/2 200
content-type: image/png
```

**If you get 404 or 403:**
- Logo file doesn't exist at that path
- Bucket is not public
- File permissions issue

### 6. Verify Supabase Storage Settings

1. Go to **Supabase Dashboard** → **Storage** → `email-assets`
2. Check:
   - ✅ Bucket is **Public** (not Private)
   - ✅ File exists in bucket
   - ✅ File name matches exactly (case-sensitive)

3. Click on the file → Check:
   - ✅ Public URL is accessible
   - ✅ URL uses HTTPS
   - ✅ Copy the exact URL

### 7. Test with Different Email Client

Try sending test email to:
- Gmail account
- Outlook account  
- Apple Mail
- Different email service

See if logo shows in any of them (some clients block images more aggressively).

### 8. Check Email HTML Content

The logo should be in the email template. If it's completely missing from the HTML source, the template might not be rendering correctly.

**Check Resend logs:**
1. Go to Resend Dashboard
2. Check email logs/deliveries
3. View the email HTML
4. Search for "logo" or "img"

### 9. Common Issues Checklist

- [ ] LOGO_URL secret is set in Supabase Edge Function secrets
- [ ] Edge Function was redeployed AFTER setting LOGO_URL
- [ ] Logo file exists in Supabase Storage `email-assets` bucket
- [ ] Bucket is set to **Public**
- [ ] Logo URL opens in browser (test it)
- [ ] Logo URL uses HTTPS (not HTTP)
- [ ] Email source code contains `<img>` tag with logo URL
- [ ] Email client is set to display images (Gmail: click "Display images")

### 10. Alternative: Use Base64 Embedded Image

If external images are being blocked, we can embed the logo as base64 in the email. This would require:
- Encoding the logo file as base64
- Embedding it directly in the HTML as: `<img src="data:image/png;base64,..." />`

**Note:** This increases email size but guarantees the logo displays.

## Most Likely Issue

Based on the symptoms, the most likely issues are:

1. **Email client blocking images** (Gmail/Outlook default behavior)
   - Solution: Click "Display images" in Gmail
   - This is normal and expected behavior

2. **LOGO_URL not being picked up**
   - Solution: Verify secret is set, redeploy Edge Function
   - Check logs to see what URL is actually being used

3. **Logo URL not accessible**
   - Solution: Verify URL opens in browser
   - Check Supabase Storage bucket is public

## Quick Test

1. Check Edge Function logs for logo URL
2. Copy the logo URL from logs
3. Open it in a browser - does it load?
4. If yes → Logo is working, issue is email client
5. If no → Fix the logo URL first



