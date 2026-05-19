# Coreflow — Claude Instructions

## Database changes — ALWAYS write a migration file

**Never edit the database directly in the Supabase dashboard SQL editor.**

Every schema change (new table, new column, new policy, new function, new trigger, new index) must be a file in `supabase/migrations/` following the naming pattern:

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260520120000_add_status_to_jobs.sql`

Migrations must be idempotent — use `IF NOT EXISTS`, `OR REPLACE`, and `DROP ... IF EXISTS` guards so they can be safely re-run.

Why: every push to `main` runs `supabase db push --include-all` against staging. If a change bypasses migrations it will never reach staging (or any future environment), breaking consistency permanently.

## Deployment

- `git push origin main` → auto-deploys to staging (staging.coreflowhr.com)
- `npm run promote:prod` → promotes main → prod (www.coreflowhr.com)

## Edge function imports

Always use `npm:` specifiers in Deno edge functions — never `https://esm.sh/`.

```ts
// correct
import { createClient } from 'npm:@supabase/supabase-js@2';

// wrong — flaky CDN, breaks CI bundling
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```
