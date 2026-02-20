# Supabase Edge Functions for Stripe Integration

This directory contains Supabase Edge Functions for handling Stripe payments and subscriptions.

## Functions

### 1. `create-checkout-session`
Creates a Stripe Checkout session for new subscriptions.

**Endpoint:** `POST /functions/v1/create-checkout-session`

**Request Body:**
```json
{
  "priceId": "price_...",
  "planType": "basic" | "professional",
  "billingInterval": "monthly" | "yearly",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_..."
}
```

### 2. `create-portal-session`
Creates a Stripe Customer Portal session for managing subscriptions.

**Endpoint:** `POST /functions/v1/create-portal-session`

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### 3. `stripe-webhook`
Handles Stripe webhook events for subscription updates.

**Endpoint:** `POST /functions/v1/stripe-webhook`

This function handles:
- `checkout.session.completed` - Activates subscription after payment
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription

### 4. `get-billing-details`
Fetches subscription and payment method details from Stripe.

**Endpoint:** `POST /functions/v1/get-billing-details`

**Response:**
```json
{
  "subscription": {
    "id": "sub_...",
    "status": "active",
    "planName": "Professional Plan",
    "amount": 99.00,
    "currency": "USD",
    "interval": "month",
    "currentPeriodEnd": "2025-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "paymentMethod": {
    "type": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2026
  }
}
```

### 5. `get-invoices`
Fetches billing history/invoices from Stripe.

**Endpoint:** `POST /functions/v1/get-invoices`

### 6. `send-weekly-digest`
Creates in-app weekly digest notifications for users who have **Settings → Notifications → Weekly digest** enabled. Call this on a schedule (e.g. Monday 9am).

**Endpoint:** `POST /functions/v1/send-weekly-digest`  
**Auth:** Optional; use service role or a cron secret if you protect the endpoint.

**To schedule:** Use Supabase pg_cron (Database → Extensions → pg_cron) or an external cron (e.g. `0 9 * * 1` for Monday 9am) that invokes the function URL with your project anon or service key in the `Authorization` header.

**Response:**
```json
{
  "invoices": [
    {
      "id": "in_...",
      "date": "2025-01-01T00:00:00Z",
      "amount": "$99.00",
      "status": "Paid",
      "invoicePdf": "https://...",
      "hostedInvoiceUrl": "https://..."
    }
  ]
}
```

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

### 4. Set Environment Variables

Set these secrets in your Supabase project:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Or set them in the Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add each secret

### 5. Deploy Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
supabase functions deploy get-billing-details
supabase functions deploy get-invoices
```

### 6. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Set it as `STRIPE_WEBHOOK_SECRET` in Supabase secrets

### 7. Create Stripe Products and Prices

In Stripe Dashboard:

1. Create Products:
   - **Basic Plan** (Monthly): Create price $39/month
   - **Basic Plan** (Yearly): Create price $33/month (billed yearly)
   - **Professional Plan** (Monthly): Create price $99/month
   - **Professional Plan** (Yearly): Create price $83/month (billed yearly)

2. Copy the Price IDs and add them to your `.env` file:
   ```
   VITE_STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
   VITE_STRIPE_PRICE_ID_BASIC_YEARLY=price_...
   VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_...
   VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_...
   ```

## Testing Locally

To test functions locally, you can use the Supabase CLI:

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test a function
curl -X POST http://localhost:54321/functions/v1/create-checkout-session \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_...","planType":"basic","billingInterval":"monthly"}'
```

## Troubleshooting

- **Webhook not receiving events**: Check that the webhook URL is correct and accessible
- **Signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret
- **CORS errors**: The functions include CORS headers - ensure your frontend is calling them correctly
- **Subscription not updating**: Check Supabase logs in Dashboard → Logs → Edge Functions

