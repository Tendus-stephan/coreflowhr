# Coreflow Manual Testing Checklist

Test with **two browser windows**: one as **Admin** (workspace owner) and one as a **non-Admin member** (Recruiter or HiringManager). Use a third window for **Viewer** where noted.

---

## 1. Registration & Onboarding

- [ ] **Sign up** with a new email → lands on onboarding wizard
- [ ] Complete onboarding → workspace is created, user is Admin
- [ ] **Duplicate sign-up** with same email → shows "already registered" error, no duplicate workspace

---

## 2. Workspace Invite & RBAC

- [ ] Admin invites a user as **Recruiter** → invite email arrives
- [ ] Invited user clicks link → accepts invite → role shown as Recruiter in Settings
- [ ] Admin invites same user again with **Viewer** role → user re-accepts → role must **not** be downgraded (stays Recruiter)
- [ ] Admin invites their own email → role must **not** change from Admin
- [ ] Settings > Team Members role dropdown: **Admin option must not appear** in the list

---

## 3. Access Control (RBAC route guard)

| Route | Admin | Recruiter | HiringManager | Viewer |
|-------|-------|-----------|---------------|--------|
| /dashboard | ✓ | ✓ | ✓ | ✓ |
| /candidates | ✓ | ✓ | ✓ | ✓ |
| /jobs | ✓ | ✓ | ✓ | ✗ → redirect |
| /calendar | ✓ | ✓ | ✓ | ✗ → redirect |
| /offers | ✓ | ✓ | ✗ → redirect | ✗ → redirect |
| /reports | ✓ | ✓ | ✗ → redirect | ✗ → redirect |
| /settings | ✓ | ✓ | ✓ | ✓ |

- [ ] Navigate to each route above as each role and verify redirect behaviour

---

## 4. Candidates

- [ ] **Admin** creates candidate → visible to Recruiter, HiringManager, Viewer in same workspace
- [ ] **Recruiter** member can move candidate through pipeline stages
- [ ] **Viewer** cannot delete or reject candidates (action buttons hidden / blocked)
- [ ] **HiringManager** cannot delete candidates
- [ ] **Search** returns only candidates in the current workspace
- [ ] **Bulk CV upload** → candidates land in correct job (or pool)

### Pool Candidates
- [ ] Pool candidate card shows amber "Not assigned to a job" banner in modal
- [ ] Schedule Interview button **disabled** for pool candidates (shows toast)
- [ ] Create Offer button **disabled** for pool candidates (shows toast)
- [ ] Assign to job via dropdown in modal → candidate moves to that job

---

## 5. Jobs

- [ ] Create job → visible to all workspace members
- [ ] "Applied" count on Jobs in Progress dashboard widget shows correct live count
- [ ] HiringManager/Viewer **cannot** create or delete jobs (buttons hidden)
- [ ] Recruiter **can** create/edit/archive jobs

---

## 6. Interviews

- [ ] **Schedule interview** as Admin → interview visible to Recruiter and HiringManager in same workspace
- [ ] Scheduled interview appears in **Dashboard > Upcoming Interviews** for all workspace members
- [ ] Scheduled interview appears in **Calendar** view for all workspace members
- [ ] Interview shows in **CandidateModal > Interviews** tab for all workspace members
- [ ] **Cancel interview** as Admin → disappears from all views
- [ ] Viewer **cannot** cancel or create interviews

---

## 7. Offers

- [ ] **Create offer** as Admin → visible to Recruiter in same workspace
- [ ] **Recruiter** can create and edit offers
- [ ] **HiringManager** cannot create offers (button hidden)
- [ ] **Viewer** cannot create or edit offers
- [ ] Pool candidate → Create Offer blocked with toast
- [ ] Offer tabs (Active / Accepted / Declined / Archived) show correct counts
- [ ] Accept / Decline offer → status updates correctly in workspace

---

## 8. Notes (Privacy)

- [ ] Admin adds a **private note** on a candidate
- [ ] Recruiter in same workspace **cannot see** that private note
- [ ] Admin can see their own private note
- [ ] Public note → visible to all workspace members

---

## 9. Notifications

- [ ] **Interview reminder** fires within 24 h of interview (trigger by scheduling an interview today + 1 hour)
- [ ] **Feedback reminder** fires after interview date passes without feedback
- [ ] Notifications appear in the bell dropdown for the correct user

---

## 10. Reports

- [ ] Admin can access /reports page
- [ ] Recruiter can access /reports page
- [ ] HiringManager is redirected away from /reports
- [ ] Charts/data show only current workspace data

---

## 11. Settings & Integrations

- [ ] Admin can save/disconnect Slack webhook
- [ ] Recruiter attempting to save Slack webhook → blocked with error toast
- [ ] HiringManager/Viewer attempting to save Slack webhook → blocked
- [ ] Admin can invite, change role (not Admin), remove members
- [ ] Admin **cannot** assign Admin role to another member from dropdown

---

## 12. CV Parsing & AI Scoring (requires Anthropic credits)

- [ ] Upload a PDF CV → fields auto-fill (name, email, skills, experience)
- [ ] AI scoring runs on candidate profile → score and summary appear
- [ ] **Unauthenticated** call to `/functions/v1/parse-cv` (no Authorization header) → **401 Unauthorized**
- [ ] **Unauthenticated** call to `/functions/v1/analyze-candidate` → **401 Unauthorized**

---

## 13. Cross-Workspace Isolation

- [ ] User is Admin in Workspace A, Recruiter in Workspace B
- [ ] Switch to Workspace B → role should be Recruiter, not Admin
- [ ] Candidates/jobs from Workspace A **not visible** in Workspace B
- [ ] Offers from Workspace A **not visible** in Workspace B

---

## 14. Edge Cases

- [ ] Expired invite token → "Invalid or expired invite" error
- [ ] Wrong-email invite link → "This invitation was sent to X" error
- [ ] Archive a candidate → candidate disappears from Active views, appears in Archive tab
- [ ] Delete a candidate → confirm prompt shown, candidate removed
- [ ] Stage transition Offer → Hired only allowed after offer is Accepted

---

*Generated: 2026-03-21 — covers all 34 issues from the security audit.*
