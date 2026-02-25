# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

CoreFlowHR is a recruitment ATS (Applicant Tracking System) built with React 19 + TypeScript + Vite. It uses Supabase (hosted PostgreSQL + Auth + Edge Functions) as its backend. There is no local backend server required for the main app — it talks directly to Supabase.

### Services

| Service | Port | Command | Notes |
|---------|------|---------|-------|
| Main app (Vite dev server) | 3002 | `npm run dev` | React SPA; requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Scraper UI (Express + Vite) | 3005 + 5173 | `npm run scraper-ui` | Optional; needs `SUPABASE_SERVICE_ROLE_KEY` |

Sub-projects (`scraper-ui/`, `coreflow-premium-onboarding/`, `coreflow-hr-ai-assistant/`) each have their own `package.json` and require separate `npm install`.

### Running tests

```bash
npm run test:run     # one-shot vitest run (135 tests, all mocked, no Supabase needed)
npm test             # vitest in watch mode
npm run test:coverage # with coverage report
```

Tests mock Supabase in `tests/setup.ts`, so no credentials are needed for the test suite.

### Building

```bash
npm run build   # vite build → dist/
```

### Type checking

```bash
npx tsc --noEmit
```

Note: the codebase has pre-existing TypeScript errors (e.g. in `pages/Calendar.tsx`, `pages/ChangeEmail.tsx`, `pages/Clients.tsx`, `services/api.ts`, `temp_apify_backup.ts`). These are not regressions from setup.

### Environment variables

A `.env` (or `.env.local`) file at the project root is required for the Vite dev server. The update script auto-creates this from environment secrets if they are set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), falling back to placeholders.

Without valid Supabase credentials, the UI will render but auth/data operations will fail with "Failed to fetch". This is expected for frontend-only development.

### Authentication gotcha

Supabase email verification is enabled on the hosted project. Creating a test account via the signup form will require email verification before login. To programmatically confirm a user's email with `SUPABASE_SERVICE_ROLE_KEY`:

```bash
curl -X PUT "$VITE_SUPABASE_URL/auth/v1/admin/users/<USER_ID>" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_confirm": true}'
```

### Subscription paywall gotcha

After login, new users are redirected to a pricing/subscription page. The app checks `subscription_status` in the `user_settings` table. To bypass this for testing, update the user's subscription status directly:

```bash
curl -X PATCH "$VITE_SUPABASE_URL/rest/v1/user_settings?user_id=eq.<USER_ID>" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"subscription_status": "active"}'
```

### Node version

The project requires Node.js 20 (see `.nvmrc`). Use `nvm use 20` or ensure Node 20+ is available.
