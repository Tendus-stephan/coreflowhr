# Supabase Auth email templates (branded)

These HTML templates are for **Supabase Auth** emails (e.g. **change email**). You can push the change-email template to Supabase via script or paste it manually.

## Option A: Push via script (recommended)

1. **Get a personal access token**: [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens). Create a token with access to your project.

2. **Add to `.env.local`** (do not commit this if the repo is shared):
   ```env
   SUPABASE_ACCESS_TOKEN=your_token_here
   ```

3. **Run the script** from the project root:
   ```bash
   npm run update-email-template
   ```
   Or with the token inline: `SUPABASE_ACCESS_TOKEN=xxx npm run update-email-template`

The script updates the **Change email address** template (subject + HTML body with logo) on your Supabase project.

## Option B: Paste manually in Dashboard

1. **Upload your logo** (if not already): Supabase Dashboard → **Storage** → bucket `email-assets` (public) → upload `logo.png`.

2. **Edit** `change-email.html` if your logo URL is different (e.g. different project ref).

3. Supabase Dashboard → **Authentication** → **Email Templates** → **Change email address**. Paste the full contents of `change-email.html` into the body and save.

## Single-step email change (recommended)

By default Supabase can send **two** confirmation emails (old address + new address). If the second email never arrives, users get stuck on "Check your new email."

For **one email to the new address and one click = done**:

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**.
2. Disable **Secure email change** (or set "Confirm email change" so only the new address receives the link).
3. Save. After that, only one confirmation email is sent to the new address; clicking it completes the change.

## Template variables (do not remove)

- `{{ .ConfirmationURL }}` – link to confirm the change  
- `{{ .Email }}` – current (old) email  
- `{{ .NewEmail }}` – new email
