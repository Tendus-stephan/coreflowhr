# Resend Email Setup Guide

This guide will help you set up Resend for sending emails in your Coreflow application.

## Prerequisites

- A Resend account (sign up at https://resend.com)
- Your Resend API key: `re_H4fCRet1_8LSyLgTY7KDixgVDDp7rZKDK`
- Access to your Supabase project dashboard

## Step 1: Verify Your Domain in Resend

### Quick Testing (No Domain Verification Needed)

For immediate testing, you can use Resend's default domain:
- **`FROM_EMAIL`**: `onboarding@resend.dev`
- No DNS setup required
- Works immediately

### Using Your Own Domain (Recommended for Production)

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Resend will show you DNS records to add:
   - **SPF record** (TXT)
   - **DKIM record** (TXT) 
   - **DMARC record** (TXT) - optional but recommended
5. Add these records to your domain's DNS settings
6. Wait for verification (usually 5-15 minutes)
7. Once verified, you can use any email address from your domain:
   - `noreply@yourdomain.com` (recommended for testing)
   - `test@yourdomain.com`
   - `hello@yourdomain.com`
   - etc.

## Step 2: Add Environment Variables to Supabase

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the following environment variables:

### Required Variables:

- **`RESEND_API_KEY`**: `re_H4fCRet1_8LSyLgTY7KDixgVDDp7rZKDK`
- **`FROM_EMAIL`**: 
  - For quick testing: `onboarding@resend.dev`
  - For domain testing: `noreply@yourdomain.com` or `test@yourdomain.com` (after domain verification)
- **`FROM_NAME`**: The display name for emails (e.g., `Coreflow`)

### Optional Variables:

- **`RESEND_FORCE_TO`**: (Optional) Force all emails to go to a specific address for testing (e.g., `test@example.com`)

## Step 3: Deploy the Updated Edge Function

The `send-email` function has been updated to use Resend. If you need to redeploy:

```bash
# If using Supabase CLI
supabase functions deploy send-email

# Or deploy from Supabase dashboard:
# Go to Edge Functions → send-email → Deploy
```

## Step 4: Test Email Sending

1. Log into your application
2. Try sending a test email to a candidate
3. Check the Resend dashboard at https://resend.com/emails to see sent emails

## Troubleshooting

### Emails not sending?

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly in Supabase secrets
2. **Check Domain**: Make sure your domain is verified in Resend (or use `onboarding@resend.dev` for testing)
3. **Check Logs**: View Edge Function logs in Supabase dashboard for error messages
4. **Rate Limits**: Resend has rate limits based on your plan - check your usage at https://resend.com/emails

### Common Errors:

- **401 Unauthorized**: API key is incorrect or missing
- **422 Validation Error**: Email address format is invalid
- **429 Too Many Requests**: Rate limit exceeded

## Resend API Limits

- **Free Plan**: 3,000 emails/month, 100 emails/day
- **Pro Plan**: 50,000 emails/month, higher rate limits
- Check your plan at: https://resend.com/pricing

## Migration from Mailtrap

If you were previously using Mailtrap:
- The function has been updated to use Resend
- Remove old `MAILTRAP_API_TOKEN` environment variable
- Add new `RESEND_API_KEY` environment variable
- Update `FROM_EMAIL` to use a Resend-verified domain

## Next Steps

1. Verify your domain in Resend
2. Add the environment variables to Supabase
3. Test sending an email
4. Monitor email delivery in Resend dashboard

