import { describe, it, expect } from 'vitest';
import { canPerformAction, type UserLike } from '../../utils/rbac';

const user = (role: string | null | undefined): UserLike => ({ role });

describe('canPerformAction — Admin', () => {
  it('Admin can view dashboard', () => {
    expect(canPerformAction(user('Admin'), 'view_dashboard')).toBe(true);
  });

  it('Admin can access billing', () => {
    expect(canPerformAction(user('Admin'), 'access_billing')).toBe(true);
  });

  it('Admin can delete workspace', () => {
    expect(canPerformAction(user('Admin'), 'delete_workspace')).toBe(true);
  });

  it('Admin can change user roles', () => {
    expect(canPerformAction(user('Admin'), 'change_user_roles')).toBe(true);
  });

  it('Admin can manage team', () => {
    expect(canPerformAction(user('Admin'), 'manage_team')).toBe(true);
  });
});

describe('canPerformAction — Recruiter', () => {
  it('Recruiter can view candidates', () => {
    expect(canPerformAction(user('Recruiter'), 'view_candidates')).toBe(true);
  });

  it('Recruiter can view offers', () => {
    expect(canPerformAction(user('Recruiter'), 'view_offers')).toBe(true);
  });

  it('Recruiter cannot access billing', () => {
    expect(canPerformAction(user('Recruiter'), 'access_billing')).toBe(false);
  });

  it('Recruiter cannot delete workspace', () => {
    expect(canPerformAction(user('Recruiter'), 'delete_workspace')).toBe(false);
  });

  it('Recruiter cannot change user roles', () => {
    expect(canPerformAction(user('Recruiter'), 'change_user_roles')).toBe(false);
  });
});

describe('canPerformAction — HiringManager', () => {
  it('HiringManager can view jobs', () => {
    expect(canPerformAction(user('HiringManager'), 'view_jobs')).toBe(true);
  });

  it('HiringManager cannot view offers', () => {
    expect(canPerformAction(user('HiringManager'), 'view_offers')).toBe(false);
  });

  it('HiringManager cannot access billing', () => {
    expect(canPerformAction(user('HiringManager'), 'access_billing')).toBe(false);
  });
});

describe('canPerformAction — Viewer', () => {
  it('Viewer can view dashboard', () => {
    expect(canPerformAction(user('Viewer'), 'view_dashboard')).toBe(true);
  });

  it('Viewer cannot view jobs', () => {
    expect(canPerformAction(user('Viewer'), 'view_jobs')).toBe(false);
  });

  it('Viewer cannot access billing', () => {
    expect(canPerformAction(user('Viewer'), 'access_billing')).toBe(false);
  });
});

describe('canPerformAction — edge cases', () => {
  it('null role → all actions denied', () => {
    expect(canPerformAction(user(null), 'view_dashboard')).toBe(false);
    expect(canPerformAction(user(null), 'access_billing')).toBe(false);
  });

  it('undefined role → all actions denied', () => {
    expect(canPerformAction(user(undefined), 'view_dashboard')).toBe(false);
  });

  it('invalid/unknown role → defaults to most restrictive (Viewer)', () => {
    // Unknown roles should not get Admin privileges
    expect(canPerformAction(user('SuperAdmin'), 'delete_workspace')).toBe(false);
    expect(canPerformAction(user('god'), 'access_billing')).toBe(false);
  });

  it('unknown role still gets Viewer-level access', () => {
    expect(canPerformAction(user('UnknownRole'), 'view_dashboard')).toBe(true);
  });
});
