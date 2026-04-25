import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CandidateBoardSkeleton } from '../components/ui/Skeleton';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Candidate, CandidateStage, Job } from '../types';
import { PipelineColumn } from '../components/PipelineColumn';
import {
    Users, Clock, Sparkles, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Download, Upload, Bell, Loader2, Mail, LayoutGrid, List, Trash2, RotateCcw, History,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CandidateModal } from '../components/CandidateModal';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { useToast } from '../contexts/ToastContext';
import { BulkCVUpload, ImportSessionUpdate } from '../components/BulkCVUpload';
import { Avatar } from '../components/ui/Avatar';
import { api, Notification } from '../services/api';
import { supabase } from '../services/supabase';
import { toUserError } from '../utils/edgeFunctionError';
import { sendSlackNotification, buildCandidateStagedBlocks } from '../services/slack';

// ── Import History ────────────────────────────────────────────────────────────

const IMPORT_HISTORY_KEY = 'coreflow_import_history';

interface ImportRecord {
    id: string;
    startedAt: string;
    jobId: string;
    jobName: string;
    status: 'processing' | 'success' | 'partial' | 'failed' | 'interrupted' | 'cancelled';
    total: number;
    succeeded: number;
    failed: number;
}

// ─────────────────────────────────────────────────────────────────────────────

const STAGE_META: Record<CandidateStage, { label: string; dot: string; badge: string }> = {
    [CandidateStage.NEW]:       { label: 'Waitlist',  dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600'    },
    [CandidateStage.SCREENING]: { label: 'Screening', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700'    },
    [CandidateStage.INTERVIEW]: { label: 'Interview', dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700' },
    [CandidateStage.OFFER]:     { label: 'Offer',     dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700'  },
    [CandidateStage.HIRED]:     { label: 'Hired',     dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700'  },
    [CandidateStage.REJECTED]:  { label: 'Rejected',  dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600'      },
};

// ─── List View ───────────────────────────────────────────────────────────────

const LIST_PAGE_SIZE = 20;

const CandidateListView: React.FC<{
    candidates: Candidate[];
    onSelectCandidate: (c: Candidate) => void;
    sortField: 'name' | 'score' | 'date' | null;
    sortDir: 'asc' | 'desc';
    onSort: (field: 'name' | 'score' | 'date') => void;
    poolJobId: string | null;
}> = ({ candidates, onSelectCandidate, sortField, sortDir, onSort, poolJobId }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 whenever the candidate list changes (filter/sort)
    useEffect(() => { setCurrentPage(1); }, [candidates]);

    const totalPages = Math.max(1, Math.ceil(candidates.length / LIST_PAGE_SIZE));
    const paginated = candidates.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE);
    const start = candidates.length === 0 ? 0 : (currentPage - 1) * LIST_PAGE_SIZE + 1;
    const end = Math.min(currentPage * LIST_PAGE_SIZE, candidates.length);

    const SortIcon = ({ field }: { field: 'name' | 'score' | 'date' }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc'
            ? <ChevronUp size={10} className="flex-shrink-0" />
            : <ChevronDown size={10} className="flex-shrink-0" />;
    };

    return (
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 mx-6 my-4 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Column header */}
            <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 flex-shrink-0">
                <button
                    className="flex-1 flex items-center gap-1 hover:text-gray-600 text-left"
                    onClick={() => onSort('name')}
                >
                    Name <SortIcon field="name" />
                </button>
                <div className="w-40 hidden sm:block">Company / Role</div>
                <div className="w-24">Stage</div>
                <button
                    className="w-14 flex items-center gap-1 hover:text-gray-600"
                    onClick={() => onSort('score')}
                >
                    Score <SortIcon field="score" />
                </button>
                <div className="w-36 hidden md:block">Skills</div>
                <div className="w-24 hidden lg:block">Source</div>
                <button
                    className="w-16 flex items-center gap-1 hover:text-gray-600"
                    onClick={() => onSort('date')}
                >
                    Date <SortIcon field="date" />
                </button>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {candidates.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                        No candidates match your filters
                    </div>
                ) : (
                    paginated.map(c => {
                        const isPool = poolJobId ? c.jobId === poolJobId : false;
                        const score = (!isPool && c.aiMatchScore != null) ? c.aiMatchScore as number : undefined;
                        const scoreColor = score != null
                            ? score >= 70 ? 'text-green-700 bg-green-50'
                            : score >= 50 ? 'text-amber-700 bg-amber-50'
                            : 'text-red-600 bg-red-50'
                            : '';
                        const stageMeta = STAGE_META[c.stage];
                        return (
                            <div
                                key={c.id}
                                onClick={() => onSelectCandidate(c)}
                                className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                            >
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                    <Avatar name={c.name} className="w-9 h-9 text-[11px] flex-shrink-0 border border-gray-100" />
                                    <span className="text-[13px] font-medium text-gray-900 truncate">{c.name}</span>
                                </div>
                                <div className="w-40 hidden sm:block">
                                    <p className="text-[12px] text-gray-500 truncate">
                                        {c.currentCompany && c.role
                                            ? `${c.currentCompany} · ${c.role}`
                                            : c.currentCompany || c.role || '—'}
                                    </p>
                                </div>
                                <div className="w-24">
                                    <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageMeta.dot}`} />
                                        {stageMeta.label}
                                    </span>
                                </div>
                                <div className="w-14">
                                    {isPool ? null : score != null ? (
                                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${scoreColor}`}>{score}%</span>
                                    ) : (
                                        <span className="text-[11px] text-gray-300">—</span>
                                    )}
                                </div>
                                <div className="w-36 hidden md:flex items-center gap-1 flex-wrap">
                                    {c.skills.slice(0, 2).map(s => (
                                        <span key={s} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">{s}</span>
                                    ))}
                                    {c.skills.length > 2 && (
                                        <span className="text-[10px] text-gray-400">+{c.skills.length - 2}</span>
                                    )}
                                </div>
                                <div className="w-24 hidden lg:block">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                        c.source === 'cv_import'
                                            ? 'bg-blue-50 text-blue-600'
                                            : c.source === 'ai_sourced'
                                            ? 'bg-purple-50 text-purple-600'
                                            : 'bg-gray-50 text-gray-500'
                                    }`}>
                                        {c.source === 'cv_import'
                                            ? 'CV Import'
                                            : c.source === 'ai_sourced'
                                            ? 'AI Sourced'
                                            : 'Applied'}
                                    </span>
                                </div>
                                <div className="w-16">
                                    <span className="text-[11px] text-gray-400">
                                        {new Date(c.appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
                    <span className="text-[11px] text-gray-400">
                        {start}–{end} of {candidates.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => p - 1)}
                            disabled={currentPage === 1}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] text-gray-500 tabular-nums px-1">{currentPage}/{totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Board ────────────────────────────────────────────────────────────────────

const CandidateBoard: React.FC = () => {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [poolJobId, setPoolJobId] = useState<string | null>(null);

    const [selectedJob, setSelectedJob] = useState<string>('all');
    const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [initialTabFromUrl, setInitialTabFromUrl] = useState<string | undefined>();
    const [initialEmailSubTabFromUrl, setInitialEmailSubTabFromUrl] = useState<string | undefined>();

    // View mode
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

    // List view sort
    const [sortField, setSortField] = useState<'name' | 'score' | 'date' | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Confirm dialog for reject / delete
    const [pendingAction, setPendingAction] = useState<{
        type: 'reject' | 'delete';
        candidateId: string;
        candidateName: string;
    } | null>(null);
    const [pendingActionLoading, setPendingActionLoading] = useState(false);

    // Trash panel
    const [trashOpen, setTrashOpen] = useState(false);
    const [trashedCandidates, setTrashedCandidates] = useState<Candidate[]>([]);
    const [trashLoading, setTrashLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // Import history
    const [importHistory, setImportHistory] = useState<ImportRecord[]>(() => {
        try {
            const stored = localStorage.getItem(IMPORT_HISTORY_KEY);
            if (!stored) return [];
            const records: ImportRecord[] = JSON.parse(stored);
            // Any entry still "processing" when the page loads was interrupted (refresh/crash)
            const fixed = records.map(r =>
                r.status === 'processing' ? { ...r, status: 'interrupted' as const } : r
            );
            if (fixed.some((r, i) => r.status !== records[i].status)) {
                localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(fixed));
            }
            return fixed;
        } catch { return []; }
    });
    const [showImportHistory, setShowImportHistory] = useState(false);
    const [fixingEmails, setFixingEmails] = useState(false);
    const importHistoryRef = useRef<HTMLDivElement | null>(null);
    const importHistoryPortalRef = useRef<HTMLDivElement | null>(null);

    const openTrash = async () => {
        setTrashOpen(true);
        setTrashLoading(true);
        try {
            const deleted = await api.candidates.listDeleted();
            setTrashedCandidates(deleted);
        } catch { /* ignore */ }
        finally { setTrashLoading(false); }
    };

    const handleRestore = async (id: string) => {
        setRestoringId(id);
        try {
            await api.candidates.restoreCandidate(id);
            setTrashedCandidates(prev => prev.filter(c => c.id !== id));
            // Reload board candidates
            const result = await api.candidates.list();
            setCandidates(result.data);
            toast.success('Candidate restored');
        } catch (e: any) {
            toast.error(e.message || 'Failed to restore');
        } finally {
            setRestoringId(null);
        }
    };

    // Import history session handler
    const handleSessionUpdate = (update: ImportSessionUpdate) => {
        setImportHistory(prev => {
            let updated: ImportRecord[];
            if (update.status === 'processing') {
                const record: ImportRecord = {
                    id: update.id,
                    startedAt: new Date().toISOString(),
                    jobId: update.jobId,
                    jobName: update.jobName,
                    status: 'processing',
                    total: update.total,
                    succeeded: 0,
                    failed: 0,
                };
                updated = [record, ...prev].slice(0, 20);
            } else if (update.status === 'cancelled') {
                updated = prev.map(r => r.id === update.id
                    ? { ...r, status: 'cancelled' as const, succeeded: update.succeeded, failed: update.failed }
                    : r
                );
            } else {
                const finalStatus: ImportRecord['status'] =
                    update.failed === 0 ? 'success' :
                    update.succeeded === 0 ? 'failed' : 'partial';
                updated = prev.map(r => r.id === update.id
                    ? { ...r, status: finalStatus, succeeded: update.succeeded, failed: update.failed }
                    : r
                );
            }
            try { localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    // Close import history dropdown on outside click (checks both trigger and portal)
    useEffect(() => {
        if (!showImportHistory) return;
        const handler = (e: MouseEvent) => {
            const inTrigger = importHistoryRef.current?.contains(e.target as Node);
            const inPortal  = importHistoryPortalRef.current?.contains(e.target as Node);
            if (!inTrigger && !inPortal) setShowImportHistory(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showImportHistory]);

    // Horizontal scroll container for pipeline columns
    const boardRef = useRef<HTMLDivElement | null>(null);

    const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!boardRef.current) return;
        e.preventDefault();

        const container = boardRef.current;
        const rect = container.getBoundingClientRect();
        const edgeThreshold = 120;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const scrollSpeed = 40;

        if (e.clientX > rect.right - edgeThreshold && container.scrollLeft < maxScrollLeft) {
            container.scrollLeft = Math.min(container.scrollLeft + scrollSpeed, maxScrollLeft);
        }
        if (e.clientX < rect.left + edgeThreshold && container.scrollLeft > 0) {
            container.scrollLeft = Math.max(container.scrollLeft - scrollSpeed, 0);
        }
    };

    // Translate vertical mousewheel to horizontal scroll on the kanban board
    useEffect(() => {
        const el = boardRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Move confirmation (after drag)
    const [pendingMove, setPendingMove] = useState<{
        candidateId: string;
        candidateName: string;
        fromStage: CandidateStage;
        toStage: CandidateStage;
    } | null>(null);
    const [isMoving, setIsMoving] = useState(false);

    // Screening email draft (Waitlist → Screening)
    const [screeningDraft, setScreeningDraft] = useState<{
        subject: string;
        body: string;
        loading: boolean;
        token: string | null;
        hasEmail: boolean;
    } | null>(null);

    // Load email draft when Waitlist → Screening move is pending
    useEffect(() => {
        if (pendingMove?.fromStage === CandidateStage.NEW && pendingMove.toStage === CandidateStage.SCREENING) {
            const candidate = candidates.find(c => c.id === pendingMove.candidateId);
            if (!candidate) return;
            setScreeningDraft({ subject: '', body: '', loading: true, token: null, hasEmail: !!candidate.email });
            Promise.all([
                api.emailTemplates.getTemplates(),
                candidate.email ? api.candidates.generateCvUploadToken(pendingMove.candidateId) : Promise.resolve(null),
            ]).then(([templates, token]) => {
                const tpl = templates.find((t: any) => t.type === 'Sourcing' || (t.type || '').toLowerCase().includes('screen')) ?? templates[0];
                const baseUrl = window.location.origin;
                const cvLink = token && candidate.jobId ? `${baseUrl}/jobs/apply/${candidate.jobId}?token=${token}` : null;
                let subject = tpl?.subject ?? 'Next Steps: Your Application';
                let body = (tpl?.content ?? `Hi ${candidate.name},\n\nThank you for your interest. Please upload your CV to continue.`)
                    .replace(/{candidate_name}/g, candidate.name ?? '')
                    .replace(/{job_title}/g, '');
                if (cvLink) {
                    if (body.includes('{cv_upload_link}')) {
                        body = body.replace(/{cv_upload_link}/g, cvLink);
                    } else {
                        body += `\n\nPlease follow the link below to upload your CV:\n${cvLink}`;
                    }
                }
                setScreeningDraft({ subject, body, loading: false, token, hasEmail: !!candidate.email });
            }).catch(() => {
                setScreeningDraft(prev => prev ? { ...prev, loading: false } : null);
            });
        } else {
            setScreeningDraft(null);
        }
    }, [pendingMove]);

    // Job dropdown open state (for scrollable list)
    const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
    const jobDropdownRef = useRef<HTMLDivElement>(null);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [userRole, setUserRole] = useState<string>('');
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    useEffect(() => {
        api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) return;
            supabase.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).single()
                .then(({ data: wm }) => setWorkspaceId(wm?.workspace_id ?? null));
        });
    }, []);

    const isViewer = userRole === 'Viewer';

    // Realtime: sync candidate changes made by other team members
    useEffect(() => {
        if (!workspaceId) return;
        const channel = supabase
            .channel(`candidates-ws-${workspaceId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'candidates', filter: `workspace_id=eq.${workspaceId}` }, payload => {
                const r = payload.new as any;
                setCandidates(prev => prev.map(c => c.id === r.id ? {
                    ...c,
                    stage: r.stage as CandidateStage,
                    resumeSummary: r.resume_summary ?? c.resumeSummary,
                    name: r.name ?? c.name,
                    email: r.email ?? c.email,
                    aiMatchScore: r.ai_match_score ?? c.aiMatchScore,
                    aiAnalysis: r.ai_analysis ?? c.aiAnalysis,
                } : c));
                setSelectedCandidate(prev => prev?.id === r.id ? { ...prev, stage: r.stage as CandidateStage } : prev);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'candidates', filter: `workspace_id=eq.${workspaceId}` }, () => {
                // Refetch on new candidate — avoids complex row mapping
                api.candidates.list({ page: 1, pageSize: 1000 }).then(r => setCandidates(r.data || [])).catch(() => {});
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'candidates' }, payload => {
                const id = (payload.old as any).id;
                setCandidates(prev => prev.filter(c => c.id !== id));
                setSelectedCandidate(prev => prev?.id === id ? null : prev);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [workspaceId]);

    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [bulkUploadDefaultJobId, setBulkUploadDefaultJobId] = useState<string | undefined>();

    // Close job dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) setJobDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [candidatesResult, jobsResult, n, poolJobRow] = await Promise.all([
                api.candidates.list({ page: 1, pageSize: 1000 }),
                api.jobs.list({ excludeClosed: true, page: 1, pageSize: 100 }),
                api.notifications.list(),
                supabase.from('jobs').select('id').eq('title', '__candidate_pool__').maybeSingle(),
            ]);
            const resolvedPoolJobId = poolJobRow.data?.id ?? null;
            setPoolJobId(resolvedPoolJobId);

            // Clear any stale AI scores on pool candidates (they have no job context)
            if (resolvedPoolJobId) {
                supabase.from('candidates')
                    .update({ ai_match_score: null, ai_analysis: null })
                    .eq('job_id', resolvedPoolJobId)
                    .not('ai_match_score', 'is', null)
                    .then(() => {});
            }

            setCandidates((candidatesResult.data || []).map(c =>
                c.jobId === resolvedPoolJobId
                    ? { ...c, aiMatchScore: undefined, aiAnalysis: undefined }
                    : c
            ));
            setJobs(jobsResult.data || []);
            setNotifications(n);
            setLoading(false);
            try {
                await api.interviews.ensureFeedbackReminders();
                await api.interviews.ensureUpcomingInterviewReminders();
                const updatedN = await api.notifications.list();
                setNotifications(updatedN);
            } catch (_) {}
            try { await api.settings.recordSeen(); } catch (_) {}
        };
        loadData();
    }, []);

    // Background AI scoring: score candidates with CVs but no score, without opening the modal
    const scoredIds = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (loading || candidates.length === 0 || jobs.length === 0) return;

        const needsAiScoring = (c: Candidate) => {
            if (!c.resumeSummary || c.resumeSummary.length <= 100) return false;
            if (scoredIds.current.has(c.id)) return false;
            if (!c.aiAnalysis) return true;
            // Incomplete: basic skill-match stub, not a real AI summary
            return c.aiAnalysis.startsWith('Skills matched:') &&
                !c.aiAnalysis.includes('Strengths:') &&
                !c.aiAnalysis.includes('Areas to Explore:') &&
                c.aiAnalysis.length < 200;
        };

        const unscored = candidates.filter(needsAiScoring);
        if (unscored.length === 0) return;

        // Mark as queued to prevent duplicate invocations
        unscored.forEach(c => scoredIds.current.add(c.id));

        const run = async () => {
            // Seed cache from already-loaded jobs; fetch stragglers (closed jobs, pool, etc.) on demand
            const jobCache = new Map<string, Job>(jobs.map(j => [j.id, j]));

            for (const candidate of unscored) {
                let job = jobCache.get(candidate.jobId);
                if (!job) {
                    try {
                        job = await api.jobs.get(candidate.jobId);
                        if (job) jobCache.set(job.id, job);
                    } catch {
                        continue; // Can't determine job context — skip
                    }
                }
                // No job context = can't produce a meaningful match score
                if (!job || job.title === '__candidate_pool__') continue;
                try {
                    const { data: analysis } = await supabase.functions.invoke('analyze-candidate', {
                        body: {
                            resumeSummary: (candidate.resumeSummary ?? '').substring(0, 800),
                            skills: candidate.skills,
                            experience: candidate.experience ?? null,
                            role: candidate.role,
                            jobTitle: job.title,
                            jobDescription: job.description ?? '',
                            jobSkills: job.skills ?? [],
                        },
                    });
                    if (analysis?.score) {
                        const s = analysis.strengths?.length ? `\n\nStrengths:\n• ${analysis.strengths.join('\n• ')}` : '';
                        const w = analysis.weaknesses?.length ? `\n\nAreas to Explore:\n• ${analysis.weaknesses.join('\n• ')}` : '';
                        const formatted = `${analysis.summary}${s}${w}`;
                        setCandidates(prev => prev.map(c =>
                            c.id === candidate.id ? { ...c, aiMatchScore: analysis.score, aiAnalysis: formatted } : c
                        ));
                        // Direct write — bypasses api.candidates.update's scopeCandidate/.single() which can fail silently
                        supabase.from('candidates').update({
                            ai_match_score: analysis.score,
                            ai_analysis: formatted,
                        }).eq('id', candidate.id).then(({ error }) => {
                            if (error) console.error('[bg-scorer] persist failed:', error.message);
                        });
                    }
                } catch {
                    // Retry allowed on next load
                    scoredIds.current.delete(candidate.id);
                }
            }
        };

        run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, candidates.length, candidates.filter(c => !!c.resumeSummary).length, jobs.length]);

    // Handle candidate ID and tab from URL
    useEffect(() => {
        const candidateId = searchParams.get('candidateId');
        if (candidateId && candidates.length > 0) {
            const candidate = candidates.find(c => c.id === candidateId);
            if (candidate) {
                const tab = searchParams.get('tab');
                const emailSubTab = searchParams.get('emailSubTab');
                setInitialTabFromUrl(tab || undefined);
                setInitialEmailSubTabFromUrl(emailSubTab || undefined);
                setSelectedCandidate(candidate);
                const next = new URLSearchParams(searchParams);
                next.delete('candidateId');
                next.delete('tab');
                next.delete('emailSubTab');
                setSearchParams(next, { replace: true });
            }
        }
    }, [candidates, searchParams, setSearchParams]);

    // Preselect job from ?job= when jobs are loaded; show sourcing toast when ?sourcing=started
    useEffect(() => {
        const jobId = searchParams.get('job');
        const sourcing = searchParams.get('sourcing');
        if (jobId && jobs.length > 0 && jobs.some(j => j.id === jobId)) {
            setSelectedJob(jobId);
        }
        if (sourcing === 'started') {
            toast.info('Job created! Candidate sourcing has started in the background — check back shortly.');
            const next = new URLSearchParams(searchParams);
            next.delete('sourcing');
            setSearchParams(next, { replace: true });
        }
    }, [jobs, searchParams, setSearchParams]);

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

    const selectedJobData = useMemo(
        () => (selectedJob === 'all' ? null : jobs.find(j => j.id === selectedJob) ?? null),
        [selectedJob, jobs]
    );

    // --- Filtering Logic ---
    // Base: job + search only — used for stage-tab counts and metrics so they
    // always reflect the current job/search context without the stage pill filter.
    const filteredByJobAndSearch = useMemo(() => {
        return candidates.filter(c => {
            const matchesJob = selectedJob === 'all' || c.jobId === selectedJob;
            const matchesSearch = !searchQuery || (
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            return matchesJob && matchesSearch;
        });
    }, [candidates, selectedJob, searchQuery]);

    // --- Metrics Calculation (reflects current job + search filter) ---
    const metrics = useMemo(() => {
        const total = filteredByJobAndSearch.length;
        const waitlist = filteredByJobAndSearch.filter(c => c.stage === CandidateStage.NEW).length;
        const scores = filteredByJobAndSearch.map(c => c.aiMatchScore || 0).filter(s => s > 0);
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        return { total, waitlist, avgScore };
    }, [filteredByJobAndSearch]);

    const filteredCandidates = useMemo(() => {
        if (selectedStageFilter === 'All') return filteredByJobAndSearch;
        return filteredByJobAndSearch.filter(c => {
            if (selectedStageFilter === 'Qualified')
                return [CandidateStage.INTERVIEW, CandidateStage.OFFER, CandidateStage.HIRED, CandidateStage.SCREENING].includes(c.stage);
            if (selectedStageFilter === 'Interview') return c.stage === CandidateStage.INTERVIEW;
            if (selectedStageFilter === 'Rejected')  return c.stage === CandidateStage.REJECTED;
            if (selectedStageFilter === 'Waitlist')  return c.stage === CandidateStage.NEW;
            if (selectedStageFilter === 'Offer')     return c.stage === CandidateStage.OFFER;
            if (selectedStageFilter === 'Hired')     return c.stage === CandidateStage.HIRED;
            if (selectedStageFilter === 'Screening') return c.stage === CandidateStage.SCREENING;
            return true;
        });
    }, [filteredByJobAndSearch, selectedStageFilter]);

    // --- List view sorted candidates ---
    const sortedCandidates = useMemo(() => {
        if (!sortField) return filteredCandidates;
        return [...filteredCandidates].sort((a, b) => {
            let va: string | number, vb: string | number;
            if (sortField === 'name') {
                va = a.name.toLowerCase(); vb = b.name.toLowerCase();
            } else if (sortField === 'score') {
                va = a.aiMatchScore ?? -1; vb = b.aiMatchScore ?? -1;
            } else {
                va = new Date(a.appliedDate).getTime(); vb = new Date(b.appliedDate).getTime();
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredCandidates, sortField, sortDir]);

    const handleSort = (field: 'name' | 'score' | 'date') => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const getCandidatesByStage = (stage: CandidateStage) =>
        filteredCandidates.filter(c => c.stage === stage);

    const handleCandidateUpdate = async (updatedCandidate: Candidate) => {
        const oldCandidate = candidates.find(c => c.id === updatedCandidate.id);
        const stageChanged = oldCandidate && oldCandidate.stage !== updatedCandidate.stage;

        setCandidates(prev => prev.map(c =>
            c.id === updatedCandidate.id ? updatedCandidate : c
        ));
        setSelectedCandidate(updatedCandidate);

        if (stageChanged && oldCandidate) {
            const { playNotificationSound } = await import('../utils/soundUtils');
            playNotificationSound();

            toast.success(`${updatedCandidate.name} moved to ${updatedCandidate.stage}`);

            api.settings.getSlackConnection().then((conn) => {
                if (conn?.botToken && conn?.channelId) {
                    const jobTitle = jobs.find(j => j.id === updatedCandidate.jobId)?.title;
                    sendSlackNotification(
                        conn.botToken,
                        conn.channelId,
                        `${updatedCandidate.name} moved to ${updatedCandidate.stage}`,
                        buildCandidateStagedBlocks(updatedCandidate.name, updatedCandidate.stage, jobTitle)
                    );
                }
            }).catch(() => {});
        }

        try {
            const updatedNotifications = await api.notifications.list();
            setNotifications(updatedNotifications);
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        }
    };

    const getValidNextStage = (currentStage: CandidateStage): CandidateStage | null => {
        switch (currentStage) {
            case CandidateStage.NEW: return CandidateStage.SCREENING;
            case CandidateStage.SCREENING: return CandidateStage.INTERVIEW;
            case CandidateStage.INTERVIEW: return CandidateStage.OFFER;
            case CandidateStage.OFFER: return CandidateStage.HIRED;
            case CandidateStage.HIRED: return null;
            case CandidateStage.REJECTED: return null;
            default: return null;
        }
    };

    const isValidStageTransition = (currentStage: CandidateStage, targetStage: CandidateStage): boolean => {
        if (targetStage === CandidateStage.REJECTED) {
            return currentStage !== CandidateStage.HIRED && currentStage !== CandidateStage.REJECTED;
        }
        if (currentStage === CandidateStage.HIRED || currentStage === CandidateStage.REJECTED) {
            return false;
        }
        if (targetStage === CandidateStage.NEW) {
            return false;
        }
        const validNextStage = getValidNextStage(currentStage);
        return validNextStage === targetStage;
    };

    const handleDropCandidate = async (candidateId: string, newStage: CandidateStage) => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return;
        if (candidate.stage === newStage) return;

        // Pool candidates must be assigned to a job before entering the pipeline
        if (poolJobId && candidate.jobId === poolJobId) {
            toast.error('Assign this candidate to a job before moving them through the pipeline.');
            return;
        }

        if (!isValidStageTransition(candidate.stage, newStage)) {
            let errorMessage = '';
            if (candidate.stage === CandidateStage.HIRED || candidate.stage === CandidateStage.REJECTED) {
                errorMessage = `Cannot move candidate from ${candidate.stage}. This is a terminal stage.`;
            } else if (newStage === CandidateStage.NEW) {
                errorMessage = `Cannot move candidate to "New" stage.`;
            } else {
                errorMessage = `Cannot move candidate from ${candidate.stage} to ${newStage}. Invalid stage transition.`;
            }
            toast.error(errorMessage);
            return;
        }

        setPendingMove({
            candidateId,
            candidateName: candidate.name,
            fromStage: candidate.stage,
            toStage: newStage,
        });
    };

    const confirmMoveCandidate = async () => {
        if (!pendingMove) return;
        setIsMoving(true);
        try {
            const updatedCandidate = await api.candidates.update(pendingMove.candidateId, {
                stage: pendingMove.toStage
            });
            await handleCandidateUpdate(updatedCandidate);

            // Warn if moving to Interview with no enabled Interview workflow
            if (pendingMove.toStage === CandidateStage.INTERVIEW) {
                api.workflows.list().then(workflows => {
                    const hasInterviewWorkflow = workflows.some(
                        (w: any) => w.triggerStage === CandidateStage.INTERVIEW && w.enabled
                    );
                    if (!hasInterviewWorkflow) {
                        toast.info('No Interview workflow is set up — add one in Settings → Email Workflows so candidates get an email when they reach this stage.');
                    }
                }).catch(() => {});
            }

            setPendingMove(null);
        } catch (error: any) {
            toast.error(toUserError(error, 'Failed to move candidate. Please try again.'));
        } finally {
            setIsMoving(false);
        }
    };

    const handleSendAndMove = async () => {
        if (!pendingMove || !screeningDraft) return;
        const candidate = candidates.find(c => c.id === pendingMove.candidateId);
        setIsMoving(true);
        try {
            if (candidate?.email && screeningDraft.subject && screeningDraft.body) {
                await (api as any).supabaseClient?.functions.invoke('send-email', {
                    body: {
                        to: candidate.email,
                        subject: screeningDraft.subject,
                        content: screeningDraft.body,
                        fromName: 'Recruiter',
                        candidateId: pendingMove.candidateId,
                        emailType: 'Screening',
                    }
                }).catch(() => {});
            }
            const updatedCandidate = await api.candidates.update(pendingMove.candidateId, { stage: pendingMove.toStage });
            await handleCandidateUpdate(updatedCandidate);
            setPendingMove(null);
            toast.success('Candidate moved to Screening and email sent.');
        } catch (error: any) {
            toast.error(toUserError(error, 'Failed to move candidate. Please try again.'));
        } finally {
            setIsMoving(false);
        }
    };

    // --- Filter Pill Counts (scoped to current job + search) ---
    const counts = useMemo(() => ({
        All:       filteredByJobAndSearch.length,
        Waitlist:  filteredByJobAndSearch.filter(c => c.stage === CandidateStage.NEW).length,
        Interview: filteredByJobAndSearch.filter(c => c.stage === CandidateStage.INTERVIEW).length,
        Rejected:  filteredByJobAndSearch.filter(c => c.stage === CandidateStage.REJECTED).length,
        Screening: filteredByJobAndSearch.filter(c => c.stage === CandidateStage.SCREENING).length,
        Offer:     filteredByJobAndSearch.filter(c => c.stage === CandidateStage.OFFER).length,
        Hired:     filteredByJobAndSearch.filter(c => c.stage === CandidateStage.HIRED).length,
        Qualified: filteredByJobAndSearch.filter(c =>
            [CandidateStage.INTERVIEW, CandidateStage.OFFER, CandidateStage.HIRED, CandidateStage.SCREENING].includes(c.stage)
        ).length,
    }), [filteredByJobAndSearch]);

    if (loading) {
        return <CandidateBoardSkeleton />;
    }

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <div className="flex flex-col bg-white min-h-full" style={{ height: '100%' }}>

            {/* Page Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Candidates</h1>
                <div className="flex items-center gap-2">
                    {/* Notification bell */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <Bell size={16} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
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

                    {/* View toggle */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('kanban')}
                            title="Kanban view"
                            className={`w-8 h-8 flex items-center justify-center transition-colors border-r border-gray-200 ${
                                viewMode === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            title="List view"
                            className={`w-8 h-8 flex items-center justify-center transition-colors ${
                                viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <List size={15} />
                        </button>
                    </div>

                    {!isViewer && (
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Upload size={14} />}
                            onClick={() => setShowBulkUpload(true)}
                        >
                            Import CVs
                        </Button>
                    )}
                    {!isViewer && (
                        <div className="relative" ref={importHistoryRef}>
                            <button
                                title="Import history"
                                onClick={() => setShowImportHistory(v => !v)}
                                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors bg-white ${
                                    importHistory.some(r => r.status === 'processing')
                                        ? 'border-amber-300 text-amber-500'
                                        : importHistory.some(r => r.status === 'interrupted')
                                        ? 'border-orange-300 text-orange-500'
                                        : showImportHistory
                                        ? 'border-gray-300 text-gray-900'
                                        : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {importHistory.some(r => r.status === 'processing')
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <History size={15} />
                                }
                            </button>
                            {showImportHistory && importHistoryRef.current && createPortal(
                                (() => {
                                    const rect = importHistoryRef.current!.getBoundingClientRect();
                                    return (
                                        <div
                                            ref={importHistoryPortalRef}
                                            style={{
                                                position: 'fixed',
                                                top: rect.bottom + 8,
                                                right: window.innerWidth - rect.right,
                                                zIndex: 9999,
                                                width: 288,
                                            }}
                                            className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-800">Import history</span>
                                                {importHistory.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setImportHistory([]);
                                                            try { localStorage.removeItem(IMPORT_HISTORY_KEY); } catch {}
                                                        }}
                                                        className="text-[10px] text-gray-400 hover:text-gray-600"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                            </div>
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <button
                                                    disabled={fixingEmails}
                                                    onClick={async () => {
                                                        setFixingEmails(true);
                                                        try {
                                                            const { fixed } = await api.candidates.fixMissingEmails();
                                                            if (fixed > 0) {
                                                                toast.success(`Fixed ${fixed} candidate${fixed !== 1 ? 's' : ''} — email addresses recovered.`);
                                                                api.candidates.list({ page: 1, pageSize: 1000 }).then(r => setCandidates(r.data || [])).catch(() => {});
                                                            } else {
                                                                toast.info('No missing emails could be recovered from CV text.');
                                                            }
                                                        } catch {
                                                            toast.error('Failed to fix missing emails.');
                                                        } finally {
                                                            setFixingEmails(false);
                                                        }
                                                    }}
                                                    className="w-full text-left text-[11px] text-gray-500 hover:text-gray-800 py-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                >
                                                    {fixingEmails
                                                        ? <><Loader2 size={11} className="animate-spin" /> Fixing…</>
                                                        : <><Mail size={11} /> Fix missing emails</>
                                                    }
                                                </button>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {importHistory.length === 0 ? (
                                                    <p className="px-4 py-6 text-xs text-gray-400 text-center">No import history yet</p>
                                                ) : (
                                                    importHistory.map(record => (
                                                        <div key={record.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <span className="text-xs font-medium text-gray-800 truncate">{record.jobName}</span>
                                                                {record.status === 'processing' && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        <Loader2 size={9} className="animate-spin" /> Processing
                                                                    </span>
                                                                )}
                                                                {record.status === 'interrupted' && (
                                                                    <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        Interrupted
                                                                    </span>
                                                                )}
                                                                {record.status === 'cancelled' && (
                                                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        Cancelled
                                                                    </span>
                                                                )}
                                                                {record.status === 'success' && (
                                                                    <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        Success
                                                                    </span>
                                                                )}
                                                                {record.status === 'partial' && (
                                                                    <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        Partial
                                                                    </span>
                                                                )}
                                                                {record.status === 'failed' && (
                                                                    <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                                        Failed
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-gray-400">
                                                                {record.status === 'processing'
                                                                    ? `${record.total} file${record.total !== 1 ? 's' : ''} importing…`
                                                                    : record.status === 'interrupted'
                                                                    ? `Interrupted after ${record.succeeded} imported · ${record.total} total`
                                                                    : record.status === 'cancelled'
                                                                    ? `Cancelled · ${record.succeeded} imported before stopping`
                                                                    : `${record.succeeded} imported${record.failed > 0 ? ` · ${record.failed} failed` : ''} · ${record.total} total`}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <p className="text-[10px] text-gray-300">
                                                                    {new Date(record.startedAt).toLocaleString()}
                                                                </p>
                                                                {record.status === 'interrupted' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setBulkUploadDefaultJobId(record.jobId);
                                                                            setShowBulkUpload(true);
                                                                            setShowImportHistory(false);
                                                                        }}
                                                                        className="text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                                                                    >
                                                                        Continue
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })(),
                                document.body
                            )}
                        </div>
                    )}
                    {!isViewer && (
                        <button
                            title="Trash"
                            onClick={openTrash}
                            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors bg-white"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                    <Button
                        variant="black"
                        size="sm"
                        icon={<Download size={14} />}
                        onClick={async () => {
                            try {
                                const exportCheck = await api.plan.canExportCandidates(filteredCandidates.length);
                                if (!exportCheck.allowed) {
                                    toast.error(exportCheck.message || `Your plan allows up to ${exportCheck.maxAllowed} candidates per export.`);
                                    return;
                                }
                                const csvContent = [
                                    ['Name', 'Email', 'Role', 'Stage', 'AI Match Score', 'Skills', 'Location', 'Experience'].join(','),
                                    ...filteredCandidates.map(c => [
                                        `"${c.name}"`, `"${c.email || ''}"`, `"${c.role || ''}"`, `"${c.stage}"`,
                                        c.aiMatchScore || '', `"${(c.skills || []).join('; ')}"`, `"${c.location || ''}"`, c.experience || ''
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
                                URL.revokeObjectURL(url);
                            } catch {
                                toast.error('Failed to export candidates. Please try again.');
                            }
                        }}
                    >
                        Export
                    </Button>
                </div>
            </div>

            {/* Compact Stats Chips */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-xs font-semibold text-gray-900">{metrics.total}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Waitlist</span>
                    <span className="text-xs font-semibold text-gray-900">{metrics.waitlist}</span>
                </div>
                {metrics.avgScore > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                        <Sparkles size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">Avg match</span>
                        <span className="text-xs font-semibold text-gray-900">{metrics.avgScore}%</span>
                    </div>
                )}
            </div>

            {/* Filter Row: stage tabs + search + job select */}
            <div className="px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
                <div className="flex items-end gap-0">
                    {(['All', 'Waitlist', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const).map((stage) => (
                        <button
                            key={stage}
                            onClick={() => setSelectedStageFilter(stage)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                                selectedStageFilter === stage
                                    ? 'border-gray-900 text-gray-900'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            {stage}
                            <span className="min-w-[18px] text-center text-[10px] font-medium bg-gray-100 text-gray-500 px-1 py-0.5 rounded-full tabular-nums">
                                {counts[stage]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-52"
                        />
                    </div>
                    <div className="w-44">
                        <CustomSelect
                            inputStyle
                            value={selectedJob}
                            onChange={setSelectedJob}
                            className="py-1.5 text-sm"
                            options={[
                                { value: 'all', label: 'All jobs' },
                                ...jobs.filter(j => j.title !== '__candidate_pool__').map(j => ({ value: j.id, label: j.title }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Kanban Board — always mounted so boardRef stays attached for wheel listener */}
            <div
                ref={boardRef}
                onDragOver={handleBoardDragOver}
                className="flex-1 bg-gray-50/50 px-6 pt-5"
                style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    display: viewMode === 'kanban' ? 'flex' : 'none',
                    flexDirection: 'column',
                    minHeight: 0,
                    height: '100%',
                }}
            >
                <div className="flex gap-4 w-max snap-x snap-mandatory pb-6" style={{ height: '100%' }}>
                    <PipelineColumn title="Waitlist" stage={CandidateStage.NEW} candidates={getCandidatesByStage(CandidateStage.NEW)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onRejectCandidate={isViewer ? undefined : (id) => {
                            const c = candidates.find(x => x.id === id);
                            if (c) setPendingAction({ type: 'reject', candidateId: id, candidateName: c.name });
                        }}
                        onDeleteCandidate={isViewer ? undefined : (id) => {
                            const c = candidates.find(x => x.id === id);
                            if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name });
                        }}
                        fixingEmails={fixingEmails}
                    />
                    <PipelineColumn title="Screening" stage={CandidateStage.SCREENING} candidates={getCandidatesByStage(CandidateStage.SCREENING)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onDeleteCandidate={isViewer ? undefined : (id) => { const c = candidates.find(x => x.id === id); if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name }); }} fixingEmails={fixingEmails} />
                    <PipelineColumn title="Interview" stage={CandidateStage.INTERVIEW} candidates={getCandidatesByStage(CandidateStage.INTERVIEW)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onDeleteCandidate={isViewer ? undefined : (id) => { const c = candidates.find(x => x.id === id); if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name }); }} fixingEmails={fixingEmails} />
                    <PipelineColumn title="Offer" stage={CandidateStage.OFFER} candidates={getCandidatesByStage(CandidateStage.OFFER)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onDeleteCandidate={isViewer ? undefined : (id) => { const c = candidates.find(x => x.id === id); if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name }); }} fixingEmails={fixingEmails} />
                    <PipelineColumn title="Hired" stage={CandidateStage.HIRED} candidates={getCandidatesByStage(CandidateStage.HIRED)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onDeleteCandidate={isViewer ? undefined : (id) => { const c = candidates.find(x => x.id === id); if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name }); }} fixingEmails={fixingEmails} />
                    <PipelineColumn title="Rejected" stage={CandidateStage.REJECTED} candidates={getCandidatesByStage(CandidateStage.REJECTED)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} poolJobId={poolJobId ?? undefined}
                        onDeleteCandidate={isViewer ? undefined : (id) => { const c = candidates.find(x => x.id === id); if (c) setPendingAction({ type: 'delete', candidateId: id, candidateName: c.name }); }} fixingEmails={fixingEmails} />
                </div>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
                <CandidateListView
                    candidates={sortedCandidates}
                    onSelectCandidate={setSelectedCandidate}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    poolJobId={poolJobId}
                />
            )}

            {selectedCandidate && (
                <CandidateModal
                    candidate={selectedCandidate}
                    isOpen={!!selectedCandidate}
                    onClose={() => {
                        setSelectedCandidate(null);
                        setInitialTabFromUrl(undefined);
                        setInitialEmailSubTabFromUrl(undefined);
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.delete('candidateId');
                        setSearchParams(newSearchParams, { replace: true });
                    }}
                    onUpdate={handleCandidateUpdate}
                    initialActiveTab={initialTabFromUrl as 'overview' | 'portfolio' | 'email' | 'notes' | 'feedback' | 'offers' | undefined}
                    initialEmailSubTab={initialEmailSubTabFromUrl as 'compose' | 'history' | undefined}
                />
            )}

            {/* Move candidate confirmation */}
            {pendingMove && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Move candidate?</h3>

                        {/* Stage transition visualization */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 text-[12px] text-gray-600 font-medium">
                                <div className={`w-2 h-2 rounded-full ${STAGE_META[pendingMove.fromStage].dot}`} />
                                {STAGE_META[pendingMove.fromStage].label}
                            </span>
                            <span className="text-gray-400 text-xs">→</span>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 text-[12px] text-gray-600 font-medium">
                                <div className={`w-2 h-2 rounded-full ${STAGE_META[pendingMove.toStage].dot}`} />
                                {STAGE_META[pendingMove.toStage].label}
                            </span>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Are you sure you want to move <span className="font-medium text-gray-700">{pendingMove.candidateName}</span>?
                        </p>

                        {/* Screening email draft (Waitlist → Screening) */}
                        {screeningDraft && (
                            <div className="mb-4 pt-4 border-t border-gray-100">
                                {screeningDraft.loading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        Loading email draft…
                                    </div>
                                ) : screeningDraft.hasEmail ? (
                                    <>
                                        <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                            <Mail size={12} className="text-gray-400" />
                                            Send screening email
                                        </p>
                                        <input
                                            value={screeningDraft.subject}
                                            onChange={e => setScreeningDraft(prev => prev ? { ...prev, subject: e.target.value } : null)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-gray-400"
                                            placeholder="Subject"
                                        />
                                        <textarea
                                            value={screeningDraft.body}
                                            onChange={e => setScreeningDraft(prev => prev ? { ...prev, body: e.target.value } : null)}
                                            rows={4}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-gray-400"
                                            placeholder="Email body"
                                        />
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic py-1">No email address on file — email will be skipped.</p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setPendingMove(null)} disabled={isMoving}>Cancel</Button>
                            {screeningDraft && !screeningDraft.loading && screeningDraft.hasEmail && (
                                <Button variant="outline" onClick={confirmMoveCandidate} disabled={isMoving}>
                                    Skip email
                                </Button>
                            )}
                            <Button
                                variant="black"
                                onClick={screeningDraft && !screeningDraft.loading && screeningDraft.hasEmail
                                    ? handleSendAndMove
                                    : confirmMoveCandidate
                                }
                                disabled={isMoving || (screeningDraft?.loading ?? false)}
                            >
                                {isMoving ? 'Moving…' : screeningDraft && !screeningDraft.loading && screeningDraft.hasEmail ? 'Send & move' : 'Yes, move'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Reject / Delete confirmation dialog */}
            {pendingAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            {pendingAction.type === 'reject' ? 'Reject candidate?' : 'Delete candidate?'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            {pendingAction.type === 'reject'
                                ? <>Are you sure you want to reject <span className="font-medium text-gray-700">{pendingAction.candidateName}</span>? They will be moved to the Rejected column.</>
                                : <>Move <span className="font-medium text-gray-700">{pendingAction.candidateName}</span> to trash? You can restore them later.</>}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setPendingAction(null)}
                                disabled={pendingActionLoading}
                                className="px-4 h-8 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={pendingActionLoading}
                                onClick={async () => {
                                    setPendingActionLoading(true);
                                    try {
                                        if (pendingAction.type === 'reject') {
                                            await api.candidates.reject(pendingAction.candidateId);
                                            setCandidates(prev => prev.map(c => c.id === pendingAction.candidateId ? { ...c, stage: CandidateStage.REJECTED } : c));
                                        } else {
                                            await api.candidates.deleteCandidate(pendingAction.candidateId);
                                            setCandidates(prev => prev.filter(c => c.id !== pendingAction.candidateId));
                                        }
                                        setPendingAction(null);
                                    } catch (err: any) {
                                        toast.error(toUserError(err, `Failed to ${pendingAction.type} candidate`));
                                        setPendingAction(null);
                                    } finally {
                                        setPendingActionLoading(false);
                                    }
                                }}
                                className={`px-4 h-8 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                                    pendingAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                                }`}
                            >
                                {pendingActionLoading ? 'Please wait…' : pendingAction.type === 'reject' ? 'Yes, reject' : 'Move to trash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkUpload && (
                <BulkCVUpload
                    jobs={jobs}
                    defaultJobId={bulkUploadDefaultJobId ?? (selectedJob !== 'all' ? selectedJob : undefined)}
                    onSessionUpdate={handleSessionUpdate}
                    onClose={async (count, _importedJobId) => {
                        setShowBulkUpload(false);
                        setBulkUploadDefaultJobId(undefined);
                        if (count > 0) {
                            try {
                                const result = await api.candidates.list({ page: 1, pageSize: 1000 });
                                setCandidates(result.data || []);
                            } catch { /* keep existing data */ }
                            // Always show all candidates so imported ones are immediately visible
                            setSelectedJob('all');
                            toast.success(`${count} CV${count !== 1 ? 's' : ''} imported successfully`);
                        }
                    }}
                />
            )}

            {/* Trash panel */}
            {trashOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Trash2 size={15} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">Trash</h3>
                                {trashedCandidates.length > 0 && (
                                    <span className="text-xs text-gray-400">({trashedCandidates.length})</span>
                                )}
                            </div>
                            <button onClick={() => setTrashOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 custom-scrollbar">
                            {trashLoading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 size={20} className="animate-spin text-gray-300" />
                                </div>
                            ) : trashedCandidates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                                    <Trash2 size={28} className="text-gray-200" />
                                    <p className="text-sm text-gray-400">Trash is empty</p>
                                </div>
                            ) : trashedCandidates.map(c => (
                                <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={c.name} size={32} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STAGE_META[c.stage]?.badge || 'bg-gray-100 text-gray-500'}`}>
                                                    {STAGE_META[c.stage]?.label || c.stage}
                                                </span>
                                                {c.role && <span className="text-xs text-gray-400 truncate">{c.role}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        title="Restore"
                                        disabled={restoringId === c.id}
                                        onClick={() => handleRestore(c.id)}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                    >
                                        {restoringId === c.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                                        Restore
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CandidateBoard;
