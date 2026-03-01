# Google Calendar Sync — Implementation Status

This doc maps your 13-step spec to what exists in the codebase. **Remaining work (create on save, update/delete, disconnect revoke, calendar icon, retry) has been implemented.** Optional: ICS fallback, Settings “connected email” display.

---

## STEP 1 — Google Cloud setup

| Spec | Status | Notes |
|------|--------|--------|
| Project, Calendar API, OAuth consent screen | **You do this** | Not in repo. |
| Scope `calendar.events` only | **Different** | Code uses `calendar` (and for Meet: `calendar` + `meetings.space.created`). Spec wants only `https://www.googleapis.com/auth/calendar.events`. |
| Redirect URI | **Different** | Spec: `http://localhost:3002/auth/google/calendar/callback` and prod. Code: redirect goes to **Edge Function** `.../functions/v1/connect-google-callback`, not a frontend path. |
| Credentials in env | **Partial** | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used. No separate `GOOGLE_REDIRECT_URI` (built from `SUPABASE_URL`). |

---

## STEP 2 — Environment variables

| Variable | Status |
|----------|--------|
| `GOOGLE_CLIENT_ID` | Used (connect-google, connect-google-callback, create-meeting). |
| `GOOGLE_CLIENT_SECRET` | Used. |
| `GOOGLE_REDIRECT_URI` | Not used; redirect URI is derived from Supabase URL. |
| `ENCRYPTION_KEY` | **Not used.** Tokens are stored in plain in `integrations.config` (JSONB). |

---

## STEP 3 — Database migrations

| Spec | Status | Notes |
|------|--------|--------|
| **Profiles:** `google_calendar_connected`, encrypted `google_access_token` / `google_refresh_token`, `google_token_expiry`, `google_calendar_email` | **Not implemented** | Calendar connection is stored in **integrations** (id like `userId_gcal`), not on profiles. No calendar-specific columns on profiles. |
| **Interviews:** `google_event_id`, `calendar_sync_status`, `calendar_sync_error` | **Not implemented** | `interviews` table has no these columns (see `supabase/schema.sql` and migrations). |

---

## STEP 4 — OAuth connect flow

| Spec | Status | Notes |
|------|--------|--------|
| Endpoint “initiate-google-calendar-auth” | **Different** | Flow uses **connect-google** (shared with Google Meet). Frontend calls an API that returns a URL; redirect is to Google then back to **Edge Function** callback. |
| Callback at `/auth/google/calendar/callback` | **Different** | Callback is **connect-google-callback** Edge Function; redirect after success is `.../settings?tab=integrations&integration_success=gcal`. |
| State in session, code exchange, token storage | **Partial** | State is passed in URL (format `userId:integrationId:...`). Code exchange and token storage exist in connect-google-callback. |
| Encrypt tokens before store | **No** | Tokens stored in plain in `integrations.config`. |
| Fetch Google account email for display | **No** | Config does not store or display connected Google email. |
| Redirect to Settings with success | **Yes** | Redirect to settings with `integration_success=gcal`. |

---

## STEP 5 — Disconnect flow

| Spec | Status | Notes |
|------|--------|--------|
| Clear connection and tokens on profile | **Different** | **disconnectIntegration** (api.ts) sets `integrations.active = false`, `config = null`, `connected_date = null`. No profile columns. |
| Call Google revoke endpoint | **No** | Code does **not** call `https://oauth2.googleapis.com/revoke` with the refresh token. |

---

## STEP 6 — Token refresh utility

| Spec | Status | Notes |
|------|--------|--------|
| `getValidGoogleToken(userId)` | **Different** | No shared utility. **refreshGoogleToken** lives inside **create-meeting** and is used only there (for Meet/Calendar event creation). |
| 5‑minute expiry buffer, refresh, update DB | **Yes** | Same logic: refresh if expired or expiring within 5 min; update `integrations.config`. |
| On invalid_grant: set disconnected + notify user | **Partial** | On invalid_grant, integration is set **inactive** (active = false). **No** in-app notification telling the user to reconnect in Settings. |

---

## STEP 7 — Create event when interview is scheduled

| Spec | Status | Notes |
|------|--------|--------|
| Run after interview record is saved | **No** | Calendar event is **not** created when the interview is saved. |
| Create event only if recruiter has calendar connected | **N/A** | Connection is per integration (gcal/meet), not “google_calendar_connected” on profile. |
| Event: summary “Interview with X — Position”, description, start/end (RFC 3339), location, attendees, sendUpdates: all | **Partial** | **create-meeting** creates a **Calendar** event with **Meet** (conferenceData). It only sets summary, start, end. **No** description, **no** attendees, **no** sendUpdates. Used when user clicks “Generate meeting link” in ScheduleInterviewModal, not when saving the interview. |
| Store `google_event_id`, set `calendar_sync_status` | **No** | Interview has no `google_event_id` or `calendar_sync_status`; create-meeting does not persist event id. |
| On failure: set failed + notify with retry | **No** | No interview sync status or retry; create-meeting returns error to UI only. |

---

## STEP 8 — Update event when interview is rescheduled

| Spec | Status | Notes |
|------|--------|--------|
| After interview update, PATCH Calendar event by `google_event_id` | **Not implemented** | No `google_event_id` stored; no PATCH to Calendar. |
| sendUpdates: all; on 404 create new event | **Not implemented** | N/A. |

---

## STEP 9 — Delete event when interview is cancelled

| Spec | Status | Notes |
|------|--------|--------|
| When interview cancelled, DELETE Calendar event by `google_event_id` | **Not implemented** | No `google_event_id`; no DELETE. |
| sendUpdates: all; clear id and set status cancelled on record | **Not implemented** | N/A. |

---

## STEP 10 — ICS fallback

| Spec | Status | Notes |
|------|--------|--------|
| For no calendar connection or sync failure: generate ICS and attach to interview email | **Not implemented** | No `.ics` generation, no `text/calendar` attachment in codebase. |

---

## STEP 11 — Settings UI

| Spec | Status | Notes |
|------|--------|--------|
| Calendar section: Connect button when disconnected | **Partial** | **Integrations** tab has Connect for “Google Calendar” (and Meet). Not a dedicated “Calendar” section. |
| When connected: green indicator + **connected Google account email** + Disconnect | **Partial** | Connected state and Disconnect exist. **Connected Google account email is not shown** (not stored in config). |
| Copy for “Automatically sync…” / “Interviews are automatically synced…” | **Partial** | Integration card shows description; not exact spec copy. |

---

## STEP 12 — Calendar view indicator

| Spec | Status | Notes |
|------|--------|--------|
| Sync status icon on interview event cards (synced / failed / not_connected) | **Not implemented** | Calendar (Calendar.tsx) styles events by **type** (Meet / Phone / In-Person) only. No `calendar_sync_status` or icon/tooltip for sync state. No retry on click. |

---

## STEP 13 — Error handling summary

| Spec | Status | Notes |
|------|--------|--------|
| Token expired → refresh, retry | **Yes** | Handled in create-meeting token refresh. |
| Refresh invalid/revoked → set disconnected, notify, ICS fallback | **Partial** | Integration marked inactive; no in-app notification; no ICS. |
| Rate limit → retry with backoff (e.g. 60s, 3x) | **No** | Not implemented. |
| 404 on update/delete → create new / treat delete as success | **No** | No update/delete to Calendar. |
| 500/timeout → retry once, then fail + notify | **No** | No structured retry or notification. |
| Sanitise event strings | **No** | No explicit sanitisation. |
| No calendar connected → ICS only, status not_connected | **No** | No ICS; no sync status. |

---

## Summary table

| Step | Implemented | Partially / Different | Not implemented |
|------|-------------|----------------------|------------------|
| 1 Google Cloud | — | Scopes, redirect URI | — |
| 2 Env vars | Client ID/secret | — | ENCRYPTION_KEY, GOOGLE_REDIRECT_URI |
| 3 DB migrations | — | — | Profiles calendar fields, interviews sync fields |
| 4 OAuth connect | Flow, redirect to settings | No encryption, no calendar email, different endpoint/callback | — |
| 5 Disconnect | Clear integration | — | Google revoke endpoint |
| 6 Token refresh | Refresh + 5 min buffer in create-meeting | No shared getValidGoogleToken, no notification on revoke | — |
| 7 Create event | create-meeting creates event + Meet | Only when “Generate link” clicked; no full description/attendees/sendUpdates; no event id on interview | Run on interview save, store id, status, retry |
| 8 Update event | — | — | Full step |
| 9 Delete event | — | — | Full step |
| 10 ICS fallback | — | — | Full step |
| 11 Settings UI | Connect/Disconnect in Integrations | No calendar email, no dedicated Calendar section | — |
| 12 Calendar indicator | — | — | Sync status icon + retry |
| 13 Error handling | Token refresh | No notification on revoke | Rate limit, 404, 500 retry, sanitise, ICS fallback |

---

## Recommended implementation order

1. **Migrations** — Add profiles columns (or keep using integrations but add `google_calendar_email` in config) and interview columns (`google_event_id`, `calendar_sync_status`, `calendar_sync_error`).
2. **Encryption** — Introduce `ENCRYPTION_KEY` and encrypt/decrypt tokens before storing in `integrations.config` (or profiles if you switch).
3. **Disconnect** — Call Google revoke in `disconnectIntegration` when disconnecting Google Calendar.
4. **Token utility** — Extract `getValidGoogleToken(userId)` (or equivalent using integration) and use it everywhere; on invalid_grant create in-app notification.
5. **Create event on schedule** — After saving an interview, if calendar connected, create full Calendar event (summary, description, location, attendees, sendUpdates), store `google_event_id`, set `calendar_sync_status`; on failure set failed and notify with retry.
6. **Update/delete** — On reschedule/cancel, PATCH/DELETE by `google_event_id`; handle 404 as spec.
7. **ICS fallback** — Generate ICS for interviews when calendar not connected or sync failed; attach to interview confirmation email.
8. **Settings** — Show connected Google email (store in config or profile when connecting); optional dedicated Calendar section.
9. **Calendar view** — Add sync status icon and retry for event cards.
10. **Error handling** — Rate limit retry, 500 retry, and string sanitisation as in spec.

Use this file as the single source of truth for “what’s done vs what’s left” for Google Calendar sync.
