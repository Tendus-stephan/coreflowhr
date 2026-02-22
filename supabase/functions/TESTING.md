# Edge Functions – Test Guide

Test each function one by one. Use either **local** (Supabase running locally) or **deployed** (your project URL).

## Quick run (script)

From project root:

```bash
# Deployed: ensure .env.local has VITE_SUPABASE_URL=https://<project-ref>.supabase.co
npm run test:functions

# Local: after supabase start && supabase functions serve
npm run test:functions:local
```

Optional: pass a user JWT for auth-required functions:  
`SUPABASE_JWT=eyJ... node scripts/test-edge-functions.mjs`

## Manual curl setup

**Local:** Start Supabase and serve functions:
```bash
supabase start
supabase functions serve
```
Base URL: `http://localhost:54321/functions/v1`

**Deployed:** Use your project URL:
```
https://<project-ref>.supabase.co/functions/v1
```

**Auth:** Most functions need a valid user JWT. Get it by logging in to the app and copying the session token from DevTools → Application → Local Storage → `sb-<project>-auth-token`, or use the test script below which can use your anon key for unauthenticated checks.

---

## 1. send-weekly-digest

No auth required (intended for cron). Creates in-app digest notifications for users with weekly digest enabled.

```bash
curl -s -X POST "$BASE_URL/send-weekly-digest" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `200` with `{"ok":true,"processed":N}`.

---

## 2. get-billing-details

Requires `Authorization: Bearer <user_jwt>`.

```bash
curl -s -X POST "$BASE_URL/get-billing-details" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `200` with subscription/payment details, or `401` if no/invalid token.

---

## 3. get-invoices

Requires `Authorization: Bearer <user_jwt>`.

```bash
curl -s -X POST "$BASE_URL/get-invoices" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `200` with `{ "invoices": [...] }`, or `401` if no/invalid token.

---

## 4. create-portal-session

Requires `Authorization: Bearer <user_jwt>`. Body: `{ "userId": "<user_uuid>" }` (optional if inferred from JWT).

```bash
curl -s -X POST "$BASE_URL/create-portal-session" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `200` with `{ "url": "https://billing.stripe.com/..." }`, or `401`/`500` if not configured.

---

## 5. create-checkout-session

Requires `Authorization: Bearer <user_jwt>`. Body: `priceId`, `planType`, `billingInterval`, etc.

```bash
curl -s -X POST "$BASE_URL/create-checkout-session" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_xxx","planType":"basic","billingInterval":"monthly"}'
```

**Expected:** `200` with `{ "sessionId": "cs_..." }` or error if Stripe not configured.

---

## 6. stripe-webhook

Called by Stripe with signature. Do not test with curl unless you sign the payload (use Stripe CLI: `stripe trigger checkout.session.completed` and point to your webhook URL).

---

## 7. send-email

Requires `to`, `subject`, `content`. May use rate limiting by IP.

```bash
curl -s -X POST "$BASE_URL/send-email" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","content":"Hello"}'
```

**Expected:** `200` with success, or `400` (missing fields), `429` (rate limit), `500` (Resend not configured).

---

## 8. parse-cv

Requires `cvText` (string). Optional: `jobSkills` (array).

```bash
curl -s -X POST "$BASE_URL/parse-cv" \
  -H "Content-Type: application/json" \
  -d '{"cvText":"John Doe\nSoftware Engineer\n5 years experience"}'
```

**Expected:** `200` with parsed CV JSON, or `400` (missing cvText), `500` (OpenAI not configured).

---

## 9. scrape-candidates

Requires `Authorization: Bearer <user_jwt>`. Body: `jobId` (required), optional `sources`, `maxCandidates`.

```bash
curl -s -X POST "$BASE_URL/scrape-candidates" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"YOUR_ACTIVE_JOB_UUID","maxCandidates":2}'
```

**Expected:** `200` with `{ "success": true, "totalSaved": N, ... }`, or `400` (no jobId), `401`, `402` (scrape limit).

---

## 10. create-meeting

Requires `Authorization: Bearer <user_jwt>`. Body: `platform` ('meet' | 'teams'), interview/candidate details.

```bash
curl -s -X POST "$BASE_URL/create-meeting" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"platform":"meet","title":"Interview","date":"2025-02-01","time":"10:00"}'
```

**Expected:** `200` with meeting link, or `400`/`401`/`500` depending on config.

---

## 11. connect-google / connect-teams

Return redirect URLs for OAuth. Test in browser or with a GET request to get redirect location.

---

## 12. connect-google-callback / connect-teams-callback

OAuth callbacks – tested by completing the OAuth flow in the app.

---

## OPTIONS (CORS)

Every function should respond to OPTIONS with `200`:

```bash
curl -s -X OPTIONS "$BASE_URL/send-weekly-digest" -I
```

**Expected:** `200` and CORS headers.
