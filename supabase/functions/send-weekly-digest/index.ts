/**
 * Supabase Edge Function: Send Weekly Digest
 * Invoke via cron (e.g. Monday 9am) to create in-app weekly_digest notifications
 * for users who have weekly_digest_enabled = true.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  const { data: users, error: usersError } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('weekly_digest_enabled', true);

  if (usersError || !users?.length) {
    return new Response(
      JSON.stringify({ ok: true, processed: 0, message: usersError?.message || 'No users with digest enabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processed = 0;
  for (const row of users) {
    const userId = (row as { user_id: string }).user_id;
    try {
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Active');
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgoIso);

      const activeJobs = jobsCount ?? 0;
      const newCandidates = candidatesCount ?? 0;
      const desc = `This week: ${activeJobs} active job(s), ${newCandidates} new candidate(s) in your pipeline.`;
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Weekly digest',
        desc,
        type: 'weekly_digest',
        category: 'system',
        unread: true,
      });
      processed++;

      // Also send email digest
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.email) {
          const todayStr = now.toISOString().split('T')[0];
          const nextWeekStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const [{ count: interviewsCount }, { count: pendingCount }, { count: totalPipelineCount }, { count: upcomingInterviewsCount }] = await Promise.all([
            supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('date', weekAgoIso.split('T')[0]).lte('date', todayStr),
            supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('stage', 'New'),
            supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Scheduled').gte('date', todayStr).lte('date', nextWeekStr),
          ]);

          const interviews = interviewsCount ?? 0;
          const pending = pendingCount ?? 0;
          const totalPipeline = totalPipelineCount ?? 0;
          const upcomingInterviews = upcomingInterviewsCount ?? 0;

          const weekOf = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const subject = `Your weekly hiring summary · Week of ${weekOf}`;

          const pendingRowHtml = pending > 0
            ? `<tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Awaiting review</td>
    <td style="padding:9px 14px;font-size:13px;text-align:right;border-bottom:1px solid #f3f4f6;">
      <span style="background:#fef9c3;color:#854d0e;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;">${pending} new</span>
    </td>
  </tr>`
            : '';

          const upcomingRowHtml = upcomingInterviews > 0
            ? `<tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;">Upcoming interviews</td>
    <td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:600;text-align:right;">Next 7 days: ${upcomingInterviews}</td>
  </tr>`
            : `<tr>
    <td style="padding:9px 14px;font-size:13px;color:#6b7280;">Upcoming interviews</td>
    <td style="padding:9px 14px;font-size:13px;color:#9ca3af;text-align:right;">None scheduled</td>
  </tr>`;

          const content = `<div style="margin-bottom:10px;"><p style="margin:0 0 2px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Weekly Digest</p><h2 style="margin:0 0 2px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">Your week at a glance</h2><p style="margin:0;font-size:12px;color:#9ca3af;">Week of ${weekOf} &nbsp;·&nbsp; ${totalPipeline} candidates in pipeline</p></div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;"><tr><td style="padding:0 6px 0 0;width:33%;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#111827;line-height:1;">${activeJobs}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Active Jobs</div></td></tr></table></td><td style="padding:0 3px;width:33%;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#2563eb;line-height:1;">${newCandidates}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">New Candidates</div></td></tr></table></td><td style="padding:0 0 0 6px;width:33%;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 8px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#111827;line-height:1;">${interviews}</div><div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Interviews Held</div></td></tr></table></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:20px;"><tr style="background:#f9fafb;"><td colspan="2" style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;border-bottom:1px solid #e5e7eb;">Pipeline snapshot</td></tr><tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;width:55%;border-bottom:1px solid #f3f4f6;">Total candidates</td><td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${totalPipeline}</td></tr>${pendingRowHtml}${upcomingRowHtml}</table><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="https://coreflowhr.com" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 28px;border-radius:6px;">Open Dashboard →</a></td></tr></table>`;

          const invokeUrl = `${supabaseUrl}/functions/v1/send-email`;
          await fetch(invokeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ to: authUser.email, subject, content, emailType: 'WeeklyDigest' }),
          });
        }
      } catch (emailErr) {
        console.error('Weekly digest email for user', userId, emailErr);
      }
    } catch (e) {
      console.error('Weekly digest for user', userId, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
