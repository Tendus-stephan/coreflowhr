# CV Upload Implementation Plan

## Recommended Approach: Direct Upload + Optional Email

### Phase 1: Public Job Application Page (Primary Method)
**Route:** `/jobs/apply/:jobId`

#### Features:
1. **Public Access** - No authentication required for candidates
2. **Job Details Display** - Show job title, company, location, description
3. **Application Form:**
   - Name (required)
   - Email (required)
   - Phone (optional)
   - Cover Letter (optional text area)
   - CV Upload:
     - Drag & drop area
     - File picker button
     - Support: PDF, DOC, DOCX
     - Max file size: 5MB
     - Preview before submit
4. **Submit & Confirmation** - Thank you page with application confirmation

#### Technical Implementation:
- **Frontend:** `pages/JobApplication.tsx` (public route)
- **File Upload:** Use Supabase Storage for CV files
- **CV Parsing:** 
  - Store raw file in Supabase Storage
  - Parse CV using a service (PDF.js for PDF, or Edge Function)
  - Extract: name, email, skills, experience, education, etc.
- **Candidate Creation:**
  - Auto-create candidate in database
  - Link to job via `job_id`
  - Calculate AI match score based on extracted data
  - Set stage based on match score (>=65 = Screening, <65 = New)
- **Notifications:** Notify recruiter of new application

### Phase 2: Email Support (Secondary Method - Optional)
**If needed later:**
- Set up email parsing (e.g., using Supabase Edge Function + email service)
- Parse CV attachments from emails
- Auto-create candidates from email applications

## Database Schema Updates Needed:

```sql
-- Add CV file storage reference and source tracking to candidates table
ALTER TABLE candidates 
ADD COLUMN cv_file_url TEXT,
ADD COLUMN cv_file_name TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN cover_letter TEXT,
ADD COLUMN source TEXT CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral')) DEFAULT 'ai_sourced',
ADD COLUMN is_test BOOLEAN DEFAULT false;

-- Update existing AI-sourced candidates to be marked as test
UPDATE candidates 
SET source = 'ai_sourced', is_test = true 
WHERE ai_analysis LIKE '%TEST CANDIDATE%' OR ai_analysis LIKE '%(TEST CANDIDATE)%';

-- Create storage bucket for CVs (in Supabase Storage)
-- Bucket: 'candidate-cvs'
-- Public: false (private)
```

## Candidate Source Types:

1. **`ai_sourced`** - AI-generated test candidates (from sourcing)
   - `is_test = true`
   - Should NOT receive emails
   - Used for demo/testing

2. **`direct_application`** - Real candidates who applied via CV upload
   - `is_test = false`
   - SHOULD receive emails
   - Have actual CV files

3. **`email_application`** - Real candidates who applied via email (future)
   - `is_test = false`
   - SHOULD receive emails

4. **`referral`** - Candidates added manually or via referral (future)
   - `is_test = false`
   - SHOULD receive emails

## Storage Structure:
```
candidate-cvs/
  {job_id}/
    {candidate_id}/
      resume.pdf
```

## API Changes Needed:

1. **New Public API Endpoint:**
   - `api.candidates.apply(jobId, formData, cvFile)` - Public endpoint for applications
   - Handles file upload, CV parsing, candidate creation
   - No authentication required

2. **CV Parsing Service:**
   - Edge Function: `parse-cv`
   - Extracts text from PDF/DOC
   - Uses AI/Regex to extract structured data
   - Returns: name, email, skills, experience, etc.

3. **Update Candidate Creation:**
   - Support CV file URL and metadata
   - Calculate match score from parsed CV data
   - **Mark source as `direct_application` and `is_test = false`** for real applicants
   - Handle both AI-generated (`ai_sourced`, `is_test = true`) and real CV submissions (`direct_application`, `is_test = false`)

4. **Email Sending Logic:**
   - **CRITICAL:** Only send emails to candidates where `is_test = false`
   - Check `candidate.is_test` before sending any email (interview, screening, rejection, offer)
   - This prevents sending emails to AI-generated test candidates

## User Flow:

### For Candidates:
1. Visit job application page (via link shared or found on job board)
2. Fill out application form
3. Upload CV (drag & drop or browse)
4. Submit application
5. See confirmation page

### For Recruiters:
1. Receive notification of new application
2. See candidate in candidate board
3. CV accessible in candidate profile
4. AI match score calculated automatically
5. Can review parsed CV data

## Implementation Priority:

### MVP (Minimum Viable Product):
✅ Public application page
✅ CV upload (PDF only)
✅ Basic CV text extraction
✅ Candidate creation with file reference
✅ Simple skill extraction for match scoring

### Future Enhancements:
- DOC/DOCX support
- Advanced CV parsing (structured extraction)
- Email application support
- Application status tracking for candidates
- Thank you email to candidates

## File Structure:
```
pages/
  JobApplication.tsx          # Public application page
services/
  cvParser.ts                 # CV parsing utilities
supabase/
  functions/
    parse-cv/                 # Edge function for CV parsing
    submit-application/       # Edge function for application submission
  storage/
    candidate-cvs/            # Storage bucket
```


## Recommended Approach: Direct Upload + Optional Email

### Phase 1: Public Job Application Page (Primary Method)
**Route:** `/jobs/apply/:jobId`

#### Features:
1. **Public Access** - No authentication required for candidates
2. **Job Details Display** - Show job title, company, location, description
3. **Application Form:**
   - Name (required)
   - Email (required)
   - Phone (optional)
   - Cover Letter (optional text area)
   - CV Upload:
     - Drag & drop area
     - File picker button
     - Support: PDF, DOC, DOCX
     - Max file size: 5MB
     - Preview before submit
4. **Submit & Confirmation** - Thank you page with application confirmation

#### Technical Implementation:
- **Frontend:** `pages/JobApplication.tsx` (public route)
- **File Upload:** Use Supabase Storage for CV files
- **CV Parsing:** 
  - Store raw file in Supabase Storage
  - Parse CV using a service (PDF.js for PDF, or Edge Function)
  - Extract: name, email, skills, experience, education, etc.
- **Candidate Creation:**
  - Auto-create candidate in database
  - Link to job via `job_id`
  - Calculate AI match score based on extracted data
  - Set stage based on match score (>=65 = Screening, <65 = New)
- **Notifications:** Notify recruiter of new application

### Phase 2: Email Support (Secondary Method - Optional)
**If needed later:**
- Set up email parsing (e.g., using Supabase Edge Function + email service)
- Parse CV attachments from emails
- Auto-create candidates from email applications

## Database Schema Updates Needed:

```sql
-- Add CV file storage reference and source tracking to candidates table
ALTER TABLE candidates 
ADD COLUMN cv_file_url TEXT,
ADD COLUMN cv_file_name TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN cover_letter TEXT,
ADD COLUMN source TEXT CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral')) DEFAULT 'ai_sourced',
ADD COLUMN is_test BOOLEAN DEFAULT false;

-- Update existing AI-sourced candidates to be marked as test
UPDATE candidates 
SET source = 'ai_sourced', is_test = true 
WHERE ai_analysis LIKE '%TEST CANDIDATE%' OR ai_analysis LIKE '%(TEST CANDIDATE)%';

-- Create storage bucket for CVs (in Supabase Storage)
-- Bucket: 'candidate-cvs'
-- Public: false (private)
```

## Candidate Source Types:

1. **`ai_sourced`** - AI-generated test candidates (from sourcing)
   - `is_test = true`
   - Should NOT receive emails
   - Used for demo/testing

2. **`direct_application`** - Real candidates who applied via CV upload
   - `is_test = false`
   - SHOULD receive emails
   - Have actual CV files

3. **`email_application`** - Real candidates who applied via email (future)
   - `is_test = false`
   - SHOULD receive emails

4. **`referral`** - Candidates added manually or via referral (future)
   - `is_test = false`
   - SHOULD receive emails

## Storage Structure:
```
candidate-cvs/
  {job_id}/
    {candidate_id}/
      resume.pdf
```

## API Changes Needed:

1. **New Public API Endpoint:**
   - `api.candidates.apply(jobId, formData, cvFile)` - Public endpoint for applications
   - Handles file upload, CV parsing, candidate creation
   - No authentication required

2. **CV Parsing Service:**
   - Edge Function: `parse-cv`
   - Extracts text from PDF/DOC
   - Uses AI/Regex to extract structured data
   - Returns: name, email, skills, experience, etc.

3. **Update Candidate Creation:**
   - Support CV file URL and metadata
   - Calculate match score from parsed CV data
   - **Mark source as `direct_application` and `is_test = false`** for real applicants
   - Handle both AI-generated (`ai_sourced`, `is_test = true`) and real CV submissions (`direct_application`, `is_test = false`)

4. **Email Sending Logic:**
   - **CRITICAL:** Only send emails to candidates where `is_test = false`
   - Check `candidate.is_test` before sending any email (interview, screening, rejection, offer)
   - This prevents sending emails to AI-generated test candidates

## User Flow:

### For Candidates:
1. Visit job application page (via link shared or found on job board)
2. Fill out application form
3. Upload CV (drag & drop or browse)
4. Submit application
5. See confirmation page

### For Recruiters:
1. Receive notification of new application
2. See candidate in candidate board
3. CV accessible in candidate profile
4. AI match score calculated automatically
5. Can review parsed CV data

## Implementation Priority:

### MVP (Minimum Viable Product):
✅ Public application page
✅ CV upload (PDF only)
✅ Basic CV text extraction
✅ Candidate creation with file reference
✅ Simple skill extraction for match scoring

### Future Enhancements:
- DOC/DOCX support
- Advanced CV parsing (structured extraction)
- Email application support
- Application status tracking for candidates
- Thank you email to candidates

## File Structure:
```
pages/
  JobApplication.tsx          # Public application page
services/
  cvParser.ts                 # CV parsing utilities
supabase/
  functions/
    parse-cv/                 # Edge function for CV parsing
    submit-application/       # Edge function for application submission
  storage/
    candidate-cvs/            # Storage bucket
```







