# 🔒 Securing Environment Variables

This guide ensures your API keys and secrets are NEVER committed to Git and stay secure.

## ⚠️ Important: Vercel Deployment

**Yes, exposing your API key on Vercel CAN cause it to be marked as leaked!**

If your API key is exposed in:
- Build logs
- Browser console (if visible in client-side code)
- Public repository
- Screenshots/videos shared publicly
- Client-side bundle (if not properly handled)

Google's security systems will detect it and mark it as leaked.

## ✅ Current Security Status

### 1. `.gitignore` Protection

Your `.gitignore` is now configured to ignore:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `*.env`
- `*.env.local`
- `*.env.*.local`

✅ **These files will NEVER be committed to Git**

### 2. Verify Your Secrets Are Not Tracked

Run this command to check:
```bash
git ls-files | grep .env
```

If you see any `.env` files listed, they're tracked! Follow the "If Already Committed" section below.

### 3. Check Git History (Optional)

To check if secrets were ever committed:
```bash
git log --all --full-history -- .env.local
```

If you see commits, the key may have been exposed.

## 📋 Security Checklist

- [x] `.env.local` is in `.gitignore`
- [x] `.env.example` template exists (without real keys)
- [ ] Verify no `.env` files are tracked by Git
- [ ] API key only in `.env.local` (never in code)
- [ ] API key set in Vercel Environment Variables (not in code)
- [ ] Build logs on Vercel don't expose keys
- [ ] Browser console doesn't log API keys

## 🔐 How to Use Secrets Safely

### Local Development

1. **Create `.env.local`** (not `.env`):
   ```bash
   cp .env.example .env.local
   ```

2. **Add your real keys**:
   ```env
   VITE_API_KEY=your_actual_key_here
   ```

3. **Verify it's ignored**:
   ```bash
   git check-ignore -v .env.local
   ```
   Should show: `.gitignore:XX:.env.local`

4. **NEVER commit it**:
   ```bash
   git status  # .env.local should NOT appear
   ```

### Production (Vercel)

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add variables** (one by one):
   - `VITE_API_KEY` = `your_key_here`
   - `VITE_SUPABASE_URL` = `your_url_here`
   - `VITE_SUPABASE_ANON_KEY` = `your_key_here`
   - etc.

3. **For each variable**:
   - ✅ Check "Production"
   - ✅ Check "Preview" (if needed)
   - ✅ Check "Development" (optional, for Vercel dev)
   - ✅ Do NOT check "Expose to client-side" if it's a secret

4. **Redeploy** after adding variables

## 🚨 If Secrets Were Already Committed

### Option 1: Generate New Keys (Recommended - Simplest)

Since the old key is already compromised:
1. Generate new API key from Google AI Studio
2. Update `.env.local` with new key
3. Update Vercel with new key
4. Old key is disabled anyway, so no need to remove from history

### Option 2: Remove from Git History (If Repository is Private)

⚠️ **Only do this if your repository is private!**

```bash
# Remove .env files from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env .env.local .env.*" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

**⚠️ Warning:** This rewrites Git history. Only do this on private repos and coordinate with your team.

## 🔍 Verify No Secrets in Code

Search your codebase for potential hardcoded secrets:

```bash
# Search for API keys (should return nothing)
grep -r "AIzaSy" . --exclude-dir=node_modules --exclude-dir=.git

# Search for potential keys
grep -r "VITE_API_KEY=" . --exclude-dir=node_modules --exclude-dir=.git
```

## 🛡️ Additional Security Measures

### 1. Use `.env.example` as Template

- ✅ Keep `.env.example` in Git (with placeholder values)
- ✅ Add to `.gitignore`: `.env.example.local` (if you create one)

### 2. Vercel Build Logs

Vercel build logs are **public by default** for:
- Build output
- Environment variable names (not values)

To hide sensitive output:
- Don't log API keys in build scripts
- Use Vercel's "Hide Build Logs" option (Project Settings → General)

### 3. Client-Side Exposure

**Vite prefix (`VITE_`) means variables are exposed to browser!**

✅ **Safe for client-side:**
- `VITE_SUPABASE_URL` (public URL)
- `VITE_SUPABASE_ANON_KEY` (public anon key - safe by design)
- `VITE_STRIPE_PUBLISHABLE_KEY` (public key - safe by design)

⚠️ **Be careful with:**
- `VITE_API_KEY` - This is exposed in the browser bundle!

If you need truly secret keys (server-side only):
- Use Supabase Edge Functions (server-side)
- Use Vercel Serverless Functions
- Don't use `VITE_` prefix for secrets

### 4. API Key Restrictions (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your API key
4. Click "Edit"
5. Under "API restrictions":
   - Select "Restrict key"
   - Choose only "Generative Language API"
6. Under "Application restrictions":
   - Add your production domain: `www.coreflowhr.com`
   - Add your production domain (without www): `coreflowhr.com`
   - Add localhost for development: `localhost` (or specific ports if needed)
7. **Authorized JavaScript origins:**
   - Add: `https://www.coreflowhr.com`
   - Add: `https://coreflowhr.com`
   - Keep: `http://localhost:3000`, `http://localhost:3002`, `http://localhost:5173` for development
8. Save

This limits where your key can be used.

## 📝 Best Practices

1. ✅ **Always use `.env.local`** for local development
2. ✅ **Never commit `.env` files** to Git
3. ✅ **Use Vercel Environment Variables** for production
4. ✅ **Rotate keys periodically** (every 90 days)
5. ✅ **Use key restrictions** in Google Cloud Console
6. ✅ **Monitor API usage** for unusual activity
7. ✅ **Keep `.env.example` updated** as a template
8. ✅ **Review Git commits** before pushing (check `git diff`)

## 🔄 Quick Commands

```bash
# Check if .env.local is ignored
git check-ignore -v .env.local

# Verify no .env files are tracked
git ls-files | grep .env

# Check Git history for .env files
git log --all --full-history -- .env.local

# See what would be committed (should not include .env.local)
git status
```

## 🆘 If Your Key Gets Leaked Again

1. **Immediately generate a new key**
2. **Update `.env.local` and Vercel**
3. **Check where it was exposed:**
   - Git commits?
   - Public repository?
   - Browser console logs?
   - Build logs?
   - Screenshots/videos?
4. **Fix the exposure source**
5. **Set up key restrictions** to limit damage

---

**Remember:** Once a key is leaked, it cannot be re-enabled. Always generate a new one.
