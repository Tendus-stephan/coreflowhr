import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Get allowed origins from environment (comma-separated)
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  // Default to common production origins (should be overridden in production via ALLOWED_ORIGINS env var)
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3002', // Development port
    'https://coreflowhr.com', // Production domain
    'https://www.coreflowhr.com', // Production domain with www
    // Note: Add your Vercel preview/production URLs via ALLOWED_ORIGINS environment variable in Supabase
  ];
};

const allowedOrigins = getAllowedOrigins();

const getCorsHeaders = (origin: string | null) => {
  // Check if origin is in allowed list
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  // For development, also allow localhost with any port
  const isLocalhost = origin && origin.startsWith('http://localhost:');
  
  // Allow Vercel preview URLs (vercel.app domains) - includes all Vercel deployments
  const isVercelPreview = origin && (
    origin.includes('.vercel.app') || 
    origin.includes('vercel.app')
  );
  
  const allowOrigin = (isAllowed || isLocalhost || isVercelPreview) ? (origin || '*') : '';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Helper function to escape HTML entities
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Basic HTML sanitizer (fallback if external module unavailable)
function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data URIs
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized;
}

// Professional email template: compact layout, no excess whitespace, table-based for client compatibility
function createEmailTemplate(content: string, logoUrl: string, companyName: string, companyWebsite: string, recipientEmail?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <style type="text/css">
    .content-body p { margin: 0 0 12px 0; }
    .content-body p:last-child { margin-bottom: 0; }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="padding: 20px 24px 14px 24px;">
              <img src="${logoUrl}" alt="${companyName}" width="160" style="display: block; max-width: 160px; height: auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <div class="content-body" style="color: #1f2937; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                ${content}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 20px 28px;">
              <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.4; text-align: center;">
                  <span style="color: #6b7280;">Sent via CoreflowHR</span>
                  <span style="color: #d1d5db; margin: 0 6px;">|</span>
                  <a href="${companyWebsite}/unsubscribe${recipientEmail ? `?email=${encodeURIComponent(recipientEmail)}` : ''}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting: Check request rate before processing
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // For offer token endpoints, use stricter rate limiting
    const isOfferEndpoint = req.url.includes('offer') || req.url.includes('token');
    const maxRequests = isOfferEndpoint ? 5 : 20; // 5 per hour for offers, 20 for general
    const windowMinutes = 60;

    // Check rate limit using Supabase RPC
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: rateLimitResult, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          endpoint_param: 'send-email',
          identifier_param: clientIp,
          max_requests_param: maxRequests,
          window_minutes_param: windowMinutes
        });

      if (!rateLimitError && rateLimitResult && !rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            message: rateLimitResult.message,
            reset_at: rateLimitResult.reset_at
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': '3600' // 1 hour in seconds
            } 
          },
        );
      }
    }
  } catch (rateLimitCheckError) {
    // If rate limiting check fails, log but don't block (fail open)
    console.warn('Rate limit check failed:', rateLimitCheckError);
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
    const fromDefaultName = Deno.env.get('FROM_NAME') || 'Coreflow';
    const forceToEmail = Deno.env.get('RESEND_FORCE_TO') || null;
    const replyToEmail = Deno.env.get('REPLY_TO_EMAIL') || null; // e.g. replies@coreflowhr.com for two-way email

    console.log('[Email Send] Starting email send process', {
      timestamp: new Date().toISOString(),
      hasApiKey: !!resendApiKey,
      fromEmail,
      fromName: fromDefaultName,
      forceToEmail: forceToEmail || 'none (production mode)'
    });

    if (!resendApiKey) {
      console.error('[Email Send] RESEND_API_KEY is not set in environment');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { to, subject, content, fromName, candidateId, emailType, threadId: requestedThreadId, replyToId } = await req.json();
    
    // Thread ID for threading replies: use provided, or reuse candidate's existing thread, or generate new
    let threadId: string = requestedThreadId && typeof requestedThreadId === 'string' ? requestedThreadId : crypto.randomUUID();
    if ((!requestedThreadId || typeof requestedThreadId !== 'string') && candidateId && typeof candidateId === 'string') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (supabaseServiceKey) {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: lastLog } = await supabase
            .from('email_logs')
            .select('thread_id')
            .eq('candidate_id', candidateId)
            .not('thread_id', 'is', null)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();
          if (lastLog?.thread_id) {
            threadId = lastLog.thread_id;
          }
        }
      } catch (_) {
        // keep threadId as new UUID on any error
      }
    }
    
    // Determine final recipient early for logging
    const finalRecipient = forceToEmail || to;
    
    // Log incoming request details
    console.log('[Email Send] Request received', {
      originalTo: to,
      finalTo: finalRecipient,
      subject,
      emailType: emailType || 'Custom',
      candidateId: candidateId || 'none',
      hasContent: !!content,
      contentLength: content?.length || 0,
      isTestMode: !!forceToEmail,
      timestamp: new Date().toISOString()
    });

    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Normalize literal \n and \t (e.g. from templates or AI) so they render as line breaks
    const contentStr = String(content)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
    // Match common HTML tags: <a>, <p>, <br>, <div>, <span>, <strong>, <em>, <b>, <i>, <u>, <ul>, <ol>, <li>, <h1-6>, <img>, etc.
    // Also match tags with attributes like <a href=...> or <p style=...>
    const htmlTagPattern = /<(a|p|br|div|span|strong|em|b|i|u|ul|ol|li|h[1-6]|img|table|tr|td|th|thead|tbody|style|link|script)[\s>\/]|<\/[a-z]+>/i;
    const containsHtml = htmlTagPattern.test(contentStr);
    
    let htmlContent: string;
    
    if (containsHtml) {
      // Content already contains HTML - use it as-is WITHOUT ANY ESCAPING
      // Simply preserve the HTML exactly as received
      htmlContent = contentStr;
      
      // Only convert newlines in text portions (not inside HTML tags)
      // Split by HTML tags to process text and tags separately
      const parts = htmlContent.split(/(<[^>]*>)/g);
      htmlContent = parts.map((part) => {
        // If this part is an HTML tag (starts with <), keep it completely unchanged
        if (part.trim().startsWith('<')) {
          return part;
        }
        // For text portions between tags, convert newlines to <br>
        // This helps with formatting while preserving HTML structure
        return part.replace(/\n/g, '<br>');
      }).join('');
    } else {
      // Plain text: single Enter = new line (<br>), double Enter = new paragraph (<p>)
      const normalized = contentStr.replace(/\r\n/g, '\n').trim();
      const rawParagraphs = normalized ? normalized.split(/\n\n+/) : [''];
      const paragraphs = rawParagraphs.map((block) => block.trim());

      // Within each paragraph, preserve single newlines as <br>; escape HTML first
      htmlContent = paragraphs
        .map((block) => {
          const escaped = escapeHtml(block);
          const withBreaks = escaped.replace(/\n/g, '<br>');
          return `<p style="margin: 0 0 12px 0;">${withBreaks}</p>`;
        })
        .join('');

      // Convert plain URLs to clickable links (after escaping, so safe)
      htmlContent = htmlContent.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>');
    }

    // IMPORTANT: sanitizeHtml ONLY removes dangerous elements (script tags, event handlers, etc.)
    // It does NOT escape HTML - it preserves valid HTML like <a>, <p>, style attributes, etc.
    htmlContent = sanitizeHtml(htmlContent);

    // Wrap content in branded email template
    // LOGO URL: Upload your logo to Supabase Storage bucket "email-assets" → Copy Public URL
    // IMPORTANT: Image must be:
    // 1. In a PUBLIC bucket (bucket must have public: true)
    // 2. Accessible via HTTPS (email clients block HTTP images)
    // 3. Publicly accessible (no authentication required)
    // 
    // To set up:
    // 1. Run CREATE_EMAIL_ASSETS_BUCKET.sql in Supabase SQL Editor
    // 2. Go to Storage → email-assets → Upload your logo (e.g., logo.png)
    // 3. Click the file → Copy the "Public URL"
    // 4. Set LOGO_URL environment variable in Supabase Edge Functions secrets
    // 
    // URL format: https://[project-id].supabase.co/storage/v1/object/public/email-assets/logo.png
    // Default to full logo (coreflow-logo.png) for better branding in emails
    let logoUrl = Deno.env.get('LOGO_URL') || 'https://coreflowhr.com/assets/images/coreflow-logo.png';
    
    // Ensure logo URL uses HTTPS (email clients may block HTTP images)
    if (logoUrl && logoUrl.startsWith('http://')) {
      logoUrl = logoUrl.replace('http://', 'https://');
    }
    
    // Log logo URL being used (for debugging)
    console.log('[Email Send] Logo URL configured', {
      logoUrl,
      isSupabaseStorage: logoUrl.includes('supabase.co/storage'),
      isHttps: logoUrl.startsWith('https://'),
      timestamp: new Date().toISOString()
    });
    const companyName = Deno.env.get('FROM_NAME') || 'CoreFlow';
    const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://coreflowhr.com';
    
    htmlContent = createEmailTemplate(htmlContent, logoUrl, companyName, companyWebsite, to);

    // Resend Email API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const emailPayload: Record<string, unknown> = {
      from: `${fromName || fromDefaultName} <${fromEmail}>`,
      to: finalRecipient,
      subject,
      text: String(content),
      html: htmlContent,
    };
    if (replyToEmail) {
      emailPayload.reply_to = replyToEmail;
    }
    const messageIdDomain = replyToEmail?.includes('@') ? replyToEmail.split('@')[1] : 'coreflowhr.com';
    const messageIdStr = `<${threadId}@${messageIdDomain}>`;

    // RFC 5322 threading: In-Reply-To and References so clients thread replies correctly
    let inReplyTo: string | null = null;
    let references: string | null = null;
    if (replyToId && typeof replyToId === 'string') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (supabaseServiceKey) {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: parentLog } = await supabase
            .from('email_logs')
            .select('message_id')
            .eq('id', replyToId)
            .single();
          if (parentLog?.message_id) {
            inReplyTo = parentLog.message_id;
            references = parentLog.message_id;
          }
        }
      } catch (_) {
        // continue without In-Reply-To on error
      }
    }

    const headers: Record<string, string> = {
      'Message-ID': messageIdStr,
      'X-Thread-ID': threadId,
    };
    if (inReplyTo) {
      headers['In-Reply-To'] = inReplyTo;
      if (references) headers['References'] = references;
    }
    // List-Unsubscribe (RFC 8058 / CAN-SPAM best practice) for better deliverability
    const unsubscribeUrl = `${companyWebsite}/unsubscribe${to ? `?email=${encodeURIComponent(to)}` : ''}`;
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    emailPayload.headers = headers;

    console.log('[Email Send] 📧 Sending to Resend API', {
      recipient: finalRecipient,
      originalRecipient: to,
      from: emailPayload.from,
      subject,
      emailType: emailType || 'Custom',
      isTestMode: !!forceToEmail,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(emailPayload),
      });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email Send] Resend API error', {
        status: response.status,
        statusText: response.statusText,
        recipient: finalRecipient,
        error: errorText,
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

      const data = await response.json();
      
      console.log('[Email Send] ✅ Email sent successfully via Resend', {
        recipient: finalRecipient,
        originalRecipient: to,
        resendId: data.id || 'unknown',
        subject,
        emailType: emailType || 'Custom',
        isTestMode: !!forceToEmail,
        timestamp: new Date().toISOString()
      });

      // Log email to database if candidateId is provided
      if (candidateId) {
        try {
          // Get user ID from authorization header
          const authHeader = req.headers.get('authorization');
          if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            // Create Supabase client with service role key for admin operations
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
            
            if (!supabaseServiceKey) {
              console.warn('SUPABASE_SERVICE_ROLE_KEY not set, skipping email logging');
            } else {
              const supabase = createClient(supabaseUrl, supabaseServiceKey);

              // Get user ID from token
              const { data: { user }, error: userError } = await supabase.auth.getUser(token);
              
              if (userError) {
                console.error('[Email Send] Error getting user from token', {
                  recipient: finalRecipient,
                  candidateId: candidateId || 'none',
                  error: userError,
                  timestamp: new Date().toISOString()
                });
              } else if (user) {
                // Insert email log using service role (bypasses RLS)
                const { error: logError } = await supabase
                  .from('email_logs')
                  .insert({
                    candidate_id: candidateId,
                    user_id: user.id,
                    to_email: forceToEmail || to,
                    from_email: fromEmail,
                    subject: subject,
                    content: htmlContent,
                    email_type: emailType || 'Custom',
                    status: 'sent',
                    direction: 'outbound',
                    read: false,
                    thread_id: threadId,
                    reply_to_id: replyToId || null,
                    message_id: messageIdStr,
                    sent_at: new Date().toISOString()
                  });

                if (logError) {
                  console.error('[Email Send] Error logging email to database', {
                    candidateId,
                    recipient: finalRecipient,
                    error: logError,
                    timestamp: new Date().toISOString()
                  });
                  // Don't fail the request if logging fails
                } else {
                  console.log('[Email Send] Email logged successfully to database', {
                    candidateId,
                    recipient: finalRecipient,
                    emailType: emailType || 'Custom',
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          }
        } catch (logErr: any) {
          console.error('[Email Send] Error in email logging process', {
            recipient: finalRecipient,
            candidateId: candidateId || 'none',
            error: logErr.message || logErr,
            timestamp: new Date().toISOString()
          });
          // Don't fail the request if logging fails
        }
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[Email Send] Email send timeout after 10 seconds', {
          recipient: finalRecipient,
          timestamp: new Date().toISOString()
        });
        return new Response(
          JSON.stringify({ error: 'Email service timeout. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      console.error('[Email Send] Unexpected error during fetch', {
        recipient: finalRecipient,
        error: fetchError.message || fetchError,
        stack: fetchError.stack,
        timestamp: new Date().toISOString()
      });
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[Email Send] Fatal error in send-email function', {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    try {
      const sentryDsn = Deno.env.get('SENTRY_DSN');
      if (sentryDsn) {
        const sentry = await import('https://esm.sh/@sentry/node@10.35.0');
        sentry.init({ dsn: sentryDsn, environment: Deno.env.get('ENVIRONMENT') || 'production' });
        sentry.captureException(error);
        await sentry.flush(2000);
      }
    } catch (sentryError) {
      console.error('[Email Send] Failed to send error to Sentry', sentryError);
    }
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
