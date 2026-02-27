import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { decodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts';
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
    if (!supabaseServiceKey || !dropboxSignApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing secrets' }),
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
      .select('id, job_id, candidate_id, position_title, require_esignature')
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

    const fnUrl = `${supabaseUrl}/functions/v1/generate-offer-pdf`;
    const pdfRes = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ offerId }),
    });
    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      console.error('generate-offer-pdf failed', pdfRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate PDF', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { pdfBase64 } = await pdfRes.json();
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF returned' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = decodeBase64(pdfBase64);
    const tempPath = `temp/${offerId}/offer.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('signed-offers')
      .upload(tempPath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('Storage upload failed', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: signedUrlData } = await supabase.storage
      .from('signed-offers')
      .createSignedUrl(tempPath, 3600);
    const fileUrl = signedUrlData?.signedUrl;
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signers = [{ name: (candidate as { name?: string }).name || 'Candidate', email_address: (candidate as { email: string }).email, order: 0 }];
    const apiKeyB64 = btoa(`${dropboxSignApiKey}:`);
    const dsRes = await fetch('https://api.hellosign.com/v3/signature_request/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKeyB64}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_urls: [fileUrl],
        signers,
        title: `Offer Letter - ${(offer as { position_title?: string }).position_title || 'Offer'}`,
        subject: 'Sign your offer letter',
        message: 'Please sign the attached offer letter. You will receive a copy once signed.',
        metadata: { offer_id: offerId },
      }),
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      console.error('Dropbox Sign API error', dsRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send signature request', details: errText }),
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
    console.error('send-offer-with-esignature error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
