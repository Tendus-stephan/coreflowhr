# System readiness checklist

## Codebase status (verified)

| Check | Status |
|-------|--------|
| Unit tests (135) | ✓ Pass |
| Lint | ✓ No errors |
| Dashboard `scrapeUsage` state | ✓ Defined |
| `recordSeen` error handling | ✓ Non-fatal |
| Migrations exist | ✓ All SQL files in `supabase/migrations/` |
| MANUAL_STEPS.md | ✓ Checklist + links to SQL files |
| BROWSER_TEST_CHECKLIST.md | ✓ 12 tests listed |

**Conclusion: the system is ready from the code side.**

---

## Your side – confirm these

You need to confirm the following in your environment. Once all are done, the system is fully ready.

### 1. Database migrations run in Supabase

In **Supabase** → **SQL Editor**, have you run (at least) these?

- [ ] [add_monthly_scrape_tracking.sql](supabase/migrations/add_monthly_scrape_tracking.sql) — fixes dashboard 404 for `get_scrape_usage`
- [ ] [add_notifications_and_digest_settings.sql](supabase/migrations/add_notifications_and_digest_settings.sql) — fixes dashboard 400 for `user_settings`
- [ ] Any others you need: [add_scraping_status.sql](supabase/migrations/add_scraping_status.sql), [add_scraping_suggestion.sql](supabase/migrations/add_scraping_suggestion.sql), [add_linkedin_url_dedup.sql](supabase/migrations/add_linkedin_url_dedup.sql), [add_job_templates.sql](supabase/migrations/add_job_templates.sql)

### 2. Environment

- [ ] **.env.local** has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] **Supabase** → Edge Functions → **Secrets** set for the functions you use (Stripe, Resend, OpenAI, `SCRAPER_SERVER_URL`, etc.)

### 3. Edge Functions

- [ ] Required functions **deployed** (e.g. scrape-candidates, send-email, parse-cv, Stripe-related)
- [ ] **Stripe webhook** URL added in Stripe Dashboard and `STRIPE_WEBHOOK_SECRET` set in Supabase
- [ ] (Optional) **send-weekly-digest** scheduled (cron) if you use weekly digest

### 4. App behaviour

- [ ] **Dashboard** loads without crash and without 404/400 errors (after running the two migrations in step 1)
- [ ] **Pipeline / Jobs / Add Job** load and work as expected
- [ ] (Optional) Run through [BROWSER_TEST_CHECKLIST.md](BROWSER_TEST_CHECKLIST.md)
- [ ] (Optional) Run `npm run test:functions` to hit deployed Edge Functions

---

## Summary

| Layer | Ready? |
|-------|--------|
| **Code (repo)** | ✓ Yes — tests pass, lint clean, fixes applied |
| **Database (Supabase)** | You confirm: migrations run |
| **Env + secrets** | You confirm: .env.local + Supabase secrets set |
| **Edge Functions** | You confirm: deployed + webhook/cron if needed |
| **Browser** | You confirm: dashboard and key flows work |

When all “You confirm” items are checked, **the system is fully ready.**
