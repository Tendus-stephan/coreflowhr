/**
 * Verify all new ReachStream migration columns exist on remote.
 */
const SUPABASE_URL = 'https://lpjyxpxkagctaibmqcoi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwanl4cHhrYWdjdGFpYm1xY29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA1NjE2NSwiZXhwIjoyMDc5NjMyMTY1fQ.i8ZoaGg_8aJqf8cinOsO6IP3vfeI8SiNd9UM8oPliGw';

async function checkColumns(table, columns) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${columns.join(',')}&limit=0`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  return { status: res.status, ok: res.ok, body: await res.text() };
}

const checks = [
  { table: 'candidates',     columns: ['reachstream_id'],             label: 'Migration 1 — candidates.reachstream_id' },
  { table: 'sourcing_cache', columns: ['reachstream_id'],             label: 'Migration 2 — sourcing_cache.reachstream_id' },
  { table: 'sourcing_jobs',  columns: ['sourcing_provider'],          label: 'Migration 3 — sourcing_jobs.sourcing_provider' },
  {
    table: 'workspaces',
    columns: ['sourcing_provider','sourcing_credits_monthly','sourcing_credits_used_this_month','sourcing_credits_reset_at','sourcing_notifications_sent'],
    label: 'Migration 4 — workspaces sourcing cap fields',
  },
];

console.log('=== MIGRATION VERIFICATION ===\n');
let allPassed = true;
for (const check of checks) {
  const result = await checkColumns(check.table, check.columns);
  if (result.ok) {
    console.log(`  ✓ PASS  ${check.label}`);
    console.log(`         Columns confirmed: ${check.columns.join(', ')}\n`);
  } else {
    console.error(`  ✗ FAIL  ${check.label}`);
    console.error(`         HTTP ${result.status}: ${result.body}\n`);
    allPassed = false;
  }
}
console.log(allPassed ? '=== ALL MIGRATIONS VERIFIED ✓ ===' : '=== SOME VERIFICATIONS FAILED ✗ ===');
process.exit(allPassed ? 0 : 1);
