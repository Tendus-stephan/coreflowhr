# Quick Gemini API Key Setup

## The Error You're Seeing

```
API key not valid. Please pass a valid API key.
```

This means the Gemini API key is missing or not configured correctly.

## Quick Fix (3 Steps)

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy the API key (it looks like: `AIzaSy...`)

### Step 2: Create/Update `.env` File

In your project root directory, create or edit the `.env` file:

```env
VITE_API_KEY=your_actual_api_key_here
```

**Important**: 
- Replace `your_actual_api_key_here` with the key you copied
- No quotes needed
- No spaces around the `=`

### Step 3: Restart Your Dev Server

1. Stop your current dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

## Verify It's Working

1. Open Settings → Email Templates
2. Click "Edit" on any template
3. Click "Generate with AI"
4. You should see a loading spinner, then generated content
5. Check browser console - you should see `[Gemini] API key present: Yes`

## Still Not Working?

### Check 1: Is the file named correctly?
- Must be `.env` (not `.env.local` or `.env.development`)
- Must be in the project root (same folder as `package.json`)

### Check 2: Is the variable name correct?
- Must be exactly: `VITE_API_KEY`
- Case-sensitive

### Check 3: Did you restart the server?
- Vite only reads `.env` on startup
- You MUST restart after adding/changing `.env`

### Check 4: Is the API key valid?
- Go back to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure the key is active
- Try creating a new key if needed

### Check 5: Browser Console
- Open browser console (F12)
- Look for `[Gemini] API key present: No`
- If it says "No", the key isn't being read

## Example `.env` File

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
```

## Security Note

⚠️ **Never commit `.env` to git!** It should already be in `.gitignore`.

For production, consider:
- Using a backend proxy to hide the API key
- Using Supabase Edge Functions to call Gemini server-side













