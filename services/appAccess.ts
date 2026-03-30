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
  /** True when the user's own subscription is past_due (payment failed). Only set for non-workspace-member paths. */
  isPastDue?: boolean;
};

/**
 * Determines if the user can enter the app (dashboard, etc.).
 * 1. If user belongs to at least one workspace that has an active subscription → can enter (reason: workspace).
 *    Uses the workspace_has_active_subscription SECURITY DEFINER RPC to bypass RLS on user_settings.
 * 2. Else if user has their own active subscription → can enter (reason: own_subscription).
 * 3. Else → cannot enter (reason: none); show pricing. isPastDue=true if payment failed.
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
    return checkOwnSubscription(userId);
  }

  const workspaceIds = [...new Set((memberships || []).map((m: { workspace_id: string }) => m.workspace_id))];
  if (workspaceIds.length > 0) {
    // Use SECURITY DEFINER RPC — direct user_settings queries are blocked by RLS
    // (auth.uid() = user_id), so querying another user's subscription row returns nothing.
    for (const wsId of workspaceIds) {
      const { data: hasActiveSub } = await supabase.rpc('workspace_has_active_subscription', { ws_id: wsId });
      if (hasActiveSub === true) {
        return { canEnter: true, reason: 'workspace' };
      }
    }
  }

  // 2) Own subscription
  return checkOwnSubscription(userId);
}

async function checkOwnSubscription(userId: string): Promise<AppAccessResult> {
  const ownSettings = await getOwnSubscription(userId);
  const hasOwn = hasActiveSubscription(ownSettings);
  const isPastDue = !hasOwn && (ownSettings?.subscription_status || '').toLowerCase() === 'past_due';
  return {
    canEnter: hasOwn,
    reason: hasOwn ? 'own_subscription' : 'none',
    isPastDue,
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
