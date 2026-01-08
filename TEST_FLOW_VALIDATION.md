# Complete Flow Test Validation Guide

## Pre-Test Setup Checklist

Before running tests, verify:

- [ ] Gemini API key is configured (`VITE_API_KEY`)
- [ ] Test mode is enabled in Settings → Profile
- [ ] Email workflows are created for all stages (Settings → Email Workflows):
  - [ ] New stage workflow
  - [ ] Screening stage workflow
  - [ ] Interview stage workflow
  - [ ] Offer stage workflow
  - [ ] Hired stage workflow
  - [ ] Rejection stage workflow
- [ ] Email templates exist for all workflow types
- [ ] Resend API is configured in Supabase Edge Function secrets
- [ ] Database has `is_test` column in `jobs` table (if not, add it: `ALTER TABLE jobs ADD COLUMN is_test BOOLEAN DEFAULT false;`)

## Test Flow: Complete Journey

### Step 1: Create Test Job

**Action:** Create a new job in test mode

1. Go to Jobs → Post a Job
2. Fill in job details:
   - Title: "Senior Frontend Developer" (will become "[TEST] Senior Frontend Developer")
   - Company, location, description
   - Add required skills: React, TypeScript, JavaScript
   - Set experience level
3. Save as Draft, then activate/publish
4. **Expected Results:**
   - ✅ Job title should have `[TEST]` prefix
   - ✅ Job should have `is_test: true` in database
   - ✅ Test badge should appear (if UI updated)
   - ✅ Console log: `🔵 [Job] Created test job: [TEST] Senior Frontend Developer`

**Verify in Database:**
```sql
SELECT id, title, is_test, status FROM jobs WHERE title LIKE '[TEST]%' ORDER BY created_at DESC LIMIT 1;
```

### Step 2: Generate Test Candidates (AI Sourcing)

**Action:** Source candidates for the test job

1. Navigate to the test job
2. Click "Source Candidates" or trigger sourcing
3. Generate 2-3 test candidates
4. **Expected Results:**
   - ✅ Candidates appear in candidate list
   - ✅ All candidates have `source: 'ai_sourced'`
   - ✅ All candidates have `is_test: true`
   - ✅ All candidates start in "New" stage
   - ✅ Match scores are calculated
   - ✅ Console log: `🤖 [AI] Generated 3 candidates for job: [TEST] Senior Frontend Developer`
   - ✅ Console log: `📧 [Workflow] Executing New stage workflow for candidate: {name}`

**Verify in Database:**
```sql
SELECT id, name, email, source, is_test, stage, ai_match_score 
FROM candidates 
WHERE job_id = '{job_id}' 
ORDER BY created_at DESC;
```

**Verify Email Logs:**
```sql
SELECT id, candidate_id, email_type, sent_at, status 
FROM email_logs 
WHERE candidate_id IN (
  SELECT id FROM candidates WHERE job_id = '{job_id}'
)
ORDER BY sent_at DESC;
```

### Step 3: Verify New Stage Email

**Action:** Check that emails were sent to test candidates

1. Check email logs in database or UI
2. Verify email content includes CV upload link
3. **Expected Results:**
   - ✅ Email logs created for each candidate
   - ✅ Emails contain CV upload link with token
   - ✅ Email template variables replaced correctly
   - ✅ Console log: `✅ [Email] Sent New stage email to {candidate_email}`

**Note:** Test candidates (`is_test: true`) may or may not receive emails depending on workflow configuration.

### Step 4: Upload CV for Candidate

**Action:** Simulate candidate CV upload

1. Use the CV upload link from email (or test directly)
2. Upload a test CV file (PDF or DOCX)
3. Fill in application form
4. Submit application
5. **Expected Results:**
   - ✅ CV file uploaded to Supabase Storage
   - ✅ File path: `{job_id}/{candidate_id}/{timestamp}.{ext}`
   - ✅ Console log: `📄 [CV] Extracting text from CV...`
   - ✅ Console log: `🤖 [AI] Parsing CV with Gemini...`
   - ✅ Console log: `✅ [AI] CV parsed successfully`
   - ✅ Candidate data updated with parsed information
   - ✅ Console log: `🤖 [AI] Generating candidate analysis...`
   - ✅ Match score calculated and saved
   - ✅ Candidate moved to "Screening" stage (if was in "New")

**Verify CV Parsing:**
- Check candidate record has: name, email, phone, skills, experience, work_experience
- Verify `ai_match_score` is set (0-100)
- Verify `ai_analysis` contains summary, strengths, weaknesses

**Verify in Database:**
```sql
SELECT 
  id, name, email, phone, skills, experience, 
  ai_match_score, ai_analysis, stage, cv_file_url
FROM candidates 
WHERE id = '{candidate_id}';
```

### Step 5: Verify Screening Email

**Action:** Check Screening stage workflow

1. Check email logs after CV upload
2. **Expected Results:**
   - ✅ Screening email sent automatically
   - ✅ Email template variables replaced
   - ✅ Console log: `📧 [Workflow] Executing Screening stage workflow`
   - ✅ Console log: `✅ [Email] Sent Screening email to {candidate_email}`

### Step 6: Move Candidate to Interview Stage

**Action:** Manually move candidate to Interview stage

1. Open candidate profile
2. Change stage to "Interview"
3. **Expected Results:**
   - ✅ Stage update succeeds (if workflow exists)
   - ✅ Workflow executed for Interview stage
   - ✅ Interview email sent
   - ✅ Console log: `🔄 [Stage] Moved {candidate_name} from Screening to Interview`
   - ✅ Console log: `📧 [Workflow] Executing Interview stage workflow`
   - ✅ Activity log entry created

**Verify in Database:**
```sql
SELECT stage, updated_at FROM candidates WHERE id = '{candidate_id}';
SELECT * FROM activity_log WHERE target_id = '{candidate_id}' ORDER BY created_at DESC LIMIT 1;
```

### Step 7: Schedule Interview (Optional)

**Action:** Create interview for candidate

1. Go to Calendar or candidate profile
2. Schedule an interview
3. **Expected Results:**
   - ✅ Interview created
   - ✅ Interview email sent (if workflow configured)
   - ✅ Meeting link generated (if Google Meet integration)

### Step 8: Move Candidate to Offer Stage

**Action:** Create offer and move candidate to Offer stage

1. First create an offer for the candidate (Offers page or candidate profile)
2. Move candidate to "Offer" stage
3. **Expected Results:**
   - ✅ Offer stage requires active offer (validation check)
   - ✅ Workflow executed for Offer stage
   - ✅ Offer email sent with offer details
   - ✅ Console log: `📧 [Workflow] Executing Offer stage workflow`
   - ✅ Console log: `✅ [Email] Sent Offer email to {candidate_email}`
   - ✅ Offer details included in email (salary, start date, benefits)

### Step 9: Move Candidate to Hired Stage

**Action:** Move candidate to Hired stage

1. Change candidate stage to "Hired"
2. **Expected Results:**
   - ✅ Stage update succeeds
   - ✅ Hired workflow executed
   - ✅ Hired email sent
   - ✅ Console log: `🎉 [Stage] Moved {candidate_name} to Hired`
   - ✅ Console log: `📧 [Workflow] Executing Hired stage workflow`
   - ✅ Activity log entry created

### Step 10: Test Rejection Flow

**Action:** Move another test candidate to Rejected stage

1. Select a different test candidate
2. Move to "Rejected" stage
3. **Expected Results:**
   - ✅ Rejection email sent
   - ✅ Candidate marked as rejected
   - ✅ Console log: `❌ [Stage] Moved {candidate_name} to Rejected`

## Error Testing

### Test 1: Missing Gemini API Key

**Action:** Temporarily remove/clear API key

1. Clear `VITE_API_KEY` from environment
2. Try to upload CV or generate candidates
3. **Expected Results:**
   - ✅ Clear error message: "Gemini API key not configured"
   - ✅ Error displayed in UI (toast/notification)
   - ✅ Operation fails gracefully (doesn't crash)

### Test 2: Invalid CV File

**Action:** Upload invalid file type

1. Try uploading .txt or .exe file
2. **Expected Results:**
   - ✅ Validation error shown
   - ✅ Error message: "Please upload a PDF or DOCX file"

### Test 3: Missing Workflow

**Action:** Try moving candidate to stage without workflow

1. Delete workflow for a stage
2. Try moving candidate to that stage
3. **Expected Results:**
   - ✅ Error message: "Cannot move candidate to {stage}. Please create an email workflow first."
   - ✅ Stage change prevented

### Test 4: Missing Email Template

**Action:** Delete email template linked to workflow

1. Delete template used by workflow
2. Trigger workflow
3. **Expected Results:**
   - ✅ Error logged: "Email template not found"
   - ✅ Workflow execution fails gracefully
   - ✅ Error message in console/logs

## Console Log Checklist

During testing, you should see these console logs:

- 🔵 Job creation logs
- 🤖 AI candidate generation logs
- 📧 Workflow execution logs
- 📄 CV parsing logs
- 🤖 AI analysis logs
- ✅ Email send confirmations
- 🔄 Stage transition logs
- ❌ Error logs (for error tests)

## Database Verification Queries

Run these queries to verify test data:

```sql
-- Check test jobs
SELECT id, title, is_test, status, created_at 
FROM jobs 
WHERE is_test = true 
ORDER BY created_at DESC;

-- Check test candidates
SELECT id, name, email, source, is_test, stage, ai_match_score 
FROM candidates 
WHERE is_test = true 
ORDER BY created_at DESC;

-- Check email logs for test candidates
SELECT el.id, el.candidate_id, c.name, el.email_type, el.sent_at, el.status
FROM email_logs el
JOIN candidates c ON el.candidate_id = c.id
WHERE c.is_test = true
ORDER BY el.sent_at DESC;

-- Check workflow executions
SELECT we.id, we.workflow_id, we.candidate_id, we.status, we.executed_at
FROM workflow_executions we
JOIN candidates c ON we.candidate_id = c.id
WHERE c.is_test = true
ORDER BY we.executed_at DESC;

-- Check stage transitions (activity log)
SELECT * FROM activity_log 
WHERE action = 'candidate_moved' 
AND target_id IN (SELECT id FROM candidates WHERE is_test = true)
ORDER BY created_at DESC;
```

## Success Criteria

All tests pass if:

- ✅ Jobs are created with `[TEST]` prefix and `is_test: true`
- ✅ Candidates are created with `is_test: true`
- ✅ CV parsing works with Gemini AI (no regex fallback)
- ✅ Candidate scoring works with Gemini AI
- ✅ All stage transitions trigger workflows
- ✅ All emails are sent successfully
- ✅ Email logs are created
- ✅ Workflow executions are logged
- ✅ Activity logs record stage changes
- ✅ Error handling works correctly
- ✅ Test data is clearly labeled
- ✅ Console logs show detailed information
- ✅ No crashes or unhandled errors

## Cleanup After Testing

After testing is complete:

1. Optionally delete test data:
   ```sql
   -- Delete test candidates
   DELETE FROM candidates WHERE is_test = true;
   
   -- Delete test jobs
   DELETE FROM jobs WHERE is_test = true;
   ```

2. Disable test mode in Settings

3. Review logs for any issues

4. Document any bugs or improvements needed




