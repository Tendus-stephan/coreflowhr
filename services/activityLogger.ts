import { supabase } from './supabase';

/**
 * Comprehensive activity logging service
 * Logs all important actions in the workspace
 */

export type ActivityAction =
    // Candidate-Related Activities
    | 'candidate_added'
    | 'cv_parsed'
    | 'candidate_scored'
    | 'candidate_ranking_updated'
    | 'candidate_moved'
    | 'candidate_profile_updated'
    | 'candidate_edited'
    | 'workflow_triggered'
    // Job Post Activities
    | 'job_created'
    | 'job_edited'
    | 'job_published'
    | 'job_unpublished'
    | 'job_closed'
    | 'job_deleted'
    | 'job_expired'
    | 'job_cloned'
    | 'job_settings_updated'
    // Communication Logs
    | 'email_received'
    | 'email_sent'
    | 'message_replied'
    | 'message_forwarded'
    | 'note_added'
    // System Actions
    | 'workflow_executed'
    | 'workflow_error'
    | 'automation_updated'
    | 'permission_updated'
    | 'integration_connected'
    | 'integration_disconnected';

interface LogActivityParams {
    action: ActivityAction;
    target: string;
    targetTo?: string;
    metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity log
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userId = user.id;

        // Get user name from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .maybeSingle();

        const userName = profile?.name || user.email?.split('@')[0] || 'You';

        // Format action text based on action type
        const actionText = formatActionText(params.action, params.target, params.targetTo);

        await supabase
            .from('activity_log')
            .insert({
                user_id: userId,
                user_name: userName,
                action: actionText,
                target: params.target,
                target_to: params.targetTo || null
            });
    } catch (error) {
        // Don't fail the operation if logging fails
        console.error('Error logging activity:', error);
    }
};

/**
 * Format action text for display
 */
const formatActionText = (action: ActivityAction, target: string, targetTo?: string): string => {
    const actionMap: Record<ActivityAction, string> = {
        // Candidate-Related
        candidate_added: 'added candidate',
        cv_parsed: 'parsed CV',
        candidate_scored: 'scored candidate',
        candidate_ranking_updated: 'updated candidate ranking',
        candidate_moved: 'moved candidate',
        candidate_profile_updated: 'updated candidate profile',
        candidate_edited: 'edited candidate',
        workflow_triggered: 'triggered workflow',
        // Job Post Activities
        job_created: 'created job',
        job_edited: 'edited job',
        job_published: 'published job',
        job_unpublished: 'unpublished job',
        job_closed: 'closed job',
        job_deleted: 'deleted job',
        job_expired: 'job expired',
        job_cloned: 'cloned job',
        job_settings_updated: 'updated job settings',
        // Communication
        email_received: 'received email',
        email_sent: 'sent email',
        message_replied: 'replied to message',
        message_forwarded: 'forwarded message',
        note_added: 'added note',
        // System Actions
        workflow_executed: 'executed workflow',
        workflow_error: 'workflow error',
        automation_updated: 'updated automation',
        permission_updated: 'updated permissions',
        integration_connected: 'connected integration',
        integration_disconnected: 'disconnected integration'
    };

    const baseAction = actionMap[action] || action;
    
    if (targetTo) {
        return `${baseAction} from "${target}" to "${targetTo}"`;
    }
    
    return `${baseAction} "${target}"`;
};

/**
 * Helper functions for specific activity types
 */

// Candidate Activities
export const logCandidateAdded = async (candidateName: string) => {
    await logActivity({
        action: 'candidate_added',
        target: candidateName
    });
};

export const logCVParsed = async (candidateName: string, source?: string) => {
    await logActivity({
        action: 'cv_parsed',
        target: candidateName,
        metadata: { source }
    });
};

export const logCandidateScored = async (candidateName: string, score?: number) => {
    await logActivity({
        action: 'candidate_scored',
        target: candidateName,
        metadata: { score }
    });
};

export const logCandidateMoved = async (candidateName: string, fromStage: string, toStage: string) => {
    await logActivity({
        action: 'candidate_moved',
        target: candidateName,
        targetTo: `${fromStage} → ${toStage}`
    });
};

export const logCandidateEdited = async (candidateName: string) => {
    await logActivity({
        action: 'candidate_edited',
        target: candidateName
    });
};

export const logWorkflowTriggered = async (workflowName: string, candidateName?: string) => {
    await logActivity({
        action: 'workflow_triggered',
        target: workflowName,
        targetTo: candidateName
    });
};

// Job Activities
export const logJobCreated = async (jobTitle: string) => {
    await logActivity({
        action: 'job_created',
        target: jobTitle
    });
};

export const logJobEdited = async (jobTitle: string) => {
    await logActivity({
        action: 'job_edited',
        target: jobTitle
    });
};

export const logJobPublished = async (jobTitle: string) => {
    await logActivity({
        action: 'job_published',
        target: jobTitle
    });
};

export const logJobUnpublished = async (jobTitle: string) => {
    await logActivity({
        action: 'job_unpublished',
        target: jobTitle
    });
};

export const logJobExpired = async (jobTitle: string) => {
    await logActivity({
        action: 'job_expired',
        target: jobTitle
    });
};

export const logJobCloned = async (originalTitle: string, newTitle: string) => {
    await logActivity({
        action: 'job_cloned',
        target: originalTitle,
        targetTo: newTitle
    });
};

export const logJobClosed = async (jobTitle: string) => {
    await logActivity({
        action: 'job_closed',
        target: jobTitle
    });
};

export const logJobDeleted = async (jobTitle: string) => {
    await logActivity({
        action: 'job_deleted',
        target: jobTitle
    });
};

export const logJobSettingsUpdated = async (jobTitle: string) => {
    await logActivity({
        action: 'job_settings_updated',
        target: jobTitle
    });
};

// Communication Activities
export const logEmailReceived = async (from: string, subject?: string) => {
    await logActivity({
        action: 'email_received',
        target: from,
        targetTo: subject
    });
};

export const logEmailSent = async (to: string, subject?: string) => {
    await logActivity({
        action: 'email_sent',
        target: to,
        targetTo: subject
    });
};

export const logNoteAdded = async (target: string, noteType: 'candidate' | 'job') => {
    await logActivity({
        action: 'note_added',
        target: target,
        metadata: { type: noteType }
    });
};

// System Activities
export const logWorkflowExecuted = async (workflowName: string, success: boolean) => {
    await logActivity({
        action: success ? 'workflow_executed' : 'workflow_error',
        target: workflowName
    });
};

export const logIntegrationConnected = async (integrationName: string) => {
    await logActivity({
        action: 'integration_connected',
        target: integrationName
    });
};

export const logIntegrationDisconnected = async (integrationName: string) => {
    await logActivity({
        action: 'integration_disconnected',
        target: integrationName
    });
};

export const logInterviewScheduled = async (candidateName: string, jobTitle: string, date: string) => {
    await logActivity({
        action: 'email_sent',
        target: candidateName,
        targetTo: `Interview scheduled for ${jobTitle} on ${new Date(date).toLocaleDateString()}`
    });
};

