/**
 * Sends an interview notification email to the recruiter.
 * Called from api.ts after an interview is created or cancelled.
 * Uses service role to look up recruiter email and interview_schedule_updates preference.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InterviewAction = 'scheduled' | 'updated' | 'cancelled';

interface InterviewNotificationPayload {
  recruiterId: string;
  action: InterviewAction;
  candidateName: string;
  jobTitle: string;
  date: string;
  time: string;
  type: string;
  durationMinutes?: number;
  meetingLink?: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as InterviewNotificationPayload;
    const { recruiterId, action, candidateName, jobTitle, date, time, type, durationMinutes, meetingLink } = body;

    if (!recruiterId || !action || !candidateName || !jobTitle || !date || !time) {
      return new Response(
        JSON.stringify({ error: 'recruiterId, action, candidateName, jobTitle, date, and time are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(recruiterId);
    if (userError || !user?.email) {
      console.warn('[send-interview-notification-email] No email for user', recruiterId, userError?.message);
      return new Response(JSON.stringify({ sent: false, reason: 'no_email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('interview_schedule_updates')
      .eq('user_id', recruiterId)
      .single();

    if (settings?.interview_schedule_updates === false) {
      return new Response(JSON.stringify({ sent: false, reason: 'disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    const accentColor = action === 'scheduled' ? '#2563eb' : action === 'cancelled' ? '#dc2626' : '#d97706';
    const headerBg   = action === 'scheduled' ? '#eff6ff'  : action === 'cancelled' ? '#fef2f2'  : '#fffbeb';
    const actionLabel = action === 'scheduled' ? 'Scheduled' : action === 'cancelled' ? 'Cancelled' : 'Updated';

    const subject = `Interview ${actionLabel}: ${candidateName} · ${formattedDate}, ${formattedTime}`;

    const ctaHtml = meetingLink && action !== 'cancelled'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
  <tr>
    <td align="center">
      <a href="${meetingLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:6px;">Join Meeting →</a>
    </td>
  </tr>
</table>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
  <tr>
    <td align="center">
      <a href="https://coreflowhr.com" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:6px;">View Interview Details →</a>
    </td>
  </tr>
</table>`;

    const content = `<div style="background:${headerBg};border-radius:8px;padding:14px 18px;margin-bottom:8px;border-left:4px solid ${accentColor};"><p style="margin:0 0 2px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${accentColor};">Interview ${actionLabel}</p><h2 style="margin:0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">${candidateName}</h2><p style="margin:4px 0 0 0;font-size:13px;color:#4b5563;">${jobTitle}</p></div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:20px;"><tr style="background:#f9fafb;"><td colspan="2" style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;border-bottom:1px solid #e5e7eb;">Interview details</td></tr><tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;width:45%;border-bottom:1px solid #f3f4f6;">Date</td><td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${formattedDate}</td></tr><tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Time</td><td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${formattedTime}</td></tr><tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Format</td><td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:500;text-align:right;border-bottom:1px solid #f3f4f6;">${type}</td></tr><tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;">Duration</td><td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:500;text-align:right;">${durationMinutes || 60} min</td></tr></table>${ctaHtml}`;

    const invokeUrl = `${supabaseUrl}/functions/v1/send-email`;
    const invokeRes = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        subject,
        content,
        emailType: 'InterviewNotification',
      }),
    });

    if (!invokeRes.ok) {
      const errText = await invokeRes.text();
      console.error('[send-interview-notification-email] send-email invoke failed', invokeRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-interview-notification-email]', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
