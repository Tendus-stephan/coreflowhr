# Apify Upgrade Guide: Free vs Paid Plans

## Current Situation

You're hitting the **Free Plan limit**: **10 runs per day**

This is **NOT** a trial limit - it's the permanent free tier limit.

## Free Plan Limits

### What You Get (Free Forever)
- ✅ **$5 in platform credits** per month
- ✅ **~10 runs per day** (varies by actor)
- ✅ **Basic features**
- ❌ **Limited to 10 runs/day** (what you're experiencing)

### What Happens When Limit Reached
- ❌ All new runs are blocked
- ❌ Error: "Free users are limited to 10 runs"
- ✅ Resets after 24 hours (daily limit)
- ✅ Or resets monthly (if it's a monthly limit)

## Paid Plans

### Starter Plan: $29/month
**What You Get:**
- ✅ **$29 in platform credits** (almost 6x more than free)
- ✅ **No daily run limit** (or much higher limit)
- ✅ **More concurrent runs**
- ✅ **Chat support**
- ✅ **Priority processing**

**Cost Breakdown:**
- Each LinkedIn scrape = ~1 compute unit
- $29 credits = ~116 LinkedIn scrapes/month
- **Cost per scrape: ~$0.25** (after credits)

### Team Plan: $99/month
- ✅ **$99 in platform credits**
- ✅ **Even higher limits**
- ✅ **Team collaboration features**
- ✅ **Advanced support**

### Enterprise Plan: Custom
- ✅ **Custom credits**
- ✅ **Unlimited usage**
- ✅ **Dedicated support**
- ✅ **Custom SLA**

## Should You Upgrade?

### ✅ Upgrade If:
- You scrape **more than 10 jobs per day**
- You need **reliable, unlimited scraping**
- You're running a **production system**
- You want **priority support**

### ❌ Stay on Free If:
- You scrape **less than 10 jobs per day**
- You're just **testing/developing**
- You can **wait 24 hours** between batches
- You want to **minimize costs**

## How to Upgrade

1. **Visit Apify Pricing:**
   - Go to: https://apify.com/pricing
   - Or: https://console.apify.com/billing

2. **Choose a Plan:**
   - **Starter ($29/month)** - Recommended for most users
   - **Team ($99/month)** - For teams/higher volume
   - **Enterprise** - For large organizations

3. **Add Payment Method:**
   - Credit card required
   - Billed monthly
   - Can cancel anytime

4. **Benefits Immediately:**
   - ✅ No more daily run limits
   - ✅ More platform credits
   - ✅ Higher usage limits

## Cost Comparison

### Free Plan
- **Cost:** $0/month
- **Runs/day:** 10
- **Runs/month:** ~300 (if you use all 10/day)
- **Best for:** Testing, low-volume scraping

### Starter Plan ($29/month)
- **Cost:** $29/month
- **Runs/day:** Unlimited (or very high limit)
- **Runs/month:** ~116 included, then $0.25/run
- **Best for:** Production, regular scraping

### Example Monthly Costs

**Scenario 1: 50 jobs/month (5 candidates each)**
- Free: ✅ Works (within 10 runs/day limit)
- Starter: $29/month (all included in credits)

**Scenario 2: 200 jobs/month (5 candidates each)**
- Free: ❌ Won't work (exceeds daily limit)
- Starter: $29/month (all included in credits)

**Scenario 3: 500 jobs/month (5 candidates each)**
- Free: ❌ Won't work
- Starter: $29 + ($0.25 × 384 extra) = **$125/month**

## Alternative: Multiple Free Accounts

If you want to stay on free tier:
- ✅ Create multiple Apify accounts
- ✅ Use different API tokens
- ✅ Rotate between accounts
- ❌ More complex to manage
- ❌ Still limited to 10 runs/day per account

## Recommendation

**For Production Use:**
- ✅ **Upgrade to Starter ($29/month)**
- ✅ Reliable, no limits
- ✅ Professional support
- ✅ Worth it for production

**For Development/Testing:**
- ✅ **Stay on Free**
- ✅ Use multiple accounts if needed
- ✅ Upgrade when going to production

## Next Steps

1. **If upgrading:**
   - Visit: https://apify.com/pricing
   - Choose Starter plan
   - Add payment method
   - Your scraper will automatically work with higher limits

2. **If staying on free:**
   - Wait 24 hours for daily limit reset
   - Or create additional free accounts
   - Plan your scraping to stay within 10 runs/day

## Questions?

- **Apify Support:** https://apify.com/help
- **Pricing Page:** https://apify.com/pricing
- **Billing Dashboard:** https://console.apify.com/billing

