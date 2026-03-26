import React, { useEffect } from 'react';
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
 *
 * React Strict Mode safe: uses a local `cancelled` flag (not shared refs) so that
 * Strict Mode's double-invocation pattern doesn't cancel the second run's resolve().
 */
const AuthRedirect: React.FC = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) return;

    if (!session || !user) {
      navigate('/login', { replace: true });
      return;
    }

    // Snapshot values from the closure at effect-run time.
    const userId = user.id;
    const isPaymentSuccess = searchParams.get('payment') === 'success';
    const sessionId = searchParams.get('session_id');

    // Local cancellation flag — each effect invocation owns its own copy.
    // When React Strict Mode runs the effect twice (run → cleanup → run), the
    // first run's `cancelled` is set true by the cleanup, while the second run
    // starts with a fresh `cancelled = false` and completes normally.
    let cancelled = false;

    // Hard deadline: bail to dashboard after 20 s if resolve() stalls completely.
    const hardDeadline = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        sessionStorage.setItem('showDashboardLoader', 'true');
        navigate('/dashboard', { replace: true });
      }
    }, 20000);

    // Single attempt with a 5 s cap so a hanging DB query doesn't block forever.
    const pollOnce = (uid: string): Promise<string> =>
      Promise.race([
        resolvePostLoginDestination(uid),
        new Promise<string>((_, rej) =>
          setTimeout(() => rej(new Error('poll timeout')), 5000)
        ),
      ]);

    const resolve = async () => {
      if (isPaymentSuccess) {
        // Poll up to 8 × 2 s while waiting for the Stripe webhook to update the DB.
        for (let attempt = 0; attempt < 8; attempt++) {
          if (cancelled) return;
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          if (cancelled) return;

          let destination: string;
          try {
            destination = await pollOnce(userId);
          } catch {
            continue; // timed out — try again
          }

          if (cancelled) return;

          if (destination !== '/?pricing=true') {
            if (destination === '/dashboard') {
              const qs = sessionId
                ? `?payment=success&session_id=${encodeURIComponent(sessionId)}`
                : '?payment=success';
              sessionStorage.setItem('showDashboardLoader', 'true');
              navigate(`/dashboard${qs}`, { replace: true });
            } else {
              if (destination === '/onboarding') {
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
        // Webhook never fired — send to settings so user can check billing status.
        if (!cancelled) navigate('/settings', { replace: true });
      } else {
        const destination = await pollOnce(userId);
        if (cancelled) return;

        if (destination === '/?pricing=true') {
          try {
            const pendingPlan = sessionStorage.getItem('pendingPlan') as 'professional' | 'founding' | null;
            const pendingBilling = sessionStorage.getItem('pendingBilling') as 'monthly' | 'yearly' | null;
            if (pendingPlan && pendingBilling) {
              const { createCheckoutSession } = await import('../services/stripe');
              const { url, error } = await createCheckoutSession(pendingPlan, pendingBilling);
              if (url && !error) {
                sessionStorage.removeItem('pendingPlan');
                sessionStorage.removeItem('pendingBilling');
                window.location.replace(url);
                return;
              }
            }
          } catch {
            // Checkout failed — fall through to pricing page
          }
        }

        if (cancelled) return;
        if (destination === '/dashboard') {
          sessionStorage.setItem('showDashboardLoader', 'true');
        }
        navigate(destination, { replace: true });
      }
    };

    resolve()
      .then(() => {
        cancelled = true;
        clearTimeout(hardDeadline);
      })
      .catch(() => {
        if (!cancelled) {
          cancelled = true;
          clearTimeout(hardDeadline);
          sessionStorage.setItem('showDashboardLoader', 'true');
          navigate('/dashboard', { replace: true });
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(hardDeadline);
    };
  // [loading] only: re-run when auth finishes loading, never on session/user/
  // searchParams changes. Excluding those deps ensures that AuthContext re-renders
  // (e.g. from signIn() calling setUser+setSession) don't trigger the cleanup
  // and cancel the in-flight resolve().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return <PageLoader />;
};

export default AuthRedirect;
