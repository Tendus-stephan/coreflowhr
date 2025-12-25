# Test Gemini Template Generation

## How to Test

1. **Open Settings** → Email Templates tab
2. **Click "Edit"** on any template (Interview, Screening, Rejection, Offer, or Hired)
3. **Click "Generate with AI"** button
4. **Observe the generated template**

## What to Check

### ✅ Variation Test
1. Generate a template (e.g., Interview template)
2. Click "Generate with AI" again
3. **The template should be DIFFERENT** - different wording, structure, or approach
4. Try 3-4 times - each should be unique

### ✅ Intelligence Test
The generated templates should:
- Be contextually appropriate for the template type
- Use professional but varied language
- Have unique subject lines each time
- Vary in structure (some longer, some shorter, different paragraph breaks)
- Include all required variables in the correct format

### ✅ Quality Test
Each template should:
- Sound professional and polished
- Be ready to use (just replace variables)
- Match the tone requirements:
  - **Interview**: Professional, warm, welcoming
  - **Screening**: Engaging, inviting
  - **Rejection**: Respectful, empathetic
  - **Offer**: Excited, welcoming
  - **Hired**: Enthusiastic, informative

## Expected Behavior

### First Generation
- Should generate a unique, professional template
- Subject line should be compelling
- Content should be well-structured

### Second Generation (Same Template Type)
- Should generate a **different** template
- Different subject line wording
- Different email structure/flow
- Different phrasing while maintaining professionalism

### Third Generation
- Should be different again
- Each generation should feel fresh and unique

## Troubleshooting

### If Templates Are Identical
- Check if API key is set correctly
- Check browser console for errors
- Verify temperature settings are applied (should be 0.9)

### If Generation Fails
- Check `VITE_API_KEY` in `.env`
- Verify API key is valid
- Check network connectivity
- Look for errors in browser console

### If Fallback Templates Appear
- API call failed
- Check console for specific error
- Verify Gemini API quota hasn't been exceeded

## Success Indicators

✅ Each generation produces a different template
✅ Templates are professional and contextually appropriate
✅ All variables are included correctly
✅ Subject lines are unique and compelling
✅ Content varies in structure and wording













