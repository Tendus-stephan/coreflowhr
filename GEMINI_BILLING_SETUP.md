# How to Pay for Google Gemini API

## Quick Answer

**Google Gemini API uses a "pay-as-you-go" model:**
1. You get a **free tier** (generous limits)
2. **BUT:** You need to set up billing (even for free tier)
3. **$10 prepayment required** (one-time, refundable) to activate account
4. Once you exceed free tier, you're automatically charged
5. Payment is via **Google Cloud Platform (GCP) billing**

**Important:** The free tier exists, but Google requires billing setup with a $10 prepayment to activate it. This is a security/verification measure, not a charge.

## 📋 Step-by-Step Setup

### Step 1: Get Your API Key (You Already Have This)

You already have your Gemini API key from:
- https://aistudio.google.com/app/apikey

This key is set in your `.env.local` as `VITE_API_KEY`.

### Step 2: Set Up Billing Account

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with the same Google account you used for the API key

2. **Create/Select a Project:**
   - If you don't have a project, create one
   - Or select an existing project

3. **Enable Billing:**
   - Go to **Billing** → **Link a billing account**
   - If you don't have a billing account:
     - Click **Create Billing Account**
     - Enter your payment information (credit card)
     - **You'll be asked for a $10 prepayment** (one-time, refundable)
     - This prepayment:
       - ✅ Is refundable if you close your account
       - ✅ Is credited to your account
       - ✅ Required even to activate free tier
       - ✅ Not charged unless you exceed free tier limits
     - Complete the setup

4. **Enable Gemini API:**
   - Go to **APIs & Services** → **Library**
   - Search for "Generative Language API" or "Gemini API"
   - Click **Enable**

### Step 3: Set Up Billing Budget (Recommended)

To avoid unexpected charges:

1. **Go to Billing → Budgets & alerts**
2. **Create a budget:**
   - Set a monthly spending limit (e.g., $50)
   - Add email alerts at 50%, 90%, 100% of budget
   - This will notify you before you spend too much

### Step 4: Monitor Usage

**Check your usage:**
- Go to **Google Cloud Console** → **APIs & Services** → **Dashboard**
- Look for "Generative Language API" usage
- See real-time usage and costs

**Or via API:**
- Go to **Billing** → **Reports**
- Filter by "Generative Language API"

---

## 💰 Pricing & Free Tier

### Free Tier (What You Get for Free)

**Gemini 2.0 Flash:**
- **15 requests per minute (RPM)** - Free
- **1 million tokens per day** - Free
- **After that:** Pay-as-you-go pricing

**For your use case** (recruitment emails):
- ~500 input tokens + ~300 output tokens per email
- **Free tier covers ~1,400 emails per day** (1M tokens ÷ 800 tokens/email)
- That's **~42,000 emails per month FREE!**

### Paid Pricing (After Free Tier)

**Gemini 2.0 Flash:**
- **Input:** $0.075 per 1 million tokens
- **Output:** $0.30 per 1 million tokens

**Example Costs:**
- 1,000 emails = ~$0.15 (if you exceed free tier)
- 10,000 emails = ~$1.50
- 100,000 emails = ~$15.00

**Most users won't exceed the free tier** unless you have very high volume!

---

## 💳 Payment Methods

Google Cloud accepts:
- ✅ Credit cards (Visa, Mastercard, American Express)
- ✅ Debit cards
- ✅ Bank accounts (in some regions)
- ✅ Wire transfers (for high-volume accounts)

---

## 📊 How Billing Works

1. **Usage accumulates** throughout the month
2. **At end of month**, you're charged for:
   - Any usage above the free tier
   - Applied to your linked payment method
3. **Invoice generated** monthly
4. **Auto-charge** to your payment method

---

## 🎯 Cost Control Tips

### 1. Set Up Budget Alerts
- Get notified at 50%, 90%, 100% of your budget
- Prevents surprise charges

### 2. Monitor Usage Regularly
- Check your usage dashboard weekly
- Spot any unusual spikes early

### 3. Optimize Usage
- Cache email templates (you already do this)
- Only generate when needed
- Batch requests when possible

### 4. Use Free Tier Wisely
- Your free tier (1M tokens/day) is very generous
- Most small-to-medium SaaS apps won't exceed it
- Only pay if you have very high volume

---

## 🔍 Check Your Current Usage

**Right Now (No Billing Needed):**
- You're using the free tier
- No payment required until you exceed limits
- Check your usage at: https://console.cloud.google.com/apis/dashboard

**When You Need Billing:**
- Only when you exceed 1M tokens/day
- Or need more than 15 requests/minute
- Google will notify you when approaching limits

---

## ❓ Common Questions

### Do I need to set up billing to use the free tier?
**Yes!** Google requires billing setup (including $10 prepayment) even to activate the free tier. This is a verification measure.

### What is the $10 prepayment?
- **One-time only** - You pay it once
- **Refundable** - You can get it back if you close your account
- **Required** - Even to use the free tier
- **Not a charge** - It's a verification deposit
- **Credited to your account** - You can use it for future charges

### Do I need to set up billing now?
**For production use: Yes!** You need billing to activate the free tier. Only skip billing if:
- You're just testing (but you'll hit quota errors)
- You want to use an alternative AI provider instead

### What happens if I exceed free tier without billing?
- API calls will start failing
- You'll get rate limit errors
- Need to set up billing to continue

### Can I set spending limits?
**Yes!** Set up a budget in Google Cloud Console:
- Monthly spending limit
- Email alerts
- Automatic cut-off (optional)

### How do I see my current usage?
1. Go to: https://console.cloud.google.com/
2. Navigate to **APIs & Services** → **Dashboard**
3. Find "Generative Language API"
4. View usage statistics

### What's the minimum payment?
**There's no minimum!** You only pay for what you use (after free tier).

---

## 🚀 Quick Setup Checklist

- [ ] Have API key (✅ You already have this)
- [ ] Sign in to Google Cloud Console
- [ ] Create/select a project
- [ ] Link billing account (when ready)
- [ ] Enable Generative Language API
- [ ] Set up budget alerts (recommended)
- [ ] Monitor usage regularly

---

## 📝 Current Status

**Your Current Setup:**
- ✅ API key configured (`VITE_API_KEY`)
- ✅ Using Gemini 2.0 Flash
- ⚠️ Billing not yet set up (causing quota errors)
- ❌ Free tier not fully active (hitting limits)

**What You Need:**
- Set up billing with $10 prepayment to activate free tier
- This will enable the full free tier limits
- Very affordable if you exceed limits
- Refundable if you close account

---

## 💡 Recommendation

**For Now:**
1. Keep using the free tier
2. Monitor your usage
3. Set up billing when you're close to limits

**When to Set Up Billing:**
- When you're doing ~1,000+ emails/day consistently
- When you want to avoid any service interruptions
- When you're ready to scale your SaaS

**The free tier is very generous** - most users won't need billing for a while!

---

**Need help setting up billing?** Let me know and I can guide you through it step-by-step!

