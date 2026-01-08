# Setting Up Stripe Price IDs for Production Domain

## Overview
Your Stripe price IDs are configured in `.env.local` for local development, but for your production domain (www.coreflowhr.com), you need to set them in your deployment platform.

## Step 1: Get Your Production Stripe Price IDs

**Important**: Make sure you're using **Production** Stripe keys and price IDs (not test mode) for your live domain.

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) and **switch to Production mode** (toggle in the top right)
2. Create the same products/prices as you did for test mode:
   - Basic Plan (Monthly) - $39/month
   - Basic Plan (Yearly) - $33/month (billed yearly)
   - Professional Plan (Monthly) - $99/month
   - Professional Plan (Yearly) - $83/month (billed yearly)
3. Copy the **Production Price IDs** (they start with `price_...`)
4. Also copy your **Production Publishable Key** (starts with `pk_live_...`)

## Step 2: Add Environment Variables to Vercel

Since your site is deployed on Vercel (based on vercel.json), follow these steps:

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **coreflow** project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (your production publishable key)
VITE_STRIPE_PRICE_ID_BASIC_MONTHLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_BASIC_YEARLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_... (production price ID)
```

5. For each variable, select **Production** environment (and optionally Preview/Development if you want them there too)
6. Click **Save**
7. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on your latest deployment
   - Click **Redeploy**
   - Or make a small commit and push to trigger a new deployment

### Option B: Via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Link your project (if not already linked):
   ```bash
   vercel link
   ```

3. Add environment variables:
   ```bash
   vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
   vercel env add VITE_STRIPE_PRICE_ID_BASIC_MONTHLY production
   vercel env add VITE_STRIPE_PRICE_ID_BASIC_YEARLY production
   vercel env add VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY production
   vercel env add VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY production
   ```
   (It will prompt you to enter the value for each)

4. Redeploy:
   ```bash
   vercel --prod
   ```

## Step 3: Also Update Supabase Edge Functions Secrets

Your Stripe Edge Functions in Supabase also need the production Stripe secret key:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Update `STRIPE_SECRET_KEY` with your **Production Stripe Secret Key** (starts with `sk_live_...`)
   - **Important**: Keep your test key for development, but add/update the production key
5. Make sure `FRONTEND_URL` is set to `https://www.coreflowhr.com`

## Step 4: Verify It Works

1. After redeploying, visit https://www.coreflowhr.com
2. Open browser console (F12)
3. Look for the log: `[Stripe] Environment variables check:`
4. It should show `hasBasicMonthly: true`, `hasProfessionalMonthly: true`, etc.
5. Try clicking "Subscribe Now" on a pricing plan
6. You should be redirected to Stripe Checkout (not get an error)

## Important Notes

- **Test vs Production**: Use test keys/IDs for local development, production keys/IDs for your live domain
- **Price IDs are Different**: Test mode price IDs and production price IDs are different, even for the same products
- **Redeploy Required**: After adding environment variables in Vercel, you must redeploy for them to take effect
- **No Quotes**: Don't add quotes around the values when setting environment variables
- **Case Sensitive**: Variable names are case-sensitive (`VITE_STRIPE_PRICE_ID_BASIC_MONTHLY` not `vite_stripe_price_id_basic_monthly`)

## Troubleshooting

- **Still getting "Price ID not configured"?**
  - Check that you redeployed after adding the variables
  - Verify the variable names are exactly correct (including `VITE_` prefix)
  - Check browser console for the debug log to see what's loaded

- **Test mode checkout on production?**
  - Make sure you're using `pk_live_...` (not `pk_test_...`) in production
  - Update Supabase Edge Function secret `STRIPE_SECRET_KEY` to use `sk_live_...`

- **Environment variables not showing?**
  - Make sure you selected the correct environment (Production) when adding them
  - Redeploy after adding variables
  - Check Vercel deployment logs to see if variables are being read



