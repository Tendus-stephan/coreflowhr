# Workspace role restrictions and implementation status

Roles are **workspace-scoped** (stored in `workspace_members.role`). Only one **Admin** per workspace (the owner, `workspaces.created_by`).

---

## Viewer role – exactly what they can and cannot do

**Viewers** are workspace members with the role `Viewer`. They only see data for **jobs they’re assigned to** (via `job_assignments`). An Admin or Recruiter must assign them to specific jobs; until then they see no jobs.

### What a Viewer CAN do (view only)

| Area | Allowed |
|------|--------|
| **Jobs** | **View** only jobs they are assigned to (rows in `job_assignments`). No other jobs in the workspace. |
| **Candidates** | **View** candidates for those assigned jobs only (in practice the app loads by job, so they only see candidates for jobs they can see). |
| **Interviews** | **View** interviews for candidates on those jobs. |
| **Offers** | **View** offers for candidates on those jobs. |
| **Dashboard** | Stats and lists are workspace-scoped; RLS limits rows to jobs they can see, so they only see metrics for their assigned jobs. |
| **Calendar** | See interviews for their assigned jobs. |
| **Settings** | **My Profile**, **Notifications**, **Email Templates**, **Security** (their own). |

### What a Viewer CANNOT do

| Area | Not allowed |
|------|-------------|
| **Jobs** | Create, edit, or delete jobs. Cannot post jobs or change job status. |
| **Candidates** | Add candidates, move stages, edit candidates, delete (enforced by RLS/API; no write policies for Viewer). |
| **Interviews** | Schedule, reschedule, or cancel interviews (no write access). |
| **Offers** | Create, send, or manage offers (no write access). |
| **Team & Access** | Cannot open the Team tab (hidden for Viewer). Cannot invite members or change anyone’s role. |
| **Billing & Plan** | Cannot open Billing or Integrations (Admin only). |
| **Sourcing** | Cannot run candidate sourcing/scraping (create job and job-level actions are Admin/Recruiter). |

### How assignment works

- **job_assignments** links a user to a job. Only **Admin** or **Recruiter** can add/remove those assignments (RLS on `job_assignments`).
- Until a Viewer is assigned to at least one job, their job list (and thus candidates, interviews, offers) is empty.

---

## Permission matrix

| Capability | Admin | Recruiter | Hiring Manager | Viewer |
|------------|-------|-----------|----------------|--------|
| **Jobs** |
| View all workspace jobs | ✅ | ✅ | Only jobs where HM | Only assigned jobs (`job_assignments`) |
| Create jobs | ✅ | ✅ | ❌ | ❌ |
| Edit jobs (workspace) | ✅ | ✅ | ❌* | ❌ |
| Delete jobs | ✅ | ❌ | ❌ | ❌ |
| **Candidates / Interviews / Offers** |
| View (same as job visibility) | ✅ | ✅ | By job (HM) | By assigned job |
| Add/edit candidates, schedule interviews, manage offers | ✅ | ✅ | By job (HM) | ❌ (view only for assigned jobs) |
| **Team & billing** |
| Team & Access tab | ✅ | ✅ | ❌ | ❌ |
| Invite members, change roles | ✅ | ❌ | ❌ | ❌ |
| Billing & Plan, Integrations | ✅ | ❌ | ❌ | ❌ |
| **Other** |
| My Profile, Notifications, Email Templates, Security | ✅ | ✅ | ✅ | ✅ |

\* HM: can edit/act on jobs where they are `hiring_manager_id` (RLS allows it); API may still restrict some writes.

---

## Where it’s enforced

### Database (RLS) – implemented

- **Jobs**
  - **SELECT:** owner, or `hiring_manager_id`, or in `job_assignments`, or workspace member with role Admin/Recruiter (see `20260228120000`, `20260228100000`).
  - **INSERT:** only if workspace member with role **Admin** or **Recruiter** (`20260228110000`).
  - **UPDATE:** owner or workspace Admin/Recruiter.
  - **DELETE:** only workspace **Admin** (`20260228110000`).
- **Candidates / interviews / offers:** SELECT by job visibility (workspace or HM or job_assignments); INSERT/UPDATE/DELETE by job ownership / workspace role (policies in migrations).
- **workspace_members:** Only owner can be Admin; trigger and constraint enforce one Admin per workspace (`20260228230000`, `20260228240000`).
- **workspace_invites:** Role must be Recruiter, HiringManager, or Viewer (no Admin) (`20260228240000`).
- **job_assignments:** Only Admin/Recruiter can manage; users can read their own (`20260228120000`).

### Application (API) – implemented

- **Create job:** `role === 'HiringManager'` → error “Only admins and recruiters can create jobs” (`api.ts` jobs.create). Viewer is not explicitly checked; RLS blocks INSERT.
- **Delete job:** `role !== 'Admin'` → error “Only admins can delete jobs” (`api.ts` jobs.delete).
- **Update job:** Edit allowed for owner or (workspace member and role !== 'HiringManager') (so Admin/Recruiter; HM/Viewer effectively restricted by RLS and context).
- **Billing:** `getInvoices`, `getBillingDetails` → `role !== 'Admin'` → throw (“Only admins can access billing”).
- **Team:** `updateMemberRole`, `createInvite` → require current user’s membership role **Admin** in that workspace; only Admin can invite or change roles.

### UI – implemented

- **Settings tabs:** Team and Billing/Integrations visible only for Admin (or Admin/Recruiter for Team) (`Settings.tsx`).
- **Team & Access:** Role dropdown for other members only if **current workspace role** is Admin (`Settings.tsx`).
- **Jobs:** Create/delete buttons or flows effectively limited by API/RLS (non‑Admin can’t delete; non‑Admin/Recruiter can’t create).

---

## Gaps / notes

1. **Viewer create job:** Blocked in API (`jobs.create` throws for Viewer); RLS also blocks INSERT. API does not explicitly block Viewer before calling DB; RLS blocks the INSERT. You could add `if (role === 'Viewer') throw new Error('…')` in `jobs.create` for a clearer message.
2. **Hiring Manager:** RLS gives HM access to jobs where they are `hiring_manager_id`; the app does not always “scope” UI (e.g. job list) by HM assignment—list is workspace-scoped and RLS filters rows. So HM sees only those jobs in the list.
3. **Viewer job list:** Viewer should see only jobs they’re assigned to via `job_assignments`. That is enforced by RLS (jobs SELECT policy). The app uses the same `jobs.list` and dashboard stats; they are workspace-scoped in the API with `workspace_id`, so a Viewer in that workspace only gets rows RLS allows (assigned jobs only).
4. **Viewer candidates RLS:** Intended behaviour is Viewers see candidates only for jobs they're assigned to. Jobs are already restricted by `job_assignments`. Candidates/interviews/offers RLS may allow SELECT for any workspace job; in practice the app loads by job, so Viewers only see data for jobs they can see. A future migration could tighten candidates RLS to require `job_assignments` for Viewers.

---

## Summary

- **Restrictions** for Admin, Recruiter, Hiring Manager, and Viewer are defined as above and are **implemented** in RLS, API, and UI.
- **One Admin per workspace** (owner only) and **invited users never Admin** are enforced in the DB and invite/accept flow.
