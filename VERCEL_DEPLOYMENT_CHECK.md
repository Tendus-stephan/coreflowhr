# Vercel Deployment Troubleshooting Guide

## Problem: Changes not showing on deployed site

Since all changes are committed and pushed to GitHub, but not appearing on `www.coreflowhr.com`, follow these steps:

## Step 1: Verify Latest Deployment in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click on your project (`coreflow` or similar)
3. Check the **Deployments** tab
4. Look for the latest deployment and verify:
   - **Commit**: Should match `7e1245d` (Add browser cache clearing guide)
   - **Status**: Should be "Ready" (green checkmark)
   - **Branch**: Should be `main`
   - **Build Time**: Should be recent (within last few minutes)

## Step 2: Check Build Logs

1. Click on the latest deployment
2. Check the **Build Logs** tab
3. Look for any errors or warnings
4. Verify the build completed successfully

Common issues to check:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Framework: `Vite`

## Step 3: Force Redeploy

If the deployment shows an older commit or failed:

### Option A: Redeploy from Vercel Dashboard
1. Go to the Deployments tab
2. Click the "..." menu (three dots) on the latest deployment
3. Select **"Redeploy"**
4. Wait for the deployment to complete

### Option B: Trigger Deployment via Git
```bash
# Create an empty commit to trigger deployment
git commit --allow-empty -m "Trigger Vercel redeployment"
git push
```

## Step 4: Verify Build Output

Check what's actually being built:

1. In Vercel dashboard, go to the deployment
2. Click on the deployment details
3. Check the **Build Logs** to see:
   - Files being copied
   - Assets being processed
   - Any errors or warnings

## Step 5: Clear Vercel Build Cache (if needed)

If deployments are still using old builds:

1. Go to Project Settings → General
2. Look for "Build & Development Settings"
3. Check if there's a cache that needs clearing
4. You may need to:
   - Delete `.next` or `dist` from cache
   - Or redeploy from a specific commit

## Step 6: Verify Environment Variables

1. Go to Project Settings → Environment Variables
2. Verify all required variables are set
3. Make sure they're set for **Production** environment

## Step 7: Check Domain Configuration

1. Go to Project Settings → Domains
2. Verify `www.coreflowhr.com` is correctly configured
3. Check DNS settings if domain isn't resolving

## Step 8: Manual Verification

After redeploying, verify the changes:

1. **Logo**: Should see image at `/assets/images/coreflow-logo.png`
   - Direct URL: `https://www.coreflowhr.com/assets/images/coreflow-logo.png`

2. **Terms of Service**: 
   - Should have navbar with "Back to Home" link
   - Active TOC items should be gray/black (not blue)
   - No "Back to Home" link at bottom
   - Payment section should have styled logos

3. **Privacy Policy**:
   - Should match Terms of Service styling
   - Should have navbar and sidebar

## Step 9: Check Browser Console (if still not working)

1. Open the deployed site
2. Press F12 to open DevTools
3. Check the Console tab for errors
4. Check the Network tab:
   - Look for failed requests (red)
   - Verify assets are loading (status 200)
   - Check if files are returning 404

## Common Issues and Solutions

### Issue: Deployment shows old commit
**Solution**: Redeploy from Vercel dashboard or trigger with empty commit

### Issue: Build succeeds but changes don't appear
**Solution**: 
- Check if there's a CDN cache
- Hard refresh browser (Ctrl+Shift+R)
- Check if vercel.json rewrites are interfering

### Issue: Assets returning 404
**Solution**: 
- Verify `public` folder files are in `dist` after build
- Check vercel.json configuration
- Ensure static assets are served before rewrites

### Issue: Build fails
**Solution**:
- Check build logs for specific errors
- Verify all dependencies are in package.json
- Check Node.js version compatibility

## Current Git Status

✅ All changes are committed
✅ All changes are pushed to `origin/main`
✅ Latest commit: `7e1245d` (Add browser cache clearing guide)

## Next Steps

1. **First**: Check Vercel dashboard for latest deployment status
2. **Second**: If deployment is old, redeploy from dashboard
3. **Third**: Check build logs for any errors
4. **Fourth**: Verify the deployment commit matches your latest commit

If none of these work, there may be a Vercel configuration issue that needs to be addressed through Vercel support.

