/**
 * Sends an offer/counter-offer update email to the recruiter (offer owner).
 * Called from the client after in-app notification is created.
 * Uses service role to look up recruiter email and offer_updates preference.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OfferUpdateEvent = 'offer_accepted' | 'offer_declined' | 'counter_offer_received';

interface OfferUpdatePayload {
  userId: string;
  event: OfferUpdateEvent;
  candidateName?: string;
  positionTitle?: string;
  response?: string;
  counterOfferDetails?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as OfferUpdatePayload;
    const { userId, event, candidateName, positionTitle, response, counterOfferDetails } = body;

    if (!userId || !event) {
      return new Response(
        JSON.stringify({ error: 'userId and event are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user?.email) {
      console.warn('[send-offer-update-email] No email for user', userId, userError?.message);
      return new Response(JSON.stringify({ sent: false, reason: 'no_email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('offer_updates')
      .eq('user_id', userId)
      .single();

    if (settings?.offer_updates === false) {
      return new Response(JSON.stringify({ sent: false, reason: 'offer_updates_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidate = candidateName || 'Candidate';
    const position = positionTitle || 'the position';
    let subject: string;
    let content: string;

    switch (event) {
      case 'offer_accepted':
        subject = `Offer accepted: ${candidate} – ${position}`;
        content = `${candidate} has accepted the offer for ${position}.`;
        if (response) content += `\n\nTheir response: ${response}`;
        break;
      case 'offer_declined':
        subject = `Offer declined: ${candidate} – ${position}`;
        content = `${candidate} has declined the offer for ${position}.`;
        if (response) content += `\n\nTheir response: ${response}`;
        break;
      case 'counter_offer_received':
        subject = `Counter offer received: ${candidate} – ${position}`;
        content = `${candidate} has submitted a counter offer for ${position}.`;
        if (counterOfferDetails) content += `\n\nDetails: ${counterOfferDetails}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown event' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    content += '\n\nView the offer in Coreflow to respond.';

    const invokeUrl = `${supabaseUrl}/functions/v1/send-email`;
    const invokeRes = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        subject,
        content,
        emailType: 'OfferUpdate',
      }),
    });

    if (!invokeRes.ok) {
      const errText = await invokeRes.text();
      console.error('[send-offer-update-email] send-email invoke failed', invokeRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-offer-update-email]', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
