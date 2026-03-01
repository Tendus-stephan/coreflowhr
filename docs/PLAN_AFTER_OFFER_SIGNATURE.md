# Plan After Offer Signature

What the docs and workflow plan say should happen **after** the candidate signs the offer (eSignature flow).

---

## Current behavior

1. Candidate signs in Dropbox Sign → webhook runs.
2. Webhook updates **offer**: `status = 'signed'`, `signed_pdf_path`, `responded_at`.
3. **Candidate stays in "Offer" stage** – the webhook does not change candidate stage.
4. Recruiter can **manually** move the candidate to **Hired** (or use bulk move). When the candidate is moved to Hired, the **Hired** email workflow runs (if one is configured).

---

## Next implementation (from the plan)

From **WORKFLOW_PROPOSAL.md** and **OFFER_CREATION_STEPS.md**, the intended flow is:

1. **Auto-move to Hired when offer is signed**  
   When the Dropbox Sign webhook sets the offer to `signed`, also update that offer’s **candidate** to stage **Hired**.  
   - So: no manual “move to Hired” needed after eSignature.  
   - Then the existing **Hired** workflow (Welcome & Onboarding email) can run automatically when the workflow engine sees the stage change.

2. **Hired – Welcome & Onboarding workflow**  
   - **Trigger:** candidate in **Hired** stage (either after auto-move above, or after manual move / after “Accept” in the old flow).  
   - **Action:** send welcome email with e.g. start date, next steps, contact info.  
   - **Template type:** `Hired`. Placeholders: `{candidate_name}`, `{job_title}`, `{company_name}`, `{your_name}`, `{start_date}`.  
   - This is **Workflow 3** in the Basic plan and is already supported by the workflow engine; you only need a **Hired** email template and an email workflow with trigger stage **Hired**.

---

## Summary: next implementation

| # | What | Where | Status |
|---|------|--------|--------|
| 1 | **Auto-move candidate to Hired when offer is signed** | `supabase/functions/dropbox-sign-webhook/index.ts` | Not done yet – webhook only updates the offer, not the candidate’s stage. |
| 2 | **Hired – Welcome & Onboarding email** | Settings → Email Workflows + Hired template | Supported by app; user creates workflow + template. |

So the **next implementation** to build in code is: **in the Dropbox Sign webhook, after updating the offer to `signed`, also set the offer’s candidate to stage `Hired`** (and optionally trigger the Hired workflow / activity log so the welcome email sends automatically).
