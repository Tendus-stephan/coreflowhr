import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Users, Clock, MoreVertical, Plus, Search, Filter, ChevronDown, Briefcase, X, Calendar, ChevronLeft, ChevronRight, Trash2, Archive, Settings, Shield, Mail, Bell, CheckCircle, Edit, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PageLoader } from '../components/ui/PageLoader';
import { Link, useNavigate } from 'react-router-dom';
import { Job, Candidate, CandidateStage, UserRole } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { CandidateModal } from '../components/CandidateModal';
import { api, Notification } from '../services/api';
import { supabase } from '../services/supabase';

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
            className={`w-11 h-6 rounded-full transition-colors duration-300 ease-in-out relative focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20 ${checked ? 'bg-black' : 'bg-gray-200'}`}
        >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );

        return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-gray-200 flex flex-col max-h-[95vh] overflow-hidden">
                
                {/* Modal Header / Top Bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Manage Job</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto bg-gray-50/50 space-y-10">
                    
                    {/* Job Header Card & Assigned Members */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="flex gap-6 flex-1">
                            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 shrink-0">
                                <Briefcase size={28} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
                                <p className="text-base text-gray-500 font-medium">{job.company || 'Company'}</p>
                                <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                                    <span className="text-gray-400 font-medium">Type</span>
                                    <span className="text-gray-900 font-medium">{job.type}</span>
                                    <span className="text-gray-400 font-medium">Location</span>
                                    <span className="text-gray-900 font-medium">{job.location || 'Not specified'}</span>
                                    <span className="text-gray-400 font-medium">Posted</span>
                                    <span className="text-gray-900 font-medium">{new Date(job.postedDate).toLocaleDateString()}</span>
                                    <span className="text-gray-400 font-medium self-center">Status</span>
                                    <span className="text-gray-900 font-medium">
                                        <span className="bg-gray-100 text-gray-700 text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                                            {job.status}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-72 md:min-w-[280px] bg-white/60 rounded-xl p-5 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Assigned members</p>
                                {!canManageAssignments && (
                                    <span className="text-xs text-gray-400 font-medium">Admin/Recruiter manage</span>
                                )}
                            </div>
                            {loadingAssignments ? (
                                <p className="text-sm text-gray-500">Loading assignments…</p>
                            ) : workspaceMembers.length === 0 ? (
                                <p className="text-sm text-gray-500">No other members in this workspace yet.</p>
                            ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {workspaceMembers.map((m) => {
                                        const checked = assignedUserIds.includes(m.userId);
                                        return (
                                            <label
                                                key={m.userId}
                                                className={`flex items-center justify-between gap-3 text-sm rounded-lg px-3 py-2 ${
                                                    checked ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black shrink-0"
                                                        checked={checked}
                                                        disabled={!canManageAssignments || savingAssignments}
                                                        onChange={() => toggleAssignment(m.userId)}
                                                    />
                                                    <span className="text-gray-900 font-medium truncate">
                                                        {m.name}
                                                        {m.isCurrentUser && ' (You)'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 font-semibold uppercase shrink-0">
                                                    {m.role}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pipeline Overview */}
                    <div className="bg-white border border-gray-100 rounded-xl p-10 ">
                        <h3 className="text-xl font-bold text-gray-900 mb-10">Pipeline Overview</h3>
                        <div className="flex items-center justify-between relative px-6">
                            {stages.map((stage, index) => (
                                <React.Fragment key={stage.name}>
                                    {/* Step */}
                                    <div className="flex flex-col items-center z-10 relative">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
                                            <span className="text-xl font-bold text-gray-900">{stage.count}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">{stage.name}</span>
                                    </div>

                                    {/* Connector Line */}
                                    {index < stages.length - 1 && (
                                        <div className="flex-1 h-1 bg-gray-100 mx-4 -mt-8 rounded-full"></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Description & Candidates Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Left Col: Description & Skills */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white border border-gray-100 rounded-xl p-8 ">
                                <h3 className="text-xl font-bold text-gray-900 mb-5">Job Description</h3>
                                <div className="prose prose-base max-w-none text-gray-600 leading-relaxed">
                                    {job.description}
                                </div>
                            </div>
                            
                            {job.skills && job.skills.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-xl p-8 ">
                                    <h3 className="text-xl font-bold text-gray-900 mb-5">Required Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.skills.map(skill => (
                                            <span key={skill} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Col: Candidates — list only for non-Viewer; Viewer sees aggregate count only */}
                        <div className="lg:col-span-1 min-h-0 flex flex-col">
                            <div className="bg-white border border-gray-100 rounded-xl p-8  h-full flex flex-col min-h-[320px]">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-xl font-bold text-gray-900">Candidates</h3>
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">{jobCandidates.length}</span>
                                </div>
                                
                                {currentUserRole === 'Viewer' ? (
                                    <div className="py-12 text-center flex-1">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Users size={20} className="text-gray-400"/>
                                        </div>
                                        <p className="text-sm text-gray-500">Aggregate view only. You can see counts, not individual candidate details.</p>
                                    </div>
                                ) : loadingCandidates ? (
                                    <div className="py-12 text-center flex-1">
                                        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-sm text-gray-500">Loading candidates...</p>
                                    </div>
                                ) : currentCandidates.length > 0 ? (
                                    <div className="divide-y divide-gray-100 flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 min-h-0">
                                        {currentCandidates.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => {
                                                    onClose(); // Close the job management modal
                                                    navigate(`/candidates?candidateId=${c.id}`); // Navigate to candidate page with ID
                                                }}
                                                className="py-4 flex items-center gap-4 hover:bg-gray-50 rounded-lg px-3 transition-colors cursor-pointer"
                                            >
                                                <Avatar name={c.name} className="w-11 h-11 border border-gray-200 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-bold text-gray-900 truncate">{c.name}</p>
                                                    <p className="text-sm text-gray-500">{c.stage}</p>
                                                </div>
                                                <ChevronDown size={18} className="text-gray-300 shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center flex-1">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Users size={20} className="text-gray-400"/>
                                        </div>
                                        <p className="text-sm text-gray-500">No candidates yet.</p>
                                    </div>
                                )}
                                
                                {/* Pagination for Candidates (non-Viewer only) */}
                                {currentUserRole !== 'Viewer' && totalPages > 1 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <button 
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs text-gray-500 font-medium">Page {page} of {totalPages}</span>
                                        <button 
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                                
                                {currentUserRole !== 'Viewer' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                                        <Link to="/candidates" className="text-sm font-medium text-gray-900 hover:underline">View Kanban Board</Link>
                                    </div>
                                )}
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
                // Set empty state instead of showing error (let user retry by refreshing)
                setJobs([]);
                setNotifications([]);
            } else {
                // Other errors - show empty state
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
              // Show confirmation before deleting
              if (window.confirm(`Are you sure you want to delete "${job.title}"? This action cannot be undone and will also remove all associated candidates.`)) {
                  api.jobs.delete(job.id)
                      .then(async () => {
                          setJobs(prev => prev.filter(j => j.id !== job.id));
                          const { playNotificationSound } = await import('../utils/soundUtils');
                          playNotificationSound();
                      })
                      .catch((error: any) => {
                          console.error('Error deleting job:', error);
                          alert(error.message || 'Failed to delete job. Please try again.');
                      });
              }
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
          alert(error.message || 'Failed to close job. Please try again.');
      } finally {
          setClosingJob(false);
      }
  };

  const changePage = (page: number) => {
      if (page > 0 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  if (loading) return <PageLoader />;

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
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center p-4">
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {counts['Active']} active
            {counts['Draft'] > 0 ? ` · ${counts['Draft']} draft` : ''}
            {counts['Closed'] > 0 ? ` · ${counts['Closed']} closed` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
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
      <div className="flex items-center justify-between border-b border-gray-100 mb-0" style={{ position: 'relative', zIndex: 2 }}>
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
      <div className="border border-gray-100 rounded-xl overflow-hidden mt-4">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_100px_90px_44px] bg-gray-50 border-b border-gray-100 px-5 py-2.5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Role</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Department</span>
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
              className="grid grid-cols-[2fr_1fr_1fr_100px_90px_44px] px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group items-center"
              onClick={() => setSelectedJob(job)}
            >
              {/* Role */}
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{job.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {job.type}
                  {job.postedDate ? ` · Posted ${new Date(job.postedDate).toLocaleDateString()}` : ''}
                </p>
              </div>

              {/* Department */}
              <span className="text-sm text-gray-500 truncate">{job.department || '—'}</span>

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
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 border-dashed">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
              <Search size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No jobs found</p>
            <p className="text-xs text-gray-400 mb-4 text-center max-w-xs">
              Try adjusting your search or filters to find what you're looking for.
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



