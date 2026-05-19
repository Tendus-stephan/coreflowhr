/**
 * Sends a new application email to the recruiter (job owner).
 * Called from api.ts after a public candidate applies.
 * Uses service role to look up recruiter email and email_notifications preference.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewApplicationPayload {
  recruiterId: string;
  candidateName: string;
  jobTitle: string;
  aiScore?: number | null;
  skills?: string[];
  source?: string;
  candidateId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as NewApplicationPayload;
    const { recruiterId, candidateName, jobTitle, aiScore, skills, source } = body;

    if (!recruiterId || !candidateName || !jobTitle) {
      return new Response(
        JSON.stringify({ error: 'recruiterId, candidateName, and jobTitle are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(recruiterId);
    if (userError || !user?.email) {
      console.warn('[send-new-application-email] No email for user', recruiterId, userError?.message);
      return new Response(JSON.stringify({ sent: false, reason: 'no_email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('email_notifications')
      .eq('user_id', recruiterId)
      .single();

    if (settings?.email_notifications === false) {
      return new Response(JSON.stringify({ sent: false, reason: 'disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scoreText = aiScore != null ? `${aiScore}%` : 'Not scored yet';
    const scoreBg = aiScore != null && aiScore >= 80 ? '#dcfce7' : aiScore != null && aiScore >= 60 ? '#fef9c3' : '#f3f4f6';
    const scoreColor = aiScore != null && aiScore >= 80 ? '#166534' : aiScore != null && aiScore >= 60 ? '#854d0e' : '#6b7280';
    const skillsText = skills && skills.length > 0 ? skills.join(', ') : '—';
    const sourceText = source === 'direct_application' ? 'Direct application' : (source || 'Unknown');

    const subject = `New application: ${candidateName} for ${jobTitle}`;
    const content = `
<div style="background:#eff6ff;border-radius:8px;padding:14px 18px;margin-bottom:16px;border-left:4px solid #2563eb;">
  <p style="margin:0 0 2px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;">New Application</p>
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">${candidateName}</h2>
  <p style="margin:4px 0 0 0;font-size:13px;color:#4b5563;">Applied for <strong style="color:#111827;">${jobTitle}</strong></p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:20px;">
  <tr style="background:#f9fafb;">
    <td colspan="2" style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;border-bottom:1px solid #e5e7eb;">Application details</td>
  </tr>
  <tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;width:45%;border-bottom:1px solid #f3f4f6;">Match Score</td>
    <td style="padding:9px 14px;font-size:13px;text-align:right;border-bottom:1px solid #f3f4f6;">
      <span style="background:${scoreBg};color:${scoreColor};padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;">${scoreText}</span>
    </td>
  </tr>
  <tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Skills</td>
    <td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:500;text-align:right;border-bottom:1px solid #f3f4f6;">${skillsText}</td>
  </tr>
  <tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;">Source</td>
    <td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:500;text-align:right;">${sourceText}</td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center">
      <a href="https://coreflowhr.com" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 28px;border-radius:6px;">View Candidate Profile →</a>
    </td>
  </tr>
</table>`;

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
        emailType: 'NewApplication',
      }),
    });

    if (!invokeRes.ok) {
      const errText = await invokeRes.text();
      console.error('[send-new-application-email] send-email invoke failed', invokeRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Notify all workspace members in-app about the new application
    try {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', recruiterId)
        .limit(1);
      const workspaceId = membership?.[0]?.workspace_id;
      if (workspaceId) {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId);
        if (members?.length) {
          const notifRows = members.map((m: { user_id: string }) => ({
            user_id: m.user_id,
            title: 'New application received',
            desc: `${candidateName} applied for ${jobTitle}.`,
            type: 'new_application',
            category: 'job',
            unread: true,
          }));
          await supabase.from('notifications').insert(notifRows);
        }
      }
    } catch (notifErr) {
      console.warn('[send-new-application-email] notification broadcast failed', notifErr);
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-new-application-email]', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
