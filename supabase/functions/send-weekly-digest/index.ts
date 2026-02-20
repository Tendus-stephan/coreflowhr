/**
 * Supabase Edge Function: Send Weekly Digest
 * Invoke via cron (e.g. Monday 9am) to create in-app weekly_digest notifications
 * for users who have weekly_digest_enabled = true.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  const { data: users, error: usersError } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('weekly_digest_enabled', true);

  if (usersError || !users?.length) {
    return new Response(
      JSON.stringify({ ok: true, processed: 0, message: usersError?.message || 'No users with digest enabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processed = 0;
  for (const row of users) {
    const userId = (row as { user_id: string }).user_id;
    try {
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Active');
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgoIso);

      const activeJobs = jobsCount ?? 0;
      const newCandidates = candidatesCount ?? 0;
      const desc = `This week: ${activeJobs} active job(s), ${newCandidates} new candidate(s) in your pipeline.`;
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Weekly digest',
        desc,
        type: 'weekly_digest',
        category: 'system',
        unread: true,
      });
      processed++;
    } catch (e) {
      console.error('Weekly digest for user', userId, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
