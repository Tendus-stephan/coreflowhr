# Scraper Run Cost Analysis

## What Happens When You Request 10 Candidates

### Current Flow (Step-by-Step)

1. **Initial Fetch** (Line 159-182 in `ScrapingService.ts`)
   - Requests: `quota * fetchMultiplier = 10 * 3 = 30` candidates
   - Makes: **1 Apify run** (`actor.call()`)
   - Cost: **1 run**

2. **Processing Candidates** (Line 193-222)
   - Validates each candidate (location, experience, skills)
   - Some candidates may be rejected (wrong location, wrong experience level, duplicates)
   - Example: 30 fetched → 5 valid → 5 saved

3. **Additional Fetches** (Line 230-275)
   - If `saved < quota` (e.g., only 5 saved, need 5 more)
   - Calculates: `Math.max((quota - saved) * fetchMultiplier, 10)`
   - Example: `Math.max((10 - 5) * 3, 10) = 15` candidates
   - Makes: **Another 1 Apify run**
   - Cost: **+1 run**

4. **Repeat Until Quota Met** (Line 189)
   - Can repeat up to `maxAttempts = 10` times
   - Each fetch = **1 run**
   - Worst case: **10 runs for 10 candidates**

### Why Multiple Runs Happen

**Problem:** Each `actor.call()` = 1 Apify run (even if it returns 0 results)

**Scenarios:**
- **Best case:** 1 run (30 candidates fetched, 10 valid, all saved)
- **Typical case:** 2-3 runs (some invalid candidates, need to fetch more)
- **Worst case:** 10 runs (every fetch only gives 1 valid candidate)

**Additional Cost Factors:**
1. **Retry Logic** (Line 267-302 in `ApifyService.ts`)
   - Retries on connection errors (ECONNRESET, timeout)
   - Each retry = **another run** (if connection fails)
   - Up to 3 retries per actor call

2. **Actor Fallback** (Line 216-333)
   - Tries up to 7 different actors if one fails
   - Each actor attempt = **1 run** (even if it fails immediately)

3. **Free Tier Limit Detection**
   - Currently: **NOT detected** - continues trying even after limit reached
   - Result: Wastes runs on failed attempts

### Current Cost Example

**Request: 10 candidates**

```
Run 1: Fetch 30 candidates → 5 valid → 5 saved (need 5 more)
Run 2: Fetch 15 candidates → 3 valid → 3 saved (need 2 more)
Run 3: Fetch 10 candidates → 2 valid → 2 saved (quota met!)
Total: 3 runs for 10 candidates ✅
```

**If many invalid candidates:**
```
Run 1: Fetch 30 → 2 valid → 2 saved (need 8 more)
Run 2: Fetch 24 → 1 valid → 1 saved (need 7 more)
Run 3: Fetch 21 → 1 valid → 1 saved (need 6 more)
... (continues up to 10 runs)
Total: Up to 10 runs for 10 candidates ❌
```

## Optimizations Needed

### 1. Detect Free Tier Limit
- Check for "free user run limit reached" message
- Stop immediately (don't waste more runs)
- Return clear error to user

### 2. Reduce Fetch Multiplier
- Current: `fetchMultiplier = 3` (fetch 3x candidates)
- Suggestion: `fetchMultiplier = 2` (fetch 2x candidates)
- Reduces initial fetch size, but may need more runs if many invalid

### 3. Better Validation Before Fetching
- Currently validates after fetching
- Could pre-filter by location/experience in Apify query (if supported)

### 4. Cache Results
- If same job is scraped multiple times, reuse previous results
- Avoids duplicate runs for same query

## Recommended Changes

1. ✅ **Add free tier limit detection** → Stop immediately when limit reached (IMPLEMENTED)
2. ✅ **Reduce fetchMultiplier** → From 3 to 2 (balance between runs and validation) (IMPLEMENTED)
3. ✅ **Add run counter** → Track runs per scrape job, warn user if approaching limit (IMPLEMENTED)
4. ✅ **Better error messages** → Show user exactly how many runs were used (IMPLEMENTED)

## What Was Fixed

### 1. Free Tier Limit Detection
- Now detects "free user run limit reached" message from Apify
- Stops immediately when limit is reached (no more wasted runs)
- Shows clear error message with options

### 2. Reduced Fetch Multiplier
- Changed from `3x` to `2x` requested candidates
- Example: Request 10 → Fetch 20 (instead of 30)
- Reduces initial run usage while still accounting for invalid candidates

### 3. Run Tracking
- Logs each Apify run with a number: `📊 Apify run #1`, `#2`, etc.
- Shows remaining runs: `📊 Apify runs used: 3 (Free tier: 10 runs/day, 7 remaining today)`
- Helps you track cost and plan usage

### 4. Better Error Handling
- Detects free tier limit in multiple places:
  - During actor call (before run starts)
  - After run completes (checking status/logs)
  - When dataset is empty (checking if it's due to limit)
- Stops entire scraping process immediately when limit detected

## Expected Run Usage (After Fixes)

**Request: 10 candidates**

**Best case:** 1 run
- Fetch 20 candidates → 10+ valid → All saved ✅

**Typical case:** 2-3 runs
- Run 1: Fetch 20 → 5 valid → 5 saved (need 5 more)
- Run 2: Fetch 10 → 5 valid → 5 saved (quota met!) ✅
- Total: 2 runs

**Worst case:** Up to 10 runs (if many invalid candidates)
- But now stops immediately if free tier limit reached

## How to Monitor Runs

When you run the scraper, you'll see:
```
📊 Apify run #1 (initial fetch: 20 candidates)
📊 Apify run #2 (requesting 10 candidates)
✅ LINKEDIN: Found 30, Saved 10 unique candidates (target: 10)
📊 Apify runs used: 2 (Free tier: 10 runs/day, 8 remaining today)
```

This helps you:
- Track how many runs each scrape uses
- Plan your daily usage (10 runs/day limit)
- Understand why multiple runs happen

