/**
 * Slack Incoming Webhook notifications.
 * Webhook URLs are stored per-workspace in workspaces.slack_webhook_url.
 */

export interface SlackBlock {
  type: string;
  [key: string]: any;
}

export async function sendSlackNotification(
  webhookUrl: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<void> {
  try {
    const payload: { text: string; blocks?: SlackBlock[] } = { text };
    if (blocks) payload.blocks = blocks;
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail — Slack notifications are non-critical
  }
}

export function buildCandidateStagedBlocks(
  candidateName: string,
  stage: string,
  jobTitle?: string
): SlackBlock[] {
  const stageEmoji: Record<string, string> = {
    Screening: '🔍',
    Interview: '🎙️',
    Offer: '📄',
    Hired: '🎉',
    Rejected: '❌',
    New: '⭐',
  };
  const emoji = stageEmoji[stage] ?? '📌';
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${candidateName}* moved to *${stage}*${jobTitle ? ` for _${jobTitle}_` : ''}`,
      },
    },
  ];
}

export function buildInterviewScheduledBlocks(
  candidateName: string,
  jobTitle: string,
  date: string
): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🗓️ Interview scheduled with *${candidateName}* for _${jobTitle}_ on *${date}*`,
      },
    },
  ];
}
