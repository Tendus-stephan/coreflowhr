import { supabase } from '../services/supabase';

/**
 * Resolves the correct post-login destination for a user.
 * Shared by the email/password login handler and the Google OAuth redirect page
 * so the logic only lives in one place.
 *
 * Returns the path to navigate to (e.g. '/dashboard', '/onboarding', '/?pricing=true',
 * or '/invite?token=xxx').
 */
export const resolvePostLoginDestination = async (userId: string): Promise<string> => {
  const nonAdminRoles = ['Recruiter', 'HiringManager', 'Viewer'];

  const [membershipsRes, settingsRes] = await Promise.all([
    supabase.from('workspace_members').select('role, workspace_id').eq('user_id', userId),
    supabase
      .from('user_settings')
      .select('subscription_status, subscription_stripe_id, billing_plan_name')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const memberships = membershipsRes.data || [];
  const isNonAdminMember = memberships.some((m: any) => nonAdminRoles.includes(m.role));
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

  // Resolve subscription / workspace access
  let hasAccess = false;

  if (isNonAdminMember) {
    // Non-admin members access through the workspace — verify the workspace has an active subscription
    const workspaceIds = memberships.map((m: any) => m.workspace_id).filter(Boolean);
    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('is_free_access, free_access_expires_at')
        .in('id', workspaceIds);
      hasAccess = (workspaces || []).some((ws: any) => {
        if (!ws.is_free_access) return false;
        if (!ws.free_access_expires_at) return true;
        return new Date(ws.free_access_expires_at) > new Date();
      });
      if (!hasAccess) {
        const { data: memberRows } = await supabase
          .from('workspace_members')
          .select('user_id')
          .in('workspace_id', workspaceIds);
        const memberIds = [...new Set((memberRows || []).map((r: any) => r.user_id))] as string[];
        if (memberIds.length > 0) {
          const { data: subs } = await supabase
            .from('user_settings')
            .select('subscription_status, subscription_stripe_id, billing_plan_name')
            .in('user_id', memberIds);
          const { hasActiveSubscription } = await import('../services/subscriptionAccess');
          hasAccess = (subs || []).some((s: any) => hasActiveSubscription(s));
        }
      }
    }
  } else if (belongsToWorkspace) {
    const workspaceIds = memberships.map((m: any) => m.workspace_id).filter(Boolean);
    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('is_free_access, free_access_expires_at')
        .in('id', workspaceIds);
      hasAccess = (workspaces || []).some((ws: any) => {
        if (!ws.is_free_access) return false;
        if (!ws.free_access_expires_at) return true;
        return new Date(ws.free_access_expires_at) > new Date();
      });
    }
    if (!hasAccess && settingsRes.data) {
      const { hasActiveSubscription } = await import('../services/subscriptionAccess');
      hasAccess = hasActiveSubscription(settingsRes.data);
    }
  } else if (settingsRes.data) {
    const { hasActiveSubscription } = await import('../services/subscriptionAccess');
    hasAccess = hasActiveSubscription(settingsRes.data);
  }

  if (!hasAccess) {
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
