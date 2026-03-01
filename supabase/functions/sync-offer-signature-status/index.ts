import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Syncs offer status from Dropbox Sign. If the signature request is complete,
 * downloads the signed PDF, stores it, and updates the offer to "signed".
 * Use this to fix offers that were signed but the webhook didn't update (e.g. before webhook fix).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const offerId = body?.offerId ?? body?.offer_id;
    if (!offerId) {
      return new Response(JSON.stringify({ error: 'Missing offerId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const dropboxSignApiKey = Deno.env.get('DROPBOX_SIGN_API_KEY');
    if (!supabaseServiceKey || !dropboxSignApiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, status, esignature_request_id')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestId = (offer as { esignature_request_id?: string }).esignature_request_id;
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Offer has no Dropbox Sign request ID', status: offer.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKeyB64 = btoa(`${dropboxSignApiKey}:`);
    const getRes = await fetch(`https://api.hellosign.com/v3/signature_request/${requestId}`, {
      headers: { Authorization: `Basic ${apiKeyB64}` },
    });

    if (!getRes.ok) {
      const errText = await getRes.text();
      console.error('Dropbox Sign get request failed', getRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to get signature request', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sr = (await getRes.json()) as { signature_request?: { is_complete?: boolean } };
    const isComplete = sr?.signature_request?.is_complete === true;

    if (!isComplete) {
      return new Response(
        JSON.stringify({ status: 'awaiting_signature', message: 'Document not yet fully signed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Already marked signed in our DB
    if ((offer as { status?: string }).status === 'signed') {
      return new Response(
        JSON.stringify({ status: 'signed', message: 'Already synced' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download signed PDF and store
    const fileRes = await fetch(
      `https://api.hellosign.com/v3/signature_request/files/${requestId}?file_type=pdf`,
      { headers: { Authorization: `Basic ${apiKeyB64}` } }
    );

    if (fileRes.status === 409) {
      return new Response(
        JSON.stringify({ status: 'awaiting_signature', message: 'Files not ready yet' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      console.error('Dropbox Sign files download failed', fileRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to download signed file' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = new Uint8Array(await fileRes.arrayBuffer());
    const storagePath = `${offerId}/signed.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('signed-offers')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('Storage upload failed', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to store signed PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'signed',
        signed_pdf_path: storagePath,
        responded_at: new Date().toISOString(),
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
      JSON.stringify({ status: 'signed', message: 'Synced from Dropbox Sign' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sync-offer-signature-status error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
