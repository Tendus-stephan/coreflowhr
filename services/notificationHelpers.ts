import { supabase } from './supabase';
import { getNotificationConfig, NotificationType } from '../components/NotificationTypes';

/**
 * Helper function to create a notification with proper type and category
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    desc?: string
): Promise<void> => {
    const config = getNotificationConfig(type);
    
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            desc: desc || '',
            type,
            category: config.category,
            unread: true
        });

    if (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Helper function to create candidate-related notifications
 */
export const notifyCandidateEvent = async (
    userId: string,
    event: 'added' | 'cv_parsed' | 'graded' | 'moved',
    candidateName: string,
    additionalInfo?: string
): Promise<void> => {
    const eventMap: Record<string, { type: NotificationType; title: string; desc: string }> = {
        added: {
            type: 'candidate_added',
            title: 'New Candidate Added',
            desc: `${candidateName} has been added to your candidate pool.${additionalInfo ? ` ${additionalInfo}` : ''}`
        },
        cv_parsed: {
            type: 'cv_parsed',
            title: 'CV Parsed and Profile Created',
            desc: `CV for ${candidateName} has been successfully parsed and profile created.${additionalInfo ? ` ${additionalInfo}` : ''}`
        },
        graded: {
            type: 'candidate_graded',
            title: 'Candidate Graded',
            desc: `${candidateName} has been scored.${additionalInfo ? ` ${additionalInfo}` : ''}`
        },
        moved: {
            type: 'candidate_moved',
            title: 'Candidate Moved to New Stage',
            desc: `${candidateName} has been moved to a new pipeline stage.${additionalInfo ? ` ${additionalInfo}` : ''}`
        }
    };

    const eventData = eventMap[event];
    if (eventData) {
        await createNotification(userId, eventData.type, eventData.title, eventData.desc);
    }
};

/**
 * Helper function to create job-related notifications
 */
export const notifyJobEvent = async (
    userId: string,
    event: 'new_application' | 'assessment_completed' | 'reminder' | 'status_update',
    jobTitle: string,
    additionalInfo?: string
): Promise<void> => {
    const eventMap: Record<string, { type: NotificationType; title: string; desc: string }> = {
        new_application: {
            type: 'new_application',
            title: 'New Application Received',
            desc: `A new application has been received for ${jobTitle}.${additionalInfo ? ` ${additionalInfo}` : ''}`
        },
        assessment_completed: {
            type: 'assessment_completed',
            title: 'Assessment Completed',
            desc: `A candidate has completed the assessment for ${jobTitle}.${additionalInfo ? ` ${additionalInfo}` : ''}`
        },
        reminder: {
            type: 'recruitment_reminder',
            title: 'Recruitment Stage Reminder',
            desc: `Reminder: ${jobTitle} - ${additionalInfo || 'Action required'}`
        },
        status_update: {
            type: 'job_status_update',
            title: 'Job Status Updated',
            desc: `${jobTitle} status has been updated.${additionalInfo ? ` ${additionalInfo}` : ''}`
        }
    };

    const eventData = eventMap[event];
    if (eventData) {
        await createNotification(userId, eventData.type, eventData.title, eventData.desc);
    }
};

/**
 * Helper function to create automation-related notifications
 */
export const notifyAutomationEvent = async (
    userId: string,
    event: 'workflow_success' | 'workflow_failed' | 'ranking_updated' | 'new_match',
    title: string,
    desc?: string
): Promise<void> => {
    await createNotification(userId, event, title, desc);
};

/**
 * Helper function to create communication-related notifications
 */
export const notifyCommunicationEvent = async (
    userId: string,
    event: 'email_received' | 'cv_inbound_parsed' | 'candidate_replied',
    title: string,
    desc?: string
): Promise<void> => {
    await createNotification(userId, event, title, desc);
};

/**
 * Helper function to create system-related notifications
 */
export const notifySystemEvent = async (
    userId: string,
    event: 'account_change' | 'permission_update' | 'password_expiry' | 'feature_announcement',
    title: string,
    desc?: string
): Promise<void> => {
    await createNotification(userId, event, title, desc);
};













