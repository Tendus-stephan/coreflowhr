import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; requiresMFA?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyMFA: (code: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        // Only set session if email is confirmed
        if (session?.user?.email_confirmed_at) {
          // Don't check for revocation on initial load - session might not be tracked yet
          // Session revocation check will happen on ProtectedRoute navigation
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
      console.error('Error getting session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Only set session if email is confirmed
      if (session?.user?.email_confirmed_at) {
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
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    // Check if user already exists, is verified, and has MFA enabled using SQL function
    // This prevents sending verification emails to existing verified users
    try {
      const { data: userCheck, error: checkError } = await supabase.rpc('check_user_exists_and_verified', {
        user_email: email
      });

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

    // Proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
        // If AAL check fails, fall back to checking if session exists
        console.warn('Could not check AAL, falling back to session check:', aalCheckError);
        
        // If no session but user exists, might be MFA or email verification
        if (!data.session) {
          // Check email confirmation status first
          if (!data.user.email_confirmed_at) {
            return { error: { message: 'Please verify your email before signing in.' }, requiresMFA: false };
          }
          
          // Email confirmed but no session - likely MFA required
          return { error: null, requiresMFA: true };
        }
      }
      
      // Only set session if email is confirmed and we have a session
      if (data.user.email_confirmed_at && data.session) {
        setSession(data.session);
        
        // Track session in database - wait for it to complete to avoid race conditions
        try {
          const { trackSession } = await import('../services/api');
          await trackSession();
        } catch (err) {
          console.error('Failed to track session:', err);
          // Don't fail login if tracking fails, but log the error
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

      // MFA verified - get the session
      if (verifyData.session) {
        setSession(verifyData.session);
        setUser(verifyData.session.user);
        
        // Track session in database
        try {
          const { trackSession } = await import('../services/api');
          await trackSession();
        } catch (err) {
          console.error('Failed to track session:', err);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error: error };
    }
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
    signOut,
    resetPassword,
    verifyMFA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

