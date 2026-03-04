/**
 * Access rule: only active Stripe subscriptions (or is_free_access design partners) can use the app.
 * Canceled, expired, past_due, or no subscription → must see upgrade screen.
 */

export type SubscriptionSettings = {
  subscription_status?: string | null;
  subscription_stripe_id?: string | null;
  billing_plan_name?: string | null;
};

/**
 * True when the user has an active subscription.
 * Note: 'trialing' is no longer used — we offer a 14-day money-back guarantee, not a free trial.
 */
export function hasActiveSubscription(settings: SubscriptionSettings | null | undefined): boolean {
  if (!settings) return false;
  const status = (settings.subscription_status || '').toLowerCase();
  return status === 'active';
}
