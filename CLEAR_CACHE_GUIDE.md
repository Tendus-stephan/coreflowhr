# Clear Browser Cache to See Latest Changes

If you're not seeing changes on www.coreflowhr.com after deployment, it's likely a browser cache issue.

## Quick Fix: Hard Refresh

### Windows/Linux:
- **Chrome/Edge**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` or `Ctrl + F5`

### Mac:
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

## Full Cache Clear:

1. **Open Developer Tools**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Right-click the refresh button** (while DevTools is open)
3. **Select "Empty Cache and Hard Reload"**

## Or Clear Cache Manually:

### Chrome/Edge:
1. Press `Ctrl+Shift+Delete` (Windows) / `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Choose "All time"
4. Click "Clear data"
5. Refresh the page

### Firefox:
1. Press `Ctrl+Shift+Delete`
2. Select "Cache"
3. Choose "Everything"
4. Click "Clear Now"
5. Refresh the page

## Verify Deployment:

1. Visit: https://www.coreflowhr.com
2. Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
3. Check if logo appears in:
   - Navbar (Landing page)
   - Sidebar (when logged in)
   - Browser tab (favicon)

## If Still Not Working:

1. **Check Vercel Deployment Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check the build logs for any errors

2. **Verify Files Are Deployed**:
   - Visit: https://www.coreflowhr.com/assets/images/coreflow-logo.png
   - Visit: https://www.coreflowhr.com/assets/images/coreflow-favicon-logo.png
   - If these URLs work, files are deployed correctly (cache issue)
   - If these URLs 404, files aren't being deployed (different issue)

3. **Try Incognito/Private Window**:
   - Open a new incognito/private window
   - Visit www.coreflowhr.com
   - This bypasses cache completely

