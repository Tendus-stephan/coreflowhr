# Email standards and structure

Coreflow’s email flow is structured to follow common mailing and deliverability standards so messages thread correctly, comply with expectations, and land in the inbox.

## 1. Threading (RFC 5322)

- **Message-ID**  
  Every outbound email gets a unique `Message-ID` of the form `<threadId@domain>` (e.g. `<uuid@coreflowhr.com>`). It is stored in `email_logs.message_id` for later use.

- **X-Thread-ID**  
  A custom header carries the same `threadId` so the inbound handler can match replies to the right conversation even when `In-Reply-To`/`References` are missing.

- **In-Reply-To and References**  
  When sending a reply (when `replyToId` is provided), the Edge Function looks up the parent email’s `message_id` and sets:
  - **In-Reply-To**: the parent’s Message-ID  
  - **References**: the parent’s Message-ID (or chain for longer threads)  

  This lets mail clients group the conversation correctly.

- **Reply-To**  
  When `REPLY_TO_EMAIL` is set (e.g. `replies@coreflowhr.com`), outbound emails set the `Reply-To` header so candidate replies go to that address and can be received and stored (two-way email).

## 2. Unsubscribe and compliance

- **Footer link**  
  The HTML template includes a visible “Unsubscribe” link in the footer (e.g. to `yourdomain.com/unsubscribe?email=...`). Required for commercial/marketing-style messages under laws like CAN-SPAM.

- **List-Unsubscribe header (RFC 8058)**  
  Every outbound email sets:
  - **List-Unsubscribe**: `<https://yourdomain.com/unsubscribe?email=...>`  
  - **List-Unsubscribe-Post**: `List-Unsubscribe=One-Click` (where supported)  

  This helps providers (e.g. Gmail) show a one-click unsubscribe and can improve deliverability.

## 3. Content and format

- **Plain text and HTML**  
  The Resend payload sends both `text` and `html`. Recipients whose client prefers plain text get the text part; others get HTML.

- **From / Reply-To**  
  Sender is a clear “From” (e.g. `Recruiter <noreply@coreflowhr.com>`). Reply-To is set when two-way email is configured so replies go to the correct inbox.

## 4. Content layout (no excess whitespace)

- **Template**  
  Single 600px content card, table-based for compatibility. Outer padding 24px/16px; logo 20px/24px/14px; body 28px sides, 24px bottom; footer 16px top, 20px bottom.

- **Body**  
  Font 15px, line-height 1.6. Paragraphs get 12px bottom margin; the last paragraph has no extra bottom so there’s no gap before the footer.

- **Plain text**  
  **Single Enter** = new line (`<br>`). **Double Enter** (blank line) = new paragraph (new `<p>` with spacing). So the way the user types is preserved. URLs are auto-linked.

- **HTML content**  
  User/template HTML is preserved; newlines in text portions are turned into `<br>` so formatting stays without adding big gaps.

## 5. What you need to do

- **DNS**  
  At your domain provider, add the records your sending/receiving service (e.g. Resend) requires: SPF, DKIM, and optionally DMARC. See `EMAIL_DELIVERABILITY_GUIDE.md` and `RESEND_SETUP.md`.

- **Secrets**  
  Set `FROM_EMAIL`, `FROM_NAME`, and optionally `REPLY_TO_EMAIL` and `COMPANY_WEBSITE` in Supabase Edge Function secrets so Message-ID domain, footer, and List-Unsubscribe URLs use your domain.

- **Unsubscribe page**  
  Implement a route (e.g. `/unsubscribe`) that accepts `?email=...`, records the preference, and shows a confirmation. The link in the footer and in the List-Unsubscribe header should point to this page.

After running the migration that adds `email_logs.message_id`, redeploy the `send-email` Edge Function so new sends get proper Message-IDs and, when replying, correct In-Reply-To and References.
