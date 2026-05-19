#!/usr/bin/env node
/**
 * pre-deploy-check.mjs — validates the environment before deploying.
 *
 * Usage:  npm run pre-deploy
 *
 * Reads env from .env.local (or process.env if already set).
 * Exits 1 if any critical check fails.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.warn('⚠️  .env.local not found — using process.env only');
    return;
  }
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

// ── Helpers ──────────────────────────────────────────────────────────────────
let criticalFailures = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅  ${msg}`); }
function warn(msg) { console.warn(`  ⚠️   ${msg}`); warnings++; }
function fail(msg) { console.error(`  ❌  ${msg}`); criticalFailures++; }

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length - 4))}`);
}

// ── Determine environment ─────────────────────────────────────────────────────
const frontendUrl = process.env.VITE_FRONTEND_URL || '';
const isProduction = frontendUrl.includes('www.coreflowhr.com');
const isStaging = frontendUrl.includes('staging.coreflowhr.com');
const envLabel = isProduction ? 'production' : isStaging ? 'staging' : 'unknown';

console.log(`\n🔍  Pre-deploy check — detected environment: ${envLabel.toUpperCase()}`);
if (envLabel === 'unknown') {
  console.warn(`    VITE_FRONTEND_URL="${frontendUrl}" — could not determine environment`);
}

// ────────────────────────────────────────────────────────────────────────────
// Check 1 — Required VITE_* variables
// ────────────────────────────────────────────────────────────────────────────
section('Check 1: Required VITE_* frontend variables');

const REQUIRED_VITE = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY',
  'VITE_STRIPE_PRICE_ID_FOUNDING_MONTHLY',
  'VITE_FRONTEND_URL',
];

for (const key of REQUIRED_VITE) {
  const val = process.env[key];
  if (!val || val.startsWith('<')) {
    fail(`${key} is not set or still a placeholder`);
  } else {
    pass(`${key} = ${val.slice(0, 40)}${val.length > 40 ? '…' : ''}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check 2 — Edge function secrets checklist (manual confirmation)
// ────────────────────────────────────────────────────────────────────────────
section('Check 2: Edge function secrets');

const ALL_SECRETS = [
  'RESEND_API_KEY', 'FROM_EMAIL', 'FROM_NAME', 'REPLY_TO_EMAIL', 'RESEND_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
  'SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET',
  'DROPBOX_SIGN_API_KEY', 'PDFSHIFT_API_KEY',
  'GEMINI_API_KEY', 'PDL_API_KEY', 'ANTHROPIC_API_KEY',
  'EMAIL_CHANGE_SECRET', 'ENVIRONMENT', 'ALLOWED_ORIGINS',
  'FRONTEND_URL', 'SITE_URL', 'SENTRY_DSN',
];

console.log('  Edge function secrets cannot be read once encrypted in Supabase.');
console.log('  Verify these have been set via:');
console.log('    npx supabase secrets list --project-ref <REF>');
console.log('');
console.log('  Full secrets checklist:');
for (const s of ALL_SECRETS) {
  console.log(`    • ${s}`);
}
warn('Manual verification required — run: npx supabase secrets list --project-ref <REF>');

// ────────────────────────────────────────────────────────────────────────────
// Check 3 — Stripe key prefix matches environment
// ────────────────────────────────────────────────────────────────────────────
section('Check 3: Stripe key prefix matches environment');

const stripePublishable = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

if (isProduction) {
  if (stripePublishable.startsWith('pk_live_')) {
    pass('VITE_STRIPE_PUBLISHABLE_KEY uses pk_live_ (correct for production)');
  } else if (stripePublishable.startsWith('pk_test_')) {
    fail('VITE_STRIPE_PUBLISHABLE_KEY uses pk_test_ but environment is production — use pk_live_');
  } else if (stripePublishable) {
    warn(`VITE_STRIPE_PUBLISHABLE_KEY has unexpected prefix: ${stripePublishable.slice(0, 10)}`);
  }
} else if (isStaging) {
  if (stripePublishable.startsWith('pk_test_')) {
    pass('VITE_STRIPE_PUBLISHABLE_KEY uses pk_test_ (correct for staging)');
  } else if (stripePublishable.startsWith('pk_live_')) {
    fail('VITE_STRIPE_PUBLISHABLE_KEY uses pk_live_ but environment is staging — use pk_test_');
  } else if (stripePublishable) {
    warn(`VITE_STRIPE_PUBLISHABLE_KEY has unexpected prefix: ${stripePublishable.slice(0, 10)}`);
  }
} else {
  warn('Environment is unknown — cannot validate Stripe key prefix (set VITE_FRONTEND_URL to a staging or prod URL)');
}

// ────────────────────────────────────────────────────────────────────────────
// Check 4 — VITE_FRONTEND_URL matches expected domain
// ────────────────────────────────────────────────────────────────────────────
section('Check 4: VITE_FRONTEND_URL matches expected domain');

if (isProduction) {
  pass('VITE_FRONTEND_URL points to www.coreflowhr.com (production)');
} else if (isStaging) {
  pass('VITE_FRONTEND_URL points to staging.coreflowhr.com (staging)');
} else if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
  warn(`VITE_FRONTEND_URL is localhost — are you deploying locally?`);
} else {
  fail(`VITE_FRONTEND_URL="${frontendUrl}" does not match a known environment`);
}

// ────────────────────────────────────────────────────────────────────────────
// Check 5 — Resend API key valid
// ────────────────────────────────────────────────────────────────────────────
section('Check 5: Resend API key reachability');

// Only check VITE_ vars from .env.local — edge function secrets are not available here.
// We read RESEND_API_KEY from process.env in case it was exported manually.
const resendKey = process.env.RESEND_API_KEY;
if (!resendKey || resendKey.startsWith('<')) {
  warn('RESEND_API_KEY not found in .env.local — skipping live check (set it to validate)');
} else {
  try {
    const resp = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (resp.ok) {
      pass(`Resend API key is valid (HTTP ${resp.status})`);
    } else {
      fail(`Resend API key returned HTTP ${resp.status} — check the key`);
    }
  } catch (err) {
    warn(`Could not reach Resend API: ${err.message}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check 6 — Stripe API key valid
// ────────────────────────────────────────────────────────────────────────────
section('Check 6: Stripe API key reachability');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey || stripeSecretKey.startsWith('<')) {
  warn('STRIPE_SECRET_KEY not found in .env.local — skipping live check (set it to validate)');
} else {
  try {
    const resp = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    if (resp.ok) {
      pass(`Stripe API key is valid (HTTP ${resp.status})`);
    } else {
      fail(`Stripe API key returned HTTP ${resp.status} — check the key`);
    }
  } catch (err) {
    warn(`Could not reach Stripe API: ${err.message}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check 7 — No console.log in critical files
// ────────────────────────────────────────────────────────────────────────────
section('Check 7: No console.log in critical auth/payment files');

const CRITICAL_FILES = [
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/create-checkout-session/index.ts',
  'components/ProtectedRoute.tsx',
  'utils/postLoginRoute.ts',
];

for (const relPath of CRITICAL_FILES) {
  const fullPath = resolve(ROOT, relPath);
  if (!existsSync(fullPath)) {
    warn(`File not found (skipping): ${relPath}`);
    continue;
  }
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const hits = lines
    .map((line, i) => ({ line, num: i + 1 }))
    .filter(({ line }) => /console\.log/.test(line) && !line.trim().startsWith('//'));

  if (hits.length === 0) {
    pass(`No console.log found in ${relPath}`);
  } else {
    for (const { line, num } of hits) {
      warn(`console.log at ${relPath}:${num} — ${line.trim().slice(0, 80)}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check 8 — No TODO in critical files
// ────────────────────────────────────────────────────────────────────────────
section('Check 8: No TODO comments in critical auth/payment files');

for (const relPath of CRITICAL_FILES) {
  const fullPath = resolve(ROOT, relPath);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const hits = lines
    .map((line, i) => ({ line, num: i + 1 }))
    .filter(({ line }) => /TODO/i.test(line));

  if (hits.length === 0) {
    pass(`No TODO found in ${relPath}`);
  } else {
    for (const { line, num } of hits) {
      warn(`TODO at ${relPath}:${num} — ${line.trim().slice(0, 80)}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check 9 — ENVIRONMENT var is set to staging or production
// ────────────────────────────────────────────────────────────────────────────
section('Check 9: ENVIRONMENT variable');

const envVar = process.env.ENVIRONMENT;
if (envVar === 'staging' || envVar === 'production') {
  pass(`ENVIRONMENT="${envVar}"`);
} else if (!envVar || envVar.startsWith('<')) {
  fail('ENVIRONMENT is not set — must be "staging" or "production"');
} else {
  fail(`ENVIRONMENT="${envVar}" — expected "staging" or "production"`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(64));
if (criticalFailures === 0 && warnings === 0) {
  console.log('🎉  All checks passed — safe to deploy.');
} else if (criticalFailures === 0) {
  console.log(`⚠️   ${warnings} warning(s) — review above, but deployment can proceed.`);
} else {
  console.log(`❌  ${criticalFailures} critical failure(s) + ${warnings} warning(s) — fix before deploying.`);
}
console.log('═'.repeat(64) + '\n');

if (criticalFailures > 0) process.exit(1);
