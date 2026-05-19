#!/usr/bin/env bash
# scripts/setup-staging-db.sh
#
# Applies all Supabase migrations to a new staging project.
# Run this once when setting up the staging environment for the first time,
# and again any time you want to re-sync the staging schema with prod.
#
# NEVER point this at the production project ref (lpjyxpxkagctaibmqcoi).
#
# Prerequisites:
#   npm install -g supabase  (or: npx supabase)
#   supabase login           (authenticate with your Supabase account)
#
# Usage:
#   bash scripts/setup-staging-db.sh <staging-project-ref>
#
# Example:
#   bash scripts/setup-staging-db.sh abcdefghijklmnop

set -euo pipefail

PROD_REF="lpjyxpxkagctaibmqcoi"

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/setup-staging-db.sh <staging-project-ref>"
  echo ""
  echo "Get the project ref from:"
  echo "  Supabase dashboard → Settings → General → Reference ID"
  exit 1
fi

STAGING_REF="$1"

# Safety: refuse to run against prod
if [ "$STAGING_REF" = "$PROD_REF" ]; then
  echo "Error: you passed the PRODUCTION project ref."
  echo "This script must only be used with a staging project."
  exit 1
fi

echo ""
echo "=== CoreflowHR — Staging Database Setup ==="
echo ""
echo "Staging project ref : $STAGING_REF"
echo "Migrations to apply : $(ls supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "This will apply all migrations to the staging Supabase project."
echo "No production data will be copied — schema only."
echo ""
read -rp "Proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Link to the staging project
echo ""
echo "Linking to staging project $STAGING_REF..."
npx supabase link --project-ref "$STAGING_REF"

# Push all migrations (schema only — no seed data)
echo ""
echo "Applying migrations..."
npx supabase db push

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. Set Edge Function secrets on the staging project:"
echo "     npx supabase secrets set RESEND_API_KEY=<staging-key> --project-ref $STAGING_REF"
echo "     npx supabase secrets set FRONTEND_URL=https://staging.coreflowhr.com --project-ref $STAGING_REF"
echo "     npx supabase secrets set STRIPE_SECRET_KEY=<test-key> --project-ref $STAGING_REF"
echo "     npx supabase secrets set STRIPE_WEBHOOK_SECRET=<staging-webhook-secret> --project-ref $STAGING_REF"
echo "     npx supabase secrets set GEMINI_API_KEY=<key> --project-ref $STAGING_REF"
echo "     npx supabase secrets set PDL_API_KEY=<key> --project-ref $STAGING_REF"
echo "     (Anthropic key optional — only needed if CV parsing is tested)"
echo ""
echo "  2. Deploy Edge Functions to staging:"
echo "     npx supabase functions deploy --project-ref $STAGING_REF"
echo ""
echo "  3. Set VITE_ env vars in the Vercel staging project dashboard"
echo "     using values from .env.staging.example as a guide."
echo ""
