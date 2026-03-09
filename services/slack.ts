/**
 * Slack Incoming Webhook notifications.
 * Webhook URLs are stored per-workspace in workspaces.slack_webhook_url.
 *
 * NOTE: Slack webhooks block browser-originated fetch (CORS). Notifications
 * are proxied through the `notify-slack` Supabase Edge Function which runs
 * server-side and has no CORS restrictions.
 */
import { supabase } from './supabase';

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
    await supabase.functions.invoke('notify-slack', {
      body: { webhookUrl, text, blocks },
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

export function buildOfferSentBlocks(
  candidateName: string,
  jobTitle: string,
  positionTitle?: string
): SlackBlock[] {
  const role = positionTitle || jobTitle;
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📨 Offer sent to *${candidateName}* for *${role}*`,
      },
    },
  ];
}

export function buildOfferRespondedBlocks(
  candidateName: string,
  response: 'accepted' | 'declined' | 'negotiating',
  jobTitle?: string
): SlackBlock[] {
  const map = {
    accepted: { emoji: '✅', verb: 'accepted' },
    declined:  { emoji: '❌', verb: 'declined' },
    negotiating: { emoji: '🤝', verb: 'countered' },
  };
  const { emoji, verb } = map[response];
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${candidateName}* ${verb} the offer${jobTitle ? ` for _${jobTitle}_` : ''}`,
      },
    },
  ];
}

export function buildCandidateAddedBlocks(
  candidateName: string,
  jobTitle: string,
  source?: string
): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `➕ New candidate *${candidateName}* added to _${jobTitle}_${source ? ` via ${source}` : ''}`,
      },
    },
  ];
}

/** Adds a deep-link "View in CoreFlowHR" button block */
function buildDeepLinkAction(label: string, url: string): SlackBlock {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: label, emoji: true },
        url,
      },
    ],
  };
}

export function buildFeedbackSubmittedBlocks(
  candidateName: string,
  jobTitle?: string,
  recommendation?: string,
  candidateId?: string
): SlackBlock[] {
  const recText = recommendation ? ` — Recommendation: *${recommendation}*` : '';
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📝 Interview feedback submitted for *${candidateName}*${jobTitle ? ` (_${jobTitle}_)` : ''}${recText}`,
      },
    },
  ];
  if (candidateId) {
    blocks.push(buildDeepLinkAction('View Candidate', `https://www.coreflowhr.com/candidates?candidateId=${candidateId}`));
  }
  return blocks;
}

export function buildJobStatusBlocks(
  jobTitle: string,
  status: 'opened' | 'closed',
  candidateCount?: number,
  jobId?: string
): SlackBlock[] {
  const emoji = status === 'opened' ? '🟢' : '🔴';
  const verb = status === 'opened' ? 'opened' : 'closed';
  const countText = candidateCount !== undefined ? ` · ${candidateCount} candidate${candidateCount !== 1 ? 's' : ''}` : '';
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} Job *${jobTitle}* has been ${verb}${countText}`,
      },
    },
  ];
  if (jobId) {
    blocks.push(buildDeepLinkAction('View Job', `https://www.coreflowhr.com/candidates?job=${jobId}`));
  }
  return blocks;
}

export function buildTeamMemberJoinedBlocks(email: string, role?: string): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👋 *${email}* joined your CoreFlowHR workspace${role ? ` as _${role}_` : ''}`,
      },
    },
  ];
}

export function buildOfferSignedBlocks(
  candidateName: string,
  jobTitle?: string,
  candidateId?: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✍️ *${candidateName}* signed the offer${jobTitle ? ` for _${jobTitle}_` : ''}`,
      },
    },
  ];
  if (candidateId) {
    blocks.push(buildDeepLinkAction('View Candidate', `https://www.coreflowhr.com/candidates?candidateId=${candidateId}`));
  }
  return blocks;
}

export function buildSourcingCompleteBlocks(
  jobTitle: string,
  count: number,
  jobId?: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔍 AI sourcing complete for *${jobTitle}* — *${count}* candidate${count !== 1 ? 's' : ''} found`,
      },
    },
  ];
  if (jobId) {
    blocks.push(buildDeepLinkAction('View Pipeline', `https://www.coreflowhr.com/candidates?job=${jobId}`));
  }
  return blocks;
}

export function buildCandidateRepliedBlocks(
  candidateName: string,
  subject?: string,
  candidateId?: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `💬 *${candidateName}* replied to your email${subject ? `: _${subject}_` : ''}`,
      },
    },
  ];
  if (candidateId) {
    blocks.push(buildDeepLinkAction('View Conversation', `https://www.coreflowhr.com/candidates?candidateId=${candidateId}&tab=email`));
  }
  return blocks;
}

export function buildInterviewReminderBlocks(
  candidateName: string,
  jobTitle: string,
  date: string,
  time: string,
  type: string,
  meetingLink?: string,
  candidateId?: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⏰ *Upcoming interview in ~30 min*\n*${candidateName}* · _${jobTitle}_\n📅 ${date} at ${time} · ${type}`,
      },
    },
  ];
  if (meetingLink) {
    blocks.push(buildDeepLinkAction('Join Meeting', meetingLink));
  } else if (candidateId) {
    blocks.push(buildDeepLinkAction('View Interview', `https://www.coreflowhr.com/candidates?candidateId=${candidateId}`));
  }
  return blocks;
}
