import { supabase } from './supabase';
import { EmailWorkflow, Candidate, EmailTemplate } from '../types';

/**
 * Execute a workflow for a candidate
 * @param bypassEnabledCheck - If true, will execute even if workflow is disabled (for testing)
 */
export async function executeWorkflow(
    workflowId: string,
    candidateId: string,
    userId: string,
    bypassEnabledCheck: boolean = false
): Promise<void> {
    try {
        // Get workflow
        const { data: workflow, error: workflowError } = await supabase
            .from('email_workflows')
            .select('*')
            .eq('id', workflowId)
            .eq('user_id', userId)
            .single();

        if (workflowError || !workflow) {
            throw new Error(`Workflow not found: ${workflowError?.message}`);
        }

        if (!workflow.enabled && !bypassEnabledCheck) {
            // Create execution log with skipped status
            await createExecutionLog(workflowId, candidateId, 'skipped', undefined, 'Workflow is disabled');
            return;
        }

        // Get candidate
        const { data: candidate, error: candidateError } = await supabase
            .from('candidates')
            .select('*')
            .eq('id', candidateId)
            .eq('user_id', userId)
            .single();

        if (candidateError || !candidate) {
            throw new Error(`Candidate not found: ${candidateError?.message}`);
        }

        // Check if candidate is a test candidate
        // For "New" stage: Allow emails to test candidates (newly sourced candidates should receive application emails)
        // For other stages: Only skip if they're truly a test candidate (AI-sourced without CV upload)
        // If they have a CV uploaded or applied directly, they're a real candidate and should receive emails
        const isNewStage = workflow.trigger_stage === 'New';
        const hasRealApplication = candidate.source === 'direct_application' || (candidate.cv_file_url || (candidate as any).cvFileUrl);
        
        // Skip test candidates only if not in "New" stage and no real application
        if (candidate.is_test && !isNewStage && !hasRealApplication) {
            await createExecutionLog(workflowId, candidateId, 'skipped', undefined, 'Test candidate - email not sent');
            return;
        }

        // Check conditions
        if (!checkWorkflowConditions(workflow, candidate)) {
            await createExecutionLog(workflowId, candidateId, 'skipped', undefined, 'Workflow conditions not met');
            return;
        }

        // Get email template
        const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', workflow.email_template_id)
            .eq('user_id', userId)
            .single();

        if (templateError || !template) {
            throw new Error(`Email template not found: ${templateError?.message}`);
        }

        // Get user profile for your_name placeholder
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();

        const userName = profile?.name || 'Recruiter';
        // Sender name always defaults to "Recruiter" for emails
        const senderName = 'Recruiter';

        // Get job details if candidate has a job_id
        let jobTitle = candidate.role || 'Position';
        let companyName = 'Our Company';
        let jobId = candidate.job_id;
        
        if (candidate.job_id) {
            const { data: job } = await supabase
                .from('jobs')
                .select('title, company, id')
                .eq('id', candidate.job_id)
                .eq('user_id', userId)
                .single();
            
            if (job) {
                jobTitle = job.title || jobTitle;
                companyName = job.company || companyName;
                jobId = job.id;
            }
        }

        // Get offer details if workflow is for Offer stage
        let offerDetails: any = null;
        if (workflow.trigger_stage === 'Offer') {
            const { data: offer } = await supabase
                .from('offers')
                .select('*')
                .eq('candidate_id', candidateId)
                .eq('user_id', userId)
                .in('status', ['draft', 'sent', 'viewed', 'negotiating'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (offer) {
                offerDetails = {
                    positionTitle: offer.position_title || jobTitle,
                    salaryAmount: offer.salary_amount ? parseFloat(offer.salary_amount) : null,
                    salaryCurrency: offer.salary_currency || 'USD',
                    salaryPeriod: offer.salary_period || 'yearly',
                    startDate: offer.start_date,
                    expiresAt: offer.expires_at,
                    benefits: offer.benefits || [],
                    notes: offer.notes
                };
            }
        }

        // Replace template variables
        let subject = template.subject
            .replace(/{candidate_name}/g, candidate.name)
            .replace(/{job_title}/g, jobTitle)
            .replace(/{company_name}/g, companyName)
            .replace(/{your_name}/g, userName);

        let content = template.content
            .replace(/{candidate_name}/g, candidate.name)
            .replace(/{job_title}/g, jobTitle)
            .replace(/{company_name}/g, companyName)
            .replace(/{your_name}/g, userName);

        // Replace offer-specific placeholders if offer details are available
        if (offerDetails) {
            const formatSalary = () => {
                if (!offerDetails.salaryAmount) return 'To be discussed';
                const currency = offerDetails.salaryCurrency === 'USD' ? '$' : offerDetails.salaryCurrency;
                const period = offerDetails.salaryPeriod === 'yearly' ? 'per year' : offerDetails.salaryPeriod === 'monthly' ? 'per month' : 'per hour';
                return `${currency}${offerDetails.salaryAmount.toLocaleString()} ${period}`;
            };

            const formatDate = (dateString?: string) => {
                if (!dateString) return 'Not specified';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                } catch {
                    return dateString;
                }
            };

            const formatBenefits = () => {
                if (!offerDetails.benefits || offerDetails.benefits.length === 0) return 'Standard benefits package';
                return offerDetails.benefits.join(', ');
            };

            const formatBenefitsList = () => {
                if (!offerDetails.benefits || offerDetails.benefits.length === 0) return 'Standard benefits package';
                return offerDetails.benefits.map((b: string, i: number) => {
                    if (i === offerDetails.benefits.length - 1 && offerDetails.benefits.length > 1) {
                        return `and ${b}`;
                    }
                    return b;
                }).join(', ');
            };

            // Replace offer placeholders in subject
            subject = subject
                .replace(/{position_title}/g, offerDetails.positionTitle)
                .replace(/{salary}/g, formatSalary())
                .replace(/{salary_amount}/g, offerDetails.salaryAmount ? offerDetails.salaryAmount.toLocaleString() : 'TBD')
                .replace(/{salary_currency}/g, offerDetails.salaryCurrency === 'USD' ? '$' : offerDetails.salaryCurrency)
                .replace(/{salary_period}/g, offerDetails.salaryPeriod === 'yearly' ? 'per year' : offerDetails.salaryPeriod === 'monthly' ? 'per month' : 'per hour')
                .replace(/{start_date}/g, formatDate(offerDetails.startDate))
                .replace(/{expires_at}/g, formatDate(offerDetails.expiresAt))
                .replace(/{benefits}/g, formatBenefits())
                .replace(/{benefits_list}/g, formatBenefitsList())
                .replace(/{notes}/g, offerDetails.notes || '');

            // Replace offer placeholders in content
            content = content
                .replace(/{position_title}/g, offerDetails.positionTitle)
                .replace(/{salary}/g, formatSalary())
                .replace(/{salary_amount}/g, offerDetails.salaryAmount ? offerDetails.salaryAmount.toLocaleString() : 'TBD')
                .replace(/{salary_currency}/g, offerDetails.salaryCurrency === 'USD' ? '$' : offerDetails.salaryCurrency)
                .replace(/{salary_period}/g, offerDetails.salaryPeriod === 'yearly' ? 'per year' : offerDetails.salaryPeriod === 'monthly' ? 'per month' : 'per hour')
                .replace(/{start_date}/g, formatDate(offerDetails.startDate))
                .replace(/{expires_at}/g, formatDate(offerDetails.expiresAt))
                .replace(/{benefits}/g, formatBenefits())
                .replace(/{benefits_list}/g, formatBenefitsList())
                .replace(/{notes}/g, offerDetails.notes || '');
        }

        // For "New" stage workflows, add CV upload link if candidate is in "New" stage and has a job
        if (workflow.trigger_stage === 'New' && candidate.stage === 'New' && jobId) {
            // Generate or get CV upload token for this candidate
            let cvUploadToken = candidate.cv_upload_token;
            
            if (!cvUploadToken) {
                // Generate token if not exists
                const { generateSecureToken } = await import('./tokenUtils');
                cvUploadToken = generateSecureToken(32);
                
                // Calculate expiration (30 days from now)
                const tokenExpiresAt = new Date();
                tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);
                
                // Store token in database
                await supabase
                    .from('candidates')
                    .update({
                        cv_upload_token: cvUploadToken,
                        cv_upload_token_expires_at: tokenExpiresAt.toISOString()
                    })
                    .eq('id', candidateId);
            }
            
            // Build CV upload link
            const frontendUrl = typeof window !== 'undefined' 
                ? window.location.origin 
                : 'http://localhost:5173';
            const cvUploadLink = `${frontendUrl}/jobs/apply/${jobId}?token=${cvUploadToken}`;
            
            // Format as clickable HTML link
            const clickableLink = `<a href="${cvUploadLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${cvUploadLink}</a>`;
            const linkSection = `\n\n---\n\nPlease kindly follow the link below to upload your CV:\n${clickableLink}`;
            
            // Add CV upload link - always append at bottom if not in template
            if (content.includes('{cv_upload_link}')) {
                // User has placed the variable - replace it with clickable link
                content = content.replace(/{cv_upload_link}/g, clickableLink);
            } else {
                // Variable not found - append link section at the bottom (forced)
                content = content + linkSection;
            }
        }

        // Create execution log with pending status (with unique constraint to prevent duplicates)
        let executionId: string;
        try {
            executionId = await createExecutionLog(workflowId, candidateId, 'pending', undefined);
        } catch (error: any) {
            // If unique constraint violation (duplicate execution), skip
            if (error?.code === '23505' || error?.message?.includes('unique')) {
                console.log(`[Workflow Engine] Workflow ${workflowId} already executing for candidate ${candidateId}, skipping`);
                return;
            }
            throw error;
        }

        // Apply delay if configured
        if (workflow.delay_minutes > 0) {
            // For now, we'll send immediately but in production you might want to use a queue
            // For simplicity, we'll just send after delay (you could implement a proper job queue)
            await new Promise(resolve => setTimeout(resolve, workflow.delay_minutes * 60 * 1000));
        }

        // Send email via edge function with timeout
        console.log('[Workflow Engine] Attempting to send email:', {
            to: candidate.email,
            subject: subject.substring(0, 50),
            candidateId,
            workflowId
        });
        
        // Add timeout to prevent hanging requests
        const emailPromise = supabase.functions.invoke('send-email', {
            body: {
                to: candidate.email,
                subject: subject,
                content: content,
                fromName: senderName,
                candidateId: candidateId,
                emailType: 'Custom'
            }
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
        );

        const { data: emailResult, error: emailError } = await Promise.race([
            emailPromise,
            timeoutPromise
        ]) as any;

        if (emailError) {
            console.error('[Workflow Engine] Email send error:', emailError);
            await updateExecutionLog(executionId, 'failed', undefined, emailError?.message || 'Email send failed');
            throw new Error(`Failed to send email: ${emailError?.message || 'Unknown error'}`);
        }

        if (!emailResult) {
            console.error('[Workflow Engine] Email send failed - no result');
            await updateExecutionLog(executionId, 'failed', undefined, 'Email send failed - no result from edge function');
            throw new Error('Failed to send email: No result from email service');
        }

        console.log('[Workflow Engine] Email sent successfully:', emailResult);

        // Create email log entry
        const { data: emailLog, error: logError } = await supabase
            .from('email_logs')
            .insert({
                user_id: userId,
                candidate_id: candidateId,
                to_email: candidate.email,
                from_email: userId, // Using user_id as identifier
                subject: subject,
                content: content,
                email_type: 'Custom',
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .select()
            .single();

        if (logError) {
            console.error('Error creating email log:', logError);
        }

        // Update execution log with success
        await updateExecutionLog(executionId, 'sent', emailLog?.id);
    } catch (error: any) {
        console.error('Error executing workflow:', error);
        // Try to update execution log if we have an executionId
        throw error;
    }
}

/**
 * Check if workflow conditions are met for a candidate
 */
function checkWorkflowConditions(workflow: any, candidate: any): boolean {
    // Check minimum match score
    if (workflow.min_match_score !== null && workflow.min_match_score !== undefined) {
        const matchScore = candidate.ai_match_score || 0;
        if (matchScore < workflow.min_match_score) {
            return false;
        }
    }

    // Check source filter
    if (workflow.source_filter && workflow.source_filter.length > 0) {
        const candidateSource = candidate.source || '';
        if (!workflow.source_filter.includes(candidateSource)) {
            return false;
        }
    }

    return true;
}

/**
 * Create an execution log entry
 */
async function createExecutionLog(
    workflowId: string,
    candidateId: string,
    status: 'pending' | 'sent' | 'failed' | 'skipped',
    emailLogId?: string,
    errorMessage?: string
): Promise<string> {
    const { data, error } = await supabase
        .from('workflow_executions')
        .insert({
            workflow_id: workflowId,
            candidate_id: candidateId,
            email_log_id: emailLogId || null,
            status: status,
            error_message: errorMessage || null
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating execution log:', error);
        throw error;
    }

    return data.id;
}

/**
 * Update an execution log entry
 */
async function updateExecutionLog(
    executionId: string,
    status: 'pending' | 'sent' | 'failed' | 'skipped',
    emailLogId?: string,
    errorMessage?: string
): Promise<void> {
    const updateData: any = {
        status: status
    };

    if (emailLogId !== undefined) {
        updateData.email_log_id = emailLogId;
    }

    if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
    }

    const { error } = await supabase
        .from('workflow_executions')
        .update(updateData)
        .eq('id', executionId);

    if (error) {
        console.error('Error updating execution log:', error);
        throw error;
    }
}

/**
 * Execute workflows for a candidate stage change
 * Called from api.candidates.update() when stage changes
 * @param skipIfAlreadySent - If true, skip execution if a workflow for this stage was already sent successfully
 */
export async function executeWorkflowsForStage(
    candidateId: string,
    newStage: string,
    userId: string,
    skipIfAlreadySent: boolean = false
): Promise<void> {
    try {
        // Get all enabled workflows for this stage
        const { data: workflows, error } = await supabase
            .from('email_workflows')
            .select('*')
            .eq('user_id', userId)
            .eq('trigger_stage', newStage)
            .eq('enabled', true);

        if (error) {
            console.error('Error fetching workflows:', error);
            return;
        }

        if (!workflows || workflows.length === 0) {
            return; // No workflows configured for this stage
        }

        // If skipIfAlreadySent is true, check if any workflow for this stage was already sent
        // OR if an offer email was just sent (for Offer stage to prevent duplicates)
        if (skipIfAlreadySent) {
            const workflowIds = workflows.map(w => w.id);
            const { data: existingExecutions } = await supabase
                .from('workflow_executions')
                .select('workflow_id')
                .in('workflow_id', workflowIds)
                .eq('candidate_id', candidateId)
                .eq('status', 'sent')
                .limit(1);
            
            // For Offer stage, also check if an offer email was sent in the last 5 minutes
            if (newStage === 'Offer') {
                const fiveMinutesAgo = new Date();
                fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
                
                const { data: recentOfferEmails } = await supabase
                    .from('email_logs')
                    .select('id')
                    .eq('candidate_id', candidateId)
                    .eq('email_type', 'Offer')
                    .gte('sent_at', fiveMinutesAgo.toISOString())
                    .limit(1);
                
                if (recentOfferEmails && recentOfferEmails.length > 0) {
                    console.log('[Workflow Engine] Skipping Offer workflow - offer email was just sent');
                    return; // Skip if offer email was just sent
                }
            }
            
            // If any workflow was already sent successfully, skip execution
            if (existingExecutions && existingExecutions.length > 0) {
                return;
            }
        }

        // Execute each workflow
        for (const workflow of workflows) {
            try {
                await executeWorkflow(workflow.id, candidateId, userId);
            } catch (workflowError: any) {
                console.error(`Error executing workflow ${workflow.id}:`, workflowError);
                // Continue with other workflows even if one fails
            }
        }
    } catch (error: any) {
        console.error('Error executing workflows for stage:', error);
        // Don't throw - we don't want to fail the candidate update if workflow execution fails
    }
}

