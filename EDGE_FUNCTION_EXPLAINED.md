# What is a Supabase Edge Function?

## Simple Explanation

An **Edge Function** is like a **mini-server** that runs in the cloud (on Supabase's servers).

**Think of it like this:**
- **Frontend (Browser)**: Your React app that users see
- **Edge Function (Server)**: A secure server that can safely use API keys
- **OpenAI API**: The service that parses CVs

## Why We Need It

**Problem:** 
- OpenAI API keys are **secret** and should **never** be in your frontend code
- If you put the API key in the browser, anyone can see it and steal it
- This is a security risk!

**Solution:**
- Put the API key in the Edge Function (server-side)
- Frontend calls the Edge Function
- Edge Function calls OpenAI with the secret key
- The key never goes to the browser ✅

## Visual Flow

**Before (Insecure ❌):**
```
Browser (has API key) → OpenAI API
         ↑
    Anyone can see the key!
```

**After (Secure ✅):**
```
Browser → Edge Function (has API key) → OpenAI API
         ↑                    ↑
    No key here!        Key is hidden here!
```

## What Happens Now

1. **User uploads CV** in your React app
2. **Frontend sends CV text** to Supabase Edge Function
3. **Edge Function** uses the secret API key to call OpenAI
4. **OpenAI** parses the CV and returns results
5. **Edge Function** sends results back to frontend
6. **Frontend** displays the parsed data

**The API key stays on the server - never in the browser!**

---

## Environment Variables - What to Remove

### ✅ Remove from:
- `.env.local` (local development)
- **Vercel Environment Variables** (production)

**Why?** The API key is now stored in **Supabase Edge Function secrets** instead.

### ✅ Keep in:
- **Supabase Edge Function Secrets** (this is where it should be!)

---

## Summary

- **Edge Function** = Secure server that holds your API key
- **Remove** `VITE_OPENAI_API_KEY` from `.env.local` and Vercel
- **Add** `OPENAI_API_KEY` to Supabase Edge Function secrets
- **Deploy** the Edge Function
- **Done!** API key is now secure 🎉




