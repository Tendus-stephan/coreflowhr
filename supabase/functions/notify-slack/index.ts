/**
 * notify-slack — server-side proxy for Slack Incoming Webhook notifications.
 * Browser fetch to hooks.slack.com is blocked by CORS; this edge function
 * runs server-side so there are no CORS restrictions.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { webhookUrl, text, blocks } = await req.json();

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'webhookUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent SSRF — only allow Slack webhook URLs
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return new Response(JSON.stringify({ error: 'Invalid webhook URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = { text: text || '' };
    if (blocks) payload.blocks = blocks;

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await slackRes.text();
    return new Response(JSON.stringify({ ok: slackRes.ok, slackStatus: slackRes.status, body }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
