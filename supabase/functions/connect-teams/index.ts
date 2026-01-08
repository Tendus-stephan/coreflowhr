import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    let supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Remove trailing slash if present
    supabaseUrl = supabaseUrl.replace(/\/$/, '');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { integrationId } = await req.json();

    // Get Microsoft OAuth credentials from environment
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.coreflowhr.com';

    if (!microsoftClientId) {
      return new Response(
        JSON.stringify({ 
          error: 'Microsoft OAuth not configured',
          details: 'MICROSOFT_CLIENT_ID environment variable is not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();
    
    // Microsoft Teams OAuth scopes
    const scopes = 'OnlineMeetings.ReadWrite Calendars.ReadWrite';

    // Build OAuth URL - callback goes to Edge Function
    const redirectUri = `${supabaseUrl}/functions/v1/connect-teams-callback`;
    const oauthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    oauthUrl.searchParams.set('client_id', microsoftClientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('response_mode', 'query');
    oauthUrl.searchParams.set('state', `${user.id}:${integrationId}:${state}`);

    console.log('Microsoft Teams OAuth URL generated:', {
      integrationId,
      userId: user.id,
      redirectUri,
    });

    return new Response(
      JSON.stringify({ 
        url: oauthUrl.toString(),
        state: `${user.id}:${integrationId}:${state}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in connect-teams:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to initiate Microsoft Teams OAuth flow'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
