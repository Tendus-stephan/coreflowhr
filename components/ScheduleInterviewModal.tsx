import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Candidate, Integration, CandidateStage } from '../types';
import { X, Search, Users, Clock, Video, Link as LinkIcon, MapPin, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { CustomSelect } from './ui/CustomSelect';
import { Avatar } from './ui/Avatar';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { sanitizeError } from '../utils/edgeFunctionError';
import { useToast } from '../contexts/ToastContext';

/** Never show raw Edge Function / non-2xx errors to users. */
function userFacingError(message: string, fallback: string): string {
  return sanitizeError(message, fallback);
}

interface ScheduleInterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedCandidate?: Candidate | null;
    initialDate?: Date | null;
    initialTime?: string | null;
    editingInterviewId?: string | null; // ID of interview being rescheduled
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({ 
    isOpen, 
    onClose, 
    preSelectedCandidate,
    initialDate,
    initialTime,
    editingInterviewId
}) => {
    const toast = useToast();
    const [search, setSearch] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchResults, setSearchResults] = useState<Candidate[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [interviewType, setInterviewType] = useState<'Video Call' | 'In Person'>('Video Call');
    const [address, setAddress] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('30 min');
    const [isScheduling, setIsScheduling] = useState(false);
    const [interviewTemplates, setInterviewTemplates] = useState<any[]>([]);
    const [templatesLoaded, setTemplatesLoaded] = useState(false);
    const [canManageTemplates, setCanManageTemplates] = useState(false);
    const actionInFlightRef = useRef(false);

    // Imported candidates get the sourced template; everyone else gets the applied template
    const IMPORTED_SOURCES = new Set(['cv_import', 'ai_sourced']);
    const isImported = IMPORTED_SOURCES.has(selectedCandidate?.source ?? '');
    const effectiveTemplate: any | null | undefined = !templatesLoaded
        ? undefined
        : isImported
            ? (interviewTemplates.find(t => t.type === 'Interview - Sourced') ?? null)
            : (interviewTemplates.find(t => t.type === 'Interview') ?? null);
    const templateExists: boolean | null = effectiveTemplate === undefined ? null : effectiveTemplate !== null;
    const usedFallback = false; // imported candidates no longer fall back to Interview template

    // Load integrations + interview templates when modal opens
    useEffect(() => {
        if (isOpen) {
            setTemplatesLoaded(false);
            setInterviewTemplates([]);
            Promise.all([
                api.settings.getTemplates(),
                api.auth.me().catch(() => null),
            ]).then(([templates, me]) => {
                setInterviewTemplates(templates.filter((t: any) =>
                    t.type === 'Interview' || t.type === 'Interview - Sourced'
                ));
                const role = (me as any)?.role ?? '';
                setCanManageTemplates(role === 'Admin' || role === 'Recruiter');
                setTemplatesLoaded(true);
            }).catch(() => {
                setInterviewTemplates([]);
                setTemplatesLoaded(true);
            });

            const loadIntegrations = async () => {
                try {
                    const allIntegrations = await api.settings.getIntegrations();
                    // Filter to only show active Google Meet integrations (Teams temporarily disabled)
                    const availableIntegrations = allIntegrations.filter(
                        (int: Integration) => 
                            int.name === 'Google Meet' && int.active
                    );
                    setIntegrations(availableIntegrations);
                    
                    // Set default platform to first available integration
                    if (availableIntegrations.length > 0) {
                        setSelectedPlatform(availableIntegrations[0].id);
                    } else {
                        setSelectedPlatform('');
                    }
                } catch (error) {
                    console.error('Error loading integrations:', error);
                    setIntegrations([]);
                    setSelectedPlatform('');
                }
            };
            loadIntegrations();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (preSelectedCandidate) {
                // Validate that pre-selected candidate is in Interview stage
                if (preSelectedCandidate.stage === 'Interview') {
                    setSelectedCandidate(preSelectedCandidate);
                } else {
                    setSelectedCandidate(null);
                    onClose();
                    return;
                }
            } else {
                setSelectedCandidate(null);
            }
            setSearch('');
            setMeetingLink('');
            setSearchResults([]);
            setInterviewType('Video Call');
            setAddress('');
            
            // Set initial date/time if provided
            if (initialDate) {
                const dateStr = initialDate.toISOString().split('T')[0];
                setDate(dateStr);
            } else {
            setDate('');
            }
            
            if (initialTime) {
                setTime(initialTime);
            } else if (initialDate) {
                // Set default time to current hour + 1
                const hour = initialDate.getHours();
                const nextHour = (hour + 1) % 24;
                setTime(`${String(nextHour).padStart(2, '0')}:00`);
            } else {
            setTime('');
            }
            setDuration('30 min');
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, preSelectedCandidate, initialDate, initialTime]);

    useEffect(() => {
        const doSearch = async () => {
            if (search.length > 0) {
                // Only search for candidates in Interview stage
                const { CandidateStage } = await import('../types');
                const results = await api.candidates.search(search, CandidateStage.INTERVIEW);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        };
        const debounce = setTimeout(doSearch, 300);
        return () => clearTimeout(debounce);
    }, [search]);

    if (!isOpen) return null;

    const generateLink = async () => {
        if (!selectedPlatform || !date || !time) return;

        setIsGenerating(true);
        try {
            // Build ISO start datetime from selected date and time (assumes local timezone)
            const startDateTime = new Date(`${date}T${time}`);

            const jobTitle = selectedCandidate?.role || 'Interview';
            const candidateName = selectedCandidate?.name?.trim();
            const meetingTitle = candidateName
                ? `Interview: ${jobTitle} – ${candidateName}`
                : `Interview: ${jobTitle}`;

            const { data, error } = await supabase.functions.invoke('create-meeting', {
                body: {
                    // Only Google Meet is supported by the Edge Function today,
                    // so always send the canonical platform key expected by the backend.
                    platform: 'meet',
                    title: meetingTitle,
                    startIso: startDateTime.toISOString(),
                    durationMinutes: parseInt(duration) || 30,
                }
            });

            if (error) {
                console.error('Error creating meeting link:', error, data);
                const rawMessage = error.message || '';
                let friendly = data?.error || rawMessage || 'Failed to generate meeting link.';

                // Map common server errors to user-friendly guidance
                if (data?.error?.includes('Integration not connected')) {
                    friendly = 'Google Meet is not connected. Go to Settings → Integrations and connect Google Meet, then try again.';
                } else if (
                    data?.error?.includes('Google integration not fully configured') ||
                    data?.error?.includes('No valid Google access token') ||
                    data?.error?.includes('token has expired') ||
                    data?.error?.includes('Please reconnect your Google account')
                ) {
                    friendly = 'Your Google integration needs to be reconnected. Go to Settings → Integrations, disconnect Google, then connect it again.';
                } else if (/Edge Function|non-2xx/i.test(rawMessage)) {
                    friendly = data?.error || 'We could not generate a Google Meet link. Check Settings → Integrations and connect or reconnect Google Meet, then try again.';
                }
                toast.error(userFacingError(friendly, 'We could not generate a Google Meet link. Check Settings → Integrations and try again.'));
            } else if (data?.meetingUrl) {
                setMeetingLink(data.meetingUrl);
            } else if (data?.error) {
                console.warn('Error returned from create-meeting function:', data);
                let friendly = data.error;
                if (data.error.includes('Integration not connected')) {
                    friendly = 'Google Meet is not connected. Go to Settings → Integrations and connect Google Meet, then try again.';
                }
                toast.error(userFacingError(friendly, 'We could not generate a Google Meet link. Check Settings → Integrations and try again.'));
            } else {
                console.warn('No meetingUrl returned from create-meeting function:', data);
                toast.error('Meeting was created but no join link was returned.');
            }
        } catch (err) {
            console.error('Unexpected error generating meeting link:', err);
            toast.error('Unexpected error generating meeting link. Please try again or check your integration settings.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScheduleInterview = async () => {
        if (actionInFlightRef.current) return;
        if (!selectedCandidate || !date || !time) return;
        // For video calls, require a meeting link only when an integration is connected.
        // If there are no integrations, allow manual video interviews without an auto-generated link.
        if (interviewType === 'Video Call' && integrations.length > 0 && (!selectedPlatform || !meetingLink)) return;
        if (interviewType === 'In Person' && !address) return;

        actionInFlightRef.current = true;
        setIsScheduling(true);
        try {
            // Get user info for interviewer name
            const user = await api.auth.me();

            // Resolve workspace_id so the interview is visible to all workspace members
            const { data: wmRow } = await supabase
                .from('workspace_members')
                .select('workspace_id')
                .eq('user_id', user.id)
                .limit(1)
                .single();
            const workspaceId = wmRow?.workspace_id ?? null;
            
            // Create interview record
            // Map 'Video Call' to 'Google Meet' for database compatibility
            const dbType = interviewType === 'Video Call' ? 'Google Meet' : 'In-Person';
            const interviewData = {
                candidateId: selectedCandidate.id,
                jobTitle: selectedCandidate.role || 'Position',
                date: date,
                time: time,
                type: interviewType,
                dbType: dbType,
                interviewer: user.name,
                meetingLink: interviewType === 'Video Call' ? meetingLink : null,
                address: interviewType === 'In Person' ? address : null,
                duration: duration,
            };

            // If editingInterviewId is provided, or an existing scheduled interview is found,
            // treat this as a reschedule (so the Reschedule template / email is used).
            let interview;
            if (editingInterviewId) {
                // Convert duration string to minutes
                const durationMinutes = duration === '30 min' ? 30 : duration === '60 min' ? 60 : 45;
                
                // Use reschedule API which handles email sending
                interview = await api.interviews.reschedule(
                    editingInterviewId,
                    interviewData.date,
                    interviewData.time,
                    durationMinutes
                );
                
                // Update additional fields if needed (type, meeting link, address)
                if (interviewData.dbType || interviewData.meetingLink || interviewData.address) {
                    const updateData: any = {
                        updated_at: new Date().toISOString()
                    };
                    if (interviewData.dbType) updateData.type = interviewData.dbType;
                    if (interviewData.meetingLink) updateData.meeting_link = interviewData.meetingLink;
                    if (interviewData.address) {
                        updateData.notes = `Address: ${interviewData.address}`;
                    }
                    
                    await supabase
                        .from('interviews')
                        .update(updateData)
                        .eq('id', editingInterviewId);
                }
            } else {
                // Check if there's an existing scheduled interview for this candidate (workspace-scoped)
                let existingQuery = supabase
                    .from('interviews')
                    .select('id')
                    .eq('candidate_id', selectedCandidate.id)
                    .eq('status', 'Scheduled');
                if (workspaceId) {
                    existingQuery = existingQuery.or(`workspace_id.eq.${workspaceId},user_id.eq.${user.id}`);
                } else {
                    existingQuery = existingQuery.eq('user_id', user.id);
                }
                const { data: existingInterview } = await existingQuery.maybeSingle();

                if (existingInterview) {
                    // Existing scheduled interview for this candidate → treat as reschedule
                    const durationMinutes = duration === '30 min' ? 30 : duration === '60 min' ? 60 : 45;
                    
                    interview = await api.interviews.reschedule(
                        existingInterview.id,
                        interviewData.date,
                        interviewData.time,
                        durationMinutes
                    );

                    // Update additional fields (type, meeting link, address) on the same interview
                    if (interviewData.dbType || interviewData.meetingLink || interviewData.address) {
                        const updateData: any = {
                            updated_at: new Date().toISOString()
                        };
                        if (interviewData.dbType) updateData.type = interviewData.dbType;
                        if (interviewData.meetingLink) updateData.meeting_link = interviewData.meetingLink;
                        if (interviewData.address) {
                            updateData.notes = `Address: ${interviewData.address}`;
                        }
                        
                        await supabase
                            .from('interviews')
                            .update(updateData)
                            .eq('id', existingInterview.id);
                    }
                } else {
                    // Insert new interview — stamp workspace_id so all workspace members can see it
                    const { data: newInterview, error: insertError } = await supabase
                        .from('interviews')
                        .insert({
                            user_id: user.id,
                            candidate_id: selectedCandidate.id,
                            job_title: interviewData.jobTitle,
                            date: interviewData.date,
                            time: interviewData.time,
                            type: interviewData.dbType,
                            interviewer: interviewData.interviewer,
                            meeting_link: interviewData.meetingLink,
                            notes: interviewData.address ? `Address: ${interviewData.address}` : null,
                            status: 'Scheduled',
                            ...(workspaceId ? { workspace_id: workspaceId } : {}),
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    interview = newInterview;
                }
            }

            // Move candidate to Interview stage if not already there
            if (selectedCandidate.stage !== CandidateStage.INTERVIEW) {
                await api.candidates.update(selectedCandidate.id, { stage: CandidateStage.INTERVIEW });
                
                // Play notification sound for stage change
                try {
                    const { playNotificationSound } = await import('../utils/soundUtils');
                    playNotificationSound();
                } catch (err) {
                    // Sound not available
                }
            }

            // Get job details to get company name
            let companyName = 'Our Company';
            if (selectedCandidate.jobId) {
                try {
                    const job = await api.jobs.get(selectedCandidate.jobId);
                    companyName = job.company || companyName;
                } catch (jobError) {
                    console.error('Error fetching job for company name:', jobError);
                    // Fallback to 'Our Company' if job fetch fails
                }
            }

            // Send confirmation email to candidate — track why it wasn't sent so
            // we can surface it to the user instead of silently swallowing it.
            let emailFailReason: string | null = null;

            if (!selectedCandidate.email) {
                emailFailReason = 'no_email';
            } else {
                const interviewTemplate = effectiveTemplate ?? null;

                const userName = user.name || 'Recruiter';
                const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const tzAbbr = new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'Local';
                const formattedTime = `${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} (${tzAbbr})`;
                const formattedMeetingLink = interviewData.meetingLink
                    ? `<a href="${interviewData.meetingLink}" style="color: #2563eb; text-decoration: underline;">${interviewData.meetingLink}</a>`
                    : '';

                let subject: string;
                let content: string;

                if (interviewTemplate) {
                    subject = interviewTemplate.subject
                        .replace(/{job_title}/g, interviewData.jobTitle)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{candidate_name}/g, selectedCandidate.name)
                        .replace(/{your_name}/g, userName);

                    content = interviewTemplate.content
                        .replace(/{candidate_name}/g, selectedCandidate.name)
                        .replace(/{job_title}/g, interviewData.jobTitle)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{your_name}/g, userName)
                        .replace(/{interview_date}/g, formattedDate)
                        .replace(/{interview_time}/g, formattedTime)
                        .replace(/{interview_duration}/g, duration)
                        .replace(/{interview_type}/g, interviewType)
                        .replace(/{interviewer_name}/g, user.name || 'Interviewer')
                        .replace(/{meeting_link}/g, formattedMeetingLink)
                        .replace(/{address}/g, interviewData.address || '');

                    let detailsSection = `\n\nInterview Details:\n`;
                    detailsSection += `- Date: ${formattedDate}\n`;
                    detailsSection += `- Time: ${formattedTime}\n`;
                    detailsSection += `- Duration: ${duration}\n`;
                    detailsSection += `- Type: ${interviewType}\n`;
                    if (interviewType === 'Video Call' && interviewData.meetingLink) {
                        detailsSection += `- Meeting Link: ${interviewData.meetingLink}\n`;
                    }
                    if (interviewType === 'In Person' && interviewData.address) {
                        detailsSection += `- Address: ${interviewData.address}\n`;
                    }
                    detailsSection += `- Interviewer: ${user.name || 'Interviewer'}\n`;

                    if (content.includes('{interview_details}')) {
                        content = content.replace(/{interview_details}/g, detailsSection);
                    } else {
                        content += detailsSection;
                    }
                } else {
                    // No template configured — send a built-in default confirmation
                    // Use neutral sourced language for imported candidates, applied language for applicants
                    if (isImported) {
                        subject = `Interview Invitation – ${interviewData.jobTitle} at ${companyName}`;
                        content = `Hi ${selectedCandidate.name},\n\nWe came across your profile and would love to have a conversation about the ${interviewData.jobTitle} opportunity at ${companyName}. We'd like to invite you to interview with us.\n\nInterview Details:\n- Date: ${formattedDate}\n- Time: ${formattedTime}\n- Duration: ${duration}\n- Type: ${interviewType}`;
                    } else {
                        subject = `Interview Confirmation – ${interviewData.jobTitle} at ${companyName}`;
                        content = `Hi ${selectedCandidate.name},\n\nWe're pleased to confirm your upcoming interview for the ${interviewData.jobTitle} position at ${companyName}.\n\nInterview Details:\n- Date: ${formattedDate}\n- Time: ${formattedTime}\n- Duration: ${duration}\n- Type: ${interviewType}`;
                    }
                    if (interviewType === 'Video Call' && interviewData.meetingLink) {
                        content += `\n- Meeting Link: ${interviewData.meetingLink}`;
                    }
                    if (interviewType === 'In Person' && interviewData.address) {
                        content += `\n- Address: ${interviewData.address}`;
                    }
                    content += `\n- Interviewer: ${user.name || 'Recruiter'}\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\n${userName}`;
                }

                try {
                    const { error: emailError } = await supabase.functions.invoke('send-email', {
                        body: {
                            to: selectedCandidate.email,
                            subject,
                            content,
                            fromName: userName,
                            candidateId: selectedCandidate.id,
                            userId: user.id,
                            emailType: interviewTemplate?.type === 'Interview - Sourced' ? 'Interview - Sourced' : 'Interview',
                        }
                    });
                    if (emailError) {
                        console.error('Error sending interview email:', emailError);
                        emailFailReason = 'send_failed';
                    }
                } catch (emailErr) {
                    console.error('Unexpected error sending interview email:', emailErr);
                    emailFailReason = 'send_failed';
                }
            }

            // Note: We do NOT move the candidate to Interview stage here
            // They should already be in Interview stage to schedule an interview

            // Log activity
            try {
                const { logInterviewScheduled } = await import('../services/activityLogger');
                await logInterviewScheduled(selectedCandidate.name, interviewData.jobTitle, interviewData.date);
            } catch (logError) {
                console.error('Error logging interview:', logError);
            }

            // Create notification
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: user.id,
                        title: 'Interview Scheduled',
                        desc: `Interview scheduled with ${selectedCandidate.name} for ${interviewData.jobTitle} on ${new Date(date).toLocaleDateString()}.`,
                        type: 'interview_scheduled',
                        category: 'job',
                        unread: true
                    });
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
            }

            // Play notification sound for successful interview scheduling
            try {
                const { playNotificationSound } = await import('../utils/soundUtils');
                playNotificationSound();
            } catch (soundErr) {
                // Sound not available, continue
            }

            // Show success toast then close
            const action = editingInterviewId ? 'rescheduled' : 'scheduled';
            toast.success(`Interview ${action} with ${selectedCandidate.name}.`);
            if (emailFailReason === 'no_email') {
                toast.info(`No email on file for ${selectedCandidate.name}.`);
            } else if (emailFailReason === 'send_failed') {
                toast.error('Confirmation email failed to send.');
            }
            onClose();
            
            // Reset form state to prevent any issues
            setSelectedCandidate(null);
            setMeetingLink('');
            setDate('');
            setTime('');
            setAddress('');
            setIsScheduling(false);
        } catch (error: any) {
            console.error('Error scheduling interview:', error);
            const msg = userFacingError(error?.message || '', 'Something went wrong. Please try again.');
            toast.error(`Failed to schedule interview: ${msg}`);
        } finally {
            setIsScheduling(false);
            actionInFlightRef.current = false;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{editingInterviewId ? 'Reschedule Interview' : 'Schedule Interview'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                    <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-gray-900">Candidate</label>
                        {selectedCandidate ? (
                            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Avatar name={selectedCandidate.name} className="w-10 h-10 border border-gray-200" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{selectedCandidate.name}</p>
                                        <p className="text-xs text-gray-500">{selectedCandidate.email}</p>
                                    </div>
                                </div>
                                {!preSelectedCandidate && (
                                    <button onClick={() => setSelectedCandidate(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">Change</button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name or email..." 
                                        className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                {search && (
                                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden max-h-48 overflow-y-auto">
                                        {searchResults.length > 0 ? searchResults.map(c => (
                                            <button 
                                                key={c.id} 
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                                                onClick={() => { setSelectedCandidate(c); setSearch(''); }}
                                            >
                                                <Avatar name={c.name} className="w-8 h-8 text-[10px]" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.email}</p>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="p-4 text-center text-sm text-gray-500">No candidates found.</div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Date</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black" 
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-900">Time</label>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                    {new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'Local'}
                                </span>
                            </div>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Interview Type</label>
                            <CustomSelect
                                inputStyle
                                value={interviewType}
                                onChange={(val) => {
                                    setInterviewType(val as 'Video Call' | 'In Person');
                                    setMeetingLink('');
                                    setAddress('');
                                }}
                                className="py-2.5 rounded-xl"
                                leftIcon={<Users size={16} />}
                                options={[
                                    { value: 'Video Call', label: 'Video Call' },
                                    { value: 'In Person', label: 'In Person' },
                                ]}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Duration</label>
                            <CustomSelect
                                inputStyle
                                value={duration}
                                onChange={setDuration}
                                className="py-2.5 rounded-xl"
                                leftIcon={<Clock size={16} />}
                                options={[
                                    { value: '30 min', label: '30 min' },
                                    { value: '45 min', label: '45 min' },
                                    { value: '60 min', label: '60 min' },
                                ]}
                            />
                        </div>
                    </div>

                    {interviewType === 'Video Call' && (
                        <>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Platform</label>
                                {integrations.length > 0 ? (
                        <CustomSelect
                            inputStyle
                            value={selectedPlatform}
                            onChange={(val) => {
                                setSelectedPlatform(val);
                                setMeetingLink('');
                            }}
                            className="py-2.5 rounded-xl"
                            leftIcon={<Video size={16} />}
                            options={integrations.map(i => ({ value: i.id, label: i.name }))}
                        />
                                ) : (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 text-center">
                                        No calendar integrations connected. You can still paste a meeting link below and send interview details by email.
                                    </div>
                                )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Meeting Link</label>
                        <div className="flex gap-2">
                            {meetingLink && integrations.length > 0 ? (
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <a
                                        href={meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors truncate"
                                    >
                                        <span className="truncate">{meetingLink}</span>
                                    </a>
                                    <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                </div>
                            ) : (
                            <div className="relative flex-1">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={integrations.length > 0 ? 'Generate meeting link...' : 'Paste meeting link (Zoom, Meet, Teams...)'}
                                    value={meetingLink}
                                    onChange={(e) => {
                                        // Allow manual entry when no integrations; keep read-only when using integrations (auto-generated).
                                        if (integrations.length === 0) {
                                            setMeetingLink(e.target.value);
                                        }
                                    }}
                                    readOnly={integrations.length > 0}
                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-gray-600" 
                                />
                            </div>
                            )}
                            {integrations.length > 0 && (
                            <button 
                                type="button" 
                                onClick={generateLink} 
                                            disabled={isGenerating || !selectedPlatform} 
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? '...' : 'Generate'}
                            </button>
                            )}
                        </div>
                        {integrations.length === 0 && (
                            <p className="text-xs text-gray-500">
                                This link will be included in the interview email, but it will not create a calendar event automatically.
                            </p>
                        )}
                    </div>
                        </>
                    )}

                    {interviewType === 'In Person' && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Enter interview address..."
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                            </div>
                        </div>
                    )}

                    {/* Template status banner — sits below the last field in the scroll area */}
                    {templateExists === true && !usedFallback && (
                        <div className="border border-gray-100 border-l-[3px] border-l-green-600 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                            <img src="/assets/images/toast-success.png" alt="" className="w-5 h-5 flex-shrink-0 object-contain" />
                            <p className="text-[13px] text-gray-700 leading-snug">
                                {isImported ? '"Interview – Sourced" template active.' : 'Interview template active.'}
                            </p>
                        </div>
                    )}
                    {templateExists === true && usedFallback && (
                        <div className="border border-gray-100 border-l-[3px] border-l-amber-500 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                            <img src="/assets/images/toast-warning.png" alt="" className="w-5 h-5 flex-shrink-0 object-contain" />
                            <p className="text-[13px] text-gray-700 leading-snug">
                                No sourced template — falling back to standard.{' '}
                                {canManageTemplates
                                    ? <span className="font-medium text-gray-900">Add one in Settings.</span>
                                    : <span className="font-medium text-gray-900">Ask your Admin to add one in Settings.</span>}
                            </p>
                        </div>
                    )}
                    {templateExists === false && (
                        <div className="border border-gray-100 border-l-[3px] border-l-amber-500 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                            <img src="/assets/images/toast-warning.png" alt="" className="w-5 h-5 flex-shrink-0 object-contain" />
                            <p className="text-[13px] text-gray-700 leading-snug">
                                {isImported
                                    ? <>No template — a default confirmation will be sent.{' '}{canManageTemplates ? 'Add "Interview – Sourced" in Settings to customise.' : 'Ask your Admin to add one in Settings.'}</>
                                    : <>No interview template — a default confirmation will be sent.{' '}{canManageTemplates ? 'Add one in Settings to customise.' : 'Ask your Admin to add one in Settings.'}</>}
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="black" 
                        disabled={
                            isScheduling ||
                            !selectedCandidate ||
                            !date ||
                            !time ||
                            templateExists !== true ||
                            (interviewType === 'Video Call' && integrations.length > 0 && (!selectedPlatform || !meetingLink)) ||
                            (interviewType === 'In Person' && !address)
                        }
                        onClick={handleScheduleInterview}
                    >
                        {isScheduling ? (editingInterviewId ? 'Rescheduling...' : 'Scheduling...') : (editingInterviewId ? 'Reschedule Interview' : 'Schedule Interview')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
