/**
 * send-interview-reminders — runs every 10 minutes via pg_cron.
 * Finds interviews starting in the next 25–35 minutes (30 min window),
 * sends a Slack reminder block to the workspace webhook, and marks
 * the interview so it won't be re-notified.
 */
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

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase        = createClient(supabaseUrl, serviceRoleKey);

  const now     = new Date();
  const winStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
  const winEnd   = new Date(now.getTime() + 35 * 60 * 1000); // 35 min from now

  // Query interviews in the reminder window that haven't been notified yet
  // interviews.date is a date string "YYYY-MM-DD", interviews.time is "HH:MM"
  // We'll pull all scheduled interviews for the relevant date and filter in JS
  const dateStr = winStart.toISOString().slice(0, 10);

  const { data: interviews, error } = await supabase
    .from('interviews')
    .select(`
      id, candidate_id, candidate_name, job_title, date, time, type, meeting_link,
      candidates(workspace_id)
    `)
    .eq('date', dateStr)
    .eq('status', 'Scheduled')
    .eq('reminder_sent', false);

  if (error) {
    console.error('[send-interview-reminders] Query error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!interviews || interviews.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Filter to the 25–35 min window based on interview time
  const upcoming = interviews.filter((iv) => {
    if (!iv.time) return false;
    const [hh, mm] = iv.time.split(':').map(Number);
    const interviewMs = new Date(`${iv.date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`).getTime();
    return interviewMs >= winStart.getTime() && interviewMs < winEnd.getTime();
  });

  if (upcoming.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Cache webhook URLs per workspace to avoid duplicate queries
  const webhookCache: Record<string, string | null> = {};
  let sent = 0;

  for (const iv of upcoming) {
    const workspaceId = (iv.candidates as any)?.workspace_id;
    if (!workspaceId) continue;

    if (!(workspaceId in webhookCache)) {
      const { data: ws } = await supabase
        .from('workspaces').select('slack_webhook_url').eq('id', workspaceId).maybeSingle();
      webhookCache[workspaceId] = (ws as any)?.slack_webhook_url ?? null;
    }

    const webhookUrl = webhookCache[workspaceId];
    if (!webhookUrl) continue;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Upcoming interview in ~30 min*\n*${iv.candidate_name}* · _${iv.job_title}_\n📅 ${iv.date} at ${iv.time} · ${iv.type}`,
        },
      },
      iv.meeting_link
        ? { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Join Meeting', emoji: true }, url: iv.meeting_link }] }
        : { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Interview', emoji: true }, url: `https://www.coreflowhr.com/candidates?candidateId=${iv.candidate_id}` }] },
    ];

    await supabase.functions.invoke('notify-slack', {
      body: { webhookUrl, text: `Upcoming interview: ${iv.candidate_name} in ~30 min`, blocks },
    }).catch(() => {});

    // Mark reminder sent
    await supabase.from('interviews').update({ reminder_sent: true }).eq('id', iv.id).catch(() => {});
    sent++;
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
