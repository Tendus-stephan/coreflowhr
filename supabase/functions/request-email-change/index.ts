import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const b64 = btoa(String.fromCharCode(...str));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${message}.${sigB64}`;
}

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

    const body = await req.json().catch(() => ({}));
    const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'Valid new email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (user.email.toLowerCase() === newEmail) {
      return new Response(
        JSON.stringify({ error: 'This is already your current email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secret = Deno.env.get('EMAIL_CHANGE_SECRET');
    if (!secret) {
      console.error('EMAIL_CHANGE_SECRET not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h
    const token = await signJwt(
      { sub: user.id, newEmail, exp },
      secret
    );

    const siteUrl = Deno.env.get('SITE_URL') || 'https://coreflowhr.com';
    const base = siteUrl.replace(/\/$/, '');
    const confirmUrl = `${base}/change-email?step=confirm_current&token=${encodeURIComponent(token)}`;

    const subject = 'Confirm your email change';
    const content = `
      <p>You requested to change your CoreflowHR sign-in email to <strong>${newEmail}</strong>.</p>
      <p><a href="${confirmUrl}" style="display:inline-block; padding:10px 20px; background:#111; color:#fff; text-decoration:none; border-radius:8px;">Confirm and send link to new email</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>This link expires in 24 hours.</p>
    `;

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error: invokeError } = await serviceClient.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject,
        content,
        emailType: 'EmailChangeConfirmCurrent',
      },
    });

    if (invokeError) {
      console.error('send-email invoke error', invokeError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('request-email-change error', e);
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
