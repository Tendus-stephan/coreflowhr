# Complete Workflow Explanation

## Current System Workflow

### 1. **Candidate Sourcing Phase** 🎯

**What Happens:**
- Job is posted and scraping begins
- Candidates are sourced from LinkedIn (via Apify)
- Candidates are saved to database with:
  - ✅ Portfolio data (LinkedIn links, work experience, education)
  - ✅ AI analysis and overview
  - ❌ **NO EMAIL** (candidates don't have emails by default - this is expected)

**Stage:** All sourced candidates start in **"New"** stage

**Email Status:** ❌ No emails sent automatically (by design)

---

### 2. **LinkedIn Outreach Phase** 💬

**When:** Recruiter views candidate in CandidateModal

**What Happens:**
- If candidate has no email → **Outreach section** appears in Email tab
- Recruiter clicks **"Generate Outreach Message"**
- System:
  1. Generates secure registration token
  2. Creates registration link: `/candidates/register/{candidateId}?token={token}`
  3. AI generates LinkedIn message with registration link
  4. Recruiter copies message and pastes to LinkedIn manually

**Registration Link Contains:**
- Token for security (one-time use, expires in 30 days)
- Candidate ID for identification

---

### 3. **Candidate Registration Phase** 📝

**When:** Candidate receives LinkedIn message and clicks registration link

**What Happens:**
- Candidate lands on registration page
- System validates token (exists, not expired, not used)
- Candidate enters email address
- System:
  1. Stores email in `candidates.email`
  2. Marks token as used
  3. **Moves candidate to "Screening" stage** (from "New")
  4. **Triggers Screening workflow** → Sends email with CV upload link

**Result:** 
- Candidate now has email ✅
- Candidate is in "Screening" stage ✅
- Screening email sent with CV upload link ✅

---

### 4. **CV Upload Phase** 📄

**When:** Candidate receives Screening email and clicks CV upload link

**What Happens:**
- Candidate clicks CV upload link in Screening email
- Link format: `/jobs/apply/{jobId}?token={cvUploadToken}`
- Candidate uploads CV file
- System processes CV and stores it
- Candidate remains in "Screening" stage (already moved there during registration)

**Note:** CV upload can also happen via direct application (`/jobs/apply/:jobId` without token), which also moves candidates to Screening.

---

### 5. **Stage-Based Email Workflows** 📧

**Available Stages:**
- ❌ **"New"** - DISABLED (no automatic emails)
- ✅ **"Screening"** - Triggers when candidate moves to Screening
- ❌ **"Interview"** - DISABLED (interviews are manually scheduled)
- ✅ **"Offer"** - Triggers when candidate moves to Offer
- ✅ **"Hired"** - Triggers when candidate moves to Hired
- ✅ **"Rejected"** - Triggers when candidate moves to Rejected

**How It Works:**
1. Recruiter moves candidate from one stage to another
2. System checks if candidate has email
3. If email exists → Finds enabled workflow for that stage → Sends email
4. If no email → Workflow skipped with log: "Candidate does not have email (default state)"

---

## "New" Stage Workflow Status

### Current Behavior:
- ❌ **"New" stage workflows DO NOT trigger automatically**
- ✅ They are **disabled/skipped** in the workflow engine
- ⚠️ But they **can still be created** in Settings (this is inconsistent)

### Should "New" Trigger Anything?

**Answer: NO** - Here's why:

1. **Candidates don't have emails by default** - Can't send emails without email addresses
2. **LinkedIn outreach is the method** - First contact happens via LinkedIn, not email
3. **Registration happens AFTER outreach** - Email is collected during registration
4. **Emails start at Screening stage** - Once candidate has email, workflows can trigger at later stages

### Recommendation:

**Option A: Remove "New" from Trigger Stage Options** (Recommended)
- Hide "New" from the dropdown in workflow builder
- Prevents confusion
- Clear that "New" stage doesn't trigger emails

**Option B: Keep "New" but Show Warning**
- Allow creating "New" workflows but show warning: "New stage workflows are disabled - emails are not sent automatically"
- Less clear, more confusing

**Option C: Keep for Manual Execution Only**
- Allow creating "New" workflows for manual execution later (via API or future feature)
- Still confusing since auto-trigger is disabled

---

## Complete Flow Diagram

```
Job Posted
    ↓
Scraping Begins
    ↓
Candidates Saved (email: null, stage: "New")
    ↓
[NO AUTOMATIC EMAILS - "New" stage workflows disabled]
    ↓
Recruiter Opens Candidate Modal
    ↓
Outreach Section Appears (candidate.email is null)
    ↓
Recruiter Generates Outreach Message
    ↓
Token Generated → Registration Link Created
    ↓
Recruiter Copies Message → Pastes to LinkedIn
    ↓
Candidate Clicks Link → Registration Page
    ↓
Candidate Enters Email → Email Stored + Moved to "Screening"
    ↓
Screening Workflow Triggers → Email with CV Upload Link Sent ✅
    ↓
Candidate Clicks CV Upload Link → Uploads CV
    ↓
CV Processed → Candidate Ready for Screening
    ↓
[Subsequent stage changes trigger their respective workflows]
```

---

## Summary

**"New" Stage Workflows:**
- ❌ **DO NOT trigger automatically** (disabled in workflow engine)
- ❌ **Should not be used** for automatic emails (candidates have no email)
- ✅ **LinkedIn outreach is the correct method** for contacting new candidates
- ⚠️ **Can still be created** but won't execute (inconsistent UX)

**Recommendation:** Remove "New" from trigger stage dropdown to prevent confusion.
