# Switching to GPT-4o Mini for CV Parsing

## Cost Comparison

| Service | Cost per 1000 CVs | Reliability | JSON Guarantee |
|---------|-------------------|-------------|----------------|
| **Gemini 2.0 Flash** (Current) | $0-5 (free tier) | ⭐⭐ Poor | ❌ No |
| **GPT-4o Mini** | **$5-15** | ⭐⭐⭐⭐ Good | ✅ Yes (JSON Mode) |
| **GPT-4 Turbo** | $20-50 | ⭐⭐⭐⭐⭐ Excellent | ✅ Yes (JSON Mode) |
| **Claude 3.5 Sonnet** | $15-30 | ⭐⭐⭐⭐⭐ Excellent | ✅ Yes |
| **Affinda** | $100-200 | ⭐⭐⭐⭐⭐ Excellent | ✅ Yes |

**GPT-4o Mini is the cheapest reliable option** - roughly 5-10x cheaper than GPT-4 Turbo while still being much more reliable than Gemini.

---

## Why GPT-4o Mini?

1. **Cheap**: ~$0.005-0.015 per CV (5-15 cents per 1000 CVs)
2. **Reliable**: Much better structured output than Gemini
3. **JSON Mode**: Guaranteed valid JSON (no parsing errors)
4. **Good accuracy**: 90-95% extraction accuracy
5. **OpenAI API**: Well-documented, reliable service

---

## Implementation Steps

### Step 1: Install OpenAI SDK

```bash
npm install openai
```

### Step 2: Update Environment Variables

Add to `.env.local`:
```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

Add to Vercel Environment Variables (for production):
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add `VITE_OPENAI_API_KEY` with your OpenAI API key

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy it to your environment variables

**Pricing:**
- GPT-4o Mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
- Average CV parsing: ~500-1000 input tokens, ~500-800 output tokens
- **Cost per CV: ~$0.005-0.015** (very cheap!)

---

### Step 3: Create OpenAI Service

Create `services/openaiService.ts`:

```typescript
import OpenAI from 'openai';
import { ParsedCVData } from './cvParser';

const getOpenAIClient = (): OpenAI => {
  const apiKey = typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY
    ? import.meta.env.VITE_OPENAI_API_KEY
    : (typeof process !== "undefined" && process.env?.OPENAI_API_KEY
      ? process.env.OPENAI_API_KEY
      : null);

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  return new OpenAI({ apiKey });
};

/**
 * Parse CV text using GPT-4o Mini with JSON Mode
 * This provides more reliable parsing than Gemini
 */
export const parseCVWithOpenAI = async (
  cvText: string, 
  jobSkills?: string[]
): Promise<Partial<ParsedCVData>> => {
  // Truncate CV text to stay within token limits (first 8000 characters)
  const truncatedText = cvText.substring(0, 8000);
  
  const jobSkillsText = jobSkills && jobSkills.length > 0 
    ? `\n\nJob Requirements (for skill matching):\nRequired Skills: ${jobSkills.join(", ")}`
    : '';
  
  const prompt = `Extract structured information from this CV/resume. Return ONLY valid JSON.

CV Text:
${truncatedText}${jobSkillsText}

Extract the following information:
- name: Full name of the candidate (or null if not found)
- email: Email address (or null if not found)
- phone: Phone number (or null if not found)
- location: City, state/country (or null if not found)
- skills: Array of technical skills, programming languages, tools, frameworks
- experienceYears: Years of experience (number or null)
- workExperience: Array of work history with role, company, startDate, endDate, period, description
- projects: Array of projects with name, description, technologies
- portfolioUrls: Object with github, linkedin, portfolio, website URLs (or null)

IMPORTANT:
- Return ONLY valid JSON, no additional text
- For dates: Use simple format like "2022" or "2022-Present"
- If information is missing, use null
- Extract accurately - do not invent information`;

  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert CV/resume parser. Extract information accurately and return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }, // JSON Mode - guarantees valid JSON!
      temperature: 0.1, // Low temperature for accurate extraction
      max_tokens: 2000 // Limit output tokens
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON (should always succeed with JSON Mode)
    const parsed = JSON.parse(content);
    
    // Map OpenAI response to ParsedCVData format
    return {
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      location: parsed.location || undefined,
      skills: parsed.skills || [],
      experienceYears: parsed.experienceYears || undefined,
      workExperience: (parsed.workExperience || []).map((exp: any) => ({
        role: exp.role || '',
        company: exp.company || '',
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        period: exp.period || `${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
        description: exp.description || undefined
      })),
      projects: parsed.projects || [],
      portfolioUrls: parsed.portfolioUrls || undefined
    };
    
  } catch (error: any) {
    console.error("OpenAI CV Parsing Failed:", error);
    throw new Error(`CV parsing failed: ${error.message || 'Unknown error'}. Please ensure your OpenAI API key is configured correctly.`);
  }
};
```

---

### Step 4: Update CV Parser to Use OpenAI

Update `services/cvParser.ts`:

```typescript
// ... existing code ...

export async function parseCVTextWithAI(text: string, jobSkills?: string[]): Promise<ParsedCVData> {
  // Option 1: Use OpenAI (recommended - more reliable)
  try {
    const { parseCVWithOpenAI } = await import('./openaiService');
    const aiParsed = await parseCVWithOpenAI(text, jobSkills);
    
    return {
      fullText: text,
      name: aiParsed.name,
      email: aiParsed.email,
      phone: aiParsed.phone,
      location: aiParsed.location,
      skills: aiParsed.skills || [],
      experienceYears: aiParsed.experienceYears,
      workExperience: aiParsed.workExperience,
      projects: aiParsed.projects,
      portfolioUrls: aiParsed.portfolioUrls
    };
  } catch (openaiError: any) {
    console.warn("OpenAI parsing failed, falling back to Gemini:", openaiError);
    
    // Option 2: Fallback to Gemini (if OpenAI fails)
    const { parseCVWithAI } = await import('./geminiService');
    const aiParsed = await parseCVWithAI(text, jobSkills);
    
    return {
      fullText: text,
      name: aiParsed.name,
      email: aiParsed.email,
      phone: aiParsed.phone,
      location: aiParsed.location,
      skills: aiParsed.skills || [],
      experienceYears: aiParsed.experienceYears,
      workExperience: aiParsed.workExperience,
      projects: aiParsed.projects,
      portfolioUrls: aiParsed.portfolioUrls
    };
  }
}
```

**OR** (simpler - just use OpenAI):

```typescript
export async function parseCVTextWithAI(text: string, jobSkills?: string[]): Promise<ParsedCVData> {
  // Use OpenAI for CV parsing (more reliable than Gemini)
  const { parseCVWithOpenAI } = await import('./openaiService');
  const aiParsed = await parseCVWithOpenAI(text, jobSkills);
  
  return {
    fullText: text,
    name: aiParsed.name,
    email: aiParsed.email,
    phone: aiParsed.phone,
    location: aiParsed.location,
    skills: aiParsed.skills || [],
    experienceYears: aiParsed.experienceYears,
    workExperience: aiParsed.workExperience,
    projects: aiParsed.projects,
    portfolioUrls: aiParsed.portfolioUrls
  };
}
```

---

### Step 5: Update Package.json Dependencies

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    // ... other dependencies
  }
}
```

Then run:
```bash
npm install
```

---

## Cost Estimation

**GPT-4o Mini Pricing:**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens

**Per CV Estimate:**
- Input tokens: ~500-1000 (CV text + prompt)
- Output tokens: ~500-800 (parsed JSON)
- **Cost: ~$0.005-0.015 per CV**

**Monthly Cost Examples:**
- 100 CVs/month: ~$0.50-1.50
- 500 CVs/month: ~$2.50-7.50
- 1,000 CVs/month: ~$5-15
- 5,000 CVs/month: ~$25-75

**Very affordable!** Much cheaper than Affinda ($0.10-0.20 per CV = $100-200 for 1000 CVs).

---

## Advantages Over Gemini

1. **Guaranteed JSON**: JSON Mode ensures valid JSON (no parsing errors)
2. **Better accuracy**: More reliable extraction
3. **Fewer errors**: Less corrupted data
4. **Better prompt following**: Follows instructions more accurately
5. **No control character issues**: Proper JSON encoding

---

## Testing

After implementation, test with your CV parser test tool at `/cv-parser-test` to verify it works correctly.

---

## Optional: Keep Gemini as Fallback

You can keep Gemini as a fallback option if OpenAI API fails (quota, API key issues, etc.). This provides redundancy while using the cheaper, more reliable option by default.

---

## Next Steps

1. Install OpenAI SDK: `npm install openai`
2. Get OpenAI API key from https://platform.openai.com/api-keys
3. Add `VITE_OPENAI_API_KEY` to `.env.local` and Vercel
4. Create `services/openaiService.ts` with the code above
5. Update `services/cvParser.ts` to use OpenAI
6. Test with the CV parser test tool
7. Deploy to production

Would you like me to implement this for you?




