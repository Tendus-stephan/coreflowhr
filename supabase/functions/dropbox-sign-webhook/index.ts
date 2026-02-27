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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const eventType = body?.event?.event_type;
    const signatureRequest = body?.signature_request;
    const requestId = signatureRequest?.signature_request_id;

    // Dropbox Sign "Test" sends a minimal payload; return their expected string so the test passes.
    if (!requestId) {
      return new Response('Hello API Event Received', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (eventType !== 'signature_request_all_signed') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = signatureRequest?.metadata ?? {};
    const offerId = metadata?.offer_id ?? metadata?.offerId;
    if (!offerId) {
      console.error('Webhook: no offer_id in metadata', metadata);
      return new Response(JSON.stringify({ error: 'Missing offer_id in metadata' }), {
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

    const apiKeyB64 = btoa(`${dropboxSignApiKey}:`);
    const fileRes = await fetch(
      `https://api.hellosign.com/v3/signature_request/files/${requestId}?file_type=pdf`,
      { headers: { Authorization: `Basic ${apiKeyB64}` } }
    );

    if (fileRes.status === 409) {
      return new Response(JSON.stringify({ received: true, message: 'Files not ready yet' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      console.error('Dropbox Sign files download failed', fileRes.status, errText);
      return new Response(JSON.stringify({ error: 'Failed to download signed file' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfBytes = new Uint8Array(await fileRes.arrayBuffer());
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const storagePath = `${offerId}/signed.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('signed-offers')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('Storage upload failed', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to store signed PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'signed',
        signed_pdf_path: storagePath,
        responded_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('esignature_request_id', requestId);

    if (updateError) {
      console.error('Offer update failed', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update offer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true, offerId, path: storagePath }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('dropbox-sign-webhook error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
