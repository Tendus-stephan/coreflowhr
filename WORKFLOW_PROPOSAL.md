# CoreFlow Workflow Configuration Proposal

## Overview
This document proposes complete workflow configurations for **Basic Plan (3 workflows)** and **Professional Plan (10 workflows)** to automate the entire candidate pipeline from screening to hired.

---

## 🟦 BASIC PLAN - 3 Essential Workflows

### Workflow 1: Screening - CV Upload Invitation
**Trigger Stage:** `Screening`  
**Template Type:** `Screening`  
**Delay:** 0 minutes (send immediately)  
**Conditions:** None (sends to all candidates who reach Screening)

**What Happens:**
1. Candidate registers via LinkedIn outreach link → moves to `Screening` stage
2. Workflow automatically triggers
3. Email sent with CV upload link: `{cv_upload_link}` placeholder
4. Candidate receives email like:
   ```
   Subject: Next Steps for {job_title} at {company_name}
   
   Hi {candidate_name},
   
   Thank you for your interest in the {job_title} position at {company_name}.
   
   Please follow the link below to upload your CV:
   [Clickable CV Upload Link]
   ```

**Template Placeholders Available:**
- `{candidate_name}`, `{job_title}`, `{company_name}`, `{your_name}`
- `{cv_upload_link}` - Auto-generated secure link (30-day expiration)

**Email Appears In:** Communication tab (logged as "Screening" email type)

---

### Workflow 2: Offer - Send Offer Letter
**Trigger Stage:** `Offer`  
**Template Type:** `Offer`  
**Delay:** 0 minutes (send immediately)  
**Conditions:** None (sends when candidate moved to Offer stage)

**What Happens:**
1. Recruiter moves candidate to `Offer` stage (manually or via offer acceptance)
2. Workflow automatically triggers
3. System looks up the most recent offer for this candidate
4. Email sent with offer details and response link: `{offer_response_link}` placeholder
5. Candidate receives email like:
   ```
   Subject: Job Offer - {position_title} at {company_name}
   
   Hi {candidate_name},
   
   We're excited to extend an offer for the {position_title} position!
   
   Offer Details:
   - Salary: {salary} ({salary_amount} {salary_currency} {salary_period})
   - Start Date: {start_date}
   - Benefits: {benefits_list}
   
   Please respond by {expires_at}:
   [Clickable Offer Response Link]
   ```

**Template Placeholders Available:**
- `{candidate_name}`, `{job_title}`, `{company_name}`, `{your_name}`
- `{position_title}`, `{salary}`, `{salary_amount}`, `{salary_currency}`, `{salary_period}`
- `{start_date}`, `{expires_at}`, `{benefits}`, `{benefits_list}`, `{notes}`
- `{offer_response_link}` - Auto-generated secure link to accept/decline/counter

**Email Appears In:** Communication tab (logged as "Offer" email type)

**Important:** If you manually send an offer email from the Offers page, the workflow will skip (prevents duplicate emails within 5 minutes).

---

### Workflow 3: Hired - Welcome & Onboarding
**Trigger Stage:** `Hired`  
**Template Type:** `Hired`  
**Delay:** 0 minutes (send immediately)  
**Conditions:** None (sends when candidate moved to Hired stage)

**What Happens:**
1. Recruiter moves candidate to `Hired` stage (manually or when offer is accepted)
2. Workflow automatically triggers
3. Email sent with welcome message and next steps
4. Candidate receives email like:
   ```
   Subject: Welcome to {company_name}! - {job_title}
   
   Hi {candidate_name},
   
   Congratulations! We're thrilled to welcome you to {company_name} as our new {job_title}.
   
   Next Steps:
   - Your start date is {start_date}
   - [Onboarding instructions]
   - [Contact information]
   ```

**Template Placeholders Available:**
- `{candidate_name}`, `{job_title}`, `{company_name}`, `{your_name}`
- `{start_date}` (from offer if available)

**Email Appears In:** Communication tab (logged as "Hired" email type)

**Note:** For rejected candidates, you can manually send rejection emails from the candidate modal. Basic plan doesn't include an automatic rejection workflow (saves a workflow slot).

---

## 🟨 PROFESSIONAL PLAN - 10 Advanced Workflows

### Core Workflows (Same as Basic, but with more options)

### Workflow 1: Screening - CV Upload Invitation
**Same as Basic Workflow 1**  
**Additional Options:** Can add `min_match_score` filter (e.g., only send to candidates with 70+ match score)

---

### Workflow 2: Interview Confirmation (Manual Trigger)
**Trigger Stage:** `Interview`  
**Template Type:** `Interview`  
**Delay:** 0 minutes  
**Enabled:** `false` (disabled by default - interviews are manually scheduled)

**Why Disabled:** Interviews are scheduled manually via the Calendar page, and the interview email is sent immediately when you schedule. This workflow exists for edge cases where you want to re-send confirmation emails.

**Note:** The `ScheduleInterviewModal` sends interview emails directly (not via workflow), so they appear in the communication tab as "Interview" email type.

---

### Workflow 3: Interview Reminder (24 Hours Before)
**Trigger Stage:** `Interview`  
**Template Type:** `Interview` (or create a separate "Interview Reminder" template)  
**Delay:** Calculate dynamically (24 hours before interview time)  
**Enabled:** `true`

**What Happens:**
1. Interview is scheduled for tomorrow at 2 PM
2. Workflow calculates: Current time + delay = 24 hours before interview
3. Email sent 24 hours before with reminder:
   ```
   Subject: Reminder: Interview Tomorrow - {job_title}
   
   Hi {candidate_name},
   
   This is a friendly reminder about your interview tomorrow:
   - Date: {interview_date}
   - Time: {interview_time}
   - Meeting Link: {meeting_link}
   ```

**Implementation Note:** This requires the workflow engine to calculate delays based on interview date/time, not just a fixed delay. You may need to enhance the workflow engine to support "relative delays" based on interview schedules.

---

### Workflow 4: Offer - Send Offer Letter
**Same as Basic Workflow 2**  
**Additional Options:** Can add conditions (e.g., only for candidates with 85+ match score)

---

### Workflow 5: Offer Reminder (If Not Responded)
**Trigger Stage:** `Offer`  
**Template Type:** `Offer` (or create "Offer Reminder" template)  
**Delay:** 3 days (72 hours after offer sent)  
**Conditions:** Only if offer status is still "sent" or "viewed" (not accepted/declined)

**What Happens:**
1. Offer sent via Workflow 4
2. 3 days later, if candidate hasn't responded, this workflow triggers
3. Reminder email sent:
   ```
   Subject: Reminder: Your Offer for {position_title}
   
   Hi {candidate_name},
   
   We wanted to follow up on the offer we extended for {position_title}.
   Please respond by {expires_at}:
   [Offer Response Link]
   ```

**Implementation Note:** Requires checking offer status before sending. The workflow engine would need to query the `offers` table to see if the offer was already accepted/declined.

---

### Workflow 6: Counteroffer Received - Acknowledge
**Trigger Stage:** `Offer`  
**Template Type:** Create new "Counteroffer" template  
**Delay:** 0 minutes  
**Conditions:** Only if offer status is "negotiating"

**What Happens:**
1. Candidate submits counteroffer via offer response page
2. Offer status changes to "negotiating"
3. Workflow triggers (if you move candidate stage or update offer status triggers workflow)
4. Email sent to candidate:
   ```
   Subject: We Received Your Counteroffer - {position_title}
   
   Hi {candidate_name},
   
   Thank you for your counteroffer. We're reviewing it and will get back to you within 2 business days.
   ```

**Implementation Note:** This may require a new trigger mechanism (offer status change, not just stage change) or manual workflow execution when counteroffer is received.

---

### Workflow 7: Hired - Welcome & Onboarding
**Same as Basic Workflow 3**

---

### Workflow 8: Rejected - Polite Rejection
**Trigger Stage:** `Rejected`  
**Template Type:** `Rejection`  
**Delay:** 0 minutes  
**Conditions:** None

**What Happens:**
1. Recruiter moves candidate to `Rejected` stage
2. Workflow automatically triggers
3. Email sent:
   ```
   Subject: Update on Your Application - {job_title}
   
   Hi {candidate_name},
   
   Thank you for your interest in the {job_title} position at {company_name}.
   
   After careful consideration, we've decided to move forward with other candidates.
   We wish you the best in your job search.
   ```

**Template Placeholders Available:**
- `{candidate_name}`, `{job_title}`, `{company_name}`, `{your_name}`

---

### Workflow 9: Rejected - With Feedback (Optional)
**Trigger Stage:** `Rejected`  
**Template Type:** `Rejection` (customized version)  
**Delay:** 0 minutes  
**Conditions:** `min_match_score >= 70` (only send detailed feedback to strong candidates)

**What Happens:**
1. High-scoring candidate (70+) is rejected
2. This workflow sends a more detailed rejection with feedback:
   ```
   Subject: Update on Your Application - {job_title}
   
   Hi {candidate_name},
   
   While we've decided to move forward with other candidates, we wanted to share that your background in [specific skills] was impressive.
   
   We'd be happy to consider you for future opportunities.
   ```

---

### Workflow 10: Hired - Onboarding Follow-up (1 Week After Start)
**Trigger Stage:** `Hired`  
**Template Type:** `Hired` (or create "Onboarding Follow-up" template)  
**Delay:** 7 days (after candidate moved to Hired)  
**Conditions:** None

**What Happens:**
1. Candidate moved to Hired on Day 0
2. 7 days later, follow-up email sent:
   ```
   Subject: How's Your First Week Going? - {company_name}
   
   Hi {candidate_name},
   
   We hope your first week at {company_name} has been great!
   
   [Check-in questions, resources, contact info]
   ```

**Implementation Note:** Requires the workflow engine to support "delayed execution" based on when the candidate was moved to Hired (not just a fixed delay from workflow creation).

---

## 📧 How Candidates Receive Emails

### Email Delivery Flow:
1. **Workflow triggers** when candidate stage changes (or offer status changes)
2. **Workflow engine** loads email template and replaces placeholders
3. **Email sent** via Supabase Edge Function (`send-email`) using Resend API
4. **Email logged** in `email_logs` table with:
   - `candidate_id`, `to_email`, `subject`, `content`
   - `email_type` (Screening, Interview, Offer, Hired, Rejection, Custom)
   - `status` (sent, failed)
   - `sent_at` timestamp
5. **Email appears** in Communication tab of CandidateModal

### Communication Tab Recognition:
- ✅ **All workflow emails** are logged and appear in Communication tab
- ✅ **Manually scheduled interview emails** (from ScheduleInterviewModal) are logged and appear
- ✅ **Manually sent offer emails** (from Offers page) are logged and appear
- ❌ **Emails sent outside CoreFlow** (e.g., from your personal Gmail) will NOT appear

---

## 🔄 Complete Pipeline Flow: Offer → Hired

### Scenario: Candidate Accepts Offer

1. **Recruiter creates offer** in Offers page:
   - Fills in position, salary, benefits, start date, expiration
   - Clicks "Send Offer"

2. **Offer email sent** (via Offers page, not workflow):
   - Email includes `{offer_response_link}` with secure token
   - Email logged in Communication tab

3. **Candidate clicks link** → Lands on `/offers/respond/{token}` page:
   - Sees offer details
   - Options: Accept, Decline, Counter Offer

4. **If candidate accepts:**
   - Offer status → `accepted`
   - Candidate stage automatically updated → `Hired`
   - **Workflow 3 (Hired) triggers** → Welcome email sent
   - Email logged in Communication tab

5. **If candidate counters:**
   - Offer status → `negotiating`
   - Recruiter sees counteroffer in Offers page
   - Recruiter can accept/decline counteroffer or negotiate further
   - **Workflow 6 (Counteroffer Received) could trigger** (if implemented)

6. **If candidate declines:**
   - Offer status → `declined`
   - Candidate stage can be moved to `Rejected` manually
   - **Workflow 8 (Rejected) triggers** → Rejection email sent

---

## 🎯 Recommended Setup for New Users

### Basic Plan Users:
1. **Create 3 email templates:**
   - Screening (with `{cv_upload_link}` placeholder)
   - Offer (with `{offer_response_link}` and offer details)
   - Hired (welcome message)

2. **Create 3 workflows:**
   - Screening → Screening template
   - Offer → Offer template
   - Hired → Hired template

3. **Test flow:**
   - Register a test candidate → Should receive Screening email
   - Move to Offer → Should receive Offer email
   - Accept offer → Should receive Hired email

### Professional Plan Users:
1. **Create 6-7 email templates:**
   - Screening, Interview, Interview Reminder, Offer, Offer Reminder, Hired, Rejection

2. **Create 8-10 workflows** (as listed above)

3. **Enable advanced features:**
   - Interview reminders (24h before)
   - Offer reminders (3 days after)
   - Rejection workflows (polite + feedback versions)

---

## ⚠️ Important Notes

1. **"New" Stage Workflows:** Disabled by design - candidates don't have emails until they register via LinkedIn outreach.

2. **"Interview" Stage Workflows:** Disabled by default - interviews are manually scheduled and emails sent immediately. Interview reminders can be enabled separately.

3. **Workflow Delays:** Currently supports fixed delays (minutes). For interview reminders and follow-ups, you may need to enhance the workflow engine to support "relative delays" based on interview/start dates.

4. **Offer Workflows:** The Offers page sends emails directly (not via workflow) to prevent duplicates. Workflows can still be used for reminders.

5. **Email Logging:** All emails sent through CoreFlow (workflows, manual sends, interview scheduling) are logged in `email_logs` and appear in the Communication tab.

---

## 🚀 Next Steps

1. **Review this proposal** and confirm which workflows you want
2. **Create email templates** for each workflow type
3. **Set up workflows** in Settings → Email Workflows
4. **Test end-to-end** with a test candidate
5. **Document** any custom workflows for your team
