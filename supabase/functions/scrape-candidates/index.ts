/**
 * Supabase Edge Function: Scrape Candidates
 * Handles candidate scraping for jobs via the ScrapingService
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import the ScrapingService (we'll need to adapt it for Deno)
// For now, we'll use a fetch-based approach to call a Node.js server
// OR we can run the scraper logic here if we adapt it for Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let jobId: string | undefined;
  let userId: string | undefined;
  try {
    const body = await req.json();
    jobId = body.jobId;
    const { sources, maxCandidates } = body;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    userId = user.id;

    // Enforce monthly scrape limit (per billing cycle)
    const { data: usageRows } = await supabase.rpc('get_scrape_usage', { p_user_id: user.id });
    const used = usageRows?.[0]?.used ?? 0;
    const resetDate = usageRows?.[0]?.reset_date ?? null;
    const { data: settings } = await supabase
      .from('user_settings')
      .select('billing_plan_name')
      .eq('user_id', user.id)
      .single();
    const planName = (settings?.billing_plan_name || 'Basic Plan').toLowerCase();
    const limit = planName.includes('professional') || planName.includes('pro') ? 100 : 30;
    if (used >= limit) {
      const renewalText = resetDate
        ? new Date(resetDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'your cycle renews';
      return new Response(
        JSON.stringify({
          error: 'Monthly scrape limit reached',
          userMessage: `You've used your monthly scrapes. Upgrade to Pro or wait until ${renewalText}.`,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load job with basic validation and prevent duplicate scrapes
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, user_id, title, location, scraping_status, candidates_found, retry_count')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({
          error: 'Job not found',
          userMessage: 'We could not find this job. Please refresh and try again.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent starting a second scrape while one is already in progress
    if (job.scraping_status === 'pending') {
      return new Response(
        JSON.stringify({
          error: 'Scrape already running',
          userMessage: 'A candidate search is already in progress for this job.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic job validation (title + location)
    const title = (job.title || '').trim();
    if (!title || title.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'Invalid job title',
          userMessage: 'Job title is required and must be at least 3 characters long.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let warning: string | null = null;
    const location = (job.location || '').trim();
    if (!location) {
      warning =
        'No location specified – searching globally. Add a location to narrow results and improve match quality.';
    }

    // Mark job as actively scraping so UI can show progress
    await supabase
      .from('jobs')
      .update({
        scraping_status: 'pending',
        scrape_started_at: new Date().toISOString(),
        scrape_completed_at: null,
        scraping_error: null,
        scraping_suggestion: warning,
        candidates_found: 0,
      })
      .eq('id', jobId)
      .eq('user_id', user.id);

    // Limit concurrent scrapes so we don't exceed HarvestAPI concurrency (multiple users at once)
    const { data: slotRow, error: slotError } = await supabase.rpc('acquire_scrape_slot');
    const slotId = Array.isArray(slotRow) ? slotRow[0] : slotRow;
    if (slotError || slotId == null) {
      return new Response(
        JSON.stringify({
          error: 'Scrape busy',
          userMessage: 'Another search is already running. Please try again in a minute.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeStartedAt = Date.now();

    try {
    // Call the scraper server (running on localhost or deployed)
    // For production, you'd deploy the scraper-ui server separately
    const scraperServerUrl = Deno.env.get('SCRAPER_SERVER_URL') || 'http://localhost:3005';
    
    const scrapeResponse = await fetch(`${scraperServerUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        sources: sources || ['profiles'],
        maxCandidates: maxCandidates || 50,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.json().catch(() => ({}));
      const userMessage = errorData.userMessage || errorData.error || 'Scraping failed';
      const suggestion = errorData.suggestion ?? null;
      const { data: jobRow } = await supabase.from('jobs').select('title').eq('id', jobId).eq('user_id', user.id).single();
      const jobTitle = jobRow?.title || 'Job';
      await supabase
        .from('jobs')
        .update({
          scraping_status: 'failed',
          scraping_error: userMessage,
          scraping_suggestion: suggestion,
          scraping_attempted_at: new Date().toISOString(),
          scrape_completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('user_id', user.id);
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Sourcing failed',
        desc: `${jobTitle}: ${userMessage}. Check the job for suggestions.`,
        type: 'sourcing_failed',
        category: 'automation',
        unread: true,
      });

      // Classify error type for targeted refund decisions
      const rawMsg = (errorData?.error || '').toLowerCase();
      const isRateLimited = scrapeResponse.status === 429 || rawMsg.includes('rate limit') || rawMsg.includes('too many');
      const isTimeout = scrapeResponse.status === 504 || rawMsg.includes('timeout') || rawMsg.includes('timed out');
      const isAuth = scrapeResponse.status === 401 || scrapeResponse.status === 403 || rawMsg.includes('unauthorized') || rawMsg.includes('forbidden');

      // Refund the credit for provider/infra failures (not user mistakes)
      if (isRateLimited || isTimeout || isAuth) {
        await supabase.rpc('decrement_scrape_count', { p_user_id: user.id, p_by: 1 }).catch(() => null);
      }
      await supabase.rpc('upsert_scrape_metrics', {
        p_user_id: user.id,
        p_failed: true,
        p_empty: false,
        p_rate_limited: isRateLimited,
        p_candidates: 0,
        p_duration_ms: Date.now() - scrapeStartedAt,
      }).catch(() => null);

      return new Response(
        JSON.stringify({
          error: errorData.error || 'Scraping failed',
          userMessage,
          suggestion,
        }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();

    // Increment monthly scrape count (enforced per billing cycle)
    await supabase.rpc('increment_scrape_count', { p_user_id: user.id });

    const totalSaved: number = scrapeData?.totalSaved ?? scrapeData?.results?.length ?? 0;
    const diagnostic = scrapeData?.diagnostic ?? null;

    // Fetch job title once (used for notifications below)
    const { data: jobRow } = await supabase
      .from('jobs')
      .select('title')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    const jobTitle = jobRow?.title || 'Job';

    // Zero-results path: mark failed with helpful diagnosis message
    if (totalSaved === 0 && diagnostic?.zeroResultsReason && !diagnostic.zeroResultsReason.broadened) {
      const zr = diagnostic.zeroResultsReason;
      await supabase
        .from('jobs')
        .update({
          scraping_status: 'failed',
          scraping_error: zr.message,
          scraping_suggestion: Array.isArray(zr.suggestion) ? zr.suggestion.join(' | ') : (zr.suggestion ?? null),
          scraping_attempted_at: new Date().toISOString(),
          scrape_completed_at: new Date().toISOString(),
          candidates_found: 0,
        })
        .eq('id', jobId)
        .eq('user_id', user.id);

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'No candidates found',
        desc: `${jobTitle}: ${zr.message}`,
        type: 'sourcing_failed',
        category: 'automation',
        unread: true,
      });

      await supabase.rpc('upsert_scrape_metrics', {
        p_user_id: user.id,
        p_failed: false,
        p_empty: true,
        p_rate_limited: false,
        p_candidates: 0,
        p_duration_ms: Date.now() - scrapeStartedAt,
      }).catch(() => null);

      return new Response(
        JSON.stringify({
          success: false,
          totalSaved: 0,
          error: 'No candidates found',
          userMessage: zr.message,
          diagnostic,
          locationWarning: warning,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success path (at least 1 candidate saved, or broadened search found results)
    const successMsg = diagnostic?.zeroResultsReason?.broadened
      ? `Found ${totalSaved} candidate${totalSaved !== 1 ? 's' : ''} using a broader search (simplified title).`
      : null;

    await supabase
      .from('jobs')
      .update({
        scraping_status: 'succeeded',
        scraping_error: successMsg,
        scraping_attempted_at: new Date().toISOString(),
        scrape_completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('user_id', user.id);

    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Sourcing complete',
      desc: `${jobTitle}: ${totalSaved} candidate${totalSaved !== 1 ? 's' : ''} added to pipeline.`,
      type: 'sourcing_complete',
      category: 'automation',
      unread: true,
    });

    await supabase.rpc('upsert_scrape_metrics', {
      p_user_id: user.id,
      p_failed: false,
      p_empty: false,
      p_rate_limited: false,
      p_candidates: totalSaved,
      p_duration_ms: Date.now() - scrapeStartedAt,
    }).catch(() => null);

    return new Response(
      JSON.stringify({
        success: true,
        results: scrapeData.results,
        totalSaved,
        locationWarning: warning,
        diagnostic: successMsg ? diagnostic : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    } finally {
      if (slotId) {
        await supabase.from('scrape_active').delete().eq('id', slotId);
      }
    }
  } catch (error: any) {
    console.error('Error in scrape-candidates function:', error);
    try {
      const sentryDsn = Deno.env.get('SENTRY_DSN');
      if (sentryDsn) {
        const sentry = await import('https://esm.sh/@sentry/node@10.35.0');
        sentry.init({ dsn: sentryDsn, environment: Deno.env.get('ENVIRONMENT') || 'production' });
        sentry.captureException(error);
        await sentry.flush(2000);
      }
    } catch (sentryError) {
      console.error('Failed to send scrape-candidates error to Sentry:', sentryError);
    }
    
    // Try to update job status and refund credit if we have jobId
    try {
      if (jobId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        await supabaseClient
          .from('jobs')
          .update({
            scraping_status: 'failed',
            scraping_error: error.message || 'Something went wrong. Your scrape credit has been refunded.',
            scraping_suggestion: (error as any).suggestion ?? null,
            scraping_attempted_at: new Date().toISOString(),
            scrape_completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        // Refund the scrape credit for unexpected / infra errors
        if (userId) {
          await supabaseClient.rpc('decrement_scrape_count', { p_user_id: userId, p_by: 1 }).catch(() => null);
        }
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    const userMessage = 'Candidate sourcing is temporarily unavailable. Please try again later.';
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Scraping failed',
        userMessage,
        suggestion: (error as any).suggestion ?? null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
