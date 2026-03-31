# Hiring Pipeline — Full System Test Plan

**Test after:** Completed auth flow (sign-up → onboarding → active subscription)
**Role for main run:** Admin
**Secondary runs:** Recruiter, HiringManager, Viewer (RBAC section)

---

## 1. CLIENT MANAGEMENT

### 1.1 Create a client
- [ ] Go to `/clients`
- [ ] Click "Add Client"
- [ ] Fill in: Name, contact email, contact phone, address, notes
- [ ] Save → client appears in list
- [ ] Client name is searchable

### 1.2 Edit a client
- [ ] Click edit on client row
- [ ] Change contact email → save
- [ ] Updated value persists on refresh

### 1.3 Delete a client
- [ ] Delete client → removed from list
- [ ] Confirm: client no longer appears in job creation dropdown

---

## 2. JOB MANAGEMENT

### 2.1 Create a job from blank
- [ ] Go to `/jobs` → click "Post a New Job"
- [ ] Fill all fields: title, company, client (select from 1.1), type, location, salary, remote toggle, skills, description
- [ ] "Post Job" → status = Active → appears in jobs list
- [ ] Job is visible in candidate board job filter

### 2.2 Create a job from template
- [ ] Click "Post a New Job" → select a built-in template (e.g. Software Engineer)
- [ ] Template pre-fills fields → customise → Post
- [ ] Confirm job created successfully

### 2.3 Save job as Draft
- [ ] Fill job form partially → "Save as Draft"
- [ ] Status = Draft → appears in list with Draft badge
- [ ] Can re-open and continue editing

### 2.4 Edit a job
- [ ] Edit existing Active job (change title or salary)
- [ ] Save → changes reflected in list and candidate board header

### 2.5 Close a job
- [ ] Change job status to Closed
- [ ] Confirm: closed job no longer shows in active pipeline filter

### 2.6 Delete a job
- [ ] Delete a job that has no candidates → removed from list
- [ ] Attempt delete on job with candidates — confirm expected behaviour (block or cascade)

### 2.7 Job apply link
- [ ] Copy the public apply link from job detail
- [ ] Open in incognito → application form loads correctly (no auth required)
- [ ] Submit application → candidate appears in pipeline at New stage

---

## 3. CANDIDATE MANAGEMENT

### 3.1 Add candidate manually
- [ ] Open a job's candidate view → "Add Candidate"
- [ ] Fill: name, email, role, location, experience, skills
- [ ] Save → candidate appears in **New** column
- [ ] AI match score displayed on card (may take a moment)

### 3.2 Bulk CV upload
- [ ] Go to `/candidates` → Bulk Upload
- [ ] Select the job created in 2.1
- [ ] Drag in 2–3 PDF CVs
- [ ] Progress shows per file: extracting → parsing → scoring
- [ ] Candidates appear in New stage with AI match scores
- [ ] Check one candidate modal: name, email, skills auto-filled from CV
- [ ] CV download link works

### 3.3 Candidate pool import (no job selected)
- [ ] Bulk upload with pool option (no specific job)
- [ ] Candidates created in pool
- [ ] Can reassign to a job from candidate detail

### 3.4 Direct application via public link
- [ ] Use apply link from 2.7
- [ ] Submit with a new email → candidate appears in New stage
- [ ] Source shown as "direct_application"

### 3.5 Duplicate email handling
- [ ] Try adding a candidate with an email already in the system
- [ ] Confirm deduplication works (either blocked or merged, not duplicated)

---

## 4. PIPELINE / KANBAN BOARD

### 4.1 Board layout
- [ ] Go to `/candidates`
- [ ] All stage columns visible: New, Screening, Interview, Offer, Hired, Rejected
- [ ] Candidate cards show: name, AI score, company, skills, action menu

### 4.2 Filter by job
- [ ] Select job filter → only candidates for that job shown
- [ ] Switch job → board updates

### 4.3 Search candidates
- [ ] Type candidate name in search → board filters in real time
- [ ] Search by skill → matching candidates shown

### 4.4 Move candidate: New → Screening
- [ ] Drag candidate from New to Screening (or use stage selector)
- [ ] If no Screening email workflow configured → confirm expected behaviour (block with message or allow)
- [ ] If workflow exists → email sends automatically
- [ ] Candidate appears in Screening column

### 4.5 Move candidate: Screening → Interview
- [ ] Drag candidate to Interview column
- [ ] No workflow required for Interview — transition should succeed
- [ ] Candidate appears in Interview column

### 4.6 Move candidate to Offer (without offer)
- [ ] Try dragging candidate to Offer column without an existing offer
- [ ] Confirm blocked with clear message: requires an active offer

### 4.7 Move candidate to Offer (with offer)
- [ ] Create an offer first (section 6.1)
- [ ] Move candidate to Offer column
- [ ] Candidate moves to Offer stage ✓

### 4.8 Move candidate: Offer → Hired
- [ ] Accept the offer (section 6.4)
- [ ] Candidate automatically moves to Hired column

### 4.9 Reject candidate
- [ ] Use card action menu → Reject
- [ ] Candidate moves to Rejected column
- [ ] If Rejection workflow configured → email sends

### 4.10 Delete candidate
- [ ] Use card action menu → Delete
- [ ] Confirm prompt → candidate removed from board

### 4.11 List view
- [ ] Switch board to list view
- [ ] All candidates shown in sortable table
- [ ] Sorting by name, score, stage works

---

## 5. CANDIDATE DETAIL MODAL

### 5.1 Open modal
- [ ] Click candidate card → modal opens
- [ ] All tabs visible: Overview, Portfolio, Email, Notes, Feedback, Offers

### 5.2 Overview tab
- [ ] Name, email, role, location displayed correctly
- [ ] AI match score and analysis visible
- [ ] Skills list matches what was parsed from CV
- [ ] Work experience entries shown
- [ ] Edit candidate fields → save → changes persist

### 5.3 CV / Resume
- [ ] Download CV link works (opens PDF)
- [ ] If no CV uploaded → graceful empty state shown

### 5.4 Portfolio tab
- [ ] LinkedIn, GitHub, portfolio URLs displayed
- [ ] Links open in new tab correctly

### 5.5 Email tab
- [ ] View email history for this candidate
- [ ] Compose a new email → fill subject + body → send
- [ ] Email appears in history with sent timestamp
- [ ] Delivery status tracked (sent/opened/clicked)

### 5.6 Notes tab
- [ ] Add an internal note
- [ ] Note appears with timestamp and author
- [ ] Edit note → save → updated
- [ ] Notes are not visible to candidate

### 5.7 Feedback tab
- [ ] After scheduling an interview → feedback form available
- [ ] Fill rating + comments → save
- [ ] Feedback viewable by other team members

### 5.8 Offers tab (in modal)
- [ ] Existing offers for candidate shown
- [ ] "Create Offer" button → opens offer creation flow
- [ ] Candidate and job pre-filled

### 5.9 Stage change from modal
- [ ] Change stage using stage selector inside modal
- [ ] Board updates to reflect new stage

### 5.10 Schedule interview from modal
- [ ] Click "Schedule Interview"
- [ ] Fill: date, time, duration, type (Google Meet/Phone/In-Person), interviewer, notes
- [ ] Save → interview appears in Calendar
- [ ] Google Meet link generated for Google Meet type

---

## 6. OFFERS

### 6.1 Create offer
- [ ] Go to `/offers` → "Create Offer"
- [ ] Fill: position, link to job, link to candidate, start date, salary (amount, currency, period), benefits, notes, expiration date
- [ ] Save as Draft → appears in offers list with Draft badge

### 6.2 Create general offer (no candidate)
- [ ] Create offer without selecting a candidate
- [ ] Saves successfully — can be linked to candidate later

### 6.3 Send offer
- [ ] From offers list → Send on a Draft offer
- [ ] Status changes to Sent
- [ ] Candidate receives offer email with link
- [ ] Candidate stage moves to Offer automatically

### 6.4 Candidate accepts offer
- [ ] Open offer response link (from email, or `/offers/respond/:token`)
- [ ] Click Accept
- [ ] Offer status → Accepted
- [ ] Candidate stage → Hired automatically

### 6.5 Candidate declines offer
- [ ] Open offer response link → Decline
- [ ] Offer status → Declined
- [ ] Candidate stage remains at Offer (or moves to Rejected based on config)

### 6.6 Negotiate / counter-offer
- [ ] From offer detail → Negotiate
- [ ] Add counter-offer notes
- [ ] Status → Negotiating
- [ ] Negotiation history recorded

### 6.7 Offer viewed tracking
- [ ] After sending, candidate opens the offer link
- [ ] Offer status changes from Sent → Viewed

### 6.8 Offer expiry
- [ ] Set expiration date to past → status shows Expired
- [ ] Expired offers cannot be accepted

### 6.9 Archive offer
- [ ] Archive a Declined offer
- [ ] Offer removed from default list
- [ ] Visible when "Archived" filter selected

### 6.10 Search and filter offers
- [ ] Filter by status (Draft, Sent, Viewed, Accepted, Declined, Negotiating)
- [ ] Search by candidate name / position / reference number
- [ ] Results update correctly

---

## 7. CALENDAR & INTERVIEWS

### 7.1 View calendar
- [ ] Go to `/calendar`
- [ ] Month view loads with scheduled interviews visible on correct dates
- [ ] Click a date → interviews for that day shown

### 7.2 Schedule interview
- [ ] Click "Schedule Interview" (from calendar or candidate modal)
- [ ] Fill: candidate, job, date, time, duration, type, interviewer, meeting link / notes
- [ ] Save → appears on calendar on correct date

### 7.3 Reschedule interview
- [ ] Open interview from calendar → Reschedule
- [ ] Change date/time → save
- [ ] Calendar updates to new slot

### 7.4 Cancel interview
- [ ] Cancel interview → provide reason
- [ ] Removed from calendar
- [ ] Candidate stage remains unchanged

### 7.5 Google Calendar sync
- [ ] For Google Meet interview → verify meeting link is generated
- [ ] Sync to Google Calendar (if integration enabled) — best-effort, note any errors

### 7.6 Interview feedback flow
- [ ] After interview date passes → feedback form available in candidate modal
- [ ] Submit feedback → visible in Feedback tab

---

## 8. EMAIL WORKFLOWS (Settings)

### 8.1 Create a workflow
- [ ] Go to Settings → Email Workflows
- [ ] Create workflow for Screening stage: subject, body with placeholders ({{candidateName}}, {{jobTitle}})
- [ ] Enable workflow → save

### 8.2 Test workflow email
- [ ] Use "Test" button → enter test email address
- [ ] Email received with correct placeholders substituted

### 8.3 Workflow triggers on stage move
- [ ] Move a candidate to Screening
- [ ] Confirm workflow email sent (check Email tab in candidate modal)

### 8.4 Disable workflow
- [ ] Toggle workflow off → move candidate to that stage
- [ ] Confirm no email sent but stage change still succeeds

### 8.5 Edit and delete workflow
- [ ] Edit workflow subject → save → re-test to confirm change
- [ ] Delete workflow → no longer listed

---

## 9. REPORTS

### 9.1 Load reports
- [ ] Go to `/reports`
- [ ] All metric cards load: Time to Hire, Pipeline Conversion, Offer Acceptance, Interview-to-Offer, Source Quality

### 9.2 Date range filters
- [ ] Switch between 30d / 90d / 6m / 1y
- [ ] Metrics update for each range

### 9.3 Job filter
- [ ] Filter reports by specific job
- [ ] Metrics reflect only that job's candidates

### 9.4 Verify metric accuracy
- [ ] Time to Hire: matches candidates hired in date range
- [ ] Pipeline Conversion funnel shows correct stage counts
- [ ] Offer Acceptance Rate = accepted / sent offers
- [ ] Source Quality shows breakdown by candidate source

### 9.5 Export CSV
- [ ] Click Export → CSV downloads
- [ ] Open file: columns present (Candidate Name, Job Title, Source, Date Applied, Date Hired, Days to Hire, Offer Status)
- [ ] Data matches what's visible in reports

---

## 10. DASHBOARD

### 10.1 Stats accuracy
- [ ] Active Jobs count matches `/jobs` list
- [ ] Total Candidates matches `/candidates` board
- [ ] Recent activity feed shows latest actions (candidate added, stage moved, offer sent)

### 10.2 Quick links
- [ ] Dashboard links navigate to correct pages

---

## 11. RBAC — ROLE RESTRICTIONS

Run these with a second test account invited to the workspace at each role.

### 11.1 Viewer role
- [ ] Can access: `/dashboard`, `/candidates`, `/settings`
- [ ] Cannot access: `/jobs`, `/calendar`, `/offers`, `/reports`, `/clients` → redirected to `/dashboard`
- [ ] Sees only candidates from assigned jobs
- [ ] Cannot drag candidates between stages
- [ ] Cannot delete candidates
- [ ] Cannot create jobs

### 11.2 HiringManager role
- [ ] Can access: `/dashboard`, `/candidates`, `/jobs`, `/calendar`, `/clients`, `/settings`
- [ ] Cannot access: `/offers`, `/reports` → redirected to `/dashboard`
- [ ] Can view jobs but cannot create new ones
- [ ] Can move candidates between stages
- [ ] Can schedule interviews
- [ ] Can view offers but salary amount is hidden
- [ ] Cannot delete candidates

### 11.3 Recruiter role
- [ ] Can access all routes except admin settings
- [ ] Can create/edit jobs
- [ ] Full candidate management (move, delete, bulk import)
- [ ] Full offer management (create, send, negotiate)
- [ ] Can view salary in offers
- [ ] Can export reports
- [ ] Cannot delete other users / change billing

### 11.4 Admin role
- [ ] Full access to everything
- [ ] Can delete jobs (including jobs with candidates)
- [ ] Can manage workspace members (invite, remove)
- [ ] Can manage billing / subscription
- [ ] Can configure email workflows

---

## 12. EDGE CASES & ERROR HANDLING

### 12.1 Move to Offer without active offer
- [ ] Drag to Offer column → blocked with message explaining an offer is required

### 12.2 Workflow missing for stage
- [ ] No Screening workflow configured → move candidate to Screening
- [ ] Confirm: either blocked with clear message, or moves and skips email gracefully

### 12.3 CV upload — unreadable PDF
- [ ] Upload a scanned/image-only PDF with no embedded text
- [ ] Confirm: graceful failure message, candidate not created with empty data

### 12.4 CV upload — non-PDF file
- [ ] Upload a .jpg or unsupported file
- [ ] Confirm: rejected at upload stage with clear error

### 12.5 Offer expiration
- [ ] Candidate tries to accept an expired offer via the response link
- [ ] Confirm: expired message shown, cannot accept

### 12.6 Duplicate job apply
- [ ] Same candidate email submits via apply link twice for same job
- [ ] Confirm: deduplication — second submission handled gracefully (blocked or merged)

### 12.7 Empty states
- [ ] No jobs created → Jobs page shows empty state with CTA
- [ ] No candidates → Board shows empty columns, not broken layout
- [ ] No interviews → Calendar shows empty, not error

### 12.8 Network / DB error handling
- [ ] Simulate slow connection (browser dev tools → throttle to Slow 3G)
- [ ] Confirm: loaders shown during all async operations
- [ ] Confirm: error toasts shown on failures, not silent

---

## 13. END-TO-END HIRING FLOW

Run the complete happy path in one sequence:

- [ ] Create client → "Acme Corp"
- [ ] Create Active job → "Senior Engineer" linked to Acme Corp
- [ ] Add candidate manually → moves to New
- [ ] Upload 2 CVs → appear in New with AI scores
- [ ] Configure Screening email workflow
- [ ] Move candidate to Screening → workflow email fires
- [ ] Move candidate to Interview → schedule interview in calendar
- [ ] Create offer: £80,000 salary, 30-day expiry
- [ ] Send offer → candidate stage moves to Offer
- [ ] Open offer response link → Accept → candidate moves to Hired
- [ ] Check Reports: Time to Hire shows this candidate, Offer Acceptance = 100%
- [ ] Export CSV → row for hired candidate present

---

## Pass Criteria

| Area | Status |
|------|--------|
| Client CRUD | ☐ |
| Job CRUD + apply link | ☐ |
| Manual candidate add | ☐ |
| Bulk CV upload + AI parsing | ☐ |
| Pipeline stage transitions | ☐ |
| Candidate modal (all tabs) | ☐ |
| Offer lifecycle | ☐ |
| Calendar / interviews | ☐ |
| Email workflows | ☐ |
| Reports + export | ☐ |
| Dashboard accuracy | ☐ |
| RBAC (all 4 roles) | ☐ |
| Edge cases | ☐ |
| End-to-end flow | ☐ |
