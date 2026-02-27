import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { data: job } = await supabase.from('jobs').select('id, title, company, location, type, remote').eq('id', offer.job_id).single();
    const { data: candidate } = await supabase.from('candidates').select('id, name, email').eq('id', offer.candidate_id).single();

    const companyName = (job as { company?: string })?.company || 'Our Company';
    const jobTitle = (job as { title?: string })?.title || offer.position_title;
    const candidateName = (candidate as { name?: string })?.name || 'Candidate';
    const salaryText = formatSalary(offer);
    const startDate = offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be determined';
    const expiresAt = offer.expires_at ? new Date(offer.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const benefits = Array.isArray(offer.benefits) && offer.benefits.length > 0
      ? offer.benefits.map((b: string) => `• ${b}`).join('\n')
      : 'None specified';

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, size: number, bold = false) => {
      const f = bold ? fontBold : font;
      const lines = text.split('\n');
      for (const line of lines) {
        if (y < margin + 20) break;
        page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
        y -= size + 4;
      }
    };

    page.drawText('OFFER LETTER', { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 28;

    drawText(`${companyName}`, 12, true);
    y -= 8;
    drawText(`Dear ${candidateName},`, 11);
    y -= 16;
    drawText(`We are pleased to extend an offer of employment for the position of ${offer.position_title || jobTitle} at ${companyName}.`, 10);
    y -= 14;
    drawText('Offer details:', 11, true);
    y -= 10;
    drawText(`Position: ${offer.position_title || jobTitle}`, 10);
    drawText(`Salary: ${salaryText}`, 10);
    drawText(`Start date: ${startDate}`, 10);
    if (expiresAt) drawText(`This offer expires: ${expiresAt}`, 10);
    y -= 8;
    drawText('Benefits:', 10, true);
    drawText(benefits, 10);
    y -= 12;
    if (offer.notes) {
      drawText('Notes:', 10, true);
      drawText(offer.notes, 10);
      y -= 8;
    }
    drawText('Please sign this letter to accept the offer. You will receive a copy of the signed document.', 10);
    y -= 20;
    drawText(`Sincerely,\n${companyName}`, 10);

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
