import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Users, Clock, MoreVertical, Plus, Search, Filter, ChevronDown, Briefcase, X, Calendar, ChevronLeft, ChevronRight, Trash2, Archive, Settings, Shield, Mail, Bell, Edit, Loader2, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { JobsSkeleton } from '../components/ui/Skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { Job, Candidate, CandidateStage, UserRole } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { CandidateModal } from '../components/CandidateModal';
import { api, Notification } from '../services/api';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toUserError } from '../utils/edgeFunctionError';

// --- Job Settings Modal ---
const JobSettingsModal = ({ job, isOpen, onClose }: { job: Job | null, isOpen: boolean, onClose: () => void }) => {
    const [notifications, setNotifications] = useState({
        email: true,
        interview: true,
        offers: true
    });
    const [retention, setRetention] = useState('6 months');
    const [consentRequired, setConsentRequired] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [isOpen]);

    // Load settings when modal opens
    useEffect(() => {
        if (isOpen && job) {
            const loadSettings = async () => {
                try {
                    const [prefs, compliance] = await Promise.all([
                        api.settings.getNotificationPreferences(),
                        api.settings.getComplianceSettings()
                    ]);
                    setNotifications({
                        email: prefs.emailNotifications,
                        interview: prefs.interviewScheduleUpdates,
                        offers: prefs.offerUpdates,
                    });
                    setRetention(compliance.dataRetentionPeriod);
                    setConsentRequired(compliance.consentRequired);
                } catch (error) {
                    console.error('Error loading settings:', error);
                }
            };
            loadSettings();
        }
    }, [isOpen, job]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await Promise.all([
                api.settings.updateNotificationPreferences({
                    emailNotifications: notifications.email,
                    interviewScheduleUpdates: notifications.interview,
                    offerUpdates: notifications.offers,
                }),
                api.settings.updateComplianceSettings({
                    dataRetentionPeriod: retention,
                    consentRequired: consentRequired,
                })
            ]);
            setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => {
                setSaveMessage(null);
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error saving settings:', error);
            setSaveMessage({ type: 'error', text: error.message || 'Failed to save settings' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !job) return null;

    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
        <button 
            type="button"
            onClick={onChange}
            className={`w-11 h-6 rounded-full transition-colors duration-300 ease-in-out relative focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20 ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
        >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );

        return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Job Settings</h2>
                        <p className="text-xs text-gray-500 font-medium truncate max-w-[200px]">{job.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-8">
                    {saveMessage && (
                        <div className={`p-3 rounded-lg border ${
                            saveMessage.type === 'success' 
                                ? 'bg-gray-100 border-gray-200 text-gray-800' 
                                : 'bg-gray-100 border-gray-200 text-gray-800'
                        }`}>
                            <p className="text-sm font-medium">{saveMessage.text}</p>
                        </div>
                    )}
                    
                    {/* Communication */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Mail size={14} /> Communication
                        </h3>
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                                    <p className="text-xs text-gray-500">Get notified for new applicants</p>
                                </div>
                                <Toggle checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} />
                             </div>
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Interview Schedule</p>
                                    <p className="text-xs text-gray-500">Updates on scheduled interviews</p>
                                </div>
                                <Toggle checked={notifications.interview} onChange={() => setNotifications({...notifications, interview: !notifications.interview})} />
                             </div>
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Offer Updates</p>
                                    <p className="text-xs text-gray-500">Notifications when offers are accepted</p>
                                </div>
                                <Toggle checked={notifications.offers} onChange={() => setNotifications({...notifications, offers: !notifications.offers})} />
                             </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100"></div>

                    {/* Compliance */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Shield size={14} /> Compliance
                        </h3>
                        
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-gray-900 block">Data Retention Period</label>
                             <CustomSelect
                                inputStyle
                                value={retention}
                                onChange={setRetention}
                                className="px-4 py-2.5 rounded-lg"
                                options={[
                                    { value: '3 months', label: '3 months' },
                                    { value: '6 months', label: '6 months' },
                                    { value: '12 months', label: '12 months' },
                                    { value: '24 months', label: '24 months' },
                                ]}
                             />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Consent Required</p>
                                <p className="text-xs text-gray-500">Collect candidate consent</p>
                            </div>
                            <Toggle checked={consentRequired} onChange={() => setConsentRequired(!consentRequired)} />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button variant="black" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Job Details / Manage Modal ---
const JobManageModal = ({ job, isOpen, onClose, navigate, currentUserRole }: { job: Job | null, isOpen: boolean, onClose: () => void, navigate: (path: string) => void, currentUserRole: UserRole | '' }) => {
    const [page, setPage] = useState(1);
    const [jobCandidates, setJobCandidates] = useState<Candidate[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const ITEMS_PER_PAGE = 5;
    const [workspaceMembers, setWorkspaceMembers] = useState<{ userId: string; name: string; role: UserRole; isCurrentUser: boolean }[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [savingAssignments, setSavingAssignments] = useState(false);
    const canManageAssignments = currentUserRole === 'Admin' || currentUserRole === 'Recruiter';
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);

    // Fetch candidates for this job when modal opens or job changes. Viewers: we still fetch to get counts for pipeline overview but never show individual names/list.
    const fetchCandidates = async () => {
        if (!job || !isOpen) {
            setJobCandidates([]);
            return;
        }

        setLoadingCandidates(true);
        try {
            const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1000 });
            const allCandidates = candidatesResult.data || [];
            // Filter candidates by job_id
            const candidatesForJob = allCandidates.filter(c => c.jobId === job.id);
            setJobCandidates(candidatesForJob);
        } catch (error) {
            console.error('Error fetching candidates:', error);
            setJobCandidates([]);
        } finally {
            setLoadingCandidates(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
        // Reset selected candidate when job changes
        setSelectedCandidate(null);
    }, [job, isOpen]);

    // Load workspace members and job assignments for this job
    useEffect(() => {
        const loadAssignments = async () => {
            if (!isOpen || !job || !canManageAssignments) return;
            setLoadingAssignments(true);
            try {
                const workspace = await api.workspaces.getWorkspaceWithMembers();
                // Exclude Admin from explicit assignments; Admin already sees all jobs
                setWorkspaceMembers(
                    workspace.members.filter((m) => !!m.userId && m.role !== 'Admin')
                );
                const userIds = await api.jobs.getAssignments(job.id);
                setAssignedUserIds(userIds);
            } catch (error) {
                console.error('Failed to load job assignments:', error);
            } finally {
                setLoadingAssignments(false);
            }
        };
        loadAssignments();
    }, [isOpen, job, canManageAssignments]);

    const toggleAssignment = async (userId: string) => {
        if (!job || !canManageAssignments || savingAssignments) return;
        const next = assignedUserIds.includes(userId)
            ? assignedUserIds.filter((id) => id !== userId)
            : [...assignedUserIds, userId];
        setSavingAssignments(true);
        try {
            await api.jobs.updateAssignments(job.id, next);
            setAssignedUserIds(next);
        } catch (error) {
            console.error('Failed to update assignments:', error);
        } finally {
            setSavingAssignments(false);
        }
    };

    // Handle candidate update - refresh the candidates list
    const handleCandidateUpdate = async (updatedCandidate: Candidate) => {
        // Update the candidate in the local list
        setJobCandidates(prev => 
            prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
        );
        // Refresh from server
        await fetchCandidates();
    };

    // Reset page when job changes or modal opens
    useEffect(() => {
        setPage(1);
    }, [job, isOpen]);

    // Handle body overflow when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Fetch current workspace slug for building application URLs
    useEffect(() => {
        if (!job || !isOpen) return;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                    .from('workspace_members')
                    .select('workspaces(slug)')
                    .eq('user_id', user.id)
                    .maybeSingle();
                const ws = (data?.workspaces) as any;
                setWorkspaceSlug(ws?.slug || null);
            } catch {
                setWorkspaceSlug(null);
            }
        })();
    }, [job?.id, isOpen]);

    const getApplicationUrl = (j: typeof job) => {
        const base = window.location.origin;
        if (workspaceSlug && j.slug) return `${base}/jobs/apply/${workspaceSlug}/${j.slug}`;
        return `${base}/jobs/apply/${j.id}`;
    };

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    if (!isOpen || !job) return null;

    // Pagination logic
    const totalPages = Math.ceil(jobCandidates.length / ITEMS_PER_PAGE);
    const currentCandidates = jobCandidates.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    
    // Calculate pipeline stages from real candidate data
    const stages = [
        { name: 'Sourced', count: jobCandidates.filter(c => c.stage === CandidateStage.NEW).length },
        { name: 'Contacted', count: jobCandidates.filter(c => c.stage === CandidateStage.SCREENING).length }, 
        { name: 'Screening', count: jobCandidates.filter(c => c.stage === CandidateStage.SCREENING).length },
        { name: 'Interview', count: jobCandidates.filter(c => c.stage === CandidateStage.INTERVIEW).length },
        { name: 'Hired', count: jobCandidates.filter(c => c.stage === CandidateStage.HIRED).length },
    ];

    return (
        <>
            {selectedCandidate && (
                <CandidateModal
                    candidate={selectedCandidate}
                    isOpen={!!selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onUpdate={handleCandidateUpdate}
                />
            )}
            {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-8 pt-7 pb-6 bg-white">
                    <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <h2 className="text-2xl font-bold text-gray-900 truncate">{job.title}</h2>
                            <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-0.5 ${
                                job.status === 'Active' ? 'bg-green-500' :
                                job.status === 'Draft'  ? 'bg-amber-400' : 'bg-gray-400'
                            }`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                            {job.company && <span>{job.company}</span>}
                            {job.location && <><span>·</span><span>{job.location}</span></>}
                            {job.type    && <><span>·</span><span>{job.type}</span></>}
                            {job.postedDate && <><span>·</span><span>Posted {new Date(job.postedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></>}
                        </div>
                    </div>
                    <button onClick={onClose} className="shrink-0 self-start text-gray-400 hover:text-gray-700 transition-colors leading-none mt-1">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="px-8 pt-6 pb-8 space-y-7">

                        {/* Pipeline stats row */}
                        <div className="grid grid-cols-5 gap-3">
                            {stages.map((stage) => (
                                <div key={stage.name} className="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center">
                                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{stage.count}</p>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5">{stage.name}</p>
                                </div>
                            ))}
                        </div>

                        {/* Main two-column grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            {/* ── Left column: description, skills, share ── */}
                            <div className="lg:col-span-3 space-y-6">

                                {job.description && (
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">About the role</p>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
                                    </div>
                                )}

                                {job.skills && job.skills.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Required skills</p>
                                        <div className="flex flex-wrap gap-2">
                                            {job.skills.map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Share this role</p>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Copy application link', key: 'link', text: getApplicationUrl(job) },
                                            { label: 'Copy for LinkedIn', key: 'linkedin', text: `🚀 We're hiring a ${job.title}${job.location ? ` in ${job.location}` : ''}!\n\n${job.description ? job.description.slice(0, 200) + (job.description.length > 200 ? '...' : '') : ''}\n\n📩 Apply here: ${getApplicationUrl(job)}\n\n#hiring #jobs #${(job.title || '').replace(/\s+/g, '')}` },
                                            { label: 'Copy for Indeed',    key: 'indeed',   text: `${job.title}${job.location ? ` — ${job.location}` : ''}\n${job.type || 'Full-time'}${job.salaryRange ? ` | ${job.salaryRange}` : ''}\n\n${job.description ? job.description.slice(0, 300) : ''}\n\nApply: ${getApplicationUrl(job)}` },
                                            { label: 'Copy for CV-Library', key: 'cvlibrary', text: `Position: ${job.title}\nLocation: ${job.location || 'Remote'}\nType: ${job.type || 'Permanent'}\nSalary: ${job.salaryRange || 'Competitive'}\n\n${job.description ? job.description.slice(0, 400) : ''}\n\nTo apply visit: ${getApplicationUrl(job)}` },
                                        ].map(({ label, key, text }) => (
                                            <button
                                                key={key}
                                                onClick={() => copyText(text, key)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                                            >
                                                <span>{label}</span>
                                                {copyFeedback === key
                                                    ? <img src="/assets/images/toast-success.png" alt="Copied" className="w-4 h-4" />
                                                    : <Copy size={14} className="text-gray-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── Right column: candidates + team ── */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Candidates */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Candidates</p>
                                        <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{jobCandidates.length}</span>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        {currentUserRole === 'Viewer' ? (
                                            <div className="py-10 text-center px-4">
                                                <Users size={22} className="text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-400">Counts only — no individual details</p>
                                            </div>
                                        ) : loadingCandidates ? (
                                            <div className="py-10 text-center">
                                                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                                            </div>
                                        ) : currentCandidates.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {currentCandidates.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => { onClose(); navigate(`/candidates?candidateId=${c.id}`); }}
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                                    >
                                                        <Avatar name={c.name} className="w-8 h-8 shrink-0 text-xs" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                                                            <p className="text-xs text-gray-400">{c.stage}</p>
                                                        </div>
                                                        <ChevronDown size={14} className="text-gray-300 shrink-0 -rotate-90" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-10 text-center px-4">
                                                <Users size={22} className="text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-400">No candidates yet</p>
                                            </div>
                                        )}

                                        {currentUserRole !== 'Viewer' && totalPages > 1 && (
                                            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
                                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {currentUserRole !== 'Viewer' && (
                                        <Link to="/candidates" className="block text-center text-sm font-medium text-gray-500 hover:text-gray-900 mt-3 transition-colors">
                                            View Kanban Board →
                                        </Link>
                                    )}
                                </div>

                                {/* Team assignments */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Team</p>
                                        {!canManageAssignments && (
                                            <span className="text-[10px] text-gray-300 font-medium">Admin / Recruiter only</span>
                                        )}
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        {loadingAssignments ? (
                                            <div className="py-6 text-center">
                                                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                                            </div>
                                        ) : workspaceMembers.length === 0 ? (
                                            <div className="py-6 text-center px-4">
                                                <p className="text-sm text-gray-400">No other members yet</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                                                {workspaceMembers.map((m) => {
                                                    const checked = assignedUserIds.includes(m.userId);
                                                    return (
                                                        <label key={m.userId}
                                                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${canManageAssignments && !m.isCurrentUser ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} ${checked ? 'bg-gray-50' : ''}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black shrink-0"
                                                                checked={checked}
                                                                disabled={!canManageAssignments || savingAssignments || m.isCurrentUser}
                                                                onChange={() => toggleAssignment(m.userId)}
                                                            />
                                                            <Avatar name={m.name} className="w-8 h-8 shrink-0 text-xs" />
                                                            <span className="text-sm font-medium text-gray-900 truncate flex-1">
                                                                {m.name}{m.isCurrentUser && <span className="text-gray-400 font-normal"> (you)</span>}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">{m.role}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
            )}
        </>
    );
}

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'Active' | 'Draft' | 'Closed' | 'All'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<string>('All Job Types');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [settingsJob, setSettingsJob] = useState<Job | null>(null);
  const [jobToClose, setJobToClose] = useState<Job | null>(null);
  const [closingJob, setClosingJob] = useState(false);
  
  // Pagination & Actions State
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10; // Client-side pagination for filtered results
  const API_PAGE_SIZE = 100; // Fetch more jobs from API to ensure all jobs are loaded

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [canCreateJobs, setCanCreateJobs] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadJobs = async () => {
        setLoading(true);
        try {
            const [jobsResult, n, billingPlan, me] = await Promise.all([
                api.jobs.list({ excludeClosed: false, page: 1, pageSize: API_PAGE_SIZE }), 
                api.notifications.list(),
                api.settings.getPlan().catch(() => null),
                api.auth.me().catch(() => null)
            ]);
            if (me?.role) {
              setCanCreateJobs(me.role !== 'HiringManager' && me.role !== 'Viewer');
              setUserRole(me.role);
            }
            // Handle paginated response
            const jobsData = jobsResult && typeof jobsResult === 'object' && 'data' in jobsResult 
                ? jobsResult.data 
                : Array.isArray(jobsResult) 
                    ? jobsResult 
                    : [];
            setJobs(jobsData);
            setNotifications(n);

            setLoading(false);
        } catch (error: any) {
            console.error('Error loading jobs:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                fullError: error
            });
            
            // Handle network errors gracefully
            if (error?.message?.includes('Failed to fetch') || error?.code === '') {
                console.error('⚠️ Network error: Unable to connect to Supabase. Check your internet connection and Supabase configuration.');
                toast.error('No internet connection. Please check your network and refresh.');
                setJobs([]);
                setNotifications([]);
            } else {
                toast.error('Failed to load jobs. Please refresh the page.');
                setJobs([]);
                setNotifications([]);
            }
            
            setLoading(false);
        }
    };
    loadJobs();
  }, [currentPage]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter jobs based on tab, search, and job type
  const filteredJobs = jobs.filter(job => {
      const matchesTab = activeTab === 'All' || job.status === activeTab;
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            job.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJobType = selectedJobType === 'All Job Types' || 
                             job.type === selectedJobType;
      return matchesTab && matchesSearch && matchesJobType;
  });

  const counts = {
      Active: jobs.filter(j => j.status === 'Active').length,
      Draft: jobs.filter(j => j.status === 'Draft').length,
      Closed: jobs.filter(j => j.status === 'Closed').length,
      All: jobs.length
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const currentJobs = filteredJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery, selectedJobType]);

  // Actions
  const toggleActionMenu = (e: React.MouseEvent, jobId: string) => {
      e.stopPropagation();
      setOpenActionMenuId(openActionMenuId === jobId ? null : jobId);
  };

  const handleAction = (action: 'edit' | 'settings' | 'close' | 'delete', job: Job) => {
      setOpenActionMenuId(null);
      switch(action) {
          case 'edit':
              navigate(`/jobs/edit/${job.id}`);
              break;
          case 'settings':
              setSettingsJob(job);
              break;
          case 'close':
              setJobToClose(job);
              break;
          case 'delete':
              confirm({
                  title: `Delete "${job.title}"?`,
                  description: 'This action cannot be undone and will also remove all associated candidates.',
                  confirmLabel: 'Delete Job',
                  variant: 'destructive',
              }).then(async (confirmed) => {
                  if (!confirmed) return;
                  try {
                      await api.jobs.delete(job.id);
                      setJobs(prev => prev.filter(j => j.id !== job.id));
                      const { playNotificationSound } = await import('../utils/soundUtils');
                      playNotificationSound();
                      toast.success(`"${job.title}" deleted.`);
                  } catch (error: any) {
                      console.error('Error deleting job:', error);
                      toast.error(error.message || 'Failed to delete job. Please try again.');
                  }
              });
              break;
      }
  };

  const handleConfirmCloseJob = async () => {
      if (!jobToClose) return;
      
      setClosingJob(true);
      try {
          // Update job status to Closed in database (this will log the activity)
          await api.jobs.update(jobToClose.id, { status: 'Closed' });
          
          // Update local state
          setJobs(prev => prev.map(j => j.id === jobToClose.id ? { ...j, status: 'Closed' } : j));
          
          // Play notification sound
          const { playNotificationSound } = await import('../utils/soundUtils');
          playNotificationSound();
          
          setJobToClose(null);
      } catch (error: any) {
          console.error('Error closing job:', error);
          toast.error(toUserError(error, 'Failed to close job. Please try again.'));
      } finally {
          setClosingJob(false);
      }
  };

  const changePage = (page: number) => {
      if (page > 0 && page <= totalPages) {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  if (loading) return <JobsSkeleton />;

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="pt-8 px-8 pb-8 max-w-[1600px] mx-auto bg-white min-h-screen" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Modals */}
      {selectedJob && (
        <JobManageModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          navigate={navigate}
          currentUserRole={(userRole as UserRole) || ''}
        />
      )}
      {settingsJob && <JobSettingsModal job={settingsJob} isOpen={!!settingsJob} onClose={() => setSettingsJob(null)} />}

      {/* Close Job Confirmation Modal */}
      {jobToClose && createPortal(
          <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
                  <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900">Close Job</h3>
                  </div>
                  <div className="p-6">
                      <p className="text-gray-700 mb-4">
                          Are you sure you want to close <strong>{jobToClose.title}</strong>?
                      </p>
                      <p className="text-sm text-gray-500 mb-6">
                          This will remove the job from active listings and hide all associated candidates from the pipeline. This action can be reversed by reopening the job.
                      </p>
                      <div className="flex gap-3 justify-end">
                          <Button
                              variant="outline"
                              onClick={() => setJobToClose(null)}
                              disabled={closingJob}
                          >
                              Cancel
                          </Button>
                          <Button
                              variant="black"
                              onClick={handleConfirmCloseJob}
                              disabled={closingJob}
                          >
                              {closingJob ? 'Closing...' : 'Yes, Close Job'}
                          </Button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Page Header */}
      <div className="mb-5 pb-5 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Jobs</h1>
          <p className="mt-1.5 text-sm text-gray-400 font-normal">
            Manage your open roles, track candidates, and keep your hiring pipeline moving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                anchorEl={notificationRef.current}
                onMarkAllRead={async () => {
                  await api.notifications.markRead();
                  const updated = await api.notifications.list();
                  setNotifications(updated);
                }}
              />
            )}
          </div>
          {canCreateJobs && (
            <Link to="/jobs/new">
              <Button variant="black" size="sm" icon={<Plus size={14} />}>Post a Job</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs + Search Row */}
      <div className="flex items-center justify-between border-b border-gray-100" style={{ position: 'relative', zIndex: 2 }}>
        {/* Inline underline tabs */}
        <div className="flex items-end gap-0">
          {(['Active', 'Draft', 'Closed', 'All'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab}
              <span className="text-xs text-gray-400 font-normal">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {/* Search + Type filter */}
        <div className="flex items-center gap-2 pb-2" style={{ position: 'relative' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-52"
            />
          </div>
          <div className="w-36">
            <CustomSelect
              inputStyle
              value={selectedJobType}
              onChange={setSelectedJobType}
              className="py-1.5 text-sm"
              options={[
                { value: 'All Job Types', label: 'All Job Types' },
                { value: 'Full-time', label: 'Full-time' },
                { value: 'Part-time', label: 'Part-time' },
                { value: 'Contract', label: 'Contract' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Job Table */}
      <div className="border border-gray-100 rounded-xl mt-4">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_100px_90px_44px] bg-gray-50 border-b border-gray-100 px-5 py-2.5 rounded-t-xl">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Role</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Type</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Location</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Candidates</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</span>
          <span></span>
        </div>

        {/* Job Rows */}
        {currentJobs.length > 0 ? (
          currentJobs.map((job) => (
            <div
              key={job.id}
              className="grid grid-cols-[2fr_1fr_1fr_100px_90px_44px] px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 hover:shadow-[inset_3px_0_0_theme(colors.gray.900)] transition-all duration-150 cursor-pointer group items-center"
              onClick={() => setSelectedJob(job)}
            >
              {/* Role */}
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{job.title}</p>
                {job.postedDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Posted {new Date(job.postedDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Type */}
              <span className="text-sm text-gray-500 truncate">{job.type || '—'}</span>

              {/* Location */}
              <span className="text-sm text-gray-500 truncate">{job.location || '—'}</span>

              {/* Candidates */}
              <span className="text-sm text-gray-500">
                {(job.candidateCount ?? 0) > 0
                  ? `${job.candidateCount} candidate${job.candidateCount !== 1 ? 's' : ''}`
                  : <span className="text-gray-300">—</span>}
              </span>

              {/* Status badge */}
              <div>
                {job.status === 'Active' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                    Active
                  </span>
                )}
                {job.status === 'Draft' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                    Draft
                  </span>
                )}
                {job.status === 'Closed' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                    Closed
                  </span>
                )}
                {job.status !== 'Active' && job.status !== 'Draft' && job.status !== 'Closed' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                    {job.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end relative" onClick={(e) => e.stopPropagation()}>
                {userRole !== 'Viewer' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleActionMenu(e, job.id);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                        openActionMenuId === job.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openActionMenuId === job.id && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                        style={{ zIndex: 1000 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleAction('edit', job)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                        >
                          <Edit size={13} /> Edit Job
                        </button>
                        <button
                          onClick={() => handleAction('settings', job)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                        >
                          <Settings size={13} /> Settings
                        </button>
                        <button
                          onClick={() => handleAction('close', job)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                        >
                          <Archive size={13} /> Close Job
                        </button>
                        <button
                          onClick={() => handleAction('delete', job)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800 font-medium transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={13} /> Delete Job
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        ) : jobs.length === 0 ? (
          /* True empty — no jobs at all */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
              <Briefcase size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No jobs yet</p>
            <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">
              Post your first job to start building your pipeline.
            </p>
            {canCreateJobs && (
              <Link to="/jobs/new">
                <button className="text-xs font-medium text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                  Post a Job
                </button>
              </Link>
            )}
          </div>
        ) : (
          /* Filtered to zero */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
              <Search size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No jobs found</p>
            <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">
              Try adjusting your search or filters.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-4 mt-4">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => changePage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === i + 1
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Jobs;



