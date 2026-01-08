# Stripe Price IDs Setup Guide

## Problem
If you're getting the error **"Price ID not configured for this plan"** when clicking on pricing, it means the Stripe price IDs are not set in your environment variables.

## Solution

### Step 1: Create Products and Prices in Stripe Dashboard

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/test/products) (use Test mode for development)
2. Click **"Add product"**
3. Create the following products:

#### Basic Plan - Monthly
- **Name**: Basic Plan (Monthly)
- **Pricing model**: Standard pricing
- **Price**: $39.00 USD
- **Billing period**: Monthly
- **Recurring**: Yes
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

#### Basic Plan - Yearly
- **Name**: Basic Plan (Yearly)
- **Pricing model**: Standard pricing
- **Price**: $33.00 USD per month (or $396/year)
- **Billing period**: Yearly
- **Recurring**: Yes
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

#### Professional Plan - Monthly
- **Name**: Professional Plan (Monthly)
- **Pricing model**: Standard pricing
- **Price**: $99.00 USD
- **Billing period**: Monthly
- **Recurring**: Yes
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

#### Professional Plan - Yearly
- **Name**: Professional Plan (Yearly)
- **Pricing model**: Standard pricing
- **Price**: $83.00 USD per month (or $996/year)
- **Billing period**: Yearly
- **Recurring**: Yes
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

### Step 2: Add Price IDs to Environment Variables

1. Create or edit your `.env` file in the project root directory
2. Add the following variables with your actual Price IDs:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key

# Stripe Price IDs
VITE_STRIPE_PRICE_ID_BASIC_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_STRIPE_PRICE_ID_BASIC_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx
```

**Important**: Replace `price_xxxxxxxxxxxxxxxxxxxxx` with your actual Price IDs from Step 1.

### Step 3: Restart Your Development Server

After adding the environment variables:
1. Stop your development server (Ctrl+C)
2. Start it again: `npm run dev`
3. The new environment variables will be loaded

### Step 4: Verify It Works

1. Navigate to the pricing page
2. Click "Subscribe Now" on any plan
3. You should be redirected to Stripe Checkout (no error message)

## Notes

- **Test Mode**: Make sure you're using Stripe Test mode keys for development
- **Production**: When deploying to production, create production products in Stripe and update your production environment variables (e.g., in Vercel)
- **Price IDs Format**: Price IDs always start with `price_` followed by a long string of characters
- **Environment Variables**: Vite requires environment variables to start with `VITE_` to be exposed to the client-side code

## Troubleshooting

- **Still getting the error?**: Make sure you restarted the dev server after adding the env variables
- **Price ID not found in Stripe?**: Go to Stripe Dashboard → Products → Click on your product → Click on the price → The Price ID is displayed at the top
- **Variables not loading?**: Ensure your `.env` file is in the project root (same directory as `package.json`)



