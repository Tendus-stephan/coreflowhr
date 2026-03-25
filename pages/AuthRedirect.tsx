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

    // Hard deadline — if resolve() stalls indefinitely (e.g. a Supabase fetch() hangs
    // during the network transition away from Stripe checkout), bail to dashboard after
    // 20 seconds so the user is never stuck on the spinner forever.
    let settled = false;
    const hardDeadlineId = setTimeout(() => {
      if (!settled) {
        settled = true;
        sessionStorage.setItem('showDashboardLoader', 'true');
        navigate('/dashboard', { replace: true });
      }
    }, 20000);

    // Wraps a single resolvePostLoginDestination call with a 5-second timeout so a
    // hanging DB query skips to the next poll attempt rather than blocking forever.
    const pollOnce = (userId: string): Promise<string> =>
      Promise.race([
        resolvePostLoginDestination(userId),
        new Promise<string>((_, rej) =>
          setTimeout(() => rej(new Error('poll timeout')), 5000)
        ),
      ]);

    const resolve = async () => {
      if (isPaymentSuccess) {
        // Stripe webhook may not have updated the DB yet — poll until subscription
        // is confirmed. Up to 8 attempts × 2 s wait = ~16 s window, each capped at
        // 5 s so a single hanging query doesn't eat the entire budget.
        for (let attempt = 0; attempt < 8; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          let destination: string;
          try {
            destination = await pollOnce(user.id);
          } catch {
            // Timed-out or errored — try again next iteration
            continue;
          }
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
        // Webhook still hasn't fired after retries — send to settings so the user
        // can see their billing status rather than being shown a sign-up pricing page.
        navigate('/settings', { replace: true });
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

    resolve()
      .then(() => { settled = true; clearTimeout(hardDeadlineId); })
      .catch(() => {
        settled = true;
        clearTimeout(hardDeadlineId);
        sessionStorage.setItem('showDashboardLoader', 'true');
        navigate('/dashboard', { replace: true });
      });

    return () => {
      settled = true;
      clearTimeout(hardDeadlineId);
    };
  }, [loading, session, user, navigate, searchParams]);

  return <PageLoader />;
};

export default AuthRedirect;
