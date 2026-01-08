# Update OAuth Redirect URIs for Production Domain

Now that you have `coreflowhr.com`, you need to update OAuth redirect URIs in Google Cloud and Microsoft Azure to use your production domain instead of localhost.

## 🔍 What Needs to Be Updated

### 1. Google Cloud Console (Google OAuth)

You need to update the **OAuth 2.0 Client ID** settings in Google Cloud Console:

#### Redirect URIs
The callback URL used in your code is:
```
https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/connect-google-callback
```

This should already be set correctly, but verify it's in your Google Cloud Console.

#### Authorized JavaScript Origins
Update these to include your production domain:

**Current (probably set):**
- `http://localhost:3000`
- `http://localhost:3002`
- `http://localhost:5173`

**Add these (if not already present):**
- `https://www.coreflowhr.com`
- `https://coreflowhr.com`

#### Steps to Update:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Find your **OAuth 2.0 Client ID** (the one used for Google Calendar/Meet integration)
   - Click **Edit** (pencil icon)

3. **Update Authorized JavaScript origins:**
   - Under **Authorized JavaScript origins**, click **+ ADD URI**
   - Add: `https://www.coreflowhr.com`
   - Add: `https://coreflowhr.com`
   - **Keep** `http://localhost:3000`, `http://localhost:3002`, `http://localhost:5173` for local development
   - Click **Save**

4. **Verify Authorized redirect URIs:**
   - Under **Authorized redirect URIs**, make sure you have:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/connect-google-callback`
   - This should already be set (don't change it - this is the Supabase Edge Function URL)

---

### 2. Microsoft Azure AD / Microsoft Entra ID (Teams OAuth)

You need to update the **App Registration** settings in Azure Portal:

#### Redirect URIs
The callback URL used in your code is:
```
https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/connect-teams-callback
```

#### Steps to Update:

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com/
   - Sign in

2. **Navigate to App Registrations:**
   - Go to **Microsoft Entra ID** → **App registrations**
   - Find your app (the one used for Teams integration)
   - Click on it

3. **Update Redirect URIs:**
   - Click **Authentication** in the left sidebar
   - Under **Redirect URIs**, you should see:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/connect-teams-callback` ✅ (keep this)
   - Under **Front-channel logout URL** (optional):
     - Add: `https://www.coreflowhr.com` (if needed)
   - Under **Implicit grant and hybrid flows**:
     - Make sure **Access tokens** and **ID tokens** are checked (if needed)

4. **Update Platform Settings (if applicable):**
   - Under **Platform configurations**, if you have a **Single-page application** platform:
     - Add: `https://www.coreflowhr.com`
     - Add: `https://coreflowhr.com`
   - **Keep** `http://localhost:3000`, `http://localhost:3002`, `http://localhost:5173` for local development

5. **Click Save**

---

### 3. Supabase Edge Functions - FRONTEND_URL

Make sure your Supabase Edge Functions have the `FRONTEND_URL` environment variable set:

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/
   - Select your project

2. **Set Environment Variables:**
   - Go to **Project Settings** → **Edge Functions** → **Secrets**
   - Find or add: `FRONTEND_URL`
   - Value: `https://www.coreflowhr.com`
   - Click **Save**

**Note:** The Edge Functions already have fallback logic to use `http://localhost:3000` if `FRONTEND_URL` is not set, but you should set it for production.

---

## 📋 Checklist

### Google Cloud Console
- [ ] Added `https://www.coreflowhr.com` to Authorized JavaScript origins
- [ ] Added `https://coreflowhr.com` to Authorized JavaScript origins
- [ ] Verified redirect URI includes your Supabase Edge Function URL
- [ ] Kept localhost URLs for development

### Microsoft Azure AD
- [ ] Verified redirect URI includes your Supabase Edge Function URL (`/connect-teams-callback`)
- [ ] Added `https://www.coreflowhr.com` to platform configurations (if needed)
- [ ] Added `https://coreflowhr.com` to platform configurations (if needed)
- [ ] Kept localhost URLs for development

### Supabase
- [ ] Set `FRONTEND_URL` environment variable to `https://www.coreflowhr.com` in Edge Function secrets

---

## 🔍 How to Find Your Supabase Project URL

1. Go to Supabase Dashboard: https://app.supabase.com/
2. Select your project
3. Go to **Project Settings** → **API**
4. Find **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
5. Your callback URL will be: `https://xxxxxxxxxxxxx.supabase.co/functions/v1/connect-google-callback` or `connect-teams-callback`

---

## ⚠️ Important Notes

1. **Don't remove localhost URLs** - Keep them for local development
2. **The callback URLs** (Supabase Edge Function URLs) should NOT change - they stay the same
3. **Domain restrictions** are about where the OAuth flow is initiated from (your frontend), not where the callback goes
4. **Changes take effect immediately** - No need to redeploy anything

---

## 🧪 Testing

After updating:

1. **Test Google OAuth:**
   - Go to your production site: https://www.coreflowhr.com
   - Navigate to Settings → Integrations
   - Click "Connect" on Google Calendar or Google Meet
   - The OAuth flow should work correctly

2. **Test Teams OAuth:**
   - Go to your production site: https://www.coreflowhr.com
   - Navigate to Settings → Integrations
   - Click "Connect" on Microsoft Teams
   - The OAuth flow should work correctly

3. **Test Local Development:**
   - Make sure localhost URLs are still in the configurations
   - Test OAuth from `http://localhost:3002` to ensure it still works

---

## 🆘 Common Issues

### "redirect_uri_mismatch" Error

**Google:**
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://YOUR_SUPABASE_ID.supabase.co/functions/v1/connect-google-callback`
- Check for trailing slashes, `http` vs `https`, etc.

**Microsoft:**
- Make sure the redirect URI in Azure exactly matches: `https://YOUR_SUPABASE_ID.supabase.co/functions/v1/connect-teams-callback`
- Check for trailing slashes, `http` vs `https`, etc.

### "origin_mismatch" Error

- Make sure `https://www.coreflowhr.com` and `https://coreflowhr.com` are in Authorized JavaScript origins (Google) or platform configurations (Microsoft)
- Try both with and without `www`

### OAuth Works Locally but Not in Production

- Verify `FRONTEND_URL` is set in Supabase Edge Function secrets
- Check that production domain is added to OAuth client configurations
- Check browser console for specific error messages



