# LinkedIn Scraper Profile Rotation

## Overview

The scraper uses **one Apify account** but tries **multiple LinkedIn scraper actors/profiles** for better reliability. If one scraper fails or returns poor results, it automatically tries the next one.

## Why Multiple Scrapers?

Different LinkedIn scraper actors have:
- **Different success rates** - Some work better than others
- **Different data quality** - Some extract more complete profiles
- **Different search capabilities** - Some handle complex queries better
- **Different maintenance** - Some are more actively updated

By rotating through multiple scrapers, we get:
- ✅ **Better reliability** - If one fails, others may work
- ✅ **Better results** - Different scrapers may find different candidates
- ✅ **Redundancy** - No single point of failure

## ⚠️ Cost Warning

**Important**: Each actor call creates a run and consumes compute units, even if it fails.

- **Free tier**: 10 runs/day limit
- **Paid tier**: ~$0.25 per run
- **Solution**: We limit attempts to **3 scrapers max** to minimize costs

## Current Scraper Profiles

### Primary (Tried First - Most Reliable)
1. **harvestapi/linkedin-profile-search**
   - Rating: 4.6/5 (26 reviews)
   - 5.9K total users
   - No cookies required
   - **Cost if works**: 1 compute unit

### Fallback Options (Only if primary fails)
2. **clearpath/linkedin-employees-people-api**
   - Recent 2025 update
   - **Cost if tried**: +1 compute unit

3. **vulnv/linkedin-profile-scraper**
   - Rating: 5.0/5
   - **Cost if tried**: +1 compute unit

4. **apify/linkedin-profile-scraper** (Official - but limited to 3 max attempts)
   - Last resort option

## How It Works

1. **First Attempt**: Tries the primary scraper (most reliable)
2. **If Fails**: Automatically tries the next scraper (costs +1 compute unit)
3. **Limited Attempts**: Stops after **3 attempts max** to minimize costs
4. **Logs**: Shows which scrapers were tried and which worked

**Cost Optimization**: We limit to 3 attempts to avoid wasting compute units on multiple failed runs.

## Example Log Output

```
🔍 Attempting to scrape LinkedIn using multiple scraper profiles for better reliability...
📋 Will try up to 3 different LinkedIn scraper actors (to minimize compute unit costs)
💰 Cost Note: Each actor attempt consumes compute units. We limit attempts to avoid waste.
🔄 Trying LinkedIn scraper profile 1/3: harvestapi/linkedin-profile-search
✅ Successfully using actor: harvestapi/linkedin-profile-search
```

Or if first fails:
```
🔄 Trying LinkedIn scraper profile 1/3: harvestapi/linkedin-profile-search
❌ Actor "harvestapi/linkedin-profile-search" failed: [error]
   → Run was created (compute units consumed). Trying next actor...
🔄 Trying LinkedIn scraper profile 2/3: clearpath/linkedin-employees-people-api
✅ Successfully using actor: clearpath/linkedin-employees-people-api
```

## Benefits

### 1. **Better Reliability**
- If one scraper is down, others may work
- Reduces single point of failure

### 2. **Cost-Effective**
- Limited to 3 attempts max (not 9)
- Minimizes wasted compute units
- Best case: 1 compute unit, Worst case: 3 compute units

### 3. **Automatic Fallback**
- No manual intervention needed
- Seamless switching between scrapers
- Stops after 3 attempts to avoid excessive costs

## Configuration

The scraper profiles are defined in:
```
scraper/src/services/providers/ApifyService.ts
```

To add or reorder scrapers, edit the `possibleActorIds` array.

## Finding New Scrapers

1. Visit: https://apify.com/store
2. Search for: "LinkedIn"
3. Look for:
   - High ratings (4+ stars)
   - Recent updates
   - Good documentation
   - Active maintenance

4. Copy the actor ID (format: `username/actor-name`)
5. Add to the `possibleActorIds` array

## Best Practices

1. **Order by Reliability**: Put most reliable scrapers first
2. **Keep Updated**: Check Apify store periodically for new/better scrapers
3. **Monitor Logs**: See which scrapers work best for your use case
4. **Test New Scrapers**: Before adding to production, test in development

## Troubleshooting

### "None of the LinkedIn actors worked"
- All scrapers failed or returned errors
- Check Apify account status
- Verify API token is valid
- Check if LinkedIn changed their structure (scrapers may need updates)

### "Actor not found"
- The actor ID may have changed
- Check Apify store for current actor name
- Update the actor ID in code

### Poor Results
- Try reordering scrapers (put better ones first)
- Some scrapers work better for specific job types
- Consider adding more specialized scrapers

---

**Last Updated:** 2026-01-21
**Status:** ✅ Production Ready
