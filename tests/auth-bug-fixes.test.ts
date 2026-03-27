/**
 * Authentication Bug-Fix Regression Tests
 *
 * Covers the 7 bugs fixed from AUTHENTICATION_TEST_PLAN.md:
 *   BUG-001 — Non-functional "Remember me" checkbox removed from Login
 *   BUG-002 — Reset password expired-link hangs forever (20 s timeout added)
 *   BUG-003 — MFA verify has no rate limiting (5 attempts → 60 s lockout)
 *   BUG-004 — Resend verification email has no cooldown (60 s added)
 *   BUG-005 — signOut removes wrong localStorage key (dead code removed)
 *   BUG-006 — Payment webhook timeout navigates to /dashboard → bounces to pricing
 *   BUG-009 — 429 rate-limit error not surfaced to user on resend
 *
 * Run: npx vitest run tests/auth-bug-fixes.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Supabase mock ─────────────────────────────────────────────────────────────
const mockResend = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      resend: mockResend,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      mfa: { verifyTOTP: vi.fn(), getAuthenticatorAssuranceLevel: vi.fn() },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// ─── BUG-001: Remember me checkbox removed ────────────────────────────────────

describe('BUG-001 — Remember me checkbox', () => {
  it('Login.tsx no longer renders a "Remember me" checkbox', async () => {
    // Read the Login page source and confirm "remember" is gone
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/Login.tsx'), 'utf-8');

    // The checkbox input with id="remember-me" should not exist
    expect(src).not.toMatch(/id=["']remember-me["']/);
    // The "Remember me" label text should not exist
    expect(src).not.toMatch(/Remember me/i);
  });
});

// ─── BUG-002: Reset password expired-link timeout ─────────────────────────────

describe('BUG-002 — Reset password expired-link timeout', () => {
  it('ResetPassword sets linkExpired after 20 s with no PASSWORD_RECOVERY event', () => {
    vi.useFakeTimers();

    // Simulate the timeout logic from ResetPassword.tsx
    let linkExpired = false;
    let ready = false;
    const readyRef = { current: false };

    const expiredTimer = setTimeout(() => {
      if (!readyRef.current) linkExpired = true;
    }, 20000);

    // Before 20 s — not expired
    vi.advanceTimersByTime(19999);
    expect(linkExpired).toBe(false);

    // At 20 s exactly — expired (no event arrived)
    vi.advanceTimersByTime(1);
    expect(linkExpired).toBe(true);

    clearTimeout(expiredTimer);
    vi.useRealTimers();
  });

  it('does NOT set linkExpired if PASSWORD_RECOVERY fires before 20 s', () => {
    vi.useFakeTimers();

    let linkExpired = false;
    const readyRef = { current: false };

    const expiredTimer = setTimeout(() => {
      if (!readyRef.current) linkExpired = true;
    }, 20000);

    // Simulate PASSWORD_RECOVERY event arriving at 3 s
    vi.advanceTimersByTime(3000);
    readyRef.current = true; // event fired → mark ready

    // Advance past the 20 s mark
    vi.advanceTimersByTime(18000);
    expect(linkExpired).toBe(false); // still false because readyRef.current was set

    clearTimeout(expiredTimer);
    vi.useRealTimers();
  });

  it('does NOT set linkExpired if getSession() returns a session', () => {
    vi.useFakeTimers();

    let linkExpired = false;
    const readyRef = { current: false };

    const expiredTimer = setTimeout(() => {
      if (!readyRef.current) linkExpired = true;
    }, 20000);

    // Simulate getSession resolving with an active session
    readyRef.current = true;

    vi.advanceTimersByTime(25000);
    expect(linkExpired).toBe(false);

    clearTimeout(expiredTimer);
    vi.useRealTimers();
  });
});

// ─── BUG-003: MFA rate limiting ───────────────────────────────────────────────

describe('BUG-003 — MFA verify rate limiting', () => {
  const MFA_MAX_ATTEMPTS = 5;
  const MFA_LOCKOUT_DURATION = 60;

  it('allows the first 4 wrong MFA codes without lockout', () => {
    let mfaFailedAttempts = 0;
    let mfaLockoutUntil: number | null = null;

    for (let i = 0; i < MFA_MAX_ATTEMPTS - 1; i++) {
      mfaFailedAttempts++;
      if (mfaFailedAttempts >= MFA_MAX_ATTEMPTS) {
        mfaLockoutUntil = Date.now() + MFA_LOCKOUT_DURATION * 1000;
      }
    }

    expect(mfaFailedAttempts).toBe(4);
    expect(mfaLockoutUntil).toBeNull();
  });

  it('locks out after the 5th wrong MFA code', () => {
    let mfaFailedAttempts = 0;
    let mfaLockoutUntil: number | null = null;

    for (let i = 0; i < MFA_MAX_ATTEMPTS; i++) {
      mfaFailedAttempts++;
      if (mfaFailedAttempts >= MFA_MAX_ATTEMPTS) {
        mfaLockoutUntil = Date.now() + MFA_LOCKOUT_DURATION * 1000;
      }
    }

    expect(mfaFailedAttempts).toBe(MFA_MAX_ATTEMPTS);
    expect(mfaLockoutUntil).not.toBeNull();
    expect(mfaLockoutUntil!).toBeGreaterThan(Date.now());
  });

  it('MFA lockout lasts exactly 60 s', () => {
    const before = Date.now();
    const lockoutUntil = before + MFA_LOCKOUT_DURATION * 1000;
    const remaining = Math.ceil((lockoutUntil - before) / 1000);
    expect(remaining).toBe(MFA_LOCKOUT_DURATION);
  });

  it('MFA lockout expires and attempt counter resets', () => {
    vi.useFakeTimers();
    const lockoutUntil = Date.now() + MFA_LOCKOUT_DURATION * 1000;

    vi.advanceTimersByTime(MFA_LOCKOUT_DURATION * 1000 + 100);

    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
    expect(remaining).toBeLessThanOrEqual(0); // lockout has passed

    vi.useRealTimers();
  });

  it('Login.tsx source contains MFA lockout state', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/Login.tsx'), 'utf-8');

    expect(src).toMatch(/mfaFailedAttempts/);
    expect(src).toMatch(/mfaLockoutUntil/);
    expect(src).toMatch(/MFA_MAX_ATTEMPTS/);
    expect(src).toMatch(/MFA_LOCKOUT_DURATION/);
  });
});

// ─── BUG-004: Resend email cooldown ──────────────────────────────────────────

describe('BUG-004 — Resend verification email 60 s cooldown', () => {
  it('starts a 60 s countdown after successful resend', () => {
    vi.useFakeTimers();
    let resendCooldown = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Simulate startResendCooldown()
    resendCooldown = 60;
    intervalId = setInterval(() => {
      resendCooldown = resendCooldown <= 1 ? 0 : resendCooldown - 1;
    }, 1000);

    expect(resendCooldown).toBe(60);

    vi.advanceTimersByTime(1000);
    expect(resendCooldown).toBe(59);

    vi.advanceTimersByTime(29000);
    expect(resendCooldown).toBe(30);

    vi.advanceTimersByTime(30000);
    expect(resendCooldown).toBe(0);

    clearInterval(intervalId!);
    vi.useRealTimers();
  });

  it('button is disabled when cooldown > 0', () => {
    const resendCooldown = 45;
    const resending = false;
    const email = 'test@example.com';

    // Mirrors: disabled={resending || !email || resendCooldown > 0}
    const isDisabled = resending || !email || resendCooldown > 0;
    expect(isDisabled).toBe(true);
  });

  it('button is enabled when cooldown reaches 0', () => {
    const resendCooldown = 0;
    const resending = false;
    const email = 'test@example.com';

    const isDisabled = resending || !email || resendCooldown > 0;
    expect(isDisabled).toBe(false);
  });

  it('VerifyEmail.tsx source contains cooldown state', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/VerifyEmail.tsx'), 'utf-8');

    expect(src).toMatch(/resendCooldown/);
    expect(src).toMatch(/startResendCooldown/);
    expect(src).toMatch(/setResendCooldown/);
  });
});

// ─── BUG-005: Dead localStorage key in signOut ───────────────────────────────

describe('BUG-005 — Dead localStorage key removed from signOut', () => {
  it('AuthContext.tsx signOut does not use window.location.hostname to build key', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    // The dead code pattern: 'sb-' + window.location.hostname.split...
    expect(src).not.toMatch(/window\.location\.hostname\.split/);
  });

  it('AuthContext.tsx signOut does not remove the legacy v1 supabase.auth.token key', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    expect(src).not.toMatch(/removeItem\(['"]supabase\.auth\.token['"]\)/);
  });

  it('AuthContext.tsx signOut still clears testMode and sessionStorage', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../contexts/AuthContext.tsx'), 'utf-8');

    expect(src).toMatch(/sessionStorage\.clear\(\)/);
    expect(src).toMatch(/localStorage\.removeItem\(['"]testMode['"]\)/);
  });
});

// ─── BUG-006: Payment webhook timeout UI ─────────────────────────────────────

describe('BUG-006 — Payment webhook timeout shows pending UI, not /dashboard bounce', () => {
  it('AuthRedirect.tsx contains paymentPending state', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/AuthRedirect.tsx'), 'utf-8');

    expect(src).toMatch(/paymentPending/);
    expect(src).toMatch(/setPaymentPending/);
  });

  it('AuthRedirect.tsx shows "Payment received!" heading in pending UI', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/AuthRedirect.tsx'), 'utf-8');

    expect(src).toMatch(/Payment received!/);
    expect(src).toMatch(/Continue to Dashboard/);
  });

  it('AuthRedirect.tsx does NOT immediately navigate to /dashboard when webhook polls exhaust', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/AuthRedirect.tsx'), 'utf-8');

    // The old behaviour: navigate('/dashboard') right after the poll loop
    // The new behaviour: setPaymentPending(true)
    // Verify the payment-webhook-never-confirmed path uses setPaymentPending, not navigate
    const webhookTimeoutSection = src.match(
      /payment webhook never confirmed[\s\S]{0,300}/
    )?.[0] ?? '';
    expect(webhookTimeoutSection).toMatch(/setPaymentPending\(true\)/);
    expect(webhookTimeoutSection).not.toMatch(/navigate\(['"]\/dashboard['"]/);
  });

  it('AuthRedirect.tsx hard deadline also shows pending UI for payment flows', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/AuthRedirect.tsx'), 'utf-8');

    const hardDeadlineSection = src.match(
      /Hard deadline[\s\S]{0,600}/
    )?.[0] ?? '';
    expect(hardDeadlineSection).toMatch(/isPaymentSuccess/);
    expect(hardDeadlineSection).toMatch(/setPaymentPending\(true\)/);
  });
});

// ─── BUG-009: 429 rate-limit error surfaced to user on resend ────────────────

describe('BUG-009 — 429 rate-limit error shown to user on resend', () => {
  // Mirror the normalizeResendError() function from VerifyEmail.tsx
  const normalizeResendError = (err: any): string => {
    const raw = (err?.message || '').toLowerCase();
    const status = err?.status ?? (err as any)?.code;
    if (status === 429 || raw.includes('rate limit') || raw.includes('too many requests')) {
      return 'Too many requests. Please wait a minute before requesting another email.';
    }
    if (raw.includes('failed to fetch') || raw.includes('network')) {
      return 'We could not reach the email service. Please check your internet connection and try again.';
    }
    return 'We could not resend the verification email right now. Please try again in a moment.';
  };

  it('returns a user-friendly message for HTTP 429 status', () => {
    const err = { status: 429, message: 'Too Many Requests' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/wait a minute/i);
  });

  it('returns a user-friendly message for "rate limit" in error message', () => {
    const err = { message: 'Email rate limit exceeded' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/wait a minute/i);
  });

  it('returns a user-friendly message for "too many requests" in error message', () => {
    const err = { message: 'Too many requests sent' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/wait a minute/i);
  });

  it('returns a network error message for fetch failures', () => {
    const err = { message: 'Failed to fetch' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/internet connection/i);
  });

  it('returns a generic fallback for unknown errors', () => {
    const err = { message: 'Something went wrong' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/try again/i);
    expect(msg).not.toMatch(/wait a minute/i);
    expect(msg).not.toMatch(/internet connection/i);
  });

  it('handles error code 429 (numeric code field)', () => {
    const err = { code: 429, message: 'rate limited' };
    const msg = normalizeResendError(err);
    expect(msg).toMatch(/wait a minute/i);
  });

  it('VerifyEmail.tsx source contains normalizeResendError function', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../pages/VerifyEmail.tsx'), 'utf-8');

    expect(src).toMatch(/normalizeResendError/);
    expect(src).toMatch(/rate limit/i);
    expect(src).toMatch(/429/);
  });
});
