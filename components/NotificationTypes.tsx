import React from 'react';
import {
    UserPlus, Users, FileText, Star, ArrowRight, Briefcase, CheckCircle, Clock,
    AlertCircle, Zap, XCircle, TrendingUp, Search, Mail, FileCheck,
    Settings, Shield, Bell, Sparkles, Key, Link2, Calendar, CalendarX
} from 'lucide-react';

export type NotificationType =
    // Candidate Events
    | 'candidate_added'
    | 'cv_parsed'
    | 'candidate_graded'
    | 'candidate_moved'
    // Job Post Activity
    | 'new_application'
    | 'assessment_completed'
    | 'recruitment_reminder'
    | 'job_status_update'
    // Automation Activity
    | 'workflow_success'
    | 'workflow_failed'
    | 'ranking_updated'
    | 'new_match'
    // Communication Events
    | 'email_received'
    | 'cv_inbound_parsed'
    | 'candidate_replied'
    // Offer Events
    | 'offer_accepted'
    | 'offer_declined'
    | 'counter_offer_received'
    // System Alerts
    | 'account_change'
    | 'permission_update'
    | 'password_expiry'
    | 'feature_announcement'
    | 'password_changed'
    | '2fa_enabled'
    | '2fa_disabled'
    | 'integration_connected'
    | 'integration_disconnected'
    | 'interview_scheduled'
    | 'interview_cancelled'
    | 'interview_feedback_reminder'
    | 'interview_reminder'
    | 'job_expired'
    | 'sourcing_complete'
    | 'sourcing_failed'
    | 'inactivity_nudge'
    | 'weekly_digest'
    | 'member_joined'
    | 'system';

export type NotificationCategory =
    | 'candidate'
    | 'job'
    | 'automation'
    | 'communication'
    | 'system';

export interface NotificationTypeConfig {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
    category: NotificationCategory;
}

const GRAY = { color: 'text-gray-500', bgColor: 'bg-gray-100' };

export const notificationTypes: Record<NotificationType, NotificationTypeConfig> = {
    // Candidate Events
    candidate_added:            { icon: UserPlus,    ...GRAY, category: 'candidate' },
    cv_parsed:                  { icon: FileText,    ...GRAY, category: 'candidate' },
    candidate_graded:           { icon: Star,        ...GRAY, category: 'candidate' },
    candidate_moved:            { icon: ArrowRight,  ...GRAY, category: 'candidate' },
    // Job Post Activity
    new_application:            { icon: Briefcase,   ...GRAY, category: 'job' },
    interview_scheduled:        { icon: Calendar,    ...GRAY, category: 'job' },
    interview_cancelled:        { icon: CalendarX,   ...GRAY, category: 'job' },
    interview_feedback_reminder:{ icon: FileCheck,   ...GRAY, category: 'candidate' },
    interview_reminder:         { icon: Clock,       ...GRAY, category: 'job' },
    job_expired:                { icon: CalendarX,   ...GRAY, category: 'job' },
    sourcing_complete:          { icon: Users,       ...GRAY, category: 'automation' },
    sourcing_failed:            { icon: AlertCircle, ...GRAY, category: 'automation' },
    inactivity_nudge:           { icon: Bell,        ...GRAY, category: 'system' },
    weekly_digest:              { icon: FileText,    ...GRAY, category: 'system' },
    assessment_completed:       { icon: CheckCircle, ...GRAY, category: 'job' },
    recruitment_reminder:       { icon: Clock,       ...GRAY, category: 'job' },
    job_status_update:          { icon: AlertCircle, ...GRAY, category: 'job' },
    // Automation Activity
    workflow_success:           { icon: Zap,         ...GRAY, category: 'automation' },
    workflow_failed:            { icon: XCircle,     ...GRAY, category: 'automation' },
    ranking_updated:            { icon: TrendingUp,  ...GRAY, category: 'automation' },
    new_match:                  { icon: Search,      ...GRAY, category: 'automation' },
    // Communication Events
    email_received:             { icon: Mail,        ...GRAY, category: 'communication' },
    cv_inbound_parsed:          { icon: FileCheck,   ...GRAY, category: 'communication' },
    candidate_replied:          { icon: Mail,        ...GRAY, category: 'communication' },
    // Offer Events
    offer_accepted:             { icon: CheckCircle, ...GRAY, category: 'job' },
    offer_declined:             { icon: XCircle,     ...GRAY, category: 'job' },
    counter_offer_received:     { icon: Briefcase,   ...GRAY, category: 'job' },
    // System Alerts
    account_change:             { icon: Settings,    ...GRAY, category: 'system' },
    permission_update:          { icon: Shield,      ...GRAY, category: 'system' },
    password_expiry:            { icon: AlertCircle, ...GRAY, category: 'system' },
    password_changed:           { icon: Key,         ...GRAY, category: 'system' },
    '2fa_enabled':              { icon: Shield,      ...GRAY, category: 'system' },
    '2fa_disabled':             { icon: Shield,      ...GRAY, category: 'system' },
    integration_connected:      { icon: Link2,       ...GRAY, category: 'system' },
    integration_disconnected:   { icon: Link2,       ...GRAY, category: 'system' },
    feature_announcement:       { icon: Sparkles,    ...GRAY, category: 'system' },
    member_joined:              { icon: UserPlus,    ...GRAY, category: 'system' },
    system:                     { icon: Bell,        ...GRAY, category: 'system' },
};

export const getNotificationConfig = (type: string): NotificationTypeConfig => {
    return notificationTypes[type as NotificationType] || notificationTypes.system;
};

export const getCategoryLabel = (category: NotificationCategory): string => {
    const labels: Record<NotificationCategory, string> = {
        candidate: 'Candidate Events',
        job: 'Job Activity',
        automation: 'Automation',
        communication: 'Communication',
        system: 'System Alerts'
    };
    return labels[category] || 'Notifications';
};
