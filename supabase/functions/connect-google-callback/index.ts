import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    // Remove trailing slash if present
    frontendUrl = frontendUrl.replace(/\/$/, '');

    if (error) {
      // Redirect to frontend with error
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Missing code or state')}`, 302);
    }

    // Parse state: userId:integrationId:randomState
    const [userId, integrationId] = state.split(':');
    if (!userId || !integrationId) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state parameter')}`, 302);
    }

    // Get OAuth credentials
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const redirectUri = `${supabaseUrl}/functions/v1/connect-google-callback`;

    if (!googleClientId || !googleClientSecret) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('OAuth not configured')}`, 302);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Error exchanging Google OAuth code:', errorData);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to exchange authorization code')}`, 302);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('No tokens received')}`, 302);
    }

    // Initialize Supabase client with service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store tokens in integrations table
    const config = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in * 1000),
      token_type: tokens.token_type || 'Bearer',
    };

    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        active: true,
        connected_date: new Date().toISOString(),
        config: config,
      })
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating integration:', updateError);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to save integration')}`, 302);
    }

    // Success - redirect to frontend
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_success=${integrationId}`, 302);
  } catch (error: any) {
    console.error('Error in connect-google-callback:', error);
    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error.message || 'Unknown error')}`, 302);
  }
});



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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    // Remove trailing slash if present
    frontendUrl = frontendUrl.replace(/\/$/, '');

    if (error) {
      // Redirect to frontend with error
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Missing code or state')}`, 302);
    }

    // Parse state: userId:integrationId:randomState
    const [userId, integrationId] = state.split(':');
    if (!userId || !integrationId) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state parameter')}`, 302);
    }

    // Get OAuth credentials
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const redirectUri = `${supabaseUrl}/functions/v1/connect-google-callback`;

    if (!googleClientId || !googleClientSecret) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('OAuth not configured')}`, 302);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Error exchanging Google OAuth code:', errorData);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to exchange authorization code')}`, 302);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('No tokens received')}`, 302);
    }

    // Initialize Supabase client with service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store tokens in integrations table
    const config = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in * 1000),
      token_type: tokens.token_type || 'Bearer',
    };

    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        active: true,
        connected_date: new Date().toISOString(),
        config: config,
      })
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating integration:', updateError);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to save integration')}`, 302);
    }

    // Success - redirect to frontend
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_success=${integrationId}`, 302);
  } catch (error: any) {
    console.error('Error in connect-google-callback:', error);
    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error.message || 'Unknown error')}`, 302);
  }
});







