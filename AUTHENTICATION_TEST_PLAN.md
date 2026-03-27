# CoreFlow Authentication — Complete Test Plan

**Purpose:** Verify every authentication flow works correctly end-to-end and surface hidden bugs before they reach production.
**Last Updated:** 2026-03-26
**Automated Coverage:** 36 tests passing across `auth-hardening.test.ts`, `new-account-flow.test.ts`, `liquamura-signin.test.ts`

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Signup Flow](#2-signup-flow)
3. [Email Verification Flow](#3-email-verification-flow)
4. [Login Flow — Email & Password](#4-login-flow--email--password)
5. [Login Flow — Google OAuth](#5-login-flow--google-oauth)
6. [MFA (Two-Factor Authentication)](#6-mfa-two-factor-authentication)
7. [Forgot Password & Reset](#7-forgot-password--reset)
8. [Session Management](#8-session-management)
9. [Rate Limiting & Brute Force](#9-rate-limiting--brute-force)
10. [Already Logged In Scenarios](#10-already-logged-in-scenarios)
11. [Workspace Invite Flow](#11-workspace-invite-flow)
12. [Onboarding Flow](#12-onboarding-flow)
13. [Post-Login Routing Logic](#13-post-login-routing-logic)
14. [Protected Route Access Gates](#14-protected-route-access-gates)
15. [Sign Out](#15-sign-out)
16. [Known Hidden Bugs](#16-known-hidden-bugs)
17. [Automated Test Coverage Summary](#17-automated-test-coverage-summary)

---

## 1. Test Environment Setup

### Accounts Needed
| Account | State | Purpose |
|---------|-------|---------|
| `test-newuser@example.com` | Unregistered | New signup tests |
| `test-verified@example.com` | Verified, no subscription | Login, routing tests |
| `test-active@example.com` | Verified, active subscription | Paid user tests |
| `test-pastdue@example.com` | Verified, past_due subscription | Billing edge case |
| `test-mfa@example.com` | Verified, MFA enrolled | MFA flow tests |
| `liquamura002@gmail.com` | Active sub, onboarding=false | Real-world regression |

### Browser Setup
- Test in: Chrome (primary), Firefox, Safari, Edge
- Test in: Normal mode AND Incognito/Private mode
- Clear localStorage + sessionStorage between sessions: `localStorage.clear(); sessionStorage.clear();`

### What to Watch
- Browser DevTools Console → watch for `[Auth ...]` log lines
- Network tab → watch for failed Supabase calls
- Application tab → watch `localStorage` for `sb-*-auth-token` key

---

## 2. Signup Flow

### 2.1 Standard Email/Password Signup

**Steps:**
1. Navigate to `/signup`
2. Enter name, new email, password (`Test@1234`), confirm password
3. Click **Create Account**

**Expected:**
- Redirect to `/verify-email?email=<entered-email>`
- Supabase sends confirmation email
- `localStorage.workspaceInviteToken` is NOT set (no invite)
- Console shows no errors

**Failure Indicators:**
- Stuck spinner → AuthContext `getSession()` hung (check 8s timeout fires)
- "An account with this email already exists" → RPC duplicate check worked correctly
- Email never arrives → check Supabase Auth → Email Templates config

---

### 2.2 Signup with Existing Verified Email

**Steps:**
1. Navigate to `/signup`
2. Enter an email that already has a verified account
3. Click **Create Account**

**Expected:**
- Error: "An account with this email already exists. Please sign in instead."
- No redirect; user stays on signup form

**Pass/Fail:** ✅ Covered by RPC `check_user_exists_and_verified`

---

### 2.3 Signup with Existing Unverified Email

**Steps:**
1. Sign up with `test@example.com` but do NOT verify email
2. Sign up again with the same `test@example.com`

**Expected:**
- Second signup should succeed (Supabase re-sends confirmation)
- Redirect to `/verify-email`

**Note:** Supabase allows re-signup for unverified accounts.

---

### 2.4 Signup via Google OAuth

**Steps:**
1. Navigate to `/signup`
2. Click **Continue with Google**
3. Complete Google login flow

**Expected:**
- Browser redirects to Google, then back to `/auth/redirect`
- `AuthRedirect` runs `resolvePostLoginDestination()`
- First-time Google user: routed to `/?pricing=true` (no subscription) or `/onboarding`
- No email verification step needed (Google provides verified email)

---

### 2.5 Signup with Invite Token

**Steps:**
1. Navigate to `/signup?invite_token=<valid-token>`
2. Observe the form

**Expected:**
- Email field is **readonly** and pre-filled with the invited email
- `localStorage.workspaceInviteToken` is set immediately
- After signup → redirect to `/verify-email`
- After email verification → redirect to `/invite?token=<token>` (not `/auth/redirect`)

**Hidden Bug Check:** If the invite token in the URL does NOT match the invited email (someone tampers with the URL), the `Invite` page shows "Wrong Account" UI. ✅

---

### 2.6 Password Validation

**Steps:** Attempt signup with each password:

| Password | Expected Strength |
|----------|-------------------|
| `abc` | Very Weak — blocked |
| `password` | Weak |
| `Password1` | Fair |
| `Password1!` | Strong |
| `P@ssw0rd!2024` | Very Strong |

**Expected:** Submit blocked until password is at an acceptable strength level. Confirm password mismatch shows error.

---

## 3. Email Verification Flow

### 3.1 Successful Verification

**Steps:**
1. Complete signup → land on `/verify-email`
2. Open email, click confirmation link

**Expected:**
- Link opens the app with a session token in URL hash
- Supabase processes the token
- Page auto-detects `email_confirmed_at` set
- "Email verified!" success screen shown
- Auto-redirect to `/auth/redirect` after 2s
- `resolvePostLoginDestination()` routes correctly

---

### 3.2 Verification in Another Tab

**Steps:**
1. Open `/verify-email` in Tab A
2. Open confirmation email link in Tab B

**Expected:**
- Tab A's `onAuthStateChange` listener fires with `SIGNED_IN` + `email_confirmed_at`
- Tab A auto-redirects to `/auth/redirect` without user action

**This works via:** `supabase.auth.onAuthStateChange` cross-tab broadcast (localStorage event).

---

### 3.3 Resend Verification Email

**Steps:**
1. Land on `/verify-email`
2. Click **Resend email**

**Expected:**
- Success toast/message appears
- New confirmation email arrives
- Original link is invalidated (Supabase one-time tokens)

**Hidden Bug:** ⚠️ The **Resend button has no rate limit**. Clicking it repeatedly sends multiple emails. A user could spam themselves or be confused by multiple valid links. No lockout after X clicks. *Not a security vulnerability but a UX issue.*

---

### 3.4 Expired Confirmation Link

**Steps:**
1. Sign up, wait for confirmation link to expire (Supabase default: 24h, or configure shorter)
2. Click the expired link

**Expected:**
- Supabase returns error in URL hash (`error=access_denied`)
- App should handle gracefully (not crash)
- User should see an informative message

**Check:** Open the URL — does the app crash or show a blank page? The current `AuthRedirect` does not explicitly handle `error=` in the hash for email confirmation links. May show a spinner that resolves to `/login`.

---

### 3.5 Verification with Invite Token

**Steps:**
1. Sign up via `/signup?invite_token=<token>`
2. Click confirmation email link

**Expected:**
- Confirmation email `emailRedirectTo` = `/invite?token=<token>`
- After click → lands on `/invite` page, not `/auth/redirect`
- Invite is accepted automatically

**Check `localStorage`:** `workspaceInviteToken` should be cleared after successful invite accept.

---

## 4. Login Flow — Email & Password

### 4.1 Successful Login

**Steps:**
1. Navigate to `/login`
2. Enter verified email + correct password
3. Click **Sign in**

**Expected:**
- `[Auth] signIn START` appears in console
- `[Auth] signInWithPassword → returned` within 15s
- `[Auth] user + session set` logged
- Redirect to `/auth/redirect`
- Final destination based on account state (see Section 13)

---

### 4.2 Wrong Password

**Steps:**
1. Navigate to `/login`
2. Enter verified email + wrong password
3. Click **Sign in**

**Expected:**
- Error: "Incorrect email or password. Please try again."
- Form stays on login page
- Failed attempt counter increments (check after 5 attempts — see Section 9)

---

### 4.3 Unverified Email Login Attempt

**Steps:**
1. Sign up but do NOT verify email
2. Attempt login with those credentials

**Expected:**
- Error: "Your email isn't verified yet. Check your inbox for a confirmation link."

---

### 4.4 Non-Existent Email Login

**Steps:**
1. Enter an email that has never signed up
2. Enter any password

**Expected:**
- Error: "Incorrect email or password. Please try again." (Supabase normalizes to prevent email enumeration)
- OR: "No account found with this email." (if Supabase returns specific error)

---

### 4.5 Slow Network Login (simulated)

**Steps:**
1. Open DevTools → Network → Throttle to "Slow 3G"
2. Attempt login

**Expected:**
- If Supabase responds within 15s → login succeeds normally
- If Supabase doesn't respond within 15s → error: "Sign-in is taking longer than expected. Please refresh the page and try again."

---

### 4.6 Network Offline Login

**Steps:**
1. Disconnect from internet
2. Attempt login

**Expected:**
- Error: "Connection error. Please check your internet and try again."
- AuthContext retains cached session state (does not clear user on network error)

---

## 5. Login Flow — Google OAuth

### 5.1 Google Login — New Account

**Steps:**
1. Navigate to `/login`
2. Click **Continue with Google**
3. Complete Google auth with a Google account not in the system

**Expected:**
- Account created automatically
- Redirected to `/?pricing=true` (no subscription yet)
- Email is pre-confirmed (Google confirms it)

---

### 5.2 Google Login — Existing Account

**Steps:**
1. Navigate to `/login`
2. Click **Continue with Google**
3. Use a Google account that already has a Coreflow account

**Expected:**
- Logged in to existing account
- Redirected via `/auth/redirect` to correct destination
- Session established

---

### 5.3 Google Login — Cancel Flow

**Steps:**
1. Click **Continue with Google**
2. On Google's consent screen, click **Cancel**

**Expected:**
- Redirected back to `/login`
- No error displayed (or a user-friendly message)
- No partial session created

---

## 6. MFA (Two-Factor Authentication)

### 6.1 Successful MFA Login

**Steps:**
1. Login with an account that has MFA enabled (`test-mfa@example.com`)
2. Enter email + correct password
3. MFA code input should appear

**Expected:**
- After password: UI switches to "Two-Factor Authentication" input
- Enter 6-digit code from authenticator app
- Click **Verify & Sign In**
- Redirected to `/auth/redirect` → correct destination

---

### 6.2 Wrong MFA Code

**Steps:**
1. Login with MFA account
2. Enter password correctly
3. Enter wrong 6-digit code

**Expected:**
- Error: "Invalid or expired code. Please check your authenticator app and try again."
- Code field cleared
- User can retry

**Hidden Bug:** ⚠️ **No rate limit on MFA code attempts.** An attacker with a stolen password can try all 1,000,000 possible 6-digit codes without lockout. Supabase may have server-side limits, but there is no client-side lockout after failed MFA attempts (unlike the password form which locks after 5 attempts).

---

### 6.3 Expired MFA Code (TOTP 30s window)

**Steps:**
1. Login with MFA account
2. Wait until code is about to expire (TOTP codes refresh every 30s)
3. Enter a code from the previous 30s window

**Expected:**
- Supabase may accept 1 previous code window (TOTP allows skew)
- If expired: "Invalid or expired code."

---

### 6.4 MFA Back Button

**Steps:**
1. Enter password, reach MFA screen
2. Click **Back** button

**Expected:**
- Returns to email/password form
- MFA code cleared
- Error cleared

---

### 6.5 AAL Check Timeout During Login

**Scenario:** `getAuthenticatorAssuranceLevel()` call hangs

**Expected (based on code):**
- 5s timeout fires
- Falls back to `listFactors()` to detect MFA
- If `listFactors()` also fails → fail-open (login proceeds without MFA check)

**Risk:** A user with MFA enrolled could bypass MFA if BOTH AAL check and listFactors time out. This is a deliberate fail-open design choice. Acceptable for availability but note the security tradeoff.

---

## 7. Forgot Password & Reset

### 7.1 Password Reset Email Sent

**Steps:**
1. Navigate to `/forgot-password`
2. Enter a valid registered email
3. Click **Send Reset Email**

**Expected:**
- Success message displayed
- Email arrives with reset link pointing to `<origin>/reset-password`

---

### 7.2 Password Reset Email — Unregistered Address

**Steps:**
1. Enter an email that has never been registered
2. Click **Send Reset Email**

**Expected:**
- Supabase sends the email regardless (no user enumeration — same success message)
- No error shown to user

---

### 7.3 Complete Password Reset

**Steps:**
1. Click reset link in email
2. URL opens `/reset-password` with token in hash
3. Enter new password + confirm
4. Click **Update Password**

**Expected:**
- Form is initially disabled (waiting for `PASSWORD_RECOVERY` event)
- After event fires → form becomes interactive
- After submission → success message
- Auto-redirect to `/login` after 2.5s
- User is signed out (must log in with new password)

---

### 7.4 Password Reset — Expired Link

**Steps:**
1. Use a reset link older than Supabase's expiry (default 1 hour)

**Expected:**
- `PASSWORD_RECOVERY` event does NOT fire
- Form stays disabled forever (spinner / waiting state)

**Hidden Bug:** ⚠️ If the reset link is expired, the `PASSWORD_RECOVERY` event never fires. The page shows "Loading..." indefinitely with no error message, no timeout, and no fallback. **User is stuck.** There is no timeout on the `PASSWORD_RECOVERY` event listener. A user with an expired link has no way to recover from the page except manually navigating away.

**Recommended Fix:** Add a 15–30s timeout on the `PASSWORD_RECOVERY` event wait, then show "This link has expired. Request a new one."

---

### 7.5 Use Reset Link Twice

**Steps:**
1. Complete password reset successfully
2. Click the same reset link again

**Expected:**
- Token is invalidated by Supabase after first use
- `PASSWORD_RECOVERY` event does NOT fire
- See Bug 7.4 — page is stuck

---

## 8. Session Management

### 8.1 Session Persists on Hard Reload

**Steps:**
1. Log in successfully, reach `/dashboard`
2. Press `Ctrl+Shift+R` (hard reload)

**Expected:**
- App reloads, reads token from `localStorage`
- `[Auth] getSession() resolved: user=true confirmed=true` in console
- User stays on `/dashboard` without re-login
- `sb-*-auth-token` key visible in DevTools → Application → Local Storage

**Regression Check:** This was broken by the ProtectedRoute revocation check querying by `session_token` (which rotates). Now fixed to use `device_fingerprint`. ✅

---

### 8.2 Session Persists After Tab Close/Reopen

**Steps:**
1. Log in, confirm session is active
2. Close the browser tab completely
3. Open a new tab and navigate to the app URL

**Expected:**
- Session restored from `localStorage`
- User is NOT redirected to `/login`
- `AuthContext` resolves session within 8s

**Regression Check:** Fixed — the `loadingTimeout` no longer removes tokens that have a `refresh_token`. ✅

---

### 8.3 Session Persists After Browser Restart

**Steps:**
1. Log in, close the entire browser
2. Reopen browser, navigate to app

**Expected:**
- Session restored (localStorage survives browser restart)
- User stays logged in

**Note:** Incognito/Private mode does NOT persist localStorage between sessions.

---

### 8.4 Session in Incognito Mode

**Steps:**
1. Open app in an Incognito window
2. Log in

**Expected:**
- Login works normally
- Session persists for the duration of the incognito session
- Closing all incognito windows clears the session

---

### 8.5 Multi-Tab: Login in One Tab

**Steps:**
1. Open app in Tab A — NOT logged in
2. Open app in Tab B — NOT logged in
3. Log in via Tab B

**Expected:**
- Tab A's `onAuthStateChange` fires with `SIGNED_IN`
- Tab A updates its auth state
- Tab A no longer shows `/login` — navigates to app

---

### 8.6 Multi-Tab: Sign Out in One Tab

**Steps:**
1. Log in, open `/dashboard` in Tab A and Tab B
2. Sign out via Tab B

**Expected:**
- Tab A's `onAuthStateChange` fires with `SIGNED_OUT`
- Tab A clears auth state and redirects to `/login`

---

### 8.7 Token Auto-Refresh (Long Session)

**Steps:**
1. Log in
2. Wait 60+ minutes without activity
3. Attempt to perform an action (navigate to a page)

**Expected:**
- Supabase SDK auto-refreshes the access token in the background
- User stays logged in seamlessly
- No flicker to `/login`

**Check:** `sb-*-auth-token` in localStorage should have updated `expires_at` after refresh.

---

### 8.8 Session Revocation Check

**Steps:**
1. Log in on Device A
2. In Supabase Dashboard → Auth → Users → revoke the session
3. Wait up to 35s (revocation check runs every 30s, first at 5s)
4. Or trigger window focus (check also runs on focus)

**Expected:**
- `ProtectedRoute` background check detects session is gone
- `signOut()` called automatically
- Redirect to `/login`

---

### 8.9 Session After `loadingTimeout` (Slow Network)

**Scenario:** Network is slow; `getSession()` takes > 8s on hard reload

**Steps:**
1. Throttle to "Offline" in DevTools briefly
2. Hard reload the app
3. Re-enable network at ~7s

**Expected (current behavior):**
- `sessionResolved = false` at 8s mark
- Token is checked: if it has a `refresh_token` → token is NOT removed, `loading=false` set
- `onAuthStateChange` fires when network returns with correct session
- User stays logged in (may briefly see loading state)

---

## 9. Rate Limiting & Brute Force

### 9.1 Password Brute Force — 5 Attempts

**Steps:**
1. Navigate to `/login` with a valid email
2. Enter wrong password 5 times in a row

**Expected:**
- Attempts 1–4: show error "Incorrect email or password. Please try again."
- Attempt 5: form locks, button changes to "Try again in 30s"
- Error: "Too many failed attempts. Please wait 30s before trying again."
- 30-second countdown visible on button

---

### 9.2 Lockout Countdown

**Steps:**
1. Trigger lockout (5 wrong attempts)
2. Watch the countdown

**Expected:**
- Button shows `"Try again in 29s"`, `"Try again in 28s"`, etc.
- After 30s: button resets to "Sign in", failed counter resets to 0
- User can attempt again

---

### 9.3 Lockout — Cannot Submit While Locked

**Steps:**
1. Trigger lockout
2. Press Enter or click Submit button

**Expected:**
- Error message shown ("Please wait Xs")
- `signIn()` is NOT called (no network request)
- Console shows no `[Auth] signIn START`

---

### 9.4 Lockout Resets After Successful Login

**Steps:**
1. Enter wrong password 3 times
2. Enter correct password on 4th attempt

**Expected:**
- Successful login, no lockout
- Failed attempt counter resets to 0

---

### 9.5 MFA Brute Force — No Client Lockout

**Steps:**
1. Login with MFA account
2. Enter wrong 6-digit code repeatedly (10+ times)

**Expected (current behavior):**
- Each wrong code shows "Invalid or expired code."
- **No lockout is enforced client-side on MFA attempts**
- Supabase may rate limit server-side eventually

**Known Gap:** ⚠️ MFA attempts are not rate-limited client-side. See Section 16 for full details.

---

### 9.6 Resend Email — No Rate Limit

**Steps:**
1. Land on `/verify-email`
2. Click **Resend email** 10 times rapidly

**Expected (current behavior):**
- All requests sent to Supabase
- No client-side throttle on resend
- Supabase may server-side rate-limit

**Known Gap:** ⚠️ No client-side resend rate limit.

---

## 10. Already Logged In Scenarios

### 10.1 Authenticated User Visits `/login`

**Steps:**
1. Log in successfully, reach `/dashboard`
2. Manually navigate to `/login` (type in address bar)

**Expected:**
- `PublicRoute` detects `user && session`
- Immediately redirects to `/auth/redirect`
- User ends up at correct destination without seeing the login form

---

### 10.2 Authenticated User Visits `/signup`

**Steps:**
1. Log in, navigate to `/signup`

**Expected:**
- `PublicRoute` redirects to `/auth/redirect`
- User never sees signup form

---

### 10.3 Authenticated User Submits Login Form (Race Condition)

**Scenario:** User is logged in but somehow renders the login form (e.g., loading state race) and submits

**Expected (with fix):**
- `signIn()` is called
- `isSigningIn.current = true` set
- `SIGNED_OUT` event fires for old session → suppressed by guard
- `SIGNED_IN` event fires → new session set
- `handleLoginSuccess()` navigates to `/auth/redirect`
- User is NOT logged out during this process ✅

---

### 10.4 Partially Logged In (User Set, No Session)

**Scenario:** `user` is set but `session` is null — email unconfirmed OR MFA pending

**At `/login`:**
- `PublicRoute` checks `user && session` → false (no session) → renders login form
- User can re-attempt login ✅

**At a protected page:**
- `ProtectedRoute` gate 2: user set, no session, email confirmed → redirect to `/login`
- `ProtectedRoute` gate 2: user set, no session, email NOT confirmed → redirect to `/verify-email`

---

## 11. Workspace Invite Flow

### 11.1 Valid Invite — Not Logged In

**Steps:**
1. Open `/invite?token=<valid-token>` while logged out

**Expected:**
- Token validated via `api.workspaces.getInviteByToken()`
- Workspace name displayed
- "Sign in to accept" and "Create an account" buttons shown
- `localStorage.workspaceInviteToken` set

---

### 11.2 Valid Invite — Logged In as Correct Email

**Steps:**
1. Log in as `user@example.com`
2. Open `/invite?token=<token-for-user@example.com>`

**Expected:**
- Auto-accepts invite immediately
- Status changes to "success"
- Redirect to `/dashboard` after 1.5s
- `localStorage.workspaceInviteToken` cleared

---

### 11.3 Valid Invite — Logged In as Wrong Email

**Steps:**
1. Log in as `wrong@example.com`
2. Open `/invite?token=<token-for-correct@example.com>`

**Expected:**
- "Wrong Account" UI shown
- Current email highlighted in red
- Invited email highlighted
- Options: Go Home, Log Out, Sign Up with correct email
- User NOT auto-accepted

---

### 11.4 Expired or Invalid Invite Token

**Steps:**
1. Navigate to `/invite?token=invalid-or-expired`

**Expected:**
- `getInviteByToken()` returns `found: false`
- Error state: "This invitation has expired or is no longer valid."
- User cannot accept

---

### 11.5 Invite Token After Login (Via `/auth/redirect`)

**Steps:**
1. `localStorage.workspaceInviteToken` is set
2. User logs in, lands on `/auth/redirect`

**Expected:**
- `resolvePostLoginDestination()` checks localStorage token
- If user is NOT yet in a workspace → returns `/invite?token=<token>`
- `AuthRedirect` navigates to `/invite`
- If user IS already in a workspace → token is cleared, continues normal routing

---

### 11.6 Already Accepted Invite

**Steps:**
1. Accept an invite
2. Click the same invite link again

**Expected:**
- `acceptInvite()` returns "already accepted" error
- Treated as success: user is shown the success screen
- Redirected to `/dashboard`

---

## 12. Onboarding Flow

### 12.1 New Paid User Routes to Onboarding

**Steps:**
1. Pay for a subscription (or set `subscription_status = 'active'` in DB)
2. Log in with `onboarding_completed = false`

**Expected:**
- `resolvePostLoginDestination()` returns `/onboarding`
- User sees 8-slide onboarding
- Cannot access `/dashboard` until completed (ProtectedRoute gate 6)

---

### 12.2 Onboarding Completion

**Steps:**
1. Navigate through all 8 slides
2. Click **Finish Setup** on the final slide

**Expected:**
- `profiles.onboarding_completed = true` set in DB
- 1.5s wait for DB propagation
- Redirect to `/auth/redirect` (or `/auth/redirect?payment=success` if pending payment)
- `showDashboardLoader = true` set in sessionStorage
- Final destination: `/dashboard`

---

### 12.3 Onboarding Already Completed

**Steps:**
1. Manually navigate to `/onboarding` with `onboarding_completed = true`

**Expected:**
- Onboarding page checks profile on mount
- Immediately redirects to `/dashboard` (no flicker)

---

### 12.4 Invited Non-Admin Member Skips Onboarding

**Steps:**
1. Accept a workspace invite as Recruiter/HiringManager/Viewer
2. Log in

**Expected:**
- `resolvePostLoginDestination()` skips onboarding check for non-admin members
- Directed to `/dashboard` directly
- ProtectedRoute gate 6 also skips onboarding for non-admin members

---

### 12.5 Onboarding With Keyboard Navigation

**Steps:**
1. On `/onboarding`, use `→` and `←` arrow keys to navigate slides

**Expected:**
- Next slide on `→`, previous on `←`
- No boundary errors (can't go before slide 0 or past the last)

---

## 13. Post-Login Routing Logic

`resolvePostLoginDestination()` is called by `AuthRedirect` after every login. The following scenarios must route correctly:

| Account State | Expected Destination |
|--------------|----------------------|
| No workspace, no subscription | `/?pricing=true` |
| Pending invite token, not in workspace | `/invite?token=<token>` |
| Active subscription, onboarding not done | `/onboarding` |
| Active subscription, onboarding done | `/dashboard` |
| `past_due` subscription | `/settings` |
| `canceled` subscription | `/?pricing=true` |
| `trialing` subscription | `/?pricing=true` (not treated as active) |
| Non-admin member of active workspace | `/dashboard` (skips onboarding) |
| Active subscription, no workspace | `/onboarding` |

**Automated:** All 8 scenarios covered in `new-account-flow.test.ts` ✅

---

### 13.1 Payment Success Routing (`?payment=success`)

**Steps:**
1. Complete Stripe checkout
2. Stripe redirects to `/auth/redirect?payment=success&session_id=<id>`

**Expected:**
- `AuthRedirect` polls `resolvePostLoginDestination()` up to 8×2s = 16s
- Each poll has a 5s timeout (fail-fast)
- When webhook updates DB → destination becomes `/dashboard` or `/onboarding`
- Navigates to correct destination
- If destination is `/onboarding`: stores `pendingPaymentSuccess` in sessionStorage

**Failure Case:** If webhook takes > 16s → fails open to `/dashboard`. ProtectedRoute may then redirect to `/?pricing=true` if subscription isn't active yet.

---

## 14. Protected Route Access Gates

Test each gate independently:

### Gate 1: Auth Loading
- **When:** App is initializing (`loading = true`)
- **Expected:** `<PageLoader />` shown, no redirect
- **Test:** Throttle network to slow; observe spinner on first load

### Gate 2: User Set, No Session
- **When:** Email unconfirmed OR MFA required but not yet verified
- **Expected (email unconfirmed):** Redirect to `/verify-email`
- **Expected (MFA pending):** Redirect to `/login`

### Gate 3: Not Authenticated
- **When:** `session = null`, `user = null`
- **Expected:** Redirect to `/login`, current location saved as `from` state
- **Verify:** After login, user is redirected BACK to the original page

### Gate 4: Checks Running
- **When:** DB queries for subscription/workspace are in progress
- **Expected:** `<PageLoader />` shown
- **Test:** Throttle DB; confirm spinner appears before redirect

### Gate 5: No Subscription Access
- **When:** No active subscription, no free access, not past_due
- **Expected:** Redirect to `/?pricing=true`
- **Exception:** `/settings` page always accessible
- **Exception:** `/onboarding` page always accessible (prevents timing race)
- **past_due:** Redirect to `/settings` (prevent duplicate subscription)

### Gate 6: Onboarding Incomplete
- **When:** `profiles.onboarding_completed = false`, not non-admin member
- **Expected:** Redirect to `/onboarding`
- **Exception:** On `/onboarding` itself → no redirect

### Gate 7: RBAC Violation
- **When:** Non-Admin user accesses a route outside their allowed set
- **Expected:** Redirect to `/dashboard`

| Role | Allowed Routes |
|------|---------------|
| Viewer | `/dashboard`, `/candidates`, `/settings` |
| HiringManager | + `/jobs`, `/calendar`, `/clients` |
| Recruiter | + `/offers`, `/reports` |
| Admin | All routes |

---

## 15. Sign Out

### 15.1 Standard Sign Out

**Steps:**
1. Click Sign Out button (in Sidebar or Settings)
2. Observe behavior

**Expected:**
- React state cleared immediately (`user=null`, `session=null`)
- `supabase.auth.signOut()` called
- `sessionStorage` fully cleared
- `localStorage.testMode` removed
- Hard redirect to `/login`
- Back button does NOT return to dashboard

---

### 15.2 Sign Out — Back Button After Logout

**Steps:**
1. Sign out
2. Press browser Back button

**Expected:**
- Browser returns to `/dashboard` URL
- `ProtectedRoute` gate 3 fires → redirects to `/login`
- User is NOT shown protected content

---

### 15.3 Sign Out — Session Cleared in localStorage

**Steps:**
1. Sign out
2. Check DevTools → Application → Local Storage

**Expected:**
- `sb-*-auth-token` key is GONE

**Note:** The manual `localStorage.removeItem('sb-' + hostname.split('.')[0] + '-auth-token')` in `signOut()` targets the wrong key (hostname vs project ref), but `supabase.auth.signOut()` correctly removes the real key. No functional impact, but dead code.

---

### 15.4 Sign Out While Offline

**Steps:**
1. Disconnect from internet
2. Sign out

**Expected:**
- React state cleared immediately
- `supabase.auth.signOut()` may fail (network error) — caught silently
- Local storage cleared regardless
- Hard redirect to `/login`

---

## 16. Known Hidden Bugs

The following bugs were identified by reading the source code. They are not covered by automated tests and may not yet be visible in normal use.

---

### BUG-001: "Remember Me" Checkbox Does Nothing
**File:** `pages/Login.tsx:237`
**Severity:** Low (UX)
**Description:** The "Remember me" checkbox is rendered but has no `onChange` handler and no logic connected to it. Supabase always persists sessions in `localStorage` regardless. The checkbox is purely decorative and misleads users.
**Reproduce:** Check "Remember me", log out, reopen browser — behavior is identical to not checking it.
**Fix:** Either wire it to Supabase's `options.persistSession` on login, or remove the checkbox entirely.

---

### BUG-002: Password Reset — Expired Link Hangs Forever
**File:** `pages/ResetPassword.tsx`
**Severity:** High (UX blocking)
**Description:** If a user clicks an expired password reset link, the `PASSWORD_RECOVERY` auth event never fires. The page shows a permanent loading/disabled state with no timeout, no error message, and no way to recover except manually navigating away.
**Reproduce:** Use a reset link > 1 hour old.
**Fix:** Add a 20s timeout on the `PASSWORD_RECOVERY` event listener; on timeout, show "This reset link has expired. [Request a new one](/forgot-password)."

---

### BUG-003: No Client-Side Rate Limit on MFA Code Attempts
**File:** `pages/Login.tsx` — `handleMFAVerify`
**Severity:** Medium (Security)
**Description:** The password login form has a 5-attempt lockout, but the MFA code verification form has none. An attacker who obtains a user's password can attempt all 1,000,000 TOTP codes without any client-side throttle. The Supabase server rate-limits this, but the defense is not layered.
**Fix:** Add a failed-MFA counter: after 5 wrong codes, lock the MFA form for 60s and redirect back to the password form.

---

### BUG-004: Resend Verification Email — No Client-Side Rate Limit
**File:** `pages/VerifyEmail.tsx`
**Severity:** Low (UX / spam risk)
**Description:** The "Resend email" button has no cooldown or counter. A user can click it repeatedly, triggering a flood of confirmation emails to themselves. Supabase may server-side throttle this, but there is no user feedback when that happens.
**Fix:** Disable the resend button for 60s after each click; show "Email sent. You can resend in 58s."

---

### BUG-005: `signOut()` Tries to Remove Wrong localStorage Key
**File:** `contexts/AuthContext.tsx:423`
**Severity:** Low (Dead code)
**Description:**
```js
localStorage.removeItem('sb-' + window.location.hostname.split('.')[0] + '-auth-token');
```
This computes `sb-app-auth-token` (on `app.coreflowhr.com`) or `sb-localhost-auth-token`. The real Supabase key is `sb-lpjyxpxkagctaibmqcoi-auth-token`. The `supabase.auth.signOut()` call above correctly removes the real key, so there is no functional regression — this line just removes a non-existent key.
**Fix:** Remove this line entirely; `supabase.auth.signOut()` handles cleanup.

---

### BUG-006: `AuthRedirect` Payment Poll Fails Open to `/dashboard` Before Subscription Active
**File:** `pages/AuthRedirect.tsx` (payment polling logic)
**Severity:** Medium
**Description:** If the Stripe webhook takes > 16 seconds to update the database, `AuthRedirect` fails open to `/dashboard`. `ProtectedRoute` then runs its own subscription check. If the subscription still isn't active at that point, the user is redirected to `/?pricing=true` — they just paid and are being asked to pay again.
**Reproduce:** Simulate a slow webhook or use Stripe test mode with delayed webhook delivery.
**Fix:** If after 16s the subscription is still not active, redirect to a "We're processing your payment..." holding page rather than `/dashboard`, then re-poll.

---

### BUG-007: AAL Fail-Open Allows MFA Bypass on Timeout
**File:** `contexts/AuthContext.tsx:290–310`
**Severity:** Medium (Security — accepts risk)
**Description:** If both `getAuthenticatorAssuranceLevel()` AND `listFactors()` time out (5s each), the login proceeds without MFA verification. This is an intentional fail-open design to prevent MFA-enrolled users from being permanently locked out if Supabase MFA services are degraded. However, it means a degraded Supabase MFA endpoint could allow bypass.
**Status:** Accepted risk. Document in incident runbook.

---

### BUG-008: Onboarding `ProtectedRoute` Bypass Creates Timing Race
**File:** `components/ProtectedRoute.tsx:304`
**Severity:** Low (by design)
**Description:** Gate 5 (subscription check) explicitly bypasses the check for `/onboarding`:
```js
const isOnboardingPageGate = location.pathname === '/onboarding';
if (!canEnter && !isSettingsPage && !isOnboardingPageGate) { ... }
```
This is intentional to prevent newly-paid users from being redirected to pricing while their subscription is propagating. However, a user with NO subscription can access `/onboarding` directly if they type the URL. They can complete onboarding without paying — but will be blocked at Gate 5 on any other page.
**Risk:** Low — onboarding without a subscription has no business impact since ProtectedRoute blocks all other pages.

---

### BUG-009: `VerifyEmail` Resend Does Not Handle Supabase Rate Limit Error
**File:** `pages/VerifyEmail.tsx`
**Severity:** Low
**Description:** The `resend()` call catches errors and maps them, but if Supabase returns a rate-limit error (HTTP 429), the UI likely shows a generic error rather than "Please wait before requesting another email." The error mapping for rate limits is not explicit in the resend handler.

---

### BUG-010: Google OAuth Does Not Pass Through `isSigningIn` Guard
**File:** `contexts/AuthContext.tsx` — `signInWithGoogle()`
**Severity:** Very Low
**Description:** `signInWithGoogle()` initiates a page redirect — there is no in-page SIGNED_OUT event risk since the redirect navigates away from the app entirely. The `isSigningIn` flag is not set. This is functionally correct since Google OAuth cannot fire SIGNED_OUT mid-page, but worth documenting to avoid confusion.

---

## 17. Automated Test Coverage Summary

| Test File | Tests | Scope |
|-----------|-------|-------|
| `tests/auth-hardening.test.ts` | 19 ✅ | Rate limiting, session persistence logic, SIGNED_OUT guard |
| `tests/new-account-flow.test.ts` | 13 ✅ | Post-login routing (8 scenarios), subscription access logic, onboarding guard |
| `tests/liquamura-signin.test.ts` | 4 ✅ | Real-world account routing, AAL timeout guard |
| **Total** | **36 ✅** | |

### Gaps — Not Covered by Automated Tests
The following require manual browser testing or E2E tests (e.g., Playwright/Cypress):

- Google OAuth flow (requires real OAuth redirect)
- Actual Supabase `signInWithPassword` call (mocked in tests)
- Email delivery and link clicking
- Stripe redirect + webhook propagation timing
- Real `PASSWORD_RECOVERY` event firing
- Multi-tab auth state sync
- Hard reload session persistence (localStorage read/write)
- RBAC route blocking in rendered UI
- ProtectedRoute 10s fail-open timeout behavior

### Recommended Next Steps
1. **Fix BUG-002** (reset link hang) — highest UX impact, simple fix
2. **Fix BUG-003** (MFA rate limit) — security improvement
3. **Fix BUG-004** (resend rate limit) — quick UX win
4. **Fix BUG-001** (remember me noop) — remove or wire up
5. **Fix BUG-005** (dead signOut code) — cleanup
6. **Add Playwright E2E tests** for the flows listed in Gaps above

---

*Generated from full source analysis of: `AuthContext.tsx`, `Login.tsx`, `SignUp.tsx`, `AuthRedirect.tsx`, `VerifyEmail.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `Invite.tsx`, `Onboarding.tsx`, `ProtectedRoute.tsx`, `postLoginRoute.ts`, `subscriptionAccess.ts`, `api.ts`*
