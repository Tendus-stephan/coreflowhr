# ScrapingBee Setup Guide

## About ScrapingBee

**ScrapingBee** is a web scraping API that handles proxies, browsers, and CAPTCHAs automatically. It supports LinkedIn, job boards, and general web scraping.

### Trustworthiness
- ✅ **Well-Established**: Founded in 2019, trusted by thousands of developers
- ✅ **Excellent Documentation**: Clear API docs and tutorials
- ✅ **Free Trial**: Available for testing
- ✅ **Reliable Service**: High uptime and good support
- 💰 **Affordable**: $0.20 per 1,000 requests

### Cost
- **Free Trial**: Available (varies by plan)
- **Pay-as-you-go**: **$0.20 per 1,000 requests** (very affordable)
- **Example**: 1,000 LinkedIn profiles = $0.20 (20 cents)
- **Monthly Plans**: Available if you need higher limits

## Setup Steps

### Step 1: Create Account

1. Go to **https://www.scrapingbee.com**
2. Click **"Sign Up"** or **"Get Started Free"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email (check your inbox)

### Step 2: Get Your API Key

1. After logging in, you'll be taken to your **Dashboard**
2. Your **API Key** should be visible on the dashboard
   - Look for a section labeled **"API Key"** or **"Your API Key"**
   - It usually starts with your account identifier
3. Click **"Copy"** or **"Show API Key"** if it's hidden
4. Copy the API key (keep it secure!)

**Alternative Method:**
- If you don't see the API key immediately:
  - Go to **Account Settings** or **API Keys** section
  - Generate a new API key if needed
  - Copy the key

### Step 3: Add to Environment Variables

Add the API key to your `.env.local` file in the project root:

```env
# ScrapingBee API Key (for LinkedIn and job board scraping)
SCRAPINGBEE_API_KEY=your_api_key_here
```

**Important Notes:**
- Use `.env.local` (not `.env`) if you have both files
- The key usually looks like: `YOUR_ACCOUNT_ID_HERE` or similar
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
   - ScrapingBee should show a **green dot** (✅ configured)

3. **Check server logs**:
   ```
   [INFO] ScrapingBee configured: ✅
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
   [INFO] 💵 Using ScrapingBee for LinkedIn scraping ($0.20 per 1,000 requests)
   [INFO] Scraping from LINKEDIN: 10 candidates requested
   ```

3. **Check results**:
   - Should see candidates appear in the results
   - Check your ScrapingBee dashboard for usage stats

### Test Job Board Scraping

1. Select "Job Boards" as source
2. Watch for ScrapingBee usage in logs
3. Check dashboard for request count

## API Documentation

ScrapingBee's API structure:
```
GET https://app.scrapingbee.com/api/v1/?api_key=YOUR_API_KEY&url=ENCODED_URL&render_js=true
```

For our implementation, we use:
- **LinkedIn**: `render_js=true` (required for JavaScript-heavy sites)
- **Job Boards**: `render_js=false` (usually not needed)

## Troubleshooting

### "ScrapingBee not configured"
- Check that `SCRAPINGBEE_API_KEY` is in `.env.local`
- Verify no extra spaces around the `=` sign
- Restart the server after adding the key

### "Invalid API key"
- Make sure you copied the full API key
- Check for typos
- Verify you're using the correct key from your dashboard
- Ensure your account is active

### "Rate limit exceeded"
- Check your ScrapingBee dashboard for usage limits
- Free trial has lower limits than paid plans
- Wait for the limit to reset or upgrade plan

### "CAPTCHA detected"
- ScrapingBee should handle this automatically
- If issues persist, check account status
- Ensure you have enough credits/requests remaining

### API Errors (429, 500, etc.)
- **429 (Too Many Requests)**: Rate limit exceeded - wait or upgrade
- **500 (Server Error)**: ScrapingBee's issue - try again later
- **403 (Forbidden)**: Check API key validity
- Check ScrapingBee's status page: https://status.scrapingbee.com

## Cost Management

### Monitor Usage

1. **Dashboard**: Check your ScrapingBee dashboard regularly
   - View request count
   - See remaining credits/requests
   - Monitor spending

2. **Usage Alerts**: Set up alerts in account settings (if available)

3. **Billing**: Review charges before they accumulate

### Best Practices

- **Start with free trial**: Test with free trial credits
- **Monitor requests**: Track usage in dashboard
- **Set limits**: Consider setting spending limits
- **Use efficiently**: Only use when needed (system will auto-select cheapest available)
- **Fallback chain**: Let system automatically fall back to cheaper providers first

## Plans & Pricing

### Free Trial
- Usually includes a small number of requests
- Good for testing and evaluation

### Pay-as-you-go
- **$0.20 per 1,000 requests**
- No monthly commitment
- Perfect for unpredictable usage

### Monthly Plans
- Starter: ~$49/month (includes requests)
- Business: Higher tiers available
- Better for consistent, high-volume usage

## Comparison with Other Providers

| Feature | ScrapingBee | Apify | SociaVault | ScraperAPI |
|---------|-------------|-------|------------|------------|
| **LinkedIn Support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Paid only |
| **Job Boards** | ✅ Yes | ✅ Yes | ❌ Limited | ✅ Yes |
| **Free Tier** | Trial | 5 units/month | 50 credits | 1K requests |
| **Cost (1K requests)** | **$0.20** | Free (free tier) | $1.00 | $29/month |
| **Setup Complexity** | Easy | Easy | Easy | Easy |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

## Recommendation

**For LinkedIn:**
- Use **Apify** first (free tier)
- Fall back to **SociaVault** (cheapest: $0.001/request)
- Then **ScrapingBee** ($0.20 per 1K requests)

**For Job Boards:**
- Use **ScrapingBee** first ($0.20 per 1K requests)
- Fall back to **ScraperAPI** (if you have paid plan)

## Support

- **Website**: https://www.scrapingbee.com
- **Documentation**: https://www.scrapingbee.com/documentation/
- **Help Center**: https://help.scrapingbee.com
- **Status Page**: https://status.scrapingbee.com
- **Support**: Available through dashboard

## Next Steps

After setting up ScrapingBee:

1. ✅ Test with free trial credits
2. ✅ Monitor usage in dashboard
3. ✅ Set up spending limits (if needed)
4. ✅ Verify it works with your scraper
5. ✅ Consider setting up SociaVault as cheaper alternative for LinkedIn

## Additional Resources

- **Getting Started Guide**: https://help.scrapingbee.com/en/article/getting-started-102sb0i
- **API Reference**: Check your dashboard for full API docs
- **Examples**: Dashboard usually includes code examples



## About ScrapingBee

**ScrapingBee** is a web scraping API that handles proxies, browsers, and CAPTCHAs automatically. It supports LinkedIn, job boards, and general web scraping.

### Trustworthiness
- ✅ **Well-Established**: Founded in 2019, trusted by thousands of developers
- ✅ **Excellent Documentation**: Clear API docs and tutorials
- ✅ **Free Trial**: Available for testing
- ✅ **Reliable Service**: High uptime and good support
- 💰 **Affordable**: $0.20 per 1,000 requests

### Cost
- **Free Trial**: Available (varies by plan)
- **Pay-as-you-go**: **$0.20 per 1,000 requests** (very affordable)
- **Example**: 1,000 LinkedIn profiles = $0.20 (20 cents)
- **Monthly Plans**: Available if you need higher limits

## Setup Steps

### Step 1: Create Account

1. Go to **https://www.scrapingbee.com**
2. Click **"Sign Up"** or **"Get Started Free"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email (check your inbox)

### Step 2: Get Your API Key

1. After logging in, you'll be taken to your **Dashboard**
2. Your **API Key** should be visible on the dashboard
   - Look for a section labeled **"API Key"** or **"Your API Key"**
   - It usually starts with your account identifier
3. Click **"Copy"** or **"Show API Key"** if it's hidden
4. Copy the API key (keep it secure!)

**Alternative Method:**
- If you don't see the API key immediately:
  - Go to **Account Settings** or **API Keys** section
  - Generate a new API key if needed
  - Copy the key

### Step 3: Add to Environment Variables

Add the API key to your `.env.local` file in the project root:

```env
# ScrapingBee API Key (for LinkedIn and job board scraping)
SCRAPINGBEE_API_KEY=your_api_key_here
```

**Important Notes:**
- Use `.env.local` (not `.env`) if you have both files
- The key usually looks like: `YOUR_ACCOUNT_ID_HERE` or similar
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
   - ScrapingBee should show a **green dot** (✅ configured)

3. **Check server logs**:
   ```
   [INFO] ScrapingBee configured: ✅
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
   [INFO] 💵 Using ScrapingBee for LinkedIn scraping ($0.20 per 1,000 requests)
   [INFO] Scraping from LINKEDIN: 10 candidates requested
   ```

3. **Check results**:
   - Should see candidates appear in the results
   - Check your ScrapingBee dashboard for usage stats

### Test Job Board Scraping

1. Select "Job Boards" as source
2. Watch for ScrapingBee usage in logs
3. Check dashboard for request count

## API Documentation

ScrapingBee's API structure:
```
GET https://app.scrapingbee.com/api/v1/?api_key=YOUR_API_KEY&url=ENCODED_URL&render_js=true
```

For our implementation, we use:
- **LinkedIn**: `render_js=true` (required for JavaScript-heavy sites)
- **Job Boards**: `render_js=false` (usually not needed)

## Troubleshooting

### "ScrapingBee not configured"
- Check that `SCRAPINGBEE_API_KEY` is in `.env.local`
- Verify no extra spaces around the `=` sign
- Restart the server after adding the key

### "Invalid API key"
- Make sure you copied the full API key
- Check for typos
- Verify you're using the correct key from your dashboard
- Ensure your account is active

### "Rate limit exceeded"
- Check your ScrapingBee dashboard for usage limits
- Free trial has lower limits than paid plans
- Wait for the limit to reset or upgrade plan

### "CAPTCHA detected"
- ScrapingBee should handle this automatically
- If issues persist, check account status
- Ensure you have enough credits/requests remaining

### API Errors (429, 500, etc.)
- **429 (Too Many Requests)**: Rate limit exceeded - wait or upgrade
- **500 (Server Error)**: ScrapingBee's issue - try again later
- **403 (Forbidden)**: Check API key validity
- Check ScrapingBee's status page: https://status.scrapingbee.com

## Cost Management

### Monitor Usage

1. **Dashboard**: Check your ScrapingBee dashboard regularly
   - View request count
   - See remaining credits/requests
   - Monitor spending

2. **Usage Alerts**: Set up alerts in account settings (if available)

3. **Billing**: Review charges before they accumulate

### Best Practices

- **Start with free trial**: Test with free trial credits
- **Monitor requests**: Track usage in dashboard
- **Set limits**: Consider setting spending limits
- **Use efficiently**: Only use when needed (system will auto-select cheapest available)
- **Fallback chain**: Let system automatically fall back to cheaper providers first

## Plans & Pricing

### Free Trial
- Usually includes a small number of requests
- Good for testing and evaluation

### Pay-as-you-go
- **$0.20 per 1,000 requests**
- No monthly commitment
- Perfect for unpredictable usage

### Monthly Plans
- Starter: ~$49/month (includes requests)
- Business: Higher tiers available
- Better for consistent, high-volume usage

## Comparison with Other Providers

| Feature | ScrapingBee | Apify | SociaVault | ScraperAPI |
|---------|-------------|-------|------------|------------|
| **LinkedIn Support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Paid only |
| **Job Boards** | ✅ Yes | ✅ Yes | ❌ Limited | ✅ Yes |
| **Free Tier** | Trial | 5 units/month | 50 credits | 1K requests |
| **Cost (1K requests)** | **$0.20** | Free (free tier) | $1.00 | $29/month |
| **Setup Complexity** | Easy | Easy | Easy | Easy |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

## Recommendation

**For LinkedIn:**
- Use **Apify** first (free tier)
- Fall back to **SociaVault** (cheapest: $0.001/request)
- Then **ScrapingBee** ($0.20 per 1K requests)

**For Job Boards:**
- Use **ScrapingBee** first ($0.20 per 1K requests)
- Fall back to **ScraperAPI** (if you have paid plan)

## Support

- **Website**: https://www.scrapingbee.com
- **Documentation**: https://www.scrapingbee.com/documentation/
- **Help Center**: https://help.scrapingbee.com
- **Status Page**: https://status.scrapingbee.com
- **Support**: Available through dashboard

## Next Steps

After setting up ScrapingBee:

1. ✅ Test with free trial credits
2. ✅ Monitor usage in dashboard
3. ✅ Set up spending limits (if needed)
4. ✅ Verify it works with your scraper
5. ✅ Consider setting up SociaVault as cheaper alternative for LinkedIn

## Additional Resources

- **Getting Started Guide**: https://help.scrapingbee.com/en/article/getting-started-102sb0i
- **API Reference**: Check your dashboard for full API docs
- **Examples**: Dashboard usually includes code examples

