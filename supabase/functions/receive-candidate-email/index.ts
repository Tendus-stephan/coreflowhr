import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ResendReceivedPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    attachments?: unknown[];
    message_id?: string;
  };
};

type ResendEmailContent = {
  id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  created_at?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string | null | undefined): s is string {
  return typeof s === 'string' && UUID_REGEX.test(s.trim());
}

function parseSender(from: string | undefined): string {
  if (!from || typeof from !== 'string') return '';
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : from.trim().toLowerCase();
}

/** Optional: verify Resend webhook signature (Svix). Set RESEND_WEBHOOK_SECRET (whsec_...) to enable. */
async function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const sig = headers.get('svix-signature');
  if (!id || !timestamp || !sig) return false;
  const now = Math.floor(Date.now() / 1000);
  const t = parseInt(timestamp, 10);
  if (Number.isNaN(t) || Math.abs(now - t) > 300) return false; // 5 min tolerance
  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));
  const message = `${id}.${timestamp}.${rawBody}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
  const expected = btoa(String.fromCharCode(...sigBytes));
  const parts = sig.split(/\s+/);
  for (const p of parts) {
    const [, value] = p.split(',');
    if (value === expected) return true;
  }
  return false;
}

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
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (webhookSecret) {
      const valid = await verifyResendWebhook(rawBody, req.headers, webhookSecret);
      if (!valid) {
        console.warn('[receive-candidate-email] Webhook signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let body: ResendReceivedPayload & { record?: { email_id?: string; id?: string }; id?: string };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch (parseErr) {
      console.error('[receive-candidate-email] Invalid JSON body', String(parseErr));
      return new Response(JSON.stringify({ received: true, reason: 'invalid_json' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body || typeof body !== 'object') {
      console.warn('[receive-candidate-email] Empty or non-object body');
      return new Response(JSON.stringify({ received: true, reason: 'no_body' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const eventType = body?.type ?? (body as any)?.event?.type;
    const data = body?.data ?? (body as any)?.event?.data ?? body?.record ?? body;
    const emailId = data?.email_id ?? data?.id ?? (body as any)?.record?.email_id ?? (body as any)?.record?.id;

    console.log('[receive-candidate-email] Webhook received', {
      type: body?.type,
      eventType,
      hasData: !!data,
      emailId: emailId ?? 'none',
      from: data?.from ?? 'unknown',
      dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 20) : [],
    });

    if (eventType !== 'email.received' && body?.type !== 'email.received') {
      return new Response(JSON.stringify({ received: true, reason: 'not_email_received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!emailId) {
      console.warn('[receive-candidate-email] Missing data.email_id in payload');
      return new Response(JSON.stringify({ received: true, reason: 'no_email_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!resendApiKey || !supabaseServiceKey) {
      console.error('[receive-candidate-email] Missing RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fetchReceivedEmail = () =>
      fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });

    let res = await fetchReceivedEmail();
    let resText = await res.text();
    // Retry once after 1.5s if 404/503 (email may not be available yet)
    if (!res.ok && (res.status === 404 || res.status === 503)) {
      console.warn('[receive-candidate-email] Resend returned', res.status, 'retrying in 1.5s');
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetchReceivedEmail();
      resText = await res.text();
    }
    if (!res.ok) {
      console.error('[receive-candidate-email] Resend get email failed', {
        status: res.status,
        emailId,
        body: resText.slice(0, 500),
        hint: res.status === 401 ? 'Check RESEND_API_KEY is set in Edge Function secrets' : res.status === 404 ? 'Email ID may be invalid or from a different Resend resource' : undefined,
      });
      const status = res.status >= 500 ? 502 : 200;
      return new Response(
        JSON.stringify(status === 200 ? { received: true, skipped: 'resend_fetch_failed', status: res.status } : { error: 'Failed to fetch email content' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    let emailContent: ResendEmailContent;
    try {
      emailContent = JSON.parse(resText) as ResendEmailContent;
    } catch {
      console.error('[receive-candidate-email] Resend response not JSON', resText.slice(0, 300));
      return new Response(JSON.stringify({ received: true, skipped: 'invalid_response' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const fromRaw = data?.from ?? emailContent?.from ?? '';
    const senderEmail = parseSender(typeof fromRaw === 'string' ? fromRaw : '');
    const subject = data?.subject ?? emailContent?.subject ?? '';
    const headers = emailContent?.headers ?? {};
    const autoSubmitted = (headers['auto-submitted'] ?? headers['Auto-Submitted'] ?? '').toLowerCase();
    const xAutoResponse = (headers['x-auto-response-suppress'] ?? headers['X-Auto-Response-Suppress'] ?? '').toLowerCase();
    if (autoSubmitted === 'auto-reply' || xAutoResponse === 'all' || xAutoResponse === 'oof') {
      return new Response(JSON.stringify({ received: true, skipped: 'auto-reply' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bodyText = emailContent?.text ?? emailContent?.html ?? '';
    const isBounce =
      /^(delivery failure|mail delivery failed|undeliverable|returned mail|failure notice)/i.test(subject) ||
      /(delivery has failed|undeliverable|mail system)/i.test(String(bodyText));
    if (isBounce) {
      const inReplyTo = headers['in-reply-to'] ?? headers['In-Reply-To'] ?? '';
      const refs = headers['references'] ?? headers['References'] ?? '';
      const msgId = (inReplyTo || refs.split(/\s+/)[0] || '').replace(/^<|>$/g, '');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      if (msgId) {
        const threadMatch = msgId.match(/^([a-f0-9-]+)@/i);
        const threadIdFromMsg = threadMatch ? threadMatch[1] : null;
        if (threadIdFromMsg) {
          const { data: outbound } = await supabase
            .from('email_logs')
            .select('id')
            .eq('thread_id', threadIdFromMsg)
            .eq('direction', 'outbound')
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();
          if (outbound) {
            await supabase.from('email_logs').update({ status: 'bounced' }).eq('id', outbound.id);
          }
        }
      }
      return new Response(JSON.stringify({ received: true, skipped: 'bounce' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const xThreadId = (headers['x-thread-id'] ?? headers['X-Thread-ID'] ?? '').trim();
    const inReplyTo = (headers['in-reply-to'] ?? headers['In-Reply-To'] ?? '').trim();
    const refs = (headers['references'] ?? headers['References'] ?? '').trim();
    let threadIdFromHeader = xThreadId;
    if (!threadIdFromHeader && inReplyTo) {
      const m = inReplyTo.match(/^<([^@]+)@/);
      if (m) threadIdFromHeader = m[1];
    }
    if (!threadIdFromHeader && refs) {
      const firstRef = refs.split(/\s+/)[0]?.replace(/^<|>$/g, '') ?? '';
      const m = firstRef.match(/^([^@]+)@/);
      if (m) threadIdFromHeader = m[1];
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let candidateId: string | null = null;
    let userId: string | null = null;
    let replyToId: string | null = null;
    let threadId: string | null = threadIdFromHeader || null;

    if (threadIdFromHeader) {
      const { data: outbound } = await supabase
        .from('email_logs')
        .select('id, candidate_id, user_id, thread_id')
        .eq('thread_id', threadIdFromHeader)
        .eq('direction', 'outbound')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();
      if (outbound) {
        candidateId = outbound.candidate_id;
        userId = outbound.user_id;
        replyToId = outbound.id;
        threadId = outbound.thread_id ?? threadId;
      }
    }
    if (!candidateId && senderEmail) {
      const { data: cand } = await supabase
        .from('candidates')
        .select('id, user_id')
        .ilike('email', senderEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (cand) {
        candidateId = cand.id;
        userId = cand.user_id;
        const { data: lastOut } = await supabase
          .from('email_logs')
          .select('id, thread_id')
          .eq('candidate_id', cand.id)
          .eq('direction', 'outbound')
          .order('sent_at', { ascending: false })
          .limit(1)
          .single();
        if (lastOut) {
          replyToId = lastOut.id;
          threadId = lastOut.thread_id ?? threadId;
        }
      }
    }

    if (!candidateId || !userId) {
      console.warn('[receive-candidate-email] Reply not matched to a candidate', {
        senderEmail,
        threadIdFromHeader: threadIdFromHeader || 'none',
        inReplyTo: inReplyTo || 'none',
        hint: 'Ensure Reply-To is set and the original email had X-Thread-ID/Message-ID; sender must be a candidate email.',
      });
      return new Response(JSON.stringify({ received: true, unmatched: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentHtml = emailContent?.html ?? '';
    const contentToStore = contentHtml || String(bodyText);
    const sentAt = emailContent?.created_at ?? data?.created_at ?? body?.created_at ?? new Date().toISOString();

    // Only pass UUID-typed columns if they are valid UUIDs (headers can contain base64 or other formats)
    const safeThreadId = isValidUuid(threadId) ? threadId : null;
    const safeReplyToId = isValidUuid(replyToId) ? replyToId : null;
    if (threadId && !safeThreadId) {
      console.warn('[receive-candidate-email] thread_id from headers is not a valid UUID, storing as null', { threadId: threadId.slice(0, 50) });
    }

    console.log('[receive-candidate-email] Matched reply', { candidateId, userId, threadId: safeThreadId, from: senderEmail });

    const { error: insertError } = await supabase.from('email_logs').insert({
      candidate_id: candidateId,
      user_id: userId,
      to_email: Array.isArray(data?.to) ? data.to[0] : (data?.to as string) ?? '',
      from_email: senderEmail,
      subject,
      content: contentToStore,
      email_type: 'Custom',
      status: 'delivered',
      direction: 'inbound',
      read: false,
      thread_id: safeThreadId,
      reply_to_id: safeReplyToId,
      sent_at: sentAt,
    });

    if (insertError) {
      console.error('[receive-candidate-email] Insert failed', insertError.message, insertError.details);
      return new Response(JSON.stringify({ error: 'Failed to store reply', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[receive-candidate-email] Inbound reply stored', { candidateId, emailLogId: 'inserted' });

    const { data: candidate } = await supabase
      .from('candidates')
      .select('name')
      .eq('id', candidateId)
      .single();
    const candidateName = candidate?.name ?? 'Candidate';
    const desc = `${candidateName} replied to your email. [candidateId:${candidateId}]`;
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Candidate replied',
      desc,
      type: 'candidate_replied',
      category: 'communication',
      unread: true,
    });

    // Slack notification
    const { data: membership } = await supabase
      .from('workspace_members').select('workspaces(slack_webhook_url)').eq('user_id', userId).maybeSingle();
    const slackWebhook = (membership as any)?.workspaces?.slack_webhook_url;
    if (slackWebhook) {
      const slackBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: `💬 *${candidateName}* replied to your email` } },
        { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Conversation', emoji: true }, url: `https://www.coreflowhr.com/candidates?candidateId=${candidateId}&tab=email` }] },
      ];
      await supabase.functions.invoke('notify-slack', {
        body: { webhookUrl: slackWebhook, text: `${candidateName} replied to your email`, blocks: slackBlocks },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ received: true, candidateId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[receive-candidate-email] Error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
