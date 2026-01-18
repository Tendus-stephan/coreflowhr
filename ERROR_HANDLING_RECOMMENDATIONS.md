# Error Handling Recommendations

## Current Issues

When scraping fails, users are experiencing:
- Unclear error messages
- No recovery mechanism
- Job creation continues even if scraping fails
- No retry logic at the UI level
- Errors may cause the app to hang or show unclear states

## Best Error Handling Options

### Option 1: Graceful Degradation with User Notification (RECOMMENDED)

**How it works:**
- Job is always created successfully
- Scraping runs asynchronously in the background
- If scraping fails, user is notified but job remains
- User can manually retry scraping later
- Provides clear error messages with actionable steps

**Pros:**
- ✅ Job creation never fails due to scraping
- ✅ Users can still use the system
- ✅ Clear separation of concerns
- ✅ Can retry later without recreating job
- ✅ Better UX - user sees job immediately

**Cons:**
- ⚠️ Need to add retry UI in jobs list
- ⚠️ Job shows 0 candidates initially if scraping fails

**Implementation:**
```typescript
// In AddJob.tsx
1. Create job successfully first
2. Show success message with "Sourcing candidates..."
3. Run scraping in background (non-blocking)
4. If scraping fails:
   - Show error toast with "Retry" button
   - Store error in job metadata
   - Allow retry from job details page
5. If scraping succeeds:
   - Update candidates count
   - Show success notification
```

---

### Option 2: Retry Queue with Automatic Retries

**How it works:**
- Failed scraping attempts are queued
- System automatically retries after delay
- User gets notifications about retry status
- Maximum retry attempts (e.g., 3 retries)

**Pros:**
- ✅ Automatic recovery from transient errors
- ✅ Handles network issues gracefully
- ✅ User doesn't need to manually retry

**Cons:**
- ⚠️ More complex to implement
- ⚠️ Need background job queue
- ⚠️ May consume Apify runs on retries

**Use Cases:**
- Network timeouts
- Apify rate limits (retry after delay)
- Temporary service outages

---

### Option 3: Fail-Safe with Manual Retry Button

**How it works:**
- Job creation succeeds even if scraping fails
- Clear error message with specific failure reason
- "Retry Sourcing" button on job card/details
- Shows last error timestamp and message

**Pros:**
- ✅ Simple to implement
- ✅ User has control
- ✅ Clear error visibility
- ✅ No automatic retry costs

**Cons:**
- ⚠️ User must manually retry
- ⚠️ Error details need good UI

**Implementation:**
```typescript
// Store scraping status in job
job.scraping_status = 'failed' | 'succeeded' | 'pending'
job.scraping_error = 'Apify API limit reached'
job.scraping_attempted_at = timestamp

// UI shows button:
{job.scraping_status === 'failed' && (
  <Button onClick={retryScraping}>
    Retry Sourcing
  </Button>
)}
```

---

### Option 4: Real-time Error Streaming to User

**How it works:**
- Show live progress during scraping
- Stream errors to UI in real-time
- User can cancel if taking too long
- Detailed error messages as they occur

**Pros:**
- ✅ Full transparency
- ✅ User can see what's happening
- ✅ Can cancel long-running jobs
- ✅ Better debugging

**Cons:**
- ⚠️ More complex UI
- ⚠️ Need WebSocket or polling
- ⚠️ May overwhelm user with errors

---

## Recommended Approach: Hybrid (Option 1 + Option 3)

**Implementation Strategy:**

1. **Job Creation:** Always succeeds, regardless of scraping status
2. **Background Scraping:** Runs after job creation
3. **Error Handling:**
   - Catch all errors gracefully
   - Store error details in job metadata
   - Show user-friendly error messages
   - Provide "Retry Sourcing" button on job card
4. **Error Categories:**
   - **Apify Limit Reached:** Show "Free tier limit reached. Upgrade Apify or wait 24h"
   - **Network Error:** Show "Connection failed. Click Retry to try again"
   - **No Candidates Found:** Show "No candidates found. Try adjusting job criteria"
   - **Invalid Job Data:** Show "Job details incomplete. Please edit job"

5. **User Experience:**
   ```
   Post Job → Job Created ✅
             ↓
         Sourcing... (spinner)
             ↓
   [Success] → "10 candidates found!"
   [Failure] → "Sourcing failed: [reason]" + Retry Button
   ```

---

## Error Message Examples

**Good Error Messages:**
- ❌ "Sourcing failed: Apify free tier limit reached (10 runs/day). Please upgrade your Apify account or wait 24 hours."
- ❌ "Sourcing failed: No candidates found matching your criteria. Try broadening location or skills."
- ❌ "Sourcing failed: Connection timeout. Check your internet connection and try again."

**Bad Error Messages:**
- ❌ "Error: failed"
- ❌ "Something went wrong"
- ❌ "ECONNRESET"

---

## Implementation Priority

1. **Phase 1 (Critical):** 
   - Graceful error catching in AddJob.tsx
   - User-friendly error messages
   - Job creation always succeeds

2. **Phase 2 (Important):**
   - Store scraping status in job
   - Add "Retry Sourcing" button to job card
   - Show error details in job details page

3. **Phase 3 (Nice to have):**
   - Automatic retry for transient errors
   - Error analytics/logging
   - Webhook notifications for failures

---

## Code Changes Needed

### 1. AddJob.tsx
- Wrap scraping in try-catch
- Show error toast/notification
- Don't block job creation
- Store scraping status in job metadata

### 2. Job Model
- Add `scraping_status` field
- Add `scraping_error` field
- Add `scraping_attempted_at` field

### 3. Job Card Component
- Show scraping status badge
- Show "Retry Sourcing" button if failed
- Display last error message

### 4. Error Service
- Categorize errors (network, API limit, no results, etc.)
- Generate user-friendly messages
- Log errors for analytics

---

## Quick Win: Immediate Fix

For immediate improvement, just add better error messages:

```typescript
// In AddJob.tsx catch block
catch (error: any) {
  let userMessage = 'Failed to source candidates. ';
  
  if (error.message?.includes('Free Tier Limit')) {
    userMessage += 'Apify free tier limit reached. Please upgrade or wait 24 hours.';
  } else if (error.message?.includes('timeout') || error.message?.includes('ECONNRESET')) {
    userMessage += 'Connection error. Please check your internet and try again.';
  } else if (error.message?.includes('not found') || error.message?.includes('0 candidates')) {
    userMessage += 'No candidates found. Try adjusting job requirements.';
  } else {
    userMessage += error.message || 'Unknown error occurred.';
  }
  
  setError(userMessage);
  // Still navigate to jobs - job was created successfully
  navigate('/jobs');
}
```

---

## Recommendation

**Use Option 1 (Graceful Degradation) + Option 3 (Manual Retry) combined:**

1. Job always creates successfully ✅
2. Scraping runs in background (non-blocking) ✅
3. If it fails, show clear error + retry button ✅
4. User can retry later from job details ✅
5. Better error messages with actionable steps ✅

This gives the best user experience while being relatively simple to implement.

