/**
 * Slack notifications via the Bot API (chat.postMessage).
 * Bot tokens are stored per-workspace via OAuth — no manual webhook URLs needed.
 */

export interface SlackBlock {
  type: string;
  [key: string]: any;
}

export async function sendSlackNotification(
  botToken: string,
  channelId: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<void> {
  try {
    const payload: { channel: string; text: string; blocks?: SlackBlock[] } = {
      channel: channelId,
      text,
    };
    if (blocks) payload.blocks = blocks;
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${botToken}`,
      },
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
