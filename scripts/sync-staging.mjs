#!/usr/bin/env node
/**
 * sync-staging.mjs — links, migrates, and reports schema drift for the staging DB.
 *
 * Usage:
 *   npm run sync:staging
 *   npm run sync:staging -- --project-ref zqjxiddshvtrwthiearo
 *
 * Steps:
 *   1. Resolve staging project ref (arg > env > prompt error)
 *   2. Safety: refuse if ref === prod ref
 *   3. supabase link --project-ref <ref>
 *   4. supabase db push  — apply pending migrations
 *   5. supabase db diff  — detect schema drift
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROD_REF = 'lpjyxpxkagctaibmqcoi';

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
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

// ── Resolve project ref ──────────────────────────────────────────────────────
function getProjectRef() {
  // 1. CLI arg: --project-ref <ref>
  const argIdx = process.argv.indexOf('--project-ref');
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return process.argv[argIdx + 1];
  }
  // 2. STAGING_PROJECT_REF env var
  if (process.env.STAGING_PROJECT_REF) return process.env.STAGING_PROJECT_REF;
  // 3. Derive from VITE_SUPABASE_URL
  const url = process.env.VITE_SUPABASE_URL || '';
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (match) return match[1];
  return null;
}

const projectRef = getProjectRef();

if (!projectRef) {
  console.error('❌  Could not determine staging project ref.');
  console.error('   Pass it explicitly: npm run sync:staging -- --project-ref <ref>');
  console.error('   Or set STAGING_PROJECT_REF in .env.local');
  process.exit(1);
}

if (projectRef === PROD_REF) {
  console.error('❌  Refusing to sync — project ref matches PRODUCTION.');
  console.error('   Pass the staging ref, not the prod ref.');
  process.exit(1);
}

console.log(`\n🔄  Syncing staging DB: project ref = ${projectRef}\n`);

// ── Run shell command with visible output ─────────────────────────────────────
function run(label, cmd, args = []) {
  console.log(`── ${label}`);
  console.log(`   $ ${cmd} ${args.join(' ')}\n`);
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`\n❌  "${label}" exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log('');
}

// ── Step 1: Link to staging project ──────────────────────────────────────────
run(
  'Step 1/3: Link to staging project',
  'npx',
  ['supabase', 'link', '--project-ref', projectRef]
);

// ── Step 2: Push pending migrations ──────────────────────────────────────────
run(
  'Step 2/3: Push pending migrations (supabase db push)',
  'npx',
  ['supabase', 'db', 'push']
);

// ── Step 3: Detect schema drift ───────────────────────────────────────────────
console.log('── Step 3/3: Detect schema drift (supabase db diff)');
console.log('   $ npx supabase db diff\n');

const diffResult = spawnSync('npx', ['supabase', 'db', 'diff'], {
  cwd: ROOT,
  shell: process.platform === 'win32',
  encoding: 'utf8',
});

const diffOutput = (diffResult.stdout || '') + (diffResult.stderr || '');
const hasDrift = diffOutput.trim().length > 0 && !diffOutput.includes('No schema changes');

if (hasDrift) {
  console.log('⚠️   Schema drift detected between local and staging:\n');
  console.log(diffOutput);
  console.log('   Review the diff above. If intentional, create a new migration:');
  console.log('   npx supabase migration new <name>');
} else {
  console.log('✅  No schema drift — staging matches local migrations.\n');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('═'.repeat(64));
console.log(`✅  Sync complete for project ref: ${projectRef}`);
if (hasDrift) {
  console.log('⚠️   Schema drift found — see output above.');
}
console.log('═'.repeat(64) + '\n');
