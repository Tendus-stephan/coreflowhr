/**
 * Email verification helpers for E2E tests.
 * Polls Mailpit (local) or a test inbox API to verify email delivery.
 *
 * For CI: set MAILPIT_URL=http://localhost:8025 and run Mailpit as a service.
 * For staging smoke tests: set MAILPIT_URL to a hosted Mailpit instance.
 */

const MAILPIT_URL = process.env.MAILPIT_URL || 'http://localhost:8025';
const POLL_INTERVAL = 2_000; // ms

interface MailpitMessage {
  ID: string;
  From: { Address: string };
  To: Array<{ Address: string }>;
  Subject: string;
  Date: string;
}

interface MailpitMessageDetail extends MailpitMessage {
  Text: string;
  HTML: string;
}

/** Poll the Mailpit API until an email matching recipient + subject arrives. */
export async function waitForEmail(
  recipient: string,
  subject: string,
  timeoutMs = 30_000
): Promise<MailpitMessageDetail> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const msg = await findEmail(recipient, subject);
    if (msg) return msg;
    await sleep(POLL_INTERVAL);
  }

  throw new Error(
    `waitForEmail: timed out after ${timeoutMs}ms waiting for email to "${recipient}" with subject "${subject}"`
  );
}

/** Get the most recent email for a recipient (regardless of subject). */
export async function getLatestEmail(recipient: string): Promise<MailpitMessageDetail | null> {
  const messages = await fetchMessages();
  const match = messages.find((m) =>
    m.To.some((t) => t.Address.toLowerCase() === recipient.toLowerCase())
  );
  if (!match) return null;
  return fetchMessageDetail(match.ID);
}

/** Extract the first href that includes linkText from an email body. */
export function extractLinkFromEmail(email: MailpitMessageDetail, linkText: string): string {
  // Try HTML first
  const htmlMatch = email.HTML?.match(new RegExp(`href=["']([^"']*${escapeRegex(linkText)}[^"']*)["']`, 'i'));
  if (htmlMatch) return htmlMatch[1];

  // Fall back to plain text URL extraction
  const textMatch = email.Text?.match(/(https?:\/\/[^\s]+)/g);
  if (textMatch) {
    const link = textMatch.find((url) => url.includes(linkText));
    if (link) return link;
  }

  throw new Error(`extractLinkFromEmail: no link containing "${linkText}" found in email`);
}

/** Delete all messages from the Mailpit inbox (call in afterEach). */
export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function fetchMessages(): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
  if (!res.ok) return [];
  const data = await res.json() as { messages: MailpitMessage[] };
  return data.messages ?? [];
}

async function fetchMessageDetail(id: string): Promise<MailpitMessageDetail> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`fetchMessageDetail: HTTP ${res.status}`);
  return res.json() as Promise<MailpitMessageDetail>;
}

async function findEmail(
  recipient: string,
  subject: string
): Promise<MailpitMessageDetail | null> {
  const messages = await fetchMessages();
  const match = messages.find(
    (m) =>
      m.To.some((t) => t.Address.toLowerCase() === recipient.toLowerCase()) &&
      m.Subject.toLowerCase().includes(subject.toLowerCase())
  );
  if (!match) return null;
  return fetchMessageDetail(match.ID);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
