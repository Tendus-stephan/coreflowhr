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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const client = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: pending, error: pendingError } = await admin
      .from('email_change_pending')
      .select('old_email, new_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pendingError) {
      console.error('email_change_pending lookup error', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to read pending email change' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pending) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification to old email that change completed
    const subject = 'Your CoreflowHR email was changed';
    const content = `
      <p>Your CoreflowHR account email was changed.</p>
      <p><strong>Old email:</strong> ${pending.old_email}</p>
      <p><strong>New email:</strong> ${pending.new_email}</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `;

    const { error: emailError } = await admin.functions.invoke('send-email', {
      body: {
        to: pending.old_email,
        subject,
        content,
        emailType: 'EmailChangeOldNotification',
      },
    });

    if (emailError) {
      console.error('notify-old-email-after-change send-email error', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification to old email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await admin.from('email_change_pending').delete().eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('notify-old-email-after-change error', e);
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: pending, error: pendingError } = await adminClient
      .from('email_change_pending')
      .select('old_email, new_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pendingError) {
      console.error('notify-old-email-after-change: pendingError', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to read pending email change' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pending || !pending.old_email || !pending.new_email) {
      return new Response(
        JSON.stringify({ error: 'No pending email change found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only proceed if the current auth email matches the new_email we stored
    if (user.email.toLowerCase() !== pending.new_email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email change not completed yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = 'Your email was changed';
    const content = `<p>The email for your CoreflowHR account was changed.</p><p>Old email: <strong>${pending.old_email}</strong><br/>New email: <strong>${pending.new_email}</strong></p><p>If you didn't make this change, please contact support immediately.</p>`;

    const { error: sendError } = await adminClient.functions.invoke('send-email', {
      body: {
        to: pending.old_email,
        subject,
        content,
        emailType: 'EmailChangeNotifyOld',
      },
    });

    if (sendError) {
      console.error('notify-old-email-after-change: sendError', sendError);
      return new Response(
        JSON.stringify({ error: 'Failed to notify old email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await adminClient.from('email_change_pending').delete().eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('notify-old-email-after-change error', e);
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

