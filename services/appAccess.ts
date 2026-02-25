/**
 * App access: workspace-first, then personal subscription.
 *
 * Mental model: the subscription belongs to the workspace. If the user belongs to a
 * workspace that has an active subscription, they can enter. Otherwise, if they have
 * their own active subscription (solo customer), they can enter. Otherwise → pricing.
 */

import { supabase } from './supabase';
import { hasActiveSubscription } from './subscriptionAccess';
import type { SubscriptionSettings } from './subscriptionAccess';

export type AppAccessResult = {
  canEnter: boolean;
  reason: 'workspace' | 'own_subscription' | 'none';
};

/**
 * Determines if the user can enter the app (dashboard, etc.).
 * 1. If user belongs to at least one workspace that has an active subscription → can enter (reason: workspace).
 * 2. Else if user has their own active subscription → can enter (reason: own_subscription).
 * 3. Else → cannot enter (reason: none); show pricing.
 */
export async function checkAppAccess(userId: string): Promise<AppAccessResult> {
  // 1) User's workspace memberships
  const { data: memberships, error: memError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  if (memError) {
    console.warn('App access: workspace_members check failed', memError);
    // Fall back to own subscription only
    const own = await getOwnSubscription(userId);
    return {
      canEnter: hasActiveSubscription(own),
      reason: hasActiveSubscription(own) ? 'own_subscription' : 'none',
    };
  }

  const workspaceIds = [...new Set((memberships || []).map((m: { workspace_id: string }) => m.workspace_id))];
  if (workspaceIds.length > 0) {
    // 2) Any member of those workspaces with active subscription?
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('user_id')
      .in('workspace_id', workspaceIds);
    const memberUserIds = [...new Set((memberRows || []).map((r: { user_id: string }) => r.user_id))];
    if (memberUserIds.length > 0) {
      const { data: settingsRows } = await supabase
        .from('user_settings')
        .select('subscription_status')
        .in('user_id', memberUserIds);
      const workspaceHasActive = (settingsRows || []).some(
        (s: { subscription_status?: string | null }) => hasActiveSubscription(s as SubscriptionSettings)
      );
      if (workspaceHasActive) {
        return { canEnter: true, reason: 'workspace' };
      }
    }
  }

  // 3) Own subscription
  const ownSettings = await getOwnSubscription(userId);
  const hasOwn = hasActiveSubscription(ownSettings);
  return {
    canEnter: hasOwn,
    reason: hasOwn ? 'own_subscription' : 'none',
  };
}

async function getOwnSubscription(userId: string): Promise<SubscriptionSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('subscription_status, subscription_stripe_id, billing_plan_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as SubscriptionSettings;
}
