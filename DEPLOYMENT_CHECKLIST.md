# Pre-deploy checklist (offer acceptance)

Before deploying to production, ensure the following so candidate "Accept Offer" / "Decline Offer" never fails with a database error.

## 1. Apply offer RPC migration

The public offer response page uses these Supabase RPCs:

- `public.accept_offer_atomic(offer_token_param, response_text)`
- `public.decline_offer_atomic(offer_token_param, response_text)`

If they are missing, candidates see a generic error and can use "Try again" after you fix the DB.

**Apply the migration:**

- **Option A (CLI):** From project root run:  
  `npx supabase db push`  
  (Requires Supabase CLI linked to your project.)
- **Option B (Dashboard):** In Supabase Dashboard → SQL Editor, run the contents of:  
  `supabase/migrations/20260225120000_add_atomic_offer_functions.sql`

**Verify:** In Supabase Dashboard → Database → Functions, confirm `accept_offer_atomic` and `decline_offer_atomic` exist and are executable by `anon` and `authenticated`.

## 2. (Optional) Smoke test

After deploy, open a real offer response link (e.g. `/offers/respond/<token>`) and click "Accept Offer" or "Decline Offer". You should see a success state or a friendly error message, never a raw Postgres/Supabase error.
