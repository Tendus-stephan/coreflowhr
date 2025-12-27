import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

if (!stripePublishableKey) {
  console.warn('Stripe publishable key must be set in VITE_STRIPE_PUBLISHABLE_KEY');
}

// Load Stripe with error handling for network timeouts
export const stripePromise = stripePublishableKey 
  ? loadStripe(stripePublishableKey).catch((error) => {
      // Handle network errors gracefully (timeouts, connection issues)
      if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
        console.warn('Stripe.js failed to load due to network issues. Payment features may be unavailable.');
      } else {
        console.error('Error loading Stripe.js:', error);
      }
      // Return null to indicate Stripe is not available
      return null;
    })
  : Promise.resolve(null);

// Plan configurations
// Debug: Log environment variables to help troubleshoot
if (typeof window !== 'undefined') {
  console.log('[Stripe] Environment variables check:', {
    hasBasicMonthly: !!import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_MONTHLY,
    hasBasicYearly: !!import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_YEARLY,
    hasProfessionalMonthly: !!import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY,
    hasProfessionalYearly: !!import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY,
    basicMonthly: import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_MONTHLY?.substring(0, 20) + '...',
    professionalMonthly: import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY?.substring(0, 20) + '...',
  });
}

export const PLANS = {
  basic: {
    name: 'Basic Plan',
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_MONTHLY || '',
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_YEARLY || '',
    priceMonthly: 39,
    priceYearly: 33,
    features: [
      'Up to 5 active jobs',
      'Up to 50 candidates per job',
      'AI-powered candidate matching',
      'Email templates',
      'Basic analytics',
    ],
  },
  professional: {
    name: 'Professional Plan',
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY || '',
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY || '',
    priceMonthly: 99,
    priceYearly: 83,
    features: [
      'Unlimited active jobs',
      'Unlimited candidates',
      'Advanced AI matching',
      'Custom email templates',
      'Advanced analytics',
      'Team collaboration',
      'Priority support',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Create a Stripe checkout session
 * This will call a Supabase Edge Function to create the session securely
 */
export async function createCheckoutSession(
  planType: PlanType,
  billingInterval: 'monthly' | 'yearly'
): Promise<{ sessionId: string; url?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { sessionId: '', error: 'Not authenticated' };
    }

    const priceId = billingInterval === 'monthly' 
      ? PLANS[planType].priceIdMonthly 
      : PLANS[planType].priceIdYearly;

    if (!priceId) {
      console.error('[Stripe] Missing price ID:', {
        planType,
        billingInterval,
        priceIdMonthly: PLANS[planType].priceIdMonthly,
        priceIdYearly: PLANS[planType].priceIdYearly,
        envVarName: billingInterval === 'monthly' 
          ? `VITE_STRIPE_PRICE_ID_${planType.toUpperCase()}_MONTHLY`
          : `VITE_STRIPE_PRICE_ID_${planType.toUpperCase()}_YEARLY`,
        envVarValue: billingInterval === 'monthly' 
          ? import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY
          : import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_YEARLY || import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL_YEARLY
      });
      return { sessionId: '', error: 'Price ID not configured for this plan. Please restart your dev server after adding environment variables.' };
    }

    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId,
        planType,
        billingInterval,
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    console.log('Raw Edge Function response:', { data, error });

    if (error) {
      console.error('Error creating checkout session:', error);
      return { sessionId: '', error: error.message };
    }

    // Handle case where data might be a string that needs parsing
    let responseData = data;
    if (typeof data === 'string') {
      try {
        responseData = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse response data:', e);
      }
    }

    if (responseData?.error) {
      return { sessionId: '', error: responseData.error };
    }

    console.log('Parsed checkout session response:', {
      sessionId: responseData?.sessionId,
      url: responseData?.url,
      hasUrl: !!responseData?.url,
      fullData: responseData,
    });

    if (!responseData?.url) {
      console.error('No URL in response. Full response:', responseData);
      // If we have a sessionId but no URL, we can construct the checkout URL
      if (responseData?.sessionId) {
        console.warn('Session created but no URL. Check Edge Function logs.');
      }
      return { 
        sessionId: responseData?.sessionId || '', 
        error: 'Checkout session created but no URL returned. Please check Edge Function logs.' 
      };
    }

    return { 
      sessionId: responseData.sessionId,
      url: responseData.url 
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return { sessionId: '', error: error.message || 'Failed to create checkout session' };
  }
}

/**
 * Create a Stripe portal session for managing subscriptions
 */
export async function createPortalSession(): Promise<{ url: string; error?: string; details?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { url: '', error: 'Not authenticated' };
    }

    // Call Supabase Edge Function to create portal session
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        userId: session.user.id,
      },
    });

    // Handle case where data might be a string that needs parsing
    let responseData = data;
    if (data && typeof data === 'string') {
      try {
        responseData = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse portal session response:', e);
        // Continue with original data if parsing fails
      }
    }

    // Check if response contains an error (even if status is 200)
    if (responseData?.error) {
      return { 
        url: '', 
        error: responseData.error,
        details: responseData.details || 'Check Supabase Edge Function logs for details.'
      };
    }

    // Handle Supabase client error
    if (error) {
      console.error('Error creating portal session:', error);
      
      // Try to extract detailed error from response body (data might contain error message)
      let errorMessage = error.message || 'Failed to create portal session';
      let errorDetails = 'Check Supabase Edge Function logs for details.';
      
      // Check if data contains error message (sometimes errors are in data field)
      if (responseData?.error) {
        errorMessage = responseData.error;
        errorDetails = responseData.details || errorDetails;
      } else if (error.context) {
        // Check if error has context with error details
        try {
          const errorBody = typeof error.context === 'string' 
            ? JSON.parse(error.context) 
            : error.context;
          
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
          if (errorBody.details) {
            errorDetails = errorBody.details;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return { 
        url: '', 
        error: errorMessage,
        details: errorDetails
      };
    }

    if (!responseData?.url) {
      return { url: '', error: 'No portal URL returned. Check that you have an active subscription.' };
    }

    return { url: responseData.url };
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return { 
      url: '', 
      error: error.message || 'Failed to create portal session',
      details: 'Check browser console and Supabase logs for details'
    };
  }
}

