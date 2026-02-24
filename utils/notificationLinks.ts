/**
 * Returns the app path to navigate to for a notification, or '' if no link.
 */
export function getNotificationLink(type: string, desc: string): string {
  switch (type) {
    case 'counter_offer_received':
    case 'offer_accepted':
    case 'offer_declined':
      return '/offers';
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
      return '/settings';
    default:
      return '/dashboard';
  }
}
