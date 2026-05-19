import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    // Dropbox Sign sends webhooks as multipart/form-data with JSON in a field named "json"
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const jsonField = formData.get('json');
      if (typeof jsonField === 'string') {
        try {
          body = JSON.parse(jsonField) as Record<string, unknown>;
        } catch (_) {
          console.error('Webhook: failed to parse json field');
        }
      }
    } else {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }
    const eventType = (body?.event as { event_type?: string } | undefined)?.event_type;
    const signatureRequest = body?.signature_request as { signature_request_id?: string; metadata?: Record<string, string> } | undefined;
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

    // Update offer and return candidate_id + workspace_id for stage transition
    const { data: updated, error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'signed',
        signed_pdf_path: storagePath,
        responded_at: new Date().toISOString(),
      })
      .eq('id', String(offerId))
      .select('id, candidate_id, workspace_id')
      .maybeSingle();

    if (updateError) {
      console.error('Offer update failed', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update offer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!updated) {
      console.error('Webhook: no offer found for id', offerId);
      return new Response(JSON.stringify({ error: 'Offer not found for id' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidateId = (updated as any).candidate_id;
    const workspaceId = (updated as any).workspace_id;

    // Always move candidate to Hired on signing — no email workflow prerequisite
    if (candidateId) {
      const { error: stageError } = await supabase
        .from('candidates')
        .update({ stage: 'Hired' })
        .eq('id', candidateId)
        .neq('stage', 'Hired');

      if (stageError) {
        console.error('Failed to move candidate to Hired', stageError);
      } else {
        console.log('Candidate', candidateId, 'moved to Hired after offer signed');
      }
    }

    // Send confirmation email to candidate
    if (candidateId) {
      try {
        // Fetch offer details for the email
        const { data: offerRow } = await supabase
          .from('offers')
          .select('position_title, job_id, user_id')
          .eq('id', String(offerId))
          .single();

        const { data: candidateRow } = await supabase
          .from('candidates')
          .select('name, email')
          .eq('id', candidateId)
          .single();

        if (candidateRow?.email && offerRow) {
          // Resolve company name: client → job.company → workspace
          let companyName = 'Our Company';
          if (offerRow.job_id) {
            const { data: jobRow } = await supabase
              .from('jobs')
              .select('title, company, client_id')
              .eq('id', offerRow.job_id)
              .single();
            if (jobRow?.client_id) {
              const { data: clientRow } = await supabase
                .from('clients')
                .select('name')
                .eq('id', jobRow.client_id)
                .single();
              companyName = clientRow?.name || jobRow?.company || companyName;
            } else {
              companyName = jobRow?.company || companyName;
            }
          }

          // Recruiter name
          let recruiterName = 'The team';
          if (offerRow.user_id) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', offerRow.user_id)
              .single();
            recruiterName = profileRow?.name || recruiterName;
          }

          const positionTitle = offerRow.position_title || 'the position';
          const candidateName = (candidateRow as { name?: string }).name || 'there';

          await supabase.functions.invoke('send-email', {
            body: {
              to: candidateRow.email,
              subject: `Your offer letter is signed — ${positionTitle} at ${companyName}`,
              content: `Dear ${candidateName},\n\nCongratulations! Your signed offer letter for the ${positionTitle} position at ${companyName} has been received and recorded.\n\nWe look forward to welcoming you to the team. ${recruiterName} will be in touch shortly with your onboarding details.\n\nBest regards,\n${recruiterName}\n${companyName}`,
              fromName: recruiterName,
              candidateId,
              userId: offerRow?.user_id || null,
              emailType: 'Offer Signed',
            },
          });
          console.log('Signed confirmation email sent to', candidateRow.email);
        }
      } catch (emailErr) {
        // Non-fatal — signing is already recorded
        console.error('Failed to send signed confirmation email (non-fatal):', emailErr);
      }
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
