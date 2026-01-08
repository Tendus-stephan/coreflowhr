import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Platform = 'meet' | 'teams';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrlEnv = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseUrl = supabaseUrlEnv.replace(/\/$/, '');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const platform: Platform = body.platform;
    const title: string = body.title || 'Interview';
    const startIso: string = body.startIso; // ISO string
    const durationMinutes: number = body.durationMinutes || 30;

    if (!platform || !startIso) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: platform, startIso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Teams integration is disabled
    if (platform === 'teams') {
      return new Response(
        JSON.stringify({ error: 'Microsoft Teams integration is currently unavailable. Please use Google Meet instead.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Only Google Meet is supported
    if (platform !== 'meet') {
      return new Response(
        JSON.stringify({ error: `Unsupported platform: ${platform}. Only Google Meet is currently supported.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Load integration config for Google Meet
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, config')
      .eq('user_id', user.id)
      .eq('name', 'Google Meet')
      .eq('active', true)
      .maybeSingle();

    if (integrationError) {
      console.error('Error loading integration:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Failed to load integration settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!integration || !integration.config) {
      return new Response(
        JSON.stringify({ 
          error: 'Integration not connected',
          details: `Google Meet integration not found or not active for user ${user.id}. Please connect it in Settings → Integrations.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const config = integration.config as any;
    const result = await createGoogleMeetMeeting(config, user.id, integration.id, title, startIso, durationMinutes, supabaseUrl);
    
    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    
    return new Response(
      JSON.stringify({ meetingUrl: result.meetingUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error in create-meeting function:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function refreshGoogleToken(
  config: any,
  userId: string,
  integrationId: string,
  supabaseUrl: string,
): Promise<{ accessToken?: string; error?: string }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!clientId || !clientSecret || !serviceRoleKey) {
    console.error('Google OAuth or service role not configured');
    return { error: 'Google integration not fully configured on server' };
  }

  const refreshToken = config.refresh_token;
  if (!refreshToken) {
    return { error: 'Missing Google refresh token. Please reconnect Google.' };
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      // Handle invalid_grant error (token expired or revoked) - expected error, don't log as error
      if (tokenData.error === 'invalid_grant') {
        // Mark integration as inactive so user knows they need to reconnect
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin
          .from('integrations')
          .update({ active: false })
          .eq('id', integrationId)
          .eq('user_id', userId);
        
        // Log as info instead of error since this is expected behavior
        console.log('Google token expired or revoked - integration marked as inactive. User needs to reconnect.');
        
        return { 
          error: 'Google token has expired or been revoked. Please reconnect your Google account in Settings → Integrations.' 
        };
      }
      
      // Log other errors (unexpected token refresh failures)
      console.error('Error refreshing Google token:', tokenData);
      return { error: 'Failed to refresh Google access token. Please reconnect Google in Settings → Integrations.' };
    }

    const newAccessToken = tokenData.access_token as string;
    const expiresIn = tokenData.expires_in as number | undefined;
    
    // Google may provide a new refresh token, use it if available
    // Refresh tokens can become invalid after 6 months of inactivity
    const newRefreshToken = tokenData.refresh_token || config.refresh_token;

    // Update integration config with new tokens
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const newConfig = {
      ...config,
      access_token: newAccessToken,
      refresh_token: newRefreshToken, // Update refresh token if Google provided a new one
      expires_at: expiresIn ? Date.now() + expiresIn * 1000 : config.expires_at,
    };

    const { error: updateError } = await supabaseAdmin
      .from('integrations')
      .update({ config: newConfig })
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating Google integration tokens:', updateError);
    }

    return { accessToken: newAccessToken };
  } catch (err) {
    console.error('Unexpected error refreshing Google token:', err);
    return { error: 'Failed to refresh Google token' };
  }
}

async function createGoogleMeetMeeting(
  config: any,
  userId: string,
  integrationId: string,
  title: string,
  startIso: string,
  durationMinutes: number,
  supabaseUrl: string,
): Promise<{ meetingUrl?: string; error?: string; details?: string }> {
  let accessToken: string | undefined = config.access_token;
  const expiresAt = config.expires_at as number | undefined;

  const now = Date.now();
  // Refresh token if it's expired or will expire within 5 minutes (was 1 minute)
  // This prevents token expiration issues during meeting creation
  if (!accessToken || (expiresAt && expiresAt <= now + 5 * 60_000)) {
    const refreshed = await refreshGoogleToken(config, userId, integrationId, supabaseUrl);
    if (refreshed.error) return { error: refreshed.error };
    accessToken = refreshed.accessToken;
  }

  if (!accessToken) {
    return { error: 'No valid Google access token. Please reconnect Google.' };
  }

  // Compute end time
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const eventBody = {
    summary: title,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error creating Google Calendar event:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
      return { 
        error: `Failed to create Google Meet meeting: ${data.error?.message || data.error || 'Unknown error'}`,
        details: JSON.stringify(data)
      };
    }

    const hangoutLink = data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;

    if (!hangoutLink) {
      console.warn('No hangoutLink found in event response:', data);
      return { error: 'Meeting created but no join link returned by Google' };
    }

    return { meetingUrl: hangoutLink };
  } catch (err) {
    console.error('Unexpected error creating Google Meet meeting:', err);
    return { error: 'Failed to create Google Meet meeting' };
  }
}

async function refreshMicrosoftToken(
  config: any,
  userId: string,
  integrationId: string,
  supabaseUrl: string,
): Promise<{ accessToken?: string; error?: string }> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!clientId || !clientSecret || !serviceRoleKey) {
    console.error('Microsoft OAuth or service role not configured');
    return { error: 'Microsoft integration not fully configured on server' };
  }

  const refreshToken = config.refresh_token;
  if (!refreshToken) {
    return { error: 'Missing Microsoft refresh token. Please reconnect Teams.' };
  }

  try {
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'OnlineMeetings.ReadWrite Calendars.ReadWrite',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Error refreshing Microsoft token:', tokenData);
      return { error: 'Failed to refresh Microsoft access token. Please reconnect Teams.' };
    }

    const newAccessToken = tokenData.access_token as string;
    const expiresIn = tokenData.expires_in as number | undefined;

    // Update integration config with new tokens
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const newConfig = {
      ...config,
      access_token: newAccessToken,
      expires_at: expiresIn ? Date.now() + expiresIn * 1000 : config.expires_at,
      refresh_token: tokenData.refresh_token || refreshToken, // Microsoft may provide new refresh token
    };

    const { error: updateError } = await supabaseAdmin
      .from('integrations')
      .update({ config: newConfig })
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating Microsoft integration tokens:', updateError);
    }

    return { accessToken: newAccessToken };
  } catch (err) {
    console.error('Unexpected error refreshing Microsoft token:', err);
    return { error: 'Failed to refresh Microsoft token' };
  }
}

async function createTeamsMeeting(
  config: any,
  userId: string,
  integrationId: string,
  title: string,
  startIso: string,
  durationMinutes: number,
  supabaseUrl: string,
): Promise<{ meetingUrl?: string; error?: string; details?: string }> {
  let accessToken: string | undefined = config.access_token;
  const expiresAt = config.expires_at as number | undefined;

  // Validate token exists and is a non-empty string
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    console.log('No access token found, attempting to refresh...');
    const refreshed = await refreshMicrosoftToken(config, userId, integrationId, supabaseUrl);
    if (refreshed.error) {
      return { error: refreshed.error };
    }
    accessToken = refreshed.accessToken;
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  if (expiresAt && expiresAt <= now + 5 * 60_000) {
    console.log('Microsoft token expired or expiring soon, refreshing...');
    const refreshed = await refreshMicrosoftToken(config, userId, integrationId, supabaseUrl);
    if (refreshed.error) {
      return { error: refreshed.error };
    }
    accessToken = refreshed.accessToken;
  }

  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    return { error: 'No Microsoft access token. Please reconnect Teams in Settings → Integrations.' };
  }

  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const meetingBody = {
    subject: title,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingBody),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error creating Teams meeting:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
      
      // Extract error code from nested structure (Microsoft can return error.error.code or error.code)
      const errorCode = data.error?.error?.code || data.error?.code;
      const errorMessage = data.error?.error?.message || data.error?.message || '';
      
      // Check if this is a token-related error (401) vs permission/policy error (400 AuthenticationError)
      const isTokenError = 
        errorCode === 'InvalidAuthenticationToken' || 
        response.status === 401;
      
      const isPermissionError = 
        (errorCode === 'AuthenticationError' && response.status === 400) ||
        errorCode === 'Authorization_RequestDenied' ||
        errorCode === 'InsufficientPermissions' ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('not authorized') ||
        errorMessage.toLowerCase().includes('access denied');
      
      // Try refreshing token for token errors only
      if (isTokenError) {
        console.log(`Token appears invalid (${response.status} - ${errorCode}), attempting to refresh...`);
        const refreshed = await refreshMicrosoftToken(config, userId, integrationId, supabaseUrl);
        if (refreshed.error) {
          return { 
            error: 'Invalid or expired Microsoft access token. Please reconnect Teams in Settings → Integrations.',
            details: 'The stored token is invalid. Reconnecting will generate a new valid token.'
          };
        }
        
        // Retry with new token
        console.log('Retrying meeting creation with refreshed token...');
        const retryResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingBody),
        });

        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          console.error('Error creating Teams meeting after token refresh:', {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            error: retryData
          });
          
          const retryErrorCode = retryData.error?.error?.code || retryData.error?.code;
          const retryErrorMessage = retryData.error?.error?.message || retryData.error?.message || '';
          const retryIsPermissionError = 
            (retryErrorCode === 'AuthenticationError' && retryResponse.status === 400) ||
            retryErrorCode === 'Authorization_RequestDenied' ||
            retryErrorCode === 'InsufficientPermissions' ||
            retryErrorMessage.toLowerCase().includes('permission') ||
            retryErrorMessage.toLowerCase().includes('not authorized');
          
          if (retryIsPermissionError) {
            return { 
              error: 'Permission denied: Unable to create Teams meetings.',
              details: 'Your Microsoft account may not have permission to create Teams meetings. Please check: 1) Your organization allows Teams meetings, 2) You have a valid Teams license, 3) Admin consent was granted for the app permissions, 4) The required scopes (OnlineMeetings.ReadWrite) are granted. Please contact your IT administrator or reconnect Teams in Settings → Integrations.'
            };
          }
          
          if (retryResponse.status === 401 || retryErrorCode === 'InvalidAuthenticationToken') {
            return { 
              error: 'Invalid or expired Microsoft access token. Please reconnect Teams in Settings → Integrations.',
              details: 'The token refresh failed. Please reconnect your Teams integration to get a new valid token.'
            };
          }
          
          return { 
            error: `Failed to create Microsoft Teams meeting: ${retryErrorMessage || retryErrorCode || 'Unknown error'}`,
            details: JSON.stringify(retryData)
          };
        }
        
        const retryJoinUrl = retryData.joinUrl as string | undefined;
        if (!retryJoinUrl) {
          return { error: 'Meeting created but no join URL returned by Microsoft' };
        }
        
        return { meetingUrl: retryJoinUrl };
      }
      
      // Handle permission/policy errors separately
      if (isPermissionError) {
        return {
          error: 'Permission denied: Unable to create Teams meetings.',
          details: 'Your Microsoft account may not have permission to create Teams meetings. This could be due to: 1) Organization policies preventing Teams meetings, 2) Missing Teams license, 3) Required permissions not granted (OnlineMeetings.ReadWrite), 4) Admin consent not provided. Please check with your IT administrator or try disconnecting and reconnecting Teams in Settings → Integrations.'
        };
      }
      
      // For other errors, use the extracted error message
      const finalErrorMessage = errorMessage || errorCode || 'Unknown error';
      return { 
        error: `Failed to create Microsoft Teams meeting: ${finalErrorMessage}`,
        details: JSON.stringify(data)
      };
    }

    const joinUrl = data.joinUrl as string | undefined;
    if (!joinUrl) {
      return { error: 'Meeting created but no join URL returned by Microsoft' };
    }

    return { meetingUrl: joinUrl };
  } catch (err) {
    console.error('Unexpected error creating Teams meeting:', err);
    return { error: 'Failed to create Microsoft Teams meeting' };
  }
}










