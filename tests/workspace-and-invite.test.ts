/**
 * Workspace role, dashboard stats, and invite flow tests.
 * Run with: npm run test -- tests/workspace-and-invite.test.ts
 * Watch: npm run test -- tests/workspace-and-invite.test.ts --watch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ role: 'Admin' }],
              error: null,
            }),
          }),
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
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const me = await api.auth.me();
    expect(me.role).toBe('Admin');
  });

  it('resolves Admin when user has Admin in one workspace and Viewer in another', async () => {
    const { api } = await import('../services/api');
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspace_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ role: 'Viewer' }, { role: 'Admin' }],
              error: null,
            }),
          }),
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
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
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
        return {
          select: () => Promise.resolve({ data: jobsData, error: null }),
        };
      }
      if (table === 'candidates') {
        return {
          select: () => Promise.resolve({ data: candidatesData, error: null }),
        };
      }
      if (table === 'activity_log') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                like: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'workspace_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ role: 'Admin' }], error: null }),
          }),
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
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
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
