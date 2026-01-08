# How to Deploy Edge Function - Complete Guide

## Problem
Edge Function code changes are only in your local files. Supabase Edge Functions must be **deployed** to take effect. The deployed version is still using old code.

## Solution Options

### Option 1: Deploy via Supabase CLI (Recommended)

#### Step 1: Install Supabase CLI

**On Windows:**

**Method A: Using Scoop (Easiest)**
```powershell
# Install Scoop first (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Method B: Using Winget**
```powershell
winget install Supabase.CLI
```

**Method C: Download Binary**
1. Go to https://github.com/supabase/cli/releases
2. Download the Windows binary
3. Add to PATH

#### Step 2: Login to Supabase

```powershell
supabase login
```

This will open a browser for authentication.

#### Step 3: Link Your Project

```powershell
supabase link --project-ref lpjyxpxkagctaibmqcoi
```

(Replace `lpjyxpxkagctaibmqcoi` with your project reference if different)

#### Step 4: Deploy the Function

```powershell
supabase functions deploy send-email
```

This will upload the updated code from `supabase/functions/send-email/index.ts` to Supabase.

#### Step 5: Verify

1. Go to Supabase Dashboard → Edge Functions → `send-email`
2. The code should now show the logo section
3. Send a test email - logo and HTML links should work!

---

### Option 2: Deploy via Supabase Dashboard (If CLI doesn't work)

Some Supabase projects allow editing Edge Functions directly in the dashboard:

1. Go to **Supabase Dashboard** → **Edge Functions** → `send-email`
2. Look for **"Edit"** or **"Code"** tab/button
3. Copy the entire contents of `supabase/functions/send-email/index.ts`
4. Paste into the editor
5. Click **"Save"** or **"Deploy"**

**Note:** Not all Supabase projects have this feature. If you don't see an edit option, you must use CLI (Option 1).

---

### Option 3: Manual File Upload (Alternative)

If the dashboard has a file upload option:

1. Go to **Supabase Dashboard** → **Edge Functions** → `send-email`
2. Look for **"Upload"** or **"Import"** button
3. Upload the `supabase/functions/send-email/index.ts` file
4. Save/Deploy

---

## Quick Command Summary

If Supabase CLI is installed and you're logged in:

```powershell
# From your project root directory
supabase functions deploy send-email
```

That's it! This one command will deploy the updated code.

## Troubleshooting

**"Command not found: supabase"**
- CLI is not installed or not in PATH
- Install using one of the methods above
- Restart terminal after installation

**"Not authenticated"**
- Run `supabase login` first

**"Project not linked"**
- Run `supabase link --project-ref [your-project-ref]` first

**"Deployment failed"**
- Check that `supabase/functions/send-email/index.ts` exists
- Verify you're logged in: `supabase login`
- Check Supabase Dashboard for error messages

**CLI Installation Issues**
- Try using Winget: `winget install Supabase.CLI`
- Or download binary from GitHub releases
- Or use Supabase Dashboard editor if available

## What Gets Deployed

When you run `supabase functions deploy send-email`, it:
- Uploads `supabase/functions/send-email/index.ts` to Supabase
- Replaces the deployed function code with your local code
- Keeps all environment variables/secrets intact
- Usually takes 1-2 minutes to complete

## After Deployment

Once deployed:
- ✅ Logo section will appear in emails
- ✅ HTML links will render correctly
- ✅ All code changes will be live

Send a test email to verify everything works!



