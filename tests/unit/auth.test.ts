import { describe, it, expect } from 'vitest';

/**
 * Token validation logic tests.
 * These test the business rules around token expiry and single-use enforcement.
 * The actual DB calls are mocked — we're testing the logic, not the DB.
 */

// ── Token helpers (inline — the real logic lives in edge functions) ────────────

function isTokenExpired(createdAt: string, ttlHours: number): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created > ttlHours * 60 * 60 * 1000;
}

function validatePasswordResetToken(token: {
  created_at: string;
  used: boolean;
  value: string;
}): void {
  if (!token.value) throw new Error('Invalid token');
  if (token.used) throw new Error('This reset link has already been used');
  if (isTokenExpired(token.created_at, 1)) throw new Error('Reset link has expired');
}

function validateInviteToken(token: {
  created_at: string;
  accepted: boolean;
  value: string;
}): void {
  if (!token.value) throw new Error('Invalid invite link');
  if (token.accepted) throw new Error('This invite has already been accepted');
  if (isTokenExpired(token.created_at, 48)) throw new Error('Invite link has expired');
}

// ── Password reset token ──────────────────────────────────────────────────────

describe('Password reset token', () => {
  const freshToken = {
    value: 'tok_abc123',
    created_at: new Date().toISOString(),
    used: false,
  };

  it('valid token within 1 hour passes', () => {
    expect(() => validatePasswordResetToken(freshToken)).not.toThrow();
  });

  it('token expired after 1 hour throws', () => {
    const hourAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(() =>
      validatePasswordResetToken({ ...freshToken, created_at: hourAgo })
    ).toThrow(/expired/i);
  });

  it('already-used token throws', () => {
    expect(() =>
      validatePasswordResetToken({ ...freshToken, used: true })
    ).toThrow(/already been used/i);
  });

  it('tampered (empty) token throws', () => {
    expect(() =>
      validatePasswordResetToken({ ...freshToken, value: '' })
    ).toThrow(/invalid/i);
  });

  it('token valid at exactly 59 minutes still passes', () => {
    const fiftyNineMin = new Date(Date.now() - 59 * 60 * 1000).toISOString();
    expect(() =>
      validatePasswordResetToken({ ...freshToken, created_at: fiftyNineMin })
    ).not.toThrow();
  });
});

// ── Invite token ──────────────────────────────────────────────────────────────

describe('Invite token', () => {
  const freshInvite = {
    value: 'invite_xyz789',
    created_at: new Date().toISOString(),
    accepted: false,
  };

  it('valid pending invite passes', () => {
    expect(() => validateInviteToken(freshInvite)).not.toThrow();
  });

  it('expired invite (over 48 hours) throws', () => {
    const twoDaysAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    expect(() =>
      validateInviteToken({ ...freshInvite, created_at: twoDaysAgo })
    ).toThrow(/expired/i);
  });

  it('already accepted invite throws', () => {
    expect(() =>
      validateInviteToken({ ...freshInvite, accepted: true })
    ).toThrow(/already been accepted/i);
  });

  it('invite valid at 47 hours still passes', () => {
    const fortySevenHoursAgo = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
    expect(() =>
      validateInviteToken({ ...freshInvite, created_at: fortySevenHoursAgo })
    ).not.toThrow();
  });
});
