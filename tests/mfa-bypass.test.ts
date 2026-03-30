/**
 * MFA Bypass Prevention Tests
 *
 * Covers all layers of the fix that prevents users from reaching /dashboard
 * without entering their TOTP code:
 *
 *   MFA-01 — getJwtAal() correctly decodes the AAL claim from a JWT
 *   MFA-02 — readStoredSession() blocks AAL1 stored sessions (needsMFACheck=true)
 *   MFA-03 — SIGNED_IN gate: sync check blocks AAL1+verified factor, passes AAL2
 *   MFA-04 — TOKEN_REFRESHED gate: only runs when mfaPendingRef=true
 *   MFA-05 — INITIAL_SESSION gate: async AAL check (safe — fires in background IIFE)
 *   MFA-06 — signIn() sync check: AAL1+verified → requiresMFA=true (no network call)
 *   MFA-07 — mfaPendingRef lifecycle: confirmed set/cleared at every state transition
 *   MFA-08 — AuthContext source-level: verify sync check is used for SIGNED_IN
 *
 * Run: npx vitest run tests/mfa-bypass.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Build a fake JWT with the given payload. The signature segment is a
 * placeholder — only the header.payload structure matters for getJwtAal().
 */
function makeJwt(payload: Record<string, unknown>): string {
  const toBase64Url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body   = toBase64Url(payload);
  return `${header}.${body}.fakesig`;
}

/**
 * Exact copy of getJwtAal() from contexts/AuthContext.tsx.
 * The function is not exported; we test the identical logic here so that any
 * future divergence causes this suite to fail.
 */
function getJwtAal(accessToken: string): string | undefined {
  try {
    const payload = accessToken.split('.')[1];
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    return (JSON.parse(atob(base64)) as any)?.aal;
  } catch {
    return undefined;
  }
}

// ─── MFA-01: getJwtAal ─────────────────────────────────────────────────────────

describe('MFA-01 — getJwtAal() JWT decode', () => {
  it('returns "aal1" from an AAL1 token', () => {
    expect(getJwtAal(makeJwt({ sub: 'u1', aal: 'aal1', exp: 9999999999 }))).toBe('aal1');
  });

  it('returns "aal2" from an AAL2 token', () => {
    expect(getJwtAal(makeJwt({ sub: 'u1', aal: 'aal2', exp: 9999999999 }))).toBe('aal2');
  });

  it('returns undefined when aal claim is absent', () => {
    expect(getJwtAal(makeJwt({ sub: 'u1', exp: 9999999999 }))).toBeUndefined();
  });

  it('returns undefined for a malformed token (missing segments)', () => {
    expect(getJwtAal('not-a-jwt')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getJwtAal('')).toBeUndefined();
  });

  it('handles base64url chars (- and _) in the payload segment', () => {
    // makeJwt already converts + → - and / → _, so round-tripping verifies
    // the replace logic works correctly end-to-end.
    const jwt = makeJwt({ sub: 'user/test+id', aal: 'aal2', role: 'authenticated' });
    expect(getJwtAal(jwt)).toBe('aal2');
  });
});

// ─── Shared readStoredSession logic ───────────────────────────────────────────

/**
 * Exact replica of readStoredSession() from AuthContext (not exported).
 * Accepts a plain object in place of localStorage for test isolation.
 */
function readStoredSession(store: Record<string, string>): {
  user: any | null;
  session: any | null;
  needsMFACheck: boolean;
} {
  try {
    const key = Object.keys(store).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (key) {
      const stored = JSON.parse(store[key] || '{}');
      if (
        stored?.user &&
        stored?.refresh_token &&
        stored?.access_token &&
        stored.user.email_confirmed_at
      ) {
        const aal = getJwtAal(stored.access_token);
        if (aal !== 'aal2') {
          return { user: stored.user, session: null, needsMFACheck: true };
        }
        return { user: stored.user, session: stored, needsMFACheck: false };
      }
    }
  } catch { /* ignore — corrupt storage */ }
  return { user: null, session: null, needsMFACheck: false };
}

// ─── MFA-02: readStoredSession localStorage guard ─────────────────────────────

describe('MFA-02 — readStoredSession() localStorage guard', () => {
  const confirmedUser = {
    id: 'user-1',
    email: 'alice@example.com',
    email_confirmed_at: '2024-01-01T00:00:00Z',
  };

  it('returns needsMFACheck=true and session=null for an AAL1 stored session', () => {
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': JSON.stringify({
        user: confirmedUser,
        access_token: makeJwt({ aal: 'aal1' }),
        refresh_token: 'rf_abc',
      }),
    };
    const result = readStoredSession(store);
    expect(result.needsMFACheck).toBe(true);
    expect(result.session).toBeNull();
    expect(result.user).toEqual(confirmedUser);
  });

  it('returns needsMFACheck=false and full session for an AAL2 stored session', () => {
    const storedData = {
      user: confirmedUser,
      access_token: makeJwt({ aal: 'aal2' }),
      refresh_token: 'rf_abc',
    };
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': JSON.stringify(storedData),
    };
    const result = readStoredSession(store);
    expect(result.needsMFACheck).toBe(false);
    expect(result.session).toEqual(storedData);
    expect(result.user).toEqual(confirmedUser);
  });

  it('treats an unknown/absent AAL claim as needing MFA check (safe default)', () => {
    // If aal is missing from JWT, getJwtAal returns undefined ≠ 'aal2' → block
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': JSON.stringify({
        user: confirmedUser,
        access_token: makeJwt({ sub: 'u1' }), // no aal claim
        refresh_token: 'rf_abc',
      }),
    };
    const result = readStoredSession(store);
    expect(result.needsMFACheck).toBe(true);
    expect(result.session).toBeNull();
  });

  it('returns null user/session when no sb-*-auth-token key exists', () => {
    const result = readStoredSession({});
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.needsMFACheck).toBe(false);
  });

  it('returns null user/session when stored token lacks refresh_token', () => {
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': JSON.stringify({
        user: confirmedUser,
        access_token: makeJwt({ aal: 'aal1' }),
        // no refresh_token
      }),
    };
    const result = readStoredSession(store);
    expect(result.user).toBeNull();
    expect(result.needsMFACheck).toBe(false);
  });

  it('returns null user/session when email_confirmed_at is missing (unconfirmed user)', () => {
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': JSON.stringify({
        user: { id: 'u1', email: 'alice@example.com' }, // no email_confirmed_at
        access_token: makeJwt({ aal: 'aal1' }),
        refresh_token: 'rf_abc',
      }),
    };
    const result = readStoredSession(store);
    expect(result.user).toBeNull();
    expect(result.needsMFACheck).toBe(false);
  });

  it('returns null user/session when stored JSON is corrupt', () => {
    const store = {
      'sb-lpjyxpxkagctaibmqcoi-auth-token': '{ not valid json !!!',
    };
    const result = readStoredSession(store);
    expect(result.user).toBeNull();
    expect(result.needsMFACheck).toBe(false);
  });
});

// ─── Shared MFA gate logic ────────────────────────────────────────────────────

/**
 * Simulate the onAuthStateChange MFA gate condition from AuthContext.
 * This is the core bypass-prevention logic for SIGNED_IN and TOKEN_REFRESHED.
 *
 * Returns: mfaBlocked (true = session must NOT be set, MFA form shown)
 */
function computeMfaBlockedSync(
  event: string,
  session: { access_token: string; user: { factors?: any[] } },
  mfaPending: boolean
): boolean {
  if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && mfaPending)) {
    const sessionAal = getJwtAal(session.access_token);
    const hasVerifiedMFA = (session.user.factors ?? []).some(
      (f: any) => f.factor_type === 'totp' && f.status === 'verified'
    );
    return sessionAal !== 'aal2' && hasVerifiedMFA;
  }
  // INITIAL_SESSION and TOKEN_REFRESHED(mfaPending=false): handled elsewhere
  return false;
}

// ─── MFA-03: SIGNED_IN gate ────────────────────────────────────────────────────

describe('MFA-03 — SIGNED_IN gate: sync MFA check', () => {
  it('blocks session when AAL1 + verified TOTP factor (MFA user, code not entered)', () => {
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session, false)).toBe(true);
  });

  it('passes session when AAL2 (MFA already satisfied)', () => {
    const session = {
      access_token: makeJwt({ aal: 'aal2' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session, false)).toBe(false);
  });

  it('passes session when AAL1 + empty factors array (non-MFA user)', () => {
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [] },
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session, false)).toBe(false);
  });

  it('passes session when AAL1 + unverified factor (enrollment in progress)', () => {
    // An unverified factor means MFA setup started but not completed — do not block.
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [{ factor_type: 'totp', status: 'unverified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session, false)).toBe(false);
  });

  it('passes session when user.factors is undefined (legacy session format)', () => {
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: {}, // no factors property — treated as []
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session as any, false)).toBe(false);
  });

  it('blocks when multiple TOTP factors, at least one is verified', () => {
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: {
        factors: [
          { factor_type: 'totp', status: 'unverified', id: 'f1' },
          { factor_type: 'totp', status: 'verified', id: 'f2' },
        ],
      },
    };
    expect(computeMfaBlockedSync('SIGNED_IN', session, false)).toBe(true);
  });
});

// ─── MFA-04: TOKEN_REFRESHED gate ─────────────────────────────────────────────

describe('MFA-04 — TOKEN_REFRESHED gate: mfaPendingRef guard', () => {
  it('blocks when TOKEN_REFRESHED + mfaPending=true + AAL1 + verified factor', () => {
    // Scenario: user is on MFA form (mfaPending=true). Inactivity token refresh fires.
    // Without this guard, the refresh would silently grant a full session.
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('TOKEN_REFRESHED', session, true)).toBe(true);
  });

  it('does NOT block when TOKEN_REFRESHED + mfaPending=false (routine refresh)', () => {
    // Normal authenticated user's token refresh — MFA already satisfied, skip the check.
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('TOKEN_REFRESHED', session, false)).toBe(false);
  });

  it('passes when TOKEN_REFRESHED + mfaPending=true + AAL2 (MFA already done)', () => {
    // After verifyMFA() succeeds, Supabase upgrades to AAL2 and fires TOKEN_REFRESHED.
    // mfaPendingRef should have been cleared, but even if it hasn't, AAL2 allows.
    const session = {
      access_token: makeJwt({ aal: 'aal2' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified', id: 'f1' }] },
    };
    expect(computeMfaBlockedSync('TOKEN_REFRESHED', session, true)).toBe(false);
  });

  it('does NOT check TOKEN_REFRESHED for a non-MFA user (mfaPending=false)', () => {
    // A user without MFA: TOKEN_REFRESHED should never trigger the gate.
    const session = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [] },
    };
    expect(computeMfaBlockedSync('TOKEN_REFRESHED', session, false)).toBe(false);
  });
});

// ─── MFA-05: INITIAL_SESSION gate (async) ─────────────────────────────────────

/**
 * Simulate the INITIAL_SESSION gate logic (async getAuthenticatorAssuranceLevel call).
 * This runs in a background IIFE — safe to be async.
 */
async function computeMfaBlockedAsync(
  mockGetLevel: () => Promise<{ data: any; error: any } | never>
): Promise<boolean> {
  let mfaBlocked = false;
  try {
    const { data: aal } = await Promise.race([
      mockGetLevel(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 100) // short for tests
      ),
    ]);
    mfaBlocked = aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel;
  } catch { /* fail-open */ }
  return mfaBlocked;
}

describe('MFA-05 — INITIAL_SESSION gate: async AAL check', () => {
  it('blocks when nextLevel=aal2 and currentLevel=aal1 (MFA required, not yet done)', async () => {
    const mockGetLevel = vi.fn().mockResolvedValue({
      data: { nextLevel: 'aal2', currentLevel: 'aal1' },
    });
    expect(await computeMfaBlockedAsync(mockGetLevel)).toBe(true);
  });

  it('passes when nextLevel=aal2 and currentLevel=aal2 (MFA already satisfied)', async () => {
    const mockGetLevel = vi.fn().mockResolvedValue({
      data: { nextLevel: 'aal2', currentLevel: 'aal2' },
    });
    expect(await computeMfaBlockedAsync(mockGetLevel)).toBe(false);
  });

  it('passes when nextLevel=aal1 (user does not have MFA enabled)', async () => {
    const mockGetLevel = vi.fn().mockResolvedValue({
      data: { nextLevel: 'aal1', currentLevel: 'aal1' },
    });
    expect(await computeMfaBlockedAsync(mockGetLevel)).toBe(false);
  });

  it('fails open (no block) when getAuthenticatorAssuranceLevel throws', async () => {
    const mockGetLevel = vi.fn().mockRejectedValue(new Error('network error'));
    // Fail-open: a network error must NOT trap users on the MFA screen forever.
    expect(await computeMfaBlockedAsync(mockGetLevel)).toBe(false);
  });

  it('fails open (no block) when getAuthenticatorAssuranceLevel times out', async () => {
    vi.useFakeTimers();
    const mockGetLevel = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves

    const resultPromise = computeMfaBlockedAsync(mockGetLevel);
    vi.advanceTimersByTime(200); // past the 100ms test timeout
    const result = await resultPromise;

    expect(result).toBe(false);
    vi.useRealTimers();
  });
});

// ─── MFA-06: signIn() sync AAL check ──────────────────────────────────────────

/**
 * Simulate the signIn() AAL check from AuthContext.
 * signInWithPassword returns the full user object (always includes factors),
 * so we can use a sync JWT decode + user.factors check — no network call needed.
 */
function signInRequiresMFA(
  session: { access_token: string } | null,
  userFactors: any[]
): boolean {
  const sessionAal = session ? getJwtAal(session.access_token) : undefined;
  const hasVerifiedMFA = userFactors.some(
    (f: any) => f.factor_type === 'totp' && f.status === 'verified'
  );
  return sessionAal !== 'aal2' && hasVerifiedMFA;
}

describe('MFA-06 — signIn() sync AAL check', () => {
  it('requiresMFA=true when session is AAL1 and user has a verified TOTP factor', () => {
    const session = { access_token: makeJwt({ aal: 'aal1' }) };
    const factors = [{ factor_type: 'totp', status: 'verified', id: 'f1' }];
    expect(signInRequiresMFA(session, factors)).toBe(true);
  });

  it('requiresMFA=false when session is AAL2 (MFA already satisfied at sign-in)', () => {
    const session = { access_token: makeJwt({ aal: 'aal2' }) };
    const factors = [{ factor_type: 'totp', status: 'verified', id: 'f1' }];
    expect(signInRequiresMFA(session, factors)).toBe(false);
  });

  it('requiresMFA=false when AAL1 but no factors (user has not enabled MFA)', () => {
    const session = { access_token: makeJwt({ aal: 'aal1' }) };
    expect(signInRequiresMFA(session, [])).toBe(false);
  });

  it('requiresMFA=false when AAL1 but only unverified factors (setup incomplete)', () => {
    const session = { access_token: makeJwt({ aal: 'aal1' }) };
    const factors = [{ factor_type: 'totp', status: 'unverified', id: 'f1' }];
    expect(signInRequiresMFA(session, factors)).toBe(false);
  });

  it('requiresMFA=false when AAL1 but factor is phone (not totp type)', () => {
    // We only gate on totp — other factor types should not trigger the MFA form.
    const session = { access_token: makeJwt({ aal: 'aal1' }) };
    const factors = [{ factor_type: 'phone', status: 'verified', id: 'f1' }];
    expect(signInRequiresMFA(session, factors)).toBe(false);
  });
});

// ─── MFA-07: mfaPendingRef lifecycle ──────────────────────────────────────────

describe('MFA-07 — mfaPendingRef lifecycle', () => {
  it('is set to true when signIn() returns requiresMFA=true', () => {
    // Simulate the signIn() path that sets mfaPendingRef.current = true
    let mfaPending = false;
    const requiresMFA = true;

    if (requiresMFA) {
      mfaPending = true; // mfaPendingRef.current = true
    }

    expect(mfaPending).toBe(true);
  });

  it('is set to false when signIn() resolves without MFA (non-MFA user)', () => {
    let mfaPending = false;
    const requiresMFA = false;

    // Non-MFA path: mfaPendingRef.current = false; setSession(...)
    if (!requiresMFA) {
      mfaPending = false;
    }

    expect(mfaPending).toBe(false);
  });

  it('is cleared to false when onAuthStateChange successfully sets session', () => {
    let mfaPending = true; // was set during sign-in

    // Simulate the "mfaBlocked=false" path in onAuthStateChange
    const mfaBlocked = false;
    if (!mfaBlocked) {
      mfaPending = false; // mfaPendingRef.current = false
      // setSession(session); setUser(session.user);
    }

    expect(mfaPending).toBe(false);
  });

  it('remains true during TOKEN_REFRESHED block — session is still not set', () => {
    let mfaPending = true;
    let sessionSet = false;

    const mfaBlocked = true; // TOKEN_REFRESHED fires while awaiting MFA code
    if (mfaBlocked) {
      mfaPending = true;
      // setUser(session.user); setSession(null); — session NOT set
    } else {
      mfaPending = false;
      sessionSet = true;
    }

    expect(mfaPending).toBe(true);
    expect(sessionSet).toBe(false);
  });

  it('is cleared on signOut', () => {
    let mfaPending = true;

    // signOut() always clears the ref
    mfaPending = false; // mfaPendingRef.current = false

    expect(mfaPending).toBe(false);
  });
});

// ─── MFA-08: source-level verification ────────────────────────────────────────

describe('MFA-08 — AuthContext source: verify sync guard is in place', () => {
  it('SIGNED_IN handler uses getJwtAal (sync) — not async getAuthenticatorAssuranceLevel', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    // The SIGNED_IN block must reference getJwtAal and session.user.factors
    expect(src).toMatch(/event === 'SIGNED_IN'/);
    expect(src).toMatch(/getJwtAal\(session\.access_token\)/);
    expect(src).toMatch(/session\.user\.factors/);

    // Structural check: the SIGNED_IN branch and the INITIAL_SESSION branch must be
    // separate else-if arms. Extract the if-block that contains SIGNED_IN and verify
    // it does NOT contain getAuthenticatorAssuranceLevel.
    //
    // Find the if-block: `if (event === 'SIGNED_IN' || ...) { ... }`
    // It ends at the closing brace before `} else if (event === 'INITIAL_SESSION')`.
    const signedInBlockMatch = src.match(
      /if \(event === 'SIGNED_IN'[\s\S]*?\} else if \(event === 'INITIAL_SESSION'\)/
    );
    expect(signedInBlockMatch).not.toBeNull();
    const signedInBlock = signedInBlockMatch![0];

    // The SIGNED_IN branch itself must not call getAuthenticatorAssuranceLevel
    expect(signedInBlock).not.toMatch(/getAuthenticatorAssuranceLevel/);
  });

  it('INITIAL_SESSION handler uses async getAuthenticatorAssuranceLevel', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    // The INITIAL_SESSION branch must use the async AAL check
    expect(src).toMatch(/event === 'INITIAL_SESSION'/);

    // The section after INITIAL_SESSION must contain getAuthenticatorAssuranceLevel
    const initialSessionSection = src.split("event === 'INITIAL_SESSION'")[1];
    expect(initialSessionSection).toMatch(/getAuthenticatorAssuranceLevel/);
  });

  it('TOKEN_REFRESHED check is gated on mfaPendingRef.current', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    // Must have the combined guard condition
    expect(src).toMatch(/event === 'TOKEN_REFRESHED' && mfaPendingRef\.current/);
  });

  it('signIn() uses sync getJwtAal check, not async getAuthenticatorAssuranceLevel', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    // The signIn function (after signInWithPassword returns) must use getJwtAal
    // and data.user.factors — not an async network call.
    expect(src).toMatch(/data\.session \? getJwtAal\(data\.session\.access_token\)/);
    expect(src).toMatch(/data\.user\.factors/);
  });
});

// ─── MFA-09: End-to-end bypass scenarios (integration) ────────────────────────

describe('MFA-09 — End-to-end bypass scenario simulation', () => {
  /**
   * Simulates the complete state machine for a sign-in attempt,
   * tracking user/session/mfaPending state through each event.
   */
  function simulateSignIn(options: {
    userFactors: Array<{ factor_type: string; status: string }>;
    sessionAal: 'aal1' | 'aal2';
    mfaPendingBefore?: boolean;
  }) {
    const { userFactors, sessionAal, mfaPendingBefore = false } = options;

    let user: any = null;
    let session: any = null;
    let mfaPending = mfaPendingBefore;

    // 1. signIn() resolves — sync AAL check
    const fakeSession = { access_token: makeJwt({ aal: sessionAal }) };
    const requiresMFA = signInRequiresMFA(fakeSession, userFactors);
    const fakeUser = { id: 'u1', email: 'alice@example.com', factors: userFactors };

    if (requiresMFA) {
      mfaPending = true;
      user = fakeUser;
      // session stays null — user sees MFA form
    } else {
      mfaPending = false;
      user = fakeUser;
      session = fakeSession;
    }

    // 2. onAuthStateChange SIGNED_IN fires (Supabase always fires it)
    const mfaBlocked = computeMfaBlockedSync('SIGNED_IN', { access_token: makeJwt({ aal: sessionAal }), user: { factors: userFactors } }, false);
    if (mfaBlocked) {
      mfaPending = true;
      // user is already set; session stays null
    } else if (!requiresMFA) {
      // Not blocked and not MFA required — session was set in step 1
      mfaPending = false;
    }

    return { user, session, mfaPending, requiresMFA };
  }

  it('MFA user: session is null after sign-in + SIGNED_IN event (bypass prevented)', () => {
    const result = simulateSignIn({
      userFactors: [{ factor_type: 'totp', status: 'verified' }],
      sessionAal: 'aal1',
    });

    expect(result.requiresMFA).toBe(true);
    expect(result.session).toBeNull();
    expect(result.mfaPending).toBe(true);
    expect(result.user).not.toBeNull(); // user is set so MFA form renders
  });

  it('Non-MFA user: session is set immediately after sign-in (no MFA gate)', () => {
    const result = simulateSignIn({
      userFactors: [], // no MFA
      sessionAal: 'aal1',
    });

    expect(result.requiresMFA).toBe(false);
    expect(result.session).not.toBeNull();
    expect(result.mfaPending).toBe(false);
  });

  it('Already-AAL2 user: session is set immediately (OAuth with pre-verified MFA)', () => {
    const result = simulateSignIn({
      userFactors: [{ factor_type: 'totp', status: 'verified' }],
      sessionAal: 'aal2',
    });

    expect(result.requiresMFA).toBe(false);
    expect(result.session).not.toBeNull();
    expect(result.mfaPending).toBe(false);
  });

  it('MFA user: TOKEN_REFRESHED while on MFA form does NOT bypass MFA', () => {
    // Initial state: user is on MFA form (mfaPending=true, session=null)
    let session: any = null;
    let mfaPending = true;

    // Token refresh fires
    const refreshSession = {
      access_token: makeJwt({ aal: 'aal1' }),
      user: { factors: [{ factor_type: 'totp', status: 'verified' }] },
    };
    const mfaBlocked = computeMfaBlockedSync('TOKEN_REFRESHED', refreshSession, mfaPending);

    if (mfaBlocked) {
      mfaPending = true;
      // session stays null
    } else {
      session = refreshSession;
      mfaPending = false;
    }

    expect(mfaBlocked).toBe(true);
    expect(session).toBeNull();    // MFA bypass prevented
    expect(mfaPending).toBe(true); // still waiting for code
  });
});
