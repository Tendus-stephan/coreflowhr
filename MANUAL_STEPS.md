# What you have to do (checklist)

Everything below is on your side. The app and docs are ready; run these in order.

---

## Run these first (fixes dashboard 404/400 and slowness)

1. **Supabase Dashboard** → SQL Editor → New query.
2. Run these migrations **in this order** (open each file, copy all, paste into SQL Editor, run):
   - [supabase/migrations/add_monthly_scrape_tracking.sql](supabase/migrations/add_monthly_scrape_tracking.sql) — fixes `get_scrape_usage` 404 and scrape-usage bar.
   - [supabase/migrations/add_notifications_and_digest_settings.sql](supabase/migrations/add_notifications_and_digest_settings.sql) — fixes `user_settings` 400 (`last_seen_at`, `weekly_digest_enabled`).
3. Reload the app: dashboard should load without those errors.

---

## Database – all SQL migrations you may need

Run in **Supabase** → **SQL Editor** (open file → copy contents → paste → run). Order below is recommended.

**Run first (dashboard):**
- [supabase/migrations/add_monthly_scrape_tracking.sql](supabase/migrations/add_monthly_scrape_tracking.sql)
- [supabase/migrations/add_notifications_and_digest_settings.sql](supabase/migrations/add_notifications_and_digest_settings.sql)
- [supabase/migrations/sync_scrape_reset_with_stripe_period.sql](supabase/migrations/sync_scrape_reset_with_stripe_period.sql) — makes “resets Feb 18” use your Stripe billing period end (run after the two above).

**Then run any you haven’t already:**

| Purpose | File (click to open) |
|--------|----------------------|
| Scraping status on jobs | [supabase/migrations/add_scraping_status.sql](supabase/migrations/add_scraping_status.sql) |
| Partial scrape status | [supabase/migrations/add_partial_scraping_status.sql](supabase/migrations/add_partial_scraping_status.sql) |
| “What to try” suggestion on jobs | [supabase/migrations/add_scraping_suggestion.sql](supabase/migrations/add_scraping_suggestion.sql) |
| LinkedIn dedup + “Also in” | [supabase/migrations/add_linkedin_url_dedup.sql](supabase/migrations/add_linkedin_url_dedup.sql) |
| Job templates table | [supabase/migrations/add_job_templates.sql](supabase/migrations/add_job_templates.sql) |
| Scrape concurrency (multi-user) | [supabase/migrations/add_scrape_concurrency_limit.sql](supabase/migrations/add_scrape_concurrency_limit.sql) — limits concurrent scrapes so HarvestAPI isn’t overloaded |

**Other migrations** (run if your project doesn’t have these yet):
- [supabase/migrations/add_scraper_fields.sql](supabase/migrations/add_scraper_fields.sql) — `profile_url`, `work_experience`, etc. on candidates
- [supabase/migrations/add_clients_table.sql](supabase/migrations/add_clients_table.sql) — clients table
- [supabase/migrations/add_email_workflows.sql](supabase/migrations/add_email_workflows.sql) — email workflows
- [supabase/migrations/add_notification_types.sql](supabase/migrations/add_notification_types.sql) — notification type/category columns
- [supabase/migrations/add_user_credits_and_ai_tracking.sql](supabase/migrations/add_user_credits_and_ai_tracking.sql) — credits / AI tracking
- [supabase/migrations/add_rate_limiting_table.sql](supabase/migrations/add_rate_limiting_table.sql) — rate limiting (e.g. send-email)

---

## Environment

- **`.env.local`** (project root):  
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.  
  Optional: Stripe price IDs if you use billing.
- **Supabase** → **Project Settings** → **Edge Functions** → **Secrets**:  
  Set secrets for each function you use (Stripe, Resend, OpenAI, `SCRAPER_SERVER_URL`, OAuth, etc.). See table in “Edge Functions” below.
- **Scraper server:**  
  Run it and set `SCRAPER_SERVER_URL` in Edge Function secrets to that URL (for sourcing).

---

## Edge Functions

1. **Deploy** each function you use (e.g. `supabase functions deploy <name>` or Dashboard).
2. **Set secrets** in Supabase for that function:

| Function | Secrets to set |
|----------|----------------|
| **scrape-candidates** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SCRAPER_SERVER_URL` |
| **send-email** | `RESEND_API_KEY`, `FROM_EMAIL`, optional `FROM_NAME`, `LOGO_URL` |
| **parse-cv** | `OPENAI_API_KEY` |
| **send-weekly-digest** | (uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` – usually already set) |
| **create-checkout-session** | Stripe keys, price IDs as needed |
| **create-portal-session** | Stripe keys |
| **get-billing-details** / **get-invoices** | Stripe keys |
| **stripe-webhook** | `STRIPE_WEBHOOK_SECRET`, Stripe keys |
| **create-meeting** | Google/Teams OAuth and meeting config if used |
| **connect-google** / **connect-teams** + callbacks | OAuth client ID/secret, callback URLs |

3. **Stripe webhook:**  
   In Stripe Dashboard add endpoint URL  
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`  
   and subscribe to subscription events; set `STRIPE_WEBHOOK_SECRET` in Supabase secrets.
4. **Weekly digest:**  
   If you use it, schedule **send-weekly-digest** (e.g. Monday 9am) via cron or pg_cron calling the function URL.

---

## Test Edge Functions (optional)

From project root:

```bash
npm run test:functions
```

(Uses `VITE_SUPABASE_URL` from `.env.local`. 401 on some calls is OK without a JWT.)

---

## Test in the browser

Use **`BROWSER_TEST_CHECKLIST.md`** and run tests 1–12 (templates, “What to try”, “Also in”, skill tags, tenure, notifications, weekly digest toggle, etc.).

---

## Quick recap

| Step | Action |
|------|--------|
| 1 | Run **add_monthly_scrape_tracking.sql** and **add_notifications_and_digest_settings.sql** (fix dashboard). |
| 2 | Run any other migrations from the table above that you haven’t run. |
| 3 | Set **.env.local** and **Supabase Edge Function secrets**. |
| 4 | Deploy Edge Functions and set Stripe webhook + optional cron for weekly digest. |
| 5 | Run `npm run test:functions` (optional). |
| 6 | Test app flows in the browser (see BROWSER_TEST_CHECKLIST.md). |

---

**What we did (code side):**  
Fixed Dashboard crash (`scrapeUsage` state), scrape-usage bar when `limit` is 0, and `recordSeen` 400 handling. The rest (migrations, env, deploy, Stripe, cron, browser tests) is on your side above.
