import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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

    // If user was created successfully
    if (data.user) {
      // Check if email is confirmed
      const isEmailConfirmed = data.user.email_confirmed_at !== null && data.user.email_confirmed_at !== undefined;
      
      // Only set user and session if email is confirmed
      if (isEmailConfirmed && data.session) {
        setUser(data.user);
        setSession(data.session);
      } else {
        // Email not confirmed - don't set session, force email verification
        // Still set user so we know account was created
        setUser(data.user);
        setSession(null);
      }
      
      return { error: null };
    }

    // Return error only if user creation actually failed (no user object)
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user) {
      setUser(data.user);
      
      // Only set session if email is confirmed
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
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

