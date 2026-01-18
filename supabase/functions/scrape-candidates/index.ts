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

  try {
    const { jobId, sources, maxCandidates } = await req.json();

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
        sources: sources || ['linkedin'],
        maxCandidates: maxCandidates || 50,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.json();
      throw new Error(errorData.error || 'Scraping failed');
    }

    const scrapeData = await scrapeResponse.json();

    // Update job scraping status
    await supabase
      .from('jobs')
      .update({
        scraping_status: 'succeeded',
        scraping_error: null,
        scraping_attempted_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        results: scrapeData.results,
        totalSaved: scrapeData.totalSaved,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in scrape-candidates function:', error);
    
    // Try to update job status if we have jobId
    try {
      const { jobId } = await req.json().catch(() => ({}));
      if (jobId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('jobs')
          .update({
            scraping_status: 'failed',
            scraping_error: error.message || 'Unknown error',
            scraping_attempted_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Scraping failed',
        // Don't expose internal errors to user
        userMessage: 'Candidate sourcing is temporarily unavailable. Please try again later.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
