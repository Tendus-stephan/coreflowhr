import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizeForGoogle(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 8192);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { token, slot, name, email } = body as {
      token?: string;
      slot?: string;
      name?: string;
      email?: string;
    };

    if (!token || !slot || !name || !email) {
      return json({ error: 'Missing required fields: token, slot, name, email' }, 400);
    }

    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Atomic booking via SECURITY DEFINER RPC
    const { data: rpcResult, error: rpcErr } = await admin.rpc('book_scheduling_slot', {
      p_token: token,
      p_booked_slot: slot,
      p_name: name,
      p_email: email,
    });

    if (rpcErr) {
      console.error('[book-scheduling-slot] RPC error:', rpcErr);
      return json({ error: 'Booking failed. Please try again.' }, 500);
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      candidate_id?: string;
      job_id?: string;
      created_by?: string;
      workspace_id?: string;
      interview_type?: string;
      duration_minutes?: number;
      message?: string;
    };

    if (!result.success) {
      return json({ error: result.error || 'Booking failed' }, 409);
    }

    const {
      candidate_id: candidateId,
      job_id: jobId,
      created_by: createdBy,
      workspace_id: workspaceId,
      interview_type: interviewType,
      duration_minutes: durationMinutes,
    } = result;

    // 2. Fetch extra details: candidate email, job title, recruiter profile, workspace
    const [
      { data: candidateRow },
      { data: jobRow },
      { data: wsRow },
      { data: recruiterRow },
    ] = await Promise.all([
      admin.from('candidates').select('name, email').eq('id', candidateId!).maybeSingle(),
      jobId ? admin.from('jobs').select('title').eq('id', jobId).maybeSingle() : Promise.resolve({ data: null }),
      workspaceId ? admin.from('workspaces').select('name, company_logo_url').eq('id', workspaceId).maybeSingle() : Promise.resolve({ data: null }),
      createdBy ? admin.from('profiles').select('name').eq('id', createdBy).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const candidateName = (candidateRow as any)?.name ?? name;
    const candidateEmail = (candidateRow as any)?.email ?? email;
    const jobTitle = (jobRow as any)?.title ?? 'the position';
    const companyName = (wsRow as any)?.name ?? 'the company';

    // 3. Fetch recruiter email
    let recruiterEmail = '';
    if (createdBy) {
      const { data: { user: recruiterUser } } = await admin.auth.admin.getUserById(createdBy);
      recruiterEmail = recruiterUser?.email ?? '';
    }

    const slotDate = new Date(slot);
    const slotEnd = new Date(slotDate.getTime() + (durationMinutes ?? 30) * 60_000);

    // 4. Insert interview row
    const interviewDate = slotDate.toISOString().slice(0, 10);
    const interviewTime = slotDate.toTimeString().slice(0, 5);
    const interviewEndTime = slotEnd.toTimeString().slice(0, 5);

    const dbType =
      interviewType === 'Video Call' ? 'Google Meet' :
      interviewType === 'Phone Screen' ? 'Phone' :
      'In-Person';

    const { data: insertedInterview, error: insertErr } = await admin
      .from('interviews')
      .insert({
        user_id: createdBy,
        candidate_id: candidateId,
        job_title: jobTitle,
        date: interviewDate,
        time: interviewTime,
        end_time: interviewEndTime,
        type: dbType,
        duration_minutes: durationMinutes ?? 30,
        timezone: 'UTC',
        status: 'Scheduled',
        calendar_sync_status: 'not_connected',
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        notes: `Booked via scheduling link by ${name} (${email})`,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[book-scheduling-slot] Interview insert error:', insertErr);
    }

    // 5. Move candidate to Interview stage if currently at Screening
    if (candidateId) {
      const { data: cand } = await admin
        .from('candidates')
        .select('stage')
        .eq('id', candidateId)
        .maybeSingle();

      if ((cand as any)?.stage === 'Screening') {
        await admin
          .from('candidates')
          .update({ stage: 'Interview', updated_at: new Date().toISOString() })
          .eq('id', candidateId);
      }
    }

    // 6. Google Calendar event (best-effort)
    if (createdBy && insertedInterview?.id) {
      try {
        await admin.functions.invoke('sync-interview-to-calendar', {
          body: { interviewId: insertedInterview.id, action: 'create' },
        });
      } catch (_) {
        // Non-critical — interview row already saved
      }
    }

    // 7. Send confirmation email to candidate
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const companyLogoUrl = (wsRow as any)?.company_logo_url ?? '';

    const formattedDate = slotDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const formattedTime = slotDate.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
    });

    const emailSubject = `Your interview is confirmed — ${jobTitle} at ${companyName}`;
    const emailContent = `<p>Hi ${sanitizeForGoogle(candidateName)},</p>
<p>Your <strong>${sanitizeForGoogle(interviewType ?? 'Interview')}</strong> interview has been booked.</p>
<table style="margin: 16px 0; border-collapse: collapse;">
  <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; font-size:13px;">Date</td><td style="font-size:13px; font-weight:600;">${sanitizeForGoogle(formattedDate)}</td></tr>
  <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; font-size:13px;">Time</td><td style="font-size:13px; font-weight:600;">${sanitizeForGoogle(formattedTime)} UTC</td></tr>
  <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; font-size:13px;">Duration</td><td style="font-size:13px; font-weight:600;">${durationMinutes ?? 30} minutes</td></tr>
  <tr><td style="padding: 4px 12px 4px 0; color:#6b7280; font-size:13px;">Type</td><td style="font-size:13px; font-weight:600;">${sanitizeForGoogle(interviewType ?? 'Interview')}</td></tr>
</table>
<p>You will receive a calendar invite shortly. If you have any questions, please reply to this email.</p>
<p style="color:#6b7280;font-size:13px;">Best regards,<br>${sanitizeForGoogle(companyName)}</p>`;

    if (resendApiKey) {
      try {
        // Log to email_logs
        await admin.from('email_logs').insert({
          user_id: createdBy,
          candidate_id: candidateId,
          to_email: email,
          subject: emailSubject,
          email_type: 'Interview Confirmation',
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: emailSubject,
            html: emailContent,
          }),
        });
      } catch (emailErr) {
        console.error('[book-scheduling-slot] Email send error:', emailErr);
      }
    }

    // 8. In-app notification for recruiter
    if (createdBy) {
      try {
        await admin.from('notifications').insert({
          user_id: createdBy,
          title: 'Interview booked',
          desc: `${name} booked a ${interviewType} on ${formattedDate} at ${formattedTime} for ${jobTitle}.`,
          type: 'interview_scheduled',
          category: 'interview',
          unread: true,
        });
      } catch (_) { /* non-critical */ }
    }

    return json({ success: true });
  } catch (e) {
    console.error('[book-scheduling-slot] Unexpected error:', e);
    return json({ error: 'Internal error' }, 500);
  }
});
