/**
 * Returns the app path to navigate to for a notification, or '' if no link.
 */
/** Extract candidateId from desc when format is "... [candidateId:uuid]" */
function parseCandidateIdFromDesc(desc: string): string | null {
  const match = desc.match(/\s\[candidateId:([a-f0-9-]+)\]$/i);
  return match ? match[1] : null;
}

export function getNotificationLink(type: string, desc: string): string {
  if (type === 'candidate_replied') {
    const candidateId = parseCandidateIdFromDesc(desc);
    if (candidateId) return `/candidates?candidateId=${candidateId}&tab=email&emailSubTab=history`;
    return '/candidates';
  }
  switch (type) {
    case 'counter_offer_received':
    case 'offer_accepted':
    case 'offer_declined':
      return '/offers';
    case 'candidate_replied': {
      const match = desc && /\[candidateId:([a-f0-9-]+)\]$/i.exec(desc);
      const id = match ? match[1] : '';
      return id ? `/candidates?candidateId=${id}&tab=email&emailSubTab=history` : '/candidates';
    }
    case 'candidate_moved':
    case 'candidate_added':
    case 'cv_parsed':
    case 'candidate_graded':
    case 'interview_feedback_reminder':
    case 'interview_reminder':
    case 'interview_scheduled':
      return '/candidates';
    case 'new_application':
    case 'assessment_completed':
    case 'recruitment_reminder':
    case 'job_status_update':
    case 'job_expired':
    case 'sourcing_complete':
    case 'sourcing_failed':
      return '/jobs';
    case 'workflow_success':
    case 'workflow_failed':
    case 'ranking_updated':
    case 'new_match':
      return '/dashboard';
    case 'account_change':
    case 'permission_update':
    case 'password_expiry':
    case 'feature_announcement':
    case 'password_changed':
    case '2fa_enabled':
    case '2fa_disabled':
    case 'integration_connected':
    case 'integration_disconnected':
    case 'member_joined':
      return '/settings';
    default:
      return '/dashboard';
  }
}
