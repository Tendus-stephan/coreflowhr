# Fix: API Key Reported as Leaked (403 Error)

## Error Message
```
ApiError: {"error":{"code":403,"message":"Your API key was reported as leaked. Please use another API key.","status":"PERMISSION_DENIED"}}
```

## What This Means

Your Gemini API key has been compromised (exposed publicly, committed to git, shared, etc.) and Google has disabled it for security reasons. You need to generate a new API key.

## Steps to Fix

### 1. Generate a New API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Select an existing Google Cloud project or create a new one
5. Copy the new API key

### 2. Update Local Environment

**For local development (.env.local):**
1. Open your `.env.local` file
2. Find the line: `VITE_API_KEY=your-old-key`
3. Replace with: `VITE_API_KEY=your-new-key`
4. Save the file
5. **Restart your development server** (npm run dev)

### 3. Update Production Environment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_KEY`
5. Click **Edit**
6. Paste your new API key
7. **Redeploy your application** (go to Deployments tab → click "Redeploy")

### 4. Secure Your API Key

**Important:** Prevent this from happening again:

- ✅ **Never commit API keys to Git**
  - `.env.local` should be in `.gitignore`
  - Check if your old key is in git history and remove it

- ✅ **Use environment variables only**
  - Never hardcode API keys in source code
  - Use `.env.local` for local development
  - Use Vercel environment variables for production

- ✅ **Rotate keys periodically**
  - Consider rotating API keys every 90 days
  - Immediately rotate if you suspect a leak

- ✅ **Check your .gitignore**
  Make sure it includes:
  ```
  .env.local
  .env
  *.env
  ```

### 5. Verify the Fix

1. Restart your local development server
2. Try using the AI chatbot again
3. Check that responses are working

## If Your Key is in Git History

If you accidentally committed your API key to Git:

1. **Remove it from Git history** (if repository is private):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **OR: Generate a new key** (simpler, recommended)
   - Just create a new API key as described above
   - The old one is already disabled, so no need to remove it from history

3. **Force push** (only if you cleaned history):
   ```bash
   git push origin --force --all
   ```

## Prevention Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys in source code
- [ ] Using environment variables for all secrets
- [ ] API key stored securely (password manager, etc.)
- [ ] Team members know not to commit secrets

## Need Help?

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- Check your `.gitignore` file to ensure `.env.local` is listed

---

**Note:** Once an API key is reported as leaked, it cannot be re-enabled. You must generate a new one.



