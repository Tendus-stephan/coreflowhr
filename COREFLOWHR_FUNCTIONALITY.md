# CoreflowHR: Full Product Functionality (Sign Up → First Hire)

This document describes every inch of CoreflowHR from sign-up through first hire: screens, actions, validations, plan limits, and where things can block or fail.

---

## Table of Contents

1. [Application structure & navigation](#1-application-structure--navigation)
2. [Sign up & email verification](#2-sign-up--email-verification)
3. [Login & access control](#3-login--access-control)
4. [Onboarding](#4-onboarding)
5. [Dashboard](#5-dashboard)
6. [Jobs: create, list, source candidates](#6-jobs-create-list-source-candidates)
7. [Candidate pipeline (Kanban) & stage rules](#7-candidate-pipeline-kanban--stage-rules)
8. [Candidates: add, CV parse, profile, offers](#8-candidates-add-cv-parse-profile-offers)
9. [Interviews: schedule, reschedule, reminders, feedback](#9-interviews-schedule-reschedule-reminders-feedback)
10. [Offers: create, send, accept/decline/counter](#10-offers-create-send-acceptdeclinecounter)
11. [Email workflows (automations)](#11-email-workflows-automations)
12. [Settings: profile, notifications, billing, templates](#12-settings-profile-notifications-billing-templates)
13. [Ups & downs summary](#13-ups--downs-summary)

---

## 1. Application structure & navigation

**Router:** `BrowserRouter`. All app routes sit under a `Layout` that shows the **Sidebar** and main content for authenticated users.

**Sidebar** (visible only when `user && session`):

| Link        | Path         | Purpose                          |
|------------|--------------|-----------------------------------|
| Dashboard  | `/dashboard` | Stats, activity, flows, bulk actions |
| Jobs       | `/jobs`      | Job list, sourcing                |
| Candidates | `/candidates`| Pipeline Kanban board            |
| Clients    | `/clients`   | Client/company list               |
| Calendar   | `/calendar`  | Interview calendar                |
| Offers     | `/offers`    | Offer list, send, negotiate       |
| Settings   | `/settings`  | Profile, billing, notifications, templates, workflows, integrations, security |

**Standalone pages (no sidebar):**  
`/`, `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/terms`, `/privacy`, `/onboarding`, `/change-email`, `/jobs/apply/:jobId`, `/offers/respond/:token`, `/candidates/register/:candidateId`.

**References:** `App.tsx` (routes, Layout), `components/Sidebar.tsx`.

---

## 2. Sign up & email verification

**Sign up** (`/signup`, `pages/SignUp.tsx`)

- **Fields:** Name, email, password, confirm password.
- **Validation:** Passwords must match; length ≥ 6. Supabase errors (e.g. “User already registered”) are normalized (e.g. “Sign in instead”).
- **On success:** Redirect to `/verify-email?email=...`. If Supabase reports an issue sending the confirmation email, the app still redirects to verify-email so the user can request a new link.
- **Auth:** `useAuth().signUp(email, password, name)`.

**Verify email** (`/verify-email`, `pages/VerifyEmail.tsx`)

- Shown when the user exists but email is not yet confirmed (`user && !session`).
- User can request a new confirmation email. After clicking the link in email, Supabase confirms the address and the session is established; user can then access protected routes.

**Downs:**

- Weak or duplicate email → validation / Supabase error.
- Confirmation email not received → user must use “Resend” or check spam.

**References:** `pages/SignUp.tsx`, `pages/VerifyEmail.tsx`, `contexts/AuthContext.tsx`.

---

## 3. Login & access control

**Login** (`/login`, `pages/Login.tsx`)

- Email + password; optional “Remember me”.
- If MFA is enabled, a 6-digit code step is shown; `verifyMFA(code)` then continues the same success path.
- **On success:**  
  - Email not confirmed → redirect to `/verify-email`.  
  - No active subscription (and not on Settings) → redirect to `/?pricing=true`.  
  - Otherwise → dashboard or the `from` path stored when redirecting to login.

**Forgot password** (`/forgot-password`)

- Sends password-reset link via Supabase; success/error message shown.

**Protected route** (`components/ProtectedRoute.tsx`)

Guards every protected page. In order:

1. **Not logged in** → redirect to `/login` with `state.from` for return URL.
2. **User exists but no session** (e.g. email not confirmed) → redirect to `/verify-email`.
3. **No active subscription** (and current path is not `/settings`) → redirect to `/?pricing=true`.
4. **Onboarding not completed** (and current path is not `/onboarding`) → redirect to `/onboarding`.
5. **Session revocation:** background check (e.g. `user_sessions`); if session is revoked → sign out and redirect to `/login`.

**Downs:**

- Wrong password / MFA → error message.
- Unverified email / no subscription / onboarding not done → redirects above; user must complete each step to reach the app.

**References:** `pages/Login.tsx`, `components/ProtectedRoute.tsx`, `contexts/AuthContext.tsx`.

---

## 4. Onboarding

**Onboarding** (`/onboarding`, `pages/Onboarding.tsx`)

- **Protected.** Multi-slide product intro (Welcome, Pipeline/Kanban, Jobs, Candidates, etc.).
- On “Get started” / completion: API updates profile with `onboarding_completed = true` and `onboarding_completed_at`; then redirect to dashboard.
- If the profile already has `onboarding_completed === true`, user is redirected to dashboard (no need to see onboarding again).

**Downs:**

- User must complete onboarding (or have it already set in DB) before accessing any other protected route.

**References:** `pages/Onboarding.tsx`, `services/api.ts` (profile update with onboarding fields), `components/ProtectedRoute.tsx`, DB columns from migrations (e.g. `onboarding_completed`, `onboarding_completed_at`).

---

## 5. Dashboard

**Dashboard** (`/dashboard`, `pages/Dashboard.tsx`)

- **Stats:** Cards for total candidates, jobs, interviews, hires (from `api.dashboard.getStats()`), with trend vs last month.
- **Activity feed:** Recent activity from `api.activity.list()`; “View all” opens a list modal.
- **Flows chart:** Area chart by week; tabs: New Candidates, Weekly Avg, Screening, Interviews, Offers, Hired. Time range (e.g. 12 weeks). Data from candidates and activity feed.
- **Modals:** “All Jobs”, “All Interviews”, “All Activity” open list modals.
- **Reports:** Report modal (Weekly Performance, Job Posting Analysis, Time to Hire); PDF download is a placeholder.
- **Interviews:** Schedule interview via `ScheduleInterviewModal`. On load, `api.interviews.ensureFeedbackReminders()` and `ensureUpcomingInterviewReminders()` run (in-app reminders; email if user has “interview schedule updates” enabled).
- **Notifications:** Bell opens `NotificationDropdown`. Notifications are clickable and navigate to the relevant page (offers, candidates, jobs, etc.) via `getNotificationLink()`.

**Bulk actions** (BulkActionModal)

- **Export selected:** Select candidates → CSV export. **Block:** `api.plan.canExportCandidates(count)` enforces `maxExportCandidates` (Basic: 100, Professional: 500). Over limit → message and export blocked.
- **Bulk move:** Choose “from” stage (Screening → Interview → Offer → Hired; **New is excluded**). Select candidates, confirm. Calls `api.candidates.update` per candidate → same [stage rules](#7-candidate-pipeline-kanban--stage-rules) apply (workflow required for target stage; Offer requires linked offer). Any failure → error/toast.
- **Bulk reject:** Select non–Rejected candidates → move to Rejected (workflow for Rejected stage required).

**Downs:**

- Export over plan limit → blocked with upgrade message.
- Bulk move can fail per candidate (no workflow, no offer for Offer stage, etc.); user sees error and card may revert.

**References:** `pages/Dashboard.tsx`, `services/api.ts` (dashboard.getStats, activity.list, plan.canExportCandidates), `services/planLimits.ts`, `utils/notificationLinks.ts`.

---

## 6. Jobs: create, list, source candidates

**Job list** (`/jobs`, `pages/Jobs.tsx`)

- Jobs from `api.jobs.list({ excludeClosed, page, pageSize })`. Filters, search, status (Active / Closed / Draft).
- Row: title, location, type, applicant count, status, scraping status. Actions: View candidates (CandidateBoard with job filter), **Source candidates**, Job settings (JobSettingsModal), Edit (`/jobs/edit/:id`), Archive/Close.
- “New job” → `/jobs/new`.

**Create / edit job** (`/jobs/new`, `/jobs/edit/:id`, `pages/AddJob.tsx`)

- Form: title, department, location, type, salary, experience, skills, description, company, remote, status. Built-in templates (e.g. Software Engineer, Product Manager). Preview modal. Save → `api.jobs.create` or `api.jobs.update`.

**Sourcing (“Source candidates”)**

- **Check:** `canScrapeThisMonth(plan, scrapesUsed, resetDate)` (from `planLimits`). Plan limits: Basic 10 jobs/month, Professional 50; candidates per scrape: 25 vs 50.
- **Action:** `scrapeCandidates(jobId, …)` (e.g. via `scrapingApi` / scrape-candidates edge function). On success, job shows scraping status (e.g. pending, then updated by backend).
- **Down:** Over monthly limit → error (e.g. “You’ve used your X sourcing runs this month. Upgrade or wait until renewal.”). Handled by `scrapingErrorHandler`; user sees message.

**Job status**

- Only **Active** jobs are used for application and sourcing. Draft/Closed are not.

**References:** `pages/Jobs.tsx`, `pages/AddJob.tsx`, `services/api.ts` (jobs.*), `services/scrapingApi.ts`, `services/planLimits.ts`, `services/scrapingErrorHandler.ts`.

---

## 7. Candidate pipeline (Kanban) & stage rules

**Stages** (`types.ts`)

- **New** (Waitlist), **Screening**, **Interview**, **Offer**, **Hired**, **Rejected**.

**Kanban** (`/candidates`, `pages/CandidateBoard.tsx`, `components/PipelineColumn.tsx`)

- One column per stage. Cards are draggable **except** in the **New** column (cards in New cannot be dragged to avoid silent revert).
- Drag: stores `candidateId` and `sourceStage` in dataTransfer; drop on a column → `onDropCandidate(id, newStage)`. Board handles drag-over and edge scrolling. After drop, `api.candidates.update(id, { stage })` is called. On validation error, user sees message and a confirmation/rollback flow may run.

**Move rules** (enforced in `api.candidates.update`)

| Rule | Behavior |
|------|----------|
| **New → any** | **Blocked.** Error: “Cannot manually move candidates from ‘New’ stage. Candidates in ‘New’ stage must upload their CV first, which will automatically move them to ‘Screening’ stage.” |
| **Any → New** | **Blocked** in UI (e.g. `targetStage === CandidateStage.NEW` returns false). |
| **Any → Screening / Offer / Rejected / Hired** | Requires at least one **enabled** email workflow for that **trigger stage**. Interview is **exempt**. Otherwise error: “Cannot move candidate to ‘X’ stage. Please create an email workflow for the ‘X’ stage in Settings > Email Workflows first.” |
| **Any → Offer** | Candidate must have an **active offer** linked (`candidate_id`, status in draft/sent/viewed/negotiating/accepted). Otherwise: “Cannot move candidate to ‘Offer’ stage. Please create a job offer for this candidate first, or link a general offer from the candidate profile.” |

**Downs:**

- Dragging from New is disabled in UI; if something still triggered a move from New, API would block it.
- No workflow for target stage → move blocked with clear message.
- No linked offer for Offer stage → move blocked.
- Failed move → error toast; card can revert.

**References:** `types.ts` (CandidateStage), `pages/CandidateBoard.tsx`, `components/PipelineColumn.tsx`, `services/api.ts` (candidates.update, ~2525–2575).

---

## 8. Candidates: add, CV parse, profile, offers

**Ways candidates enter**

- **Sourcing:** Scrape from Jobs creates candidates in **New** (no email until they register via link).
- **Job application:** Public `/jobs/apply/:jobId`. Submit name, email, phone, cover letter, CV. Creates candidate (often in Screening); CV is parsed (skills, summary, experience) and optional AI match score. Uses `cvParser` (e.g. `extractTextFromCV`, `parseCVText` / `parseCVTextWithAI`).
- **Registration:** `/candidates/register/:candidateId?token=...`. Validates token and expiry; candidate must not already have email. Submits email (and optionally name); backend sets email and can move to Screening or trigger workflow.

**CV parse & grading**

- `services/cvParser.ts`: extract text, parse (skills, experience, etc.), optional AI. On create/update with CV, API can set `resume_summary`, `skills`, `experience`, `ai_match_score`. Match score 0–100; also computed in scraper and when viewing candidate if missing.

**Candidate profile** (`components/CandidateModal.tsx`)

- **Tabs:** Overview, Portfolio, Email, Notes, Feedback, Offers.
- **Overview:** Job, stage, AI analysis (regenerated if missing and has CV), match score; schedule interview, send email, notes; interview feedback list; offers. Can create/link offers, schedule/reschedule interviews, submit feedback. “Also in: Job X” links to pipeline with job filter.
- **Email:** Compose and history.
- Candidate has a primary `jobId`; general offers can be linked from the Offers tab/modal.

**Downs:**

- Job not found or not Active on application page → “Job not found or is no longer accepting applications.”
- Register: invalid/expired token or already has email → error; submit blocked.
- Send offer: general offer without `candidateId` is blocked on Offers page (“Cannot send a general offer. Please link it to a candidate first.”).

**References:** `services/api.ts` (candidates.create, get, update), `services/cvParser.ts`, `components/CandidateModal.tsx`, `pages/JobApplication.tsx`, `pages/CandidateRegister.tsx`, `pages/Offers.tsx`.

---

## 9. Interviews: schedule, reschedule, reminders, feedback

**Schedule** (`components/ScheduleInterviewModal.tsx`)

- Used from Dashboard and CandidateModal. Fields: job, candidate, date, time, duration, type, interviewer, timezone, meeting link/address. Create → `api.interviews.create(candidateId, { jobTitle, jobId, date, time, … })`. Optional calendar/meeting integration via backend or edge function.

**Reschedule**

- **Calendar:** Drag event → `api.interviews.reschedule(interviewId, newDate, newTime, durationMinutes)`; then reschedule email to candidate (Reschedule or Interview template).
- **Modal:** ScheduleInterviewModal can open with existing interview to reschedule.

**Reminders**

- `ensureFeedbackReminders()`: in-app notifications for past interviews that need feedback.
- `ensureUpcomingInterviewReminders()`: upcoming interview reminders. If user has “interview schedule updates” and email set, reminder email is sent via `send-email` edge function.

**Feedback**

- Interview feedback form/card in CandidateModal. Submit → `api.interviews.submitFeedback(interviewId, { … })`. Stored and shown on candidate profile.

**References:** `components/ScheduleInterviewModal.tsx`, `pages/Calendar.tsx`, `services/api.ts` (interviews.create, reschedule, ensureFeedbackReminders, ensureUpcomingInterviewReminders, submitFeedback).

---

## 10. Offers: create, send, accept/decline/counter

**Create** (`components/OfferModal.tsx`)

- Job, candidate (or general), position title, salary, currency, start date, benefits, notes. `api.offers.create({ candidateId, jobId, … })`. Option “Save and send” creates then sends.

**Send** (`api.offers.send(offerId)`)

- Sends offer email, sets status to sent, can move candidate to Offer stage. Used from Offers page, OfferModal, CandidateModal. **Block:** General offer without `candidateId` cannot be sent from Offers page; user must link to a candidate first.

**Candidate-facing** (`/offers/respond/:token`, `pages/OfferResponse.tsx`)

- Public page. Load offer via `api.offers.getByToken(token)`. Actions: **Accept**, **Decline**, **Counter offer** (salary, currency, period, start date, benefits, note). Submit → `acceptByToken`, `declineByToken`, or `counterOfferByToken`. Success states: accepted, declined, counter_offered.
- **Down:** Invalid/expired token → “Invalid or expired offer link.” Accept/decline use DB RPCs `accept_offer_atomic` and `decline_offer_atomic`; if these are not deployed, user sees “Could not find the function …” (fixed by applying migration `20260225120000_add_atomic_offer_functions.sql`).

**Recruiter: counter handling** (`pages/Offers.tsx`, `components/NegotiateCounterOfferModal.tsx`)

- List offers; filter by status (all, draft, sent, viewed, negotiating, accepted, declined, archived). For **negotiating:** “Accept counter” → `api.offers.acceptCounterOffer(offerId)`; “Decline counter” → `api.offers.declineCounterOffer(offerId)`; “Negotiate” opens modal to send a new counter. Archive / Unarchive via `api.offers.update(offerId, { archived })`.

**Recruiter notifications**

- Offer accepted, declined, or counter offer received → in-app notification and, if user has “offer updates” and email set, email via `send-offer-update-email` edge function.

**eSignature (optional per offer)**

- When sending an offer, recruiter can check **Require eSignature**. If checked, CoreflowHR generates an offer PDF, sends it to Dropbox Sign (HelloSign), and sets status to **Awaiting Signature**. Candidate receives an email from Dropbox Sign to sign; on completion, webhook updates the offer to **Signed** and stores the signed PDF in storage. Recruiter sees **Download signed document** for signed offers. If eSignature is required, the candidate cannot complete via the Accept button on the response page; they must sign via the Dropbox Sign email.
- **Config:** Supabase secrets: `DROPBOX_SIGN_API_KEY`. Webhook URL: `https://<project>.supabase.co/functions/v1/dropbox-sign-webhook` (configure in Dropbox Sign dashboard).
- **References:** `supabase/functions/generate-offer-pdf`, `supabase/functions/send-offer-with-esignature`, `supabase/functions/dropbox-sign-webhook`, migration `20260228350000_offers_esignature_columns.sql`, `20260228350100_storage_signed_offers_bucket.sql`.

**References:** `pages/Offers.tsx`, `pages/OfferResponse.tsx`, `components/OfferModal.tsx`, `components/OfferCard.tsx`, `components/NegotiateCounterOfferModal.tsx`, `services/api.ts` (offers.*), `supabase/functions/send-offer-update-email`, migration `20260225120000_add_atomic_offer_functions.sql`.

---

## 11. Email workflows (automations)

**Model**

- `email_workflows`: name, trigger_stage, email_template_id, min_match_score, source_filter, enabled, delay_minutes. Trigger stages: Screening, Interview, Offer, Rejected, Hired (New exists but engine skips it).

**Create** (Settings > Email Workflows)

- Before create, `api.plan.canCreateWorkflow(currentCount)` is called. **Limit:** Basic 3 workflows, Professional 10. If `currentWorkflowCount >= maxEmailWorkflows` → `allowed: false` and message (e.g. “Your Basic plan allows up to 3 … Upgrade to Professional for up to 10”). UI blocks create and shows message.

**Execution** (`services/workflowEngine.ts`)

- When candidate stage changes, `api.candidates.update` calls `executeWorkflowsForStage(candidateId, newStage, userId, skipIfAlreadySent)`. Engine loads enabled workflows for that stage; **skips New** (no auto email after sourcing); **skips Interview** (manual scheduling). For Offer, can skip if an offer email was just sent. Sends via template merge and `send-email` edge; logs execution. Stage move rules (workflow required) are in `api.candidates.update`, not in the engine.

**Downs**

- At workflow limit → cannot create more until upgrade or delete existing.
- No workflow for a stage → user cannot move candidates to that stage (except Interview) until they create one.

**References:** `services/planLimits.ts`, `services/api.ts` (workflows.*, plan.canCreateWorkflow), `services/workflowEngine.ts`, `pages/Settings.tsx` (workflows tab).

---

## 12. Settings: profile, notifications, billing, templates

**Tabs** (`pages/Settings.tsx`)

- My Profile, Billing & Plan, Notifications, Email Templates, Email Workflows, Integrations, Security.

**Profile**

- Name, avatar, email (change-email flow can redirect to `/change-email`). Save → `api.auth.updateProfile`; dispatches `profileUpdated` for Sidebar refresh.

**Notifications**

- Email notifications, interview schedule updates, offer updates. Save → `api.settings.updateNotificationPreferences`. Used by reminder/offer-update emails.

**Billing**

- Plan and payment (Stripe): `getBillingDetails()`, createCheckoutSession, createPortalSession. Invoices from `getInvoices()`. If Edge Functions (e.g. get-billing-details, get-invoices) are not deployed or return 500, API returns empty/default so Settings doesn’t crash (e.g. `[]` for invoices, `{ subscription: null, paymentMethod: null }` for billing).

**Templates**

- List/create/update/delete email templates. Edit modal; optional AI generation if plan has `aiEmailGeneration`.

**Integrations**

- List/connect (e.g. OAuth). Professional-only in UI. Redirect back with `?integration=...` can switch to integrations tab.

**Security**

- Sessions list, revoke session. Change password / MFA if implemented.

**Change email** (`/change-email`, `pages/ChangeEmail.tsx`)

- Uses `api.auth.requestEmailChange(newEmail)`, `verifyEmailChangeToken(token)`, `updateEmail(newEmail)` (and optional `requestEmailChangeWithPassword` from Settings). Edge functions: `request-email-change`, `verify-email-change-token`.

**References:** `pages/Settings.tsx`, `pages/ChangeEmail.tsx`, `services/api.ts` (settings.*, auth.*).

---

## 13. Ups & downs summary

**Ups (what works)**

- Sign up → verify email → login → onboarding → dashboard.
- Create jobs, source candidates (within monthly limit), view pipeline.
- Add candidates via application or registration; CV parsing and match score.
- Create email workflows (within plan limit); stage moves trigger workflows (except New/Interview as designed).
- Schedule/reschedule interviews; reminders (in-app and optional email); feedback.
- Create/send offers; candidate accepts/declines/counters; recruiter accepts/declines counter; notifications (in-app + optional email).
- Export candidates (within plan limit); bulk move/reject (subject to stage rules).
- Settings: profile, notifications, billing, templates, workflows, integrations, security.

**Downs (blocks & failures)**

| Area | What can go wrong |
|------|-------------------|
| **Auth** | Unverified email → stuck on verify-email. No subscription → pricing redirect. Onboarding not done → onboarding redirect. Session revoked → sign out. |
| **Jobs / Sourcing** | Monthly scrape limit exceeded → “Upgrade or wait until renewal.” Only Active jobs can be used for application/sourcing. |
| **Pipeline** | Move from **New** blocked. Move to Screening/Offer/Rejected/Hired **blocked** if no enabled workflow for that stage. Move to **Offer** **blocked** if no linked offer. Drag from New column disabled in UI to avoid silent revert. |
| **Workflows** | Max workflows (Basic 3, Pro 10) → cannot create more; must delete or upgrade. |
| **Export** | Max export (Basic 100, Pro 500) → export blocked with message. |
| **Offers** | General offer cannot be sent until linked to candidate. Invalid/expired offer token → error. Missing DB functions `accept_offer_atomic` / `decline_offer_atomic` → accept/decline fails until migration applied. |
| **Billing** | Edge Functions (get-billing-details, get-invoices) 500 or not deployed → API returns empty/default; no crash but billing/invoices may be empty. |
| **Change email** | Depends on Edge Functions and DB; failures show error message. |

**Plan limits at a glance**

| Limit | Basic | Professional |
|-------|--------|---------------|
| Sourcing runs/month | 10 | 50 |
| Candidates per scrape | 25 | 50 |
| Email workflows | 3 | 10 |
| Export candidates per export | 100 | 500 |

---

*This document reflects the CoreflowHR codebase as of the last update. For implementation details, see the file references in each section.*
