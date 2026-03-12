import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { PageLoader } from './ui/PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const [accessLoading, setAccessLoading] = useState(true);
  const [canEnter, setCanEnter] = useState(true); // Default allow during check
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Only admins see pricing gate
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true); // Default to true to allow access during check
  // Function to check if session was revoked (optimized, non-blocking)
  const checkSessionRevoked = async (): Promise<boolean> => {
    if (!session || !user) return false;

    try {
      const sessionToken = session.access_token;
      if (!sessionToken) return false;

      // Track session in background (fire-and-forget, don't wait)
      const { trackSession } = await import('../services/api');
      trackSession().catch((err) => {
        // Silently fail - tracking is non-critical
        console.warn('Session tracking failed (non-critical):', err);
      });

      // Check if session still exists in database (simplified check)
      // Use a timeout to prevent hanging
      const checkPromise = supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 2000)
      );

      const { data: sessionRecord, error: sessionCheckError } = await Promise.race([
        checkPromise,
        timeoutPromise
      ]) as any;

      // If session doesn't exist and no error, it might be a newly created session
      // Try to track it first, then check again to avoid false positives
      if (!sessionCheckError && !sessionRecord) {
        // Try to track the session (in case it wasn't tracked yet)
        try {
          const { trackSession } = await import('../services/api');
          await trackSession();
          
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check again after tracking
          const retryCheck = await supabase
            .from('user_sessions')
            .select('id')
            .eq('session_token', sessionToken)
            .eq('user_id', user.id)
            .maybeSingle();
          
          // If still not found after tracking, it was likely revoked
          if (!retryCheck.data) {
            return true; // Session was revoked
          }
          return false; // Session found after tracking
        } catch (trackError) {
          // If tracking fails, don't immediately revoke - might be a temporary issue
          // Only revoke if we're confident the session should exist
          console.warn('Session tracking failed during revocation check:', trackError);
          return false; // Assume session is valid if we can't verify
        }
      }

      return false; // Session is still valid
    } catch (error) {
      // Ignore errors - session might be valid but table doesn't exist
      // Or timeout occurred - assume session is valid
      return false;
    }
  };

  // Gatekeeper: workspace-first, then subscription.
  // Q1 — Does this user belong to a workspace? If yes, let them in (workspace owner paid; they inherit access).
  // Q2 — If no workspace, do they have their own subscription? If yes, in. If no, send to pricing.
  useEffect(() => {
    const checkAccess = async () => {
      if (!session || !user) {
        setAccessLoading(false);
        return;
      }

      try {
        // Question 1: Does this user belong to any workspace?
        const { data: memberships, error: membershipsError } = await supabase
          .from('workspace_members')
          .select('role, workspace_id')
          .eq('user_id', user.id);

        const belongsToWorkspace = !membershipsError && memberships && memberships.length > 0;
        const nonAdminRoles = ['Recruiter', 'HiringManager', 'Viewer'];
        const isAdminRole = belongsToWorkspace
          ? !(memberships || []).some((m: any) => nonAdminRoles.includes(m.role))
          : true; // No workspace yet → treat as potential plan buyer (admin)
        setIsAdmin(isAdminRole);

        if (belongsToWorkspace) {
          // User is in a workspace — check if any workspace is active (paid or valid design partner).
          const workspaceIds = (memberships || []).map((m: any) => m.workspace_id).filter(Boolean);

          if (workspaceIds.length > 0) {
            // Check is_free_access (design partners / testers) — subscription_status lives in
            // user_settings, not workspaces, so we don't query it here.
            const { data: workspaces } = await supabase
              .from('workspaces')
              .select('id, is_free_access, free_access_expires_at')
              .in('id', workspaceIds);

            const hasFreeAccess = (workspaces || []).some((ws: any) => {
              if (!ws.is_free_access) return false;
              if (!ws.free_access_expires_at) return true; // no expiry → valid
              return new Date(ws.free_access_expires_at) > new Date();
            });

            if (hasFreeAccess) {
              setCanEnter(true);
              setAccessChecked(true);
              setAccessLoading(false);
              return;
            }
          }

          // No free-access workspace — fall through to own subscription check.
        }

        // Check own subscription (covers workspace owners who paid via Stripe,
        // and users with no workspace).
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('subscription_status, subscription_stripe_id, billing_plan_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          setCanEnter(true);
          setAccessChecked(true);
        } else if (!settings) {
          setCanEnter(false); // No workspace free access, no subscription → pricing
          setAccessChecked(true);
        } else {
          const { hasActiveSubscription } = await import('../services/subscriptionAccess');
          setCanEnter(hasActiveSubscription(settings));
          setAccessChecked(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setCanEnter(true);
        setAccessChecked(true);
      } finally {
        setAccessLoading(false);
      }
    };

    if (session && user) {
      checkAccess();
    } else {
      setAccessLoading(false);
    }
  }, [session, user]);

  // Check onboarding status - only for newly subscribed users on first dashboard access
  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip onboarding check entirely if user is on onboarding page
      // Let the Onboarding component handle its own redirect logic
      if (location.pathname === '/onboarding') {
        setOnboardingChecked(true);
        setOnboardingCompleted(true); // Allow access to onboarding page
        return;
      }

      if (!session || !user) {
        setOnboardingChecked(true);
        return;
      }

      try {
        // Invited users (workspace members) skip onboarding
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (memberships && memberships.length > 0) {
          setOnboardingCompleted(true);
          setOnboardingChecked(true);
          return;
        }

        // Always check the database for current onboarding status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, created_at')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle to handle case where profile doesn't exist

        if (error) {
          console.error('Error fetching onboarding status:', error);
          // If there's an error (like 400), check if it's a query syntax issue
          // For now, allow access to prevent blocking users (fail open for this specific case)
          // The onboarding page itself will handle checking if onboarding is needed
          setOnboardingCompleted(true);
          setOnboardingChecked(true);
          return;
        }

        const isCompleted = profile?.onboarding_completed === true;
        
        // Update the state with the actual database value
        setOnboardingCompleted(isCompleted);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If query fails completely, allow access to prevent blocking
        // The onboarding component will handle redirect if needed
        setOnboardingCompleted(true);
      } finally {
        setOnboardingChecked(true);
      }
    };

    if (session && user) {
      checkOnboarding();
    } else {
      setOnboardingChecked(true);
    }
  }, [session, user]);

  // Check for revoked sessions periodically and on navigation (non-blocking)
  useEffect(() => {
    if (!session || !user) return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let lastCheckTime = 0;
    const CHECK_COOLDOWN = 5000; // Don't check more than once every 5 seconds

    const performSessionCheck = async () => {
      if (!isMounted || !session || !user) return;
      
      // Skip if we checked recently (throttle checks)
      const now = Date.now();
      if (now - lastCheckTime < CHECK_COOLDOWN) {
        return;
      }
      lastCheckTime = now;

      // Don't block UI - check in background
      checkSessionRevoked().then((isRevoked) => {
        if (isRevoked && isMounted) {
          console.log('Session revoked, signing out...');
          supabase.auth.signOut().then(() => {
            window.location.href = '/login';
          });
        }
      }).catch((error) => {
        // Silently fail - don't block user experience
        console.warn('Session check failed (non-critical):', error);
      });
    };

    // Initial check after page loads (deferred, non-blocking)
    // Increased delay to allow session tracking to complete after login
    const initialTimeout = setTimeout(() => {
      if (isMounted) {
        performSessionCheck();
      }
    }, 5000); // Increased from 3s to 5s to allow session tracking to complete

    // Check every 30 seconds (increased from 10s to reduce load)
    intervalId = setInterval(() => {
      if (isMounted) {
        performSessionCheck();
      }
    }, 30000);

    // Check when window gains focus (user switches back to tab) - but only if not recently checked
    const handleFocus = () => {
      if (isMounted) {
        const now = Date.now();
        if (now - lastCheckTime > CHECK_COOLDOWN) {
          performSessionCheck();
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, user]);

  // Show loading state while checking auth or subscription
  if (loading) {
    return <PageLoader />;
  }

  // If user exists but email not confirmed, redirect to verify email
  if (user && !session) {
    return <Navigate to="/verify-email" replace />;
  }

  // If not authenticated, redirect to login with return path
  // Also check user to ensure both are null (prevent stale state)
  if (!session || !user) {
    // Clear any stale state before redirecting
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading only while checking access for the first time
  if (accessLoading && !accessChecked) {
    return <PageLoader />;
  }

  // No workspace-with-subscription and no own subscription → pricing (except settings)
  const isSettingsPage = location.pathname === '/settings';
  if (accessChecked && !canEnter && !isSettingsPage) {
    return <Navigate to="/?pricing=true" replace />;
  }

  // Block ALL protected routes if onboarding not completed
  // Allow access to onboarding page regardless of completion status
  // (The Onboarding component will handle redirect if already completed)
  if (
    onboardingChecked && 
    !onboardingCompleted && 
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Don't redirect from onboarding page - let the Onboarding component handle redirects
  // This prevents redirect loops between ProtectedRoute and Onboarding component

  // User is authenticated (and subscribed or subscription check pending/errored), render children
  return <>{children}</>;
};

export default ProtectedRoute;

