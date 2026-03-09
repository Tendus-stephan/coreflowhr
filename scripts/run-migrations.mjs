/**
 * Run ReachStream migrations against Supabase via the management API.
 * Uses service-role key — run server-side only, never in browser.
 */

const SUPABASE_URL = 'https://lpjyxpxkagctaibmqcoi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwanl4cHhrYWdjdGFpYm1xY29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA1NjE2NSwiZXhwIjoyMDc5NjMyMTY1fQ.i8ZoaGg_8aJqf8cinOsO6IP3vfeI8SiNd9UM8oPliGw';

const migrations = [
  {
    name: 'Migration 1 — reachstream_id on candidates',
    sql: `
      ALTER TABLE candidates
        ADD COLUMN IF NOT EXISTS reachstream_id TEXT;
      CREATE INDEX IF NOT EXISTS candidates_reachstream_id_idx
        ON candidates(reachstream_id);
    `,
    verify: `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'candidates' AND column_name = 'reachstream_id';
    `,
  },
  {
    name: 'Migration 2 — reachstream_id on sourcing_cache',
    sql: `
      ALTER TABLE sourcing_cache
        ADD COLUMN IF NOT EXISTS reachstream_id TEXT;
      CREATE INDEX IF NOT EXISTS sourcing_cache_reachstream_id_idx
        ON sourcing_cache(reachstream_id);
    `,
    verify: `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sourcing_cache' AND column_name = 'reachstream_id';
    `,
  },
  {
    name: 'Migration 3 — sourcing_provider on sourcing_jobs',
    sql: `
      ALTER TABLE sourcing_jobs
        ADD COLUMN IF NOT EXISTS sourcing_provider TEXT DEFAULT 'pdl';
    `,
    verify: `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sourcing_jobs' AND column_name = 'sourcing_provider';
    `,
  },
  {
    name: 'Migration 4 — sourcing caps on workspaces',
    sql: `
      ALTER TABLE workspaces
        ADD COLUMN IF NOT EXISTS sourcing_provider TEXT DEFAULT 'pdl',
        ADD COLUMN IF NOT EXISTS sourcing_credits_monthly INTEGER DEFAULT 200,
        ADD COLUMN IF NOT EXISTS sourcing_credits_used_this_month INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sourcing_credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS sourcing_notifications_sent JSONB DEFAULT '{}';
    `,
    verify: `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'workspaces'
        AND column_name IN (
          'sourcing_provider',
          'sourcing_credits_monthly',
          'sourcing_credits_used_this_month',
          'sourcing_credits_reset_at',
          'sourcing_notifications_sent'
        )
      ORDER BY column_name;
    `,
  },
];

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  console.log('=== RUNNING REACHSTREAM MIGRATIONS ===\n');

  for (const migration of migrations) {
    console.log(`Running: ${migration.name}`);

    const runResult = await runSQL(migration.sql);
    if (runResult.status >= 400) {
      // exec_sql function may not exist — report the raw SQL to run manually
      console.error(`  ✗ Failed (HTTP ${runResult.status}): ${runResult.body}`);
      console.error(`  → exec_sql RPC not available. Run this SQL manually in Supabase Dashboard > SQL Editor:\n`);
      console.error(migration.sql);
      process.exit(1);
    }

    // Verify the column now exists
    const verifyResult = await runSQL(migration.verify);
    let rows = [];
    try { rows = JSON.parse(verifyResult.body); } catch { rows = []; }

    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(`  ✗ Verification failed — column not found after migration`);
      process.exit(1);
    }

    const colNames = rows.map(r => r.column_name).join(', ');
    console.log(`  ✓ Confirmed: ${colNames}\n`);
  }

  console.log('=== ALL MIGRATIONS COMPLETE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
