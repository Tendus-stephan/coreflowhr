import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(true); // Default to true to allow access during check
  const [subscriptionChecked, setSubscriptionChecked] = useState(false); // Track if we've completed a check
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

  useEffect(() => {
    const checkSubscription = async () => {
      if (!session || !user) {
        setSubscriptionLoading(false);
        return;
      }

      // Check subscription status
      try {
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('subscription_status, subscription_stripe_id, billing_plan_name')
          .eq('user_id', user.id)
          .maybeSingle();

        // If no settings found, user might not be subscribed yet
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking subscription:', error);
          // On error, allow access (don't block)
          setIsSubscribed(true);
          setSubscriptionChecked(true);
        } else if (!settings) {
          // No settings row - not subscribed
          setIsSubscribed(false);
          setSubscriptionChecked(true);
        } else {
          const subscribed = 
            settings?.subscription_status === 'active' || 
            (settings?.billing_plan_name && settings.billing_plan_name !== 'Basic' && settings.billing_plan_name !== 'Free') ||
            settings?.subscription_stripe_id !== null;

          setIsSubscribed(subscribed);
          setSubscriptionChecked(true); // Mark that we've completed the check
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        // On error, allow access (don't block)
        setIsSubscribed(true);
        setSubscriptionChecked(true);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    if (session && user) {
      checkSubscription();
    } else {
      setSubscriptionLoading(false);
    }
  }, [session, user]);

  // Check onboarding status - only for newly subscribed users on first dashboard access
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!session || !user || location.pathname === '/onboarding') {
        setOnboardingChecked(true);
        return;
      }

      // Check onboarding for ALL protected routes, not just dashboard
      // Users must complete onboarding before accessing any protected page
      // Exception: allow access to onboarding page itself
      if (location.pathname === '/onboarding') {
        setOnboardingChecked(true);
        setOnboardingCompleted(true); // Allow access to onboarding page
        return;
      }

      try {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, created_at')
          .eq('id', user.id)
          .single();

        // If already completed onboarding, skip check
        if (profile?.onboarding_completed) {
          setOnboardingCompleted(true);
          setOnboardingChecked(true);
          return;
        }

        // Check if user has an active subscription
        const { data: settings } = await supabase
          .from('user_settings')
          .select('subscription_status, subscription_stripe_id, billing_plan_name, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        // Check if user is subscribed
        const isSubscribed = settings && (
          settings.subscription_status === 'active' ||
          (settings.billing_plan_name && settings.billing_plan_name !== 'Basic' && settings.billing_plan_name !== 'Free') ||
          settings.subscription_stripe_id !== null
        );

        // If not subscribed, don't show onboarding (they need to subscribe first)
        if (!isSubscribed) {
          setOnboardingCompleted(true);
          setOnboardingChecked(true);
          return;
        }

        // Check if user has any existing data (jobs or candidates)
        const [jobsResult, candidatesResult] = await Promise.all([
          supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('candidates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .limit(1)
        ]);

        const hasJobs = (jobsResult.count || 0) > 0;
        const hasCandidates = (candidatesResult.count || 0) > 0;
        const hasExistingData = hasJobs || hasCandidates;

        // Determine if user is newly subscribed (within last 7 days)
        // Use profile created_at or settings created_at as proxy for subscription date
        const accountCreatedDate = profile?.created_at || settings?.created_at || user.created_at;
        const accountAge = accountCreatedDate 
          ? Date.now() - new Date(accountCreatedDate).getTime()
          : 0;
        const isNewlySubscribed = accountAge < (7 * 24 * 60 * 60 * 1000); // Within last 7 days

        // Block access to ALL protected routes if onboarding not completed
        // Only show onboarding if:
        // 1. User hasn't completed onboarding
        // 2. User is subscribed
        // 3. User is newly subscribed (account created within 7 days)
        // 4. User has no existing data (truly first time user)
        // Note: This check applies to all protected routes, not just dashboard
        const shouldShowOnboarding = 
          !profile?.onboarding_completed &&
          isSubscribed &&
          isNewlySubscribed &&
          !hasExistingData;

        setOnboardingCompleted(!shouldShowOnboarding);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to allowing access if check fails (fail open)
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
  }, [session, user, location.pathname]);

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

    // Don't check on every route change - too aggressive
    // Only check on initial mount and periodically

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, user, location.pathname]);

  // Show loading state while checking auth or subscription
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user exists but email not confirmed, redirect to verify email
  if (user && !session) {
    return <Navigate to="/verify-email" replace />;
  }

  // If not authenticated, redirect to login with return path
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading only while checking subscription for the first time
  if (subscriptionLoading && !subscriptionChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only redirect if:
  // 1. Subscription check has completed (subscriptionChecked is true)
  // 2. User is confirmed not subscribed (isSubscribed is false)
  // 3. We're not on the settings page (users should access settings to subscribe)
  const isSettingsPage = location.pathname === '/settings';
  const shouldRedirect = subscriptionChecked && !isSubscribed && !isSettingsPage;

  if (shouldRedirect) {
    return <Navigate to="/?pricing=true" replace />;
  }

  // Check if onboarding is required (only for new users on first dashboard access)
  // Don't redirect if user is already on onboarding page
  if (
    onboardingChecked && 
    !onboardingCompleted && 
    location.pathname === '/dashboard'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user completed onboarding and is on onboarding page, redirect to dashboard
  if (
    onboardingChecked && 
    onboardingCompleted && 
    location.pathname === '/onboarding'
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated (and subscribed or subscription check pending/errored), render children
  return <>{children}</>;
};

export default ProtectedRoute;

