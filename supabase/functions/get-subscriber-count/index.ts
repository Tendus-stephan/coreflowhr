import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FOUNDING_LIMIT = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { count, error } = await adminClient
      .from('user_settings')
      .select('*', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trialing']);

    if (error) throw error;

    const activeCount = count ?? 0;
    const spotsLeft = Math.max(0, FOUNDING_LIMIT - activeCount);

    return new Response(
      JSON.stringify({
        count: activeCount,
        foundingLimit: FOUNDING_LIMIT,
        foundingSpotsLeft: spotsLeft,
        foundingAvailable: activeCount < FOUNDING_LIMIT,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error getting subscriber count:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
