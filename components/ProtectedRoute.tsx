import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { PageLoader } from './ui/PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  Viewer: ['/dashboard', '/candidates', '/settings'],
  HiringManager: ['/dashboard', '/candidates', '/jobs', '/calendar', '/clients', '/settings'],
  Recruiter: ['/dashboard', '/candidates', '/jobs', '/calendar', '/clients', '/offers', '/reports', '/settings'],
  Admin: ['*'],
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // Single flag — only true once ALL checks have completed
  const [checksComplete, setChecksComplete] = useState(false);
  const [canEnter, setCanEnter] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // ─── Run ALL access + onboarding checks in one pass ───────────────────────
  // Using session?.access_token as dependency so the check re-runs on token
  // refresh but NOT on every unrelated re-render.
  useEffect(() => {
    if (!session || !user) {
      // No session — checks are trivially done (render logic handles redirect)
      setChecksComplete(true);
      setCanEnter(false);
      setOnboardingCompleted(false);
      return;
    }

    let cancelled = false;
    setChecksComplete(false); // Reset while re-checking

    const runChecks = async () => {
      try {
        const nonAdminRoles = ['Recruiter', 'HiringManager', 'Viewer'];
        const isOnboardingPage = location.pathname === '/onboarding';

        // Fire all DB queries in parallel
        const [membershipsRes, settingsRes, profileRes] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('role, workspace_id')
            .eq('user_id', user.id),
          supabase
            .from('user_settings')
            .select('subscription_status, subscription_stripe_id, billing_plan_name')
            .eq('user_id', user.id)
            .maybeSingle(),
          isOnboardingPage
            ? Promise.resolve({ data: { onboarding_completed: true }, error: null })
            : supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', user.id)
                .maybeSingle(),
        ]);

        if (cancelled) return;

        const memberships = membershipsRes.data || [];
        const belongsToWorkspace = !membershipsRes.error && memberships.length > 0;
        const isNonAdminMember = memberships.some((m: any) => nonAdminRoles.includes(m.role));

        // Resolve role
        const role = memberships.length > 0 ? ((memberships[0] as any).role ?? 'Admin') : 'Admin';
        setUserRole(role);

        // ── Subscription / access check ──────────────────────────────────────
        let access = false;

        if (isNonAdminMember) {
          // Non-admin workspace members inherit the workspace subscription
          access = true;
        } else if (belongsToWorkspace) {
          // Workspace admin — check free-access flag first
          const workspaceIds = memberships.map((m: any) => m.workspace_id).filter(Boolean);
          if (workspaceIds.length > 0) {
            const { data: workspaces } = await supabase
              .from('workspaces')
              .select('id, is_free_access, free_access_expires_at')
              .in('id', workspaceIds);

            const hasFreeAccess = (workspaces || []).some((ws: any) => {
              if (!ws.is_free_access) return false;
              if (!ws.free_access_expires_at) return true;
              return new Date(ws.free_access_expires_at) > new Date();
            });

            if (hasFreeAccess) {
              access = true;
            }
          }

          if (!access) {
            // Fall through to own subscription
            const settings = settingsRes.data;
            if (settings) {
              const { hasActiveSubscription } = await import('../services/subscriptionAccess');
              access = hasActiveSubscription(settings);
            }
          }
        } else {
          // No workspace — check own Stripe subscription
          const settings = settingsRes.data;
          if (settings) {
            const { hasActiveSubscription } = await import('../services/subscriptionAccess');
            access = hasActiveSubscription(settings);
          }
        }

        // ── Onboarding check ────────────────────────────────────────────────
        let onboardingDone: boolean;

        if (isOnboardingPage) {
          onboardingDone = true; // Always allow the onboarding page itself
        } else if (belongsToWorkspace) {
          onboardingDone = true; // Invited users skip onboarding
        } else {
          onboardingDone = (profileRes as any).data?.onboarding_completed === true;
        }

        if (cancelled) return;

        setCanEnter(access);
        setOnboardingCompleted(onboardingDone);
      } catch (err) {
        console.error('[ProtectedRoute] access check failed:', err);
        if (!cancelled) {
          // Fail open so a transient DB error doesn't lock users out
          setCanEnter(true);
          setOnboardingCompleted(true);
        }
      } finally {
        if (!cancelled) {
          setChecksComplete(true);
        }
      }
    };

    runChecks();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, user?.id, location.pathname]);

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
        const token = session.access_token;
        if (!token) return;

        const { trackSession } = await import('../services/api');
        trackSession().catch(() => {});

        const checkPromise = supabase
          .from('user_sessions')
          .select('id')
          .eq('session_token', token)
          .eq('user_id', user.id)
          .maybeSingle();

        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), 2000)
        );

        const { data: record } = await Promise.race([checkPromise, timeout]) as any;

        if (!record && isMounted) {
          // Not found — try tracking once then recheck
          try {
            await trackSession();
            await new Promise(r => setTimeout(r, 1000));
            const retry = await supabase
              .from('user_sessions')
              .select('id')
              .eq('session_token', token)
              .eq('user_id', user.id)
              .maybeSingle();
            if (!retry.data && isMounted) {
              supabase.auth.signOut().then(() => { window.location.href = '/login'; });
            }
          } catch {
            // Can't verify — assume valid
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
  }, [session, user]);

  // ─── Render gates (evaluated top-to-bottom, first match wins) ─────────────

  // 1. AuthContext still initialising
  if (loading) return <PageLoader />;

  // 2. Session exists but email not confirmed
  if (user && !session) return <Navigate to="/verify-email" replace />;

  // 3. Not authenticated
  if (!session || !user) {
    if (typeof window !== 'undefined') sessionStorage.clear();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Waiting for all resource checks — never let children render until this clears
  if (!checksComplete) return <PageLoader />;

  // 5. No subscription / workspace → pricing (settings always accessible)
  const isSettingsPage = location.pathname === '/settings';
  if (!canEnter && !isSettingsPage) return <Navigate to="/?pricing=true" replace />;

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

  return <>{children}</>;
};

export default ProtectedRoute;
