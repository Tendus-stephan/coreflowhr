import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
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

    // Get user's subscription from database
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('subscription_stripe_id')
      .eq('user_id', user.id)
      .single();

    if (!settings?.subscription_stripe_id) {
      return new Response(
        JSON.stringify({ 
          subscription: null,
          paymentMethod: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(settings.subscription_stripe_id, {
      expand: ['default_payment_method', 'items.data.price.product'],
    });

    const customerId = subscription.customer as string;
    
    // Get customer details
    const customer = await stripe.customers.retrieve(customerId);
    
    // Get payment method details
    let paymentMethod = null;
    if (subscription.default_payment_method) {
      const pm = typeof subscription.default_payment_method === 'string'
        ? await stripe.paymentMethods.retrieve(subscription.default_payment_method)
        : subscription.default_payment_method;
      
      if (pm && 'card' in pm) {
        paymentMethod = {
          type: pm.card?.brand || 'card',
          last4: pm.card?.last4 || '',
          expMonth: pm.card?.exp_month || 0,
          expYear: pm.card?.exp_year || 0,
        };
      }
    }

    // Get product/plan name from subscription
    const price = subscription.items.data[0]?.price;
    const product = price?.product;
    let productName = 'Subscription';
    if (typeof product === 'object' && product) {
      productName = product.name || 'Subscription';
    } else if (typeof product === 'string') {
      const productData = await stripe.products.retrieve(product);
      productName = productData.name || 'Subscription';
    }

    // Format subscription data
    const formattedSubscription = {
      id: subscription.id,
      status: subscription.status,
      planName: productName,
      amount: price ? (price.unit_amount || 0) / 100 : 0,
      currency: price?.currency?.toUpperCase() || 'USD',
      interval: price?.recurring?.interval || 'month',
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    return new Response(
      JSON.stringify({ 
        subscription: formattedSubscription,
        paymentMethod: paymentMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching billing details:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch billing details',
        subscription: null,
        paymentMethod: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});





