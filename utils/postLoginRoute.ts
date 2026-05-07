import { supabase } from '../services/supabase';
import { checkAppAccess } from '../services/appAccess';

/**
 * Resolves the correct post-login destination for a user.
 * Shared by the email/password login handler and the Google OAuth redirect page
 * so the logic only lives in one place.
 *
 * Returns the path to navigate to (e.g. '/dashboard', '/onboarding', '/?pricing=true',
 * or '/invite?token=xxx').
 */
export const resolvePostLoginDestination = async (userId: string): Promise<string> => {
  const { canEnter, isPastDue, isLapsedMember, isNonAdminMember, memberships } =
    await checkAppAccess(userId);

  const belongsToWorkspace = memberships.length > 0;

  // Pending invite token takes priority for users not yet in a workspace.
  // If they're already a member the token is stale — clear it.
  try {
    const pendingToken = localStorage.getItem('workspaceInviteToken');
    if (pendingToken) {
      if (!belongsToWorkspace) {
        return `/invite?token=${encodeURIComponent(pendingToken)}`;
      }
      localStorage.removeItem('workspaceInviteToken');
    }
  } catch {
    // localStorage unavailable — continue
  }

  if (!canEnter) {
    if (isLapsedMember) return '/workspace-lapsed';
    if (isPastDue) return '/settings';
    return '/?pricing=true';
  }

  // Only invited non-admin members (Recruiter, HiringManager, Viewer) skip onboarding.
  // Workspace owners/admins must complete onboarding even if their workspace exists.
  if (!isNonAdminMember) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.onboarding_completed !== true) {
      return '/onboarding';
    }
  }

  return '/dashboard';
};
