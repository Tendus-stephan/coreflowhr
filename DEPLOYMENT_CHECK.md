# Deployment Check Guide

## If Vercel Didn't Auto-Deploy After Git Push

### Option 1: Check Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your Coreflow project
3. Check the "Deployments" tab
4. Look for any failed deployments or errors

### Option 2: Manual Redeploy in Vercel
1. Go to Vercel Dashboard → Your Project
2. Click on the latest deployment
3. Click "Redeploy" button
4. Select "Use Existing Build Cache" (optional) or "Rebuild"
5. Click "Redeploy"

### Option 3: Trigger via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 4: Check Vercel Webhook Connection
1. Go to Vercel Dashboard → Your Project → Settings
2. Click "Git" tab
3. Verify GitHub integration is connected
4. Check if webhook is properly configured

### Option 5: Make a Small Change to Trigger
If nothing else works, make a small change (like adding a comment) and push again to trigger the webhook.

## Verify Deployment

After deployment:
1. Visit https://www.coreflowhr.com
2. Check if changes are live
3. Test the signup flow to verify fixes

## Important: Run SQL Migration

**Don't forget** - The SQL migration needs to be run manually in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run: `supabase/migrations/add_check_user_exists_function.sql`
3. Verify it succeeds (should say "Success")

Without this SQL function, the signup fix won't work!

