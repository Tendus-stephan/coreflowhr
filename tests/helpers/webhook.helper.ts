/**
 * Webhook simulation helpers for E2E tests.
 * Sends crafted payloads to the app's webhook endpoints to simulate
 * third-party events without needing real services.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// ── Resend inbound ────────────────────────────────────────────────────────────

export interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
  inReplyTo?: string;
}

/**
 * POST a simulated Resend inbound email to the app's inbound webhook.
 */
export async function simulateResendInbound(payload: InboundEmailPayload): Promise<Response> {
  const body = {
    from: payload.from,
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html ?? `<p>${payload.text}</p>`,
    messageId: payload.messageId ?? `<qa-${Date.now()}@coreflow-test.com>`,
    inReplyTo: payload.inReplyTo ?? null,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const res = await fetch(`${BASE_URL}/api/resend-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res;
}

// ── Stripe ────────────────────────────────────────────────────────────────────

export type StripeEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded'
  | 'checkout.session.completed';

/**
 * POST a simulated Stripe webhook event to the app's Stripe webhook endpoint.
 * Uses the test webhook secret from the environment.
 */
export async function simulateStripeEvent(
  eventType: StripeEventType,
  data: Record<string, unknown>
): Promise<Response> {
  const event = {
    id: `evt_qa_${Date.now()}`,
    object: 'event',
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: data },
  };

  // Generate a simple test signature (only works when Stripe signature verification
  // is disabled in test mode via STRIPE_WEBHOOK_SECRET=whsec_test)
  const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || 'whsec_test';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = `t=${timestamp},v1=qa_test_signature`;

  const res = await fetch(`${BASE_URL}/api/stripe-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
      'x-qa-test-mode': '1',
    },
    body: JSON.stringify(event),
  });

  return res;
}
