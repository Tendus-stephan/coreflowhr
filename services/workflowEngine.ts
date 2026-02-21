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
    let executionId: string | null = null;
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

        // Skip "New" stage workflows entirely - emails are not sent automatically after sourcing
        // Candidates are sourced without emails by default - they must register via LinkedIn outreach
        if (workflow.trigger_stage === 'New') {
            await createExecutionLog(workflowId, candidateId, 'skipped', undefined, 'New stage workflows are disabled - use LinkedIn outreach for candidates without email');
            return;
        }

        // Check if candidate has an email address - required for sending emails
        // NOTE: Candidates by default don't have emails. They only get emails after:
        // 1. Registering via LinkedIn outreach registration link, OR
        // 2. Direct application with email provided
        // If no email exists, skip workflow and recommend LinkedIn outreach
        if (!candidate.email || candidate.email.trim() === '') {
            await createExecutionLog(workflowId, candidateId, 'skipped', undefined, 'Candidate does not have an email address (default state) - use LinkedIn outreach to collect email first');
            return;
        }

        // Check if candidate is a test candidate
        // For other stages: Only skip if they're truly a test candidate (AI-sourced without CV upload)
        // If they have a CV uploaded or applied directly, they're a real candidate and should receive emails
        const hasRealApplication = candidate.source === 'direct_application' || (candidate.cv_file_url || (candidate as any).cvFileUrl);
        
        // Skip test candidates only if no real application
        if (candidate.is_test && !hasRealApplication) {
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
            .replace(/{your_name}/g, userName)
            // Also replace square bracket placeholders that AI might generate
            .replace(/\[Your Name\]/g, userName)
            .replace(/\[Your Title\]/g, '')
            .replace(/\[Website\/Contact Info\]/g, '')
            // Replace awkward formal terms
            .replace(/Curricular Vitae/gi, 'CV')
            .replace(/curricular vitae/gi, 'CV')
            // Fix literal \n and \t (e.g. from AI or JSON) so they render as line breaks
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');

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
                return offerDetails.benefits.map(b => `• ${b}`).join('\n');
            };

            const formatBenefitsList = () => {
                if (!offerDetails.benefits || offerDetails.benefits.length === 0) return 'Standard benefits package';
                return offerDetails.benefits.map(b => `• ${b}`).join('\n');
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

        // For "Screening" stage workflows, add CV upload link if candidate is in "Screening" stage and has a job
        // Note: "New" stage workflows are now disabled, but CV upload links can still be used in Screening stage
        if (workflow.trigger_stage === 'Screening' && candidate.stage === 'Screening' && jobId) {
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
            // Always use production URL for email links (never localhost)
            // If running in browser and not localhost, use current origin; otherwise use production URL
            const frontendUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
                ? window.location.origin 
                : (process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL || 'https://www.coreflowhr.com');
            // Single line - no newlines so URL never wraps or breaks in plain-text fallbacks
            const cvUploadLink = `${frontendUrl}/jobs/apply/${jobId}?token=${cvUploadToken}`;
            // Table-based button (best support in Gmail, Outlook, Apple Mail); URL only in href, never as visible text
            const clickableButton = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="background-color:#111827; border-radius:8px; padding:14px 28px;"><a href="${cvUploadLink}" style="color:#ffffff !important; text-decoration:none; font-weight:600; font-size:16px;">Upload your CV</a></td></tr></table>`;
            const linkSectionHtml = `<br><br><hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;"><p style="margin:0 0 12px 0; color:#374151; font-size:16px; line-height:1.5;">Please click the button below to upload your CV:</p>${clickableButton}`;
            
            if (content.includes('{cv_upload_link}')) {
                content = content.replace(/{cv_upload_link}/g, clickableButton);
            } else {
                content = content + linkSectionHtml;
            }
        }

        // Check if this workflow was already executed successfully (atomic check)
        // This prevents duplicate emails even if multiple requests trigger simultaneously
        const { data: existingExecution } = await supabase
            .from('workflow_executions')
            .select('id, status')
            .eq('workflow_id', workflowId)
            .eq('candidate_id', candidateId)
            .eq('status', 'sent')
            .limit(1)
            .single();
        
        if (existingExecution) {
            console.log(`[Workflow Engine] Workflow ${workflowId} already executed successfully for candidate ${candidateId}, skipping`);
            return;
        }

        // Check if there's a pending execution (another request is processing)
        const { data: pendingExecution } = await supabase
            .from('workflow_executions')
            .select('id')
            .eq('workflow_id', workflowId)
            .eq('candidate_id', candidateId)
            .eq('status', 'pending')
            .limit(1)
            .single();
        
        if (pendingExecution) {
            console.log(`[Workflow Engine] Workflow ${workflowId} is already being processed for candidate ${candidateId}, skipping`);
            return;
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
        
        // Ensure ALL failures are logged, even if they occur before execution log creation
        if (!executionId) {
            // Error occurred before execution log was created - create a failed log now
            try {
                await createExecutionLog(
                    workflowId, 
                    candidateId, 
                    'failed', 
                    undefined, 
                    error?.message || 'Workflow execution failed before email send'
                );
            } catch (logError: any) {
                // If logging fails, at least log to console
                console.error('Failed to create execution log for failed workflow:', logError);
            }
        } else {
            // Execution log exists - update it to failed status if not already updated
            try {
                // Check current status - only update if still pending
                const { data: currentExecution } = await supabase
                    .from('workflow_executions')
                    .select('status')
                    .eq('id', executionId)
                    .single();
                
                if (currentExecution && currentExecution.status === 'pending') {
                    await updateExecutionLog(
                        executionId, 
                        'failed', 
                        undefined, 
                        error?.message || 'Workflow execution failed'
                    );
                }
            } catch (updateError: any) {
                console.error('Failed to update execution log to failed status:', updateError);
            }
        }
        
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
        // Skip "New" stage workflows - emails are not sent automatically after sourcing
        if (newStage === 'New') {
            console.log('[Workflow Engine] Skipping "New" stage workflow - automatic emails after sourcing are disabled');
            return;
        }
        
        // Interview stage workflows should NOT execute automatically
        // Interviews are manually scheduled by recruiters, not triggered by stage changes
        if (newStage === 'Interview') {
            console.log('[Workflow Engine] Skipping automatic workflow execution for Interview stage - interviews are manually scheduled');
            return;
        }
        
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
            console.log(`[Workflow Engine] No enabled workflows found for stage "${newStage}" (user: ${userId})`);
            return; // No workflows configured for this stage
        }
        
        console.log(`[Workflow Engine] Found ${workflows.length} enabled workflow(s) for stage "${newStage}"`);

        // If skipIfAlreadySent is true, check if any workflow for this stage was already sent
        // OR if an offer email was just sent (for Offer stage to prevent duplicates)
        if (skipIfAlreadySent) {
            const workflowIds = workflows.map(w => w.id);
            
            // Atomic check: Check for existing successful executions
            const { data: existingExecutions } = await supabase
                .from('workflow_executions')
                .select('workflow_id')
                .in('workflow_id', workflowIds)
                .eq('candidate_id', candidateId)
                .eq('status', 'sent')
                .limit(1);
            
            // If any workflow was already sent successfully, skip execution
            if (existingExecutions && existingExecutions.length > 0) {
                console.log(`[Workflow Engine] Skipping ${newStage} workflows - already executed for candidate ${candidateId}`);
                return;
            }
            
            // For Offer stage, also check if an offer email was sent in the last 5 minutes
            // This prevents duplicate emails when offer.send() moves candidate to Offer stage
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
                    console.log('[Workflow Engine] Skipping Offer workflow - offer email was just sent (within 5 minutes)');
                    return; // Skip if offer email was just sent
                }
            }
        }

        // Execute each workflow
        for (const workflow of workflows) {
            try {
                await executeWorkflow(workflow.id, candidateId, userId);
            } catch (workflowError: any) {
                // Error is already logged in executeWorkflow function
                // Execution log is created/updated there, so we just continue with other workflows
                console.error(`[Workflow Engine] Workflow ${workflow.id} failed for candidate ${candidateId}:`, workflowError?.message || 'Unknown error');
                // Continue with other workflows even if one fails
            }
        }
    } catch (error: any) {
        console.error('Error executing workflows for stage:', error);
        // Don't throw - we don't want to fail the candidate update if workflow execution fails
    }
}

