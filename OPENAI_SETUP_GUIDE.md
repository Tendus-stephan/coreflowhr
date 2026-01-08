# OpenAI Setup Guide - Quick Start

## ✅ You're Ready!

With **$5 in your OpenAI account**, you can parse approximately **333-1000 CVs** - plenty for testing!

**Cost per CV:** ~$0.005-0.015 (very cheap!)

---

## Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Give it a name (e.g., "CoreFlow CV Parser")
4. **Copy the key immediately** (you won't see it again!)
   - It looks like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Add API Key to Local Development (.env.local)

1. Open `.env.local` file in your project root (create it if it doesn't exist)
2. Add this line:
   ```env
   VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```
3. **Replace** `sk-proj-your-actual-key-here` with your actual API key
4. Save the file
5. **Restart your dev server** (stop and run `npm run dev` again)

---

## Step 3: Add API Key to Production (Vercel)

1. Go to: https://vercel.com/dashboard
2. Select your **CoreFlow** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key:** `VITE_OPENAI_API_KEY`
   - **Value:** Your API key (starts with `sk-proj-...`)
   - **Environments:** Select all (Production, Preview, Development)
6. Click **"Save"**
7. **Redeploy** your site (or it will update on next deployment)

---

## Step 4: Test It!

1. **Restart your dev server** if it's running
2. Go to: http://localhost:3002/cv-parser-test
3. Upload a CV
4. Click "Run Test"
5. You should see:
   - ✅ Parsing using OpenAI (check console logs)
   - ✅ Clean, accurate parsed data
   - ✅ No corrupted entries
   - ✅ Valid JSON (no parsing errors)

---

## How It Works Now

**Priority Order:**
1. **OpenAI (GPT-4o Mini)** - Primary parser (more reliable, cheap)
2. **Gemini** - Fallback (if OpenAI fails or key not set)

**The system will:**
- Try OpenAI first
- If OpenAI fails → automatically falls back to Gemini
- Log which service is being used in console

---

## Cost Breakdown

**GPT-4o Mini Pricing:**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens

**Per CV Estimate:**
- Input tokens: ~500-1000 (CV text + prompt)
- Output tokens: ~500-800 (parsed JSON)
- **Cost: ~$0.005-0.015 per CV**

**Your $5 Budget:**
- Worst case (long CVs): ~333 CVs
- Best case (short CVs): ~1,000 CVs
- **Average: ~500-700 CVs**

**Plenty for testing!** 🎉

---

## Monitoring Usage

1. Go to: https://platform.openai.com/usage
2. Check your usage and spending
3. Set up **usage limits** if needed:
   - Go to: https://platform.openai.com/account/limits
   - Set hard limit or soft limit (will alert you)

---

## Troubleshooting

**"OpenAI API key not configured" error:**
- Check that `VITE_OPENAI_API_KEY` is in `.env.local`
- Make sure you restarted the dev server after adding it
- Check that the key starts with `sk-`

**Still using Gemini:**
- Check browser console for error messages
- Verify API key is correct
- Check OpenAI account has credits

**Rate limits:**
- GPT-4o Mini has generous rate limits
- If you hit limits, it will fallback to Gemini automatically

---

## Next Steps

1. ✅ Get API key from OpenAI
2. ✅ Add to `.env.local`
3. ✅ Add to Vercel (for production)
4. ✅ Test with CV parser test tool
5. ✅ Monitor usage at platform.openai.com/usage

**You're all set!** The system will now use OpenAI for more reliable CV parsing. 🚀




