import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://zqjxiddshvtrwthiearo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxanhpZGRzaHZ0cnd0aGllYXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg3MzkzMSwiZXhwIjoyMDk0NDQ5OTMxfQ.C7Hb0m_WEVhdRSWZ8Cg7Er00MJghjGkihTq7jaCZmMw'
);
const tables = ['user_settings','activity_log','rate_limit_log','job_assignments','scheduling_links'];
for (const t of tables) {
  const r = await supabase.from(t).select('*').limit(1);
  console.log(t + ':', r.error ? 'MISSING: ' + r.error.message : 'OK');
}
