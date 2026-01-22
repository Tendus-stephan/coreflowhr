# Scraper Cost Optimization

## ⚠️ Cost Warning: Multiple Scraper Attempts

**Important**: Each Apify actor call creates a run and consumes compute units, even if it fails.

### The Problem
- If we try 9 different scrapers and each creates a run before failing
- We could waste 9 compute units (costs ~$2.25 on paid plan)
- On free tier, that's almost your entire daily limit!

### The Solution
We've optimized the scraper to:

1. **Limit Attempts**: Only tries up to **3 scrapers** max
2. **Smart Fallback**: Only tries next scraper if previous fails
3. **Early Detection**: Stops immediately if quota limit reached
4. **Free Checks**: "Actor not found" errors don't consume compute units

## Current Strategy

### Primary Scraper (Tried First)
- `harvestapi/linkedin-profile-search`
- Most reliable, tried first
- If this works, no additional cost

### Fallback Scrapers (Only if needed)
- `clearpath/linkedin-employees-people-api` (2nd attempt)
- `vulnv/linkedin-profile-scraper` (3rd attempt)
- `apify/linkedin-profile-scraper` (4th attempt - but limited to 3 max)

**Max attempts: 3** to minimize costs

## Cost Breakdown

### Best Case (Primary Works)
- **1 run** = 1 compute unit
- **Cost**: ~$0.25 (paid) or 1/10 of free tier daily limit

### Worst Case (All 3 Fail)
- **3 runs** = 3 compute units
- **Cost**: ~$0.75 (paid) or 3/10 of free tier daily limit
- **Still better than**: Trying 9 scrapers = 9 compute units

### If Actor Not Found (Free)
- **0 runs** = 0 compute units
- **Cost**: $0
- Happens if actor doesn't exist (no run created)

## Recommendations

### For Free Tier Users
- ✅ **Use 1-2 scrapers max** (edit `MAX_ACTOR_ATTEMPTS = 2`)
- ✅ **Monitor usage** - Check Apify dashboard
- ✅ **Stick to most reliable** - Only use `harvestapi/linkedin-profile-search`

### For Paid Tier Users
- ✅ **3 scrapers is fine** - Good balance of reliability vs cost
- ✅ **Monitor costs** - ~$0.25-0.75 per scrape job
- ✅ **Factor into pricing** - Include in your $49-99/month pricing

## Configuration

To change max attempts, edit:
```typescript
// scraper/src/services/providers/ApifyService.ts
const MAX_ACTOR_ATTEMPTS = 3; // Change to 1, 2, or 3
```

### Recommended Settings

**Free Tier (10 runs/day)**:
```typescript
const MAX_ACTOR_ATTEMPTS = 1; // Only try primary scraper
```

**Paid Tier (Unlimited)**:
```typescript
const MAX_ACTOR_ATTEMPTS = 3; // Try up to 3 scrapers
```

## Cost Per Scrape Job

### Example: Scraping 10 candidates

**Free Tier**:
- Best case: 1 run = 1/10 daily limit
- Worst case: 3 runs = 3/10 daily limit
- **Recommendation**: Use `MAX_ACTOR_ATTEMPTS = 1` for free tier

**Paid Tier ($29/month)**:
- Best case: 1 run = ~$0.25
- Worst case: 3 runs = ~$0.75
- **Acceptable**: 3 attempts for better reliability

## Monitoring Costs

### Check Apify Dashboard
1. Go to: https://console.apify.com/usage
2. Check "Compute Units Used"
3. Monitor daily usage

### Free Tier Limits
- **10 runs/day** (resets daily)
- **$5 credits/month** (resets monthly)
- Each run = ~1 compute unit

### Paid Tier
- **$29/month** = $29 in credits
- **~116 runs/month** included
- **~$0.25 per additional run**

## Best Practices

1. **Start with 1 scraper** - Only add fallbacks if needed
2. **Monitor which scrapers work** - Use logs to see success rates
3. **Remove failing scrapers** - Don't keep trying ones that always fail
4. **Factor costs into pricing** - Include Apify costs in your $49-99/month plans

---

**Last Updated:** 2026-01-21
**Status:** ✅ Cost-Optimized
