import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb, RGB } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAVY = rgb(0.12, 0.23, 0.37); // #1e3a5f
const DARK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.45, 0.45, 0.45);

function formatSalary(offer: {
  salary_amount?: number | string | null;
  salary_currency?: string | null;
  salary_period?: string | null;
}): string {
  if (offer.salary_amount == null) return 'To be discussed';
  const n = typeof offer.salary_amount === 'string' ? parseFloat(offer.salary_amount) : offer.salary_amount;
  const cur = offer.salary_currency === 'USD' ? '$' : (offer.salary_currency || '');
  const period = offer.salary_period === 'yearly' ? 'per year' : offer.salary_period === 'monthly' ? 'per month' : 'per hour';
  return `${cur}${n.toLocaleString()} ${period}`;
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
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const offerId = body?.offerId ?? body?.offer_id;
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'Missing offerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: job } = await supabase.from('jobs').select('id, title, company, location, type, remote, workspace_id').eq('id', offer.job_id).single();
    const { data: candidate } = await supabase.from('candidates').select('id, name, email').eq('id', offer.candidate_id).single();
    const workspaceId = offer.workspace_id ?? (job as { workspace_id?: string })?.workspace_id ?? null;
    const { data: workspace } = workspaceId
      ? await supabase.from('workspaces').select('id, name, company_logo_url').eq('id', workspaceId).single()
      : { data: null };
    const { data: profile } = await supabase.from('profiles').select('id, name, job_title').eq('id', offer.user_id).single();
    const { data: authUser } = await supabase.auth.admin.getUserById(offer.user_id);
    const recruiterEmailFromAuth = (authUser?.user?.email as string)?.trim() || '';

    const companyName = (job as { company?: string })?.company || (workspace as { name?: string })?.name || 'Our Company';
    const workspaceName = (workspace as { name?: string })?.name || companyName;
    const jobTitle = (job as { title?: string })?.title || offer.position_title;
    const candidateName = (candidate as { name?: string })?.name || 'Candidate';
    const salaryText = formatSalary(offer);
    const startDate = offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be determined';
    const expiresAt = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const benefits = Array.isArray(offer.benefits) && offer.benefits.length > 0
      ? offer.benefits.map((b: string) => `• ${b}`).join('\n')
      : 'None specified';
    const refNumber = offer.reference_number || null;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const recruiterName = (profile as { name?: string })?.name?.trim() || '';
    const recruiterJobTitle = (profile as { job_title?: string })?.job_title?.trim() || '';
    const recruiterEmail = recruiterEmailFromAuth;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const margin = 50;
    const contentWidth = width - 2 * margin;
    let y = height - margin;

    const drawText = (text: string, size: number, bold = false, color: RGB = DARK) => {
      const f = bold ? fontBold : font;
      const lines = String(text).split('\n');
      for (const line of lines) {
        if (y < margin + 20) break;
        page.drawText(line, { x: margin, y, size, font: f, color });
        y -= size + 4;
      }
    };

    const drawTextRight = (text: string, size: number, color: RGB = DARK) => {
      if (y < margin + 20) return;
      const tw = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: width - margin - tw, y, size, font, color });
      y -= size + 4;
    };

    const labelWidth = 140;
    const valueX = margin + labelWidth + 12;

    let logoImage: { embed: any; width: number; height: number } | null = null;
    const logoUrl = (workspace as { company_logo_url?: string })?.company_logo_url;
    if (logoUrl && !logoUrl.toLowerCase().endsWith('.svg')) {
      try {
        const imgRes = await fetch(logoUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get('content-type') || '';
          if (contentType.includes('png')) {
            const embed = await doc.embedPng(buf);
            logoImage = { embed, width: embed.width, height: embed.height };
          } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            const embed = await doc.embedJpg(buf);
            logoImage = { embed, width: embed.width, height: embed.height };
          }
        }
      } catch (_) {
        logoImage = null;
      }
    }

    const maxLogoH = 50;
    const maxLogoW = 180;
    const companyNameWidth = fontBold.widthOfTextAtSize(companyName, 14);
    const gapAfterName = 16;
    const headerStartY = y;

    page.drawText(companyName, { x: margin, y, size: 14, font: fontBold, color: DARK });
    if (logoImage) {
      let lw = logoImage.width;
      let lh = logoImage.height;
      if (lh > maxLogoH || lw > maxLogoW) {
        const scale = Math.min(maxLogoH / lh, maxLogoW / lw);
        lw *= scale;
        lh *= scale;
      }
      const logoX = margin + companyNameWidth + gapAfterName;
      page.drawImage(logoImage.embed, { x: logoX, y: y - lh, width: lw, height: lh });
      y -= Math.max(lh, 18);
    } else {
      y -= 18;
    }
    if (refNumber) {
      page.drawText(refNumber, { x: margin, y, size: 8, font, color: GREY });
      y -= 12;
    }
    y -= 8;

    page.drawRectangle({ x: margin, y: y - 10, width: contentWidth, height: 10, color: NAVY });
    y -= 24;

    drawText('Offer of Employment', 16, true);
    y -= 8;
    page.drawText(today, { x: margin, y, size: 10, font, color: GREY });
    y -= 16;
    drawText(`Dear ${candidateName},`, 11);
    y -= 16;
    drawText(
      `We are delighted to offer you the position of ${offer.position_title || jobTitle} at ${companyName}. We believe your skills and experience make you an exceptional fit for our team.`,
      10
    );
    y -= 20;

    drawText('Offer details', 11, true);
    y -= 12;
    const row = (label: string, value: string) => {
      if (y < margin + 14) return;
      page.drawText(label, { x: margin, y, size: 10, font, color: GREY });
      page.drawText(value, { x: valueX, y, size: 10, font: fontBold, color: DARK });
      y -= 14;
    };
    row('Position', offer.position_title || jobTitle);
    row('Salary', salaryText);
    row('Start date', startDate);
    if (expiresAt) row('Offer expires', expiresAt);
    y -= 8;

    drawText('Benefits', 11, true);
    y -= 8;
    drawText(benefits, 10);
    y -= 12;

    if (offer.notes) {
      drawText('Additional details', 11, true);
      y -= 8;
      drawText(offer.notes, 10);
      y -= 12;
    }

    drawText(
      'Please sign this letter to accept the offer. You will receive a copy of the signed document. If you have any questions, please contact us.',
      10
    );
    y -= 24;

    drawText('Sincerely,', 10);
    y -= 16;

    const closingLines: string[] = [];
    if (recruiterName) closingLines.push(recruiterName);
    if (recruiterJobTitle) closingLines.push(recruiterJobTitle);
    if (recruiterEmail) closingLines.push(recruiterEmail);
    closingLines.push(companyName);
    const isAgency = workspaceName !== companyName;
    if (isAgency && workspaceName) {
      closingLines.push(`On behalf of ${workspaceName}`);
    }
    for (const line of closingLines) {
      drawText(line, 10);
    }

    y -= 24;
    const footerY = Math.min(y, margin + 40);
    page.drawText(companyName, { x: margin, y: footerY, size: 9, font, color: GREY });
    page.drawText('This document was generated by CoreflowHR.', { x: margin, y: footerY - 12, size: 8, font, color: GREY });

    const pdfBytes = await doc.save();
    const pdfBase64 = encodeBase64(pdfBytes);

    return new Response(
      JSON.stringify({ pdfBase64 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('generate-offer-pdf error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
