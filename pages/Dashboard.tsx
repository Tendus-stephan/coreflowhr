import React, { useState, useEffect, useRef, useMemo, RefObject } from 'react';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Briefcase, CheckCircle, Clock, Activity, Filter,
    ChevronRight, MoreHorizontal, Plus, Calendar, Download, ChevronDown,
    BarChart2, Search, X, Video, Link as LinkIcon, CheckSquare, Square, Bell,
    FileText, File, ArrowRight, Zap, Mail, UserPlus, Archive, Pencil,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { Candidate, CandidateStage, Job, Interview, DashboardStats, ActivityItem, User } from '../types';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { Avatar } from '../components/ui/Avatar';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { api, Notification } from '../services/api';
import { getNotificationLink } from '../utils/notificationLinks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CoachMarkIfUnseen } from '../components/CoachMark';
import { loadSeenMarks } from '../utils/coachMarks';

// --- Helper Components ---

// --- Activity feed helpers ---
const getActivityMeta = (action: string): { icon: React.ElementType; bg: string; color: string } => {
    const a = action.toLowerCase();
    if (a.includes('created job') || a.includes('cloned job') || a.includes('published job'))
        return { icon: Briefcase, bg: 'bg-green-50', color: 'text-green-600' };
    if (a.includes('closed job') || a.includes('deleted job') || a.includes('unpublished job'))
        return { icon: Archive, bg: 'bg-red-50', color: 'text-red-500' };
    if (a.includes('moved candidate'))
        return { icon: ArrowRight, bg: 'bg-blue-50', color: 'text-blue-600' };
    if (a.includes('added candidate') || a.includes('received application'))
        return { icon: UserPlus, bg: 'bg-blue-50', color: 'text-blue-600' };
    if (a.includes('email') || a.includes('sent'))
        return { icon: Mail, bg: 'bg-purple-50', color: 'text-purple-600' };
    if (a.includes('workflow') || a.includes('automation'))
        return { icon: Zap, bg: 'bg-orange-50', color: 'text-orange-500' };
    if (a.includes('note'))
        return { icon: FileText, bg: 'bg-yellow-50', color: 'text-yellow-600' };
    if (a.includes('edited') || a.includes('updated') || a.includes('scored'))
        return { icon: Pencil, bg: 'bg-gray-100', color: 'text-gray-500' };
    return { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-400' };
};

/** Renders action text with quoted segments (subject/target) bolded in dark color. */
const renderActionText = (action: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /"([^"]+)"/g;
    let match;
    while ((match = regex.exec(action)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={`t-${lastIndex}`} className="text-gray-500 font-normal">{action.slice(lastIndex, match.index)}</span>);
        }
        parts.push(<span key={`b-${match.index}`} className="font-semibold text-gray-900">{match[1]}</span>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < action.length) {
        parts.push(<span key={`t-${lastIndex}`} className="text-gray-500 font-normal">{action.slice(lastIndex)}</span>);
    }
    return parts;
};

// --- Activity Feed Modal ---
const ActivityFeedModal = ({ isOpen, onClose, items }: { isOpen: boolean; onClose: () => void; items: ActivityItem[] }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 flex flex-col max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Activity Feed</h2>
                    <button onClick={onClose} aria-label="Close activity feed" className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>
                {/* Timeline */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
                    ) : (
                        <div className="relative">
                            {/* Vertical line */}
                            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
                            <div className="space-y-5">
                                {items.map((item) => {
                                    const meta = getActivityMeta(item.action);
                                    const Icon = meta.icon;
                                    return (
                                        <div key={item.id} className="relative flex gap-4">
                                            {/* Icon on the line */}
                                            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.bg}`}>
                                                <Icon size={13} className={meta.color} />
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-1.5">
                                                <p className="text-sm leading-snug">
                                                    <span className="font-semibold text-gray-900">{item.user}</span>
                                                    {' '}
                                                    {renderActionText(item.action)}
                                                    <span className="text-xs text-gray-400 ml-1.5">· {item.time}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-sm font-medium text-gray-700 border border-gray-200 px-4 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 p-4 animate-in fade-in duration-200 overflow-y-auto" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
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
        </div>,
        document.body
    );
};

// --- Report Modal ---
const ReportModal = ({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: 'weekly' | 'job' | 'time' | null }) => {
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${type}_report_${dateString}.csv`;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateRange = `${thirtyDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const handleDownload = async () => {
        setDownloading(true);
        setError(null);
        try {
            const dateTo = new Date().toISOString();
            const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { csv, filename } = await api.reports.exportCsv({ dateFrom, dateTo });
            if (!csv) throw new Error('No data to export');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || fileName;
            a.click();
            URL.revokeObjectURL(url);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to generate report. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 p-4 animate-in fade-in duration-200 overflow-y-auto" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Generate Report</h2>
                    <button onClick={onClose} aria-label="Close report dialog" className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{titles[type]}</h3>
                        <p className="text-sm text-gray-500">
                            Export CSV report for the last 30 days:<br/>
                            <span className="font-medium text-gray-900">{dateRange}</span>
                        </p>
                    </div>

                    <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center gap-4 text-left">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 text-gray-500">
                            <File size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{fileName}</p>
                            <p className="text-xs text-gray-500">CSV Spreadsheet</p>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <Button variant="black" className="w-full justify-center" icon={downloading ? undefined : <Download size={16} />} onClick={handleDownload} disabled={downloading}>
                        {downloading ? 'Generating...' : 'Download Report'}
                    </Button>
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmationPending, setConfirmationPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setConfirmationPending(false);
        setErrorMessage(null);
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
            c.name?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query) ||
            c.role?.toLowerCase().includes(query) ||
            c.location?.toLowerCase().includes(query) ||
            c.skills?.some(skill => skill.toLowerCase().includes(query))
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

    const performAction = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setErrorMessage(null);
        try {
            if (type === 'reject') {
                const rejectPromises = selectedIds.map(id =>
                    api.candidates.update(id, { stage: CandidateStage.REJECTED })
                );
                await Promise.all(rejectPromises);
                const { playNotificationSound } = await import('../utils/soundUtils');
                playNotificationSound();
                const [updated, updatedNotifications, updatedActivity] = await Promise.all([
                    api.candidates.list({ page: 1, pageSize: 100 }),
                    api.notifications.list(),
                    api.dashboard.getActivity()
                ]);
                setCandidates(updated.data || []);
                setNotifications(updatedNotifications);
                setActivityFeed(updatedActivity);
            } else if (type === 'move') {
                const targetStage = getNextStage(sourceStage) as CandidateStage;
                const { playNotificationSound } = await import('../utils/soundUtils');
                playNotificationSound();
                const movePromises = selectedIds.map(id =>
                    api.candidates.update(id, { stage: targetStage })
                );
                await Promise.all(movePromises);
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
            setErrorMessage(type === 'reject' ? 'Rejection failed. Please try again.' : 'Move failed. Please try again.');
            setConfirmationPending(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const performExport = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setErrorMessage(null);
        try {
            const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
            const exportCheck = await api.plan.canExportCandidates(selectedCandidates.length);
            if (!exportCheck.allowed) {
                setErrorMessage(exportCheck.message || `Your plan allows up to ${exportCheck.maxAllowed} candidates per export.`);
                return;
            }
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
            onClose();
        } catch (error) {
            console.error('Export error:', error);
            setErrorMessage('Export failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 p-4 animate-in fade-in duration-200 overflow-y-auto" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{titles[type]}</h2>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
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
                                <CustomSelect
                                    value={sourceStage}
                                    onChange={(val) => setSourceStage(val as CandidateStage)}
                                    className="px-3 py-2 rounded-lg"
                                    options={[
                                        { value: CandidateStage.SCREENING, label: 'Screening' },
                                        { value: CandidateStage.INTERVIEW, label: 'Interview' },
                                        { value: CandidateStage.OFFER, label: 'Offer' },
                                    ]}
                                />
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
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black"
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
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.includes(c.id) ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>
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

                {errorMessage && (
                    <div className="px-6 pt-4">
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-xs text-red-700 font-medium">
                            {errorMessage}
                        </div>
                    </div>
                )}

                {confirmationPending ? (
                    <div className="p-6 border-t border-gray-100">
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                                {type === 'reject'
                                    ? `Reject ${selectedIds.length} ${selectedIds.length === 1 ? 'candidate' : 'candidates'}?`
                                    : `Move ${selectedIds.length} ${selectedIds.length === 1 ? 'candidate' : 'candidates'} to ${getNextStage(sourceStage)}?`}
                            </p>
                            <p className="text-xs text-red-600">
                                {type === 'reject'
                                    ? 'This will move them to Rejected. This action cannot be undone.'
                                    : `This will advance them from ${sourceStage} to ${getNextStage(sourceStage)}. Stage moves cannot be undone in bulk.`}
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setConfirmationPending(false)} disabled={isProcessing}>Go back</Button>
                            <button
                                disabled={isProcessing}
                                onClick={performAction}
                                className="px-5 py-2 rounded-full text-sm font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing
                                    ? 'Processing...'
                                    : type === 'reject'
                                        ? `Yes, reject ${selectedIds.length}`
                                        : `Yes, move ${selectedIds.length}`}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="black"
                            disabled={selectedIds.length === 0 || isProcessing}
                            onClick={type === 'export' ? performExport : () => setConfirmationPending(true)}
                        >
                            {type === 'move' ? `Move ${selectedIds.length} Candidates` :
                             type === 'reject' ? `Reject ${selectedIds.length} Candidates` :
                             `Export ${selectedIds.length} Rows`}
                        </Button>
                    </div>
                )}
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
    onGenerateReport,
    isViewer = false
}: { 
    onSchedule: () => void;
    onExport: () => void;
    onBulkReject: () => void;
    onBulkMove: () => void;
    onGenerateReport: (type: 'weekly' | 'job' | 'time') => void;
    isViewer?: boolean;
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
        <div className="bg-white border border-gray-100 rounded-xl p-6  h-full flex flex-col" ref={dropdownRef}>
            <div className="mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Quick Actions</h3>
            </div>
            <div className="space-y-4 flex-1">
                {!isViewer && (
                <button 
                    onClick={onSchedule}
                    className="w-full bg-gray-900 text-white rounded-lg py-4 px-4 flex items-center justify-center gap-3 font-bold hover:bg-gray-800 transition-all active:scale-[0.98]"
                >
                    <Calendar size={20} />
                    <span>Schedule Interview</span>
                </button>
                )}
                
                {!isViewer && (
                <div className="relative" style={{ zIndex: openDropdown === 'bulk' ? 100 : 10 }}>
                    <button 
                        onClick={() => toggleDropdown('bulk')}
                        className={`w-full bg-white border text-gray-700 rounded-lg py-3.5 px-4 flex items-center justify-between font-medium hover:bg-gray-50 transition-colors relative ${openDropdown === 'bulk' ? 'border-gray-900 ring-1 ring-black' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3 text-gray-800 font-semibold">
                            <Download size={18} className="text-gray-500" />
                            <span>Bulk Actions</span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-900 transition-transform ${openDropdown === 'bulk' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openDropdown === 'bulk' && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden max-h-60 overflow-y-auto" style={{ zIndex: 1000 }}>
                            <button onClick={() => { onBulkReject(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Bulk Reject</button>
                            <button onClick={() => { onBulkMove(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium border-b border-gray-50 transition-colors">Move to Next Stage</button>
                            <button onClick={() => { onExport(); setOpenDropdown(null); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black font-medium transition-colors">Export Selected</button>
                        </div>
                    )}
                </div>
                )}

                <div className="relative" style={{ zIndex: openDropdown === 'report' ? 100 : 10 }}>
                    <button 
                        onClick={() => toggleDropdown('report')}
                        className={`w-full bg-white border text-gray-700 rounded-lg py-3.5 px-4 flex items-center justify-between font-medium hover:bg-gray-50 transition-colors relative ${openDropdown === 'report' ? 'border-gray-900 ring-1 ring-black' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3 text-gray-800 font-semibold">
                            <BarChart2 size={18} className="text-gray-500" />
                            <span>Generate Report</span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-900 transition-transform ${openDropdown === 'report' ? 'rotate-180' : ''}`} />
                    </button>

                    {openDropdown === 'report' && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden max-h-60 overflow-y-auto">
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
  const location = useLocation();
  const toast = useToast();
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
  // sourcingUsage removed — sourcing is now per-job, not monthly
  const [searchParams, setSearchParams] = useSearchParams();

  const [flowTab, setFlowTab] = useState('Applications');
  const [timeRange, setTimeRange] = useState('12w');
  
  // Available flow tabs
  const flowTabs = ['Applications', 'Avg / wk', 'Screening', 'Interviews', 'Offers', 'Hired'];
  
  // Modal States
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<'weekly' | 'job' | 'time' | null>(null);
  const [isAllJobsOpen, setIsAllJobsOpen] = useState(false);
  const [isAllInterviewsOpen, setIsAllInterviewsOpen] = useState(false);
  const [isAllActivityOpen, setIsAllActivityOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'move' | 'reject' | 'export' | null>(null);
  
  const [recentSearch, setRecentSearch] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);

  const activityBtnRef = useRef<HTMLButtonElement>(null);
  const [coachMarksReady, setCoachMarksReady] = useState(false);
  useEffect(() => {
    loadSeenMarks().then(() => setCoachMarksReady(true)).catch(() => setCoachMarksReady(true));
  }, []);

  // Onboarding checklist
  const CHECKLIST_DISMISS_KEY = 'coreflow_checklist_dismissed';
  const [checklistDismissed, setChecklistDismissed] = useState(() => localStorage.getItem(CHECKLIST_DISMISS_KEY) === 'true');

  useEffect(() => {
    if ((location.state as any)?.showChecklist) {
      localStorage.removeItem(CHECKLIST_DISMISS_KEY);
      setChecklistDismissed(false);
    }
  }, [location.state]);

  const [hasClients, setHasClients] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);

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
        
        if (flowTab === 'Applications') {
            // Count candidates created in this week
            value = candidates.filter(c => {
                const candidateDate = new Date(c.appliedDate || 0);
                return candidateDate >= weekStart && candidateDate <= weekEnd;
            }).length;
        } else if (flowTab === 'Avg / wk') {
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
              const [uR, sR, aR, jobsR, iR, candidatesR, nR] = await Promise.allSettled([
                  api.auth.me(),
                  api.dashboard.getStats(),
                  api.dashboard.getActivity(),
                  api.jobs.list({ excludeClosed: true, page: 1, pageSize: 50 }),
                  api.interviews.list(),
                  api.candidates.list({ page: 1, pageSize: 100 }),
                  api.notifications.list()
              ]);

              // Log any failures to help with debugging
              const labels = ['auth.me', 'dashboard.getStats', 'dashboard.getActivity', 'jobs.list', 'interviews.list', 'candidates.list', 'notifications.list'];
              [uR, sR, aR, jobsR, iR, candidatesR, nR].forEach((r, idx) => {
                  if (r.status === 'rejected') console.error(`[Dashboard] ${labels[idx]} failed:`, r.reason);
              });

              if (uR.status === 'fulfilled') setUser(uR.value);
              if (sR.status === 'fulfilled') setStats(sR.value);
              if (aR.status === 'fulfilled') setActivityFeed(aR.value);
              if (jobsR.status === 'fulfilled') setJobs(jobsR.value.data || []);
              if (iR.status === 'fulfilled') setInterviews(iR.value);
              if (candidatesR.status === 'fulfilled') setCandidates(candidatesR.value.data || []);
              if (nR.status === 'fulfilled') setNotifications(nR.value);

              // Only show error toast if auth failed (critical) or ALL calls failed
              const failCount = [uR, sR, aR, jobsR, iR, candidatesR, nR].filter(r => r.status === 'rejected').length;
              if (uR.status === 'rejected' || failCount === 7) {
                  const err = uR.status === 'rejected' ? (uR as PromiseRejectedResult).reason : null;
                  toast.error(err?.message?.includes('Failed to fetch') || !navigator.onLine
                    ? 'No internet connection. Please check your network and refresh.'
                    : 'Failed to load dashboard. Please refresh the page.');
              }
          } catch (error: any) {
              console.error("Error loading dashboard", error);
              toast.error(error?.message?.includes('Failed to fetch') || !navigator.onLine
                ? 'No internet connection. Please check your network and refresh.'
                : 'Failed to load dashboard. Please refresh the page.');
          } finally {
              setLoading(false);
              // Signal that dashboard loading is complete (for loader coordination)
              setTimeout(() => {
                  window.dispatchEvent(new Event('dashboardLoaded'));
              }, 100);
              // Fire background tasks after UI is unblocked — no need to await
              Promise.allSettled([
                  import('../services/jobExpirationChecker').then(m => m.checkJobExpirations()).catch(() => {}),
                  api.interviews.ensureFeedbackReminders().catch(() => {}),
                  api.interviews.ensureUpcomingInterviewReminders().catch(() => {}),
                  api.settings.recordSeen().catch(() => {}),
              ]).then(async () => {
                  // Refresh notifications after background tasks may have created new ones
                  const updated = await api.notifications.list().catch(() => null);
                  if (updated) setNotifications(updated);
              });
          }
      };

  useEffect(() => {
      loadData();
  }, []);

  // Load checklist completion data (non-blocking, runs after main data)
  useEffect(() => {
    if (loading) return;
    api.clients.list().then(list => setHasClients(list.length > 0)).catch(() => {});
    api.offers.list().then(list => setHasOffers(list.length > 0)).catch(() => {});
  }, [loading]);


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

  // Real-time subscription for activity feed
  useEffect(() => {
      const setupActivitySubscription = async () => {
          const { supabase } = await import('../services/supabase');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user?.id) return;

          const channel = supabase
              .channel(`activity_log:${user.id}`)
              .on(
                  'postgres_changes',
                  { event: 'INSERT', schema: 'public', table: 'activity_log' },
                  async () => {
                      const updated = await api.dashboard.getActivity();
                      setActivityFeed(updated);
                  }
              )
              .subscribe();

          return () => { supabase.removeChannel(channel); };
      };

      const cleanup = setupActivitySubscription();
      return () => { cleanup.then(fn => fn && fn()); };
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

  if (loading) return <DashboardSkeleton />;

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="pt-8 px-8 pb-10 max-w-[1600px] mx-auto bg-white font-sans text-gray-900 relative">
      
      {/* Payment Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-100 border border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
            <CheckCircle className="text-white" size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Payment Successful!</p>
            <p className="text-sm text-gray-700">Your subscription is now active. Welcome to CoreFlow!</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            aria-label="Dismiss"
            className="ml-4 text-gray-600 hover:text-gray-800"
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
                          <p className="text-xs text-gray-400 mt-1">{interview.type} with {interview.interviewer}{interview.creatorName ? ` · by ${interview.creatorName}` : ''}</p>
                      </div>
                  </div>
              )) : <p className="p-6 text-center text-gray-500">No scheduled interviews.</p>}
          </div>
      </GenericListModal>

      <ActivityFeedModal isOpen={isAllActivityOpen} onClose={() => setIsAllActivityOpen(false)} items={activityFeed} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome back{user?.name?.trim() ? `, ${user.name.trim().split(' ')[0]}` : ''}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Your pipeline at a glance.</p>
        </div>
        <div className="flex gap-3 items-center">
            <div className="relative" ref={notificationRef}>
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    aria-label="Notifications"
                    aria-haspopup="true"
                    aria-expanded={showNotifications}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white">
                            <span className="sr-only">You have unread notifications</span>
                        </span>
                    )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                    <NotificationDropdown
                        notifications={notifications}
                        anchorEl={notificationRef.current}
                        onMarkAllRead={async () => {
                            await api.notifications.markRead();
                            const updated = await api.notifications.list();
                            setNotifications(updated);
                        }}
                        onNotificationClick={(note) => {
                            const path = getNotificationLink(note.type, note.desc);
                            if (path) {
                                navigate(path);
                                setShowNotifications(false);
                            }
                        }}
                    />
                )}
            </div>
            {(user?.role !== 'Viewer' && user?.role !== 'HiringManager') && (
            <Link to="/jobs/new">
                <Button variant="black" size="sm" icon={<Plus size={14}/>}>Post a Job</Button>
            </Link>
            )}
        </div>
      </div>

      {/* Onboarding checklist */}
      {(() => {
        const steps = [
          { label: 'Add your first client',                  done: hasClients,                                                                                           cta: 'Add client',          href: '/clients' },
          { label: 'Post your first job',                    done: jobs.length > 0,                                                                                      cta: 'Post a job',          href: '/jobs/new' },
          { label: 'Upload candidates',                      done: candidates.length > 0,                                                                                cta: 'Upload CVs',          href: '/candidates' },
          { label: 'Move a candidate through the pipeline',  done: candidates.some(c => c.stage !== CandidateStage.NEW && c.stage !== CandidateStage.REJECTED),         cta: 'View pipeline',       href: '/candidates' },
          { label: 'Send a scheduling link',                 done: interviews.length > 0,                                                                                cta: 'Schedule interview',  href: '/candidates' },
          { label: 'Create and send an offer',               done: hasOffers,                                                                                            cta: 'Create offer',        href: '/candidates' },
        ];
        const completedCount = steps.filter(s => s.done).length;
        const allDone = completedCount === steps.length;
        if (loading || checklistDismissed || allDone) return null;
        return (
          <div className="mt-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="label-overline">Setup</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{completedCount}</span>
                  <span className="text-sm text-gray-400 font-medium ml-0.5">/ {steps.length}</span>
                </div>
              </div>
              <button
                onClick={() => { localStorage.setItem(CHECKLIST_DISMISS_KEY, 'true'); setChecklistDismissed(true); }}
                className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-md hover:bg-gray-100"
                aria-label="Dismiss checklist"
              >
                <X size={14} />
              </button>
            </div>
            {/* Progress track */}
            <div className="h-0.5 bg-gray-100">
              <div
                className="h-0.5 bg-gray-900 transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            {/* Steps */}
            <div className="px-6 pt-2 pb-3">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3 py-2.5">
                  {/* Step indicator */}
                  {step.done ? (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white tabular-nums leading-none">{i + 1}</span>
                    </div>
                  )}
                  {/* Label */}
                  <span className={`flex-1 text-sm ${step.done ? 'text-gray-400' : 'text-gray-800 font-medium'}`}>
                    {step.label}
                  </span>
                  {/* CTA */}
                  {!step.done && (
                    <button
                      onClick={() => { if (step.href) navigate(step.href); }}
                      className="flex-shrink-0 text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-full hover:bg-gray-700 active:bg-gray-950 transition-colors"
                    >
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-gray-100 mt-4" aria-hidden="true" />
          </div>
        );
      })()}

      {/* Row 1: Stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {[
          { label: 'Active Jobs', value: stats?.activeJobs ?? 0 },
          { label: 'Total Candidates', value: stats?.totalCandidates ?? 0 },
          { label: 'Qualified', value: stats?.qualifiedCandidates ?? 0 },
          { label: 'Avg Time to Fill', value: stats?.avgTimeToFill ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>


      {/* Row 2: Chart & Quick Actions */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recruitment Flow */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6  flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recruitment Flow</h2>
                  <div className="flex gap-1 mt-2 sm:mt-0">
                      {['4w', '8w', '12w'].map((range) => (
                          <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${timeRange === range ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{range}</button>
                      ))}
                  </div>
              </div>
              <div className="flex gap-6 border-b border-gray-100">
                  {flowTabs.map((tab) => (
                      <button key={tab} onClick={() => setFlowTab(tab)} className={`pb-2 text-xs font-medium transition-all relative ${flowTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>{tab} {flowTab === tab && (<span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-full"></span>)}</button>
                  ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 mb-2">Candidates entering each stage per week</p>
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
                isViewer={user?.role === 'Viewer'}
              />
          </div>
      </div>

      {/* Row 3: Operational */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900 text-lg">Upcoming Interviews</h3><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal size={16}/></Button></div>
                <div className="space-y-3">
                    {interviews.slice(0, 3).map((interview) => (
                        <div key={interview.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-300 hover:shadow-sm hover:bg-white transition-all duration-150 cursor-pointer group">
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center transition-colors"><span className="text-lg font-bold text-gray-900 leading-none">{new Date(interview.date).getDate()}</span><span className="text-[9px] text-gray-400 uppercase font-bold">{new Date(interview.date).toLocaleString('default', { month: 'short' })}</span></div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{interview.candidateName}</p><div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5"><Clock size={12} /><span>{interview.time}</span><span className="w-1 h-1 rounded-full bg-gray-300"></span><span className="truncate">{interview.type}</span></div>{interview.creatorName && <p className="text-[10px] text-gray-400 mt-0.5 truncate">by {interview.creatorName}</p>}</div>
                        </div>
                    ))}
                    {interviews.length === 0 && <p className="text-gray-500 text-sm italic">No interviews scheduled.</p>}
                </div>
                <button onClick={() => navigate('/calendar')} className="w-full mt-4 text-xs font-medium text-gray-500 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors">View Calendar</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6">
             <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900 text-lg">Jobs in Progress</h3>{user?.role !== 'Viewer' && user?.role !== 'HiringManager' && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/jobs/new')}><Plus size={16}/></Button>}</div>
             <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm hover:bg-white transition-all duration-150 group bg-gray-50/30">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-sm">{job.title.charAt(0)}</div><div><p className="text-sm font-bold text-gray-900 truncate w-32">{job.title}</p><p className="text-xs text-gray-500">{job.department}</p></div></div>
                        <div className="text-right"><p className="text-sm font-bold text-gray-900">{job.candidateCount}</p><p className="text-[9px] text-gray-500 uppercase tracking-wide">Applied</p></div>
                    </div>
                ))}
                {jobs.length === 0 && <p className="text-gray-500 text-sm italic">No active jobs.</p>}
             </div>
             <button onClick={() => navigate('/jobs')} className="w-full mt-4 text-xs font-medium text-gray-500 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors">View All Jobs</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6  flex flex-col">
                <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-gray-900 text-lg">Activity Feed</h3><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal size={16}/></Button></div>
                <div className="relative flex-1 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
                    {activityFeed.length > 0 ? (
                        <div className="relative">
                            <div className="absolute left-4 top-1 bottom-1 w-px bg-gray-100" />
                            <div className="space-y-4">
                                {activityFeed.slice(0, 4).map((item) => {
                                    const meta = getActivityMeta(item.action);
                                    const Icon = meta.icon;
                                    return (
                                        <div key={item.id} className="relative flex gap-3">
                                            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.bg}`}>
                                                <Icon size={12} className={meta.color} />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1.5">
                                                <p className="text-xs leading-snug">
                                                    <span className="font-semibold text-gray-900">{item.user}</span>
                                                    {' '}
                                                    {renderActionText(item.action)}
                                                    <span className="text-[10px] text-gray-400 ml-1">· {item.time}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : <p className="text-gray-400 text-xs pl-8 pt-2">No activity yet.</p>}
                </div>
                {activityFeed.length > 4 && (
                    <div className="mt-4 pt-4 border-t border-gray-50 text-center">
                        <button ref={activityBtnRef} onClick={() => setIsAllActivityOpen(true)} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                            View All Activity ({activityFeed.length})
                        </button>
                    </div>
                )}
          </div>
      </div>

      {/* Row 4: Recently Sourced */}
      <div className="mt-4 bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg">Recently Sourced</h3>
            <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={recentSearch}
                    onChange={(e) => setRecentSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-gray-900 transition-colors" 
                />
            </div>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCandidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="relative">
                        <Avatar name={candidate.name} className="w-10 h-10 border border-gray-200" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-500 border-2 border-white rounded-full"></div>
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

      {coachMarksReady && activityFeed.length > 4 && (
        <CoachMarkIfUnseen
          markId="activity-feed"
          targetRef={activityBtnRef as RefObject<HTMLElement>}
          text="Every action in your workspace is logged here — who moved what, when, and why"
          side="top"
        />
      )}
    </div>
  );
};

export default Dashboard;


