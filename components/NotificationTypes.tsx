import React from 'react';
import {
    UserPlus, FileText, Star, ArrowRight, Briefcase, CheckCircle, Clock, 
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
    | 'job_expired'
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

export const notificationTypes: Record<NotificationType, NotificationTypeConfig> = {
    // Candidate Events
    candidate_added: {
        icon: UserPlus,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'candidate'
    },
    cv_parsed: {
        icon: FileText,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'candidate'
    },
    candidate_graded: {
        icon: Star,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        category: 'candidate'
    },
    candidate_moved: {
        icon: ArrowRight,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        category: 'candidate'
    },
    // Job Post Activity
    new_application: {
        icon: Briefcase,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        category: 'job'
    },
    interview_scheduled: {
        icon: Calendar,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'job'
    },
    job_expired: {
        icon: CalendarX,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        category: 'job'
    },
    assessment_completed: {
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        category: 'job'
    },
    recruitment_reminder: {
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        category: 'job'
    },
    job_status_update: {
        icon: AlertCircle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        category: 'job'
    },
    // Automation Activity
    workflow_success: {
        icon: Zap,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'automation'
    },
    workflow_failed: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        category: 'automation'
    },
    ranking_updated: {
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'automation'
    },
    new_match: {
        icon: Search,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        category: 'automation'
    },
    // Communication Events
    email_received: {
        icon: Mail,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'communication'
    },
    cv_inbound_parsed: {
        icon: FileCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'communication'
    },
    candidate_replied: {
        icon: Mail,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        category: 'communication'
    },
    // Offer Events
    offer_accepted: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'job'
    },
    offer_declined: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        category: 'job'
    },
    counter_offer_received: {
        icon: Briefcase,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        category: 'job'
    },
    // System Alerts
    account_change: {
        icon: Settings,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        category: 'system'
    },
    permission_update: {
        icon: Shield,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        category: 'system'
    },
    password_expiry: {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        category: 'system'
    },
    password_changed: {
        icon: Key,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'system'
    },
    '2fa_enabled': {
        icon: Shield,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'system'
    },
    '2fa_disabled': {
        icon: Shield,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        category: 'system'
    },
    integration_connected: {
        icon: Link2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'system'
    },
    integration_disconnected: {
        icon: Link2,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        category: 'system'
    },
    feature_announcement: {
        icon: Sparkles,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        category: 'system'
    },
    system: {
        icon: Bell,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        category: 'system'
    }
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

