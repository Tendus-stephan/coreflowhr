import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Wrap entire handler to catch any event loop errors
  try {
    // Verify webhook secret is set
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is missing from environment');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Webhook secret not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is missing from environment');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Stripe key not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body and signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body as text - must use exact raw body for signature verification
    // Read directly from request body (don't clone, it may modify the body)
    const body = await req.text();

    // Log webhook details for debugging (but don't log full body in production)
    console.log('Webhook received:', {
      hasSignature: !!signature,
      bodyLength: body.length,
      contentType: req.headers.get('content-type'),
      signaturePrefix: signature ? signature.substring(0, 20) + '...' : 'none',
    });

    if (!body || body.length === 0) {
      console.error('Webhook body is empty');
      return new Response(
        JSON.stringify({ error: 'Webhook body is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let event: Stripe.Event;
    try {
      // Verify the webhook signature - use async version for Deno
      // Pass the raw body text as-is - Stripe needs exact raw body
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified successfully');
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      console.error('Webhook error details:', {
        message: err.message,
        type: err.type,
        code: err.code,
        bodyLength: body.length,
        hasSignature: !!signature,
        webhookSecretSet: !!webhookSecret,
        webhookSecretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'none',
      });
      return new Response(
        JSON.stringify({ 
          error: `Webhook signature verification failed: ${err.message}`,
          details: 'Make sure STRIPE_WEBHOOK_SECRET matches the signing secret in Stripe Dashboard'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook event received:', {
      type: event.type,
      id: event.id,
    });

    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
        });

        if (!session.subscription || typeof session.subscription !== 'string') {
          console.error('No subscription ID in checkout session');
          return new Response(
            JSON.stringify({ received: true, message: 'No subscription ID' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get userId from metadata or client_reference_id
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId || typeof userId !== 'string') {
          console.error('No userId found in session metadata or client_reference_id');
          return new Response(
            JSON.stringify({ received: true, message: 'No userId found' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Retrieve subscription details from Stripe
        let subscription: Stripe.Subscription;
        try {
          subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price.product'],
          });
        } catch (error: any) {
          console.error('Error retrieving subscription:', error);
          return new Response(
            JSON.stringify({ received: true, message: 'Error retrieving subscription' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extract plan information
        const price = subscription.items.data[0]?.price;
        const product = typeof price?.product === 'string' ? null : price?.product;
        const planName = product?.name || session.metadata?.planType || 'Unknown Plan';
        const planPrice = (price?.unit_amount || 0) / 100; // Convert from cents
        // Convert Stripe interval to database format: 'month' -> 'monthly', 'year' -> 'yearly'
        const stripeInterval = price?.recurring?.interval || session.metadata?.billingInterval || 'monthly';
        const interval = stripeInterval === 'year' ? 'yearly' : stripeInterval === 'month' ? 'monthly' : stripeInterval;
        const currency = price?.currency?.toUpperCase() || 'USD';

        // Determine plan limits based on plan type
        const planType = session.metadata?.planType || 'basic';
        const isProfessional = planType.toLowerCase() === 'professional';
        // Align webhook limits with frontend/server plan definitions
        const maxJobs = isProfessional ? 25 : 5;
        const maxCandidates = isProfessional ? 300 : 100;

        // Update or insert user_settings
        const { error: upsertError } = await supabaseClient
          .from('user_settings')
          .upsert({
            user_id: userId,
            subscription_stripe_id: subscription.id,
            subscription_status: subscription.status,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_plan_name: planName,
            billing_plan_price: planPrice,
            billing_plan_interval: interval,
            billing_plan_currency: currency === 'USD' ? '$' : currency,
            billing_plan_active_jobs_limit: maxJobs,
            billing_plan_candidates_limit: maxCandidates,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('Error updating user_settings:', upsertError);
          return new Response(
            JSON.stringify({ received: true, error: upsertError.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('User settings updated successfully for checkout.session.completed');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        });

        // Get customer to find userId
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) {
          console.error('No customer ID in subscription');
          break;
        }

        // Find user by subscription_stripe_id
        const { data: settings, error: findError } = await supabaseClient
          .from('user_settings')
          .select('user_id')
          .eq('subscription_stripe_id', subscription.id)
          .single();

        if (findError || !settings) {
          console.error('User settings not found for subscription:', subscription.id);
          break;
        }

        // Retrieve full subscription details
        const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ['items.data.price.product'],
        });

        const price = fullSubscription.items.data[0]?.price;
        const product = typeof price?.product === 'string' ? null : price?.product;
        const planName = product?.name || 'Unknown Plan';
        const planPrice = (price?.unit_amount || 0) / 100;
        // Convert Stripe interval to database format: 'month' -> 'monthly', 'year' -> 'yearly'
        const stripeInterval = price?.recurring?.interval || 'monthly';
        const interval = stripeInterval === 'year' ? 'yearly' : stripeInterval === 'month' ? 'monthly' : stripeInterval;
        const currency = price?.currency?.toUpperCase() || 'USD';

        // Update user_settings
        const { error: updateError } = await supabaseClient
          .from('user_settings')
          .update({
            subscription_status: subscription.status,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_plan_name: planName,
            billing_plan_price: planPrice,
            billing_plan_interval: interval,
            billing_plan_currency: currency === 'USD' ? '$' : currency,
            updated_at: new Date().toISOString(),
          })
          .eq('subscription_stripe_id', subscription.id);

        if (updateError) {
          console.error('Error updating user_settings:', updateError);
        } else {
          console.log('User settings updated successfully for customer.subscription.updated');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        });

        // First check if this subscription exists in the database
        const { data: existingSettings, error: findError } = await supabaseClient
          .from('user_settings')
          .select('user_id, subscription_stripe_id')
          .eq('subscription_stripe_id', subscription.id)
          .maybeSingle();

        if (findError) {
          console.error('Error finding subscription in database:', findError);
          // Still return 200 to acknowledge webhook was received
          break;
        }

        if (!existingSettings) {
          console.log('Subscription not found in database, may have already been deleted');
          // Still return 200 to acknowledge webhook was received
          break;
        }

        // Reset subscription data in user_settings
        const { error: updateError } = await supabaseClient
          .from('user_settings')
          .update({
            subscription_stripe_id: null,
            subscription_status: null,
            subscription_current_period_end: null,
            billing_plan_name: 'Free',
            billing_plan_price: 0,
            billing_plan_interval: 'monthly',
            billing_plan_currency: '$',
            billing_plan_active_jobs_limit: 10,
            billing_plan_candidates_limit: 20,
            updated_at: new Date().toISOString(),
          })
          .eq('subscription_stripe_id', subscription.id);

        if (updateError) {
          console.error('Error updating user_settings for deleted subscription:', updateError);
          console.error('Update error details:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
          });
        } else {
          console.log('✅ User settings reset to Free plan for deleted subscription');
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Unexpected error in webhook handler:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });
    try {
      // Optional: forward error to Sentry if DSN is configured
      const sentryDsn = Deno.env.get('SENTRY_DSN');
      if (sentryDsn) {
        const sentry = await import('https://esm.sh/@sentry/node@10.35.0');
        sentry.init({ dsn: sentryDsn, environment: Deno.env.get('ENVIRONMENT') || 'production' });
        sentry.captureException(error);
        await sentry.flush(2000);
      }
    } catch (sentryError) {
      console.error('Failed to send error to Sentry:', sentryError);
    }
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'An unexpected error occurred while processing webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

