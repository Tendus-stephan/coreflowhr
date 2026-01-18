# SociaVault Setup Guide

## About SociaVault

**SociaVault** is a social media scraping API that supports LinkedIn, Instagram, TikTok, Twitter, YouTube, and 20+ other platforms.

### Trustworthiness
- ✅ **Legitimate Service**: Verified by ScamAdviser as safe
- ✅ **Valid SSL Certificate**: Secure connections
- ⚠️ **Relatively New**: Lower traffic/rank (started recently)
- ✅ **50 Free Credits**: Good for testing
- 💰 **Very Affordable**: $0.001 per request (cheapest pay-as-you-go option)

### Cost
- **Free Trial**: 50 API credits (enough for testing)
- **Pay-as-you-go**: **$0.001 per request** (1/10th of a cent)
- **Example**: 100 LinkedIn profiles = $0.10 (10 cents)
- **No Monthly Fee**: Pay only for what you use

## Setup Steps

### Step 1: Create Account

1. Go to **https://sociavault.com**
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email (check your inbox)

### Step 2: Get Your API Key

1. After logging in, go to your **Dashboard**
2. Look for **"API Key"** or **"Integrations"** section
3. Click **"Generate API Key"** (if needed) or **"Copy API Key"**
4. Copy the API key (keep it secure!)

### Step 3: Add to Environment Variables

Add the API key to your `.env.local` file in the project root:

```env
# SociaVault API Key (for LinkedIn scraping)
SOCIAVAULT_API_KEY=your_api_key_here
```

**Important Notes:**
- Use `.env.local` (not `.env`) if you have both files
- The key usually looks like: `sk_live_xxxxxxxxxxxxxxxxxxxx` or similar
- No spaces around the `=` sign
- Restart your scraper UI server after adding

### Step 4: Verify Setup

1. **Restart the scraper UI server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run scraper-ui
   ```

2. **Check provider status**:
   - Go to `http://localhost:3003`
   - Look at the "Provider Status" section
   - SociaVault should show a **green dot** (✅ configured)

3. **Check server logs**:
   ```
   [INFO] SociaVault configured: ✅
   ```

## Testing

### Test LinkedIn Scraping

1. In the scraper UI (`http://localhost:3003`):
   - Select a job from the list
   - Click "Start Scraping"
   - Select "LinkedIn" as source
   - Set max candidates (e.g., 10 for testing)
   - Click "Start Scraping"

2. **Watch the logs**:
   ```
   [INFO] 💰 Using SociaVault for LinkedIn scraping ($0.001 per profile - cheapest pay-as-you-go)
   [INFO] Scraping from LINKEDIN: 10 candidates requested
   ```

3. **Check results**:
   - Should see candidates appear in the results
   - Free credits will be used first (50 credits)
   - After free credits, charges are $0.001 per profile

## API Documentation

SociaVault's LinkedIn endpoint structure:
```
POST https://api.sociavault.com/linkedin/profile
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "query": "job title keywords",
  "location": "City, State",
  "max_results": 50
}
```

## Troubleshooting

### "SociaVault not configured"
- Check that `SOCIAVAULT_API_KEY` is in `.env.local`
- Verify no extra spaces around the `=` sign
- Restart the server after adding the key

### "Invalid API key"
- Make sure you copied the full API key
- Check for typos
- Verify you're using the correct key from your dashboard

### "Insufficient credits"
- You've used your 50 free credits
- Add credits to your account in the SociaVault dashboard
- Or let the system fall back to another provider (ScrapingBee, Apify)

### API Errors
- Check SociaVault's status page (if available)
- Verify your account is active
- Check rate limits in your dashboard

## Cost Management

### Monitor Usage

1. **Dashboard**: Check your SociaVault dashboard regularly
2. **Billing**: Review charges before they accumulate
3. **Set Limits**: Consider setting spending limits in account settings

### Best Practices

- **Use free credits first**: Test with free 50 credits
- **Start small**: Test with 10-20 candidates first
- **Monitor costs**: Check dashboard after each scraping session
- **Use Apify for free tier**: If available, use Apify's free tier first (5 compute units/month)
- **Fallback chain**: Let system automatically fall back to cheaper providers

## Comparison with Other Providers

| Feature | SociaVault | Apify | ScrapingBee | ScraperAPI |
|---------|-----------|-------|-------------|------------|
| **LinkedIn Support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Paid only |
| **Free Tier** | 50 credits | 5 units/month | Trial | 1K requests |
| **Cost (100 profiles)** | **$0.10** | Free (free tier) | $0.02 | $29/month |
| **Pay-as-you-go** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Monthly only |
| **Setup Complexity** | Easy | Easy | Easy | Easy |

## Recommendation

**For Cost-Conscious Users:**
1. Start with **Apify** (free tier: 5 compute units/month)
2. Use **SociaVault** as fallback ($0.001 per request - cheapest)
3. Use **ScrapingBee** as secondary fallback ($0.20 per 1K requests)

**For Heavy Users:**
- SociaVault is the cheapest pay-as-you-go option
- No monthly fees - pay only for what you use
- Perfect for unpredictable usage patterns

## Support

- **Website**: https://sociavault.com
- **Documentation**: Check your dashboard for API docs
- **Support**: Contact through your dashboard or support email

## Next Steps

After setting up SociaVault:

1. ✅ Test with free credits (50 credits)
2. ✅ Monitor costs in dashboard
3. ✅ Adjust provider priority if needed
4. ✅ Set up ScrapingBee as backup (see `SETUP_SCRAPINGBEE.md`)



## About SociaVault

**SociaVault** is a social media scraping API that supports LinkedIn, Instagram, TikTok, Twitter, YouTube, and 20+ other platforms.

### Trustworthiness
- ✅ **Legitimate Service**: Verified by ScamAdviser as safe
- ✅ **Valid SSL Certificate**: Secure connections
- ⚠️ **Relatively New**: Lower traffic/rank (started recently)
- ✅ **50 Free Credits**: Good for testing
- 💰 **Very Affordable**: $0.001 per request (cheapest pay-as-you-go option)

### Cost
- **Free Trial**: 50 API credits (enough for testing)
- **Pay-as-you-go**: **$0.001 per request** (1/10th of a cent)
- **Example**: 100 LinkedIn profiles = $0.10 (10 cents)
- **No Monthly Fee**: Pay only for what you use

## Setup Steps

### Step 1: Create Account

1. Go to **https://sociavault.com**
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email (check your inbox)

### Step 2: Get Your API Key

1. After logging in, go to your **Dashboard**
2. Look for **"API Key"** or **"Integrations"** section
3. Click **"Generate API Key"** (if needed) or **"Copy API Key"**
4. Copy the API key (keep it secure!)

### Step 3: Add to Environment Variables

Add the API key to your `.env.local` file in the project root:

```env
# SociaVault API Key (for LinkedIn scraping)
SOCIAVAULT_API_KEY=your_api_key_here
```

**Important Notes:**
- Use `.env.local` (not `.env`) if you have both files
- The key usually looks like: `sk_live_xxxxxxxxxxxxxxxxxxxx` or similar
- No spaces around the `=` sign
- Restart your scraper UI server after adding

### Step 4: Verify Setup

1. **Restart the scraper UI server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run scraper-ui
   ```

2. **Check provider status**:
   - Go to `http://localhost:3003`
   - Look at the "Provider Status" section
   - SociaVault should show a **green dot** (✅ configured)

3. **Check server logs**:
   ```
   [INFO] SociaVault configured: ✅
   ```

## Testing

### Test LinkedIn Scraping

1. In the scraper UI (`http://localhost:3003`):
   - Select a job from the list
   - Click "Start Scraping"
   - Select "LinkedIn" as source
   - Set max candidates (e.g., 10 for testing)
   - Click "Start Scraping"

2. **Watch the logs**:
   ```
   [INFO] 💰 Using SociaVault for LinkedIn scraping ($0.001 per profile - cheapest pay-as-you-go)
   [INFO] Scraping from LINKEDIN: 10 candidates requested
   ```

3. **Check results**:
   - Should see candidates appear in the results
   - Free credits will be used first (50 credits)
   - After free credits, charges are $0.001 per profile

## API Documentation

SociaVault's LinkedIn endpoint structure:
```
POST https://api.sociavault.com/linkedin/profile
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "query": "job title keywords",
  "location": "City, State",
  "max_results": 50
}
```

## Troubleshooting

### "SociaVault not configured"
- Check that `SOCIAVAULT_API_KEY` is in `.env.local`
- Verify no extra spaces around the `=` sign
- Restart the server after adding the key

### "Invalid API key"
- Make sure you copied the full API key
- Check for typos
- Verify you're using the correct key from your dashboard

### "Insufficient credits"
- You've used your 50 free credits
- Add credits to your account in the SociaVault dashboard
- Or let the system fall back to another provider (ScrapingBee, Apify)

### API Errors
- Check SociaVault's status page (if available)
- Verify your account is active
- Check rate limits in your dashboard

## Cost Management

### Monitor Usage

1. **Dashboard**: Check your SociaVault dashboard regularly
2. **Billing**: Review charges before they accumulate
3. **Set Limits**: Consider setting spending limits in account settings

### Best Practices

- **Use free credits first**: Test with free 50 credits
- **Start small**: Test with 10-20 candidates first
- **Monitor costs**: Check dashboard after each scraping session
- **Use Apify for free tier**: If available, use Apify's free tier first (5 compute units/month)
- **Fallback chain**: Let system automatically fall back to cheaper providers

## Comparison with Other Providers

| Feature | SociaVault | Apify | ScrapingBee | ScraperAPI |
|---------|-----------|-------|-------------|------------|
| **LinkedIn Support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Paid only |
| **Free Tier** | 50 credits | 5 units/month | Trial | 1K requests |
| **Cost (100 profiles)** | **$0.10** | Free (free tier) | $0.02 | $29/month |
| **Pay-as-you-go** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Monthly only |
| **Setup Complexity** | Easy | Easy | Easy | Easy |

## Recommendation

**For Cost-Conscious Users:**
1. Start with **Apify** (free tier: 5 compute units/month)
2. Use **SociaVault** as fallback ($0.001 per request - cheapest)
3. Use **ScrapingBee** as secondary fallback ($0.20 per 1K requests)

**For Heavy Users:**
- SociaVault is the cheapest pay-as-you-go option
- No monthly fees - pay only for what you use
- Perfect for unpredictable usage patterns

## Support

- **Website**: https://sociavault.com
- **Documentation**: Check your dashboard for API docs
- **Support**: Contact through your dashboard or support email

## Next Steps

After setting up SociaVault:

1. ✅ Test with free credits (50 credits)
2. ✅ Monitor costs in dashboard
3. ✅ Adjust provider priority if needed
4. ✅ Set up ScrapingBee as backup (see `SETUP_SCRAPINGBEE.md`)

