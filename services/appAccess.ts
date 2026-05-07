/**
 * Single source of truth for app access / subscription checks.
 *
 * Mental model: access belongs to the workspace. If the user belongs to a workspace
 * with an active subscription (or free-access grant), they can enter. Otherwise,
 * if they have their own active subscription (solo customer), they can enter.
 *
 * Used by: ProtectedRoute, postLoginRoute, and anywhere else that needs to gate access.
 */

import { supabase } from './supabase';
import { hasActiveSubscription } from './subscriptionAccess';
import type { SubscriptionSettings } from './subscriptionAccess';

export type Membership = { workspace_id: string; role: string };

export type AppAccessResult = {
  canEnter: boolean;
  /** Why access was granted or denied. 'network_error' means we failed open due to connectivity. */
  reason: 'workspace' | 'own_subscription' | 'none' | 'network_error';
  /** True when the user's own subscription is past_due (admin/solo path only). */
  isPastDue: boolean;
  /** True when user is a non-admin workspace member whose workspace subscription lapsed. */
  isLapsedMember: boolean;
  /** Highest role across all workspace memberships. Defaults to 'Admin' for workspace owners. */
  userRole: string;
  /** True when the user's only workspace role(s) are non-admin (Recruiter, HiringManager, Viewer). */
  isNonAdminMember: boolean;
  /** Raw membership rows — available for callers that need workspace IDs or role details. */
  memberships: Membership[];
};

const ROLE_HIERARCHY = ['Admin', 'Recruiter', 'HiringManager', 'Viewer'] as const;
const NON_ADMIN_ROLES = new Set(['Recruiter', 'HiringManager', 'Viewer']);

const isNetworkErr = (e: any): boolean => {
  if (!e) return false;
  const m = (e?.message || '').toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    !navigator.onLine
  );
};

/** Fail-open result used when a network error prevents us from checking access. */
const networkErrorResult = (memberships: Membership[] = []): AppAccessResult => {
  const allRoles = memberships.map(m => m.role);
  const userRole = ROLE_HIERARCHY.find(r => allRoles.includes(r)) ?? 'Admin';
  const isNonAdminMember = memberships.some(m => NON_ADMIN_ROLES.has(m.role));
  return {
    canEnter: true,
    reason: 'network_error',
    isPastDue: false,
    isLapsedMember: false,
    userRole,
    isNonAdminMember,
    memberships,
  };
};

/**
 * Determines whether a user can enter the app.
 *
 * Order of checks:
 * 1. Bail immediately if offline (fail open).
 * 2. Query workspace_members + user_settings in parallel.
 * 3. If in a workspace → call workspace_has_active_subscription RPC (handles both
 *    free-access design-partner grants and real Stripe subscriptions in one query).
 * 4. If no workspace access → check own Stripe subscription.
 * 5. Network errors at any step → fail open (canEnter: true, reason: 'network_error').
 */
export async function checkAppAccess(userId: string): Promise<AppAccessResult> {
  if (!navigator.onLine) return networkErrorResult();

  const [membershipsRes, settingsRes] = await Promise.all([
    supabase.from('workspace_members').select('workspace_id, role').eq('user_id', userId),
    supabase
      .from('user_settings')
      .select('subscription_status, subscription_stripe_id, billing_plan_name')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (isNetworkErr(membershipsRes.error) || isNetworkErr(settingsRes.error)) {
    return networkErrorResult();
  }

  const memberships = (membershipsRes.data || []) as Membership[];
  const allRoles = memberships.map(m => m.role).filter(Boolean);
  const userRole = ROLE_HIERARCHY.find(r => allRoles.includes(r)) ?? 'Admin';
  const isNonAdminMember = memberships.some(m => NON_ADMIN_ROLES.has(m.role));
  const workspaceIds = [...new Set(memberships.map(m => m.workspace_id).filter(Boolean))];

  // ── Workspace access ──────────────────────────────────────────────────────
  if (workspaceIds.length > 0) {
    for (const wsId of workspaceIds) {
      const { data: hasActiveSub, error: rpcErr } = await supabase.rpc(
        'workspace_has_active_subscription',
        { ws_id: wsId }
      );
      if (isNetworkErr(rpcErr)) return networkErrorResult(memberships);
      if (rpcErr) return networkErrorResult(memberships); // non-network DB error → fail open
      if (hasActiveSub === true) {
        return { canEnter: true, reason: 'workspace', isPastDue: false, isLapsedMember: false, userRole, isNonAdminMember, memberships };
      }
    }
    // Every workspace's subscription has lapsed.
    // Non-admin members can't self-subscribe — show workspace-lapsed page.
    // Only applies when the user has NO admin role in any workspace; if they
    // are also an Admin elsewhere they should be able to self-subscribe.
    const hasAnyAdminRole = memberships.some(m => m.role === 'Admin');
    if (isNonAdminMember && !hasAnyAdminRole) {
      return { canEnter: false, reason: 'none', isPastDue: false, isLapsedMember: true, userRole, isNonAdminMember, memberships };
    }
    // Workspace admin with no active workspace subscription → fall through to own subscription.
  }

  // ── Own subscription (workspace admins + solo users) ─────────────────────
  const settings = settingsRes.data as SubscriptionSettings | null;
  const hasOwn = hasActiveSubscription(settings);
  const isPastDue = !hasOwn && (settings?.subscription_status || '').toLowerCase() === 'past_due';

  return {
    canEnter: hasOwn,
    reason: hasOwn ? 'own_subscription' : 'none',
    isPastDue,
    isLapsedMember: false,
    userRole,
    isNonAdminMember,
    memberships,
  };
}
