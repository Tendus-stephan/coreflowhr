import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { checkAppAccess } from '../services/appAccess';
import { PageLoader } from './ui/PageLoader';

const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  Viewer: ['/dashboard', '/candidates', '/settings'],
  HiringManager: ['/dashboard', '/candidates', '/jobs', '/calendar', '/clients', '/settings'],
  Recruiter: ['/dashboard', '/candidates', '/jobs', '/calendar', '/clients', '/offers', '/reports', '/settings'],
  Admin: ['*'],
};

const ProtectedRoute: React.FC = () => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // Single flag — only true once ALL checks have completed
  const [checksComplete, setChecksComplete] = useState(false);
  const [canEnter, setCanEnter] = useState(false);
  const [isPastDue, setIsPastDue] = useState(false);
  const [isLapsedMember, setIsLapsedMember] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isNonAdminMember, setIsNonAdminMember] = useState(false);

  // ─── Effect 1: subscription + access + role check ─────────────────────────
  // Runs once per session (on login / token refresh), NOT on every navigation.
  // This is the expensive check (3+ DB queries). Result is cached for the
  // lifetime of the session — see Effect 2 for the lightweight onboarding
  // re-check that runs on every route change.
  useEffect(() => {
    if (!session || !user) {
      // No session — checks are trivially done (render logic handles redirect)
      setChecksComplete(true);
      setCanEnter(false);
      setIsPastDue(false);
      setIsLapsedMember(false);
      setOnboardingCompleted(false);
      setIsNonAdminMember(false);
      return;
    }

    let cancelled = false;
    setChecksComplete(false); // Reset while re-checking

    const failOpen = () => {
      if (cancelled) return;
      setCanEnter(true);
      setIsPastDue(false);
      setIsLapsedMember(false);
      setIsNonAdminMember(false);
      setOnboardingCompleted(true);
      setChecksComplete(true);
    };

    const runChecks = async () => {
      const isOnboardingPage = location.pathname === '/onboarding';

      try {
        // checkAppAccess handles: network bail, parallel DB queries, RPC calls,
        // fail-open on network errors — single source of truth for access logic.
        const [accessResult, profileRes] = await Promise.all([
          checkAppAccess(user.id),
          isOnboardingPage
            ? Promise.resolve({ data: { onboarding_completed: true }, error: null })
            : supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', user.id)
                .maybeSingle(),
        ]);

        if (cancelled) return;

        const { canEnter, isPastDue, isLapsedMember, userRole, isNonAdminMember } = accessResult;

        setUserRole(userRole);
        setIsNonAdminMember(isNonAdminMember);
        setCanEnter(canEnter);
        setIsPastDue(isPastDue);
        setIsLapsedMember(isLapsedMember);

        // ── Onboarding check ────────────────────────────────────────────────
        let onboardingDone: boolean;
        if (isOnboardingPage || isNonAdminMember) {
          onboardingDone = true; // onboarding page itself + invited members always skip
        } else {
          onboardingDone = (profileRes as any).data?.onboarding_completed === true;
        }

        if (!cancelled) setOnboardingCompleted(onboardingDone);
      } catch (err) {
        console.error('[ProtectedRoute] access check failed:', err);
        if (!cancelled) failOpen();
      } finally {
        if (!cancelled) setChecksComplete(true);
      }
    };

    // Fail-open safety net: if any DB query hangs indefinitely,
    // let the user through after 10 s rather than showing PageLoader forever.
    const failOpenTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[ProtectedRoute] access check timed out — failing open');
        cancelled = true;
        setCanEnter(true);
        setIsPastDue(false);
        setIsLapsedMember(false);
        setIsNonAdminMember(false);
        setOnboardingCompleted(true);
        setChecksComplete(true);
      }
    }, 10000);

    runChecks();
    return () => { cancelled = true; clearTimeout(failOpenTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, user?.id]);

  // ─── Effect 2: lightweight onboarding re-check on every navigation ────────
  // Effect 1 only runs on session change. This effect re-checks onboarding
  // status on every route change so that completing onboarding and navigating
  // to /dashboard doesn't loop back to /onboarding due to stale state.
  // One lightweight DB query per navigation (vs 3+ in Effect 1).
  useEffect(() => {
    if (!checksComplete) return;     // Wait for Effect 1 first
    if (isNonAdminMember) return;    // Non-admin members always skip onboarding
    if (!session || !user) return;

    if (location.pathname === '/onboarding') {
      setOnboardingCompleted(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled) setOnboardingCompleted(data?.onboarding_completed === true);
      } catch {
        // Fail open — keep existing value on transient error
      }
    })();

    return () => { cancelled = true; };
  // checksComplete and isNonAdminMember are used as guards but not deps —
  // Effect 2 must only re-run on navigation, not whenever Effect 1 commits state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, session?.access_token, user?.id]);

  // ─── Background session-revocation check (non-blocking) ───────────────────
  useEffect(() => {
    if (!session || !user) return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let lastCheckTime = 0;
    const COOLDOWN = 5000;

    const performCheck = async () => {
      if (!isMounted) return;
      const now = Date.now();
      if (now - lastCheckTime < COOLDOWN) return;
      lastCheckTime = now;

      try {
        const { trackSession, getDeviceFingerprint } = await import('../services/api');

        // Query by device_fingerprint (stable across access-token refreshes) instead of
        // session_token. Access tokens rotate on every refresh — checking by token causes
        // false-positive sign-outs after a hard reload because the refreshed token isn't
        // in user_sessions yet. The fingerprint is derived from browser/OS/UA and is
        // constant for the same device/browser, so it correctly identifies whether
        // *this device* has an active session.
        const fingerprint = getDeviceFingerprint();

        const checkPromise = supabase
          .from('user_sessions')
          .select('id')
          .eq('device_fingerprint', fingerprint)
          .eq('user_id', user.id)
          .maybeSingle();

        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), 2000)
        );

        const { data: record } = await Promise.race([checkPromise, timeout]) as any;

        if (!record && isMounted) {
          // No record for this device — register it. Supabase auth is the source
          // of truth for session validity; a missing user_sessions row just means
          // this device hasn't been tracked yet (new browser, cleared storage, etc.).
          // Never force a sign-out based solely on a missing row — that causes
          // false-positive logouts when trackSession() fails or is slow.
          try {
            await trackSession();
          } catch {
            // Ignore — best-effort tracking only
          }
        }
      } catch {
        // Timeout or error — assume session valid
      }
    };

    const t = setTimeout(() => { if (isMounted) performCheck(); }, 5000);
    intervalId = setInterval(() => { if (isMounted) performCheck(); }, 30000);
    const onFocus = () => { if (isMounted) performCheck(); };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearTimeout(t);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [session?.access_token, user?.id]);

  // ─── Render gates (evaluated top-to-bottom, first match wins) ─────────────

  // 1. AuthContext still initialising
  if (loading) return <PageLoader />;

  // 2. User is set but no session.
  // Two cases: (a) email not confirmed → verify-email, (b) MFA required → back to login.
  if (user && !session) {
    if (!user.email_confirmed_at) return <Navigate to="/verify-email" replace />;
    // Email confirmed but session suppressed (MFA aal2 required and not yet verified).
    return <Navigate to="/login" replace />;
  }

  // 3. Not authenticated
  if (!session || !user) {
    if (typeof window !== 'undefined') sessionStorage.clear();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Waiting for all resource checks — never let children render until this clears
  if (!checksComplete) return <PageLoader />;

  // 5. No subscription / workspace → pricing, with exceptions:
  //    - past_due admins → /settings to update billing (fall through when already there)
  //    - lapsed non-admin members → /workspace-lapsed (they can't self-subscribe)
  if (!canEnter) {
    if (isLapsedMember) {
      return <Navigate to="/workspace-lapsed" replace />;
    }
    if (isPastDue && location.pathname === '/settings') {
      // Fall through — let them render the settings page to fix their billing
    } else {
      return <Navigate to={isPastDue ? '/settings' : '/?pricing=true'} replace />;
    }
  }

  // 6. Onboarding not done
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // 7. RBAC — restrict non-admin roles to their allowed routes
  if (userRole && userRole !== 'Admin') {
    const allowed = ROLE_ALLOWED_ROUTES[userRole];
    if (allowed && allowed[0] !== '*') {
      const path = location.pathname;
      if (!allowed.some(r => path === r || path.startsWith(r + '/'))) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
