import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

// Decode the 'aal' claim from a JWT access token without verifying the signature.
// Used only for the fast-path optimisation in readStoredSession — the authoritative
// check is always the async getAuthenticatorAssuranceLevel() call.
function getJwtAal(accessToken: string): string | undefined {
  try {
    const payload = accessToken.split('.')[1];
    // JWT uses base64url — convert to standard base64 before atob()
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payload.length + (4 - payload.length % 4) % 4, '='
    );
    return JSON.parse(atob(base64))?.aal;
  } catch {
    return undefined;
  }
}

// Read the stored Supabase session from localStorage synchronously so the first
// render already reflects the correct auth state. This eliminates the ~4 s flash
// where navbar shows "Sign in / Get Started" for a returning logged-in user while
// getSession() is resolving. Only seeds state for fully confirmed sessions that have
// a refresh_token (excludes transient email-confirmation tokens).
//
// MFA guard: if the stored session is AAL1 AND the user has verified TOTP factors,
// MFA verification is still required. In that case we return the user (so the page
// doesn't flash as unauthenticated) but NOT the session, and set needsMFACheck=true
// so loading stays true until the async AAL check completes. Without this guard,
// Supabase's INITIAL_SESSION event would set the session before the AAL check runs
// and AuthRedirect would navigate to the dashboard, bypassing MFA entirely.
function readStoredSession(): { user: SupabaseUser | null; session: Session | null; needsMFACheck: boolean } {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (key) {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      if (
        stored?.user &&
        stored?.refresh_token &&
        stored?.access_token &&
        stored.user.email_confirmed_at
      ) {
        const aal = getJwtAal(stored.access_token);
        // Only fast-path sessions that are already at AAL2 (MFA verified).
        // For AAL1 sessions we cannot know from localStorage alone whether
        // MFA is required — user.factors is often absent from the stored
        // object. Keep loading=true and let the async INITIAL_SESSION / getSession()
        // AAL check decide, so AuthRedirect never races ahead to /dashboard.
        if (aal !== 'aal2') {
          return { user: stored.user as SupabaseUser, session: null, needsMFACheck: true };
        }
        return { user: stored.user as SupabaseUser, session: stored as Session, needsMFACheck: false };
      }
    }
  } catch { /* ignore — SSR or corrupted storage */ }
  return { user: null, session: null, needsMFACheck: false };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const cached = readStoredSession();
  const [user, setUser] = useState<SupabaseUser | null>(cached.user);
  const [session, setSession] = useState<Session | null>(cached.session);
  // Skip the loading spinner for confirmed cached sessions. Exception: when
  // needsMFACheck is true (AAL1 session + verified MFA factors), we must keep
  // loading=true so AuthRedirect/ProtectedRoute wait for the async AAL check
  // instead of racing to navigate while the session is in a partially-set state.
  const [loading, setLoading] = useState(cached.user === null || cached.needsMFACheck);
  // Flag set during an active signIn() call. The Supabase SDK fires SIGNED_OUT for the
  // old session BEFORE firing SIGNED_IN for the new one. Suppressing SIGNED_OUT state
  // clearing during signIn prevents ProtectedRoute from redirecting to /login mid-flight.
  const isSigningIn = useRef(false);
  // Tracks whether MFA is pending (user set, session null, awaiting TOTP code).
  // Used to re-run the AAL check on TOKEN_REFRESHED so an inactivity token refresh
  // doesn't silently grant a full session while the user is on the MFA entry screen.
  const mfaPendingRef = useRef(false);

  useEffect(() => {
    console.log(`[Auth ${new Date().toISOString()}] AuthProvider mounted — calling getSession()`);

    // Tracks whether getSession() has returned (success or error).
    // The loadingTimeout below MUST NOT remove the localStorage token if getSession()
    // already resolved cleanly — doing so would destroy the session on the next hard
    // page reload (e.g. window.location.replace after onboarding) and log the user out.
    let sessionResolved = false;

    // Safety net: force loading=false after 5 s if getSession() stalls.
    // Only clear the stale auth token when getSession() is STILL hanging — this is the
    // root cause of new-user "stuck on signing in": the email-confirmation session
    // stored after signup causes getSession() to hang trying to refresh it, which holds
    // the Supabase SDK's internal auth lock. Clearing the token unblocks the lock.
    // If getSession() already resolved (sessionResolved=true), leave the token alone.
    const loadingTimeout = setTimeout(() => {
      if (sessionResolved) return; // getSession() resolved fine — do NOT touch the token
      try {
        const key = Object.keys(localStorage).find(
          k => k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (key) {
          // Only remove the token if it lacks a refresh_token. That pattern identifies
          // transient email-confirmation tokens (one-time links) which cause getSession()
          // to hang indefinitely holding the SDK's internal auth lock. Valid sessions
          // always have a refresh_token — removing those evicts established sessions on
          // slow networks and is the root cause of "logged out after tab reopen".
          try {
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            if (!stored?.refresh_token) localStorage.removeItem(key);
          } catch {
            localStorage.removeItem(key); // corrupt token — safe to remove
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }, 8000);

    // ── Initial session ──────────────────────────────────────────────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      sessionResolved = true; // Mark immediately — before any async work inside .then()
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
              mfaPendingRef.current = true;
              setUser(session.user);
              setSession(null);
              return; // finally still runs → setLoading(false)
            }
          } catch {
            // AAL check failed or timed out — fail-open
          }
          mfaPendingRef.current = false;
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
      sessionResolved = true; // Even on error — don't let the timeout remove the token
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
      //
      // Additionally: if we are mid-signIn(), suppress the SIGNED_OUT clearing entirely.
      // The signIn() function will set the correct user+session after signInWithPassword
      // resolves. Without this guard, the SIGNED_OUT event briefly clears auth state and
      // ProtectedRoute redirects authenticated users to /login.
      if (event === 'SIGNED_OUT') {
        if (isSigningIn.current) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user?.email_confirmed_at) {
        // Run the AAL check on SIGNED_IN, INITIAL_SESSION, and TOKEN_REFRESHED-while-pending.
        // INITIAL_SESSION fires synchronously when onAuthStateChange is attached (Supabase
        // ≥ 2.65) and previously bypassed the AAL check, letting the stored AAL1 session
        // through before getSession() could block it — the user would land on /dashboard
        // without entering their MFA code.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || (event === 'TOKEN_REFRESHED' && mfaPendingRef.current)) {
          try {
            const { data: aal } = await Promise.race([
              supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
              mfaPendingRef.current = true;
              setUser(session.user);
              setSession(null);
              setLoading(false);
              return;
            }
          } catch {
            // AAL check failed or timed out — fail-open
          }
        }
        mfaPendingRef.current = false;
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

    let signUpResult: Awaited<ReturnType<typeof supabase.auth.signUp>>;
    try {
      signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || '' }, emailRedirectTo },
      });
    } catch (e: any) {
      const m = (e?.message || '').toLowerCase();
      if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network')) {
        return { error: { message: 'Connection error. Please check your internet and try again.' } };
      }
      return { error: e };
    }

    const { data, error } = signUpResult;

    if (error) {
      const m = error.message?.toLowerCase() || '';
      if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network')) {
        return { error: { message: 'Connection error. Please check your internet and try again.' } };
      }
      if (m.includes('already registered') || m.includes('user already exists') || m.includes('already been registered')) {
        return { error: { ...error, message: 'An account with this email already exists. Please sign in instead.' } };
      }
      return { error };
    }

    if (data.user) {
      // Supabase v2 silently succeeds for existing verified emails by returning a
      // user with an empty identities array instead of an error. Detect this and
      // surface a proper duplicate-account error so the user isn't sent to /verify-email.
      if (!data.user.identities || data.user.identities.length === 0) {
        return {
          error: {
            message: 'An account with this email already exists. Please sign in instead.',
          },
        };
      }
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
    //
    // isSigningIn is set for the duration of signInWithPassword — the SDK fires
    // SIGNED_OUT for the old session during this call. The onAuthStateChange handler
    // skips SIGNED_OUT while isSigningIn is true so ProtectedRoute doesn't redirect
    // authenticated users to /login mid-flight.
    let signInResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
    try {
      t('signInWithPassword → calling...');
      isSigningIn.current = true;
      signInResult = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('connection_slow')), 15000)
        ),
      ]);
      t('signInWithPassword → returned');
    } catch (e: any) {
      t(`signInWithPassword → ERROR: ${e?.message}`);
      isSigningIn.current = false;
      if (e?.message === 'connection_slow') {
        return {
          error: { message: 'Sign-in is taking longer than expected. Please refresh the page and try again.' },
          requiresMFA: false,
        };
      }
      return { error: e, requiresMFA: false };
    } finally {
      // Ensure flag is cleared even if an unexpected throw occurs
      isSigningIn.current = false;
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
      mfaPendingRef.current = true;
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
    mfaPendingRef.current = false;
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
        mfaPendingRef.current = false;
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
    mfaPendingRef.current = false;
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
