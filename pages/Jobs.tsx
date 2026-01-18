import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Users, Clock, MoreVertical, Plus, Search, Filter, ChevronDown, Briefcase, X, Calendar, ChevronLeft, ChevronRight, Trash2, Archive, Settings, Shield, Mail, Bell, CheckCircle, Edit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Job, Candidate, CandidateStage } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { CandidateModal } from '../components/CandidateModal';
import { api, Notification } from '../services/api';
import { scrapeCandidates } from '../services/scrapingApi';
import { handleScrapingError, logScrapingError } from '../services/scrapingErrorHandler';
import { getAvailableSources } from '../services/planLimits';
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
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-red-50 border-red-200 text-red-800'
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
                             <div className="relative">
                                <select 
                                    value={retention}
                                    onChange={(e) => setRetention(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black cursor-pointer appearance-none hover:bg-gray-100 transition-colors"
                                >
                                    <option value="3 months">3 months</option>
                                    <option value="6 months">6 months</option>
                                    <option value="12 months">12 months</option>
                                    <option value="24 months">24 months</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                             </div>
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
const JobManageModal = ({ job, isOpen, onClose, navigate }: { job: Job | null, isOpen: boolean, onClose: () => void, navigate: (path: string) => void }) => {
    const [page, setPage] = useState(1);
    const [jobCandidates, setJobCandidates] = useState<Candidate[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const ITEMS_PER_PAGE = 5;

    // Fetch candidates for this job when modal opens or job changes
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Modal Header / Top Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Manage Job</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto bg-gray-50/50 space-y-8">
                    
                    {/* Job Header Card */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex gap-5">
                            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                                <Briefcase size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h2>
                                <p className="text-sm text-gray-500 font-medium">{job.company || 'Company'}</p>
                            </div>
                        </div>

                        <div className="w-full md:w-auto bg-white/50 rounded-xl p-0 md:bg-transparent">
                            <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                                <span className="text-gray-400 font-medium">Type</span>
                                <span className="text-gray-900 font-medium text-right md:text-left">{job.type}</span>
                                
                                <div className="h-px bg-gray-200 col-span-2 my-1"></div>

                                <span className="text-gray-400 font-medium">Location</span>
                                <span className="text-gray-900 font-medium text-right md:text-left">{job.location}</span>

                                <div className="h-px bg-gray-200 col-span-2 my-1"></div>

                                <span className="text-gray-400 font-medium">Posted</span>
                                <span className="text-gray-900 font-medium text-right md:text-left">{new Date(job.postedDate).toLocaleDateString()}</span>

                                <div className="h-px bg-gray-200 col-span-2 my-1"></div>

                                <span className="text-gray-400 font-medium self-center">Status</span>
                                <div className="text-right md:text-left">
                                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                        {job.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Overview */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-8">Pipeline Overview</h3>
                        <div className="flex items-center justify-between relative px-4">
                            {stages.map((stage, index) => (
                                <React.Fragment key={stage.name}>
                                    {/* Step */}
                                    <div className="flex flex-col items-center z-10 relative">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Col: Description & Skills */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                                    {job.description}
                                </div>
                            </div>
                            
                            {job.skills && job.skills.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Required Skills</h3>
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

                        {/* Right Col: Candidates List */}
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">Candidates</h3>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{jobCandidates.length}</span>
                                </div>
                                
                                {loadingCandidates ? (
                                    <div className="py-12 text-center flex-1">
                                        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-sm text-gray-500">Loading candidates...</p>
                                    </div>
                                ) : currentCandidates.length > 0 ? (
                                    <div className="divide-y divide-gray-100 flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
                                        {currentCandidates.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => {
                                                    onClose(); // Close the job management modal
                                                    navigate(`/candidates?candidateId=${c.id}`); // Navigate to candidate page with ID
                                                }}
                                                className="py-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer"
                                            >
                                                <Avatar name={c.name} className="w-10 h-10 border border-gray-200" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.stage}</p>
                                                </div>
                                                <ChevronDown size={16} className="text-gray-300" />
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
                                
                                {/* Pagination for Candidates */}
                                {totalPages > 1 && (
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
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                                    <Link to="/candidates" className="text-sm font-medium text-gray-900 hover:underline">View Kanban Board</Link>
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'Active' | 'Draft' | 'Closed' | 'All'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<string>('All Experience Levels');
  const [selectedJobType, setSelectedJobType] = useState<string>('All Job Types');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [settingsJob, setSettingsJob] = useState<Job | null>(null);
  const [jobToClose, setJobToClose] = useState<Job | null>(null);
  const [closingJob, setClosingJob] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  
  // Pagination & Actions State
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10; // Client-side pagination for filtered results
  const API_PAGE_SIZE = 100; // Fetch more jobs from API to ensure all jobs are loaded

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadJobs = async () => {
        setLoading(true);
        try {
            // Load all jobs including closed ones for the Jobs page
            // Fetch with large page size to get all jobs, then paginate client-side
            const [jobsResult, n] = await Promise.all([
                api.jobs.list({ excludeClosed: false, page: 1, pageSize: API_PAGE_SIZE }), 
                api.notifications.list()
            ]);
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

  // Filter jobs based on tab, search, experience level, and job type
  const filteredJobs = jobs.filter(job => {
      const matchesTab = activeTab === 'All' || job.status === activeTab;
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            job.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesExperience = selectedExperienceLevel === 'All Experience Levels' || 
                                job.experienceLevel === selectedExperienceLevel ||
                                (selectedExperienceLevel.includes('Entry') && job.experienceLevel?.includes('Entry')) ||
                                (selectedExperienceLevel.includes('Mid') && job.experienceLevel?.includes('Mid')) ||
                                (selectedExperienceLevel.includes('Senior') && job.experienceLevel?.includes('Senior'));
      const matchesJobType = selectedJobType === 'All Job Types' || 
                             job.type === selectedJobType;
      return matchesTab && matchesSearch && matchesExperience && matchesJobType;
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
  }, [activeTab, searchQuery, selectedExperienceLevel, selectedJobType]);

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

  const handleRetryScraping = async (job: Job) => {
      setRetryingJobId(job.id);
      try {
          // Get user's plan to determine max candidates
          const billingPlan = await api.settings.getPlan();
          const maxCandidates = billingPlan.candidatesLimit === 'Unlimited' 
              ? 10 
              : typeof billingPlan.candidatesLimit === 'number' 
                  ? Math.min(10, billingPlan.candidatesLimit) 
                  : 10;

          // Update scraping status to pending
          try {
              await supabase
                  .from('jobs')
                  .update({ 
                      scraping_status: 'pending',
                      scraping_error: null,
                      scraping_attempted_at: new Date().toISOString()
                  })
                  .eq('id', job.id);
          } catch (dbError: any) {
              if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                  console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
              }
          }

          // Update local state
          setJobs(prev => prev.map(j => 
              j.id === job.id 
                  ? { ...j, scrapingStatus: 'pending' as const, scrapingError: null }
                  : j
          ));

          // Get available sources for plan
          const availableSources = getAvailableSources(billingPlan.name) as any[];

          // Scrape candidates
          const response = await scrapeCandidates(job.id, {
              sources: availableSources.length > 0 ? availableSources : ['linkedin'],
              maxCandidates: maxCandidates
          });

          if (!response.success) {
              throw new Error(response.error || 'Scraping failed');
          }

          // Calculate total saved
          const totalSaved = response.totalSaved || 0;

          // Update scraping status to succeeded
          try {
              await supabase
                  .from('jobs')
                  .update({ 
                      scraping_status: 'succeeded',
                      scraping_error: null
                  })
                  .eq('id', job.id);
          } catch (dbError: any) {
              if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                  console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
              }
          }

          // Update local state
          setJobs(prev => prev.map(j => 
              j.id === job.id 
                  ? { ...j, scrapingStatus: 'succeeded' as const, scrapingError: null, applicantsCount: (j.applicantsCount || 0) + totalSaved }
                  : j
          ));

          // Reload jobs to get updated counts
          const jobsResult = await api.jobs.list({ excludeClosed: false, page: 1, pageSize: API_PAGE_SIZE });
          const jobsData = jobsResult && typeof jobsResult === 'object' && 'data' in jobsResult 
              ? jobsResult.data 
              : Array.isArray(jobsResult) 
                  ? jobsResult 
                  : [];
          setJobs(jobsData);

          // Play success sound
          if (totalSaved > 0) {
              const { playNotificationSound } = await import('../utils/soundUtils');
              playNotificationSound();
          }
      } catch (error: any) {
          // Handle error gracefully - never show Apify-specific errors
          const errorInfo = handleScrapingError(error);
          logScrapingError(job.id, errorInfo, { error });

          // Update scraping status to failed
          try {
              await supabase
                  .from('jobs')
                  .update({ 
                      scraping_status: 'failed',
                      scraping_error: errorInfo.userMessage,
                      scraping_attempted_at: new Date().toISOString()
                  })
                  .eq('id', job.id);
          } catch (dbError: any) {
              if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                  console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
              }
          }

          // Update local state
          setJobs(prev => prev.map(j => 
              j.id === job.id 
                  ? { ...j, scrapingStatus: 'failed' as const, scrapingError: errorInfo.userMessage }
                  : j
          ));

          // Show user-friendly error (never mentions Apify)
          alert(errorInfo.userMessage);
      } finally {
          setRetryingJobId(null);
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

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-white">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col bg-white min-h-screen" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Modal */}
      {selectedJob && <JobManageModal job={selectedJob} isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} navigate={navigate} />}
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Active Job Postings</h1>
            <p className="text-gray-500 mt-1">Manage and source candidates for open roles.</p>
        </div>
        <div className="flex gap-3 items-center">
            <div className="relative" ref={notificationRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    )}
                </button>

                {/* Notifications Dropdown */}
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

            <Link to="/jobs/new">
                <Button variant="black" size="sm" icon={<Plus size={14}/>}>Post a Job</Button>
            </Link>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6 space-y-4" style={{ position: 'relative', zIndex: 2 }}>
          
          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {(['Active', 'Draft', 'Closed', 'All'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab 
                        ? 'bg-gray-100 text-gray-900 ring-1 ring-black/5 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                      <span className={`w-2 h-2 rounded-full ${
                          tab === 'Active' ? 'bg-black' : 
                          tab === 'Draft' ? 'bg-black' : 
                          tab === 'Closed' ? 'bg-black' : 'bg-black'
                      }`}></span>
                      {tab}
                      <span className="ml-1 bg-white px-1.5 py-0.5 rounded-md text-xs border border-gray-200 text-gray-500 shadow-sm">
                          {counts[tab]}
                      </span>
                  </button>
              ))}
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4" style={{ position: 'relative' }}>
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search jobs, companies, or locations..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
              </div>
              <div className="relative flex-1">
                  <select 
                      value={selectedExperienceLevel}
                      onChange={(e) => setSelectedExperienceLevel(e.target.value)}
                      className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                      <option value="All Experience Levels">All Experience Levels</option>
                      <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                      <option value="Mid Level (2-5 years)">Mid Level (2-5 years)</option>
                      <option value="Senior Level (5+ years)">Senior Level (5+ years)</option>
                  </select>
              </div>
              <div className="relative flex-1" style={{ position: 'relative' }}>
                  <select 
                      value={selectedJobType}
                      onChange={(e) => setSelectedJobType(e.target.value)}
                      className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ position: 'relative' }}
                  >
                      <option>All Job Types</option>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                  </select>
              </div>
          </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 px-1" style={{ position: 'relative', zIndex: 0 }}>
          <Filter size={14} />
          <span>{filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found</span>
      </div>

      {/* Job List */}
      <div className="grid gap-4 flex-1 content-start">
        {currentJobs.map(job => (
            <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between hover:border-gray-300 hover:shadow-md transition-all group relative">
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedJob(job)}>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors">{job.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                            {job.status}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <Briefcase size={14} />
                            {job.department}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {job.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {job.type}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <span>•</span>
                            Posted {new Date(job.postedDate).toLocaleDateString()}
                        </div>
                    </div>
                    
                    {/* Scraping Error Message */}
                    {(job.scrapingStatus === 'failed' || job.scrapingStatus === 'partial') && job.scrapingError && (
                        <div className={`mt-3 px-3 py-2 rounded-lg text-xs border ${
                            job.scrapingStatus === 'partial' 
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            <span className="font-medium">
                                {job.scrapingStatus === 'partial' ? 'Partial sourcing:' : 'Sourcing failed:'}
                            </span> {job.scrapingError}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 relative">
                        {/* Retry Button for Failed/Partial Scraping */}
                        {(job.scrapingStatus === 'failed' || job.scrapingStatus === 'partial') && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9"
                                disabled={retryingJobId === job.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleRetryScraping(job);
                                }}
                            >
                                {retryingJobId === job.id 
                                    ? 'Retrying...' 
                                    : job.scrapingStatus === 'partial' 
                                        ? 'Continue Sourcing' 
                                        : 'Retry Sourcing'}
                            </Button>
                        )}
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedJob(job);
                            }}
                        >
                            Manage
                        </Button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleActionMenu(e, job.id);
                            }}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors border border-transparent hover:border-gray-200 ${openActionMenuId === job.id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                        >
                            <MoreVertical size={18} />
                        </button>

                        {/* Action Menu Dropdown */}
                        {openActionMenuId === job.id && (
                            <div 
                                ref={actionMenuRef}
                                className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                style={{ zIndex: 1000, position: 'absolute' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={() => handleAction('edit', job)}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                                >
                                    <Edit size={14} /> Edit Job
                                </button>
                                <button 
                                    onClick={() => handleAction('settings', job)}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                                >
                                    <Settings size={14} /> Settings
                                </button>
                                <button 
                                    onClick={() => handleAction('close', job)}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors flex items-center gap-2"
                                >
                                    <Archive size={14} /> Close Job
                                </button>
                                <button 
                                    onClick={() => handleAction('delete', job)}
                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Delete Job
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ))}
        
        {filteredJobs.length === 0 && (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-xl border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1">No jobs found</h3>
                <p className="text-gray-500 text-sm mb-6">Try adjusting your search or filters to find what you're looking for.</p>
                <Button variant="outline" onClick={() => {setSearchQuery(''); setActiveTab('All')}}>Clear Filters</Button>
            </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6">
            <p className="text-sm text-gray-500">
                Showing <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)}</span> of <span className="font-bold text-gray-900">{filteredJobs.length}</span> jobs
            </p>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => changePage(i + 1)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === i + 1 
                                ? 'bg-black text-white' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                        }`}
                    >
                        {i + 1}
                    </button>
                ))}
                <button 
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;



