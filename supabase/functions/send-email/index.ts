import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Get allowed origins from environment (comma-separated)
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  // Default to common production origins (should be overridden in production)
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3002', // Development port
    'https://coreflowhr.com', // Production domain
    'https://www.coreflowhr.com', // Production domain with www
  ];
};

const allowedOrigins = getAllowedOrigins();

const getCorsHeaders = (origin: string | null) => {
  // Check if origin is in allowed list
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  // For development, also allow localhost with any port
  const isLocalhost = origin && origin.startsWith('http://localhost:');
  
  const allowOrigin = isAllowed || isLocalhost ? (origin || '*') : '';
  
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

// Create branded email template wrapper
function createEmailTemplate(content: string, logoUrl: string, companyName: string, companyWebsite: string, recipientEmail?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${companyName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 30px 30px 30px; background-color: #ffffff; border-radius: 8px 8px 0 0;">
              <a href="${companyWebsite}" style="text-decoration: none; display: inline-block;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${companyWebsite}" style="height:60px;v-text-anchor:middle;width:120px;" arcsize="0%" strokecolor="#ffffff" fillcolor="#ffffff">
                  <w:anchorlock/>
                  <center style="color:#1f2937;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${companyName}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <img src="${logoUrl}" alt="${companyName}" width="120" style="max-width: 120px; width: 120px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; font-family: Arial, sans-serif; font-size: 16px; color: #1f2937;" />
                <!--<![endif]-->
              </a>
            </td>
          </tr>
          <!-- Content Area -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <div style="color: #1f2937; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #1f2937; font-size: 16px;">${companyName}</strong><br>
                      <span style="color: #9ca3af; font-size: 13px;">Modern Recruitment OS</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                      <a href="${companyWebsite}" style="color: #4f46e5; text-decoration: none; margin: 0 8px;">Visit our website</a>
                      <span style="color: #d1d5db;">|</span>
                      <a href="mailto:support@coreflowhr.com" style="color: #4f46e5; text-decoration: none; margin: 0 8px;">Contact us</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
                      This email was sent by ${companyName}.<br>
                      If you no longer wish to receive these emails, you can 
                      <a href="${companyWebsite}/unsubscribe${recipientEmail ? `?email=${encodeURIComponent(recipientEmail)}` : ''}" style="color: #4f46e5; text-decoration: underline;">unsubscribe here</a>.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
                      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
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

    const { to, subject, content, fromName, candidateId, emailType, threadId, replyToId } = await req.json();
    
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

    // Use built-in sanitization (fallback sanitizer is defined above)

    // Basic newline → <br> conversion so templates render nicely in HTML email
    let htmlContent = String(content)
      .split('\n')
      .map((line) => (line.trim().length ? escapeHtml(line) : '<br>'))
      .join('<br>');
    
    // Convert any remaining plain URLs (not already in <a> tags) to clickable links
    // Split by existing anchor tags, convert URLs in text parts only
    const parts = htmlContent.split(/(<a[^>]*>.*?<\/a>)/g);
    htmlContent = parts.map((part) => {
      // If this part is already an anchor tag, leave it alone
      if (part.startsWith('<a')) {
        return part;
      }
      // Otherwise, convert URLs in this text part to links
      return part.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>');
    }).join('');

    // Sanitize HTML content to prevent XSS
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
    let logoUrl = Deno.env.get('LOGO_URL') || 'https://coreflowhr.com/assets/images/coreflow-favicon-logo.png';
    
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

    const emailPayload = {
      from: `${fromName || fromDefaultName} <${fromEmail}>`,
      to: finalRecipient,
      subject,
      text: String(content),
      html: htmlContent,
    };

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
                    thread_id: threadId || null,
                    reply_to_id: replyToId || null,
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
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});










