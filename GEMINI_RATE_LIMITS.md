# Gemini API Rate Limits & Quota Exceeded

## The Error You're Seeing

```
ApiError: {"error":{"code":429,"message":"You exceeded your current quota..."}}
```

This means you've hit the **free tier rate limits** for Google Gemini API.

## Understanding Free Tier Limits

The Google Gemini API free tier has strict limits:

### Free Tier Limits (Gemini 2.0 Flash)
- **Requests per minute**: Limited (varies by model)
- **Requests per day**: Limited (varies by model)
- **Input tokens per minute**: Limited

Once you exceed these limits, you'll get a 429 error until the quota resets (usually 1 minute for per-minute limits, 24 hours for daily limits).

## Solutions

### Option 1: Wait and Retry (Free Tier)

The error message tells you how long to wait:
```
Please retry in 48.540169801s.
```

**For per-minute limits:**
- Wait 1-2 minutes
- Try again

**For daily limits:**
- Wait 24 hours
- Or upgrade to a paid plan (see Option 2)

### Option 2: Set Up Billing (Required for Free Tier Too)

**Important:** Even to use the free tier, Google Cloud requires billing setup:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Set up billing:**
   - Navigate to **Billing** → **Link a billing account**
   - Add a payment method (credit card)
   - **You'll be asked for a $10 prepayment** (one-time, refundable)

3. **About the $10 prepayment:**
   - ✅ **Refundable** if you close your Cloud billing account
   - ✅ Used to verify your payment method
   - ✅ **Not charged** unless you exceed free tier limits
   - ✅ Required even to activate the free tier
   - ✅ After prepayment, you receive free trial credits

4. **Benefits after billing setup:**
   - ✅ Free tier becomes active (with limits)
   - ✅ Higher rate limits than without billing (60 requests/minute for Gemini 2.0 Flash)
   - ✅ Higher daily quotas
   - ✅ Pay-per-use pricing if you exceed free tier (very affordable)
   - ✅ Better performance and reliability

5. **Pricing (if you exceed free tier):**
   - Gemini 2.0 Flash: ~$0.075 per 1M input tokens, $0.30 per 1M output tokens
   - For typical chat use, costs are very low (cents per day for normal usage)
   - You only pay for usage beyond the free tier limits

### Option 3: Implement Rate Limiting (Client-Side)

Add client-side rate limiting to reduce API calls:

```typescript
// Example: Add delay between requests
const lastRequestTime = useRef(0);
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

const handleSend = async (message: string) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime.current;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime.current = Date.now();
  // ... make API call
};
```

### Option 4: Switch to Alternative AI Provider

If Gemini's free tier is too restrictive, consider:

- **OpenAI GPT-4o Mini**: More generous free tier, similar pricing
- **Anthropic Claude 3.5 Sonnet**: Higher quality, different pricing
- **See**: `AI_PROVIDER_ALTERNATIVES.md` for details

## Current Error Handling

The AI chatbot now detects quota errors and shows a user-friendly message:
- ✅ Identifies 429/quota errors
- ✅ Shows retry delay time
- ✅ Suggests upgrading to paid plan
- ✅ Provides helpful links

## Monitoring Usage

To monitor your API usage:

1. **Google Cloud Console:**
   - Go to: https://console.cloud.google.com/
   - Navigate to **APIs & Services** → **Dashboard**
   - Select **Generative Language API**
   - View quota metrics and usage

2. **Google AI Studio:**
   - Visit: https://aistudio.google.com/
   - Check usage statistics

3. **API Usage Dashboard:**
   - Visit: https://ai.dev/usage?tab=rate-limit
   - View current rate limit status

## Best Practices to Avoid Rate Limits

1. **Implement request throttling** on the client side
2. **Cache responses** when possible
3. **Batch requests** if applicable
4. **Upgrade to paid plan** for production use
5. **Monitor usage** regularly

## For Production Applications

**Strongly recommended:**
- ✅ Upgrade to a paid Google Cloud billing account
- ✅ Set up billing alerts and budgets
- ✅ Monitor usage regularly
- ✅ Implement proper error handling and retry logic
- ✅ Consider caching AI responses for common queries

Free tier is great for development and testing, but production applications should use paid plans for reliability and higher limits.

## Need Help?

- **Gemini API Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Google Cloud Billing**: https://cloud.google.com/billing/docs
- **Quota Documentation**: https://ai.google.dev/gemini-api/docs/quota

---

**Note**: The free tier limits are designed to prevent abuse. For legitimate production use, upgrading to a paid plan is the standard approach and is very affordable for most applications.
