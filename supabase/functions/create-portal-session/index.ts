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
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's subscription from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('subscription_stripe_id, subscription_status, billing_plan_name')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', {
        error: settingsError,
        userId: user.id,
        code: settingsError.code,
        message: settingsError.message,
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch subscription information',
          details: settingsError.message || 'Database query failed'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User settings retrieved:', {
      userId: user.id,
      hasSubscriptionId: !!settings?.subscription_stripe_id,
      subscriptionStatus: settings?.subscription_status,
      planName: settings?.billing_plan_name,
    });

    if (!settings?.subscription_stripe_id) {
      console.log('No subscription_stripe_id found for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'No active subscription found',
          details: 'You don\'t have an active subscription. Please subscribe to a plan first.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the customer ID from the subscription
    let customerId: string;
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(settings.subscription_stripe_id, {
        expand: ['customer'], // Expand customer object to get full details
      });
      console.log('Subscription retrieved:', {
        subscriptionId: subscription.id,
        customerType: typeof subscription.customer,
        customer: subscription.customer,
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
      });
      
      // Extract customer ID - handle both string and object
      if (typeof subscription.customer === 'string') {
        customerId = subscription.customer;
      } else if (subscription.customer && typeof subscription.customer === 'object' && subscription.customer.id) {
        customerId = subscription.customer.id;
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid customer reference in subscription',
            details: 'Subscription exists but customer reference is invalid. Please contact support.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Extracted customer ID:', customerId);
    } catch (stripeError: any) {
      console.error('Error retrieving subscription from Stripe:', stripeError);
      
      // Handle specific error cases
      if (stripeError.code === 'resource_missing') {
        return new Response(
          JSON.stringify({ 
            error: 'Subscription not found in Stripe',
            details: 'The subscription may have been deleted or exists in a different Stripe account. Please contact support or subscribe again.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to retrieve subscription from Stripe',
          details: stripeError.message || 'Invalid subscription ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'No customer ID found for subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify customer exists - this will catch if customer was deleted
    // Even though subscription exists, the customer might have been deleted separately
    let customerExists = false;
    try {
      const customerCheck = await stripe.customers.retrieve(customerId);
      customerExists = true;
      console.log('Customer verified exists:', {
        customerId: typeof customerCheck === 'string' ? customerCheck : customerCheck.id,
        deleted: typeof customerCheck === 'object' ? customerCheck.deleted : false,
      });
      
      if (typeof customerCheck === 'object' && customerCheck.deleted) {
        return new Response(
          JSON.stringify({ 
            error: 'Customer was deleted in Stripe',
            details: `Customer ${customerId} was deleted. The subscription may still exist but customer is gone. Please contact support to fix this.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (customerError: any) {
      // Customer doesn't exist - this is the problem
      const stripeMode = stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'test';
      console.error('Customer does NOT exist in Stripe:', {
        customerId: customerId,
        stripeMode: stripeMode,
        error: customerError.message,
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Customer not found in Stripe ${stripeMode} mode`,
          details: `Customer ID ${customerId} does not exist. Your subscription references this customer, but it's missing. This usually means:
          1. Customer was deleted in Stripe
          2. Wrong Stripe account - check if you're using the correct Stripe secret key
          3. Test/Live mismatch - customer might be in ${stripeMode === 'test' ? 'live' : 'test'} mode
          
          Go to Stripe Dashboard → Customers and search for this ID to verify.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL
    // For production, set FRONTEND_URL in Supabase Edge Functions secrets
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    // Using HashRouter, so need # before route
    const returnUrl = `${frontendUrl}/#/settings`;

    // Create Stripe Portal Session
    let portalSession;
    try {
      console.log('Creating portal session with:', {
        customerId: customerId,
        returnUrl: returnUrl,
        stripeMode: stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'test',
      });
      
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      
      console.log('Portal session created successfully:', {
        url: portalSession.url,
        id: portalSession.id,
      });
    } catch (portalError: any) {
      console.error('Error creating Stripe portal session:', portalError);
      console.error('Portal error details:', {
        code: portalError.code,
        message: portalError.message,
        param: portalError.param,
        customerId: customerId,
        stripeMode: stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'test',
      });
      
      // Handle specific error cases
      if (portalError.code === 'resource_missing' && portalError.param === 'customer') {
        const stripeMode = stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'test';
        return new Response(
          JSON.stringify({ 
            error: 'Customer not found when creating portal session',
            details: `Customer ID ${customerId} does not exist in Stripe ${stripeMode} mode. Possible causes:
            - Customer was deleted in Stripe
            - You're using ${stripeMode} keys but customer exists in ${stripeMode === 'test' ? 'live' : 'test'} mode
            - Subscription was created in a different Stripe account
            Please verify your Stripe secret key matches the account where the customer/subscription was created.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create billing portal session',
          details: portalError.message || 'Stripe API error. Make sure Customer Portal is enabled in Stripe Dashboard.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!portalSession?.url) {
      return new Response(
        JSON.stringify({ error: 'Portal session created but no URL returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Unexpected error creating portal session:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

