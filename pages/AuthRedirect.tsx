import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/PageLoader';
import { Button } from '../components/ui/Button';
import { resolvePostLoginDestination } from '../utils/postLoginRoute';

const t = (msg: string) => console.log(`[Redirect ${new Date().toISOString()}] ${msg}`);

/**
 * Landing page for Google OAuth, email verification, and Stripe payment redirects.
 * Runs subscription + onboarding checks before choosing a destination so users
 * never see /dashboard flash to /pricing.
 *
 * React Strict Mode safe: uses a local `cancelled` flag per effect invocation.
 */
const AuthRedirect: React.FC = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentPending, setPaymentPending] = useState(false);
  // True when all destination-resolve attempts timed out and we can't determine
  // where to send the user without risking a /dashboard → pricing flash.
  const [checkingPending, setCheckingPending] = useState(false);

  useEffect(() => {
    t(`effect invoked — loading=${loading} user=${!!user} session=${!!session}`);

    if (loading) {
      t('loading still true — deferring');
      return;
    }

    if (!session || !user) {
      t('no session/user — redirecting to /login');
      navigate('/login', { replace: true });
      return;
    }

    // Snapshot stable values from closure at effect-run time.
    const userId = user.id;
    const isPaymentSuccess = searchParams.get('payment') === 'success';
    const sessionId = searchParams.get('session_id');
    t(`starting resolve — userId=${userId} isPaymentSuccess=${isPaymentSuccess}`);

    // Local cancellation flag — each effect invocation owns its own copy so that
    // React Strict Mode's double-invocation doesn't corrupt the second (real) run.
    let cancelled = false;

    // Hard deadline: if resolve() stalls completely, bail after 20 s.
    // For payment flows, show a pending UI rather than bouncing to pricing.
    const hardDeadline = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        if (isPaymentSuccess) {
          t('hard deadline fired (payment flow) — showing payment pending UI');
          setPaymentPending(true);
        } else {
          t('hard deadline fired — showing checking pending UI');
          setCheckingPending(true);
        }
      }
    }, 20000);

    // Single attempt capped at 5 s so a hanging DB query doesn't block forever.
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
            t(`payment poll attempt ${attempt} timed out — retrying`);
            continue;
          }

          t(`payment poll attempt ${attempt} → ${destination}`);
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
        if (!cancelled) {
          // Webhook didn't confirm in time — show a pending UI so the user knows
          // their payment was received but confirmation is delayed. Navigating to
          // /dashboard at this point would cause ProtectedRoute to bounce them to
          // pricing since the subscription isn't yet active in the DB.
          t('payment webhook never confirmed — showing payment pending UI');
          setPaymentPending(true);
        }
      } else {
        let destination: string;
        try {
          destination = await pollOnce(userId);
        } catch {
          // First attempt timed out (5 s cap). Retry with a longer window before
          // falling back to /dashboard. Without this retry, a slow DB connection
          // causes AuthRedirect to land on /dashboard, then ProtectedRoute's fresh
          // check finds no subscription and immediately bounces to /?pricing=true —
          // producing the "dashboard flash then pricing redirect" bug.
          if (cancelled) return;
          t('pollOnce timed out — retrying with extended window');
          try {
            destination = await Promise.race([
              resolvePostLoginDestination(userId),
              new Promise<string>((_, rej) =>
                setTimeout(() => rej(new Error('poll timeout')), 12000)
              ),
            ]);
          } catch (e: any) {
            t(`destination resolve timed out after retry: ${e?.message} — showing checking pending UI`);
            if (!cancelled) setCheckingPending(true);
            return;
          }
        }

        t(`destination resolved: ${destination}`);
        if (cancelled) return;

        if (destination === '/?pricing=true') {
          try {
            const pendingPlan = sessionStorage.getItem('pendingPlan') as 'professional' | 'founding' | null;
            const pendingBilling = sessionStorage.getItem('pendingBilling') as 'monthly' | 'yearly' | null;
            if (pendingPlan && pendingBilling) {
              t(`resuming checkout — plan=${pendingPlan} billing=${pendingBilling}`);
              const { createCheckoutSession } = await import('../services/stripe');
              // 8 s cap: if Stripe API hangs, fall through to the pricing page
              const result = await Promise.race([
                createCheckoutSession(pendingPlan, pendingBilling),
                new Promise<{ url: null; error: string }>(resolve =>
                  setTimeout(() => resolve({ url: null, error: 'timeout' }), 8000)
                ),
              ]);
              if (cancelled) return;
              if (result.url && !result.error) {
                sessionStorage.removeItem('pendingPlan');
                sessionStorage.removeItem('pendingBilling');
                window.location.replace(result.url);
                return;
              }
              t(`checkout session failed/timed out — falling through to pricing page`);
            }
          } catch {
            // Checkout failed — fall through to pricing page
          }
        } else {
          // User has a valid subscription — clear any stale pending checkout state
          // so a subsequent login doesn't mistakenly trigger another checkout.
          try {
            sessionStorage.removeItem('pendingPlan');
            sessionStorage.removeItem('pendingBilling');
          } catch { /* ignore */ }
        }

        if (cancelled) return;
        if (destination === '/dashboard') {
          sessionStorage.setItem('showDashboardLoader', 'true');
        }
        t(`navigating to ${destination}`);
        navigate(destination, { replace: true });
      }
    };

    resolve()
      .then(() => {
        t('resolve() completed');
        cancelled = true;
        clearTimeout(hardDeadline);
      })
      .catch((e: any) => {
        t(`resolve() threw: ${e?.message}`);
        if (!cancelled) {
          cancelled = true;
          clearTimeout(hardDeadline);
          setCheckingPending(true);
        }
      });

    return () => {
      t('effect cleanup — cancelling in-flight resolve');
      cancelled = true;
      clearTimeout(hardDeadline);
    };
  // [loading] only: any other dep change would trigger cleanup and cancel the
  // in-flight resolve(), leaving the user stuck on the spinner.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (paymentPending) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/assets/images/coreflow-favicon-logo.png" alt="CoreFlow" className="object-contain w-[48px] h-[48px]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Payment received</h2>
          <p className="text-sm text-gray-600">
            We're confirming your subscription with our payment provider.
            This usually takes just a moment.
          </p>
          <p className="text-sm text-gray-500">
            Your account will be upgraded shortly. You can continue to your dashboard now.
          </p>
          <Button
            variant="black"
            className="w-full justify-center"
            onClick={() => navigate('/auth/redirect?payment=success', { replace: true })}
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (checkingPending) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/assets/images/coreflow-favicon-logo.png" alt="CoreFlow" className="object-contain w-[48px] h-[48px]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Just a moment…</h2>
          <p className="text-sm text-gray-600">
            We're having trouble reaching our servers. Your account is safe.
          </p>
          <Button
            variant="black"
            className="w-full justify-center"
            onClick={() => { window.location.href = '/auth/redirect'; }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return <PageLoader />;
};

export default AuthRedirect;
