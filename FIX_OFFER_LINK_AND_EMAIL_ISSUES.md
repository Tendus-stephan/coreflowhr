# Fix Offer Link and Email Issues

## Issues
1. **Invalid offer link error** when clicking offer response link from email
2. **HTML showing as raw text** in emails (links showing `<a href=...>` instead of rendered)
3. **Logo not displaying** in emails

## Solution

### 1. HTML and Logo Issues - **Redeploy Edge Function**

**IMPORTANT:** The code fixes are already in place, but you MUST redeploy the Edge Function:

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find the `send-email` function
3. Click **"Deploy"** or **"Redeploy"** button
4. Wait for deployment to complete

This will apply:
- ✅ Improved HTML detection that preserves HTML links
- ✅ Logo display in email template

### 2. Invalid Offer Link Issue

The offer link might be invalid due to:

#### A. Frontend URL Mismatch

When sending an offer, the link uses `window.location.origin`. If you're testing:
- **In development:** Link will be `http://localhost:3002/offers/respond/[token]`
- **From production:** Link should be `https://coreflowhr.com/offers/respond/[token]`

**Check:**
1. What URL is in the email link?
2. Are you clicking it from the correct environment?

#### B. Token Not Saved

The token should be saved when the offer is sent. To verify:

1. **Check if token exists in database:**
   - Go to Supabase Dashboard → **Table Editor** → `offers` table
   - Find the offer you just sent
   - Check if `offer_token` column has a value (should be a 64-character hex string)

2. **If token is NULL:**
   - The token generation/storage failed
   - Check browser console for errors when sending offer
   - Check Supabase logs for errors

#### C. Token URL Encoding Issues

The token should be a hex string (safe for URLs), but if there are any issues:

**Check the email link format:**
- Should be: `https://coreflowhr.com/offers/respond/[64-char-hex-token]`
- Should NOT have any encoding like `%20`, `%2F`, etc.

#### D. Production Frontend URL Fix

If offers are being sent from production but links point to localhost, we need to fix the frontend URL:

**Option 1: Use environment variable (Recommended)**

1. Add `VITE_FRONTEND_URL` to your `.env` file:
   ```
   VITE_FRONTEND_URL=https://coreflowhr.com
   ```

2. Update `services/api.ts` to use it:
   ```typescript
   const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 
                       (typeof window !== 'undefined' ? window.location.origin : 'https://coreflowhr.com');
   ```

**Option 2: Hardcode production URL (Quick fix)**

Update `services/api.ts` line ~4300:
```typescript
const frontendUrl = 'https://coreflowhr.com'; // Always use production URL
```

### 3. Debugging Steps

1. **Check the email link:**
   - Open the email you received
   - Hover over the offer link to see the full URL
   - Check if it matches your domain

2. **Check the token in database:**
   ```sql
   SELECT id, offer_token, offer_token_expires_at, status, sent_at
   FROM offers
   WHERE status = 'sent'
   ORDER BY sent_at DESC
   LIMIT 5;
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for errors when sending offer or clicking link

4. **Check Supabase logs:**
   - Go to Supabase Dashboard → **Logs** → **Postgres Logs**
   - Look for errors related to offers

### 4. Quick Fix Checklist

- [ ] Redeploy `send-email` Edge Function in Supabase Dashboard
- [ ] Verify `offer_token` is being saved in database (check offers table)
- [ ] Check if offer link URL is correct (production vs localhost)
- [ ] Test sending a new offer and verify the link works
- [ ] Check browser console for errors
- [ ] Verify logo URL is accessible (if using custom logo)

## Expected Behavior After Fix

1. ✅ HTML links in emails should render as clickable links (not raw HTML)
2. ✅ Logo should display at top of emails
3. ✅ Offer links should work and redirect to offer response page
4. ✅ Token should be valid for 60 days from when offer was sent



