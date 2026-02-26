# Role and seat limits – product spec

This document is the source of truth for role capabilities, invite limits, and what each role can and cannot do. Implementation status is summarized at the end.

---

## Seat limits (why)

- **Recruiter: unlimited**  
  Your revenue depends on teams using the product heavily. Capping recruiters caps your own growth. A company with 10 recruiters should be able to add all 10.

- **Hiring Manager: unlimited**  
  Same reason. A 50-person company might have 15 hiring managers across departments. Capping this would make the product unusable for growing teams.

- **Viewer: capped at 5**  
  Viewers consume value without generating it. They do not move candidates, send offers, or run workflows. Five is enough for a CEO, a couple of department heads, and maybe a board member or investor. More than five starts feeling like a reporting tool rather than an ATS, and you are not building a reporting tool.

---

## ADMIN

### The three things that make someone an Admin

1. First user to create the workspace is automatically Admin.
2. Admin cannot demote themselves or be removed.
3. There is only one Admin per workspace (the owner).

### DO

- Create, edit, archive, and delete jobs
- Invite team members and assign their roles
- Change any team member's role at any time
- Remove team members from the workspace
- Manage billing, upgrade or downgrade the plan
- View and download all invoices
- Create, edit, and delete email workflows
- Create, edit, and delete email templates
- Move candidates through any pipeline stage
- Create, send, edit, and delete offers
- Accept or decline counter offers
- Schedule, reschedule, and cancel interviews
- Submit and edit interview feedback
- View all candidate profiles, CVs, notes, and email history
- Add and edit notes on any candidate
- Send emails to any candidate
- Source candidates on any job
- Export candidates up to your plan limit
- Bulk move and bulk reject candidates
- View all reports and download them
- Manage all integrations
- View and revoke any team member's active sessions
- Enable or disable MFA requirements for the workspace
- Delete candidates permanently
- View salary details on all offers
- View the full activity feed
- Change workspace name and settings

### DO NOT

- Demote yourself if you are the Admin
- Delete the workspace without contacting support — this is intentionally not a self-serve action to prevent accidental deletion
- Share your login credentials with anyone — use the invite system instead

---

## RECRUITER

### How they join

Invited by Admin only. They receive an email link, sign up or log in, and land directly in the workspace as a Recruiter. They skip pricing and onboarding.

### DO

- Create and edit jobs — but not delete them
- View all jobs and all candidates across the workspace
- Move candidates through pipeline stages
- Add candidates manually
- Edit candidate profiles
- View all candidate CVs, match scores, notes, and email history
- Add and edit notes on any candidate
- Send emails to any candidate
- Schedule, reschedule, and cancel interviews
- Submit interview feedback
- View all interview feedback from all interviewers
- Create and send offers
- Edit offers they created
- Accept and decline counter offers
- Archive offers
- Create and edit email workflows — but not delete them
- Create and edit email templates — but not delete them
- Source candidates on any active job
- Export candidates up to plan limit
- Bulk move and bulk reject candidates
- View all reports and download them
- Manage integrations
- Edit their own profile, password, and notification preferences
- View the team members list

### DO NOT

- Delete jobs — archive or close instead
- Delete candidates — reject instead
- Delete email workflows or templates — only Admins delete
- Access billing or invoices
- Invite or remove team members
- Change anyone's role
- Revoke other users' sessions
- View or change workspace security settings
- Promote themselves or anyone else to Admin
- Send offers on behalf of a general offer not linked to a candidate

---

## HIRING MANAGER

### How they join

Invited by Admin only. Same invite flow as Recruiter. They are typically a department head or team lead who is hiring for their team but is not a professional recruiter.

### DO

- View jobs they have been assigned to
- View candidates applying to their assigned jobs
- View candidate CVs for their assigned jobs
- View AI match scores for their assigned jobs
- Submit interview feedback for interviews they are part of
- View interview feedback from other interviewers on their assigned jobs
- Add notes on candidates in their assigned jobs
- View email history on candidates in their assigned jobs
- View the pipeline Kanban for their assigned jobs
- View offer status for their assigned jobs — **but not salary details**
- View reports for their assigned jobs
- Edit their own profile, password, and notification preferences

### DO NOT

- View jobs they have not been assigned to
- View candidates outside their assigned jobs
- Move candidates between pipeline stages — recruiters own the pipeline
- Create, edit, or delete jobs
- Create, send, edit, or delete offers
- **See salary figures on any offer**
- Schedule or reschedule interviews — request this from a Recruiter
- Cancel interviews
- Send emails to candidates
- Access email workflows or templates
- Source candidates
- Export candidates
- Access billing
- Invite or remove team members
- Change anyone's role
- View company-wide reports or the full activity feed
- Delete anything

### Important nuance for Hiring Managers

They can see **offer status** — accepted, declined, negotiating — but **never the salary number**. This mirrors how many real companies operate: the hiring manager knows whether an offer was accepted, but compensation details stay with HR.

---

## VIEWER

### How they join

Invited by Admin only. **Maximum 5 Viewers per workspace.** A Viewer invitation should be used thoughtfully — typically for a CEO, department head, board member, or investor who needs visibility without operational access.

### DO

- View the dashboard for **assigned jobs only** — headline numbers and pipeline flow chart
- View job titles, departments, and status for assigned jobs
- View **aggregate pipeline stage counts** for assigned jobs — how many candidates per stage, **not who they are**
- View the five core metrics in reporting for assigned jobs — time to hire, conversion rate, offer acceptance rate, interview to offer ratio, source quality
- Edit their own profile, password, and notification preferences

### DO NOT

- View individual candidate names, profiles, CVs, or contact details
- View any offer details including existence, status, or salary
- View interview schedules, feedback, or interviewer names
- View email history or any candidate communications
- View recruiter notes on candidates
- See jobs outside their assigned scope
- See company-wide stats or reports
- Download or export any data whatsoever
- Access the Candidates page as a full feature
- Access the Offers page
- Access the Calendar
- Access Settings beyond their own profile
- See who else is on the team
- See billing information
- Create, edit, or delete anything in the system
- Move candidates, send emails, schedule interviews, or take any action that changes data

### What their sidebar looks like

**Dashboard and their own profile settings. That is it.** No Candidates, no Jobs as a full management page, no Offers, no Calendar, no Settings beyond personal. A clean, minimal interface that shows them exactly what they need and nothing else.

---

## Implementation status (checklist)

| Item | Status | Notes |
|------|--------|--------|
| **Seat limits** | | |
| Recruiter unlimited | ✅ | No cap in invite or DB |
| Hiring Manager unlimited | ✅ | No cap in invite or DB |
| Viewer cap at 5 per workspace | ✅ | Enforced in `createInvite`: count members + pending invites, reject if ≥ 5 |
| **Admin** | | |
| First user = Admin, one Admin per workspace | ✅ | DB + trigger + invite flow |
| Admin cannot demote self / be removed | ✅ | Enforced in UI and DB |
| Full Admin DO list | ✅ | Billing, team, jobs, candidates, offers, etc. enforced in API/RLS/UI |
| **Recruiter** | | |
| Invite by Admin only, no delete job | ✅ | createInvite Admin-only; jobs.delete Admin-only |
| Recruiter DO/DO NOT | ✅ | Team/Billing hidden; delete job/candidate/workflow/template restricted |
| **Hiring Manager** | | |
| HM sees only assigned jobs (hiring_manager_id) | ✅ | RLS + API scope |
| HM sees offer status but not salary | ⚠️ | **Verify** — OfferCard/CandidateModal should hide salary for HM |
| **Viewer** | | |
| Viewer sees only assigned jobs (job_assignments) | ✅ | API: jobs.list/get, getStats filter by assigned job IDs |
| Viewer: no Candidates/Offers/Calendar/Team in UI | ✅ | Sidebar shows only Dashboard + Settings for Viewer |
| Viewer: aggregate counts only, no individual candidate data | ✅ | Manage Job modal shows aggregate count + pipeline only for Viewer; no candidate list or names |
| Viewer: no export, no Settings beyond profile | ✅ | Export/bulk disabled; Settings tabs restricted (profile/notifications only for Viewer) |

**Team list UX (8+ members)**

- When workspace has 8 or more members, the Team tab in Settings shows a **search** box (filter by name) and **pagination** (8 per page, Next/Previous).
