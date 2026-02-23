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

    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.coreflowhr.com';
    // Remove trailing slash if present
    frontendUrl = frontendUrl.replace(/\/$/, '');

    if (error) {
      // Redirect to frontend with error
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Missing code or state')}`, 302);
    }

    // Parse state: userId:integrationIdOrFullId:randomState
    // Frontend sends integration.id which can be full row id (userId_meet) or short key (meet)
    const parts = state.split(':');
    const userId = parts[0];
    const integrationIdOrFullId = parts[1];
    if (!userId || !integrationIdOrFullId) {
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state parameter')}`, 302);
    }
    const isFullId = integrationIdOrFullId.includes('_');
    const userSpecificId = isFullId ? integrationIdOrFullId : `${userId}_${integrationIdOrFullId}`;
    const shortKey = isFullId ? integrationIdOrFullId.split('_').pop() : integrationIdOrFullId;

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
      let userMessage = 'Failed to exchange authorization code';
      try {
        const err = JSON.parse(errorData);
        const code = err?.error;
        const desc = (err?.error_description || '').toLowerCase();
        if (code === 'invalid_client') userMessage = 'Invalid client ID or secret. Check Supabase Edge Function secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) and redeploy.';
        else if (code === 'invalid_grant') userMessage = 'Authorization expired or already used. Try connecting again from Settings → Integrations.';
        else if (code === 'redirect_uri_mismatch') userMessage = 'Redirect URI mismatch. In Google Console set the redirect URI to exactly: ' + redirectUri;
        else if (desc.includes('redirect')) userMessage = 'Redirect URI mismatch. In Google Console add: ' + redirectUri;
      } catch (_) {}
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(userMessage)}`, 302);
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

    // Map short key to display name
    const integrationNameMap: Record<string, string> = {
      'gcal': 'Google Calendar',
      'meet': 'Google Meet'
    };
    const integrationName = integrationNameMap[shortKey] || 'Google Integration';

    // First check if integration exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', userSpecificId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking integration:', checkError);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Database error')}`, 302);
    }

    if (!existingIntegration) {
      // Create integration if it doesn't exist
      const { error: createError } = await supabase
        .from('integrations')
        .insert({
          id: userSpecificId,
          user_id: userId,
          name: integrationName,
          desc: '',
        active: true,
        connected_date: new Date().toISOString(),
        config: config,
        });

      if (createError) {
        console.error('Error creating integration:', createError);
        return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(`Failed to create integration: ${createError.message}`)}`, 302);
      }
    } else {
      // Update existing integration
    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        active: true,
        connected_date: new Date().toISOString(),
        config: config,
      })
        .eq('id', userSpecificId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating integration:', updateError);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to save integration')}`, 302);
      }
    }

    // Success - redirect to frontend (shortKey so UI knows which one: meet or gcal)
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_success=${shortKey}`, 302);
  } catch (error: any) {
    console.error('Error in connect-google-callback:', error);
    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.coreflowhr.com';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error.message || 'Unknown error')}`, 302);
  }
});







