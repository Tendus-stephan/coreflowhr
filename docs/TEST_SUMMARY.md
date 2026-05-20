# CoreflowHR — Test Suite Summary & Findings

**Date:** 2026-05-20
**Author:** QA Infrastructure build
**Status:** 366/366 unit + integration tests passing ✅

---

## 1. Test Results at a Glance

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Unit (new) | 9 | 106 | ✅ All passing |
| Integration (existing) | 15 | 260 | ✅ All passing |
| **Total** | **24** | **366** | ✅ **All passing** |
| E2E (Playwright) | 8 | ~80 scenarios | 🔧 Ready — needs live app + `npx playwright install` |
| Visual regression | 1 | 14 snapshots | 🔧 Ready — needs baseline generation |

---

## 2. Unit Test Coverage (New — 106 Tests)

### offer-status.test.ts — 13 tests
Tests `getOfferStatusLabel()` in `utils/offerStatus.ts`.

| Scenario | Result |
|----------|--------|
| `pending_approval` → "Awaiting approval" | ✅ |
| `awaiting_response` → "Awaiting response" | ✅ |
| `accepted`, `declined`, `signed`, `draft` | ✅ |
| `awaiting_signature` | ✅ |
| Archived offer → "Archived" regardless of status | ✅ |
| Past `expiresAt` on expirable status → "Expired" | ✅ |
| Past `expiresAt` on `accepted` (non-expirable) → ignored | ✅ |
| Unknown status → "Unknown" | ✅ |
| `null` / `undefined` offer → throws descriptive error | ✅ |

### salary.test.ts — 11 tests
Tests `formatSalary()` in `utils/salary.ts`.

| Scenario | Result |
|----------|--------|
| 64,999.97 → "$65,000 per year" (rounds correctly) | ✅ |
| 65,000.50 → "$65,001 per year" (rounds up at .5) | ✅ |
| 0 → "$0 per year" | ✅ |
| GBP → £ symbol | ✅ |
| EUR → € symbol | ✅ |
| Per month / per hour periods | ✅ |
| 1,500,000 → comma separators correct | ✅ |
| `null` / `undefined` → throws descriptive error | ✅ |

### rbac.test.ts — 20 tests
Tests `canPerformAction()` in `utils/rbac.ts`.

| Scenario | Result |
|----------|--------|
| Admin can do everything (billing, delete workspace, manage team) | ✅ |
| Recruiter can view candidates, jobs, offers | ✅ |
| Recruiter **cannot** access billing | ✅ |
| Recruiter **cannot** delete workspace or change roles | ✅ |
| HiringManager can view jobs/candidates, cannot view offers or billing | ✅ |
| Viewer can only view dashboard + candidates + settings | ✅ |
| `null` / `undefined` role → all actions denied | ✅ |
| Unknown role → defaults to Viewer (most restrictive) | ✅ |

### email-gates.test.ts — 8 tests
Tests `canSendEmail()` in `utils/emailGates.ts`.

| Scenario | Result |
|----------|--------|
| Preference ON → returns true | ✅ |
| Preference OFF → returns false | ✅ |
| Missing key in prefs → defaults to true (safe for transactional) | ✅ |
| `payment_failed` always returns true (cannot be disabled) | ✅ |
| Unknown email type → returns false (safe default) | ✅ |
| DB unavailable (null prefs) → fails open for transactional | ✅ |
| Missing `workspaceId` → throws descriptive error | ✅ |

### hex-color.test.ts — 8 tests
Tests `darkenHex()` in `utils/colorUtils.ts` (existing function).

| Scenario | Result |
|----------|--------|
| Darkens by correct amount per channel | ✅ |
| `#ffffff` darkened is never `#ffffff` | ✅ |
| Clamps at 0 — `#000000` darkened stays `#000000` | ✅ |
| Darkening by 0 returns same color | ✅ |
| Handles hex without `#` prefix | ✅ |
| Handles uppercase hex input | ✅ |
| Result is always valid 6-digit hex | ✅ |

### auth.test.ts — 9 tests
Tests password reset and invite token expiry logic.

| Scenario | Result |
|----------|--------|
| Valid token within 1 hour passes | ✅ |
| Token expired after 1 hour throws | ✅ |
| Already-used token throws | ✅ |
| Empty/tampered token throws | ✅ |
| Token at exactly 59 min still passes | ✅ |
| Valid pending invite passes | ✅ |
| Invite expired after 48 hours throws | ✅ |
| Already accepted invite throws | ✅ |

### cv-parser.test.ts — 9 tests
Tests CV file validation logic.

| Scenario | Result |
|----------|--------|
| Valid PDF returns parsed candidate object | ✅ |
| Non-PDF (jpg etc.) throws "Unsupported file type" | ✅ |
| File over 5 MB throws "File too large" | ✅ |
| Password-protected PDF → returns nulls, does not crash | ✅ |
| Empty PDF → returns nulls, does not crash | ✅ |
| Scanned/image-only PDF → graceful (whitespace-only text) | ✅ |
| Missing name field → `name` is null | ✅ |
| Garbled encoding → does not crash | ✅ |
| DOCX accepted | ✅ |

### scheduling.test.ts — 13 tests
Tests `generateAvailableSlots()` and `validateSchedulingToken()`.

| Scenario | Result |
|----------|--------|
| Slots stay within `availableHoursStart`–`availableHoursEnd` | ✅ |
| Buffer time applied (30 min slot + 15 min buffer = 45 min gap) | ✅ |
| Weekends excluded when `includeWeekends=false` | ✅ |
| Weekends included when `includeWeekends=true` | ✅ |
| Inverted date range returns empty array | ✅ |
| No hours configured returns empty array | ✅ |
| Single weekday, 1h slots, 8h window → 8 slots | ✅ |
| Valid token passes | ✅ |
| Expired token throws "expired" | ✅ |
| Already-booked token throws "already been booked" | ✅ |
| Empty/null/undefined token throws "invalid" | ✅ |

### activity-logger.test.ts — 15 tests
Tests the Supabase insert shape and valid action types.

| Scenario | Result |
|----------|--------|
| Insert called with correct table + required fields | ✅ |
| Insert payload always includes a timestamp | ✅ |
| All 13 standard action types are valid non-empty strings | ✅ |

---

## 3. Existing Integration Tests (260 Tests — All Passing)

These pre-existed and continue to pass after all infrastructure changes.

| File | Tests | Coverage area |
|------|-------|---------------|
| mfa-bypass.test.ts | 46 | MFA lockout, TOTP validation, bypass attempts |
| auth-bug-fixes.test.ts | 27 | Auth flow regressions, redirect logic, 2FA edge cases |
| auth-hardening.test.ts | 19 | Session handling, token edge cases |
| new-account-flow.test.ts | 16 | Signup → onboarding → workspace creation |
| workspace-and-invite.test.ts | 10 | RBAC, invite flows, role resolution |
| integration.test.ts | 17 | Cross-service integration checks |
| workflow-engine.test.ts | 20 | Stage-change email triggers |
| offers.test.ts | 22 | Offer state machine, approval flows |
| race-conditions.test.ts | 14 | Concurrent operations, duplicate prevention |
| api.security.test.ts | 12 | RLS, auth-gating on API calls |
| candidate-stages.test.ts | 21 | Stage transition validation |
| job-management.test.ts | 16 | Job CRUD, status transitions |
| bulk-import-same-email.test.ts | 3 | Duplicate CV import handling |
| activity-logging.test.ts | 13 | Activity log creation |
| liquamura-signin.test.ts | 4 | Client-specific auth regression |

---

## 4. Bugs Found During Test Build

### BUG-001 — Client logo missing on public job application pages [FIXED]
**Severity:** High — client branding broken for all public applicants
**Where:** `pages/JobApplication.tsx`
**Root cause:** `clients` table has RLS policy `auth.uid() = user_id`. The public job application page runs with the anon key (no session), so the query returned null silently. The logo fallback never triggered — the company initial letter showed instead.
**Fix:** Created `get_client_branding(uuid)` SECURITY DEFINER function in Supabase that bypasses RLS and exposes only `name` and `logo_url` to the anon role. Switched JobApplication to use `supabase.rpc('get_client_branding', ...)`.
**Migration:** `supabase/migrations/20260520120000_public_client_branding_rpc.sql`

### BUG-002 — Scheduling slot-count guard uses `<=` instead of `<` [FIXED]
**Severity:** Low — single-day scheduling ranges return 0 slots
**Where:** Inline scheduling logic
**Root cause:** Early-exit guard `if (dateRangeEnd <= dateRangeStart) return []` treated a same-day range (equal dates) as invalid. A recruiter setting up a same-day availability window would see no slots.
**Fix:** Changed to strict `<`. Equal dates = valid single-day range.

### BUG-003 — Auth test asserted "Payment received!" with exclamation mark [FIXED]
**Severity:** Low — test failure in CI
**Where:** `tests/auth-bug-fixes.test.ts:303`
**Root cause:** The impeccable pass removed the exclamation mark from AuthRedirect.tsx per brand guidelines, but the test still asserted `/Payment received!/`.
**Fix:** Updated test assertion and description to match the new copy.

### BUG-004 — Logo rendered at 120×120px inline style across all auth pages [FIXED]
**Severity:** Low — visual inconsistency, clunky oversized logo
**Where:** Login, SignUp, ForgotPassword, ResetPassword, AuthRedirect (5 files)
**Fix:** Replaced inline `style={{ width:'120px', height:'120px' }}` with Tailwind `w-[48px] h-[48px]` on all pages.

### BUG-005 — Error/success banners visually identical in ForgotPassword + ResetPassword [FIXED]
**Severity:** Medium — users cannot tell if their action succeeded or failed
**Where:** `pages/ForgotPassword.tsx`, `pages/ResetPassword.tsx`
**Root cause:** Both error and success states used `bg-gray-100 border-gray-200 text-gray-700`. Login.tsx correctly used red for errors — inconsistency.
**Fix:** Error → `bg-red-50 border-red-200 text-red-700`. Success → explicit `bg-gray-50 border-gray-200 text-gray-700`.

### BUG-006 — ResetPassword confirm field shared state with password field [FIXED]
**Severity:** Medium — toggling "show password" revealed both fields simultaneously; no independent toggle on confirm field
**Where:** `pages/ResetPassword.tsx`
**Fix:** Added separate `showConfirmPassword` state and independent toggle button with correct `aria-label`.

### BUG-007 — SignUp terms checkbox had invisible focus state [FIXED]
**Severity:** Low-Medium — keyboard accessibility failure
**Where:** `pages/SignUp.tsx`
**Root cause:** `focus:ring-0 focus:ring-offset-0 focus:outline-none` on the terms checkbox suppressed all focus indication.
**Fix:** Restored `focus:ring-2 focus:ring-gray-900 focus:ring-offset-1`.

### BUG-008 — ChangeEmail.tsx visually inconsistent with all other auth pages [FIXED]
**Severity:** Low — `bg-[#F7F7F5]` hardcoded hex background, `rounded-2xl` vs `rounded-xl`, `shadow-sm` on all card variants
**Fix:** `bg-white`, `rounded-xl`, removed all `shadow-sm`.

---

## 5. E2E Test Infrastructure (Ready to Run)

### What's covered

| Spec file | Scenarios |
|-----------|-----------|
| auth.spec.ts | Signup, login, wrong password, forgot password, MFA form |
| onboarding.spec.ts | All 5 wizard steps, validation, completion, return-visit guard |
| jobs.spec.ts | Create, edit, close, search, careers page sync |
| candidates.spec.ts | Bulk PDF upload, non-PDF error, manual add, search, filters |
| pipeline.spec.ts | Kanban columns, stage counts, empty state, list view |
| offers.spec.ts | Track A (no approval) + Track B (approval required) |
| external-pages.spec.ts | All 5 public pages at desktop + mobile, JS error detection |
| error-handling.spec.ts | Resend, Google, AI, Stripe, DB failure mocking via `page.route()` |

### How to run E2E tests

```bash
# 1. Install Playwright browsers (one-time)
npx playwright install --with-deps

# 2. Start the dev server in another terminal
npm run dev

# 3. Run all E2E tests (headless)
npm run test:e2e

# 4. Run with visible browser (good for debugging)
npm run test:e2e:headed

# 5. Step-by-step debug mode
npm run test:e2e:debug
```

### Required environment variables for E2E

Add to `.env.local` or `.env.test.local`:

```env
PLAYWRIGHT_BASE_URL=http://localhost:5173
TEST_ADMIN_EMAIL=your-test-admin@email.com
TEST_ADMIN_PASSWORD=your-password
TEST_RECRUITER_EMAIL=your-test-recruiter@email.com
TEST_RECRUITER_PASSWORD=your-password
```

---

## 6. Visual Regression

14 pages captured at 1280×800. Gated behind `CI_VISUAL=1` so they don't run on every PR.

### Generate baselines (first time)

```bash
CI_VISUAL=1 npm run test:visual:update
git add tests/visual/snapshots/
git commit -m "chore: add visual regression baselines"
```

### After an intentional UI change

```bash
CI_VISUAL=1 npm run test:visual:update
```

---

## 7. How to View Screenshots

### After a failed E2E test — HTML report (recommended)

```bash
npm run test:report
```

This opens `test-results/playwright-report/index.html` in your browser. Each failed test shows:
- The exact assertion that failed
- A **screenshot** of the page at the moment of failure
- A **video** of the full test run
- A **trace** (click "Trace" to step through every action with DOM snapshots)

### After a failed E2E test — raw files

Screenshots are saved at:
```
test-results/e2e-artifacts/
  auth.spec.ts-Sign-up-with-valid-credentials-1/
    test-failed-1.png       ← screenshot at moment of failure
    video.webm              ← full recording
```

### During development — headed mode

```bash
npm run test:e2e:headed
```

The browser stays visible. You watch the test run in real time.

### Debug mode — pause and inspect

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector. You can step forward one action at a time, hover elements to see their selectors, and take manual screenshots.

### Visual regression diffs

When a visual test fails, three files are written:
```
tests/visual/snapshots/
  login-desktop.png           ← baseline (committed to git)
  login-desktop-actual.png    ← what the page looks like now
  login-desktop-diff.png      ← pixel diff (red = changed)
```

Open the diff image to see exactly which pixels changed.

---

## 8. CI/CD Pipeline

`.github/workflows/test.yml` runs on every push:

```
Push to any branch
    │
    ▼
[1] Unit tests        (npm run test:unit + test:run)
    │ fails → block deployment, upload artifacts
    ▼
[2] E2E tests         (Chrome + Firefox, headless)
    │ fails → upload screenshots + videos + HTML report
    ▼
[3] Visual regression (main branch only, CI_VISUAL=1)
    │ fails → upload diff images
    ▼
[4] Staging smoke     (main branch only, after deploy)
        Health check + login test against staging.coreflowhr.com
```

**Production deployments** remain manual (`npm run promote:prod`) and require all staging tests to pass first.
