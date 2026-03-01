# What’s still in test mode

Use this list when moving to production. Turn each off or switch to live as needed.

---

## 1. Dropbox Sign (eSignature) – **hardcoded**

**Where:** Edge Functions send signature requests with `test_mode: 1`.

| File | Line | What |
|------|------|------|
| `supabase/functions/send-offer-with-esignature/index.ts` | ~121 | `form.append('test_mode', '1')` |
| `supabase/functions/send-offer-html-pdf/index.ts` | ~616 | `form.append('test_mode', '1')` |

**Effect:** Test mode doesn’t use quota and is for free accounts; documents may be watermarked or limited.

**For production:** Remove the `test_mode` line (or set it from an env var, e.g. `form.append('test_mode', Deno.env.get('DROPBOX_SIGN_TEST_MODE') === 'true' ? '1' : '0')` and set the secret only in non‑production).

---

## 2. Stripe – **env / config**

**Where:** Frontend and backend use Stripe keys and price IDs from environment variables.

| What | Test (current) | Production |
|------|------------------|------------|
| Publishable key | `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` | `pk_live_...` |
| Secret key (Edge Functions) | `STRIPE_SECRET_KEY=sk_test_...` | `sk_live_...` |
| Price IDs | `VITE_STRIPE_PRICE_ID_*` = test price IDs | Same vars, but live price IDs from Stripe Dashboard (live mode) |

**For production:** Follow `PRODUCTION_MIGRATION_GUIDE.md`: create live products/prices in Stripe, then switch env vars to live keys and live price IDs (no code change if you only use env).

---

## 3. PDFShift – **no test flag in code**

**Where:** `send-offer-html-pdf` calls PDFShift with `source: html` only. There is no `sandbox: true` (or similar) in the code.

**Effect:** PDFShift is already using live conversion (and your credits). Optional: PDFShift supports a `sandbox` parameter for free watermarked PDFs; we don’t use it, so nothing to “turn off” here for production.

---

## 4. In-app “test mode” (jobs/candidates) – **feature, not API test**

**Where:** Settings and DB: jobs/candidates with `is_test: true` or `[TEST]` prefix.

**Effect:** Used to create test jobs and candidates that can be filtered out. Not third‑party test mode.

**For production:** You can keep this and use it only in non‑production, or disable the “Enable test mode” (or similar) in Settings so real users don’t create test data.

---

## Summary: change for production

| Item | Type | Action for production |
|------|------|------------------------|
| **Dropbox Sign** | Code | Remove or gate `test_mode`, redeploy `send-offer-with-esignature` and `send-offer-html-pdf`. |
| **Stripe** | Env | Use live keys (`pk_live_`, `sk_live_`) and live price IDs in production env. |
| **PDFShift** | – | Already live; no change needed. |
| **App test mode** | Feature | Optional: disable in production or restrict to admins. |
