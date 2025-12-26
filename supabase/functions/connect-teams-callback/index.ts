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
    const errorDescription = url.searchParams.get('error_description');

    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    // Remove trailing slash if present
    frontendUrl = frontendUrl.replace(/\/$/, '');

    console.log('Teams callback received:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
      url: req.url,
      frontendUrl
    });

    if (error) {
      const errorMsg = errorDescription || error;
      console.error('OAuth error from Microsoft:', errorMsg);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(errorMsg)}`, 302);
    }

    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state });
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Missing code or state')}`, 302);
    }

    // Parse state: userId:integrationId:randomState
    const stateParts = state.split(':');
    if (stateParts.length < 2) {
      console.error('Invalid state format:', state);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state parameter')}`, 302);
    }
    
    const userId = stateParts[0];
    const integrationId = stateParts[1];
    
    if (!userId || !integrationId) {
      console.error('Missing userId or integrationId in state:', { userId, integrationId, state });
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state parameter')}`, 302);
    }

    console.log('Parsed state:', { userId, integrationId });

    // Get OAuth credentials
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    let supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Remove trailing slash if present
    supabaseUrl = supabaseUrl.replace(/\/$/, '');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const redirectUri = `${supabaseUrl}/functions/v1/connect-teams-callback`;

    console.log('Environment check:', {
      hasClientId: !!microsoftClientId,
      hasClientSecret: !!microsoftClientSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      redirectUri
    });

    if (!microsoftClientId || !microsoftClientSecret) {
      console.error('OAuth credentials missing');
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('OAuth not configured - check environment variables')}`, 302);
    }

    if (!supabaseServiceKey) {
      console.error('Supabase service role key missing');
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Server configuration error')}`, 302);
    }

    // Exchange authorization code for tokens
    console.log('Exchanging authorization code for tokens...', {
      redirectUri,
      hasCode: !!code,
      clientId: microsoftClientId ? '***' + microsoftClientId.slice(-4) : 'missing'
    });
    
    const tokenRequestBody = new URLSearchParams({
      code,
      client_id: microsoftClientId,
      client_secret: microsoftClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'OnlineMeetings.ReadWrite Calendars.ReadWrite',
    });

    console.log('Token request params:', {
      hasCode: !!code,
      hasClientId: !!microsoftClientId,
      hasClientSecret: !!microsoftClientSecret,
      redirectUri,
      grantType: 'authorization_code',
      scope: 'OnlineMeetings.ReadWrite Calendars.ReadWrite'
    });

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    const responseText = await tokenResponse.text();
    console.log('Token response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      responseLength: responseText.length
    });

    if (!tokenResponse.ok) {
      console.error('Error exchanging Microsoft OAuth code:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: responseText
      });
      
      let errorMessage = 'Failed to exchange authorization code';
      let errorDetails = '';
      
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error_description || errorJson.error || errorMessage;
        errorDetails = errorJson.error_codes ? ` (Error codes: ${errorJson.error_codes.join(', ')})` : '';
        
        // Provide helpful messages for common errors
        if (errorJson.error === 'invalid_client') {
          errorMessage = 'Invalid client ID or secret. Please check your Azure AD app configuration.';
        } else if (errorJson.error === 'invalid_grant') {
          errorMessage = 'Authorization code is invalid or expired. This may happen if the code was already used or took too long.';
        } else if (errorJson.error === 'invalid_request') {
          errorMessage = `Invalid request: ${errorJson.error_description || 'Check redirect URI and parameters'}`;
        }
      } catch (e) {
        // If not JSON, use the raw error
        errorMessage = responseText || errorMessage;
      }
      
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(errorMessage + errorDetails)}`, 302);
    }
    
    let tokens;
    try {
      tokens = JSON.parse(responseText);
      console.log('Tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: tokens.token_type
      });
    } catch (e) {
      console.error('Failed to parse token response:', e, responseText);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid response from Microsoft')}`, 302);
    }

    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      console.error('No access token in response:', tokens);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('No access token received')}`, 302);
    }

    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store tokens in integrations table
    const config = {
      access_token,
      refresh_token: refresh_token || null, // Microsoft may not always provide refresh_token
      expires_at: Date.now() + (expires_in * 1000),
      token_type: tokens.token_type || 'Bearer',
    };

    // Map integration ID to name
    const integrationNameMap: Record<string, string> = {
      'teams': 'Microsoft Teams',
      'meet': 'Google Meet',
      'gcal': 'Google Calendar'
    };
    const integrationName = integrationNameMap[integrationId] || 'Integration';
    const userSpecificId = `${userId}_${integrationId}`;

    // First check if integration exists
    console.log('Checking if integration exists:', { integrationId, userId, userSpecificId });
    const { data: existingIntegration, error: checkError } = await supabase
      .from('integrations')
      .select('id, user_id, name')
      .eq('id', userSpecificId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking integration:', checkError);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Database error')}`, 302);
    }

    if (!existingIntegration) {
      console.error('Integration not found:', { integrationId, userId });
      // Try to create it if it doesn't exist
      console.log('Attempting to create integration...');
      const { data: newIntegration, error: createError } = await supabase
        .from('integrations')
        .insert({
          id: userSpecificId,
          user_id: userId,
          name: integrationName,
          desc: '',
          active: true,
          connected_date: new Date().toISOString(),
          config: config,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating integration:', createError);
        return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(`Integration not found and could not be created: ${createError.message}`)}`, 302);
      }

      console.log('Integration created successfully:', newIntegration);
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_success=${integrationId}`, 302);
    }

    console.log('Updating integration in database:', { integrationId, userId, userSpecificId });
    const { data: updateData, error: updateError } = await supabase
      .from('integrations')
      .update({
        active: true,
        connected_date: new Date().toISOString(),
        config: config,
      })
      .eq('id', userSpecificId)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('Error updating integration:', {
        error: updateError,
        integrationId,
        userId,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(`Failed to save integration: ${updateError.message}`)}`, 302);
    }

    if (!updateData || updateData.length === 0) {
      console.error('No rows updated - integration may not exist:', { integrationId, userId });
      return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Integration not found. Please try again.')}`, 302);
    }

    console.log('Integration updated successfully:', updateData);
    // Success - redirect to frontend
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_success=${integrationId}`, 302);
  } catch (error: any) {
    console.error('Error in connect-teams-callback:', error);
    let frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    frontendUrl = frontendUrl.replace(/\/$/, '');
    console.error('Redirecting to frontend with error:', frontendUrl);
    return Response.redirect(`${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error.message || 'Unknown error')}`, 302);
  }
});

