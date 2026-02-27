# RLS (Row Level Security) audit

This document summarizes how RLS is set up for workspace- and role-based access, and notes any gaps.

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| **workspace_members** | ✅ | SELECT via `is_workspace_member()` (no recursion); UPDATE own or Admin in workspace |
| **workspaces** | ✅ | SELECT if `is_workspace_member(id)` |
| **workspace_invites** | ✅ | Admin only (FOR ALL) |
| **jobs** | ✅ | SELECT: owner, HM, job_assignments, or Admin/Recruiter in workspace; INSERT/UPDATE Admin/Recruiter; DELETE Admin only |
| **job_assignments** | ✅ | Admin/Recruiter manage; users see own rows |
| **candidates** | ⚠️→✅ | **Fixed in migration**: Viewer was seeing all workspace candidates; now Viewer only sees candidates for assigned jobs |
| **interviews** | ⚠️→✅ | Same fix: Viewer only sees interviews for candidates on assigned jobs |
| **offers** | ⚠️→✅ | Same fix: Viewer only sees offers for candidates on assigned jobs |
| **activity_log** | ✅ | user_id = me or workspace member (workspace_id scoped) |
| **profiles / notifications / clients / etc.** | (varies) | Some tables use user_id or workspace_id; see migrations |

---

## Jobs

- **SELECT** (20260228120000): visible if
  - `auth.uid() = user_id` (owner), or
  - `auth.uid() = hiring_manager_id`, or
  - `EXISTS (job_assignments WHERE job_id = jobs.id AND user_id = auth.uid())` (Viewer assigned), or
  - workspace member with role **Admin** or **Recruiter** (not Viewer/HM for “all jobs”).
- **INSERT**: workspace Admin or Recruiter only (20260228110000).
- **UPDATE**: job owner or workspace Admin/Recruiter.
- **DELETE**: workspace Admin only.

Correct: Viewers only see jobs they are assigned to at the DB level.

---

## Candidates (before fix)

- **SELECT** (20260228100000): visible if
  - `auth.uid() = user_id` (creator), or
  - candidate’s job is visible where “visible” = HM of job **or** **any** workspace member.

Because “workspace member” included Viewers, **Viewers could see all candidates in the workspace** via direct Supabase SELECT. The app layer (e.g. `getViewerAssignedJobIds`) does not change what RLS allows.

---

## Offers (before fix)

- Same pattern as candidates: “visible” included any workspace member, so Viewers could see all offers in the workspace at the DB level.

---

## Interviews (before fix)

- Same as candidates/offers: Viewers could see all interviews for candidates in the workspace.

---

## Fix applied

Migration **20260228330000_viewer_rls_candidates_offers_interviews.sql**:

- **candidates**: SELECT only if candidate’s job is visible under the same rules as **jobs** (owner, HM, in job_assignments, or Admin/Recruiter in workspace). So Viewers only see candidates for jobs they’re assigned to.
- **offers**: SELECT only if the offer’s candidate’s job is visible under the same rules.
- **interviews**: SELECT only if the interview’s candidate’s job is visible under the same rules.

This aligns RLS with the product spec: Viewers see only data for jobs they’re assigned to.

---

## Recursion / helpers

- **workspace_members** policies avoid self-reference by using **SECURITY DEFINER** helpers:
  - `is_workspace_member(ws_id)`
  - `is_workspace_admin(ws_id)`
- **jobs** policies reference `workspace_members` with role checks; that does not recurse because we’re not evaluating workspace_members from within a workspace_members policy.
- **job_assignments** policies reference **jobs** and **workspace_members**; both are safe (no cycle back into job_assignments).

---

## Site-wide isolation (no cross-user / cross-workspace read or overwrite)

Migration **20260228340000_tighten_rls_site_wide_isolation.sql** tightens RLS so that:

- **No user can read another user’s data** outside their workspace or ownership.
- **No user can overwrite another user’s data** unless they are in the same workspace with the right role (e.g. Admin/Recruiter for workspace data).

### Tables and policies

| Table | Read | Write (INSERT/UPDATE/DELETE) |
|-------|------|-----------------------------|
| **profiles** | Own row only (`id = auth.uid()`) | Own only |
| **notifications** | Own only (`user_id = auth.uid()`) | Own only |
| **user_settings** | Own only (`user_id = auth.uid()`) | Own only |
| **candidates** | Job-visible (owner, HM, assigned Viewer, or Admin/Recruiter in workspace) | Owner or workspace Admin/Recruiter |
| **interviews** | Same as candidates (via candidate’s job) | Owner or workspace Admin/Recruiter |
| **offers** | Same as candidates (via candidate’s job) | Owner or workspace Admin/Recruiter (via job’s workspace) |
| **activity_log** | Own or workspace member (existing) | INSERT only as self; no user DELETE |
| **clients** | Own or workspace member | Own or workspace member (delete: Admin/Recruiter) |
| **email_templates** | Own or workspace member | Own or workspace member (delete: Admin/Recruiter) |
| **integrations** | Own or workspace member (if `workspace_id` exists) else own | Same |

### Helper

- `is_workspace_admin_or_recruiter(ws_id)` — SECURITY DEFINER, used so that only Admin/Recruiter in a workspace can update/delete workspace-owned rows (e.g. candidates, interviews) they didn’t create.

### Result

- **Different workspaces**: Users in workspace A cannot read or modify data in workspace B.
- **Same workspace**: Only owner or workspace Admin/Recruiter can update/delete candidates, interviews, offers; Viewers cannot write.
- **Strictly own data**: Profiles, notifications, user_settings are strictly own-row only.

---

## Recommendations

1. **Run migrations** 20260228330000 (Viewer read restriction) and 20260228340000 (site-wide isolation) so the DB enforces all access rules.
2. **Prefer RLS over app-only checks** so that any client (e.g. Supabase from frontend) cannot bypass restrictions.
3. After deployment, spot-check: as Viewer, `supabase.from('candidates').select()` returns only candidates for assigned jobs; as User A in workspace 1, ensure no rows from workspace 2 are visible or updatable.
