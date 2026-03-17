import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const slackClientId = Deno.env.get('SLACK_CLIENT_ID');
    if (!slackClientId) {
      return new Response(
        JSON.stringify({ error: 'Slack OAuth not configured', details: 'SLACK_CLIENT_ID environment variable is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/slack-callback`;
    const state = `${user.id}:${crypto.randomUUID()}`;

    // Scopes:
    //   chat:write       — post messages as the bot
    //   channels:read    — list channels for display
    //   groups:read      — list private channels the bot is in
    //   incoming-webhook — forces the user to pick a channel during OAuth; returns channel_id
    const scope = 'chat:write,channels:read,groups:read,incoming-webhook';

    const oauthUrl = new URL('https://slack.com/oauth/v2/authorize');
    oauthUrl.searchParams.set('client_id', slackClientId);
    oauthUrl.searchParams.set('scope', scope);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('state', state);

    return new Response(
      JSON.stringify({ url: oauthUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in slack-connect:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
