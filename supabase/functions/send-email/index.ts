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
    'https://coreflowhr.com', // Production domain
    'https://www.coreflowhr.com', // Production domain with www
  ];
};

const allowedOrigins = getAllowedOrigins();

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
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

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set in environment');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { to, subject, content, fromName, candidateId, emailType, threadId, replyToId } = await req.json();

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

    // Resend Email API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          from: `${fromName || fromDefaultName} <${fromEmail}>`,
          to: forceToEmail || to, // Resend accepts single email or array
          subject,
          text: String(content),
          html: htmlContent,
        }),
      });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

      const data = await response.json();

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
                console.error('Error getting user from token:', userError);
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
                  console.error('Error logging email:', logError);
                  // Don't fail the request if logging fails
                } else {
                  console.log('Email logged successfully for candidate:', candidateId);
                }
              }
            }
          }
        } catch (logErr: any) {
          console.error('Error in email logging:', logErr);
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
        console.error('Email send timeout after 10 seconds');
        return new Response(
          JSON.stringify({ error: 'Email service timeout. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Unexpected send-email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});










