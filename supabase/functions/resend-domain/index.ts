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
    // Verify caller is authenticated workspace member
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('authorization') || '';

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const action = body?.action as string;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || '';

    // If using Resend's default onboarding address, domain is not configured
    if (!resendApiKey || fromEmail === 'onboarding@resend.dev' || !fromEmail.includes('@')) {
      return new Response(
        JSON.stringify({ domain: null, status: 'not_configured', records: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const domainName = fromEmail.split('@')[1];

    // Fetch domains list from Resend
    const domainsRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });

    if (!domainsRes.ok) {
      return new Response(
        JSON.stringify({ domain: null, status: 'not_configured', records: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const domainsData = await domainsRes.json();
    const domains: any[] = domainsData?.data || [];
    const match = domains.find((d: any) => d.name === domainName);

    if (!match) {
      return new Response(
        JSON.stringify({ domain: domainName, status: 'not_configured', records: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'verify') {
      const verifyRes = await fetch(`https://api.resend.com/domains/${match.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });
      const verifyData = await verifyRes.json();
      const updatedStatus = verifyData?.status === 'verified' ? 'verified' : 'pending';
      return new Response(
        JSON.stringify({ success: verifyData?.status === 'verified', status: updatedStatus }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // action === 'status' (default)
    const status = match.status === 'verified' ? 'verified' : 'pending';
    const records: Array<{ type: string; name: string; value: string }> =
      (match.records || []).map((r: any) => ({
        type: r.record_type || r.type || '',
        name: r.name || '',
        value: r.value || '',
      }));

    return new Response(
      JSON.stringify({ domain: domainName, status, records }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
