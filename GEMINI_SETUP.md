# Google Gemini AI Setup

## Yes, It's Real Google Gemini! ✅

The implementation uses the **official Google Gemini API** via the `@google/genai` package.

## How It Works

1. **Uses Official Google GenAI SDK**: `@google/genai` package (version 1.30.0)
2. **Model**: `gemini-2.5-flash` - Google's latest fast model
3. **API Calls**: Makes real API calls to Google's Gemini service
4. **Fallback**: If API fails or key is missing, uses pre-written templates

## Setup Required

### Step 1: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or go to [API Keys](https://aistudio.google.com/app/apikey)
4. Create a new API key
5. Copy the API key

### Step 2: Set Environment Variable

Create a `.env` file in your project root (if it doesn't exist):

```env
VITE_API_KEY=your_google_gemini_api_key_here
```

**Important**: 
- Replace `your_google_gemini_api_key_here` with your actual API key
- Never commit the `.env` file to git (it should be in `.gitignore`)

### Step 3: Restart Development Server

After adding the API key:
```bash
npm run dev
```

## How to Verify It's Working

1. Go to Settings → Email Templates
2. Click "Edit" on any template
3. Click "Generate with AI" button
4. If you see a loading spinner and then generated content, it's working!
5. If you see an error or fallback template, check:
   - Is `VITE_API_KEY` set in `.env`?
   - Is the API key valid?
   - Check browser console for errors

## Current Implementation

The code checks for the API key in this order:
1. `process.env.API_KEY` (for Node.js environments)
2. `import.meta.env.VITE_API_KEY` (for Vite/browser environments)
3. Falls back to empty string if not found

## API Usage

- **Model**: `gemini-2.5-flash` (fast, efficient model)
- **Response Format**: JSON with structured schema
- **Features Used**:
  - Structured output (JSON schema)
  - Custom prompts per template type
  - Error handling with fallbacks

## Cost

Google Gemini API has a free tier:
- Free tier: 15 requests per minute
- Paid tier: Higher rate limits

Check [Google AI Studio Pricing](https://aistudio.google.com/pricing) for current rates.

## Troubleshooting

### "Failed to generate template" Error

1. **Check API Key**: Make sure `VITE_API_KEY` is set in `.env`
2. **Check Console**: Look for API errors in browser console
3. **Check Quota**: Verify you haven't exceeded free tier limits
4. **Network**: Ensure you can reach Google's API

### Fallback Templates Appear

If you see pre-written templates instead of AI-generated ones:
- API key might be missing or invalid
- API quota might be exceeded
- Network issue preventing API call

The system gracefully falls back to professional pre-written templates so the feature always works.

## Security Note

⚠️ **Important**: The API key is exposed in the frontend code (Vite environment variables are bundled). For production:

1. Consider using a backend proxy to hide the API key
2. Or use Supabase Edge Functions to call Gemini server-side
3. Implement rate limiting to prevent abuse

For now, the current implementation works for development and small-scale use.













