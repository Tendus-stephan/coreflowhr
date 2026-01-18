# 🔍 Query and Location Improvements

## Changes Made

### 1. **Simplified Query (Less Specific)** ✅

**Before:**
- Query included: Job Title + Skill + Experience Level
- Example: `"Product Manager SQL senior"`
- Too specific → Often returns 0 results

**After:**
- Query includes: **Job Title only**
- Example: `"Product Manager"`
- Less specific → More results, better search breadth
- Skills and experience are still used for filtering candidates after they're found

**Why:**
- LinkedIn/Apify search works best with simple, broad queries
- Skills and experience level can be filtered during candidate processing
- More candidates found = better chance of finding good matches

---

### 2. **Improved Location Handling** ✅

**Before:**
- Used city name only (e.g., "Roseland")
- Small cities often returned 0 results

**After:**
- **Expands small cities** to nearby larger cities/metro areas
- Example: "Roseland, New Jersey" → Searches ["Roseland", "Newark", "Jersey City", "New York"]
- Falls back to original city if not in expansion map
- Makes location **optional** for location-agnostic searches (better for remote/broad searches)

**City Expansions Added:**
```typescript
'Roseland': ['Newark', 'Jersey City', 'New York']
'Newark': ['New York', 'Jersey City']
'Jersey City': ['New York', 'Newark']
'Oakland': ['San Francisco', 'San Jose']
'Berkeley': ['Oakland', 'San Francisco']
// More cities can be added as needed
```

**Why:**
- Small cities often have 0 LinkedIn profiles matching search criteria
- Expanding to nearby larger metros increases chances of finding candidates
- Candidates from nearby areas are often willing to commute or relocate

---

## Impact

### ✅ **Better Search Results:**
- Less specific queries = more candidates found
- Expanded locations = better geographic coverage

### ✅ **Maintained Quality:**
- Skills and experience still used for filtering candidates after they're found
- Quality filtering happens in `CandidateProcessor.ts`, not during search

### ✅ **Backwards Compatible:**
- No breaking changes to API or database
- Existing jobs work the same, just with better search results

---

## Testing

After these changes, test with:

1. **Small city job:**
   ```bash
   # Job in Roseland, New Jersey
   # Should now search: Roseland, Newark, Jersey City, New York
   ```

2. **Remote job:**
   ```bash
   # No location = location-agnostic search
   # Should find candidates from anywhere
   ```

3. **Large city job:**
   ```bash
   # Job in New York or Los Angeles
   # Should work as before (no expansion needed)
   ```

---

## Files Modified

- `scraper/src/services/providers/ApifyService.ts`
  - Simplified query building (job title only)
  - Added city expansion logic for small cities
  - Made location optional for better results

---

## Next Steps

1. **Test the changes** with existing jobs
2. **Monitor results** - should see more candidates found
3. **Add more city expansions** if needed (based on common job locations)

---

## Example Queries

### Before:
```
Search Query: "Product Manager SQL senior"
Location: ["Roseland"]
Result: 0 candidates (too specific + small city)
```

### After:
```
Search Query: "Product Manager"
Location: ["Roseland", "Newark", "Jersey City", "New York"]
Result: More candidates (simpler query + expanded location)
```

Then filter by skills/experience during candidate processing ✅
