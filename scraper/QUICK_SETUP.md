# Quick Setup Guide - SociaVault & ScrapingBee

## Quick Reference

### SociaVault Setup (5 minutes)

1. **Sign up**: https://sociavault.com → Get 50 free credits
2. **Get API key**: Dashboard → Copy API Key
3. **Add to `.env.local`**:
   ```env
   SOCIAVAULT_API_KEY=your_key_here
   ```
4. **Restart server**: `npm run scraper-ui`
5. **Verify**: Check provider status in UI (should show ✅ green)

**Cost**: $0.001 per request (cheapest option)
**Detailed guide**: See `scraper/SETUP_SOCIAVAULT.md`

---

### ScrapingBee Setup (5 minutes)

1. **Sign up**: https://www.scrapingbee.com → Get free trial
2. **Get API key**: Dashboard → Copy API Key
3. **Add to `.env.local`**:
   ```env
   SCRAPINGBEE_API_KEY=your_key_here
   ```
4. **Restart server**: `npm run scraper-ui`
5. **Verify**: Check provider status in UI (should show ✅ green)

**Cost**: $0.20 per 1,000 requests
**Detailed guide**: See `scraper/SETUP_SCRAPINGBEE.md`

---

## Recommended Setup (Both Providers)

For best cost optimization and reliability, set up **both**:

### Step 1: Add Both API Keys

Add to your `.env.local` file:

```env
# Cheapest option (use first)
SOCIAVAULT_API_KEY=your_sociavault_key_here

# Reliable backup (use if SociaVault fails)
SCRAPINGBEE_API_KEY=your_scrapingbee_key_here
```

### Step 2: Restart Server

```bash
# Stop current server (Ctrl+C if running)
npm run scraper-ui
```

### Step 3: Verify Both Are Working

1. Open `http://localhost:3003`
2. Check "Provider Status" section
3. Both should show **green dots** (✅ configured)

### Step 4: Test Scraping

1. Select a job from the list
2. Click "Start Scraping"
3. Watch logs - should show:
   ```
   [INFO] Using SociaVault for LinkedIn scraping ($0.001 per profile)
   ```

---

## Provider Priority (Automatic)

The system will automatically use providers in this order (cheapest first):

### For LinkedIn:
1. **Apify** (if configured) - FREE tier available
2. **SociaVault** (if configured) - $0.001 per request
3. **ScrapingBee** (if configured) - $0.20 per 1K requests
4. **ScraperAPI** (if configured) - Last resort (requires $29/month paid plan)

### For Job Boards:
1. **ScrapingBee** (if configured) - $0.20 per 1K requests
2. **ScraperAPI** (if configured) - Free tier available (1K requests/month)

---

## Cost Comparison (100 LinkedIn Profiles)

| Provider | Cost | Notes |
|----------|------|-------|
| Apify (free tier) | **FREE** | Within 5 compute units/month |
| SociaVault | **$0.10** | 100 × $0.001 |
| ScrapingBee | **$0.02** | Part of 1,000 requests for $0.20 |
| ScraperAPI | **$29/month** | Requires paid plan |

**Recommendation**: Use Apify free tier first, then SociaVault ($0.10), then ScrapingBee ($0.02).

---

## Trustworthiness Summary

### SociaVault
- ✅ **Legitimate**: Verified as safe by ScamAdviser
- ⚠️ **New**: Relatively new service (lower traffic/rank)
- ✅ **Free credits**: 50 credits for testing
- 💰 **Cheapest**: $0.001 per request

### ScrapingBee
- ✅ **Well-established**: Founded 2019, trusted by thousands
- ✅ **Reliable**: High uptime, excellent support
- ✅ **Documentation**: Clear API docs and tutorials
- 💰 **Affordable**: $0.20 per 1,000 requests

---

## Troubleshooting

### "Provider not configured"
- ✅ Check `.env.local` file (not `.env`)
- ✅ Verify no extra spaces around `=`
- ✅ Restart server after adding keys
- ✅ Check key is correct (copy full key)

### "Invalid API key"
- ✅ Verify key from dashboard
- ✅ Check for typos
- ✅ Ensure account is active

### "Rate limit exceeded"
- ✅ Check provider dashboard for limits
- ✅ Use free credits/trial first
- ✅ System will auto-fallback to next provider

---

## Next Steps

1. ✅ Set up SociaVault (see `SETUP_SOCIAVAULT.md`)
2. ✅ Set up ScrapingBee (see `SETUP_SCRAPINGBEE.md`)
3. ✅ Test with free credits/trials
4. ✅ Monitor usage in provider dashboards
5. ✅ Adjust provider priority if needed

---

## Support Resources

- **SociaVault**: Dashboard → Support
- **ScrapingBee**: https://help.scrapingbee.com
- **General Setup**: See `SCRAPER_SETUP_GUIDE.md`
- **Cost Comparison**: See `scraper/CHEAPER_ALTERNATIVES.md`



## Quick Reference

### SociaVault Setup (5 minutes)

1. **Sign up**: https://sociavault.com → Get 50 free credits
2. **Get API key**: Dashboard → Copy API Key
3. **Add to `.env.local`**:
   ```env
   SOCIAVAULT_API_KEY=your_key_here
   ```
4. **Restart server**: `npm run scraper-ui`
5. **Verify**: Check provider status in UI (should show ✅ green)

**Cost**: $0.001 per request (cheapest option)
**Detailed guide**: See `scraper/SETUP_SOCIAVAULT.md`

---

### ScrapingBee Setup (5 minutes)

1. **Sign up**: https://www.scrapingbee.com → Get free trial
2. **Get API key**: Dashboard → Copy API Key
3. **Add to `.env.local`**:
   ```env
   SCRAPINGBEE_API_KEY=your_key_here
   ```
4. **Restart server**: `npm run scraper-ui`
5. **Verify**: Check provider status in UI (should show ✅ green)

**Cost**: $0.20 per 1,000 requests
**Detailed guide**: See `scraper/SETUP_SCRAPINGBEE.md`

---

## Recommended Setup (Both Providers)

For best cost optimization and reliability, set up **both**:

### Step 1: Add Both API Keys

Add to your `.env.local` file:

```env
# Cheapest option (use first)
SOCIAVAULT_API_KEY=your_sociavault_key_here

# Reliable backup (use if SociaVault fails)
SCRAPINGBEE_API_KEY=your_scrapingbee_key_here
```

### Step 2: Restart Server

```bash
# Stop current server (Ctrl+C if running)
npm run scraper-ui
```

### Step 3: Verify Both Are Working

1. Open `http://localhost:3003`
2. Check "Provider Status" section
3. Both should show **green dots** (✅ configured)

### Step 4: Test Scraping

1. Select a job from the list
2. Click "Start Scraping"
3. Watch logs - should show:
   ```
   [INFO] Using SociaVault for LinkedIn scraping ($0.001 per profile)
   ```

---

## Provider Priority (Automatic)

The system will automatically use providers in this order (cheapest first):

### For LinkedIn:
1. **Apify** (if configured) - FREE tier available
2. **SociaVault** (if configured) - $0.001 per request
3. **ScrapingBee** (if configured) - $0.20 per 1K requests
4. **ScraperAPI** (if configured) - Last resort (requires $29/month paid plan)

### For Job Boards:
1. **ScrapingBee** (if configured) - $0.20 per 1K requests
2. **ScraperAPI** (if configured) - Free tier available (1K requests/month)

---

## Cost Comparison (100 LinkedIn Profiles)

| Provider | Cost | Notes |
|----------|------|-------|
| Apify (free tier) | **FREE** | Within 5 compute units/month |
| SociaVault | **$0.10** | 100 × $0.001 |
| ScrapingBee | **$0.02** | Part of 1,000 requests for $0.20 |
| ScraperAPI | **$29/month** | Requires paid plan |

**Recommendation**: Use Apify free tier first, then SociaVault ($0.10), then ScrapingBee ($0.02).

---

## Trustworthiness Summary

### SociaVault
- ✅ **Legitimate**: Verified as safe by ScamAdviser
- ⚠️ **New**: Relatively new service (lower traffic/rank)
- ✅ **Free credits**: 50 credits for testing
- 💰 **Cheapest**: $0.001 per request

### ScrapingBee
- ✅ **Well-established**: Founded 2019, trusted by thousands
- ✅ **Reliable**: High uptime, excellent support
- ✅ **Documentation**: Clear API docs and tutorials
- 💰 **Affordable**: $0.20 per 1,000 requests

---

## Troubleshooting

### "Provider not configured"
- ✅ Check `.env.local` file (not `.env`)
- ✅ Verify no extra spaces around `=`
- ✅ Restart server after adding keys
- ✅ Check key is correct (copy full key)

### "Invalid API key"
- ✅ Verify key from dashboard
- ✅ Check for typos
- ✅ Ensure account is active

### "Rate limit exceeded"
- ✅ Check provider dashboard for limits
- ✅ Use free credits/trial first
- ✅ System will auto-fallback to next provider

---

## Next Steps

1. ✅ Set up SociaVault (see `SETUP_SOCIAVAULT.md`)
2. ✅ Set up ScrapingBee (see `SETUP_SCRAPINGBEE.md`)
3. ✅ Test with free credits/trials
4. ✅ Monitor usage in provider dashboards
5. ✅ Adjust provider priority if needed

---

## Support Resources

- **SociaVault**: Dashboard → Support
- **ScrapingBee**: https://help.scrapingbee.com
- **General Setup**: See `SCRAPER_SETUP_GUIDE.md`
- **Cost Comparison**: See `scraper/CHEAPER_ALTERNATIVES.md`

