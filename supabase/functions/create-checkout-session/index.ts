import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify Stripe secret key is set
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is missing from environment');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Stripe key not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { priceId, planType, billingInterval, userEmail } = await req.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing priceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL from environment or construct it
    // For production, you should set FRONTEND_URL environment variable in Supabase Edge Functions secrets
    // For local testing, this defaults to port 3000 (matches vite.config.ts)
    // IMPORTANT: Stripe cannot redirect to localhost from their servers
    // For local testing, use ngrok or test in production/staging environment
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    // Using HashRouter, so need # before route
    const successUrl = `${frontendUrl}/#/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/#pricing`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail || user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      locale: 'en', // Explicitly set locale to avoid module loading errors
      metadata: {
        userId: user.id,
        planType: planType || 'basic',
        billingInterval: billingInterval || 'monthly',
      },
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url,
      hasUrl: !!session.url,
      fullSession: JSON.stringify(session, null, 2),
    });

    // Stripe checkout sessions should always have a URL, but if it's missing, try to retrieve it
    let checkoutUrl = session.url;
    
    if (!checkoutUrl) {
      console.warn('URL not in initial response, attempting to retrieve session...');
      try {
        // Retrieve the session to get the URL
        const retrievedSession = await stripe.checkout.sessions.retrieve(session.id);
        checkoutUrl = retrievedSession.url;
        console.log('Retrieved session URL:', checkoutUrl);
      } catch (retrieveError: any) {
        console.error('Error retrieving session:', retrieveError);
      }
    }

    if (!checkoutUrl) {
      console.error('No URL available after retrieval attempt');
      // Construct the checkout URL manually as fallback
      // Format: https://checkout.stripe.com/pay/cs_test_... or https://checkout.stripe.com/c/pay/cs_test_...
      checkoutUrl = `https://checkout.stripe.com/c/pay/${session.id}`;
      console.warn('Using constructed URL as fallback:', checkoutUrl);
    }

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: checkoutUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    // Log more details for debugging
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.type || 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

