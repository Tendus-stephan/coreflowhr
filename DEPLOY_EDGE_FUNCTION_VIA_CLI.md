# Deploy Edge Function via Supabase CLI

## Problem
The Edge Function code changes aren't being deployed. Supabase Edge Functions must be deployed via CLI, not just saved as files.

## Solution: Deploy Using Supabase CLI

### Step 1: Install Supabase CLI (if not installed)

**On Windows (PowerShell):**
```powershell
# Using Scoop (recommended)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

**Verify installation:**
```powershell
supabase --version
```

### Step 2: Login to Supabase

```powershell
supabase login
```

This will open a browser to authenticate.

### Step 3: Link Your Project

```powershell
supabase link --project-ref lpjyxpxkagctaibmqcoi
```

Replace `lpjyxpxkagctaibmqcoi` with your actual project reference if different.

### Step 4: Deploy the send-email Function

```powershell
cd supabase/functions/send-email
supabase functions deploy send-email
```

Or from the project root:
```powershell
supabase functions deploy send-email --project-ref lpjyxpxkagctaibmqcoi
```

### Step 5: Verify Deployment

1. Go to Supabase Dashboard → Edge Functions → `send-email`
2. Check the code - it should now show the logo section
3. Check logs - should show new deployment timestamp
4. Send a test email - logo and HTML should work correctly

## Alternative: Manual Upload (if CLI doesn't work)

If CLI deployment doesn't work, you can try:

1. Go to Supabase Dashboard → Edge Functions → `send-email`
2. Look for "Edit" or "Upload" option
3. Upload the `supabase/functions/send-email/index.ts` file
4. Or use the online editor if available

## Why This Happens

Supabase Edge Functions are deployed separately from your code files. Just editing the file doesn't update the deployed version - you must explicitly deploy it via CLI.

## Quick Deploy Command

From your project root directory:

```powershell
supabase functions deploy send-email --project-ref lpjyxpxkagctaibmqcoi
```

Make sure you're logged in first:
```powershell
supabase login
```

## Troubleshooting

**"Command not found: supabase"**
- Install Supabase CLI first (see Step 1)

**"Not authenticated"**
- Run `supabase login` first

**"Project not linked"**
- Run `supabase link --project-ref [your-project-ref]` first

**Deployment fails**
- Check that you're in the correct directory
- Verify the `supabase/functions/send-email/index.ts` file exists
- Check Supabase Dashboard for error messages



