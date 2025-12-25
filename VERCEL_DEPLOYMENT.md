# Vercel Deployment Guide

This guide will walk you through deploying your Coreflow application to Vercel.

## Prerequisites

- ✅ GitHub account (or GitLab/Bitbucket)
- ✅ Your code pushed to a Git repository
- ✅ Vercel account (free tier works great)

## Step 1: Push Your Code to GitHub

If you haven't already:

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., `coreflow`)
   - Don't initialize with README (you already have one)

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/coreflow.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** (you can use GitHub to sign in)
3. **Click "Add New Project"**
4. **Import your repository**:
   - Select your GitHub account
   - Find and select your `coreflow` repository
   - Click "Import"

5. **Configure Project Settings**:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `.` (leave as default)
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `dist` (should be auto-filled)
   - **Install Command**: `npm install` (should be auto-filled)

6. **Add Environment Variables**:
   Click "Add" for each of these:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Your Supabase anon key |
   | `GEMINI_API_KEY` | `your-gemini-key` | Your Google Gemini API key (optional) |

   **Where to find these:**
   - **Supabase URL & Key**: Supabase Dashboard → Settings → API
   - **Gemini Key**: https://aistudio.google.com/app/apikey

7. **Click "Deploy"**
   - Vercel will build and deploy your app
   - This takes 2-5 minutes

### Option B: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? No (first time)
   - Project name: `coreflow` (or your choice)
   - Directory: `.` (current directory)
   - Override settings? No

4. **Add Environment Variables**:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add GEMINI_API_KEY
   ```
   
   Enter the values when prompted.

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

## Step 3: Add Your Custom Domain

1. **Go to your project** in Vercel dashboard
2. **Click "Settings"** → **"Domains"**
3. **Add your domain**: `coreflowhr.com`
4. **Add www subdomain**: `www.coreflowhr.com`
5. **Follow DNS instructions**:
   - Vercel will show you DNS records to add
   - Go to your domain registrar (where you bought the domain)
   - Add the DNS records (usually A record or CNAME)
   - Wait for DNS propagation (5-60 minutes)

## Step 4: Verify Deployment

1. **Visit your Vercel URL**: `https://your-project.vercel.app`
2. **Test the app**:
   - ✅ Sign up/Login works
   - ✅ Dashboard loads
   - ✅ Can create jobs
   - ✅ Can add candidates
   - ✅ Emails send correctly

## Step 5: Update Supabase Settings

After your domain is live:

1. **Go to Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Update Site URL**: `https://coreflowhr.com`
3. **Add Redirect URLs**:
   - `https://coreflowhr.com/**`
   - `https://www.coreflowhr.com/**`
   - `https://your-project.vercel.app/**` (Vercel preview URL)

## Environment Variables Reference

### Required Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Optional Variables

```bash
GEMINI_API_KEY=your-gemini-api-key  # Only if using AI features
```

## Vercel Configuration

The `vercel.json` file is already configured with:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Framework: Vite
- ✅ SPA routing (all routes → index.html)
- ✅ Asset caching headers

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variable not found"**
- Check that all `VITE_*` variables are set in Vercel
- Redeploy after adding variables

### App Works but Routes 404

- This is normal for SPAs
- The `vercel.json` already handles this with rewrites
- If issues persist, check the rewrites configuration

### Domain Not Working

- **Check DNS**: Verify DNS records are added correctly
- **Wait for propagation**: DNS can take up to 48 hours (usually 5-60 min)
- **Check SSL**: Vercel automatically provisions SSL certificates

### Environment Variables Not Working

- **Redeploy**: After adding env vars, you must redeploy
- **Check prefix**: Only `VITE_*` variables are exposed to the frontend
- **Restart dev server**: If testing locally, restart after adding vars

## Continuous Deployment

Vercel automatically deploys when you push to:
- **Production**: `main` or `master` branch
- **Preview**: Any other branch or pull request

Each deployment gets a unique URL for testing.

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Add custom domain
3. ✅ Update Supabase Auth URLs
4. ✅ Test all functionality
5. ✅ Monitor deployments in Vercel dashboard

Your app is now live! 🚀

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html#vercel

