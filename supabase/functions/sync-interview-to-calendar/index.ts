import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Action = 'create' | 'update' | 'delete';

function sanitizeForGoogle(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 8192);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const interviewId = body?.interviewId as string | undefined;
    const action = (body?.action as Action) || 'create';
    if (!interviewId || !['create', 'update', 'delete'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid interviewId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: interview, error: fetchErr } = await admin
      .from('interviews')
      .select(`
        id, user_id, candidate_id, job_title, date, time, end_time, duration_minutes, timezone,
        type, meeting_link, notes, interviewer, address, status,
        google_event_id, calendar_sync_status,
        candidates!inner(id, name, email)
      `)
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !interview) {
      return new Response(JSON.stringify({ error: 'Interview not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidate = (interview as any).candidates;
    const candidateName = candidate?.name || 'Candidate';
    const candidateEmail = candidate?.email || '';
    const jobTitle = interview.job_title || 'Position';
    const recruiterEmail = user.email || '';

    if (action === 'delete') {
      const eventId = interview.google_event_id;
      if (!eventId) {
        await admin.from('interviews').update({
          calendar_sync_status: 'not_connected',
          calendar_sync_error: null,
        }).eq('id', interviewId).eq('user_id', user.id);
        return new Response(JSON.stringify({ ok: true, skipped: 'no_event' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let integration: { id: string; config: any } | null = null;
      for (const name of ['Google Calendar', 'Google Meet']) {
        const { data } = await admin.from('integrations').select('id, config').eq('user_id', user.id).eq('name', name).eq('active', true).maybeSingle();
        if (data?.config) {
          integration = data;
          break;
        }
      }
      if (!integration) {
        await admin.from('interviews').update({ google_event_id: null, calendar_sync_status: 'not_connected', calendar_sync_error: null }).eq('id', interviewId).eq('user_id', user.id);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const tokenResult = await getValidGoogleToken(admin, integration.config, user.id, integration.id, supabaseUrl);
      if (tokenResult.error) {
        await admin.from('interviews').update({ calendar_sync_status: 'failed', calendar_sync_error: tokenResult.error }).eq('id', interviewId).eq('user_id', user.id);
        return new Response(JSON.stringify({ error: tokenResult.error }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      });
      if (delRes.status === 404) {
        // Already deleted on Google side
      } else if (!delRes.ok) {
        const errText = await delRes.text();
        await admin.from('interviews').update({ calendar_sync_status: 'failed', calendar_sync_error: errText.slice(0, 500) }).eq('id', interviewId).eq('user_id', user.id);
        return new Response(JSON.stringify({ error: 'Failed to delete calendar event' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await admin.from('interviews').update({ google_event_id: null, calendar_sync_status: 'not_connected', calendar_sync_error: null }).eq('id', interviewId).eq('user_id', user.id);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // create or update
    let integration: { id: string; config: any } | null = null;
    for (const name of ['Google Calendar', 'Google Meet']) {
      const { data } = await admin.from('integrations').select('id, config').eq('user_id', user.id).eq('name', name).eq('active', true).maybeSingle();
      if (data?.config) {
        integration = data;
        break;
      }
    }

    if (!integration) {
      await admin.from('interviews').update({ calendar_sync_status: 'not_connected', calendar_sync_error: null }).eq('id', interviewId).eq('user_id', user.id);
      return new Response(JSON.stringify({ ok: true, skipped: 'not_connected' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tokenResult = await getValidGoogleToken(admin, integration.config, user.id, integration.id, supabaseUrl);
    if (tokenResult.error) {
      await admin.from('interviews').update({ calendar_sync_status: 'failed', calendar_sync_error: tokenResult.error }).eq('id', interviewId).eq('user_id', user.id);
      await createCalendarSyncFailedNotification(admin, user.id, candidateName, interviewId);
      return new Response(JSON.stringify({ error: tokenResult.error }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const durationMin = interview.duration_minutes ?? 60;
    const startDt = new Date(`${interview.date}T${interview.time}`);
    const endDt = new Date(startDt.getTime() + durationMin * 60 * 1000);
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://coreflowhr.com';
    const candidateUrl = `${frontendUrl.replace(/\/$/, '')}/candidates?candidateId=${interview.candidate_id}`;
    const location = interview.meeting_link || interview.address || interview.notes || '';
    const description = [
      `Candidate: ${sanitizeForGoogle(candidateName)}`,
      `Job: ${sanitizeForGoogle(jobTitle)}`,
      `Type: ${interview.type || 'Google Meet'}`,
      location ? `Meeting link / Address: ${sanitizeForGoogle(location)}` : '',
      `View candidate: ${candidateUrl}`,
      interview.notes ? `Notes: ${sanitizeForGoogle(interview.notes)}` : '',
    ].filter(Boolean).join('\n');

    const summary = `Interview with ${sanitizeForGoogle(candidateName)} — ${sanitizeForGoogle(jobTitle)}`;
    const attendees: { email: string }[] = [];
    if (recruiterEmail) attendees.push({ email: recruiterEmail });
    if (candidateEmail && candidateEmail !== recruiterEmail) attendees.push({ email: candidateEmail });
    const interviewerStr = (interview.interviewer || '').trim();
    if (interviewerStr && interviewerStr.includes('@')) {
      const email = interviewerStr.split(/\s+/).find((p: string) => p.includes('@'));
      if (email && !attendees.some((a) => a.email === email)) attendees.push({ email });
    }

    const baseEvent: Record<string, unknown> = {
      summary,
      description,
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
      location: location ? sanitizeForGoogle(location.slice(0, 1024)) : undefined,
      attendees: attendees.length ? attendees : undefined,
    };

    const existingEventId = interview.google_event_id;

    if (action === 'update' && existingEventId) {
      const patchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existingEventId)}?sendUpdates=all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: baseEvent.start,
          end: baseEvent.end,
          description: baseEvent.description,
        }),
      });
      if (patchRes.status === 404) {
        // Event deleted on Google; create new one
      } else if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}));
        const errMsg = (errData as any).error?.message || await patchRes.text();
        await admin.from('interviews').update({ calendar_sync_status: 'failed', calendar_sync_error: errMsg.slice(0, 500) }).eq('id', interviewId).eq('user_id', user.id);
        await createCalendarSyncFailedNotification(admin, user.id, candidateName, interviewId);
        return new Response(JSON.stringify({ error: 'Failed to update calendar event' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        const data = await patchRes.json();
        return new Response(JSON.stringify({ ok: true, eventId: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const isMeet = (interview.type || '').toLowerCase().includes('google meet') || (interview.type || '').toLowerCase().includes('video');
    const eventBody: Record<string, unknown> = { ...baseEvent };
    if (isMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const postRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all${isMeet ? '&conferenceDataVersion=1' : ''}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      },
    );

    const data = await postRes.json().catch(() => ({}));
    if (!postRes.ok) {
      const errMsg = (data as any).error?.message || JSON.stringify(data);
      await admin.from('interviews').update({ calendar_sync_status: 'failed', calendar_sync_error: errMsg.slice(0, 500) }).eq('id', interviewId).eq('user_id', user.id);
      await createCalendarSyncFailedNotification(admin, user.id, candidateName, interviewId);
      return new Response(JSON.stringify({ error: 'Failed to create calendar event' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const eventId = (data as any).id;
    const hangoutLink = (data as any).hangoutLink || (data as any).conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
    const updatePayload: Record<string, unknown> = {
      google_event_id: eventId,
      calendar_sync_status: 'synced',
      calendar_sync_error: null,
    };
    if (hangoutLink && (interview.type || '').toLowerCase().includes('google meet')) {
      updatePayload.meeting_link = hangoutLink;
    }
    await admin.from('interviews').update(updatePayload).eq('id', interviewId).eq('user_id', user.id);

    return new Response(JSON.stringify({ ok: true, eventId, meetingUrl: hangoutLink || undefined }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[sync-interview-to-calendar]', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function getValidGoogleToken(
  admin: ReturnType<typeof createClient>,
  config: any,
  userId: string,
  integrationId: string,
  supabaseUrl: string,
): Promise<{ accessToken?: string; error?: string }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return { error: 'Google Calendar not configured' };
  let accessToken = config.access_token;
  const expiresAt = config.expires_at as number | undefined;
  const now = Date.now();
  if (accessToken && expiresAt && expiresAt > now + 5 * 60_000) {
    return { accessToken };
  }
  const refreshToken = config.refresh_token;
  if (!refreshToken) return { error: 'Missing Google refresh token. Please reconnect in Settings → Integrations.' };

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    if (tokenData.error === 'invalid_grant') {
      await admin.from('integrations').update({ active: false }).eq('id', integrationId).eq('user_id', userId);
      await admin.from('notifications').insert({
        user_id: userId,
        title: 'Google Calendar disconnected',
        desc: 'Your Google Calendar connection has been disconnected. Reconnect in Settings → Integrations to sync interviews again.',
        type: 'integration_disconnected',
        category: 'system',
        unread: true,
      });
      return { error: 'Google token expired or revoked. Please reconnect in Settings → Integrations.' };
    }
    return { error: 'Failed to refresh Google token' };
  }

  const newAccess = tokenData.access_token;
  const expiresIn = tokenData.expires_in;
  const newConfig = {
    ...config,
    access_token: newAccess,
    expires_at: expiresIn ? Date.now() + expiresIn * 1000 : config.expires_at,
    refresh_token: tokenData.refresh_token || config.refresh_token,
  };
  await admin.from('integrations').update({ config: newConfig }).eq('id', integrationId).eq('user_id', userId);
  return { accessToken: newAccess };
}

async function createCalendarSyncFailedNotification(
  admin: ReturnType<typeof createClient>,
  userId: string,
  candidateName: string,
  interviewId: string,
) {
  await admin.from('notifications').insert({
    user_id: userId,
    title: 'Calendar sync failed',
    desc: `Could not sync the interview with ${candidateName} to Google Calendar. You can retry from the Calendar view.`,
    type: 'system',
    category: 'system',
    unread: true,
  });
}
