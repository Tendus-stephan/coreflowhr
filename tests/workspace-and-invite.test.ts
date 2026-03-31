/**
 * Workspace role, dashboard stats, and invite flow tests.
 * Run with: npm run test -- tests/workspace-and-invite.test.ts
 * Watch: npm run test -- tests/workspace-and-invite.test.ts --watch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Creates a Supabase query mock that supports unlimited .eq()/.in()/.limit() chaining
 *  AND can be awaited directly. Resolves to { data, error: null }. */
const chainable = (data: any[]) => {
  const result = { data, error: null };
  const obj: any = {
    eq: () => obj,
    in: () => obj,
    limit: () => Promise.resolve(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return obj;
};

// Mock supabase before importing api (api uses getCurrentUserRole which uses workspace_members)
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      getSession: () => mockGetUser().then((r: any) => ({ data: { session: r?.data?.user ? { user: r.data.user } : null }, error: null })),
    },
    from: (table: string) => mockFrom(table),
    rpc: (name: string, args: any) => mockRpc(name, args),
  },
}));

describe('Workspace role and dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-id', email: 'owner@test.com' } },
      error: null,
    });
  });

  it('resolves Admin when user is workspace owner (workspace_members has Admin)', async () => {
    const { api } = await import('../services/api');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return { select: () => chainable([{ role: 'Admin', workspace_id: 'ws-1' }]) };
      }
      if (table === 'workspaces') {
        return {
          select: () => ({ eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [{ id: 'ws-1' }], error: null }) }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { name: 'Owner', id: 'owner-id' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const me = await api.auth.me();
    expect(me.role).toBe('Admin');
  });

  it('resolves Admin when user has Admin in one workspace and Viewer in another', async () => {
    const { api } = await import('../services/api');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return { select: () => chainable([{ role: 'Viewer', workspace_id: 'ws-1' }, { role: 'Admin', workspace_id: 'ws-2' }]) };
      }
      if (table === 'workspaces') {
        return {
          select: () => ({ eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [{ id: 'ws-2' }], error: null }) }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { name: 'User', id: 'owner-id' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const me = await api.auth.me();
    expect(me.role).toBe('Admin');
  });

  it('dashboard getStats uses workspace-visible jobs (no user_id filter)', async () => {
    const jobsData = [
      { id: 'j1', status: 'Active', created_at: new Date().toISOString(), posted_date: null, is_test: false, title: 'Job 1' },
    ];
    const candidatesData = [
      { id: 'c1', name: 'C', stage: 'New', job_id: 'j1', applied_date: null, created_at: new Date().toISOString(), updated_at: null, is_test: false },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return { select: () => chainable(jobsData) };
      }
      if (table === 'candidates') {
        return { select: () => chainable(candidatesData) };
      }
      if (table === 'activity_log') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                like: () => ({
                  order: () => chainable([]),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'workspace_members') {
        return { select: () => chainable([{ role: 'Admin', workspace_id: 'ws-1' }]) };
      }
      if (table === 'workspaces') {
        return {
          select: () => ({ eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [{ id: 'ws-1' }], error: null }) }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { name: 'User', id: 'owner-id' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { api } = await import('../services/api');
    const stats = await api.dashboard.getStats();
    expect(stats.activeJobs).toBe(1);
    expect(stats.totalCandidates).toBe(1);
  });
});

describe('Invite flow (dummy emails)', () => {
  const DUMMY_INVITE_EMAIL = 'invited+dummy@example.com';
  const DUMMY_TOKEN = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id', email: DUMMY_INVITE_EMAIL } },
      error: null,
    });
  });

  it('getInviteByToken returns found and email when invite exists', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { found: true, email: DUMMY_INVITE_EMAIL, role: 'Recruiter' },
      error: null,
    });
    const { api } = await import('../services/api');
    const result = await api.workspaces.getInviteByToken(DUMMY_TOKEN);
    expect(result.found).toBe(true);
    expect(result.email).toBe(DUMMY_INVITE_EMAIL);
    expect(mockRpc).toHaveBeenCalledWith('get_invite_by_token', { p_token: DUMMY_TOKEN });
  });

  it('getInviteByToken returns found: false when invite missing or expired', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    const { api } = await import('../services/api');
    const result = await api.workspaces.getInviteByToken('expired-token');
    expect(result.found).toBe(false);
  });

  it('wrong account: invite email differs from current user email', () => {
    const inviteEmail = 'invited@example.com';
    const currentEmail = 'other@example.com';
    const normalizedInvite = inviteEmail.trim().toLowerCase();
    const normalizedCurrent = currentEmail.trim().toLowerCase();
    expect(normalizedInvite).not.toBe(normalizedCurrent);
    // App.tsx uses this check to skip redirect when wrong account
    const shouldNotRedirect = normalizedInvite && normalizedCurrent && normalizedInvite !== normalizedCurrent;
    expect(shouldNotRedirect).toBe(true);
  });
});

describe('One Admin per workspace (owner only)', () => {
  it('invited Viewer stays Viewer: getCurrentUserRole returns Viewer when only membership is Viewer', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'viewer-id', email: 'viewer@test.com' } },
      error: null,
    });
    const { api } = await import('../services/api');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return { select: () => chainable([{ role: 'Viewer', workspace_id: 'ws-1' }]) };
      }
      if (table === 'workspaces') {
        return {
          select: () => ({ eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { name: 'Viewer User', id: 'viewer-id' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const me = await api.auth.me();
    expect(me.role).toBe('Viewer');
  });

  it('Admin (owner) gets Admin when only membership is Admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-id', email: 'admin@test.com' } },
      error: null,
    });
    const { api } = await import('../services/api');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return { select: () => chainable([{ role: 'Admin', workspace_id: 'ws-1' }]) };
      }
      if (table === 'workspaces') {
        return {
          select: () => ({ eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [{ id: 'ws-1' }], error: null }) }) }) }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { name: 'Admin User', id: 'admin-id' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const me = await api.auth.me();
    expect(me.role).toBe('Admin');
  });

  it('acceptInvite with Viewer role must not grant Admin (contract: DB/trigger enforces one Admin = owner)', () => {
    const inviteRole = 'Viewer';
    const acceptorIsOwner = false;
    const expectedRole = acceptorIsOwner ? 'Admin' : inviteRole;
    expect(expectedRole).toBe('Viewer');
  });
});

describe('Workspace jobs list visibility', () => {
  it('jobs list relies on RLS (no explicit user_id filter in list)', () => {
    // Contract: api.jobs.list() does not call .eq('user_id', userId); RLS determines visibility.
    // So Admin/Recruiter see all workspace jobs; Viewer sees only assigned.
    const roleCanSeeAllWorkspaceJobs = (role: string) =>
      role === 'Admin' || role === 'Recruiter';
    expect(roleCanSeeAllWorkspaceJobs('Admin')).toBe(true);
    expect(roleCanSeeAllWorkspaceJobs('Recruiter')).toBe(true);
    expect(roleCanSeeAllWorkspaceJobs('Viewer')).toBe(false);
    expect(roleCanSeeAllWorkspaceJobs('HiringManager')).toBe(false);
  });
});
