# Email Deliverability Guide - Prevent Emails Going to Spam

## The Problem
Your emails are going to spam instead of the inbox. This is a common issue that can be fixed with proper email authentication and domain configuration.

## Why Emails Go to Spam

1. **No Domain Authentication**: Using unverified domains or free email addresses
2. **Missing SPF Records**: Sender Policy Framework not configured
3. **Missing DKIM Records**: DomainKeys Identified Mail not configured
4. **Missing DMARC Records**: Domain-based Message Authentication not configured
5. **Poor Sender Reputation**: New domain or sending from free email services
6. **Content Issues**: Trigger words, poor formatting, or suspicious links

## Solution: Verify Your Domain in Resend

### Step 1: Add and Verify Your Domain in Resend

1. **Go to Resend Dashboard**: https://resend.com/domains
2. **Click "Add Domain"**
3. **Enter your domain**: `coreflowhr.com` (or your sending domain)
4. **Copy the DNS records** that Resend provides:
   - **SPF Record** (TXT record)
   - **DKIM Records** (CNAME or TXT records)
   - **DMARC Record** (TXT record - optional but recommended)

### Step 2: Add DNS Records to Your Domain

Go to your domain registrar (where you bought coreflowhr.com) and add these DNS records:

#### SPF Record (TXT Record)
```
Type: TXT
Name: @ (or leave blank/root domain)
Value: v=spf1 include:resend.com ~all
TTL: 3600 (or default)
```

#### DKIM Records (CNAME Records)
Resend will provide 2-3 CNAME records. Add them all:
```
Type: CNAME
Name: [resend provides this - usually something like resend._domainkey]
Value: [resend provides this]
TTL: 3600
```

#### DMARC Record (TXT Record) - Recommended
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:your-email@coreflowhr.com
TTL: 3600
```

**Note**: Start with `p=none` to monitor, then move to `p=quarantine` after a few weeks, then `p=reject` once confident.

### Step 3: Wait for DNS Propagation

- DNS changes can take 24-48 hours to propagate globally
- Check DNS propagation: https://www.whatsmydns.net/
- Resend will show verification status in their dashboard

### Step 4: Update Your FROM Email Address

**CRITICAL**: You MUST use an email address from your verified domain!

#### ❌ DON'T USE (These go to spam):
- `coreflowhr@gmail.com`
- `teams@coreflowhr.com` (if coreflowhr.com is not verified)
- Any free email service (@gmail.com, @yahoo.com, etc.)

#### ✅ DO USE (After domain verification):
- `noreply@coreflowhr.com`
- `hello@coreflowhr.com`
- `team@coreflowhr.com`
- `notifications@coreflowhr.com`

### Step 5: Update Environment Variables

Once your domain is verified, update your Supabase Edge Functions secrets:

1. **Go to Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. **Update `FROM_EMAIL`** to use your verified domain:
   ```
   FROM_EMAIL=noreply@coreflowhr.com
   ```
   or
   ```
   FROM_EMAIL=hello@coreflowhr.com
   ```
3. **Optional: Update `FROM_NAME`**:
   ```
   FROM_NAME=CoreflowHR
   ```

### Step 6: Update Supabase Auth SMTP Settings

If you're using Resend for Supabase Auth emails (signup confirmation, password reset), update:

1. **Go to Supabase Dashboard** → **Authentication** → **SMTP Settings**
2. **Update sender email** to use your verified domain:
   ```
   Sender email: noreply@coreflowhr.com
   ```
3. **Keep the same Resend SMTP settings**:
   - Host: `smtp.resend.com`
   - Port: `465` (or `587`)
   - Username: `resend`
   - Password: `[Your Resend API Key]`

## Additional Best Practices

### 1. Warm Up Your Domain (For New Domains)

If your domain is new:
- Start with low email volume (50-100 emails/day)
- Gradually increase over 2-4 weeks
- Use a consistent sending pattern

### 2. Content Best Practices

- ✅ Use clear subject lines (avoid spam trigger words)
- ✅ Include unsubscribe links (required by law)
- ✅ Balance text and images (don't send image-only emails)
- ✅ Use proper HTML structure
- ✅ Include plain text version (Resend handles this)

### 3. Monitor Email Reputation

- Check your sender score: https://www.senderscore.org/
- Monitor bounce rates in Resend dashboard
- Monitor spam complaints
- Keep bounce rate below 5%

### 4. Handle Images in Emails

**Images being hidden by Gmail/Outlook is NORMAL behavior** - this is not a bug, it's a security feature. You cannot force images to always show.

However, you can:
- ✅ Use alt text for images (already implemented)
- ✅ Ensure images are hosted on HTTPS (already implemented)
- ✅ Provide a fallback text/description
- ✅ Use a "View in browser" link
- ✅ Consider using inline CSS for colors/styling instead of images

## Quick Checklist

- [ ] Domain added to Resend
- [ ] SPF record added to DNS
- [ ] DKIM records added to DNS
- [ ] DMARC record added to DNS (recommended)
- [ ] Domain verified in Resend dashboard
- [ ] FROM_EMAIL updated to use verified domain
- [ ] Supabase Auth SMTP sender email updated
- [ ] Test email sent to verify delivery

## Testing Email Deliverability

1. **Send a test email** to yourself
2. **Check different email providers**:
   - Gmail (inbox and spam)
   - Outlook/Hotmail
   - Yahoo
   - Apple Mail
3. **Use email testing tools**:
   - Mail Tester: https://www.mail-tester.com/
   - MX Toolbox: https://mxtoolbox.com/spf.aspx

## Troubleshooting

### Still Going to Spam?

1. **Check domain verification status** in Resend
2. **Verify DNS records** are correct (use DNS checker tools)
3. **Wait 24-48 hours** for DNS propagation
4. **Check sender reputation** (sender score)
5. **Review email content** for spam triggers
6. **Check bounce/spam complaint rates** in Resend

### Can't Verify Domain?

- Ensure you have access to DNS settings
- Contact your domain registrar for help
- Use a subdomain if main domain has restrictions
- Consider using Resend's shared domain for testing (limited deliverability)

## Important Notes

- **Domain verification is REQUIRED** for production email sending
- **Free email addresses (@gmail.com) will ALWAYS have poor deliverability**
- **DNS changes take time** - be patient (24-48 hours)
- **Starting with low volume** helps build reputation
- **Consistent sending patterns** improve reputation

