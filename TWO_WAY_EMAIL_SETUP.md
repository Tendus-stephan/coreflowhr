# Two-Way Email Setup

This app supports **two-way email**: you send emails to candidates from the app, and when they hit **Reply**, their reply is stored and shown in the candidate’s Communication tab. Replies are matched to the correct candidate and thread using `Message-ID` / `X-Thread-ID` and sender address.

## How it works

1. **Outbound**: Emails are sent via the `send-email` Edge Function (Resend). Each email gets a `thread_id`; if the candidate already has an existing thread, new emails reuse it so replies stay in one conversation.
2. **Reply-To**: Outbound emails can set a `Reply-To` address (e.g. `replies@yourdomain.com`) so that when the candidate clicks Reply, the reply goes to that address.
3. **Inbound**: A provider (Resend Inbound) receives email at that address and sends a webhook to the `receive-candidate-email` Edge Function, which stores the reply in `email_logs` and creates a “Candidate replied” notification.

## 1. Set Reply-To (so replies go to your receiving address)

In **Supabase Dashboard** → **Edge Functions** → **Secrets**, add or update:

- **`REPLY_TO_EMAIL`** = the address where you want to receive replies, e.g. `replies@coreflowhr.com`

This must be an address that your **inbound** setup (below) receives. If you leave this unset, replies will go to your `FROM_EMAIL`; for two-way to work, that address (or `REPLY_TO_EMAIL`) must be the one that triggers the inbound webhook.

## 2. Enable receiving with Resend Inbound

Two-way email in this codebase uses **Resend Inbound**, not Supabase’s own “Inbound Email” (the MX record you may have set in the Supabase dashboard is a different feature).

1. **Resend dashboard**: [resend.com](https://resend.com) → **Domains** → add and verify your domain (e.g. `coreflowhr.com`) if you haven’t already.
2. **Inbound**: In Resend, enable **Inbound** for the domain (or the subdomain you use for replies). Add any **MX/DNS** records Resend shows so mail to that address is received (you already see emails under Emails → Receiving).

3. **Add the webhook so our app gets notified**  
   Receiving the email in Resend is not enough — Resend must **call our function** when an email is received:
   - In Resend, open **Webhooks** (left sidebar).
   - Click **Add Webhook**.
   - **Endpoint URL**: set to  
     `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/receive-candidate-email`  
     (get your project ref from the Supabase project URL).
   - **Events**: enable **`email.received`** (or “Receiving” / “Inbound” if that’s how Resend labels it).
   - Save.

   Without this step, replies stay in Resend only and never appear on your site.

4. **Secrets**  
   The function needs **RESEND_API_KEY** (and Supabase keys are set automatically). In Supabase → Edge Functions → Secrets, ensure **RESEND_API_KEY** is set (same key as for `send-email`). Without it, fetching the full email from Resend’s API fails and you may see 502 or “resend_fetch_failed” in logs.

5. **Deploy and allow unauthenticated calls**  
   The `receive-candidate-email` function is called by Resend (no JWT). Ensure it’s deployed and that in `supabase/config.toml` you have:

   ```toml
   [functions.receive-candidate-email]
   verify_jwt = false
   ```

   Then deploy:

   ```bash
   supabase functions deploy receive-candidate-email --no-verify-jwt
   ```

## 3. Resend Inbound webhook event

Resend sends a payload with `type: 'email.received'` and `data.email_id`. The Edge Function fetches the full email from Resend’s API and:

- Parses sender, subject, body, and headers (`In-Reply-To`, `References`, `X-Thread-ID`).
- Matches the reply to a candidate (by thread or by sender email).
- Inserts a row into `email_logs` with `direction: 'inbound'` and creates a “Candidate replied” notification.

## 4. Optional: Use a dedicated reply address

- **From/Reply-To**: Use something like `noreply@coreflowhr.com` for **From** and `replies@coreflowhr.com` for **Reply-To** so that:
  - Outbound “From” stays clean.
  - All replies go to one address that you configure in Resend Inbound.

- **DNS**: Add the MX (and any other) records Resend gives you for the domain or subdomain that will receive replies (e.g. `replies@coreflowhr.com`). That way Resend receives the mail and can trigger the webhook.

## Summary checklist

- [ ] **REPLY_TO_EMAIL** set in Supabase Edge Function secrets (e.g. `replies@yourdomain.com`).
- [ ] Domain verified in Resend and **Inbound** enabled for the reply address.
- [ ] Resend Inbound webhook URL set to `https://<project-ref>.supabase.co/functions/v1/receive-candidate-email`.
- [ ] `receive-candidate-email` deployed with `--no-verify-jwt` and `verify_jwt = false` in config.
- [ ] MX/DNS for the reply address pointed to Resend (per Resend’s instructions).
- [ ] Run migration `20260301100000_email_logs_rls_and_visibility.sql` so email_logs RLS allows you to see inbound replies (and so workspace members can see the same candidate’s thread).
- [ ] **RESEND_API_KEY** set in Edge Function secrets (same as for send-email); otherwise the function cannot fetch the full email from Resend and may return 502.
- [ ] **RESEND_WEBHOOK_SECRET** (optional but recommended): set to your webhook’s signing secret (e.g. `whsec_...`) so the function verifies that POSTs really come from Resend and rejects forgeries (401 if invalid).

After this, when a candidate replies to an email you sent from the app, the reply should appear in the candidate’s Communication tab and trigger a “Candidate replied” notification.

**If replies show in Resend but not in the app**

1. **Check Supabase logs** – Edge Functions → `receive-candidate-email` → Logs. You should see `Webhook received` with the sender; then either `Matched reply` and `Inbound reply stored`, or `Reply not matched to a candidate` (with a hint).
2. **Matching rules** – The reply is linked to a candidate by:
   - **Thread**: `In-Reply-To` / `References` / `X-Thread-ID` from the original email you sent (so the original must have been sent from the app with Reply-To set), or
   - **Sender**: the “From” address matches a candidate’s email in your DB (case-insensitive).
3. If you **reply from your own inbox** (e.g. Gmail) to the candidate, that outbound message is not received by Resend Inbound, so it will not appear in the app. Only emails **received at your Reply-To address** (and processed by the webhook) appear as inbound in history. Use the **Refresh** button in Email history to refetch after a candidate replies.
