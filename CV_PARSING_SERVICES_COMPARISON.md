# CV Parsing Services Comparison

## Current Implementation
- **Service**: Google Gemini 2.0 Flash (via `@google/genai`)
- **Issues**: Malformed JSON responses, corrupted date fields, unreliable parsing

---

## Dedicated CV Parsing APIs (Best for Production)

### 1. **Affinda Resume Parser** ⭐⭐⭐⭐⭐
**Best Overall for Accuracy**

- **Accuracy**: 95%+ extraction accuracy
- **Features**: 
  - Structured JSON output (no parsing issues)
  - Handles PDF, DOCX, images
  - Extracts skills, experience, education, certifications
  - Normalized data formats
  - Multi-language support
- **Pricing**: 
  - Pay-as-you-go: ~$0.10-0.20 per resume
  - Volume discounts available
- **Pros**: 
  - Purpose-built for CV parsing
  - Reliable, consistent output
  - No JSON parsing issues
  - Excellent documentation
- **Cons**: 
  - Paid service (no free tier)
  - Requires API integration
- **API**: REST API, easy integration
- **Website**: https://www.affinda.com/

---

### 2. **Sovren Resume Parser** ⭐⭐⭐⭐⭐
**Best for Enterprise**

- **Accuracy**: 95%+ with skill extraction
- **Features**:
  - Very detailed parsing (skills, experience, education, certifications)
  - Skill normalization and matching
  - Resume scoring and ranking
  - ATS-compatible output
- **Pricing**: 
  - Enterprise pricing (contact for quotes)
  - Usually $0.15-0.30 per resume
- **Pros**: 
  - Most comprehensive parsing
  - Excellent for large-scale ATS systems
  - Very reliable
- **Cons**: 
  - Expensive
  - May be overkill for smaller operations
- **Website**: https://sovren.com/

---

### 3. **RChilli Resume Parser** ⭐⭐⭐⭐
**Best for Cost-Effective Enterprise**

- **Accuracy**: 90-95%
- **Features**:
  - Good parsing accuracy
  - Skill extraction and normalization
  - Multi-language support
  - REST API
- **Pricing**: 
  - Competitive pricing
  - ~$0.08-0.15 per resume
- **Pros**: 
  - Good balance of cost and accuracy
  - Reliable service
- **Cons**: 
  - Slightly lower accuracy than Affinda/Sovren
- **Website**: https://www.rchilli.com/

---

### 4. **Herizon Resume Parser** ⭐⭐⭐⭐
**Best for Simple Integration**

- **Accuracy**: 90%+
- **Features**:
  - Simple REST API
  - JSON output (no parsing needed)
  - GDPR compliant
  - Human-like formatting
- **Pricing**: 
  - Pay-as-you-go model
  - Competitive pricing
- **Pros**: 
  - Very easy to integrate
  - Clean JSON output
  - No post-processing needed
- **Cons**: 
  - Less feature-rich than competitors
- **Website**: https://resumeparser.herizon.io/

---

### 5. **Airparser** ⭐⭐⭐
**Best for Multi-Format Parsing**

- **Features**:
  - Uses GPT technology
  - Handles emails, PDFs, images
  - 60+ languages
  - Zapier integrations
- **Pricing**: 
  - Subscription-based
  - Various tiers
- **Pros**: 
  - Good for varied document types
  - Integrations available
- **Cons**: 
  - Less specialized for CVs
  - May have similar issues to Gemini
- **Website**: https://airparser.com/

---

## AI Model Alternatives (Current Category)

### Google Gemini 2.0 Flash (Current)
- **Accuracy**: Variable (80-90% when working)
- **Pricing**: Free tier available, then pay-as-you-go
- **Issues**: 
  - JSON parsing reliability issues
  - Malformed date fields
  - Requires extensive error handling
- **Pros**: 
  - Already integrated
  - Free tier available
  - Fast responses
- **Cons**: 
  - Unreliable JSON output
  - Requires cleaning/sanitization

---

### OpenAI GPT-4 Turbo with JSON Mode
**Better AI Alternative**

- **Accuracy**: 90-95% with structured output
- **Features**:
  - `response_format: { type: "json_object" }` - guaranteed valid JSON
  - Better at following instructions
  - More reliable than Gemini for structured data
- **Pricing**: 
  - ~$0.01 per 1K input tokens
  - ~$0.03 per 1K output tokens
  - Approx $0.02-0.05 per CV (cheaper than dedicated APIs)
- **Pros**: 
  - Guaranteed valid JSON (no parsing issues)
  - More reliable than Gemini
  - Flexible and customizable
  - Cost-effective for low-medium volume
- **Cons**: 
  - Still not purpose-built for CVs
  - Requires good prompt engineering
- **API**: OpenAI API with JSON mode

---

### Anthropic Claude 3.5 Sonnet
**Best AI Model for Structured Extraction**

- **Accuracy**: 92-95%
- **Features**:
  - Excellent at structured data extraction
  - Very reliable JSON output
  - Better instruction following than Gemini
- **Pricing**: 
  - ~$0.003 per 1K input tokens
  - ~$0.015 per 1K output tokens
  - Approx $0.015-0.03 per CV
- **Pros**: 
  - Most reliable AI model for structured output
  - Cost-effective
  - Great accuracy
- **Cons**: 
  - Still not purpose-built for CVs
  - Requires prompt engineering
- **API**: Anthropic API

---

## Recommendation by Use Case

### **Small-Medium Volume (< 1000 resumes/month)**
**Recommended**: **OpenAI GPT-4 Turbo with JSON Mode**
- Cost-effective ($0.02-0.05 per CV)
- Guaranteed valid JSON
- Reliable and flexible
- Easy to integrate

### **Medium-High Volume (1000-10000 resumes/month)**
**Recommended**: **Affinda Resume Parser**
- Purpose-built for CVs
- No parsing issues
- Consistent output
- Good pricing at volume

### **Enterprise/Large Volume (10000+ resumes/month)**
**Recommended**: **Sovren Resume Parser**
- Most comprehensive parsing
- Best accuracy
- Enterprise support
- ATS integration

### **Current Situation (Fixing Gemini)**
**Short-term**: Keep improving Gemini error handling
**Long-term**: Switch to **Affinda** or **GPT-4 Turbo with JSON Mode**

---

## Migration Path Options

### Option 1: Switch to Affinda (Recommended)
```typescript
// Simple REST API call
const response = await fetch('https://api.affinda.com/v3/resumes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AFFINDA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    file: base64EncodedCV,
    // Optional: job description for matching
  })
});

const parsed = await response.json();
// Guaranteed clean JSON, no parsing issues
```

**Pros**: 
- Zero parsing issues
- Purpose-built
- Reliable

**Cons**: 
- Additional cost (~$0.10-0.20 per CV)
- External dependency

---

### Option 2: Switch to GPT-4 Turbo with JSON Mode
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }, // Guaranteed valid JSON
  temperature: 0.1
});

const parsed = JSON.parse(response.choices[0].message.content);
// Guaranteed valid JSON
```

**Pros**: 
- Guaranteed valid JSON (no parsing issues)
- Cheaper than dedicated APIs ($0.02-0.05 per CV)
- Already using AI, just switching models

**Cons**: 
- Still requires good prompts
- Not purpose-built for CVs

---

### Option 3: Hybrid Approach
- Use **Affinda** for production (reliability)
- Keep **Gemini** as fallback or for testing
- Or use **GPT-4** as primary, **Affinda** as validation

---

## Cost Comparison (per 1000 CVs)

| Service | Cost per 1000 CVs | Accuracy | JSON Reliability |
|---------|-------------------|----------|------------------|
| Gemini 2.0 Flash | $0-5 (free tier) | 80-90% | ❌ Unreliable |
| GPT-4 Turbo | $20-50 | 90-95% | ✅ Guaranteed |
| Claude 3.5 Sonnet | $15-30 | 92-95% | ✅ Reliable |
| Affinda | $100-200 | 95%+ | ✅ Guaranteed |
| Sovren | $150-300 | 95%+ | ✅ Guaranteed |
| RChilli | $80-150 | 90-95% | ✅ Guaranteed |

---

## My Recommendation

**For CoreFlowHR:**

1. **Short-term** (next 2 weeks):
   - Keep improving Gemini error handling (current work)
   - Add retry logic with exponential backoff
   - Consider GPT-4 Turbo as a temporary fix

2. **Long-term** (next month):
   - **Switch to Affinda Resume Parser** for production reliability
   - Keep AI models for scoring/analysis, not parsing
   - The cost (~$0.10-0.20 per CV) is worth the reliability

3. **Why Affinda over GPT-4?**
   - Purpose-built for CVs (better accuracy)
   - Zero JSON parsing issues
   - Better skill extraction
   - More reliable for production
   - Cost is reasonable for the value

---

## Integration Example (Affinda)

```typescript
// services/affindaService.ts
export const parseCVWithAffinda = async (
  cvFile: File, 
  jobSkills?: string[]
): Promise<ParsedCVData> => {
  const formData = new FormData();
  formData.append('file', cvFile);
  
  if (jobSkills && jobSkills.length > 0) {
    formData.append('jobDescription', jobSkills.join(', '));
  }

  const response = await fetch('https://api.affinda.com/v3/resumes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_AFFINDA_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Affinda API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Map Affinda response to your ParsedCVData format
  return {
    name: data.data.name?.first || data.data.name?.raw || null,
    email: data.data.email || null,
    phone: data.data.phoneNumbers?.[0] || null,
    location: data.data.location?.formatted || null,
    skills: data.data.skills?.map((s: any) => s.name) || [],
    experienceYears: data.data.totalYearsExperience || null,
    workExperience: data.data.workExperience?.map((exp: any) => ({
      role: exp.jobTitle || '',
      company: exp.organization || '',
      startDate: exp.dates?.startDate || null,
      endDate: exp.dates?.endDate || null,
      period: `${exp.dates?.startDate || ''} - ${exp.dates?.endDate || 'Present'}`,
      description: exp.summary || null
    })) || [],
    projects: data.data.sections?.projects || [],
    portfolioUrls: {
      github: data.data.websites?.find((w: any) => w.includes('github')) || null,
      linkedin: data.data.profiles?.find((p: any) => p.network === 'LinkedIn')?.url || null,
      portfolio: data.data.websites?.find((w: any) => w.includes('portfolio') || w.includes('personal')) || null,
      website: data.data.websites?.[0] || null
    }
  };
};
```

---

## Next Steps

1. **Test Affinda** with a free trial (if available) or small batch
2. **Compare accuracy** vs current Gemini implementation
3. **Calculate cost impact** based on expected volume
4. **Plan migration** timeline if switching makes sense
5. **Keep AI models** for candidate scoring/analysis (not parsing)

Would you like me to:
- Set up an Affinda integration?
- Implement GPT-4 Turbo as an interim solution?
- Continue improving Gemini error handling?




