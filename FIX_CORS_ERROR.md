# Fix CORS Error on Production Site

## The Error

```
Access to fetch at 'https://lpjyxpxkagctaibmqcoi.supabase.co/functions/v1/send-email' 
from origin 'https://coreflow-qx7ps8k5v-stephans-projects-6087cbb4.vercel.app' 
has been blocked by CORS policy
```

## The Problem

Your Supabase Edge Function needs to allow requests from your Vercel deployment URL. The function has CORS protection that only allows specific origins.

## The Solution

You need to set the `ALLOWED_ORIGINS` environment variable in your **Supabase Edge Function secrets** to include your Vercel URLs.

---

## Step-by-Step Fix

### Step 1: Get Your Vercel URLs

You have two Vercel URLs:
1. **Production:** `https://www.coreflowhr.com` (or your custom domain)
2. **Preview:** `https://coreflow-qx7ps8k5v-stephans-projects-6087cbb4.vercel.app` (current deployment)

### Step 2: Go to Supabase Dashboard

1. Go to: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**

### Step 3: Add/Update ALLOWED_ORIGINS

1. Look for `ALLOWED_ORIGINS` in the secrets list
2. If it exists, click **Edit**
3. If it doesn't exist, click **Add new secret**

4. **Set the value to:**
   ```
   https://www.coreflowhr.com,https://coreflowhr.com,https://coreflow-qx7ps8k5v-stephans-projects-6087cbb4.vercel.app
   ```

   **Important:** 
   - Use commas to separate multiple URLs
   - Include both `www` and non-www versions of your domain
   - Include your Vercel preview URL (the one in the error)
   - No spaces after commas
   - **Note:** You DON'T need to include localhost URLs (like `http://localhost:3002`) because the code automatically allows all localhost URLs for development

5. Click **Save**

### Step 4: Verify Other Edge Functions

You should also add `ALLOWED_ORIGINS` to other Edge Functions that might need it:
- `create-checkout-session`
- `create-portal-session`
- `stripe-webhook` (may not need this - webhooks come from Stripe)
- `send-email` (this one)
- Any other functions that handle requests from your frontend

---

## Alternative: Update Each Function's CORS Config

If you prefer, you can also update the `getAllowedOrigins()` function in each Edge Function file to include your Vercel URLs by default. But using `ALLOWED_ORIGINS` environment variable is the recommended approach.

---

## Complete ALLOWED_ORIGINS Value

For your setup, use this value:

```
https://www.coreflowhr.com,https://coreflowhr.com,https://coreflow-qx7ps8k5v-stephans-projects-6087cbb4.vercel.app
```

This includes:
- ✅ Your production domain (www and non-www)
- ✅ Your current Vercel preview URL
- ✅ **Localhost URLs are NOT needed** - the code automatically allows all `http://localhost:*` URLs for development

---

## How It Works

The `send-email` Edge Function reads `ALLOWED_ORIGINS` from environment variables. If not set, it defaults to localhost URLs. That's why it works locally but not in production.

Once you add your Vercel URLs to `ALLOWED_ORIGINS`, the function will accept requests from those origins.

---

## After Adding ALLOWED_ORIGINS

1. ✅ Save the secret in Supabase
2. ✅ No redeployment needed (Edge Functions read env vars dynamically)
3. ✅ Try your action again (e.g., sending an email)
4. ✅ CORS error should be gone!

---

## Do You Need to Link Supabase to Vercel?

**No, you don't need to "link" Supabase to Vercel.** They're separate services:

- **Vercel** = Hosts your frontend/website
- **Supabase** = Provides your database and Edge Functions

You just need to:
1. ✅ Set environment variables in Vercel (for frontend)
2. ✅ Set secrets in Supabase (for Edge Functions)
3. ✅ Configure CORS to allow Vercel URLs to call Supabase functions

That's it! No linking required.

---

## Quick Checklist

- [ ] Go to Supabase Dashboard → Settings → Edge Functions → Secrets
- [ ] Add/Update `ALLOWED_ORIGINS` secret
- [ ] Include your Vercel URLs (production + preview)
- [ ] Save
- [ ] Test again - CORS error should be fixed!

---

**After this, your production site should be able to call Supabase Edge Functions without CORS errors!** ✅

