# Mailtrap Configuration Guide

This guide explains how to configure a new Mailtrap account for your Coreflow application.

## What is Mailtrap?

Mailtrap is used to send emails from your application (workflow emails, interview confirmations, offer letters, etc.). The email sending functionality is handled by a Supabase Edge Function.

## Configuration Steps

### Step 1: Get Your Mailtrap API Token

1. **Sign up/Login to Mailtrap**
   - Go to https://mailtrap.io
   - Sign up for a new account or log in to your existing account

2. **Navigate to Email Sending**
   - In your Mailtrap dashboard, go to **Email Sending** → **Domains** (or **Sending Domains**)
   - If you don't have a domain set up, you can use Mailtrap's testing domain for development

3. **Get Your API Token**
   - Go to **Email Sending** → **API Tokens** (or **Settings** → **API Tokens**)
   - Click **"Add Token"** or **"Create Token"**
   - Give it a name (e.g., "Coreflow Production")
   - Copy the generated token (you'll only see it once!)
   - The token looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Configure Supabase Edge Function Secrets

The Mailtrap configuration is stored as **secrets** in your Supabase project. You need to update these secrets:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Navigate to **Settings** (⚙️ gear icon) → **Edge Functions** → **Secrets**
4. Update or add the following secrets:

   - **`MAILTRAP_API_TOKEN`**
     - Value: Your Mailtrap API token from Step 1
     - Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   
   - **`FROM_EMAIL`** (Optional - defaults to 'no-reply@example.com')
     - Value: The email address that will appear as the sender
     - Example: `noreply@yourdomain.com` or `hello@yourdomain.com`
     - **Note:** This must be a verified domain in Mailtrap if using a custom domain
   
   - **`FROM_NAME`** (Optional - defaults to 'Coreflow')
     - Value: The display name for the sender
     - Example: `Coreflow HR` or `Your Company Name`
   
   - **`MAILTRAP_FORCE_TO`** (Optional - for testing only)
     - Value: If set, all emails will be redirected to this address
     - Example: `your-test-email@example.com`
     - **Note:** Leave this empty or unset for production

#### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Set Mailtrap API token
supabase secrets set MAILTRAP_API_TOKEN=your_mailtrap_token_here

# Set sender email (optional)
supabase secrets set FROM_EMAIL=noreply@yourdomain.com

# Set sender name (optional)
supabase secrets set FROM_NAME="Coreflow HR"

# Set force-to email for testing (optional - leave empty for production)
supabase secrets set MAILTRAP_FORCE_TO=test@example.com
```

### Step 3: Verify Configuration

1. **Test Email Sending**
   - In your Coreflow app, try sending a test email (e.g., from the Email Workflows test feature)
   - Check your Mailtrap inbox to see if the email was received

2. **Check Edge Function Logs**
   - In Supabase Dashboard → **Edge Functions** → **send-email**
   - Check the logs for any errors
   - Common errors:
     - `MAILTRAP_API_TOKEN is not set` → Secret not configured
     - `403 Forbidden` → Invalid API token or domain limit reached
     - `401 Unauthorized` → API token is incorrect

## Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAILTRAP_API_TOKEN` | ✅ Yes | None | Your Mailtrap API token |
| `FROM_EMAIL` | ❌ No | `no-reply@example.com` | Sender email address |
| `FROM_NAME` | ❌ No | `Coreflow` | Sender display name |
| `MAILTRAP_FORCE_TO` | ❌ No | None | Force all emails to this address (testing only) |

## Important Notes

1. **Domain Verification**: If you're using a custom domain for `FROM_EMAIL`, you must verify it in Mailtrap first
   - Go to Mailtrap → **Email Sending** → **Domains**
   - Add your domain and follow the verification steps (DNS records)

2. **API Limits**: Check your Mailtrap plan limits
   - Free tier has limited sending capacity
   - If you hit limits, you'll see `403` errors with "Sending usage of this domain has reached its limit"

3. **Testing**: Use `MAILTRAP_FORCE_TO` during development to redirect all emails to your test inbox

4. **Production**: Remove or unset `MAILTRAP_FORCE_TO` in production so emails go to actual recipients

## Troubleshooting

### Emails Not Sending

1. **Check Supabase Secrets**
   - Verify `MAILTRAP_API_TOKEN` is set correctly
   - Check for typos in the token

2. **Check Mailtrap Dashboard**
   - Verify your API token is active
   - Check if you've hit sending limits
   - Verify domain is verified (if using custom domain)

3. **Check Edge Function Logs**
   - Supabase Dashboard → **Edge Functions** → **send-email** → **Logs**
   - Look for error messages

### "403 Forbidden" Error

- Your Mailtrap account has reached its sending limit
- Upgrade your Mailtrap plan or wait for the limit to reset
- Check Mailtrap dashboard → **Email Sending** → **Usage**

### "401 Unauthorized" Error

- Your `MAILTRAP_API_TOKEN` is incorrect or expired
- Generate a new token in Mailtrap and update the secret

## Where the Configuration is Used

The Mailtrap configuration is used in:
- **File**: `supabase/functions/send-email/index.ts`
- **Purpose**: Sends all emails from the application:
  - Workflow emails (automated stage-based emails)
  - Interview confirmations/reschedules
  - Offer letters
  - Custom candidate emails
  - Test emails

## Next Steps

After configuring Mailtrap:
1. ✅ Set `MAILTRAP_API_TOKEN` in Supabase secrets
2. ✅ (Optional) Set `FROM_EMAIL` and `FROM_NAME`
3. ✅ Test email sending from your app
4. ✅ Verify emails are received in Mailtrap
5. ✅ Remove `MAILTRAP_FORCE_TO` for production use

---

**Need Help?**
- Mailtrap Documentation: https://mailtrap.io/docs/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions




