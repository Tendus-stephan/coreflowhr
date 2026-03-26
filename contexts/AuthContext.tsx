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

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: new Error('AuthProvider not initialized') }),
  signIn: async () => ({ error: new Error('AuthProvider not initialized') }),
  signInWithGoogle: async () => ({ error: new Error('AuthProvider not initialized') }),
  signOut: async () => {},
  resetPassword: async () => ({ error: new Error('AuthProvider not initialized') }),
  verifyMFA: async () => ({ error: new Error('AuthProvider not initialized') }),
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`[Auth ${new Date().toISOString()}] AuthProvider mounted — calling getSession()`);

    // Safety net: force loading=false after 5 s if getSession() stalls.
    // Also clear any stale auth token from localStorage — this is the root cause of
    // new-user "stuck on signing in": the email-confirmation session stored after
    // signup causes getSession() to hang trying to refresh it, which holds the
    // Supabase SDK's internal auth lock. Any subsequent signInWithPassword() call
    // queues behind that lock and never proceeds. Clearing the token unblocks the lock
    // so the sign-in completes normally when the user clicks the button.
    const loadingTimeout = setTimeout(() => {
      try {
        const key = Object.keys(localStorage).find(
          k => k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (key) localStorage.removeItem(key);
      } catch { /* ignore */ }
      setLoading(false);
    }, 5000);

    // ── Initial session ──────────────────────────────────────────────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log(`[Auth ${new Date().toISOString()}] getSession() resolved: user=${!!session?.user} confirmed=${!!session?.user?.email_confirmed_at}`);
      try {
        if (session?.user?.email_confirmed_at) {
          // MFA check: if aal2 required but not yet met, expose user but not session.
          try {
            const { data: aal } = await Promise.race([
              supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
              setUser(session.user);
              setSession(null);
              return; // finally still runs → setLoading(false)
            }
          } catch {
            // AAL check failed or timed out — fail-open
          }
          setSession(session);
          setUser(session.user);
        } else if (session?.user) {
          // User exists but email not confirmed
          setUser(session.user);
          setSession(null);
        } else {
          setSession(null);
          // Don't overwrite a user set by signUp (unconfirmed)
          setUser(prev => (prev && !prev.email_confirmed_at ? prev : null));
        }
      } catch {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }).catch((error) => {
      const msg = (error?.message || '').toLowerCase();
      const isRefreshError = msg.includes('refresh token') || msg.includes('invalid refresh');
      const isOffline = !navigator.onLine || msg.includes('failed to fetch') ||
        msg.includes('networkerror') || msg.includes('timeout');

      if (isRefreshError) {
        // Stale/revoked refresh token — clear state and scrub the dead token from
        // localStorage so next page load doesn't re-attempt it. Safe here because
        // getSession().catch() only fires during initialisation, never during an
        // active sign-in (signInWithPassword handles its own session storage).
        setSession(null);
        setUser(null);
        try {
          const key = Object.keys(localStorage).find(
            k => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (key) localStorage.removeItem(key);
        } catch { /* ignore */ }
      } else if (isOffline) {
        console.warn('Network unavailable during session init. Retaining cached auth state.');
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // ── Auth state changes ───────────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth ${new Date().toISOString()}] onAuthStateChange: ${event} user=${!!session?.user} confirmed=${!!session?.user?.email_confirmed_at}`);
      // SIGNED_OUT fires for both explicit sign-outs and expired/revoked refresh tokens.
      // Only clear React state here — do NOT touch localStorage because SIGNED_OUT
      // also fires for the old session during a fresh sign-in (SDK fires SIGNED_OUT
      // for the replaced session BEFORE firing SIGNED_IN for the new one). Wiping
      // localStorage at that point would delete the newly-stored valid session.
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user?.email_confirmed_at) {
        // On SIGNED_IN, block the session if aal2 MFA is required but not yet verified.
        // Cap at 5 s so a hung AAL call doesn't prevent setSession() from ever firing.
        if (event === 'SIGNED_IN') {
          try {
            const { data: aal } = await Promise.race([
              supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
              setUser(session.user);
              setSession(null);
              setLoading(false);
              return;
            }
          } catch {
            // AAL check failed or timed out — fail-open
          }
        }
        setSession(session);
        setUser(session.user);
      } else if (session?.user) {
        setUser(session.user);
        setSession(null);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // NOTE: The periodic session-revocation check that was here (every 60 s:
    // getSession + trackSession + user_sessions query) has been removed.
    // ProtectedRoute already runs a background revocation check every 30 s on
    // every protected page, making this interval redundant and expensive.

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── signUp ─────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      // Cap at 3 s so a hanging RPC never blocks the signup button.
      const { data: userCheck, error: checkError } = await Promise.race([
        supabase.rpc('check_user_exists_and_verified', { user_email: email }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      if (checkError) {
        console.warn('[SignUp] Error checking if user exists:', checkError);
      } else if (userCheck && userCheck.length > 0) {
        const { user_exists, is_verified, has_mfa } = userCheck[0];
        if (user_exists && is_verified) {
          return {
            error: {
              message: has_mfa
                ? 'An account with this email already exists with multi-factor authentication enabled. Please sign in instead.'
                : 'An account with this email already exists. Please sign in instead.',
            },
          };
        }
      }
    } catch {
      // RPC failed — fail-open and continue with signup
    }

    let emailRedirectTo = `${window.location.origin}/auth/redirect`;
    try {
      const inviteToken = localStorage.getItem('workspaceInviteToken');
      if (inviteToken) {
        emailRedirectTo = `${window.location.origin}/invite?token=${encodeURIComponent(inviteToken)}`;
      }
    } catch { /* ignore */ }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || '' }, emailRedirectTo },
    });

    if (error) {
      const m = error.message?.toLowerCase() || '';
      if (m.includes('already registered') || m.includes('user already exists') || m.includes('already been registered')) {
        return { error: { ...error, message: 'An account with this email already exists. Please sign in instead.' } };
      }
      return { error };
    }

    if (data.user) {
      setUser(data.user);
      setSession(null);
      return { error: null };
    }

    return { error: { message: 'Failed to create account. Please try again.' } };
  };

  // ── signIn ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const t = (label: string) => console.log(`[Auth ${new Date().toISOString()}] ${label}`);

    t('signIn START');

    // 15 s hard cap on the auth request itself. The Supabase SDK holds an internal
    // lock while a background getSession() refresh is in progress — if that refresh
    // hangs (e.g. stale email-confirmation token for a brand-new account), every
    // subsequent auth call queues behind it and never resolves. The timeout surfaces
    // a clear error instead of leaving the button stuck forever.
    let signInResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
    try {
      t('signInWithPassword → calling...');
      signInResult = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('connection_slow')), 15000)
        ),
      ]);
      t('signInWithPassword → returned');
    } catch (e: any) {
      t(`signInWithPassword → ERROR: ${e?.message}`);
      if (e?.message === 'connection_slow') {
        return {
          error: { message: 'Sign-in is taking longer than expected. Please refresh the page and try again.' },
          requiresMFA: false,
        };
      }
      return { error: e, requiresMFA: false };
    }

    const { data, error } = signInResult;
    t(`signInWithPassword data: user=${!!data?.user} session=${!!data?.session} error=${error?.message}`);
    if (error) return { error, requiresMFA: false };
    if (!data.user) return { error: { message: 'Failed to sign in. Please try again.' }, requiresMFA: false };

    // ── AAL check BEFORE touching any React state ─────────────────────────────
    t('AAL check → calling...');
    let requiresMFA = false;
    try {
      const { data: aal, error: aalError } = await Promise.race([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      t(`AAL check → currentLevel=${aal?.currentLevel} nextLevel=${aal?.nextLevel} error=${aalError?.message}`);
      if (!aalError && aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        requiresMFA = true;
      }
    } catch (aalErr: any) {
      t(`AAL check → timed out or failed (${aalErr?.message}), trying listFactors...`);
      try {
        const { data: factors } = await Promise.race([
          supabase.auth.mfa.listFactors(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        t(`listFactors → totp=${factors?.totp?.length} all=${factors?.all?.length}`);
        const hasVerifiedTOTP =
          (factors?.totp ?? []).some((f: any) => f.status === 'verified') ||
          (factors?.all ?? []).some((f: any) => f.factor_type === 'totp' && f.status === 'verified');
        if (hasVerifiedTOTP) requiresMFA = true;
      } catch (fErr: any) { t(`listFactors → failed (${fErr?.message}), fail-open`); }
    }

    t(`requiresMFA=${requiresMFA} email_confirmed=${!!data.user.email_confirmed_at} session=${!!data.session}`);

    if (requiresMFA) {
      setUser(data.user);
      return { error: null, requiresMFA: true };
    }

    if (!data.user.email_confirmed_at) {
      return { error: { message: 'Please verify your email before signing in.' }, requiresMFA: false };
    }

    if (!data.session) {
      return { error: { message: 'Failed to establish session. Please try again.' }, requiresMFA: false };
    }

    // ── Set user + session in the same tick (no await between them) ───────────
    // React 18 batches synchronous state updates — setting both here ensures
    // PublicRoute always sees (user + session) together, never a partial state.
    t('setting user + session...');
    setUser(data.user);
    setSession(data.session);
    t('user + session set');

    // Track session — capped at 3 s so a slow DB call never blocks login.
    t('trackSession → calling...');
    try {
      const { trackSession } = await import('../services/api');
      await Promise.race([
        trackSession(),
        new Promise<void>(resolve => setTimeout(resolve, 3000)),
      ]);
      t('trackSession → done');
    } catch (tsErr: any) { t(`trackSession → error (${tsErr?.message})`); }

    t('signIn DONE → returning success');
    return { error: null, requiresMFA: false };
  };

  // ── verifyMFA ──────────────────────────────────────────────────────────────
  const verifyMFA = async (code: string) => {
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) return { error: new Error('Failed to retrieve 2FA setup. Please try again.') };

      const totpFactors = factors?.totp || [];
      const allFactors = factors?.all || [];
      const totpInAll = allFactors.find((f: any) => f.factor_type === 'totp');

      if (totpFactors.length === 0 && !totpInAll) {
        return { error: new Error('2FA not properly set up. Please try enabling it again.') };
      }

      const factor = totpFactors[0] || totpInAll;

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) return { error: challengeError };

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code,
      }) as any;

      if (verifyError) return { error: verifyError };

      let mfaSession = verifyData.session ?? null;
      if (!mfaSession) {
        const { data: { session: fallback } } = await supabase.auth.getSession();
        mfaSession = fallback ?? null;
      }

      if (mfaSession) {
        setSession(mfaSession);
        setUser(mfaSession.user);
        try {
          const { trackSession } = await import('../services/api');
          await trackSession();
        } catch { /* non-critical */ }
      } else {
        return { error: new Error('MFA verified but session could not be established. Please sign in again.') };
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // ── signInWithGoogle ───────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/redirect` },
    });
    return { error };
  };

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    setUser(null);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the API call fails, proceed with local cleanup
    }
    try {
      sessionStorage.clear();
      localStorage.removeItem('testMode');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-' + window.location.hostname.split('.')[0] + '-auth-token');
    } catch { /* ignore */ }
    window.history.replaceState(null, '', '/login');
    window.location.href = '/login';
  };

  // ── resetPassword ──────────────────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, verifyMFA }}>
      {children}
    </AuthContext.Provider>
  );
};
