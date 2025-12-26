# Email Template Update - Branded Templates with Logo

## Overview
All email templates have been updated to include a professional branded wrapper with the CoreFlow logo.

## Changes Made

### 1. Branded Email Template Wrapper
- **File**: `supabase/functions/send-email/index.ts`
- **Function**: `createEmailTemplate()`
- **Features**:
  - Professional header with CoreFlow logo
  - Responsive design for all email clients
  - Styled content area with proper spacing
  - Footer with company branding and website link
  - Email-safe HTML (table-based layout for Outlook compatibility)

### 2. Automatic Template Wrapping
All emails sent through the system are now automatically wrapped in the branded template, including:
- Screening emails
- Interview invitations
- Reschedule notifications
- Rejection letters
- Offer letters
- Hired/onboarding emails
- Custom workflow emails

## Configuration

### Environment Variables (Optional)
You can customize the email template by setting these environment variables in Supabase:

- `LOGO_URL`: URL to your logo image (default: `https://coreflowhr.com/assets/images/coreflow-logo.png`)
- `FROM_NAME`: Company name (default: `CoreFlow`)
- `COMPANY_WEBSITE`: Your website URL (default: `https://coreflowhr.com`)

### Setting Environment Variables in Supabase
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Find the `send-email` function
3. Add environment variables:
   - `LOGO_URL` (optional)
   - `COMPANY_WEBSITE` (optional)

## Logo Requirements

The logo should be:
- **Format**: PNG (recommended) or JPG
- **Size**: Recommended 200px width (height auto)
- **Location**: Hosted at a publicly accessible URL
- **Current Location**: `https://coreflowhr.com/assets/images/coreflow-logo.png`

## Email Template Structure

```
┌─────────────────────────────────┐
│      [CoreFlow Logo]            │  ← Header
├─────────────────────────────────┤
│                                 │
│   [Your Email Content]          │  ← Content Area
│                                 │
├─────────────────────────────────┤
│   CoreFlow                      │  ← Footer
│   Modern Recruitment OS          │
│   Visit our website             │
└─────────────────────────────────┘
```

## Testing

To test the new email templates:

1. **Test via Workflow**:
   - Go to Settings → Email Workflows
   - Select a workflow
   - Click "Test Workflow"
   - Check your email inbox

2. **Test via Interview**:
   - Schedule an interview
   - The interview invitation will use the branded template

3. **Test via Offer**:
   - Create an offer
   - The offer email will use the branded template

## Deployment

After making changes to the `send-email` function:

1. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-email
   ```

   Or via Supabase Dashboard:
   - Go to Edge Functions → send-email
   - Click "Deploy" or "Redeploy"

2. **Verify Deployment**:
   - Check Edge Functions logs
   - Send a test email
   - Verify logo appears correctly

## Notes

- The template uses table-based HTML for maximum email client compatibility
- Logo is loaded from a public URL (must be accessible)
- All existing email templates will automatically use the new branded wrapper
- No changes needed to individual email template content

## Troubleshooting

### Logo Not Showing
- Verify the logo URL is publicly accessible
- Check that the URL is correct in environment variables
- Ensure the image format is supported (PNG/JPG)
- Check email client (some block images by default)

### Template Not Applied
- Verify the edge function is deployed
- Check Edge Functions logs for errors
- Ensure environment variables are set correctly

### Styling Issues
- Email clients have limited CSS support
- The template uses inline styles for compatibility
- Test in multiple email clients (Gmail, Outlook, Apple Mail)



