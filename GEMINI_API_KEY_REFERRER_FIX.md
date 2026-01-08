# Gemini API Key Setup & Referrer Restriction Fix

## First: Get Your API Key

If you **don't have a Gemini API key yet**:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Choose a project (or create a new one)
5. Copy your API key
6. Add it to your `.env` file in the project root:
   ```
   VITE_API_KEY=your_api_key_here
   ```
7. Restart your development server

## Fix Referrer Restriction Error

If you're seeing this error:
```
API_KEY_HTTP_REFERRER_BLOCKED: Requests from referer http://localhost:3002/ are blocked.
```

This means your Gemini API key has HTTP referrer restrictions that block requests from localhost.

## Solution

### Option 1: Add Localhost to Allowed Referrers (Recommended for Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your Gemini API key
4. Under **API restrictions** → **Application restrictions**
5. Select **HTTP referrers (websites)**
6. Click **Add an item**
7. Add these referrers:
   - `http://localhost:3002/*`
   - `http://localhost:5173/*` (if using default Vite port)
   - `http://localhost:3000/*` (if using port 3000)
   - `https://coreflowhr.com/*`
   - `https://www.coreflowhr.com/*`
   - `https://*.vercel.app/*` (for Vercel preview deployments)
8. Click **Save**

### Option 2: Remove Referrer Restriction (Development Only)

⚠️ **Warning**: Only do this for development. For production, always use referrer restrictions for security.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **Application restrictions**, select **None**
5. Click **Save**

### Option 3: Use Separate API Keys

- **Development Key**: No referrer restrictions (for localhost)
- **Production Key**: Restricted to your production domain only

## For Production

In production, ensure your production domain is in the allowed referrers:
- `https://coreflowhr.com/*`
- `https://www.coreflowhr.com/*`

## Verification

After updating your API key:
1. Clear your browser cache
2. Restart your development server
3. Try using the AI chat feature again

