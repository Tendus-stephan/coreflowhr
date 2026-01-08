# Site Completeness Checklist

This checklist helps you verify everything is configured for your production site (www.coreflowhr.com).

## ✅ Critical Items (Must Have)

### 1. Database Migrations ⚠️
- [ ] **Run onboarding migration** - `supabase/migrations/add_onboarding_tracking.sql`
  - This adds `onboarding_completed` column to `profiles` table
  - **Status**: You saw the error earlier, so this needs to be run
  - **Action**: Go to Supabase SQL Editor → Run the migration

- [ ] **Verify all other migrations are run**
  - Check Supabase → Table Editor → Verify all tables exist
  - Especially check: `profiles`, `user_settings`, `email_logs`, `email_workflows`, `offers`, `candidates`, `jobs`

### 2. Environment Variables for Production (Vercel) ⚠️

#### Already Configured (Local):
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY` (test mode)
- ✅ `VITE_STRIPE_PRICE_ID_*` (test mode price IDs)
- ✅ `VITE_API_KEY` (Gemini)

#### Need to Add to Vercel Production:
- [ ] `VITE_SUPABASE_URL` - Should be same as local
- [ ] `VITE_SUPABASE_ANON_KEY` - Should be same as local
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - **PRODUCTION** key (`pk_live_...`)
- [ ] `VITE_STRIPE_PRICE_ID_BASIC_MONTHLY` - **PRODUCTION** price ID
- [ ] `VITE_STRIPE_PRICE_ID_BASIC_YEARLY` - **PRODUCTION** price ID
- [ ] `VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY` - **PRODUCTION** price ID
- [ ] `VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY` - **PRODUCTION** price ID
- [ ] `VITE_API_KEY` - Gemini API key (optional, but recommended)

### 3. Supabase Edge Function Secrets ⚠️

Check: Supabase Dashboard → Settings → Edge Functions → Secrets

- [ ] `STRIPE_SECRET_KEY` - **PRODUCTION** key (`sk_live_...`) for production
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook signing secret
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- [ ] `RESEND_API_KEY` - For email sending (if using Resend)
- [ ] `FROM_EMAIL` - Your sender email (e.g., `noreply@coreflowhr.com`)
- [ ] `FROM_NAME` - Your sender name (e.g., `CoreflowHR`)
- [ ] `FRONTEND_URL` - Set to `https://www.coreflowhr.com`
- [ ] `LOGO_URL` - URL to your logo in Supabase Storage (if using)

### 4. Supabase Edge Functions Deployment ⚠️

Verify these functions are deployed:
- [ ] `create-checkout-session` - For Stripe checkout
- [ ] `create-portal-session` - For Stripe customer portal
- [ ] `stripe-webhook` - For Stripe webhook events
- [ ] `send-email` - For sending emails
- [ ] `connect-google` - For Google OAuth (if using)
- [ ] `connect-google-callback` - For Google OAuth callback
- [ ] `connect-teams-callback` - For Teams OAuth callback (if using)
- [ ] `create-meeting` - For creating Google Meet meetings (if using)

**Check**: Supabase Dashboard → Edge Functions → Should see all functions listed

### 5. Stripe Configuration ⚠️

#### Test Mode (Development):
- ✅ Products created
- ✅ Prices created
- ✅ Price IDs in `.env.local`

#### Production Mode (Live Site):
- [ ] **Switch to Production mode** in Stripe Dashboard
- [ ] Create same products in Production mode
- [ ] Create same prices in Production mode
- [ ] Copy Production Price IDs
- [ ] Copy Production Publishable Key (`pk_live_...`)
- [ ] Copy Production Secret Key (`sk_live_...`)
- [ ] Add Production keys to Vercel environment variables
- [ ] Update Supabase Edge Function secret `STRIPE_SECRET_KEY` with production key

#### Stripe Webhook:
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Signing secret copied and added to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

### 6. Email Configuration ⚠️

- [ ] **Supabase Auth Email** - Configure SMTP in Supabase Auth settings
  - [ ] SMTP host configured (e.g., Resend SMTP)
  - [ ] SMTP credentials set
  - [ ] Test email sending works

- [ ] **Application Emails** (via Edge Functions)
  - [ ] Email service configured (Resend/SendGrid/AWS SES)
  - [ ] API key added to Supabase Edge Function secrets
  - [ ] Sender email verified
  - [ ] Test email sending works

### 7. Storage Buckets (Supabase Storage) ⚠️

Check: Supabase Dashboard → Storage

- [ ] `avatars` bucket created (for user avatars)
- [ ] `email-assets` bucket created (for email logos/images)
- [ ] Public access policies configured
- [ ] Upload policies configured

## 📋 Recommended Items (Should Have)

### 8. Domain & SSL
- [ ] Domain connected to Vercel (`www.coreflowhr.com`)
- [ ] SSL certificate active (auto-handled by Vercel)
- [ ] Redirect configured for `coreflowhr.com` → `www.coreflowhr.com`

### 9. Email Domain Authentication
- [ ] SPF record configured (for email deliverability)
- [ ] DKIM record configured (for email deliverability)
- [ ] DMARC record configured (for email deliverability)
- [ ] **Status**: Without this, emails may go to spam

### 10. Error Tracking (Optional but Recommended)
- [ ] Error tracking service configured (e.g., Sentry)
- [ ] Error logging integrated
- [ ] Alerts configured for critical errors

### 11. Analytics (Optional but Recommended)
- [ ] Analytics service configured (e.g., Google Analytics, Plausible)
- [ ] Tracking code added
- [ ] Events configured (if needed)

## 🔍 Verification Steps

### Test These Flows:

1. **User Signup/Login**
   - [ ] User can sign up
   - [ ] Verification email is sent and received
   - [ ] User can log in after verification

2. **Onboarding**
   - [ ] New users see onboarding page
   - [ ] Onboarding can be completed
   - [ ] Users are redirected to dashboard after completion

3. **Subscription Flow**
   - [ ] Pricing page loads
   - [ ] "Subscribe" button works
   - [ ] Redirects to Stripe Checkout
   - [ ] Payment completes
   - [ ] User redirected back to dashboard
   - [ ] Subscription status updated in database

4. **Core Features**
   - [ ] Can create a job
   - [ ] Can add a candidate
   - [ ] Can send emails
   - [ ] Can schedule interviews
   - [ ] Can create offers

5. **Email Functionality**
   - [ ] Verification emails send and are received
   - [ ] Application emails (workflows) send and are received
   - [ ] Emails don't go to spam (check domain auth)

## 📝 Quick Actions Needed

Based on what we've discussed, here's what you need to do **RIGHT NOW**:

1. **Run the onboarding migration** in Supabase SQL Editor
   - File: `supabase/migrations/add_onboarding_tracking.sql`

2. **Add Stripe Production keys to Vercel**
   - Create production products/prices in Stripe
   - Add production price IDs to Vercel environment variables
   - See `PRODUCTION_STRIPE_SETUP.md` for details

3. **Update Supabase Edge Function secrets**
   - Update `STRIPE_SECRET_KEY` with production key
   - Verify `FRONTEND_URL` is set to `https://www.coreflowhr.com`

4. **Test the subscription flow**
   - Try subscribing with a test card in production
   - Verify webhook receives events
   - Check database updates correctly

## 🎯 Current Status Summary

✅ **What's Working:**
- Local development environment configured
- Core features implemented
- Stripe integration code complete
- Onboarding UI complete

⚠️ **What Needs Configuration:**
- Database migration for onboarding (critical)
- Production Stripe keys/price IDs (critical)
- Supabase Edge Function secrets for production (critical)
- Email domain authentication (important for deliverability)

## Next Steps

1. Run the onboarding migration (5 minutes)
2. Set up production Stripe keys (15 minutes)
3. Update Supabase secrets (10 minutes)
4. Test everything (30 minutes)
5. Launch! 🚀

---

**Total Estimated Time to Complete: ~1 hour**



