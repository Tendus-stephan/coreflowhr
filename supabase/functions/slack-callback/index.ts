import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async (req) => {
  let frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.coreflowhr.com';
  frontendUrl = frontendUrl.replace(/\/$/, '');

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error)}`,
        302
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Missing code or state')}`,
        302
      );
    }

    // State format: userId:nonce
    const parts = state.split(':');
    const userId = parts[0];
    if (!userId) {
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Invalid state')}`,
        302
      );
    }

    const slackClientId = Deno.env.get('SLACK_CLIENT_ID');
    const slackClientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!slackClientId || !slackClientSecret) {
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Slack OAuth not configured')}`,
        302
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/slack-callback`;

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: slackClientId,
        client_secret: slackClientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error);
      const msg =
        tokenData.error === 'invalid_client_id' ? 'Invalid Slack Client ID. Check SLACK_CLIENT_ID secret.' :
        tokenData.error === 'bad_client_secret' ? 'Invalid Slack Client Secret. Check SLACK_CLIENT_SECRET secret.' :
        tokenData.error === 'invalid_code' ? 'Authorization code expired. Try connecting again.' :
        tokenData.error === 'redirect_uri_mismatch' ? `Redirect URI mismatch. Set redirect URI to: ${redirectUri}` :
        `Slack error: ${tokenData.error}`;
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(msg)}`,
        302
      );
    }

    const botToken: string = tokenData.access_token;
    const teamId: string = tokenData.team?.id ?? '';
    const teamName: string = tokenData.team?.name ?? '';
    // incoming-webhook gives us the channel the user picked during OAuth
    const channelId: string = tokenData.incoming_webhook?.channel_id ?? '';
    const channelName: string = (tokenData.incoming_webhook?.channel ?? '').replace(/^#/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the user's workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership?.workspace_id) {
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Workspace not found')}`,
        302
      );
    }

    const workspaceId = membership.workspace_id as string;

    // Store Slack connection on the workspace
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        slack_bot_token: botToken,
        slack_channel_id: channelId || null,
        slack_channel_name: channelName || null,
        slack_team_name: teamName || null,
        slack_team_id: teamId || null,
      })
      .eq('id', workspaceId);

    if (updateError) {
      console.error('Error saving Slack token:', updateError);
      return Response.redirect(
        `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent('Failed to save Slack connection')}`,
        302
      );
    }

    return Response.redirect(
      `${frontendUrl}/settings?tab=integrations&integration_success=slack`,
      302
    );
  } catch (error: any) {
    console.error('Error in slack-callback:', error);
    return Response.redirect(
      `${frontendUrl}/settings?tab=integrations&integration_error=${encodeURIComponent(error.message || 'Unknown error')}`,
      302
    );
  }
});
