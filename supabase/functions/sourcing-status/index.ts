/**
 * sourcing-status Edge Function
 *
 * Returns the current sourcing status for a job.
 * Used by the frontend to poll sourcing progress.
 * Accepts: GET ?job_id=xxx&workspace_id=xxx
 * Auth: anon JWT (workspace member required).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    const workspaceId = url.searchParams.get('workspace_id');

    if (!jobId || !workspaceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing job_id or workspace_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is a workspace member via anon JWT
    const authHeader = req.headers.get('authorization') || '';
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: membership } = await anonClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch job sourcing fields
    const { data: job, error } = await anonClient
      .from('jobs')
      .select('id, sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_last_run_at, sourcing_error_message, sourcing_pdl_offset')
      .eq('id', jobId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ ok: false, error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sourcing_status: job.sourcing_status,
        sourcing_candidates_count: job.sourcing_candidates_count || 0,
        sourcing_maxed_out: job.sourcing_maxed_out || false,
        sourcing_last_run_at: job.sourcing_last_run_at,
        sourcing_error_message: job.sourcing_error_message,
        sourcing_pdl_offset: job.sourcing_pdl_offset || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[sourcing-status] Unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
