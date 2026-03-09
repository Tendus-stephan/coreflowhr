/**
 * reset-sourcing-credits Edge Function
 *
 * Resets monthly sourcing credits for all active paid workspaces.
 * Called on the 1st of every month at midnight UTC via pg_cron or an external cron service.
 *
 * Security: Requires Authorization header matching CRON_SECRET env var,
 * OR a valid service-role JWT.
 *
 * External cron call example (Vercel Cron, Railway, etc.):
 *   POST https://<project>.supabase.co/functions/v1/reset-sourcing-credits
 *   Authorization: Bearer <CRON_SECRET>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret     = Deno.env.get('CRON_SECRET');

    // Verify caller is authorised
    const authHeader  = req.headers.get('authorization') || '';
    const callerToken = authHeader.replace(/^bearer\s+/i, '');

    const isServiceRole = (() => {
      try {
        const payload = JSON.parse(atob(callerToken.split('.')[1]));
        return payload?.role === 'service_role';
      } catch { return false; }
    })();

    const isValidCronSecret = cronSecret && callerToken === cronSecret;

    if (!isServiceRole && !isValidCronSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    const { error, count } = await supabase
      .from('workspaces')
      .update({
        sourcing_credits_used_this_month: 0,
        sourcing_credits_reset_at: now,
        sourcing_notifications_sent: {},
      })
      .eq('is_free_access', false)
      .eq('plan_status', 'active');

    if (error) {
      console.error('[reset-sourcing-credits] Update error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[reset-sourcing-credits] Reset complete at ${now} — ${count ?? 'unknown'} workspaces updated`);

    return new Response(JSON.stringify({ ok: true, reset_at: now, workspaces_updated: count }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[reset-sourcing-credits] Unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
