import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/PageLoader';
import { resolvePostLoginDestination } from '../utils/postLoginRoute';

/**
 * Landing page for Google OAuth, email verification, and Stripe payment redirects.
 * Runs subscription + onboarding checks before choosing a destination so users
 * never see /dashboard flash to /pricing.
 *
 * When ?payment=success is present (Stripe redirect), polls resolvePostLoginDestination
 * with retries to handle webhook processing delay before committing to a route.
 */
const AuthRedirect: React.FC = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (ran.current) return;

    if (!session || !user) {
      navigate('/login', { replace: true });
      return;
    }

    ran.current = true;

    const isPaymentSuccess = searchParams.get('payment') === 'success';
    const sessionId = searchParams.get('session_id');

    const resolve = async () => {
      if (isPaymentSuccess) {
        // Stripe webhook may not have updated the DB yet — poll until subscription
        // is confirmed (up to ~10 seconds across 5 attempts).
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          const destination = await resolvePostLoginDestination(user.id);
          if (destination !== '/?pricing=true') {
            // Subscription confirmed — route correctly (includes onboarding check).
            if (destination === '/dashboard') {
              // Pass payment params through so Dashboard can show the success toast.
              const qs = sessionId
                ? `?payment=success&session_id=${encodeURIComponent(sessionId)}`
                : '?payment=success';
              sessionStorage.setItem('showDashboardLoader', 'true');
              navigate(`/dashboard${qs}`, { replace: true });
            } else {
              // If routing to onboarding after a successful payment, stash the payment
              // params so Dashboard can show the success toast once onboarding completes.
              if (destination === '/onboarding' && isPaymentSuccess) {
                try {
                  const qs = sessionId
                    ? `?payment=success&session_id=${encodeURIComponent(sessionId)}`
                    : '?payment=success';
                  sessionStorage.setItem('pendingPaymentSuccess', qs);
                } catch { /* sessionStorage unavailable */ }
              }
              navigate(destination, { replace: true });
            }
            return;
          }
        }
        // Webhook still hasn't fired after retries — send to pricing.
        navigate('/?pricing=true', { replace: true });
      } else {
        const destination = await resolvePostLoginDestination(user.id);

        // If user has no subscription but chose a plan on the landing page before
        // signing up, resume checkout automatically instead of dropping them at pricing.
        if (destination === '/?pricing=true') {
          try {
            const pendingPlan = sessionStorage.getItem('pendingPlan') as 'professional' | 'founding' | null;
            const pendingBilling = sessionStorage.getItem('pendingBilling') as 'monthly' | 'yearly' | null;
            if (pendingPlan && pendingBilling) {
              sessionStorage.removeItem('pendingPlan');
              sessionStorage.removeItem('pendingBilling');
              const { createCheckoutSession } = await import('../services/stripe');
              const { url, error } = await createCheckoutSession(pendingPlan, pendingBilling);
              if (url && !error) {
                window.location.replace(url);
                return;
              }
            }
          } catch {
            // Checkout failed — fall through to pricing page
          }
        }

        if (destination === '/dashboard') {
          sessionStorage.setItem('showDashboardLoader', 'true');
        }
        navigate(destination, { replace: true });
      }
    };

    resolve().catch(() => {
      sessionStorage.setItem('showDashboardLoader', 'true');
      navigate('/dashboard', { replace: true });
    });
  }, [loading, session, user, navigate, searchParams]);

  return <PageLoader />;
};

export default AuthRedirect;
