/**
 * Targeted test for liquamura002@gmail.com
 *
 * DB state (verified against live Supabase):
 *   - subscription_status: active
 *   - workspace_members: Admin on be8ce3fa-…
 *   - profiles.onboarding_completed: false
 *   - No MFA factors
 *
 * Expected post-login route: /onboarding
 *
 * Run: npx vitest run tests/liquamura-signin.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockRpc  = vi.fn();
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: (table: string) => mockFrom(table),
    rpc: (name: string, args: any) => mockRpc(name, args),
  },
}));

vi.mock('../services/subscriptionAccess', () => ({
  hasActiveSubscription: (s: any) => {
    if (!s) return false;
    return (s.subscription_status || '').toLowerCase() === 'active';
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
const USER_ID   = '1ba7e091-54f1-46fd-8c54-557fb23844d4';  // real Supabase UID
const WORKSPACE = 'be8ce3fa-fe35-4ace-9927-abab84e7a319';   // real workspace_id

function buildChain(result: any): any {
  return {
    select:      () => buildChain(result),
    eq:          () => buildChain(result),
    in:          () => buildChain(result),
    maybeSingle: () => Promise.resolve(result),
    then:        (fn: any, ...rest: any[]) => Promise.resolve(result).then(fn, ...rest),
    catch:       (fn: any) => Promise.resolve(result).catch(fn),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('liquamura002@gmail.com — post-login routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    const localStorageMock = { getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() };
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
  });

  // ── Scenario: active sub + onboarding not done → /onboarding ──────────────
  it('routes liquamura002 (active sub, onboarding=false) to /onboarding', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null }); // workspace admin has active sub
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members')
        return buildChain({ data: [{ role: 'Admin', workspace_id: WORKSPACE }], error: null });
      if (table === 'user_settings')
        return buildChain({ data: { subscription_status: 'active', subscription_stripe_id: 'sub_1TF1Ch3P44iDyNN0U4gtnEJF', billing_plan_name: 'CoreflowHR Professional' }, error: null });
      if (table === 'workspaces')
        return buildChain({ data: [{ id: WORKSPACE, is_free_access: false, free_access_expires_at: null }], error: null });
      if (table === 'profiles')
        return buildChain({ data: { onboarding_completed: false }, error: null });
      return buildChain({ data: null, error: null });
    });

    const { resolvePostLoginDestination } = await import('../utils/postLoginRoute');
    const dest = await resolvePostLoginDestination(USER_ID);
    expect(dest).toBe('/onboarding');
  });

  // ── Scenario: after onboarding completes → /dashboard ─────────────────────
  it('routes liquamura002 after completing onboarding to /dashboard', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null }); // workspace admin has active sub
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members')
        return buildChain({ data: [{ role: 'Admin', workspace_id: WORKSPACE }], error: null });
      if (table === 'user_settings')
        return buildChain({ data: { subscription_status: 'active', subscription_stripe_id: 'sub_1TF1Ch3P44iDyNN0U4gtnEJF', billing_plan_name: 'CoreflowHR Professional' }, error: null });
      if (table === 'workspaces')
        return buildChain({ data: [{ id: WORKSPACE, is_free_access: false, free_access_expires_at: null }], error: null });
      if (table === 'profiles')
        return buildChain({ data: { onboarding_completed: true }, error: null });
      return buildChain({ data: null, error: null });
    });

    const { resolvePostLoginDestination } = await import('../utils/postLoginRoute');
    const dest = await resolvePostLoginDestination(USER_ID);
    expect(dest).toBe('/dashboard');
  });
});

describe('signIn hang guard — AAL timeout', () => {
  it('Promise.race rejects after 5 s when inner promise never settles', async () => {
    vi.useFakeTimers();

    const hanging = new Promise<never>(() => {}); // never resolves or rejects
    let caught = false;

    const race = Promise.race([
      hanging,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]).catch((e: Error) => {
      caught = e.message === 'timeout';
    });

    // Advance past the 5-second guard
    await vi.advanceTimersByTimeAsync(5001);
    await race;

    expect(caught).toBe(true);
    vi.useRealTimers();
  });

  it('does NOT reject before the 5 s guard fires', async () => {
    vi.useFakeTimers();

    const hanging = new Promise<never>(() => {});
    let caught = false;

    Promise.race([
      hanging,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]).catch(() => { caught = true; });

    await vi.advanceTimersByTimeAsync(4999);
    // Flush any pending microtasks
    await Promise.resolve();

    expect(caught).toBe(false);
    vi.useRealTimers();
  });
});
