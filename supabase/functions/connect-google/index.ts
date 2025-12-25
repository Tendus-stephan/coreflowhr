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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
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

    // Get Google OAuth credentials from environment
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

    if (!googleClientId) {
      return new Response(
        JSON.stringify({ 
          error: 'Google OAuth not configured',
          details: 'GOOGLE_CLIENT_ID environment variable is not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();
    
    // Determine scopes based on integration
    const scopes = integrationId === 'gcal' 
      ? 'https://www.googleapis.com/auth/calendar'
      : integrationId === 'meet'
      ? 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meetings.space.created'
      : 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meetings.space.created';

    // Build OAuth URL - callback goes to Edge Function
    const redirectUri = `${supabaseUrl}/functions/v1/connect-google-callback`;
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', googleClientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('access_type', 'offline');
    oauthUrl.searchParams.set('prompt', 'consent');
    oauthUrl.searchParams.set('state', `${user.id}:${integrationId}:${state}`);

    console.log('Google OAuth URL generated:', {
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
    console.error('Error in connect-google:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to initiate Google OAuth flow'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
