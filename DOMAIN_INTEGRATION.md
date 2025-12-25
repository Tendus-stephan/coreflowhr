# Domain Integration Guide

This guide will help you integrate your domain (`coreflowhr.com`) into your Coreflow project.

## Step 1: Update Supabase Edge Function CORS Settings

Your domain needs to be added to the allowed origins for CORS in your Supabase Edge Functions.

### Option A: Using Environment Variable (Recommended)

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Add or update the `ALLOWED_ORIGINS` secret:

   ```
   ALLOWED_ORIGINS=https://coreflowhr.com,https://www.coreflowhr.com,http://localhost:5173,http://localhost:3000
   ```

   **Note:** Include both with and without `www`, plus your localhost URLs for development.

### Option B: Update Code Directly

The code has been updated to include your domain in the default origins. If you prefer to manage it via code, the defaults are set in `supabase/functions/send-email/index.ts`.

## Step 2: Deploy Your Frontend to Your Domain

You have several options for hosting your frontend:

### Option 1: Vercel (Recommended - Easiest)

1. **Push your code to GitHub** (if not already)
2. **Go to Vercel**: https://vercel.com
3. **Import your repository**
4. **Configure the project**:
   - Framework Preset: Vite
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Add Environment Variables**:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `GEMINI_API_KEY` = Your Gemini API key (if using AI features)
6. **Add your domain**:
   - Go to Project Settings → Domains
   - Add `coreflowhr.com` and `www.coreflowhr.com`
   - Follow DNS instructions to point your domain to Vercel

### Option 2: Netlify

1. **Push your code to GitHub**
2. **Go to Netlify**: https://netlify.com
3. **Import from Git**
4. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Add environment variables** (same as Vercel)
6. **Add custom domain** in Site Settings → Domain Management

### Option 3: Self-Hosted

If you're hosting on your own server:

1. **Build your app**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server (nginx, Apache, etc.)

3. **Configure your web server** to serve the built files

## Step 3: Update Email Redirect URLs

The application uses `window.location.origin` for redirects, which will automatically use your domain when deployed. No code changes needed!

However, verify these are working:
- Email verification links
- Password reset links
- OAuth callbacks (if using Google/Microsoft Teams)

## Step 4: Configure Supabase Auth URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Update **Site URL** to: `https://coreflowhr.com`
3. Add **Redirect URLs**:
   - `https://coreflowhr.com/**`
   - `https://www.coreflowhr.com/**`
   - `http://localhost:5173/**` (for development)
   - `http://localhost:3000/**` (for development)

## Step 5: Update Resend Email Configuration

Your email is already configured with `team@coreflowhr.com`. Make sure:

1. **Domain is verified in Resend**: https://resend.com/domains
2. **DNS records are added** (SPF, DKIM, DMARC)
3. **Supabase secrets are set**:
   - `RESEND_API_KEY` = Your Resend API key
   - `FROM_EMAIL` = `team@coreflowhr.com`
   - `FROM_NAME` = `Coreflow` (or your preferred name)

## Step 6: Test Everything

After deployment, test:

1. ✅ **Visit your domain**: `https://coreflowhr.com`
2. ✅ **Sign up/Login**: Verify authentication works
3. ✅ **Send test email**: Check that emails are sent from `team@coreflowhr.com`
4. ✅ **Check email links**: Verify redirects work correctly
5. ✅ **Test CORS**: Make sure API calls work from your domain

## Environment Variables Summary

### Frontend (Vercel/Netlify/etc.)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key (optional)
```

### Supabase Edge Functions (Secrets)
```
RESEND_API_KEY=re_H4fCRet1_8LSyLgTY7KDixgVDDp7rZKDK
FROM_EMAIL=team@coreflowhr.com
FROM_NAME=Coreflow
ALLOWED_ORIGINS=https://coreflowhr.com,https://www.coreflowhr.com,http://localhost:5173,http://localhost:3000
```

## Troubleshooting

### CORS Errors
- **Check `ALLOWED_ORIGINS`**: Make sure your domain is in the list
- **Check protocol**: Use `https://` not `http://` for production
- **Check trailing slashes**: Don't include trailing slashes in origins

### Email Not Sending
- **Verify domain in Resend**: Check domain verification status
- **Check DNS records**: SPF, DKIM must be added
- **Check Supabase secrets**: Verify `RESEND_API_KEY` and `FROM_EMAIL` are set

### Authentication Issues
- **Check Supabase Auth URLs**: Verify Site URL and Redirect URLs
- **Check OAuth callbacks**: If using Google/Teams, update callback URLs

## Next Steps

1. ✅ Deploy frontend to your domain
2. ✅ Update Supabase Auth URLs
3. ✅ Set `ALLOWED_ORIGINS` in Supabase secrets
4. ✅ Test all functionality
5. ✅ Monitor email delivery in Resend dashboard

Your domain integration is complete! 🎉

