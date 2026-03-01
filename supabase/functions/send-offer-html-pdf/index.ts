import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OFFER_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Job Offer Letter</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --brand:       #0f4c75;
    --brand-light: #1b6ca8;
    --accent-soft: #e8f1fb;
    --accent-border:#c3d9f5;
    --text:        #111827;
    --muted:       #6b7280;
    --border:      #e5e7eb;
    --border-dark: #d1d5db;
    --bg:          #f3f4f6;
    --card-bg:     #f9fafb;
    --white:       #ffffff;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text);
  }

  .page {
    width: 100%;
    max-width: 720px;
    background: var(--white);
    border-radius: 4px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04);
    overflow: hidden;
  }

  .header {
    background: var(--brand);
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid var(--brand-light);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .company-logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
    flex-shrink: 0;
    overflow: hidden;
  }

  .company-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 6px;
  }

  .company-info h1 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
  }

  .company-info p {
    font-size: 11px;
    color: rgba(255,255,255,0.55);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 3px;
  }

  .header-right { text-align: right; }

  .header-date {
    font-size: 13px;
    color: rgba(255,255,255,0.8);
  }

  .header-ref {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    letter-spacing: 1px;
    margin-top: 5px;
    font-weight: 500;
  }

  .body { padding: 44px 40px 36px; }

  .greeting {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 400;
    color: var(--text);
    margin-bottom: 16px;
  }

  .intro {
    font-size: 14.5px;
    line-height: 1.8;
    color: #374151;
    margin-bottom: 32px;
  }

  .offer-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-left: 4px solid var(--brand);
    border-radius: 6px;
    padding: 28px 32px;
    margin-bottom: 32px;
  }

  .offer-card-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--brand);
    margin-bottom: 24px;
  }

  .offer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px 32px;
    margin-bottom: 24px;
  }

  .offer-field label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 5px;
  }

  .offer-field .value {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .offer-field .value.highlight {
    color: var(--brand);
    font-size: 16px;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 20px 0;
  }

  .benefits-section label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .benefits-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
  }

  .benefits-list li {
    background: var(--accent-soft);
    border: 1px solid var(--accent-border);
    border-radius: 20px;
    padding: 5px 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--brand);
  }

  .closing-text {
    font-size: 14px;
    line-height: 1.8;
    color: #374151;
    margin-bottom: 32px;
  }

  .signature-block {
    border-top: 1px solid var(--border);
    padding-top: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .recruiter-info p {
    font-size: 13px;
    line-height: 1.75;
    color: var(--muted);
  }

  .recruiter-info .recruiter-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin-top: 6px;
    margin-bottom: 2px;
  }

  .recruiter-info .recruiter-email {
    color: var(--brand-light);
    font-weight: 500;
  }

  .on-behalf {
    font-size: 11px;
    color: var(--muted);
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .seal {
    width: 64px;
    height: 64px;
    border: 2px solid var(--border-dark);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    opacity: 0.3;
  }

  .seal-inner {
    font-size: 8px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text);
    text-align: center;
    line-height: 1.6;
    font-weight: 600;
  }

  .footer {
    background: var(--brand);
    padding: 14px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 3px solid var(--brand-light);
  }

  .footer-left {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
  }

  .footer-right {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
  }

  .footer-brand {
    color: rgba(255,255,255,0.75);
    font-weight: 600;
  }
</style>
</head>
<body>

<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="company-logo">
        {{company_logo_inner}}
      </div>
      <div class="company-info">
        <h1>{{company_name}}</h1>
        <p>Job Offer Letter</p>
      </div>
    </div>
    <div class="header-right">
      <div class="header-date">{{offer_date}}</div>
      <div class="header-ref">{{reference_number}}</div>
    </div>
  </div>

  <div class="body">

    <p class="greeting">Dear {{candidate_name}},</p>

    <p class="intro">
      We are delighted to offer you the position of <strong>{{position_title}}</strong> at {{company_name}}.
      We believe your skills and experience make you an exceptional fit for our team and we look forward to you joining us.
    </p>

    <div class="offer-card">
      <p class="offer-card-title">Offer Details</p>

      <div class="offer-grid">
        <div class="offer-field">
          <label>Position</label>
          <span class="value">{{position_title}}</span>
        </div>
        <div class="offer-field">
          <label>Salary</label>
          <span class="value highlight">{{salary_amount}} {{salary_currency}} {{salary_period}}</span>
        </div>
        <div class="offer-field">
          <label>Start Date</label>
          <span class="value">{{start_date}}</span>
        </div>
        <div class="offer-field">
          <label>Offer Expires</label>
          <span class="value">{{offer_expiry_date}}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="benefits-section">
        <label>Benefits &amp; Perks</label>
        <ul class="benefits-list">
          {{benefits_list}}
        </ul>
      </div>
    </div>

    <p class="closing-text">
      Please review the terms of this offer carefully. This offer is contingent upon the successful
      completion of any background checks as required. If you have any questions or would like to
      discuss any aspect of this offer, please do not hesitate to reach out directly.
    </p>

    <div class="signature-block">
      <div class="recruiter-info">
        <p>Best regards,</p>
        <p class="recruiter-name">{{recruiter_name}}</p>
        <p>{{recruiter_title}}</p>
        <p class="recruiter-email">{{recruiter_email}}</p>
        <p class="on-behalf">On behalf of {{company_name}}</p>
      </div>
      <div class="seal">
        <div class="seal-inner">OFFICIAL<br>OFFER</div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span class="footer-left">{{company_name}} · Confidential Employment Offer</span>
    <span class="footer-right">Generated by <span class="footer-brand">CoreflowHR</span></span>
  </div>

</div>

</body>
</html>`;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSalaryAmount(amount: number | string | null | undefined): string {
  if (amount == null) return 'To be discussed';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return 'To be discussed';
  return n.toLocaleString();
}

function formatSalaryPeriod(period: string | null | undefined): string {
  if (!period) return '';
  const p = String(period).toLowerCase();
  if (p === 'yearly') return 'per year';
  if (p === 'monthly') return 'per month';
  if (p === 'hourly') return 'per hour';
  return period;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(d);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const dropboxSignApiKey = Deno.env.get('DROPBOX_SIGN_API_KEY');
    const pdfshiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');

    if (!supabaseServiceKey || !dropboxSignApiKey || !pdfshiftApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: missing SUPABASE_SERVICE_ROLE_KEY, DROPBOX_SIGN_API_KEY, or PDFSHIFT_API_KEY',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const offerId = body?.offerId ?? body?.offer_id;
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'Missing offerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ error: 'Offer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!offer.candidate_id) {
      return new Response(
        JSON.stringify({ error: 'Offer must be linked to a candidate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: candidate, error: candError } = await supabase
      .from('candidates')
      .select('id, name, email')
      .eq('id', offer.candidate_id)
      .single();

    if (candError || !candidate?.email) {
      return new Response(
        JSON.stringify({ error: 'Candidate not found or missing email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, workspace_id')
      .eq('id', offer.job_id)
      .single();

    const workspaceId = offer.workspace_id ?? (job as { workspace_id?: string })?.workspace_id ?? null;
    const { data: workspace } = workspaceId
      ? await supabase.from('workspaces').select('id, name, company_logo_url').eq('id', workspaceId).single()
      : { data: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, job_title')
      .eq('id', offer.user_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(offer.user_id);
    const recruiterEmail = (authUser?.user?.email as string)?.trim() || '';

    const companyName =
      (job as { company?: string })?.company || (workspace as { name?: string })?.name || 'Our Company';
    const positionTitle =
      (job as { title?: string })?.title || offer.position_title || 'Position';
    const candidateName = (candidate as { name?: string })?.name || 'Candidate';

    const isUsd = (offer.salary_currency || '').toString().toUpperCase() === 'USD';
    const salaryAmount = isUsd
      ? '$' + formatSalaryAmount(offer.salary_amount)
      : formatSalaryAmount(offer.salary_amount);
    const salaryCurrency = isUsd ? '' : (offer.salary_currency || '');
    const salaryPeriod = formatSalaryPeriod(offer.salary_period);
    const startDate = formatDate(offer.start_date) || 'To be determined';
    const offerExpiryDate = formatDate(offer.expires_at);
    const offerDate = formatDate(new Date().toISOString());
    const referenceNumber = offer.reference_number || '';

    const benefits: string[] = Array.isArray(offer.benefits) ? offer.benefits.filter((b): b is string => typeof b === 'string') : [];
    const benefitsList = benefits.length > 0
      ? benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n          ')
      : '<li>None specified</li>';

    const recruiterName = (profile as { name?: string })?.name?.trim() || 'Recruiter';
    const recruiterTitle = (profile as { job_title?: string })?.job_title?.trim() || '';

    const logoUrl = (workspace as { company_logo_url?: string })?.company_logo_url;
    const companyLogoInner = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}">`
      : 'TC';

    const placeholders: Record<string, string> = {
      candidate_name: escapeHtml(candidateName),
      position_title: escapeHtml(positionTitle),
      company_name: escapeHtml(companyName),
      salary_amount: escapeHtml(salaryAmount),
      salary_currency: escapeHtml(salaryCurrency),
      salary_period: escapeHtml(salaryPeriod),
      start_date: escapeHtml(startDate),
      offer_expiry_date: escapeHtml(offerExpiryDate),
      offer_date: escapeHtml(offerDate),
      reference_number: escapeHtml(referenceNumber),
      benefits_list: benefitsList,
      recruiter_name: escapeHtml(recruiterName),
      recruiter_title: escapeHtml(recruiterTitle),
      recruiter_email: escapeHtml(recruiterEmail),
      company_logo_inner: companyLogoInner,
    };

    let html = OFFER_HTML_TEMPLATE;
    for (const [key, value] of Object.entries(placeholders)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    html = html.replace(/\{\{[^}]+\}\}/g, '');

    const pdfshiftRes = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': pdfshiftApiKey,
      },
      body: JSON.stringify({ source: html }),
    });

    if (!pdfshiftRes.ok) {
      const errText = await pdfshiftRes.text();
      console.error('PDFShift error', pdfshiftRes.status, errText);
      let errMsg = 'Failed to convert HTML to PDF.';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error ?? errJson?.message) errMsg = errJson?.error ?? errJson?.message;
      } catch (_) {
        if (errText && errText.length < 300) errMsg = errText;
      }
      return new Response(
        JSON.stringify({ error: errMsg, details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = new Uint8Array(await pdfshiftRes.arrayBuffer());

    const signerName = (candidate as { name?: string }).name || 'Candidate';
    const signerEmail = (candidate as { email: string }).email;

    const form = new FormData();
    form.append('files[0]', new Blob([pdfBytes], { type: 'application/pdf' }), 'offer.pdf');
    form.append('signers[0][name]', signerName);
    form.append('signers[0][email_address]', signerEmail);
    form.append('title', `Offer Letter - ${positionTitle}`);
    form.append('subject', referenceNumber ? `Sign your offer letter – ${referenceNumber}` : 'Sign your offer letter');
    form.append('message', 'Please sign the attached offer letter. You will receive a copy once signed.');
    form.append('metadata[offer_id]', String(offerId));
    form.append('test_mode', '1');

    const apiKeyB64 = btoa(`${dropboxSignApiKey}:`);
    const dsRes = await fetch('https://api.hellosign.com/v3/signature_request/send', {
      method: 'POST',
      headers: { Authorization: `Basic ${apiKeyB64}` },
      body: form,
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      console.error('Dropbox Sign API error', dsRes.status, errText);
      let errMsg = 'Failed to send signature request.';
      try {
        const errJson = JSON.parse(errText);
        const msg = errJson?.error?.error_msg ?? errJson?.error?.message ?? errJson?.message;
        if (msg) errMsg = msg;
      } catch (_) {
        if (errText && errText.length < 200) errMsg = errText;
      }
      return new Response(
        JSON.stringify({ error: errMsg, details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dsJson = await dsRes.json();
    const requestId = dsJson?.signature_request?.signature_request_id ?? dsJson?.signature_request_id;
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'No signature request ID in response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const offerToken = crypto.randomUUID?.() ?? `t${Date.now()}`;
    const tokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'awaiting_signature',
        require_esignature: true,
        esignature_request_id: requestId,
        sent_at: new Date().toISOString(),
        offer_token: offerToken,
        offer_token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', offerId);

    if (updateError) {
      console.error('Offer update failed', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update offer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, signatureRequestId: requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-offer-html-pdf error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
