import { describe, it, expect } from 'vitest';
import { canSendEmail, type EmailType, type EmailPreferences } from '../../utils/emailGates';

const WS = 'ws-123';

describe('canSendEmail', () => {
  it('returns true when preference is explicitly ON', () => {
    const prefs: EmailPreferences = { stage_changed: true };
    expect(canSendEmail(WS, 'stage_changed', prefs)).toBe(true);
  });

  it('returns false when preference is explicitly OFF', () => {
    const prefs: EmailPreferences = { stage_changed: false };
    expect(canSendEmail(WS, 'stage_changed', prefs)).toBe(false);
  });

  it('returns true when key is missing from prefs (default on)', () => {
    expect(canSendEmail(WS, 'candidate_added', {})).toBe(true);
  });

  it('payment_failed always returns true even when preference is OFF', () => {
    const prefs: EmailPreferences = { payment_failed: false };
    expect(canSendEmail(WS, 'payment_failed', prefs)).toBe(true);
  });

  it('payment_failed returns true with no prefs at all', () => {
    expect(canSendEmail(WS, 'payment_failed', null)).toBe(true);
  });

  it('unknown email type returns false (safe default)', () => {
    // @ts-expect-error intentional unknown type
    expect(canSendEmail(WS, 'some_unknown_type', {})).toBe(false);
  });

  it('DB unavailable (null prefs) → fails open for transactional emails', () => {
    expect(canSendEmail(WS, 'offer_sent', null)).toBe(true);
    expect(canSendEmail(WS, 'stage_changed', null)).toBe(true);
  });

  it('missing workspaceId throws a descriptive error', () => {
    expect(() => canSendEmail(null, 'stage_changed', {})).toThrow(/workspaceId/i);
    expect(() => canSendEmail(undefined, 'stage_changed', {})).toThrow(/workspaceId/i);
    expect(() => canSendEmail('', 'stage_changed', {})).toThrow(/workspaceId/i);
  });
});
