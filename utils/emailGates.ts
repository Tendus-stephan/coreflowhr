/**
 * Email preference gate.
 * Determines whether a given email type should be sent for a workspace,
 * based on the workspace's email notification preferences.
 *
 * payment_failed emails can NEVER be disabled — regulatory / business requirement.
 */

export type EmailType =
  | 'stage_changed'
  | 'candidate_added'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'interview_scheduled'
  | 'payment_failed'
  | 'team_invited';

/** Always-on email types that cannot be disabled by workspace preferences. */
const ALWAYS_ON: EmailType[] = ['payment_failed'];

export interface EmailPreferences {
  [key: string]: boolean;
}

/**
 * Returns true if the given email type should be sent.
 *
 * @param prefs   - workspace email preferences object (from DB)
 * @param emailType - type of email to check
 *
 * @throws if workspaceId is missing (indicates a programming error)
 */
export function canSendEmail(
  workspaceId: string | null | undefined,
  emailType: EmailType,
  prefs: EmailPreferences | null | undefined
): boolean {
  if (!workspaceId) throw new Error('canSendEmail: workspaceId must not be null or undefined');

  // payment_failed is always on
  if (ALWAYS_ON.includes(emailType)) return true;

  // Unknown email type → fail closed (safe default)
  const knownTypes: EmailType[] = [
    'stage_changed', 'candidate_added', 'offer_sent', 'offer_accepted',
    'offer_declined', 'interview_scheduled', 'payment_failed', 'team_invited',
  ];
  if (!knownTypes.includes(emailType)) return false;

  // If prefs unavailable (DB down, etc.) → fail open for transactional emails
  if (prefs == null) return true;

  // Check the preference; default true if key not present
  const key = emailType as string;
  return prefs[key] !== false;
}
