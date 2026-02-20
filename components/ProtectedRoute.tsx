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
          const { hasActiveSubscription } = await import('../services/subscriptionAccess');
          setIsSubscribed(hasActiveSubscription(settings));
          setSubscriptionChecked(true);
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
  // Also check user to ensure both are null (prevent stale state)
  if (!session || !user) {
    // Clear any stale state before redirecting
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
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

