# Migration Steps - OpenAI API Key to Edge Function

## ⚠️ IMPORTANT: Do Steps in Order!

Follow these steps **in order** to avoid breaking your application.

---

## Step 1: Set Up Edge Function FIRST ⚠️

**Do this BEFORE removing anything from Vercel!**

### 1.1 Add API Key to Supabase Secrets

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **"Add a new secret"**
5. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-proj-...`)
6. Click **"Save"**

### 1.2 Deploy the Edge Function

**Option A: Using Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project (get project ref from Supabase Dashboard → Settings → General)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy parse-cv
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Click **"Create a new function"**
3. Name it: `parse-cv`
4. Copy code from `supabase/functions/parse-cv/index.ts`
5. Paste and click **"Deploy"**

### 1.3 Test the Edge Function

1. Go to: http://localhost:3002/cv-parser-test
2. Upload a CV
3. Click "Run Test"
4. **Check browser console** - should see success, no errors
5. **Verify** parsed data appears correctly

✅ **If this works, proceed to Step 2**

❌ **If it doesn't work, fix Edge Function before proceeding!**

---

## Step 2: Remove from Frontend (AFTER Edge Function Works)

**Only do this AFTER Edge Function is working!**

### 2.1 Remove from Local Development

1. Open `.env.local`
2. Remove or comment out: `VITE_OPENAI_API_KEY=...`
3. Save file
4. **Restart dev server** (`npm run dev`)
5. Test again to make sure it still works

### 2.2 Remove from Vercel (Production)

1. Go to: https://vercel.com/dashboard
2. Select your **CoreFlow** project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_OPENAI_API_KEY`
5. Click the **trash icon** to delete it
6. **Redeploy** your site (or it will update on next deployment)

---

## Why This Order?

**Before (Old Way - Insecure):**
```
Frontend (has VITE_OPENAI_API_KEY) → OpenAI API
```

**After (New Way - Secure):**
```
Frontend (no key needed) → Edge Function (has OPENAI_API_KEY) → OpenAI API
```

**The flow:**
1. Frontend calls `supabase.functions.invoke('parse-cv')`
2. Edge Function (running on Supabase) uses the API key from secrets
3. Edge Function calls OpenAI
4. Results come back to frontend

**Frontend never sees the API key!** ✅

---

## Troubleshooting

### Error: "OpenAI API key not configured"
- ✅ Check that `OPENAI_API_KEY` is in Supabase Edge Function secrets
- ✅ Check that Edge Function is deployed
- ✅ Check Edge Function logs in Supabase Dashboard

### Error: "Failed to parse CV"
- ✅ Check Supabase Edge Function logs
- ✅ Verify API key is correct in Supabase secrets
- ✅ Test Edge Function directly in Supabase Dashboard

### Still using old code?
- ✅ Make sure you've deployed latest code to Vercel
- ✅ Hard refresh browser (Ctrl+Shift+R)
- ✅ Check that `services/openaiService.ts` calls `supabase.functions.invoke`

---

## Summary Checklist

- [ ] Added `OPENAI_API_KEY` to Supabase Edge Function secrets
- [ ] Deployed `parse-cv` Edge Function
- [ ] Tested Edge Function works (CV parsing test tool)
- [ ] Removed `VITE_OPENAI_API_KEY` from `.env.local`
- [ ] Removed `VITE_OPENAI_API_KEY` from Vercel
- [ ] Tested in production (after Vercel redeploy)
- [ ] ✅ Done! API key is now secure!

---

## What Changed?

**Old Code (Insecure):**
```typescript
// Frontend - API key exposed! ❌
const openai = new OpenAI({ apiKey: VITE_OPENAI_API_KEY });
```

**New Code (Secure):**
```typescript
// Frontend - No API key! ✅
const { data } = await supabase.functions.invoke('parse-cv', {
  body: { cvText, jobSkills }
});
```

The API key is now safely stored on the server (Supabase Edge Function), never in the browser!




