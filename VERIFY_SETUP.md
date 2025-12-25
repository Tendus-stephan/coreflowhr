# ✅ Stripe Integration Verification Checklist

Let's verify everything is set up correctly!

## 📋 Setup Checklist

### Frontend Setup ✅
- [x] Stripe packages installed
- [x] `.env` file has `VITE_STRIPE_PUBLISHABLE_KEY`
- [x] `.env` file has all 4 Price IDs:
  - [x] `VITE_STRIPE_PRICE_ID_BASIC_MONTHLY`
  - [x] `VITE_STRIPE_PRICE_ID_BASIC_YEARLY`
  - [x] `VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY`
  - [x] `VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY`
- [x] Subscribe page created
- [x] Routes configured

### Supabase Edge Functions ✅
- [ ] **create-checkout-session** deployed
- [ ] **create-portal-session** deployed
- [ ] **stripe-webhook** deployed

### Supabase Secrets ✅
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set

### Stripe Webhook ✅
- [ ] Webhook endpoint created in Stripe
- [ ] Webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- [ ] 3 events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Signing secret copied and added to Supabase secrets

## 🧪 Test Your Integration

### Step 1: Verify Functions Are Deployed

1. Go to **Supabase Dashboard** → **Edge Functions**
2. You should see 3 functions listed:
   - `create-checkout-session`
   - `create-portal-session`
   - `stripe-webhook`
3. All should show status "Active" or have green checkmarks

### Step 2: Verify Secrets Are Set

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Verify all 5 secrets are listed:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Verify Webhook in Stripe

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. You should see your endpoint listed
3. Click on it to see:
   - Status: "Enabled" (should be green)
   - Events: Should show the 3 events selected
   - URL: Should match your Supabase function URL

### Step 4: Test the Full Payment Flow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Sign up for a test account:**
   - Go to your app
   - Sign up with a test email
   - Verify email (check your inbox or Supabase Auth logs)

3. **Login:**
   - Should redirect to `/subscribe` page

4. **Test subscription:**
   - Select a plan (Basic or Professional)
   - Select Monthly or Yearly
   - Click "Subscribe"
   - Should redirect to Stripe Checkout

5. **Use Stripe test card:**
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)
   - Click "Pay" or "Subscribe"

6. **Verify success:**
   - Should redirect to `/dashboard`
   - Check Supabase database:
     - Go to **Table Editor** → `user_settings`
     - Find your user
     - Should see:
       - `subscription_status` = `active`
       - `subscription_stripe_id` = `sub_...`
       - `billing_plan_name` = Your selected plan

7. **Verify webhook received:**
   - Go to **Stripe Dashboard** → **Developers** → **Webhooks**
   - Click on your endpoint
   - Check "Recent events" tab
   - Should see `checkout.session.completed` event
   - Status should be "Succeeded" (green)

## 🐛 Troubleshooting

### Payment succeeds but subscription not activated?

1. Check webhook logs:
   - Stripe Dashboard → Webhooks → Your endpoint → Recent events
   - Click on the event → Check "Response" tab
   - Look for error messages

2. Check Supabase logs:
   - Supabase Dashboard → Logs → Edge Functions
   - Look for errors in `stripe-webhook` function

3. Verify webhook secret:
   - Make sure `STRIPE_WEBHOOK_SECRET` in Supabase matches the signing secret in Stripe

### Can't create checkout session?

1. Check Edge Function logs:
   - Supabase Dashboard → Logs → Edge Functions
   - Look for `create-checkout-session` errors

2. Verify secrets:
   - Check that `STRIPE_SECRET_KEY` is correct
   - Verify all secrets are set

3. Check browser console:
   - Open DevTools (F12)
   - Look for error messages

### Functions not found?

- Make sure you've deployed all 3 functions
- Check function names match exactly:
  - `create-checkout-session`
  - `create-portal-session`
  - `stripe-webhook`

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Subscribe page loads and shows pricing plans
2. ✅ Clicking "Subscribe" redirects to Stripe Checkout
3. ✅ Payment completes successfully
4. ✅ Redirects back to dashboard
5. ✅ Database shows `subscription_status: 'active'`
6. ✅ Webhook shows successful events in Stripe

## 🎉 You're Done!

If all tests pass, your Stripe integration is fully functional!

---

**Need help?** Check the error logs or let me know what's not working!

