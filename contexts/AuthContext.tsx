import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; requiresMFA?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyMFA: (code: string) => Promise<{ error: any }>;
}

// Create a default context value to prevent errors during HMR
const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: new Error('AuthProvider not initialized') }),
  signIn: async () => ({ error: new Error('AuthProvider not initialized') }),
  signInWithGoogle: async () => ({ error: new Error('AuthProvider not initialized') }),
  signOut: async () => {},
  resetPassword: async () => ({ error: new Error('AuthProvider not initialized') }),
  verifyMFA: async () => ({ error: new Error('AuthProvider not initialized') })
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // During HMR, context might temporarily be the default value
  // This is safe - the component will re-render once AuthProvider re-initializes
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if both getSession() and onAuthStateChange somehow fail to clear
    // loading (e.g. a hung token-refresh request with no network timeout), force it
    // after 5 s so PublicRoute never shows a permanent spinner on login/signup.
    const loadingTimeout = setTimeout(() => setLoading(false), 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        // Only set session if email is confirmed
        if (session?.user?.email_confirmed_at) {
          // Check MFA requirement — if the stored session is aal1 but aal2 is required,
          // expose user but NOT session so the user is prompted for their TOTP code.
          try {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
              setUser(session.user);
              setSession(null);
              return; // finally block still runs → setLoading(false)
            }
          } catch {
            // AAL check failed — fail-open and set session
          }
          // Don't check for revocation on initial load - session might not be tracked yet
          // Session revocation check will happen on ProtectedRoute navigation
          setSession(session);
          setUser(session.user);
        } else if (session?.user) {
          // User exists but email not confirmed - set user but NOT session
          setUser(session.user);
          setSession(null);
        } else {
          // No session - don't overwrite a user that was just set by signUp (unconfirmed)
          setSession(null);
          setUser(prev => (prev && !prev.email_confirmed_at ? prev : null));
        }
      } catch (error) {
        // Ensure we always set loading to false and handle errors gracefully
        console.error('Error in session initialization:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }).catch((error) => {
      // Handle any errors in getSession itself
      const msg = (error?.message || '').toLowerCase();
      const isRefreshError = msg.includes('refresh token') || msg.includes('invalid refresh');
      const isOffline = !navigator.onLine || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout');

      if (isRefreshError) {
        // Stale or revoked refresh token — clear React state AND scrub localStorage
        // so the next page load doesn't re-attempt the dead token.
        setSession(null);
        setUser(null);
        try {
          const authKey = Object.keys(localStorage).find(
            k => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (authKey) localStorage.removeItem(authKey);
        } catch { /* ignore */ }
      } else if (isOffline) {
        // Network is down — don't wipe auth state, just stop loading
        console.warn('Network unavailable during session init. Retaining cached auth state.');
      } else {
        console.error('Error getting session:', error);
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // SIGNED_OUT fires for both explicit sign-outs and refresh-token failures.
      // Belt-and-suspenders: also wipe the Supabase auth entry from localStorage so
      // the next page load doesn't re-attempt the dead refresh token and log a noisy
      // "Invalid Refresh Token: Refresh Token Not Found" console error.
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        try {
          const authKey = Object.keys(localStorage).find(
            k => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (authKey) localStorage.removeItem(authKey);
        } catch { /* ignore */ }
        setLoading(false);
        return;
      }

      // Only set session if email is confirmed
      if (session?.user?.email_confirmed_at) {
        // On SIGNED_IN, verify the AAL is sufficient before exposing the session.
        // If MFA is enabled and the user hasn't verified their TOTP yet, the session
        // will be aal1 while nextLevel is aal2. Exposing it here would let PublicRoute
        // redirect them to /auth/redirect before Login shows the MFA form.
        if (event === 'SIGNED_IN') {
          try {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
              // MFA required but not yet verified — expose user but NOT session.
              // signIn() will return { requiresMFA: true } and show the TOTP form.
              setUser(session.user);
              setSession(null);
              setLoading(false);
              return;
            }
          } catch {
            // AAL check failed — fall through and set session (fail-open)
          }
        }
        // Don't check for revocation on auth state change - let ProtectedRoute handle it
        // This prevents blocking valid sessions during sign-in
        setSession(session);
        setUser(session.user);
      } else if (session?.user) {
        // User exists but email not confirmed - set user but NOT session
        setUser(session.user);
        setSession(null);
      } else {
        // No session
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // Periodically check if session was revoked (every 60 seconds, less frequent)
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user?.email_confirmed_at) {
        try {
          const sessionToken = currentSession.access_token;
          if (sessionToken) {
            // Track session in background (fire-and-forget)
            const { trackSession } = await import('../services/api');
            trackSession().catch(() => {
              // Silently fail - tracking is non-critical
            });

            // Check if session still exists (with timeout)
            const checkPromise = supabase
              .from('user_sessions')
              .select('id')
              .eq('session_token', sessionToken)
              .eq('user_id', currentSession.user.id)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            const { data: sessionRecord, error } = await Promise.race([
              checkPromise,
              timeoutPromise
            ]) as any;

            // If session doesn't exist and no error, try tracking it first before revoking
            if (!error && !sessionRecord) {
              // Try to track the session (in case it wasn't tracked yet)
              try {
                await trackSession();
                // Wait a moment for the database to update
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check again after tracking
                const retryCheck = await supabase
                  .from('user_sessions')
                  .select('id')
                  .eq('session_token', sessionToken)
                  .eq('user_id', currentSession.user.id)
                  .maybeSingle();
                
                // If still not found after tracking, it was likely revoked
                if (!retryCheck.data) {
                  console.log('Session revoked detected in AuthContext, signing out...');
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                }
              } catch (trackError) {
                // If tracking fails, don't immediately revoke - might be a temporary issue
                console.warn('Session tracking failed during periodic check:', trackError);
              }
            }
          }
        } catch (error) {
          // Ignore errors - session might be valid but table doesn't exist or timeout
          // Don't log timeouts to avoid noise
          if (!error?.message?.includes('Timeout')) {
            console.warn('Error in periodic session check:', error);
          }
        }
      }
    }, 60000); // Check every 60 seconds (reduced frequency)

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    // Check if user already exists, is verified, and has MFA enabled using SQL function
    // This prevents sending verification emails to existing verified users
    try {
      // Cap at 3 s — a hanging RPC should not block the signup button forever.
      const { data: userCheck, error: checkError } = await Promise.race([
        supabase.rpc('check_user_exists_and_verified', { user_email: email }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      if (checkError) {
        // Log the error but don't block signup (fail open)
        console.warn('[SignUp] Error checking if user exists:', checkError);
        // If function doesn't exist, continue with signup
        // This allows the app to work even if the function hasn't been created yet
      } else if (userCheck && userCheck.length > 0) {
        const { user_exists, is_verified, has_mfa } = userCheck[0];
        
        // Debug logging
        console.log('[SignUp] User check result:', {
          email,
          user_exists,
          is_verified,
          has_mfa
        });
        
        // If user exists and is verified, block signup
        if (user_exists && is_verified) {
          // If MFA is enabled, mention it in the error message
          if (has_mfa) {
            return { error: { message: 'An account with this email already exists with multi-factor authentication enabled. Please sign in instead.' } };
          }
          return { error: { message: 'An account with this email already exists. Please sign in instead.' } };
        }
        // If user exists but is NOT verified, allow signup to proceed (will resend verification email)
      }
    } catch (err) {
      // If RPC call fails, log but continue with signup (fail open)
      console.warn('[SignUp] Exception checking if user exists:', err);
    }

    // Determine redirect after email confirmation:
    // - For regular signups, go to /auth/redirect so subscription/onboarding checks run first
    // - For invite-based signups, return to /invite so the workspace invite can be accepted
    let emailRedirectTo = `${window.location.origin}/auth/redirect`;
    try {
      if (typeof window !== 'undefined') {
        const inviteToken = localStorage.getItem('workspaceInviteToken');
        if (inviteToken) {
          emailRedirectTo = `${window.location.origin}/invite?token=${encodeURIComponent(inviteToken)}`;
        }
      }
    } catch {
      // Ignore storage issues and fall back to dashboard
    }

    // Proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
        emailRedirectTo,
      },
    });

    // Check for explicit errors (like "user already registered" when confirmations are disabled)
    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('user already exists') ||
        errorMessage.includes('already been registered')
      ) {
        return { error: { ...error, message: 'An account with this email already exists. Please sign in instead.' } };
      }
      return { error };
    }

    // If user was created successfully (or existing unverified user), proceed with verification flow
    if (data.user) {
      // Don't set session until email is confirmed
      setUser(data.user);
      setSession(null);
      return { error: null };
    }

    // No user object returned - signup failed
    return { error: error || { message: 'Failed to create account. Please try again.' } };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error, requiresMFA: false };
    }

    if (data.user) {
      setUser(data.user);
      
      // Check Authenticator Assurance Level (AAL) - proper way to check MFA status
      // AAL2 means MFA is required, AAL1 means password-only
      try {
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (!aalError && aal) {
          // If nextLevel is 'aal2' and different from currentLevel, MFA is required
          if (aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
            // MFA is enabled and required - return special indicator
            return { error: null, requiresMFA: true };
          }
        }
      } catch (aalCheckError) {
        // If AAL check fails, fall back to explicitly checking enrolled MFA factors.
        // NOTE: do NOT gate this on !data.session — signInWithPassword always returns a
        // session on success, so that gate would silently skip the MFA check entirely.
        console.warn('Could not check AAL, falling back to factor check:', aalCheckError);

        if (!data.user.email_confirmed_at) {
          return { error: { message: 'Please verify your email before signing in.' }, requiresMFA: false };
        }

        // Confirm the user actually has a verified TOTP factor before sending to MFA screen.
        try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const hasVerifiedTOTP =
            (factors?.totp ?? []).some((f: any) => f.status === 'verified') ||
            (factors?.all ?? []).some((f: any) => f.factor_type === 'totp' && f.status === 'verified');
          if (hasVerifiedTOTP) {
            return { error: null, requiresMFA: true };
          }
        } catch {
          // Can't confirm factors — fall through to normal session handling
        }
        // No verified MFA factor found — fall through to normal login flow below
      }
      
      // Only set session if email is confirmed and we have a session
      if (data.user.email_confirmed_at && data.session) {
        setSession(data.session);

        // Track session — capped at 3 s so a slow DB query never blocks login.
        // ProtectedRoute has its own retry if the session isn't tracked yet.
        try {
          const { trackSession } = await import('../services/api');
          await Promise.race([
            trackSession(),
            new Promise<void>(resolve => setTimeout(resolve, 3000)),
          ]);
        } catch (err) {
          console.error('Failed to track session:', err);
        }
      } else {
        // Email not confirmed - don't set session
        setSession(null);
        if (!data.user.email_confirmed_at) {
          return { error: { message: 'Please verify your email before signing in.' }, requiresMFA: false };
        }
      }
    }

    return { error: null, requiresMFA: false };
  };

  const verifyMFA = async (code: string) => {
    try {
      // Get MFA factors - check both totp array and all array
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        return { error: new Error('Failed to retrieve 2FA setup. Please try again.') };
      }

      // Check both totp array and all array for TOTP factors
      const totpFactors = factors?.totp || [];
      const allFactors = factors?.all || [];
      const totpInAll = allFactors.find((f: any) => f.factor_type === 'totp');
      
      if (totpFactors.length === 0 && !totpInAll) {
        return { error: new Error('2FA not properly set up. Please try enabling it again.') };
      }

      // Use factor from totp array if available, otherwise from all array
      const factor = totpFactors[0] || totpInAll;

      // Challenge the factor
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (challengeError) {
        return { error: challengeError };
      }

      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code,
      }) as any;

      if (verifyError) {
        return { error: verifyError };
      }

      // MFA verified — get the session.
      // verifyData.session is present in most SDK versions, but fall back to
      // getSession() in case the SDK omits it (e.g., older Supabase versions).
      let mfaSession = verifyData.session ?? null;
      if (!mfaSession) {
        const { data: { session: fallback } } = await supabase.auth.getSession();
        mfaSession = fallback ?? null;
      }

      if (mfaSession) {
        setSession(mfaSession);
        setUser(mfaSession.user);

        // Track session in database
        try {
          const { trackSession } = await import('../services/api');
          await trackSession();
        } catch (err) {
          console.error('Failed to track session:', err);
        }
      } else {
        // Verification succeeded but we have no usable session — treat as error
        // so the user isn't left in a logged-in-but-sessionless limbo.
        return { error: new Error('MFA verified but session could not be established. Please sign in again.') };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error };
    }
  };

  const signInWithGoogle = async () => {
    // Always land on /auth/redirect after OAuth so we can run subscription +
    // onboarding checks before choosing a destination. The invite token (if any)
    // is read from localStorage inside resolvePostLoginDestination.
    const redirectTo = `${window.location.origin}/auth/redirect`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear state immediately for instant UI feedback
    setUser(null);
    setSession(null);
    
    // Sign out from Supabase first (synchronously wait for it)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Even if signOut fails, continue with local state clearing
      console.warn('Sign out error (non-critical):', error);
    }
    
    // Clear all cached authentication data
    if (typeof window !== 'undefined') {
      // Clear sessionStorage (used for loader state, etc.)
      sessionStorage.clear();
      // Clear any auth-related localStorage
      localStorage.removeItem('testMode'); // Remove test mode if it exists
      // Clear any other cached data
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + window.location.hostname.split('.')[0] + '-auth-token');
      } catch (e) {
        // Ignore errors
      }
      
      // Replace current history entry with login page (prevents back button access)
      window.history.replaceState(null, '', '/login');
      // Force full page reload to clear all React state and re-initialize auth
      window.location.href = '/login';
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    verifyMFA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

