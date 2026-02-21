# Full pipeline: After scraping → Contact on LinkedIn with link

This doc describes the **complete flow** from scraping candidates to messaging them on LinkedIn with a registration link, plus **edge cases** (when users do the opposite or things go wrong).

---

## Prerequisites (do once)

1. **Screening workflow**  
   - **Settings → Email Workflows**  
   - Create a workflow that triggers on **Screening** stage.  
   - Enable it.  
   - Without this, "Generate Outreach Message" will block you (candidates who register would not get the CV upload email).

2. **Job is Active**  
   - Candidate must belong to an Active job (not Draft/Closed).

---

## Happy path (step-by-step)

| Step | Who | Action | What happens in the app |
|------|-----|--------|-------------------------|
| **1** | System | Scraping completes | Candidates appear in **Candidates** board, stage **New**, no email. |
| **2** | Recruiter | Open **Candidates** → click a **New** candidate card | Candidate modal opens. |
| **3** | Recruiter | Go to **Communication** tab | If candidate has **no email**: outreach section with "Generate Outreach Message". |
| **4** | Recruiter | Click **Generate Outreach Message** | App: checks Screening workflow exists & enabled → generates secure **registration token** (30-day expiry) → builds **registration link** → AI drafts message with that link. Subject, message body, and registration link are shown. |
| **5** | Recruiter | Copy message (and/or copy link) | "Copy Message to Clipboard" copies subject + body (link is already in the body). Recruiter pastes into LinkedIn DM. |
| **6** | Recruiter | Send the message to the candidate on **LinkedIn** (manually) | No app action. Messaging is done outside the app (LinkedIn). |
| **7** | Candidate | Receives LinkedIn message, clicks **registration link** | Browser opens: `https://www.coreflowhr.com/candidates/register/{candidateId}?token=...` (or your frontend URL). |
| **8** | Candidate | On **Register Your Email** page: enters email → **Register Email** | App: validates token (exists, not used, not expired) → saves email → sets `registration_token_used = true` → moves candidate to **Screening** stage. |
| **9** | System | After registration | App automatically runs **Screening** workflows for that candidate. |
| **10** | System | Screening workflow runs | If template has `{cv_upload_link}` it’s replaced; else CV upload link is **appended** to the email. `cv_upload_token` is created if missing (30-day expiry). Email is sent to the candidate’s new email. |
| **11** | Candidate | Receives email, clicks **CV upload link** | Browser opens: `https://www.coreflowhr.com/jobs/apply/{jobId}?token={cv_upload_token}` (Job Application page with token). |
| **12** | Candidate | On **Job Application** page: can upload CV, fill details, submit | App ties submission to that candidate (via `cv_upload_token` + `job_id`). Candidate stays in Screening (or you move them later). |

So the **full pipeline** is:

**Scrape → New (no email) → Generate outreach (registration link) → You send message on LinkedIn → Candidate clicks link → Registers email → Auto-move to Screening → Screening email with CV link sent → Candidate clicks CV link → Uploads CV.**

---

## How to run it one by one (manual test)

Use this as a checklist for one candidate:

1. **Jobs** → run **Find candidates** for one job; wait until it finishes.
2. **Candidates** → filter by that job; pick one in **New** with no email.
3. Open the candidate → **Communication** tab.
4. Click **Generate Outreach Message** (Screening workflow must exist and be enabled).
5. Copy the full message (or at least the registration link).
6. In LinkedIn (or a test channel), send that message to the candidate (or to yourself for testing).
7. As the candidate: open the **registration link** in a browser.
8. Enter a valid email → **Register Email**.
9. Check inbox for the **Screening** email (with CV upload link).
10. Click the **CV upload link** in the email.
11. On the Job Application page, upload a CV and submit.

You can repeat with another candidate to test again.

---

## Edge cases & “opposite” behaviour

These are cases where something is skipped, wrong, or done in the “wrong” order.

### 1. Recruiter never sends the LinkedIn message

- **What:** Recruiter generates outreach and copies it but never sends it on LinkedIn.
- **Result:** Candidate never gets the link; never registers; stays in **New** with no email. Registration token stays unused (valid until expiry).
- **No fix needed in app.** To “reset”: generate outreach again (same or new token overwrites).

### 2. Recruiter generates outreach before creating a Screening workflow

- **What:** Recruiter clicks **Generate Outreach Message** but no Screening workflow exists or it’s disabled.
- **Result:** App shows: *"Please create and enable a Screening workflow in Settings > Email Workflows before generating outreach messages..."* and does **not** generate the message.
- **Fix:** Create and enable a Screening workflow, then generate again.

### 3. Candidate uses the registration link twice

- **What:** Candidate registers once, then opens the same link again and tries to register another email.
- **Result:** After first submit, `registration_token_used = true`. Second time: API returns *"Registration token has already been used"*. Register page can show an error (e.g. invalid/used token).
- **No extra app step.** If they need to change email, that’s a different feature (e.g. support or “forgot email” flow).

### 4. Registration link expired

- **What:** Recruiter sent the link long ago; candidate clicks after 30 days (or after `registration_token_expires_at`).
- **Result:** Register page validates token and expiry; shows error like *"This registration link has expired. Please contact the recruiter for a new link."*
- **Fix:** Recruiter opens same candidate → **Communication** → **Generate Outreach Message** again. New token and new link are generated; send the new link via LinkedIn.

### 5. Candidate uses someone else’s registration link

- **What:** Link is for candidate A; candidate B opens it and enters their own email.
- **Result:** Token is tied to candidate A. Candidate A’s record gets B’s email; A is moved to Screening and gets the CV email. Candidate B is not in the system. (Same as “wrong person registers”).
- **Recommendation:** Recruiter should correct the candidate’s email in the app if needed, or re-source and send the correct link to B.

### 6. Candidate already has an email

- **What:** Candidate was given an email (e.g. manual edit or direct application) or already registered.
- **Result:** Modal **Communication** tab shows normal **Compose** (Draft Screening / Send Email), not the outreach section. If someone still opens the registration link: API returns *"Candidate already has an email registered"* and does not update.
- **No change needed.** Use normal email flow for that candidate.

### 7. Invalid or tampered registration link

- **What:** Wrong `candidateId`, wrong `token`, or token not in DB.
- **Result:** Register page or API: *"Invalid registration token"* (or “Candidate not found” if ID is wrong).
- **Fix:** Generate a new outreach message and send the new link.

### 8. Candidate registers but Screening workflow doesn’t run

- **What:** e.g. workflow disabled after they registered, or DB/network error during `executeWorkflowsForStage`.
- **Result:** Candidate has email and is in **Screening**, but no email is sent (no CV upload link).
- **Fix:** Re-run the workflow (e.g. move candidate to another stage and back to Screening, if your app supports it), or send the CV upload link manually. Optionally check **Settings → Email Workflows** and workflow execution logs.

### 9. Candidate never clicks the CV upload link (in the Screening email)

- **What:** They got the Screening email but ignore it or lose it.
- **Result:** Candidate stays in Screening without a CV. No automatic reminder unless you add one.
- **Fix:** Manual follow-up (email or LinkedIn) with the same CV link, or generate a new link if you add a “regenerate CV link” action.

### 10. CV upload link expired

- **What:** Candidate opens the CV link after 30 days (or after `cv_upload_token_expires_at`).
- **Result:** Job Application page (with token) can show *"Invalid or expired CV upload link. You can still apply manually below."* They can still apply as a new applicant (different flow).
- **Fix:** Trigger Screening again so a new `cv_upload_token` and link are generated and sent (or send the new link manually if you expose it).

### 11. Wrong job in the URL

- **What:** Registration link has correct `candidateId` and `token` but someone changes the job ID in the CV link, or uses a CV link for job A with job B’s apply page.
- **Result:** CV upload link is `/jobs/apply/{jobId}?token=...`. Token is validated against `job_id` in DB. If `jobId` in URL ≠ candidate’s `job_id`, validation fails (invalid/expired link). Candidate can still use “apply manually” for that job.
- **Fix:** Send the correct link (same job as the candidate).

### 12. Recruiter copies only the link and forgets the message

- **What:** Recruiter copies only the registration URL and sends it on LinkedIn without the drafted message.
- **Result:** Candidate may not understand what the link is; they might still click and register. No app bug; UX is less clear.
- **Recommendation:** Copy the full message (subject + body) so the link is in context.

---

## Quick reference: important URLs and tokens

| Item | Where | Expiry |
|------|--------|--------|
| **Registration link** | `{frontendUrl}/candidates/register/{candidateId}?token={registration_token}` | 30 days |
| **Registration token** | Set when you click **Generate Outreach Message** | 30 days, one-time use after register |
| **CV upload link** | `{frontendUrl}/jobs/apply/{jobId}?token={cv_upload_token}` | 30 days |
| **CV upload token** | Created when Screening workflow runs (first time for that candidate) | 30 days |

Frontend URL is your app’s origin in production (e.g. `https://www.coreflowhr.com`); in dev it may fall back to that same production URL for links so emails and LinkedIn messages always use a working link.

---

## Summary

- **Pipeline:** Scrape → New → Generate outreach (registration link) → Send message on LinkedIn (manual) → Candidate registers email → Auto move to Screening → Screening email with CV link → Candidate uploads CV via link.
- **Run one by one:** Use the “How to run it one by one” checklist above for a single candidate.
- **Edge cases:** Covered above (no workflow, expired/used/wrong token, already has email, workflow doesn’t run, wrong link, etc.). Most “opposite” behaviours are handled with clear errors and a “generate again” or “send correct link” fix.
