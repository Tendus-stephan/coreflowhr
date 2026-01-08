# Deploy OpenAI CV Parser Edge Function

## Security ✅

The API key is now **secure** - it's stored server-side in Supabase Edge Function secrets, never exposed to the browser!

---

## Step 1: Add OpenAI API Key to Supabase Secrets

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **"Add a new secret"**
5. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-proj-...`)
6. Click **"Save"**

---

## Step 2: Deploy the Edge Function

### Option A: Using Supabase CLI (Recommended)

1. Make sure Supabase CLI is installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find project ref in Supabase Dashboard → Settings → General)

4. Deploy the function:
   ```bash
   supabase functions deploy parse-cv
   ```

### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions**
4. Click **"Create a new function"**
5. Name it: `parse-cv`
6. Copy the code from `supabase/functions/parse-cv/index.ts`
7. Paste it into the editor
8. Click **"Deploy"**

---

## Step 3: Update Environment Variables (Remove from Frontend)

**Remove** `VITE_OPENAI_API_KEY` from:
- `.env.local` (can remove it, not needed anymore)
- Vercel environment variables (can remove it)

The API key is now stored securely in Supabase Edge Function secrets only!

---

## Step 4: Test It!

1. Make sure the Edge Function is deployed
2. Go to: http://localhost:3002/cv-parser-test
3. Upload a CV
4. Click "Run Test"
5. Should work without any API key errors!

---

## How It Works Now

**Before (Insecure ❌):**
```
Browser → OpenAI API (API key exposed)
```

**After (Secure ✅):**
```
Browser → Supabase Edge Function → OpenAI API (API key hidden)
```

The API key is **never** sent to the browser. It's stored securely in Supabase Edge Function secrets.

---

## Troubleshooting

**"Failed to parse CV" error:**
- Check that Edge Function is deployed
- Check that `OPENAI_API_KEY` is set in Supabase secrets
- Check Supabase Edge Function logs for errors

**Check Edge Function logs:**
- Go to Supabase Dashboard → Edge Functions → parse-cv → Logs

**Test Edge Function directly:**
- Go to Supabase Dashboard → Edge Functions → parse-cv → Test
- Send test payload:
  ```json
  {
    "cvText": "Test CV text...",
    "jobSkills": ["JavaScript", "React"]
  }
  ```

---

## Done! 🎉

Your OpenAI API key is now secure and the CV parser should work correctly!




