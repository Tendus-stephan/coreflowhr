/**
 * Access rule: only active or trialing Stripe subscriptions can use the app.
 * Canceled, expired, past_due, or no subscription → must see pricing/renew.
 */

export type SubscriptionSettings = {
  subscription_status?: string | null;
  subscription_stripe_id?: string | null;
  billing_plan_name?: string | null;
};

/**
 * True only when the user has an active or trialing subscription.
 * Having a plan name or stripe id alone is not enough (avoids access after cancel/expiry).
 */
export function hasActiveSubscription(settings: SubscriptionSettings | null | undefined): boolean {
  if (!settings) return false;
  const status = (settings.subscription_status || '').toLowerCase();
  return status === 'active' || status === 'trialing';
}
