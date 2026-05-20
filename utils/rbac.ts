/**
 * Role-based access control helpers.
 * Mirrors ROLE_ALLOWED_ROUTES in ProtectedRoute.tsx and the API-level
 * role checks documented in docs/ROLE_RESTRICTIONS.md.
 */

export type UserRole = 'Admin' | 'Recruiter' | 'HiringManager' | 'Viewer';

export type Action =
  | 'view_dashboard'
  | 'view_candidates'
  | 'view_jobs'
  | 'create_job'
  | 'delete_job'
  | 'view_clients'
  | 'view_offers'
  | 'view_calendar'
  | 'view_settings'
  | 'access_billing'
  | 'delete_workspace'
  | 'manage_team'
  | 'change_user_roles'
  | 'invite_member'
  | 'view_reports';

const ROLE_PERMISSIONS: Record<UserRole, Set<Action>> = {
  Admin: new Set([
    'view_dashboard', 'view_candidates', 'view_jobs', 'create_job', 'delete_job',
    'view_clients', 'view_offers', 'view_calendar', 'view_settings', 'access_billing',
    'delete_workspace', 'manage_team', 'change_user_roles', 'invite_member', 'view_reports',
  ]),
  Recruiter: new Set([
    'view_dashboard', 'view_candidates', 'view_jobs', 'create_job',
    'view_clients', 'view_offers', 'view_calendar', 'view_settings', 'view_reports',
  ]),
  HiringManager: new Set([
    'view_dashboard', 'view_candidates', 'view_jobs',
    'view_clients', 'view_calendar', 'view_settings',
  ]),
  Viewer: new Set([
    'view_dashboard', 'view_candidates', 'view_settings',
  ]),
};

export interface UserLike {
  role: UserRole | string | null | undefined;
}

/**
 * Returns true if the user has permission to perform the given action.
 * Unauthenticated users (null/undefined role) are denied everything.
 * Unknown roles default to the most restrictive (Viewer) permissions.
 */
export function canPerformAction(user: UserLike, action: Action): boolean {
  if (!user?.role) return false;
  const permissions = ROLE_PERMISSIONS[user.role as UserRole] ?? ROLE_PERMISSIONS['Viewer'];
  return permissions.has(action);
}
