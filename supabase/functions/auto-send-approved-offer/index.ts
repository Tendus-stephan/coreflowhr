/**
 * auto-send-approved-offer
 *
 * Called server-side (no user session required) after all approvers have approved
 * an offer. Uses service role to:
 *   1. Verify the approval token is valid and the offer is actually approved.
 *   2. Fetch offer + candidate + job details.
 *   3. Generate an offer response token and flip status → awaiting_response.
 *   4. Send the offer email to the candidate via the send-email function.
 *   5. Move the candidate to the Offer stage.
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

  try {
    const { offerId, token } = await req.json();

    if (!offerId || !token) {
      return new Response(
        JSON.stringify({ error: 'offerId and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Verify the approval token is valid and approved for this offer
    const { data: approvalReq, error: reqErr } = await supabase
      .from('offer_approval_requests')
      .select('id, offer_id, status, approval_token_expires_at')
      .eq('approval_token', token)
      .eq('offer_id', offerId)
      .single();

    if (reqErr || !approvalReq) {
      console.error('[AutoSend] Approval request not found:', reqErr);
      return new Response(
        JSON.stringify({ error: 'Invalid approval token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (approvalReq.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Offer is not fully approved yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch the offer
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerErr || !offer) {
      console.error('[AutoSend] Offer not found:', offerErr);
      return new Response(
        JSON.stringify({ error: 'Offer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!offer.candidate_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot send a general offer — no candidate linked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If offer already sent, skip (idempotent)
    if (offer.status === 'awaiting_response' || offer.status === 'sent') {
      console.log('[AutoSend] Offer already sent, skipping:', offerId);
      return new Response(
        JSON.stringify({ success: true, alreadySent: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch candidate
    const { data: candidate, error: candErr } = await supabase
      .from('candidates')
      .select('id, name, email, stage')
      .eq('id', offer.candidate_id)
      .single();

    if (candErr || !candidate?.email) {
      console.error('[AutoSend] Candidate not found or no email:', candErr);
      return new Response(
        JSON.stringify({ error: 'Candidate not found or missing email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch job for company name
    const { data: job } = await supabase
      .from('jobs')
      .select('title, company')
      .eq('id', offer.job_id)
      .single();
    const companyName = (job as any)?.company || 'Our Company';

    // 5. Generate offer response token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const offerToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);

    // 6. Flip offer status → awaiting_response
    const { error: updateErr } = await supabase
      .from('offers')
      .update({
        status: 'awaiting_response',
        sent_at: new Date().toISOString(),
        offer_token: offerToken,
        offer_token_expires_at: tokenExpiresAt.toISOString(),
        require_esignature: true,
      })
      .eq('id', offerId);

    if (updateErr) {
      console.error('[AutoSend] Failed to update offer status:', updateErr);
      return new Response(
        JSON.stringify({ error: 'Failed to update offer status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Build email content
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.coreflowhr.com';
    const offerResponseUrl = `${frontendUrl}/offers/respond/${offerToken}`;

    const currencySymbol = offer.salary_currency === 'USD' ? '$'
      : offer.salary_currency === 'EUR' ? '€'
      : offer.salary_currency === 'GBP' ? '£'
      : (offer.salary_currency || '');
    const salaryNum = offer.salary_amount ? Number(offer.salary_amount).toLocaleString() : '';
    const periodLabel = offer.salary_period === 'yearly' ? 'per year'
      : offer.salary_period === 'monthly' ? 'per month'
      : 'per hour';
    const salaryText = offer.salary_amount ? `${currencySymbol}${salaryNum} ${periodLabel}` : 'To be discussed';
    const startDateText = offer.start_date
      ? new Date(offer.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'To be determined';
    const expiryRow = offer.expires_at
      ? `<tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Offer Expires</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${new Date(offer.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>`
      : '';
    const benefits: string[] = Array.isArray(offer.benefits) ? offer.benefits : [];
    const benefitsHtml = benefits.length > 0
      ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:#374151;">${benefits.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
      : '<p style="color:#6b7280;margin:4px 0;">Standard benefits package</p>';

    const emailContent = `
<p>Dear ${candidate.name},</p>
<p>We are pleased to extend an offer of employment for the position of <strong>${offer.position_title}</strong> at <strong>${companyName}</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
  <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;width:40%;">Position</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${offer.position_title}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Salary</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${salaryText}</td></tr>
  <tr><td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Start Date</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${startDateText}</td></tr>
  ${expiryRow}
</table>
<p><strong>Benefits &amp; Perks:</strong></p>${benefitsHtml}
${offer.notes ? `<p><strong>Additional Information:</strong><br>${offer.notes}</p>` : ''}
<p>Please review the full offer details and let us know your decision using the button below.</p>
<p style="text-align:center;margin:32px 0;">
  <a href="${offerResponseUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Review &amp; Respond to Offer</a>
</p>
<p style="font-size:12px;color:#6b7280;">Or copy this link into your browser: ${offerResponseUrl}</p>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best regards,<br><strong>${companyName}</strong></p>`;

    // 8. Send the email via send-email function (internal call)
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const emailRes = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        to: candidate.email,
        subject: `Your Offer — ${offer.position_title} at ${companyName}`,
        content: emailContent,
        fromName: companyName,
        candidateId: candidate.id,
        emailType: 'Offer',
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[AutoSend] send-email failed:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send offer email', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Move candidate to Offer stage (non-fatal)
    if (candidate.stage !== 'Offer') {
      const { error: stageErr } = await supabase
        .from('candidates')
        .update({ stage: 'Offer' })
        .eq('id', candidate.id);
      if (stageErr) console.warn('[AutoSend] Stage update failed (non-fatal):', stageErr);
    }

    console.log('[AutoSend] ✅ Offer auto-sent successfully:', offerId, '→', candidate.email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[AutoSend] Fatal error:', err.message || err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
