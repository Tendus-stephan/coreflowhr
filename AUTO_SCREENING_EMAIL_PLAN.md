# Automatic Screening Email with CV Upload Link - Implementation Plan

## Overview
When a candidate is moved from "New" (waitlist) stage to "Screening" stage, automatically send them a screening email template that includes a link to upload their CV for the specific job.

## 🎯 Key Feature: Smart Link Injection (No Forced Template Changes)

**The CV upload link is ALWAYS included**, regardless of whether users modify their email templates. This ensures the link appears without requiring users to manually add variables to their templates.

### How It Works:
1. **If user adds `{cv_upload_link}` to their template**: 
   - The link appears exactly where they placed the variable
   - Link is formatted as clickable HTML anchor tag
   - Full customization control

2. **If user doesn't modify template** (most common case):
   - The link is automatically appended at the **very bottom** with message: "Please kindly follow the link below to upload your CV:"
   - Link is formatted as clickable HTML anchor tag
   - Works immediately with existing templates
   - No action required from user

### Link Formatting:
- All links are formatted as clickable HTML: `<a href="..." style="color: #2563eb; text-decoration: underline;">link</a>`
- The send-email function also converts plain URLs to clickable links as a fallback
- Links will be clickable in all email clients

### Code Logic:
```typescript
// After replacing other variables
// Format link as clickable HTML anchor tag
const clickableLink = `<a href="${cvUploadLink}" style="color: #2563eb; text-decoration: underline;">${cvUploadLink}</a>`;
const linkSection = `\n\nPlease kindly follow the link below to upload your CV:\n${clickableLink}`;

if (content.includes('{cv_upload_link}')) {
  // User customized - replace variable with clickable link
  content = content.replace(/{cv_upload_link}/g, clickableLink);
} else {
  // User didn't customize - append link section at the bottom
  content = content + linkSection;
}
```

**Benefits:**
- ✅ Works with existing templates immediately
- ✅ No forced template updates
- ✅ Users can customize link position if desired
- ✅ Minimal code changes
- ✅ Backward compatible

## Current State

### Stage Change Detection
- **Location**: `services/api.ts` → `api.candidates.update()`
- **When**: Candidate stage is updated via `api.candidates.update(candidateId, { stage: 'Screening' })`
- **Current Behavior**: Creates a notification when stage changes
- **Missing**: No automatic email sending when moving to Screening stage

### Email Templates
- **Location**: `email_templates` table in database
- **Template Type**: `'screening'` or `'Sourcing'`
- **Variables Available**: `{candidate_name}`, `{job_title}`, `{company_name}`
- **Missing**: `{cv_upload_link}` variable for CV upload URL

### CV Upload Page
- **Location**: `pages/JobApplication.tsx`
- **Route**: `/jobs/apply/:jobId`
- **Current**: Public page, doesn't require authentication
- **Missing**: Support for pre-filling candidate email/name via URL parameters or token

## Implementation Plan

### Phase 1: Generate Secure CV Upload Link

#### Option A: Token-Based (More Secure) ✅ RECOMMENDED
**Pros:**
- Secure (can't be guessed)
- Can expire after a set time
- Can be single-use
- Tracks which candidate used the link

**Implementation:**
1. Generate a unique token when candidate moves to Screening
2. Store token in database (new `candidate_tokens` table or add to `candidates` table)
3. Include token in email link: `{FRONTEND_URL}/jobs/apply/:jobId?token=:token`
4. Validate token when candidate accesses the page
5. Pre-fill candidate info if valid

**Database Schema:**
```sql
-- Add to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_upload_token TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_upload_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Or create separate table for tokens
CREATE TABLE IF NOT EXISTS candidate_cv_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_candidate_cv_tokens_token ON candidate_cv_tokens(token);
CREATE INDEX idx_candidate_cv_tokens_candidate_id ON candidate_cv_tokens(candidate_id);
```

#### Option B: Email + Job ID (Less Secure)
**Pros:**
- Simpler implementation
- No token generation needed

**Cons:**
- Anyone with email can access
- No expiration
- Can't track usage easily

**Implementation:**
- Link format: `{FRONTEND_URL}/jobs/apply/:jobId?email=:email`
- Validate email matches job application

### Phase 2: Smart Link Injection Strategy

#### Flexible Template Variable Handling

**Approach: Auto-Append with Optional Replacement**

Instead of forcing users to add `{cv_upload_link}` to their templates, we'll use a smart approach:

1. **If `{cv_upload_link}` exists in template**: Replace it with the actual link (users can customize position)
2. **If `{cv_upload_link}` doesn't exist**: Automatically append the link at the end

**Benefits:**
- ✅ Users can customize link position by adding `{cv_upload_link}` anywhere
- ✅ Users who don't modify templates still get the link automatically
- ✅ No forced template updates
- ✅ Works with existing templates immediately
- ✅ Minimal code changes

**Implementation Logic:**
```typescript
// After replacing all other template variables:
let finalContent = templateContent
    .replace(/{candidate_name}/g, candidateName)
    .replace(/{job_title}/g, jobTitle)
    .replace(/{company_name}/g, companyName);

// Smart link injection - always at bottom with clickable HTML link
const cvUploadLink = `${frontendUrl}/jobs/apply/${jobId}?token=${token}`;
// Format as clickable HTML anchor tag for proper email rendering
const clickableLink = `<a href="${cvUploadLink}" style="color: #2563eb; text-decoration: underline;">${cvUploadLink}</a>`;
const linkSection = `\n\nPlease kindly follow the link below to upload your CV:\n${clickableLink}`;

if (finalContent.includes('{cv_upload_link}')) {
    // User has added the variable - replace it with clickable link
    finalContent = finalContent.replace(/{cv_upload_link}/g, clickableLink);
} else {
    // User hasn't added it - append link section at the bottom
    finalContent = finalContent + linkSection;
}
```

**Result:**
- Custom templates with `{cv_upload_link}`: Link appears exactly where user placed it
- Default/unchanged templates: Link automatically appended at the end
- Both scenarios work seamlessly without requiring user action

### Phase 3: Auto-Send Email on Stage Change

#### Modify `api.candidates.update()` in `services/api.ts`

**Location**: `services/api.ts` → `api.candidates.update()` (around line 1581)

**Changes Needed:**
1. Check if stage is changing to 'Screening'
2. Check if old stage was 'New' (only send for New → Screening transition)
3. Skip if candidate is test candidate (`is_test = true`)
4. Get candidate's job details
5. Get screening email template from database
6. Generate CV upload token/link
7. Replace template variables (including `{cv_upload_link}`)
8. Send email via `send-email` edge function

**Code Structure:**
```typescript
// In api.candidates.update(), after stage update succeeds:

if (updates.stage === 'Screening' && oldStage === 'New') {
  // Get candidate and job details
  const { data: candidateData } = await supabase
    .from('candidates')
    .select(`
      id,
      name,
      email,
      job_id,
      is_test,
      jobs!inner (
        id,
        title,
        user_id,
        profiles!jobs_user_id_fkey (
          name
        )
      )
    `)
    .eq('id', candidateId)
    .single();

  // Skip test candidates
  if (!candidateData.is_test && candidateData.email) {
    // Generate CV upload token
    const token = generateSecureToken(); // 32-char random string
    
    // Store token in database (expires in 30 days)
    await supabase
      .from('candidates')
      .update({
        cv_upload_token: token,
        cv_upload_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', candidateId);

    // Get screening email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'Sourcing')
      .single();

    // Build CV upload link
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const cvUploadLink = `${frontendUrl}/jobs/apply/${candidateData.job_id}?token=${token}`;

    // Replace template variables
    let subject = template.subject
      .replace(/{candidate_name}/g, candidateData.name)
      .replace(/{job_title}/g, candidateData.jobs.title)
      .replace(/{company_name}/g, candidateData.jobs.profiles.name || 'Our Company');

    // Build CV upload link
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const cvUploadLink = `${frontendUrl}/jobs/apply/${candidateData.job_id}?token=${token}`;

    // Replace standard variables
    let content = template.content
      .replace(/{candidate_name}/g, candidateData.name)
      .replace(/{job_title}/g, candidateData.jobs.title)
      .replace(/{company_name}/g, candidateData.jobs.profiles.name || 'Our Company');

    // Smart link injection: Always append at bottom with clickable HTML link
    // Format link as clickable HTML anchor tag
    const clickableLink = `<a href="${cvUploadLink}" style="color: #2563eb; text-decoration: underline;">${cvUploadLink}</a>`;
    const linkSection = `\n\nPlease kindly follow the link below to upload your CV:\n${clickableLink}`;
    
    if (content.includes('{cv_upload_link}')) {
      // User has placed the variable - replace it with clickable link
      content = content.replace(/{cv_upload_link}/g, clickableLink);
    } else {
      // Variable not found - append link section at the bottom
      content = content + linkSection;
    }

    // Send email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: candidateData.email,
        subject: subject,
        content: content,
        fromName: candidateData.jobs.profiles.name || 'Coreflow'
      }
    });

    if (emailError) {
      console.error('Error sending screening email:', emailError);
      // Don't fail the update if email fails
    }
  }
}
```

### Phase 4: Update JobApplication Page

#### Support Token Validation and Pre-filling

**Location**: `pages/JobApplication.tsx`

**Changes Needed:**
1. Check for `token` in URL query parameters
2. If token exists, validate it against database
3. If valid, pre-fill candidate email and name (but still allow editing)
4. Show a message like "We've pre-filled your information. Please upload your CV to complete your application."
5. If token is invalid/expired, show error but still allow manual application

**Implementation:**
```typescript
// In JobApplication.tsx useEffect:

useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  if (token && jobId) {
    // Validate token and get candidate info
    validateTokenAndPrefill(token, jobId);
  }
}, [jobId]);

const validateTokenAndPrefill = async (token: string, jobId: string) => {
  try {
    // Call API to validate token and get candidate info
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, email, cv_upload_token, cv_upload_token_expires_at, job_id')
      .eq('cv_upload_token', token)
      .eq('job_id', jobId)
      .single();

    if (error || !data) {
      setPrefillError('Invalid or expired link. You can still apply manually.');
      return;
    }

    // Check expiration
    if (new Date(data.cv_upload_token_expires_at) < new Date()) {
      setPrefillError('This link has expired. You can still apply manually.');
      return;
    }

    // Pre-fill form
    setFormData({
      ...formData,
      name: data.name || '',
      email: data.email || ''
    });

    setPrefillMessage('We\'ve pre-filled your information. Please upload your CV to complete your application.');
  } catch (error) {
    console.error('Error validating token:', error);
    setPrefillError('Unable to validate link. You can still apply manually.');
  }
};
```

#### Update API to Handle Existing Candidates
When a candidate with a token submits their CV:
1. Mark token as used (update `cv_upload_token_used_at` or remove token)
2. Update existing candidate record with CV
3. Keep them in Screening stage (don't change stage since they're already there)

### Phase 5: Token Management

#### Helper Functions
Create utility functions for token management:

```typescript
// services/tokenUtils.ts

export function generateSecureToken(): string {
  // Generate 32-character random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateCvUploadToken(
  token: string, 
  jobId: string
): Promise<{ valid: boolean; candidateId?: string; error?: string }> {
  // Validate token, expiration, and job match
  // Return candidate info if valid
}
```

## Implementation Steps

### Step 1: Database Migration
1. Add `cv_upload_token` and `cv_upload_token_expires_at` to `candidates` table
2. Or create `candidate_cv_tokens` table (recommended for audit trail)

### Step 2: Token Generation Utility
1. Create `services/tokenUtils.ts` with token generation/validation functions

### Step 3: Update Email Template Default
1. Update default screening template to include `{cv_upload_link}` variable

### Step 4: Modify Candidate Update API
1. Add auto-email logic to `api.candidates.update()` when stage changes to Screening
2. Generate token, get template, replace variables, send email

### Step 5: Update JobApplication Page
1. Add token validation logic
2. Pre-fill candidate info if token is valid
3. Show appropriate messages

### Step 6: Environment Variables
1. Ensure `FRONTEND_URL` or `VITE_FRONTEND_URL` is set
2. Use this for building CV upload links

## Security Considerations

1. **Token Expiration**: Tokens should expire after 30 days (configurable)
2. **Single Use**: Optionally mark tokens as used after first CV submission
3. **Job Validation**: Validate token matches the job ID
4. **Email Validation**: Still validate email matches when CV is submitted
5. **Rate Limiting**: Consider rate limiting token generation to prevent abuse

## Testing Checklist

- [ ] Token is generated when candidate moves to Screening
- [ ] Email is sent with correct CV upload link
- [ ] Link includes token and job ID
- [ ] Token validation works correctly
- [ ] Pre-filling works on JobApplication page
- [ ] Expired tokens show error but allow manual application
- [ ] Invalid tokens show error but allow manual application
- [ ] Test candidates don't receive emails
- [ ] Email template variables are replaced correctly
- [ ] CV upload still works for candidates with tokens
- [ ] Token is marked as used after submission (if single-use)

## Future Enhancements

1. **Token Analytics**: Track how many candidates use the link
2. **Resend Link**: Allow resending CV upload link from candidate modal
3. **Custom Expiration**: Allow users to set token expiration per template
4. **Link Preview**: Show when link was sent and last accessed
5. **Multiple Tokens**: Allow generating new tokens if old one expires

---

## Recommended Approach: Token-Based (Option A)

**Why:**
- More secure (can't be guessed)
- Better tracking
- Expiration control
- Audit trail
- Professional implementation

**Next Steps:**
1. Start with token-based implementation
2. Use separate `candidate_cv_tokens` table for better audit trail
3. Set 30-day expiration as default
4. Mark tokens as used after first submission (optional but recommended)









