# Add Environment Variables to Vercel (Production Site)

## The Issue
Your API key is set locally in `.env.local`, but the **production site** (www.coreflowhr.com) needs the environment variables set in **Vercel**.

## Quick Fix: Add VITE_API_KEY to Vercel

### Step 1: Go to Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Sign in to your account
3. Select your **coreflow** project

### Step 2: Add Environment Variable
1. Go to **Settings** → **Environment Variables**
2. Click **Add New** or **Add** button
3. Enter:
   - **Key:** `VITE_API_KEY`
   - **Value:** `AIzaSyB2GZ5M_LiuGNN0vnrQ3T5PAKssLkXIt1Y` (your Gemini API key)
   - **Environment:** Select **Production** (and optionally Preview/Development)
4. Click **Save**

### Step 3: Redeploy
After adding the variable, you need to redeploy:
1. Go to **Deployments** tab
2. Click the **three dots (⋯)** on your latest deployment
3. Click **Redeploy**
4. Or make a small commit and push to trigger a new deployment

### Step 4: Verify
1. Visit www.coreflowhr.com
2. Go to Settings → Email Templates
3. Click "Generate with AI"
4. It should work now!

---

## All Environment Variables You Should Have in Vercel

Make sure these are all set in Vercel → Settings → Environment Variables:

### Required for AI Features:
- ✅ `VITE_API_KEY` - Your Gemini API key (you need to add this)

### Already Should Have (from earlier setup):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (production)
- `VITE_STRIPE_PRICE_ID_BASIC_MONTHLY` - Stripe price ID
- `VITE_STRIPE_PRICE_ID_BASIC_YEARLY` - Stripe price ID
- `VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY` - Stripe price ID
- `VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY` - Stripe price ID

---

## Alternative: Via Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login
vercel login

# Add environment variable for production
vercel env add VITE_API_KEY production

# Enter the value when prompted: AIzaSyB2GZ5M_LiuGNN0vnrQ3T5PAKssLkXIt1Y

# Redeploy
vercel --prod
```

---

## Important Notes

- **Environment Variables in Vercel:** These are separate from your local `.env.local` file
- **Must Redeploy:** After adding/changing env vars in Vercel, you MUST redeploy for them to take effect
- **Production Only:** Make sure to select "Production" environment when adding the variable
- **Security:** Never commit API keys to git - always use environment variables

---

## Quick Checklist

- [ ] Go to Vercel Dashboard
- [ ] Select your project
- [ ] Settings → Environment Variables
- [ ] Add `VITE_API_KEY` with your Gemini API key
- [ ] Select "Production" environment
- [ ] Save
- [ ] Redeploy your project
- [ ] Test on www.coreflowhr.com

---

After you do this, "Generate with AI" should work on your production site! 🎉

