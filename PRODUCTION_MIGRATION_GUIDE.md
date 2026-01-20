# Production Migration Guide

## ✅ Important: Will Users Still Access the Site?

**YES!** Switching to production Stripe mode will NOT affect user access to the site. Here's why:

### What Changes:
- **Payment processing** - Switches from test mode to live payments
- **Stripe keys** - Test keys → Production keys
- **Price IDs** - Test price IDs → Production price IDs

### What DOESN'T Change:
- ✅ **User authentication** - Supabase auth works the same
- ✅ **User accounts** - All existing accounts remain active
- ✅ **Site access** - Everyone can still log in and use the site
- ✅ **Database** - All your data stays intact
- ✅ **Features** - All functionality works the same

### The Only Impact:
- Users with **test subscriptions** (created with test cards) won't be able to renew/upgrade
- They'll need to subscribe again with real payment methods
- **You (the admin)** can still access everything normally

---

## Production Migration Checklist

### Phase 1: Stripe Production Setup (30 minutes)

#### 1.1 Create Production Products & Prices in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch to Production mode** (toggle in top right - it will show "Test mode" → click to switch)
3. Go to **Products** → **Add product**

Create these 4 products:

**Basic Plan - Monthly**
- Name: Basic Plan (Monthly)
- Price: $39.00 USD
- Billing: Monthly, Recurring
- **Copy the Price ID** (starts with `price_...`)

**Basic Plan - Yearly**
- Name: Basic Plan (Yearly)
- Price: $33.00 USD per month (or $396/year)
- Billing: Yearly, Recurring
- **Copy the Price ID**

**Professional Plan - Monthly**
- Name: Professional Plan (Monthly)
- Price: $99.00 USD
- Billing: Monthly, Recurring
- **Copy the Price ID**

**Professional Plan - Yearly**
- Name: Professional Plan (Yearly)
- Price: $83.00 USD per month (or $996/year)
- Billing: Yearly, Recurring
- **Copy the Price ID**

#### 1.2 Get Production Keys

1. Stay in **Production mode** in Stripe Dashboard
2. Go to **Developers** → **API keys**
3. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal test key" to see it

---

### Phase 2: Update Vercel Environment Variables (15 minutes)

#### 2.1 Add Production Keys to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **coreflow** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables for **Production** environment:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (your production publishable key)
VITE_STRIPE_PRICE_ID_BASIC_MONTHLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_BASIC_YEARLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_... (production price ID)
VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_... (production price ID)
```

5. For each variable:
   - Click **Add New**
   - Enter variable name (exactly as shown above)
   - Enter value (no quotes needed)
   - Select **Production** environment
   - Click **Save**

6. **Important**: Also add for **Preview** and **Development** if you want to test before production

#### 2.2 Redeploy

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Or push a small commit to trigger auto-deploy

---

### Phase 3: Update Supabase Edge Functions (15 minutes)

#### 3.1 Update Stripe Secret Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Find `STRIPE_SECRET_KEY`
5. Update with your **Production** secret key (`sk_live_...`)
6. Click **Save**

**Note**: This will affect all Stripe operations. Test mode will no longer work after this change.

#### 3.2 Update Production Webhook (if not already done)

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Make sure you're in **Production mode**
3. Create a new webhook or update existing:
   - **Endpoint URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
   - **Events to listen to**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Copy the **Signing secret** (starts with `whsec_...`)
5. In Supabase → Edge Functions → Secrets
6. Update `STRIPE_WEBHOOK_SECRET` with the production signing secret

#### 3.3 Verify Other Secrets

Make sure these are set correctly:

- ✅ `STRIPE_SECRET_KEY` - Production key (`sk_live_...`)
- ✅ `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- ✅ `FRONTEND_URL` - Should be `https://www.coreflowhr.com`
- ✅ `RESEND_API_KEY` - Your Resend API key (if using)
- ✅ `FROM_EMAIL` - Your sender email
- ✅ `FROM_NAME` - Your sender name

---

### Phase 4: Testing Before Full Launch (30 minutes)

#### 4.1 Test in Preview Environment First

1. Create a **Preview deployment** with production keys
2. Test the full subscription flow:
   - Go to pricing page
   - Click "Subscribe" on Basic Plan
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete checkout
   - Verify redirect back to site
   - Check database for subscription update

#### 4.2 Test Real Payment (Small Amount)

1. Subscribe with a **real card** (use a small plan or test with $1)
2. Verify:
   - ✅ Payment processed
   - ✅ Subscription created in Stripe
   - ✅ Database updated
   - ✅ User can access premium features
   - ✅ Webhook received

#### 4.3 Verify User Access

1. **Existing users** can still log in? ✅
2. **Test subscriptions** still work? (They won't renew, but access remains)
3. **New users** can sign up? ✅
4. **All features** work normally? ✅

---

### Phase 5: What Happens to Existing Test Subscriptions?

#### Option A: Let Them Expire Naturally (Recommended)

- Users with test subscriptions keep access until their billing period ends
- When they try to renew/upgrade, they'll need to subscribe again with real payment
- **No disruption** - they can continue using the site

#### Option B: Migrate Manually (Advanced)

If you want to migrate test subscriptions to production:

1. Export test mode customers from Stripe Dashboard
2. Create matching subscriptions in production mode
3. Update database `user_settings.subscription_stripe_id`
4. **Risk**: Can cause confusion, not recommended

#### Option C: Grandfather Existing Users (Recommended for Launch)

1. Keep test mode webhook running for a short transition period
2. Allow existing test subscriptions to continue working
3. All new subscriptions use production mode
4. Gradually migrate or let expire

---

## Important Notes

### ⚠️ Test Mode vs Production Mode

- **Test Mode**: Uses test cards (e.g., `4242 4242 4242 4242`), no real charges
- **Production Mode**: Uses real cards, real charges, real money
- **Price IDs are different**: Test `price_xxx` ≠ Production `price_yyy`
- **Keys are different**: `pk_test_xxx` ≠ `pk_live_xxx`

### 🔒 Security

- **Never commit** production keys to Git
- **Never share** production secret keys
- Use **environment variables** only
- Rotate keys if exposed

### 📊 Monitoring

After switching to production:

1. Monitor Stripe Dashboard → **Payments** → Check for failed payments
2. Monitor Stripe Dashboard → **Webhooks** → Check for failed deliveries
3. Monitor your application logs for errors
4. Set up Stripe email alerts for failed payments

### 🔄 Rollback Plan

If something goes wrong:

1. **Revert Vercel environment variables** to test keys
2. **Revert Supabase secrets** to test keys
3. **Redeploy** to restore test mode
4. Fix issues and try again

---

## Quick Reference: Environment Variables

### Vercel Production Environment Variables

```env
# Supabase (same for test and production)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe Production Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_BASIC_YEARLY=price_...
VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_...

# Optional
VITE_API_KEY=your_gemini_api_key
```

### Supabase Edge Function Secrets

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@coreflowhr.com
FROM_NAME=CoreFlowHR
FRONTEND_URL=https://www.coreflowhr.com
```

---

## Summary

### ✅ You Can Safely Switch to Production

- All users keep site access
- All accounts remain active
- Only payment processing changes
- Test subscriptions expire naturally (no forced disruption)

### 📋 Steps to Complete

1. ✅ Create products/prices in Stripe Production mode
2. ✅ Add production keys to Vercel
3. ✅ Update Supabase Edge Function secrets
4. ✅ Set up production webhook
5. ✅ Test thoroughly
6. ✅ Monitor after launch

### ⏱️ Estimated Time: 1-2 hours

**Ready to launch?** Follow the checklist above step by step!
