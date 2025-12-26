# Quick Fix: Force Fresh Vercel Deployment

## Immediate Steps (Do These Now)

### Step 1: Clear Build Cache and Redeploy

1. Go to: https://vercel.com/dashboard
2. Click on your project (`coreflow`)
3. Go to **Deployments** tab
4. Find the latest deployment (should show commit `c65db4c`)
5. Click the **"..."** menu (three dots) on that deployment
6. Look for **"Redeploy"** option
7. If there's a dropdown, select **"Redeploy with cleared cache"**
8. If not, just click **"Redeploy"**

### Step 2: Create Manual Deployment (If Step 1 Doesn't Work)

1. Still in the Deployments tab
2. Click the **"Create Deployment"** button (top right)
3. Select:
   - Branch: `main`
   - Framework Preset: `Vite` (should auto-detect)
4. Click **"Deploy"**
5. Wait for it to complete

### Step 3: Verify the Deployment

After deployment completes:

1. Check the deployment shows commit `c65db4c` or latest
2. Status should be "Ready" (green checkmark)
3. Click on the deployment to see build logs
4. Verify build completed successfully

### Step 4: Test the Site

1. Go to: https://www.coreflowhr.com
2. **Hard refresh**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check if logo appears (should be image, not text)
4. Go to `/terms` - should have gray/black TOC, navbar with "Back to Home"
5. Go to `/privacy` - should match Terms styling

## If Still Not Working

Check the build logs in Vercel:
1. Click on the deployment
2. Go to "Build Logs" tab
3. Scroll through and look for:
   - Errors (red text)
   - Warnings about missing files
   - File sizes or counts that seem wrong
   - Any indication the build failed

Take a screenshot of the build logs and share them if issues persist.

