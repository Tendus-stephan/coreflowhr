# Step-by-step: Changing email address

This document describes the full flow from “request email change” to “signed in with new email,” including Supabase and app behaviour.

---

## Current flow (two-step: current address first)

1. **User requests change** → App sends one email to the **current** address (Edge Function `request-email-change`). Message: "Sending confirmation to your current email address. Click the link there; we'll then send a link to your new address to complete the change."
2. **User clicks link in current email** → Lands on `/change-email?step=confirm_current&token=...`. App verifies token (`verify-email-change-token`), then calls `updateUser({ email: newEmail })`, which sends Supabase's confirmation to the **new** address. Message: "We've sent a confirmation link to [new email]. Click it to complete the change."
3. **User clicks link in new email** → App detects success, sends success email to new address, signs out, redirects to login.
4. **User signs in** with the new email.

Required Edge Function secrets: `EMAIL_CHANGE_SECRET`, `SITE_URL`.

---

## Overview

1. User requests a change (enters new email, clicks Update).
2. Supabase sends one or two confirmation emails (depends on **Secure email change**).
3. User clicks the confirmation link and is sent to the app.
4. App detects success, sends a “success” email to the new address, signs the user out, and redirects to login.
5. User signs in with the new email.

---

## Step 1: User requests the change

**Where:** `/change-email` (user must be signed in).

**What happens:**

1. User enters the **new** email and clicks **Update email**.
2. App calls `api.auth.updateEmail(newEmail)`:
   - Validates format and “not already current email.”
   - Calls `supabase.auth.updateUser({ email: trimmed })`.
3. Supabase:
   - Marks the account as “email change requested” (old → new).
   - Sends confirmation email(s) according to project settings (see below).
4. App:
   - Saves `pendingEmailChange = newEmail` in `sessionStorage` (so we know which email we’re waiting for).
   - Shows: *“Confirmation sent to {email}. Click the link there to complete the change.”*

**Code:** `pages/ChangeEmail.tsx` → `handleUpdateEmail`; `services/api.ts` → `auth.updateEmail`.

---

## Step 2: Supabase sends confirmation email(s)

**Controlled by:** Supabase Dashboard → **Authentication** → **Providers** → **Email** → **Secure email change**.

- **Secure email change ON (default):**
  - Supabase sends **two** emails:
    1. One to the **current (old)** address: “Confirm you want to change to new@example.com.”
    2. One to the **new** address: “Confirm this is your new email.”
  - The account is updated only after the user completes the step Supabase expects (e.g. clicking the link in the **new** address email, depending on Supabase version).
  - If the second email never arrives or is not clicked, the user stays in “waiting for confirmation” and the app shows “Check your new email.”

- **Secure email change OFF (recommended for single-step flow):**
  - Supabase sends **one** email to the **new** address.
  - One click on that link completes the change.

**Email content:** Supabase uses the **Change email address** template (Dashboard → Authentication → Email Templates). The link in the email is the **Confirmation URL**; it points to your **Site URL** (or configured redirect) with tokens in the **hash** (e.g. `#access_token=...&message=...`).

---

## Step 3: User clicks the confirmation link

**What happens:**

1. User opens the link from the email. Browser goes to your app’s base URL with a hash, e.g.  
   `https://yourapp.com/#message=Confirmation+link+accepted&...`  
   (or `https://yourapp.com/#error=...` if the link was expired/invalid).

2. **Before React runs** (`index.tsx`):
   - If the URL is `/` or `/login` and the hash looks like an email-change success or error, the app does a **full redirect** to `/change-email` and keeps the hash:  
     `https://yourapp.com/change-email#message=...`  
   - So the user always lands on the change-email page with the same hash.

3. **In the app** (`App.tsx`):
   - If the user somehow landed on `/` with an email-change hash, an effect also redirects to `/change-email` + hash.

4. **On `/change-email`** (`pages/ChangeEmail.tsx`):
   - **Hash parsing (effect on load):**
     - If the hash contains `error` / `error_code` (e.g. `otp_expired`): show error message, clear hash, user can request a new link.
     - If the hash contains a success-style `message` (e.g. “Confirmation link accepted”): set `confirmationHashPresent = true`. The hash is **not** cleared yet so Supabase’s client can process the tokens from the URL.
   - **Initial email (for “did email change?”):**
     - When `confirmationHashPresent` and session exist, the app stores the **current** `session.user.email` in `initialEmailRef` (the “email when they landed”).
   - **After a short delay (~1.5s):**
     - Gives Supabase time to process the hash and refresh the session.
     - Then the app “decides”:
       - If **session email changed** (`session.user.email !== initialEmailRef`): treat as **success** (first click was enough).
       - Else if **session email equals** `pendingEmailChange`: also **success**.
       - Else (session still has old email, e.g. two-step flow and they clicked the first email): show **“Check your new email”** and a “Sign in with new email” fallback.
   - **Reactive check:** Another effect watches `session.user.email`. If it later becomes equal to `pendingEmailChange` or different from `initialEmailRef`, it immediately marks success (so we don’t depend only on the 1.5s timeout).

**Code:** `index.tsx` (redirect to `/change-email`), `App.tsx` (redirect from `/`), `pages/ChangeEmail.tsx` (hash parsing, `initialEmailRef`, decide effect, session effect).

---

## Step 4: App treats confirmation as success

**When:** The decide logic above has set `emailChangeJustConfirmed = true` and the session’s email is the new one (or we’re in the “no session” path).

**What happens:**

1. **If user is logged in (session exists):**
   - App shows: *“Email changed. Sign in with your new email.”* and *“Sending confirmation to your new email and redirecting to login…”*
   - Effect runs once:
     - Calls `api.auth.sendEmailChangeSuccessNotification()`:
       - Gets current user from Supabase (`getUser()`); at this point the account email is already the **new** one.
       - Invokes `send-email` Edge Function to send “Your email was updated successfully” to that address (the new email).
     - Calls `signOut()`.
     - Navigates to `/login` with `replace: true`.

2. **If user is not logged in** (e.g. opened link in another device):
   - App shows success message and, after 3 seconds, redirects to `/login`.

**Code:** `pages/ChangeEmail.tsx` (success UI and effect that calls `sendEmailChangeSuccessNotification`, `signOut`, `navigate`); `services/api.ts` → `sendEmailChangeSuccessNotification`.

---

## Step 5: User signs in with the new email

**Where:** `/login`.

**What happens:**

- User enters the **new** email and password (or magic link, depending on your auth setup).
- After successful login, they go to the dashboard (or the “from” path if they came from change-email).

The account is now using the new email everywhere.

---

## Flow summary (single-step, Secure email change OFF)

| Step | Who          | Action |
|------|---------------|--------|
| 1    | User          | On `/change-email`, enters new email, clicks Update email. |
| 2    | App           | Calls `updateUser({ email })`, stores `pendingEmailChange`, shows “Confirmation sent to …” |
| 3    | Supabase      | Sends **one** email to the **new** address with confirmation link. |
| 4    | User          | Clicks link in that email. |
| 5    | Browser       | Opens app with hash; app redirects to `/change-email#...`. |
| 6    | Supabase      | Processes hash, updates account email, refreshes session. |
| 7    | App           | Sees `session.user.email === newEmail`, marks success, sends “success” email to new address, signs out, redirects to `/login`. |
| 8    | User          | Signs in with new email. |

---

## Flow summary (two-step, Secure email change ON)

| Step | Who          | Action |
|------|---------------|--------|
| 1–2  | Same         | User requests change; app calls Supabase; Supabase sends email to **old** address (and optionally to new). |
| 3    | User          | Clicks link in **old** address email. |
| 4    | App           | Lands on `/change-email` with hash. Session may still have **old** email (Supabase waiting for second confirmation). |
| 5    | App           | Shows “Check your new email” (and “Sign in with new email” fallback). |
| 6    | Supabase      | Should send second email to **new** address. If that email never arrives, user is stuck unless they try “Sign in with new email.” |
| 7    | User          | If they receive and click the **new** address link: Supabase updates email; app sees updated session and runs success flow (success email, sign out, redirect to login). |

---

## Where things are configured

- **App:** Request and UI → `pages/ChangeEmail.tsx`, `services/api.ts` (`updateEmail`, `sendEmailChangeSuccessNotification`).
- **Redirect to `/change-email`:** `index.tsx`, `App.tsx`.
- **Supabase:** Dashboard → Authentication → Email (Secure email change), Email Templates (Change email address), and Site URL / Redirect URLs so the confirmation link points at your app.

For a single-step flow (one email, one click), disable **Secure email change** in Supabase as described in `supabase/email-templates/README.md`.
