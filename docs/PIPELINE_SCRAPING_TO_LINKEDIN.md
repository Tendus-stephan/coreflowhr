# Pipeline: Scraping → LinkedIn outreach → Registration → CV upload

End-to-end flow from after scraping to contacting the candidate on LinkedIn with a link, and what happens when things go wrong.

---

## 1. Happy path (intended flow)

| Step | Who | Where | What happens |
|------|-----|--------|----------------|
| **1. Scraping completes** | System | Jobs page → "Find candidates" | Candidates are saved with **no email**. They appear in the candidate board in stage **New**. |
| **2. Open candidate** | Recruiter | Candidate board → click card | Candidate modal opens. **Communication** tab shows "This candidate doesn't have an email" and **Generate Outreach Message**. |
| **3. Screening workflow required** | Recruiter | Settings → Email Workflows | Before outreach: **Create and enable a Screening workflow** (trigger: Screening). If you don’t, "Generate Outreach Message" will alert and block. |
| **4. Generate outreach message** | Recruiter | Candidate modal → Communication → Generate Outreach Message | • API creates **registration token** (30-day expiry), stored on candidate.<br>• **Registration link** is built: `{origin}/candidates/register/{candidateId}?token={token}` (production URL if you’re on localhost).<br>• AI drafts a short message that includes this link and explains they should register to continue. |
| **5. Copy and send on LinkedIn** | Recruiter | Same modal → Copy → LinkedIn | Copy the drafted message (subject + body with link). **You send it manually** via LinkedIn (DM/InMail). No automatic send from CoreFlow. |
| **6. Candidate clicks registration link** | Candidate | LinkedIn → click link | Browser opens **CandidateRegister** page: `/candidates/register/:candidateId?token=...` |
| **7. Register email** | Candidate | Register page | Enters email, submits. API checks token (valid, not used, not expired), saves email, sets **registration_token_used = true**, moves candidate to **Screening**. |
| **8. Screening workflow runs** | System | Backend after registration | Right after step 7, backend calls **executeWorkflowsForStage(candidateId, 'Screening', ...)**. Screening workflow runs once. |
| **9. CV upload link in email** | System | Workflow engine | For Screening workflows, engine generates or reuses **cv_upload_token** (30-day expiry), builds **CV upload link**: `{origin}/jobs/apply/{jobId}?token={cvUploadToken}` and injects it into the email (or appends it). Sends email to the **newly registered** address. |
| **10. Candidate clicks CV link** | Candidate | Email → link | Opens **JobApplication** page: `/jobs/apply/:jobId?token=...` (validates `cv_upload_token`). |
| **11. Upload CV** | Candidate | Job application page | Submits CV (and any form fields). CV is stored; candidate stays in Screening (or your workflow moves them). |

So the **two links** in the pipeline are:

- **Registration link** (from outreach): `/candidates/register/:candidateId?token=:registration_token`  
  → Collects email, moves to Screening, triggers Screening workflow email.
- **CV upload link** (in that Screening email): `/jobs/apply/:jobId?token=:cv_upload_token`  
  → Lets them upload their CV.

---

## 2. Edge cases and “opposite” behaviour

Things that can go wrong or that users do “wrong” and how the system behaves:

### Before sending the outreach

| Case | What happens |
|------|-------------------------------|
| **No Screening workflow** | "Generate Outreach Message" shows an alert and does not generate. Prevents candidates from registering and then never getting the CV upload email. |
| **Screening workflow disabled** | Same as above if only disabled workflows exist. Enable at least one Screening workflow. |
| **Candidate already has email** | Register page and API both reject: "This candidate already has an email registered" / "Candidate already has an email registered". No new token needed; use normal email flow. |

### Registration link (candidate side)

| Case | What happens |
|------|-------------------------------|
| **Invalid token** | Register page: "Invalid registration token" (neutral error UI). |
| **Token already used** | "This registration link has already been used." |
| **Token expired** | "This registration link has expired. Please contact the recruiter for a new link." Recruiter must open the candidate again and **Generate Outreach Message** again (new token is created). |
| **Missing token in URL** | "Registration token is required." |
| **Wrong candidate ID** | "Candidate not found." |
| **User edits the link** | If they change `candidateId` or `token`, validation fails as above (invalid/wrong candidate). |

### After registration

| Case | What happens |
|------|-------------------------------|
| **Screening workflow execution fails** | Candidate is already in Screening with email saved. They may never receive the CV upload email. Check workflow logs / send email manually or re-run workflow if you add that. |
| **Candidate never clicks CV link** | They stay in Screening with email on file; no CV. You can send the same or another email with the CV link (workflow may be marked already sent for that workflow – engine skips duplicate “sent” executions). |
| **CV upload link expired** | Job application page shows that the link has expired; they need a new link (e.g. re-send a Screening email that regenerates/uses a valid `cv_upload_token`). |

### Recruiter behaviour

| Case | What happens |
|------|-------------------------------|
| **Generate outreach on localhost** | Registration link is forced to production (`https://www.coreflowhr.com/...`) so the link works when the candidate clicks from LinkedIn. |
| **Copy message but send something else on LinkedIn** | System doesn’t know. If they don’t include the registration link, the candidate can’t register; they stay in New with no email. |
| **Send same outreach to several candidates** | Each candidate has their **own** registration token and link. Sending one candidate’s link to another will fail (invalid token / wrong candidate). |
| **Candidate already in Screening (has email)** | Modal shows normal email compose, not outreach. Use normal email; no registration link needed. |

---

## 3. Quick checklist to run it yourself

1. **Settings → Email Workflows**  
   Create a **Screening** workflow (trigger: Screening), enable it, and ensure the template is acceptable (CV link is auto-injected or use `{cv_upload_link}`).

2. **Jobs → Find candidates**  
   Run sourcing so you have at least one candidate in **New** with no email.

3. **Candidate board**  
   Open that candidate → **Communication** tab.

4. **Generate Outreach Message**  
   If the alert appears, fix the Screening workflow and try again. Copy the message (includes registration link).

5. **LinkedIn**  
   Send that message to the candidate (manually).

6. **As candidate**  
   Click the registration link → Register page → enter email → submit.

7. **Check**  
   Candidate moves to Screening; they should receive the Screening email with the CV upload link.

8. **As candidate again**  
   Click the CV link in the email → Job application page → upload CV.

For “opposite” cases: use an expired link, reuse a link, or generate outreach with no Screening workflow to see the validation and alerts described above.
