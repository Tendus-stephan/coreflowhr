import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
    Users, Briefcase, CheckCircle, Clock, Activity, TrendingUp, Filter, 
    ChevronRight, MoreHorizontal, Plus, Calendar, Download, ChevronDown, 
    BarChart2, Search, X, Video, Link as LinkIcon, CheckSquare, Square, Bell,
    FileText, File, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Candidate, CandidateStage, Job, Interview, DashboardStats, ActivityItem, User } from '../types';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { api, Notification } from '../services/api';

// --- Helper Components ---

const StatCard = ({ title, value, trend, icon: Icon, trendLabel = "vs last month" }: any) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
            <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={12} className={trend.startsWith('+') ? 'text-green-600' : 'text-gray-400'} />
                <span className={`text-[10px] font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-gray-500'}`}>
                    {trend} <span className="text-gray-400">{trendLabel}</span>
                </span>
            </div>
        </div>
        <div className="p-2.5 rounded-lg bg-gray-50 text-gray-900 border border-gray-100">
            <Icon size={18} />
        </div>
    </div>
);

// --- Generic List Modal (for Jobs, Interviews, Activity) ---
const GenericListModal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
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

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed', width: '100vw', height: '100vh', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    {children}
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
            </div>
        </div>,
        document.body
    );
};

// --- Report Modal ---
const ReportModal = ({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: 'weekly' | 'job' | 'time' | null }) => {
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

    if (!isOpen || !type) return null;
    
    const titles = {
        weekly: 'Weekly Performance Report',
        job: 'Job Posting Analysis',
        time: 'Time to Hire Analysis'
    };

    // Dynamic Data Generation
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${type}_report_${dateString}.pdf`;
    
    // Calculate date range (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateRange = `${thirtyDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Random file size between 1.2MB and 4.5MB for realism
    const fileSize = (Math.random() * (4.5 - 1.2) + 1.2).toFixed(1) + ' MB';

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed', width: '100vw', height: '100vh', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Generate Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 shadow-sm">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{titles[type]}</h3>
                        <p className="text-sm text-gray-500">
                            Ready to generate PDF report for period:<br/>
                            <span className="font-medium text-gray-900">{dateRange}</span>
                        </p>
                    </div>

                    <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center gap-4 text-left">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 text-red-500">
                            <File size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{fileName}</p>
                            <p className="text-xs text-gray-500">{fileSize} • PDF Document</p>
                        </div>
                    </div>

                    <Button variant="black" className="w-full justify-center" icon={<Download size={16} />} onClick={() => {
                        // In a real app, this would trigger the download
                        console.log(`Downloading ${fileName}`);
                        onClose();
                    }}>
                        Download Report
                    </Button>
                </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Bulk Action Modal ---
const BulkActionModal = ({ isOpen, onClose, type, candidates, setCandidates, setNotifications, setActivityFeed }: { isOpen: boolean; onClose: () => void; type: 'move' | 'reject' | 'export' | null, candidates: Candidate[], setCandidates: (candidates: Candidate[]) => void, setNotifications: (notifications: Notification[]) => void, setActivityFeed: (activities: ActivityItem[]) => void }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sourceStage, setSourceStage] = useState<CandidateStage>(CandidateStage.NEW);
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Prevent body scroll when modal is open
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
    
    // Reset selection and search when type or stage changes
    useEffect(() => {
        setSelectedIds([]);
        setSearchQuery('');
    }, [type, sourceStage]);

    // Reset source stage to SCREENING when modal opens for move type
    useEffect(() => {
        if (isOpen && type === 'move') {
            setSourceStage(CandidateStage.SCREENING);
        }
    }, [isOpen, type]);

    if (!isOpen || !type) return null;

    const titles = {
        move: 'Bulk Move Candidates',
        reject: 'Bulk Reject Candidates',
        export: 'Export Candidate Data'
    };

    const descriptions = {
        move: 'Select a stage to move candidates FROM. All selected candidates must be in the same stage.',
        reject: 'Select candidates to reject. This will move them to the Rejected stage.',
        export: 'Select candidates to include in the CSV export.'
    };

    // Determine filter logic based on action type
    let filteredCandidates = candidates;
    
    if (type === 'move') {
        // Filter out "New" stage candidates - they cannot be moved manually
        filteredCandidates = candidates.filter(c => c.stage === sourceStage && c.stage !== CandidateStage.NEW);
    } else if (type === 'reject') {
        // Can reject anyone who isn't already rejected
        filteredCandidates = candidates.filter(c => c.stage !== CandidateStage.REJECTED);
    }
    // Export shows all candidates by default

    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCandidates = filteredCandidates.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.role.toLowerCase().includes(query) ||
            c.location?.toLowerCase().includes(query) ||
            c.skills.some(skill => skill.toLowerCase().includes(query))
        );
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === filteredCandidates.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCandidates.map(c => c.id));
        }
    };

    // Calculate Next Stage for "Move" action
    // Note: "New" stage candidates are not shown/manageable until they upload CV
    const getNextStage = (current: CandidateStage): CandidateStage | string => {
        switch (current) {
            case CandidateStage.SCREENING: return CandidateStage.INTERVIEW;
            case CandidateStage.INTERVIEW: return CandidateStage.OFFER;
            case CandidateStage.OFFER: return CandidateStage.HIRED;
            default: return 'Completed';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed', width: '100vw', height: '100vh', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{titles[type]}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                    <p className="text-sm text-gray-500 mb-4">{descriptions[type]}</p>

                    {/* Move Logic: Source Stage Selector */}
                    {type === 'move' && (
                        <div className="mb-6 flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Move From Stage</label>
                                <div className="relative">
                                    <select 
                                        value={sourceStage}
                                        onChange={(e) => setSourceStage(e.target.value as CandidateStage)}
                                        className="w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black appearance-none cursor-pointer"
                                    >
                                        {/* Note: "New"/"Waitlist" stage removed - candidates in "New" stage are not shown until CV is uploaded */}
                                        <option value={CandidateStage.SCREENING}>Screening</option>
                                        <option value={CandidateStage.INTERVIEW}>Interview</option>
                                        <option value={CandidateStage.OFFER}>Offer</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center pt-5 text-gray-400">
                                <ArrowRight size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To Stage</label>
                                <div className="px-3 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium border border-transparent select-none cursor-not-allowed">
                                    {getNextStage(sourceStage)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, email, role, location, or skills..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Candidate Selection List */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            {filteredCandidates.length} {filteredCandidates.length === 1 ? 'Candidate' : 'Candidates'} Available
                            {searchQuery && ` (filtered)`}
                        </span>
                        {filteredCandidates.length > 0 && (
                            <button onClick={toggleAll} className="text-xs font-medium text-black hover:underline">
                                {selectedIds.length === filteredCandidates.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/30 custom-scrollbar">
                        {filteredCandidates.length > 0 ? (
                            filteredCandidates.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => toggleSelection(c.id)}
                                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.includes(c.id) ? 'bg-black border-black' : 'bg-white border-gray-300'}`}>
                                        {selectedIds.includes(c.id) && <CheckCircle size={12} className="text-white" />}
                                    </div>
                                    <Avatar name={c.name} className="w-8 h-8 text-[10px]" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{c.role} • {c.stage}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-sm text-gray-500 italic">
                                No candidates found for this filter.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="black" 
                        disabled={selectedIds.length === 0}
                        onClick={async () => {
                            try {
                                if (type === 'export') {
                                    // Export selected candidates to CSV
                                    const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
                                    const csvContent = [
                                        ['Name', 'Email', 'Role', 'Stage', 'AI Match Score', 'Skills', 'Location', 'Experience'].join(','),
                                        ...selectedCandidates.map(c => [
                                            `"${c.name}"`,
                                            `"${c.email}"`,
                                            `"${c.role}"`,
                                            `"${c.stage}"`,
                                            c.aiMatchScore || '',
                                            `"${c.skills.join('; ')}"`,
                                            `"${c.location}"`,
                                            c.experience || ''
                                        ].join(','))
                                    ].join('\n');
                                    
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    const url = URL.createObjectURL(blob);
                                    link.setAttribute('href', url);
                                    link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                } else if (type === 'reject') {
                                    // Reject selected candidates
                                    const rejectPromises = selectedIds.map(id => 
                                        api.candidates.update(id, { stage: CandidateStage.REJECTED })
                                    );
                                    await Promise.all(rejectPromises);
                                    
                                    // Play notification sound
                                    const { playNotificationSound } = await import('../utils/soundUtils');
                                    playNotificationSound();
                                    
                                    // Reload candidates, notifications, and activity feed
                                    const [updated, updatedNotifications, updatedActivity] = await Promise.all([
                                        api.candidates.list({ page: 1, pageSize: 100 }),
                                        api.notifications.list(),
                                        api.dashboard.getActivity()
                                    ]);
                                    setCandidates(updated.data || []);
                                    setNotifications(updatedNotifications);
                                    setActivityFeed(updatedActivity);
                                } else if (type === 'move') {
                                    // Move selected candidates to next stage
                                    const targetStage = getNextStage(sourceStage) as CandidateStage;
                                    
                                    // Play notification sound
                                    const { playNotificationSound } = await import('../utils/soundUtils');
                                    playNotificationSound();
                                    
                                    const movePromises = selectedIds.map(id => 
                                        api.candidates.update(id, { stage: targetStage })
                                    );
                                    await Promise.all(movePromises);
                                    
                                    // Reload candidates, notifications, and activity feed
                                    const [updated, updatedNotifications, updatedActivity] = await Promise.all([
                                        api.candidates.list({ page: 1, pageSize: 100 }),
                                        api.notifications.list(),
                                        api.dashboard.getActivity()
                                    ]);
                                    setCandidates(updated.data || []);
                                    setNotifications(updatedNotifications);
                                    setActivityFeed(updatedActivity);
                                }
                                onClose();
                            } catch (error) {
                                console.error(`Error performing ${type}:`, error);
                                alert(`Failed to ${type} candidates. Please try again.`);
                            }
                        }}
                    >
                        {type === 'move' ? `Move ${selectedIds.length} Candidates` : 
                         type === 'reject' ? `Reject ${selectedIds.length} Candidates` : 
                         `Export ${selectedIds.length} Rows`}
                    </Button>
                </div>
            </div>
            </div>
        </div>,
        document.body
    );
};

// --- Quick Actions Component ---
const QuickActions = ({ 
    onSchedule, 
    onExport,
    onBulkReject,
    onBulkMove,
    onGenerateReport
}: { 
    onSchedule: () => void;
    onExport: () => void;
    onBulkReject: () => void;
    onBulkMove: () => void;
    onGenerateReport: (type: 'weekly' | 'job' | 'time') => void;
}) => {
    const [openDropdown, setOpenDropdown] = useState<'bulk' | 'report' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = (type: 'bulk' | 'report') => {
        setOpenDropdown(openDropdown === type ? null : type);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full flex flex-col" ref={dropdownRef}>
            <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Quick Actions</h3>
            </div>
            <div className="space-y-4 flex-1">
                <button 
                    onClick={onSchedule}
                    className="w-full bg-black text-white rounded-lg py-4 px-4 flex items-center justify-center gap-3 font-bold hover:bg-gray-900 transition-all shadow-md active:scale-[0.98]"
                >
                    <Calendar size={20} />
                    <span>Schedule Interview</span>
                </button>
                
                <div className="relative">
                    <button 
                        onClick={() => toggleDropdown('bulk')}
                        className={`w-full bg-white border text-gray-700 rounded-lg py-3.5 px-4 flex items-center justify-between font-medium hover:bg-gray-50 transition-colors ${openDropdown === 'bulk' ? 'border-black ring-1 ring-black' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3 text-gray-800 font-semibold">
                            <Download size={18} className="text-gray-500" />
                            <span>Bulk Actions</span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-900 transition-transform ${openDropdown === 'bulk' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openDropdown === 'bulk' && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                            <button onClick={() => { onBulkReject(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Bulk Reject</button>
                            <button onClick={() => { onBulkMove(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Move to Next Stage</button>
                            <button onClick={() => { onExport(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium transition-colors">Export Selected</button>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button 
                        onClick={() => toggleDropdown('report')}
                        className={`w-full bg-white border text-gray-700 rounded-lg py-3.5 px-4 flex items-center justify-between font-medium hover:bg-gray-50 transition-colors ${openDropdown === 'report' ? 'border-black ring-1 ring-black' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3 text-gray-800 font-semibold">
                            <BarChart2 size={18} className="text-gray-500" />
                            <span>Generate Report</span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-900 transition-transform ${openDropdown === 'report' ? 'rotate-180' : ''}`} />
                    </button>

                    {openDropdown === 'report' && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                            <button onClick={() => { onGenerateReport('weekly'); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Weekly Performance</button>
                            <button onClick={() => { onGenerateReport('job'); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Job Posting Analysis</button>
                            <button onClick={() => { onGenerateReport('time'); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium transition-colors">Time to Hire Analysis</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Dashboard ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [flowTab, setFlowTab] = useState('New Candidates');
  const [timeRange, setTimeRange] = useState('12w');
  
  // Available flow tabs
  const flowTabs = ['New Candidates', 'Weekly Avg', 'Screening', 'Interviews', 'Offers', 'Hired'];
  
  // Modal States
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<'weekly' | 'job' | 'time' | null>(null);
  const [isAllJobsOpen, setIsAllJobsOpen] = useState(false);
  const [isAllInterviewsOpen, setIsAllInterviewsOpen] = useState(false);
  const [isAllActivityOpen, setIsAllActivityOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'move' | 'reject' | 'export' | null>(null);
  
  const [recentSearch, setRecentSearch] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);

  // Dynamic flow data based on actual data
  const flowData = useMemo(() => {
    const weeks = parseInt(timeRange.replace('w', ''));
    const data = [];
    const now = new Date();
    
    // Generate week ranges based on timeRange
    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const month = weekStart.toLocaleString('default', { month: '2-digit' });
        const day = weekStart.getDate().toString().padStart(2, '0');
        const dateLabel = `${month}-${day}`;
        
        let value = 0;
        
        if (flowTab === 'New Candidates') {
            // Count candidates created in this week
            value = candidates.filter(c => {
                const candidateDate = new Date(c.appliedDate || 0);
                return candidateDate >= weekStart && candidateDate <= weekEnd;
            }).length;
        } else if (flowTab === 'Weekly Avg') {
            // Calculate average of new candidates per week over the selected period
            const allWeeksData = [];
            for (let j = weeks - 1; j >= 0; j--) {
                const ws = new Date(now);
                ws.setDate(now.getDate() - (j * 7));
                ws.setHours(0, 0, 0, 0);
                const we = new Date(ws);
                we.setDate(ws.getDate() + 6);
                we.setHours(23, 59, 59, 999);
                
                const count = candidates.filter(c => {
                    const candidateDate = new Date(c.appliedDate || 0);
                    return candidateDate >= ws && candidateDate <= we;
                }).length;
                allWeeksData.push(count);
            }
            // Calculate running average up to this week
            const weeksUpToNow = weeks - i;
            const sum = allWeeksData.slice(0, weeksUpToNow).reduce((a, b) => a + b, 0);
            value = weeksUpToNow > 0 ? Math.round(sum / weeksUpToNow) : 0;
        } else if (flowTab === 'Interviews') {
            // Count candidates that moved to Interview stage in this week
            // Use activity log to find exact movement dates
            const interviewMovements = activityFeed.filter(a => 
                a.action.includes('moved candidate') && 
                a.to?.includes('Interview') &&
                a.createdAt
            );
            
            value = interviewMovements.filter(activity => {
                const moveDate = new Date(activity.createdAt!);
                return moveDate >= weekStart && moveDate <= weekEnd;
            }).length;
            
            // Also count candidates currently in Interview stage for the most recent week
            // if no movements found (shows current state)
            if (value === 0 && i === weeks - 1) {
                value = candidates.filter(c => c.stage === CandidateStage.INTERVIEW).length;
            }
        } else if (flowTab === 'Offers') {
            // Count candidates that moved to Offer stage in this week
            const offerMovements = activityFeed.filter(a => 
                a.action.includes('moved candidate') && 
                a.to?.includes('Offer') &&
                a.createdAt
            );
            
            value = offerMovements.filter(activity => {
                const moveDate = new Date(activity.createdAt!);
                return moveDate >= weekStart && moveDate <= weekEnd;
            }).length;
            
            if (value === 0 && i === weeks - 1) {
                value = candidates.filter(c => c.stage === CandidateStage.OFFER).length;
            }
        } else if (flowTab === 'Screening') {
            // Count candidates that moved to Screening stage in this week
            const screeningMovements = activityFeed.filter(a => 
                a.action.includes('moved candidate') && 
                a.to?.includes('Screening') &&
                a.createdAt
            );
            
            value = screeningMovements.filter(activity => {
                const moveDate = new Date(activity.createdAt!);
                return moveDate >= weekStart && moveDate <= weekEnd;
            }).length;
            
            if (value === 0 && i === weeks - 1) {
                value = candidates.filter(c => c.stage === CandidateStage.SCREENING).length;
            }
        } else if (flowTab === 'Hired') {
            // Count candidates that moved to Hired stage in this week
            const hiredMovements = activityFeed.filter(a => 
                a.action.includes('moved candidate') && 
                a.to?.includes('Hired') &&
                a.createdAt
            );
            
            value = hiredMovements.filter(activity => {
                const moveDate = new Date(activity.createdAt!);
                return moveDate >= weekStart && moveDate <= weekEnd;
            }).length;
            
            if (value === 0 && i === weeks - 1) {
                value = candidates.filter(c => c.stage === CandidateStage.HIRED).length;
            }
        }
        
        data.push({
            date: dateLabel,
            value: value
        });
    }
    
    return data;
  }, [candidates, interviews, flowTab, timeRange, activityFeed]);

  // Check for payment success from Stripe redirect
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (paymentSuccess === 'success' && sessionId) {
      setShowSuccessMessage(true);
      // Remove query params from URL
      searchParams.delete('payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [searchParams, setSearchParams]);

      const loadData = async () => {
          setLoading(true);
          try {
              const [u, s, a, jobsResult, i, candidatesResult, n] = await Promise.all([
                  api.auth.me(),
                  api.dashboard.getStats(),
                  api.dashboard.getActivity(),
                  api.jobs.list({ excludeClosed: true, page: 1, pageSize: 50 }), // Exclude closed jobs from dashboard
                  api.interviews.list(),
                  api.candidates.list({ page: 1, pageSize: 100 }), // Load first 100 candidates for dashboard
                  api.notifications.list()
              ]);
              setUser(u);
              setStats(s);
              setActivityFeed(a);
              setJobs(jobsResult.data || []);
              setInterviews(i);
              setCandidates(candidatesResult.data || []);
              setNotifications(n);
              
              // Check for expired jobs and refresh notifications if any were created
              try {
                  const { checkJobExpirations } = await import('../services/jobExpirationChecker');
                  await checkJobExpirations();
                  // Refresh notifications after checking expirations
                  const updatedNotifications = await api.notifications.list();
                  setNotifications(updatedNotifications);
              } catch (expError) {
                  console.error('Error checking job expirations:', expError);
              }
          } catch (error) {
              console.error("Error loading dashboard", error);
          } finally {
              setLoading(false);
          }
      };

  useEffect(() => {
      loadData();
  }, []);

  // Real-time subscription for notifications (to play sound on new notifications)
  useEffect(() => {
      const setupRealtimeSubscription = async () => {
          const { supabase } = await import('../services/supabase');
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user?.id) return;

          // Subscribe to new notifications
          const channel = supabase
              .channel(`notifications:${user.id}`)
              .on(
                  'postgres_changes',
                  {
                      event: 'INSERT',
                      schema: 'public',
                      table: 'notifications',
                      filter: `user_id=eq.${user.id}`
                  },
                  async (payload: any) => {
                      // Play notification sound
                      const { playNotificationSound } = await import('../utils/soundUtils');
                      playNotificationSound();
                      
                      // Reload notifications
                      const updated = await api.notifications.list();
                      setNotifications(updated);
                  }
              )
              .subscribe();

          return () => {
              supabase.removeChannel(channel);
          };
      };

      const cleanup = setupRealtimeSubscription();
      return () => {
          cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      };
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredCandidates = useMemo(() => {
      if (!recentSearch) return candidates.slice(0, 4);
      return candidates.filter(c => 
          c.name.toLowerCase().includes(recentSearch.toLowerCase()) || 
          c.role.toLowerCase().includes(recentSearch.toLowerCase())
      );
  }, [recentSearch, candidates]);

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-white">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="pt-8 px-8 pb-2 space-y-6 max-w-[1600px] mx-auto bg-white font-sans text-gray-900 relative">
      
      {/* Payment Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="text-white" size={20} />
          </div>
          <div>
            <p className="font-semibold text-green-900">Payment Successful!</p>
            <p className="text-sm text-green-700">Your subscription is now active. Welcome to CoreFlow!</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="ml-4 text-green-600 hover:text-green-800"
          >
            <X size={20} />
          </button>
        </div>
      )}
      
      {/* Modals */}
      <ScheduleInterviewModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} />
      
      <GenericListModal isOpen={isAllJobsOpen} onClose={() => setIsAllJobsOpen(false)} title="All Active Jobs">
          <div className="divide-y divide-gray-100">
              {jobs.length > 0 ? jobs.map((job) => (
                  <div key={job.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                      <div>
                          <h3 className="font-bold text-gray-900">{job.title}</h3>
                          <p className="text-xs text-gray-500">{job.department} • {job.location} • {job.type}</p>
                      </div>
                      <div className="text-right">
                          <p className="font-bold">{job.applicantsCount}</p>
                          <p className="text-xs text-gray-500">Applicants</p>
                      </div>
                  </div>
              )) : <div className="p-6 text-center text-gray-500">No jobs posted yet.</div>}
          </div>
      </GenericListModal>

      <GenericListModal isOpen={isAllInterviewsOpen} onClose={() => setIsAllInterviewsOpen(false)} title="Interview Calendar">
          <div className="divide-y divide-gray-100">
              {interviews.length > 0 ? interviews.map((interview) => (
                  <div key={interview.id} className="p-4 flex gap-4 items-center hover:bg-gray-50">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-xs font-bold">
                          <span>{new Date(interview.date).getDate()}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{new Date(interview.date).toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-900">{interview.candidateName}</h3>
                          <p className="text-xs text-gray-500">{interview.jobTitle} • {interview.time}</p>
                          <p className="text-xs text-gray-400 mt-1">{interview.type} with {interview.interviewer}</p>
                      </div>
                  </div>
              )) : <p className="p-6 text-center text-gray-500">No scheduled interviews.</p>}
          </div>
      </GenericListModal>

      <GenericListModal isOpen={isAllActivityOpen} onClose={() => setIsAllActivityOpen(false)} title="Activity Feed">
          <div className="divide-y divide-gray-100">
              {activityFeed.length > 0 ? activityFeed.map((item) => (
                  <div key={item.id} className="p-4 flex gap-3 hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <Bell size={14} />
                      </div>
                      <div>
                          <p className="text-sm text-gray-900"><span className="font-bold">{item.user}</span> {item.action} <span className="font-medium">{item.target}</span></p>
                          <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                      </div>
                  </div>
              )) : <div className="p-6 text-center text-gray-500">No recent activity.</div>}
          </div>
      </GenericListModal>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
            <p className="text-gray-500 text-sm mt-1">Here's what's happening in your pipeline today.</p>
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

      {/* Row 1: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Jobs" value={stats?.activeJobs || 0} trend={stats?.activeJobsTrend || '+0'} icon={Briefcase} />
        <StatCard title="Total Candidates" value={stats?.totalCandidates || 0} trend={stats?.candidatesTrend || '+0%'} icon={Users} />
        <StatCard title="Qualified Candidates" value={stats?.qualifiedCandidates || 0} trend={stats?.qualifiedTrend || '+0%'} icon={CheckCircle} />
        <StatCard title="Avg Time to Fill" value={stats?.avgTimeToFill || '0d'} trend={stats?.timeToFillTrend || '0d'} trendLabel="improvement" icon={Clock} />
      </div>

      {/* Row 2: Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recruitment Flow */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recruitment Flow</h2>
                  <div className="flex gap-1 mt-2 sm:mt-0">
                      {['4w', '8w', '12w'].map((range) => (
                          <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${timeRange === range ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{range}</button>
                      ))}
                  </div>
              </div>
              <div className="flex gap-6 border-b border-gray-100 mb-4">
                  {flowTabs.map((tab) => (
                      <button key={tab} onClick={() => setFlowTab(tab)} className={`pb-2 text-xs font-medium transition-all relative ${flowTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>{tab} {flowTab === tab && (<span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full"></span>)}</button>
                  ))}
              </div>
              <div className="h-[240px] w-full relative flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={flowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 10}} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} dy={10} />
                            <YAxis stroke="#9ca3af" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '8px' }} itemStyle={{ color: '#111827', fontSize: '11px', fontWeight: 'bold' }} labelStyle={{ color: '#6b7280', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorBlue)" activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }} />
                        </AreaChart>
                    </ResponsiveContainer>
              </div>
          </div>

          {/* Quick Actions Widget */}
          <div className="lg:col-span-1">
              <QuickActions 
                onSchedule={() => setIsScheduleOpen(true)}
                onExport={() => setBulkActionType('export')}
                onBulkReject={() => setBulkActionType('reject')}
                onBulkMove={() => setBulkActionType('move')}
                onGenerateReport={(type) => setReportModalType(type)}
              />
          </div>
      </div>

      {/* Row 3: Operational */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900 text-lg">Upcoming Interviews</h3><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal size={16}/></Button></div>
                <div className="space-y-3">
                    {interviews.slice(0, 3).map((interview) => (
                        <div key={interview.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer group">
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"><span className="text-lg font-bold text-gray-900 leading-none">{new Date(interview.date).getDate()}</span><span className="text-[9px] text-gray-400 uppercase font-bold">{new Date(interview.date).toLocaleString('default', { month: 'short' })}</span></div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{interview.candidateName}</p><div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5"><Clock size={12} /><span>{interview.time}</span><span className="w-1 h-1 rounded-full bg-gray-300"></span><span className="truncate">{interview.type}</span></div></div>
                        </div>
                    ))}
                    {interviews.length === 0 && <p className="text-gray-500 text-sm italic">No interviews scheduled.</p>}
                </div>
                <button onClick={() => navigate('/calendar')} className="w-full mt-4 text-xs font-medium text-gray-500 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors">View Calendar</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900 text-lg">Jobs in Progress</h3><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Plus size={16}/></Button></div>
             <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-all group bg-gray-50/30">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">{job.title.charAt(0)}</div><div><p className="text-sm font-bold text-gray-900 truncate w-32">{job.title}</p><p className="text-xs text-gray-500">{job.department}</p></div></div>
                        <div className="text-right"><p className="text-sm font-bold text-gray-900">{job.applicantsCount}</p><p className="text-[9px] text-gray-500 uppercase tracking-wide">Applied</p></div>
                    </div>
                ))}
                {jobs.length === 0 && <p className="text-gray-500 text-sm italic">No active jobs.</p>}
             </div>
             <button onClick={() => navigate('/jobs')} className="w-full mt-4 text-xs font-medium text-gray-500 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors">View All Jobs</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Activity size={18} /> Activity Feed</h3><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal size={16}/></Button></div>
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 flex-1 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar">
                    {activityFeed.length > 0 ? activityFeed.slice(0, 4).map((item) => (
                        <div key={item.id} className="relative pl-8"><div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-gray-200 z-10"></div><p className="text-xs text-gray-900 leading-relaxed"><span className="font-bold">{item.user}</span> {item.action} <span className="font-medium border-b border-gray-300">{item.target}</span></p><p className="text-[10px] text-gray-400 mt-0.5">{item.time}</p></div>
                    )) : <p className="text-gray-500 text-sm italic pl-8">No activity yet.</p>}
                </div>
                {activityFeed.length > 4 && (
                    <div className="mt-4 pt-4 border-t border-gray-50 text-center">
                        <button onClick={() => setIsAllActivityOpen(true)} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                            View All Activity ({activityFeed.length})
                        </button>
                    </div>
                )}
          </div>
      </div>

      {/* Row 4: Recently Sourced */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg">Recently Sourced</h3>
            <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={recentSearch}
                    onChange={(e) => setRecentSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-black transition-colors" 
                />
            </div>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCandidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="relative">
                        <Avatar name={candidate.name} className="w-10 h-10 border border-gray-200" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{candidate.name}</p><p className="text-xs text-gray-500 truncate">{candidate.role}</p></div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-medium">{candidate.stage}</span>
                </div>
            ))}
            {filteredCandidates.length === 0 && <p className="text-sm text-gray-500 col-span-4 text-center py-4">No candidates found.</p>}
         </div>
      </div>

      {/* Report Modal */}
      <ReportModal isOpen={!!reportModalType} onClose={() => setReportModalType(null)} type={reportModalType} />

      {/* Bulk Action Modal */}
      <BulkActionModal 
        setNotifications={setNotifications} 
        isOpen={!!bulkActionType} 
        onClose={() => setBulkActionType(null)} 
        type={bulkActionType} 
        candidates={candidates}
        setCandidates={setCandidates}
        setActivityFeed={setActivityFeed}
      />
    </div>
  );
};

export default Dashboard;


