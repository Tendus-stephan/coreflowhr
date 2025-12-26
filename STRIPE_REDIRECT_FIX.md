# Fix: Stripe Payment Redirect to Port 5173

## Problem
After Stripe payment, redirects were going to `localhost:5173` (dev port) instead of the production domain, causing the site not to open.

## Solution Applied

Updated the default `FRONTEND_URL` in Stripe Edge Functions from `http://localhost:3000` to `https://www.coreflowhr.com`.

### Files Changed:
1. `supabase/functions/create-checkout-session/index.ts` - Checkout session redirect URLs
2. `supabase/functions/create-portal-session/index.ts` - Portal session return URL

## Recommended: Set Environment Variable

While the code now defaults to production, it's better to set the `FRONTEND_URL` environment variable in Supabase:

### Steps to Set FRONTEND_URL in Supabase:

1. Go to **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Go to **Edge Functions** → **Secrets**
4. Add or update the `FRONTEND_URL` secret:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://www.coreflowhr.com`
5. Click **Save**

### Why Set It?
- Makes the configuration explicit and easier to manage
- Allows you to change it without code changes
- Supports different environments (staging, production) easily

## Testing

After deployment:
1. Go through Stripe checkout
2. Complete payment
3. Should redirect to: `https://www.coreflowhr.com/#/dashboard?payment=success&session_id=...`
4. Verify the redirect works correctly

## Note

The code change ensures that even if `FRONTEND_URL` isn't set, it will use the production domain instead of localhost. However, setting the environment variable is still recommended for better configuration management.

