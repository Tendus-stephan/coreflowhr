# How Email Change Works (User Perspective) – Current vs. Desired

No code changes in this doc; this is understanding only.

---

## Your Desired Flow (Summary)

1. **Settings → Account** → user sees current email → clicks "Change Email".
2. **Modal**: New email + **current password** (to prove it’s them).
3. **Backend**: Validate new email, password, “email not already used”, no existing pending change → store pending state in DB → send **two** emails.
4. **Email 1 (NEW address)**: “Verify your new email” with verification link (e.g. 24h expiry).
5. **Email 2 (OLD address)**: “Email change requested… If this wasn’t you, [Cancel link].”
6. **UI**: Show **pending state** (new email, expiry, “Check new inbox”, **Cancel request**).
7. **User clicks verification link** (in NEW email) → backend moves `pending_email` → `email`, clears tokens → send confirmation to NEW + notification to OLD.
8. **After change**: “Email successfully changed” to NEW; “Your email was changed” to OLD (with “contact support if not you”).

Security goals: **password** before change, **verify new** before committing, **notify old** and **allow cancel**.

---

## How It Works Today (Current Implementation)

### Where the user starts

- **Settings** (profile section): current email + “New email address” field + “Update email” button.
- **Dedicated page** `/change-email`: same idea (current email, new email, “Update email”). No modal; no password.

### What the user enters

- **Only** the new email. **No current password** is asked anywhere in the email-change flow.

### Step-by-step (user perspective)

1. User enters new email and clicks **Update email**.
2. **Backend** (`request-email-change` Edge Function):
   - Checks: valid format, not same as current, **not already used** by another account (we do check this).
   - Does **not** check password or “already have pending change”.
   - Creates a signed JWT (userId, newEmail, 24h exp), builds a link to the app.
3. **One email is sent** – to the **current (old)** address only:
   - “You requested to change to **newemail@…**. [Confirm and send link to new email]” + link.
   - No “cancel this request” link; no second email to the new address at this stage.
4. User clicks that link → lands on `/change-email?step=confirm_current&token=...`.
5. App verifies the token (same user, not expired), then calls **Supabase** `updateUser({ email: newEmail })`.
6. **Supabase** sends its own confirmation email to the **new** address (Supabase template, e.g. `change-email.html`).
7. User clicks the link in the **new** email → Supabase completes the change (auth email updated).
8. App detects success (hash/session), sends **one** “Your email was updated successfully” email to the **new** address only, then **signs the user out** and redirects to login.
9. User signs in with the new email.

### Where state lives

- **Pending “new email”**: in a signed JWT in the link and in `sessionStorage` (`pendingEmailChange`) in the browser. **No** `pending_email` / `email_verification_token` / `email_token_expires` in the database.
- **Actual email**: only in Supabase Auth (`auth.users`). We don’t mirror “pending” in our own DB.

### What we do and don’t do

| Your doc | Current behaviour |
|----------|-------------------|
| **Require current password** before allowing email change | ❌ **Not implemented.** Anyone with a valid session can request a change. |
| Send verification to **NEW** email before completing | ✅ **Yes**, but only **after** user clicks the link in the **OLD** email first. So order is: confirm at old → then we send to new. |
| Old email still works until new is verified | ✅ **Yes.** Supabase and our flow keep the old email until the new one is confirmed. |
| Notify **OLD** email that a change was **requested** (with cancel option) | ⚠️ **Partially.** We send one email to old: “Confirm and send link to new email.” We do **not** send a separate “someone requested a change – cancel here” email, and our link is “confirm,” not “cancel.” |
| Notify **OLD** email **after** change is completed | ❌ **No.** We only send “Email successfully changed” to the **new** address. Old address gets no “your email was changed” notice. |
| DB fields: pending_email, email_verification_token, email_token_expires, email_change_requested_at | ❌ **No.** We use JWT in the link (and sessionStorage) and Supabase’s own flow; no app DB columns for pending email change. |
| UI: pending state with “expires in X hours” and **Cancel request** | ❌ **No.** We show “Check your new email” (and “Sign in with new email”) but no expiry countdown and no “Cancel request” button or cancel link. |
| Verification / token expiry (e.g. 24h) | ✅ **Yes.** Our “confirm current” link token expires in 24 hours. Supabase’s link has its own expiry. |
| “Email already exists” (new email used by another account) | ✅ **Yes.** Handled in `request-email-change` and shown in UI. |
| Block second request when there’s already a pending change | ❌ **No.** User can request again; we don’t check “pending” in DB (we don’t have that state in DB). |
| Resend verification | ❌ **No** “Resend verification” in UI. |

---

## Security / UX Gaps (Compared to Your Doc)

1. **No password confirmation** – Session takeover can be used to start an email change.
2. **No notification to old email after change** – Owner isn’t told “your email was changed” if they didn’t do it.
3. **No explicit “cancel request”** – Old email only gets “confirm and send link to new”; no dedicated “this wasn’t me, cancel” flow.
4. **No pending state in DB** – No single source of truth for “pending email” or “expires at”; no clean cancel/expiry logic.
5. **No pending-state UI** – No “Email change pending to X, expires in Y, [Cancel].”
6. **No “already pending” block** – User can trigger multiple overlapping flows.

---

## Summary: Current Flow in One Sentence

**User enters new email (no password) → gets one email at current address (“Confirm and send link to new”) → clicks that link → we then send Supabase’s verification to new address → user clicks that → change completes → we send success email only to new address and sign them out.**

Implementing the full flow from your doc would mean adding: password step, DB pending state, second email to old with cancel option, pending-state UI with cancel, notification to old after change, and blocking when a pending change already exists.
