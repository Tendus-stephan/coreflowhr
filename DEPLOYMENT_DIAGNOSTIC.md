# Deployment Diagnostic Checklist

## ✅ Verified Local State

- ✅ All files are committed (commit `c65db4c`)
- ✅ All files are pushed to GitHub
- ✅ Build works locally (`npm run build` succeeds)
- ✅ Logo image exists in `dist/assets/images/coreflow-logo.png`
- ✅ Changes are in source files (TermsOfService.tsx, PrivacyPolicy.tsx, LandingPage.tsx)

## ⚠️ Possible Issues to Check

### 1. Vercel Branch Configuration

**Check if Vercel is deploying from the correct branch:**

1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Verify **Production Branch** is set to `main`
3. Check if there's a different branch configured

### 2. Vercel Build Cache

**Clear build cache and redeploy:**

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. In the deployment details, look for "Redeploy" button
4. Click the dropdown arrow next to "Redeploy"
5. Select **"Redeploy with cleared cache"** or **"Clear Build Cache"**
6. This will force a fresh build

### 3. Check Actual Deployed Files

**Verify what's actually deployed:**

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check the **Build Logs** tab
4. Look for:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Any errors or warnings
   - File count and sizes

### 4. Check Deployment Commit Hash

**Verify Vercel is building the right commit:**

1. In the deployment details, check the **Commit** field
2. It should match: `c65db4c` or at least be recent
3. If it shows an old commit, Vercel might not be detecting pushes

### 5. Manual Deployment Trigger

**Force a new deployment:**

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click **"Create Deployment"** button (top right)
3. Select branch: `main`
4. Click **"Deploy"**
5. This will create a fresh deployment regardless of git hooks

### 6. Check Vercel Project Settings

**Verify build configuration:**

1. Go to Vercel Dashboard → Your Project → Settings → General
2. Check **Build & Development Settings**:
   - Framework Preset: `Vite` (should be auto-detected)
   - Build Command: `npm run build` (should be auto-detected)
   - Output Directory: `dist` (should be auto-detected)
   - Install Command: (should be auto-detected)

### 7. Environment Variables

**Check if build is failing due to missing env vars:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all required variables are set for **Production**
3. Check build logs for any errors about missing variables

### 8. Check Deployed URL Directly

**Test if files are accessible:**

Try accessing these URLs directly:
- `https://www.coreflowhr.com/assets/images/coreflow-logo.png`
- `https://www.coreflowhr.com/terms`
- `https://www.coreflowhr.com/privacy`

If these return 404, the files aren't deployed.
If they work but show old content, it's a caching issue.

### 9. CDN Cache

**Vercel uses a CDN that might be caching:**

1. Try accessing the site with a query parameter: `https://www.coreflowhr.com/?v=2`
2. Try in incognito mode
3. The CDN cache should clear automatically after deployment, but might take a few minutes

### 10. Check GitHub Webhook

**Verify Vercel is receiving GitHub webhooks:**

1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Check if there's a webhook configuration
3. You should see GitHub integration status
4. If webhooks aren't working, deployments won't trigger automatically

## 🔍 What to Look For in Build Logs

When checking build logs, look for:

```
✓ Building...
✓ Installing dependencies
✓ Running build command
✓ Build completed
✓ Uploading build outputs
```

If you see errors, they'll tell you what's wrong.

## 🚨 Red Flags

- Build logs show an old commit hash
- Build logs show "cached" or "skipped" for build step
- Build completes but file sizes are suspiciously small
- Deployment shows "Ready" but files aren't accessible
- Multiple deployments showing the same old commit

## 💡 Recommended Actions

**Try in this order:**

1. **Clear build cache and redeploy** (most likely to fix it)
2. **Create manual deployment** (forces fresh build)
3. **Verify branch configuration** (ensures right code is built)
4. **Check build logs carefully** (find the root cause)

