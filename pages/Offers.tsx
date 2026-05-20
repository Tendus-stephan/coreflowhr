import React, { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer } from '../types';
import { api } from '../services/api';
import { OffersSkeleton } from '../components/ui/Skeleton';
import { OfferModal } from '../components/OfferModal';
import { NegotiateCounterOfferModal } from '../components/NegotiateCounterOfferModal';
import { Button } from '../components/ui/Button';
import { Plus, Search, ChevronLeft, ChevronRight, X, MoreHorizontal, Download } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toUserError } from '../utils/edgeFunctionError';
import { format } from 'date-fns';
import { CoachMarkIfUnseen } from '../components/CoachMark';
import { loadSeenMarks } from '../utils/coachMarks';

const NON_EXPIRABLE_STATUSES: Array<Offer['status']> = ['draft', 'pending_approval', 'accepted', 'declined', 'signed'];
const isOfferExpired = (offer: Offer): boolean =>
    !NON_EXPIRABLE_STATUSES.includes(offer.status) &&
    !!offer.expiresAt &&
    new Date(offer.expiresAt) < new Date();

interface JobMeta { title: string; company?: string; department?: string }

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    draft:              'bg-gray-100 text-gray-600',
    pending_approval:   'bg-amber-100 text-amber-700',
    awaiting_response:  'bg-blue-50 text-blue-700',
    awaiting_signature: 'bg-indigo-50 text-indigo-700',
    sent:               'bg-blue-50 text-blue-700',
    viewed:             'bg-blue-50 text-blue-600',
    negotiating:        'bg-orange-50 text-orange-700',
    accepted:           'bg-green-50 text-green-700',
    declined:           'bg-red-50 text-red-700',
    signed:             'bg-green-50 text-green-700',
    expired:            'bg-gray-100 text-gray-500',
    archived:           'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
    draft:              'Draft',
    pending_approval:   'Awaiting approval',
    awaiting_response:  'Awaiting response',
    awaiting_signature: 'Awaiting signature',
    sent:               'Sent',
    viewed:             'Viewed',
    negotiating:        'Negotiating',
    accepted:           'Accepted',
    declined:           'Declined',
    signed:             'Signed',
    expired:            'Expired',
    archived:           'Archived',
};

function StatusBadge({ offer, expired }: { offer: Offer; expired: boolean }) {
    const key = expired ? 'expired' : offer.archived ? 'archived' : offer.status;
    const label =
        !expired && offer.status === 'pending_approval' && offer.approvalStatus === 'approved'
            ? 'Approved — send pending'
            : STATUS_LABELS[key] ?? key;
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block text-[11px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[key] ?? 'bg-gray-100 text-gray-600'}`}>
                {label}
            </span>
            {offer.requiresApproval && offer.status === 'draft' && (
                <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 cursor-default"
                    title="Requires approval before sending"
                />
            )}
        </span>
    );
}

// ── Three-dot row menu ────────────────────────────────────────────────────────
interface RowMenuProps {
    offer: Offer;
    expired: boolean;
    onView: () => void;
    onSend?: () => void;
    onArchive: () => void;
    onUnarchive: () => void;
    onDownload?: () => void;
    onAcceptCounter?: () => void;
    onDeclineCounter?: () => void;
    onNegotiateCounter?: () => void;
}
function RowMenu({ offer, expired, onView, onSend, onArchive, onUnarchive, onDownload, onAcceptCounter, onDeclineCounter, onNegotiateCounter }: RowMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const item = (label: string, onClick: () => void, danger = false) => (
        <button
            key={label}
            onClick={() => { setOpen(false); onClick(); }}
            className={`w-full text-left px-3 py-1.5 text-[13px] rounded hover:bg-gray-50 transition-colors ${danger ? 'text-red-600' : 'text-gray-700'}`}
        >
            {label}
        </button>
    );

    const hasCounter = offer.negotiationHistory?.some((x: any) => x.type === 'counter_offer');

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                aria-label="More actions"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
                <MoreHorizontal size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 flex flex-col">
                    {item('View / Edit', onView)}
                    {onSend && item('Send offer', onSend)}
                    {offer.status === 'signed' && onDownload && item('Download signed', onDownload)}
                    {hasCounter && onAcceptCounter && item('Accept counter offer', onAcceptCounter)}
                    {hasCounter && onNegotiateCounter && item('Negotiate counter', onNegotiateCounter)}
                    {hasCounter && onDeclineCounter && item('Decline counter', onDeclineCounter, true)}
                    {!offer.archived
                        ? item('Archive', onArchive)
                        : item('Restore', onUnarchive)
                    }
                </div>
            )}
        </div>
    );
}

// ── Offer list row ────────────────────────────────────────────────────────────
function formatSalary(offer: Offer) {
    if (!offer.salaryAmount) return '—';
    const sym = offer.salaryCurrency === 'USD' ? '$' : offer.salaryCurrency === 'EUR' ? '€' : offer.salaryCurrency === 'GBP' ? '£' : offer.salaryCurrency;
    const period = offer.salaryPeriod === 'yearly' ? '/yr' : offer.salaryPeriod === 'monthly' ? '/mo' : '/hr';
    return `${sym}${Math.round(offer.salaryAmount).toLocaleString()}${period}`;
}

// ── Urgency-aware expiry cell ─────────────────────────────────────────────────
function ExpiryCell({ expiresAt }: { expiresAt?: string }) {
    if (!expiresAt) return <span className="text-[13px] text-gray-400">—</span>;
    const diffDays = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
    const label = format(new Date(expiresAt), 'MMM d, yyyy');
    if (diffDays <= 2) return (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {label}
        </span>
    );
    if (diffDays <= 7) return (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            {label}
        </span>
    );
    return <span className="text-[13px] text-gray-500">{label}</span>;
}

// ── Pagination helper ─────────────────────────────────────────────────────────
// Returns page numbers with `null` where an ellipsis should appear.
// Always shows first, last, current ± 1. Gaps of 1 are filled rather than dotted.
function getPageNumbers(current: number, total: number): (number | null)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const show = new Set(
        [1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total)
    );
    const sorted = [...show].sort((a, b) => a - b);
    const result: (number | null)[] = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null); // ellipsis
        result.push(sorted[i]);
    }
    return result;
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 20;

const Offers: React.FC = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'live' | 'closed' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
    const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
    const [candidateMap, setCandidateMap] = useState<Map<string, string>>(new Map());
    const [jobMap, setJobMap] = useState<Map<string, JobMeta>>(new Map());
    const [userRole, setUserRole] = useState<string>('');
    const [sendingOfferId, setSendingOfferId] = useState<string | null>(null);
    const [archivingOfferId, setArchivingOfferId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const toast = useToast();
    const confirm = useConfirm();
    const tabBarRef = useRef<HTMLDivElement>(null);
    const createOfferBtnRef = useRef<HTMLSpanElement>(null);
    const [coachMarksReady, setCoachMarksReady] = useState(false);
    useEffect(() => {
        loadSeenMarks().then(() => setCoachMarksReady(true)).catch(() => setCoachMarksReady(true));
    }, []);

    useEffect(() => { loadOffers(); }, []);
    useEffect(() => {
        api.auth.me().then((me) => {
            const role = me?.role ?? '';
            setUserRole(role);
            if (role === 'HiringManager') navigate('/dashboard', { replace: true });
        }).catch(() => {});
    }, []);

    useEffect(() => {
        let filtered = offers;
        if (statusFilter === 'archived') {
            filtered = filtered.filter(o => o.archived);
        } else if (statusFilter === 'all') {
            filtered = filtered.filter(o => !o.archived);
        } else if (statusFilter === 'draft') {
            filtered = filtered.filter(o => !o.archived && ['draft', 'pending_approval'].includes(o.status));
        } else if (statusFilter === 'live') {
            filtered = filtered.filter(o => !o.archived && !isOfferExpired(o) && ['sent', 'viewed', 'awaiting_response', 'awaiting_signature', 'negotiating'].includes(o.status));
        } else if (statusFilter === 'closed') {
            filtered = filtered.filter(o => !o.archived && (['accepted', 'signed', 'declined', 'expired'].includes(o.status) || isOfferExpired(o)));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(o => {
                const cname = o.candidateId ? candidateMap.get(o.candidateId)?.toLowerCase() ?? '' : 'general offer';
                const jmeta = jobMap.get(o.jobId);
                const jtitle = jmeta?.title?.toLowerCase() ?? '';
                const ref = (o.referenceNumber ?? '').toLowerCase();
                return o.positionTitle.toLowerCase().includes(q) || cname.includes(q) || jtitle.includes(q) || ref.includes(q);
            });
        }
        setFilteredOffers(filtered);
        setCurrentPage(1);
    }, [offers, statusFilter, searchQuery, candidateMap, jobMap]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.offers.list({ includeArchived: true });
            setOffers(data);

            const candidatesResult = await api.candidates.list();
            const candidates = Array.isArray(candidatesResult) ? candidatesResult : (candidatesResult?.data || []);
            if (Array.isArray(candidates)) {
                setCandidateMap(new Map(candidates.map((c: any): [string, string] => [String(c.id), String(c.name ?? '')])));
            }

            const jobsResult = await api.jobs.list();
            const jobs = Array.isArray(jobsResult) ? jobsResult : (jobsResult?.data || []);
            if (Array.isArray(jobs)) {
                setJobMap(new Map(jobs.map((j: any): [string, JobMeta] => [
                    String(j.id),
                    { title: String(j.title ?? ''), company: j.company ?? undefined, department: j.department ?? undefined }
                ])));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = useCallback((offer: Offer) => { setEditingOffer(offer); setIsModalOpen(true); }, []);

    const handleSend = async (offer: Offer) => {
        if (sendingOfferId) return;
        if (!offer.candidateId) { toast.error('Cannot send a general offer. Please link it to a candidate first.'); return; }
        if (offer.requiresApproval && offer.approvalStatus !== 'approved') { setEditingOffer(offer); setIsModalOpen(true); return; }
        const ok = await confirm({ title: 'Send this offer?', description: 'This will email the offer to the candidate. Once sent it cannot be unsent.', confirmLabel: 'Send offer' });
        if (!ok) return;
        try {
            setSendingOfferId(offer.id);
            await api.offers.send(offer.id);
            const { playNotificationSound } = await import('../utils/soundUtils');
            playNotificationSound();
            await loadOffers();
        } catch (err: any) {
            toast.error(toUserError(err, 'Failed to send offer. Please try again.'));
        } finally {
            setSendingOfferId(null);
        }
    };

    const handleArchive = async (offer: Offer) => {
        if (archivingOfferId) return;
        const ok = await confirm({ title: 'Archive this offer?', description: 'It will be hidden from the main list but kept for history.', confirmLabel: 'Archive' });
        if (!ok) return;
        try {
            setArchivingOfferId(offer.id);
            await api.offers.update(offer.id, { archived: true });
            setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, archived: true } : o));
        } catch (err: any) { toast.error(err.message || 'Failed to archive offer'); }
        finally { setArchivingOfferId(null); }
    };

    const handleUnarchive = async (offer: Offer) => {
        if (archivingOfferId) return;
        try {
            setArchivingOfferId(offer.id);
            await api.offers.update(offer.id, { archived: false });
            setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, archived: false } : o));
        } catch (err: any) { toast.error(err.message || 'Failed to restore offer'); }
        finally { setArchivingOfferId(null); }
    };

    const handleAcceptCounterOffer = async (offer: Offer) => {
        const ok = await confirm({ title: 'Accept counter offer terms?', description: 'This will update the offer and notify the candidate.', confirmLabel: 'Accept' });
        if (!ok) return;
        try { await api.offers.acceptCounterOffer(offer.id); toast.success('Counter offer accepted!'); await loadOffers(); }
        catch (err: any) { toast.error(err.message || 'Failed to accept counter offer'); }
    };

    const handleDeclineCounterOffer = async (offer: Offer) => {
        const ok = await confirm({ title: 'Decline counter offer?', description: 'The original offer terms will remain.', confirmLabel: 'Decline', variant: 'destructive' });
        if (!ok) return;
        try { await api.offers.declineCounterOffer(offer.id); toast.info('Counter offer declined.'); await loadOffers(); }
        catch (err: any) { toast.error(err.message || 'Failed to decline counter offer'); }
    };

    const handleNegotiateCounterOffer = (offer: Offer) => { setNegotiatingOffer(offer); setIsNegotiateModalOpen(true); };

    const handleDownloadSigned = async (offer: Offer) => {
        try {
            const url = await api.offers.getSignedPdfUrl(offer.id);
            if (url) window.open(url, '_blank');
            else toast.error('Signed document is not available.');
        } catch (err: any) { toast.error(err.message || 'Failed to load signed document'); }
    };

    const statusTabs: Array<{ value: 'all' | 'draft' | 'live' | 'closed' | 'archived'; label: string }> = [
        { value: 'all',      label: 'All' },
        { value: 'draft',    label: 'Draft' },
        { value: 'live',     label: 'Live' },
        { value: 'closed',   label: 'Closed' },
        { value: 'archived', label: 'Archived' },
    ];

    const tabCounts: Record<string, number> = {
        all:      offers.filter(o => !o.archived).length,
        draft:    offers.filter(o => !o.archived && ['draft', 'pending_approval'].includes(o.status)).length,
        live:     offers.filter(o => !o.archived && !isOfferExpired(o) && ['sent', 'viewed', 'awaiting_response', 'awaiting_signature', 'negotiating'].includes(o.status)).length,
        closed:   offers.filter(o => !o.archived && (['accepted', 'signed', 'declined', 'expired'].includes(o.status) || isOfferExpired(o))).length,
        archived: offers.filter(o => o.archived).length,
    };

    const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);
    const paginated = filteredOffers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    if (loading) return <OffersSkeleton />;

    return (
        <div className="flex flex-col h-full bg-gray-50">

            {/* ── Page header ── */}
            <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white flex items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Offers</h1>
                    <p className="mt-1.5 text-sm text-gray-400 font-normal">Manage and track job offers sent to candidates.</p>
                </div>
                {/* Search + Create in same row */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search offers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 pr-7 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors w-52"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <span ref={createOfferBtnRef} className="inline-flex">
                        <Button size="sm" icon={<Plus size={15} />} onClick={() => { setEditingOffer(null); setIsModalOpen(true); }}>
                            Create Offer
                        </Button>
                    </span>
                </div>
            </div>

            {/* ── Tab bar (scrollable, no wrap) ── */}
            <div className="bg-white border-b border-gray-100 flex-shrink-0">
                <div
                    ref={tabBarRef}
                    className="px-8 flex items-center gap-0 -mb-px"
                    style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
                >
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                            className={`flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                statusFilter === tab.value
                                    ? 'border-gray-900 text-gray-900'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                            {tabCounts[tab.value] > 0 && (
                                <span className={`ml-1.5 text-[11px] font-semibold tabular-nums ${statusFilter === tab.value ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {tabCounts[tab.value]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-5">{error}</div>
                )}

                {filteredOffers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                            <Plus size={22} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                            {offers.length === 0 ? 'No offers yet' : 'No offers match your filters'}
                        </p>
                        <p className="text-xs text-gray-400 mb-5 max-w-xs">
                            {offers.length === 0 ? 'Create your first job offer to get started' : 'Try adjusting your search or filter criteria'}
                        </p>
                        {offers.length === 0 && (
                            <Button size="sm" icon={<Plus size={15} />} onClick={() => { setEditingOffer(null); setIsModalOpen(true); }}>
                                Create Your First Offer
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* List table */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_auto_140px_110px_36px] gap-x-4 items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Offer</span>
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Salary</span>
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Expires</span>
                                <span />
                            </div>

                            {paginated.map((offer, idx) => {
                                const expired = isOfferExpired(offer);
                                const candidateName = offer.candidateId ? candidateMap.get(offer.candidateId) ?? '—' : 'General Offer';
                                const jmeta = jobMap.get(offer.jobId);
                                const clientDept = [jmeta?.company, jmeta?.department].filter(Boolean).join(' · ');
                                const canSend = !expired && (
                                    (offer.status === 'draft' && !offer.requiresApproval) ||
                                    (offer.status === 'pending_approval' && offer.approvalStatus === 'approved')
                                );

                                return (
                                    <div
                                        key={offer.id}
                                        className={`grid grid-cols-[1fr_auto_140px_110px_36px] gap-x-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${idx < paginated.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        onClick={() => handleEdit(offer)}
                                    >
                                        {/* Offer info */}
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-semibold text-gray-900 truncate">{offer.positionTitle}</p>
                                            <p className="text-[13px] text-gray-500 truncate">{candidateName}</p>
                                            {clientDept && <p className="text-[12px] text-gray-400 truncate">{clientDept}</p>}
                                            {offer.referenceNumber && <p className="text-[12px] text-gray-400">{offer.referenceNumber}</p>}
                                        </div>

                                        {/* Status */}
                                        <div onClick={e => e.stopPropagation()}>
                                            <StatusBadge offer={offer} expired={expired} />
                                        </div>

                                        {/* Salary */}
                                        <p className="text-[13px] text-gray-700 tabular-nums">
                                            {userRole === 'HiringManager' ? '—' : formatSalary(offer)}
                                        </p>

                                        {/* Expiry */}
                                        <div><ExpiryCell expiresAt={offer.expiresAt} /></div>

                                        {/* Actions */}
                                        <div onClick={e => e.stopPropagation()}>
                                            <RowMenu
                                                offer={offer}
                                                expired={expired}
                                                onView={() => handleEdit(offer)}
                                                onSend={canSend ? () => handleSend(offer) : undefined}
                                                onArchive={() => handleArchive(offer)}
                                                onUnarchive={() => handleUnarchive(offer)}
                                                onDownload={offer.status === 'signed' ? () => handleDownloadSigned(offer) : undefined}
                                                onAcceptCounter={offer.status === 'negotiating' ? () => handleAcceptCounterOffer(offer) : undefined}
                                                onDeclineCounter={offer.status === 'negotiating' ? () => handleDeclineCounterOffer(offer) : undefined}
                                                onNegotiateCounter={offer.status === 'negotiating' ? () => handleNegotiateCounterOffer(offer) : undefined}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-5 mt-1">
                                <p className="text-xs text-gray-400">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOffers.length)} of {filteredOffers.length}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        aria-label="Previous page"
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    {getPageNumbers(currentPage, totalPages).map((page, i) =>
                                        page === null ? (
                                            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400 select-none">…</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${currentPage === page ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        aria-label="Next page"
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isModalOpen && (
                <OfferModal
                    offer={editingOffer}
                    candidate={null}
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingOffer(null); }}
                    onSave={loadOffers}
                />
            )}

            {isNegotiateModalOpen && negotiatingOffer && (
                <NegotiateCounterOfferModal
                    offer={negotiatingOffer}
                    isOpen={isNegotiateModalOpen}
                    onClose={() => { setIsNegotiateModalOpen(false); setNegotiatingOffer(null); }}
                    onSave={loadOffers}
                />
            )}

            {coachMarksReady && (
                <CoachMarkIfUnseen
                    markId="offers-approval"
                    targetRef={createOfferBtnRef as RefObject<HTMLElement>}
                    text="Tick 'Requires approval' on any offer to route it to the client before the candidate sees it"
                    side="bottom"
                />
            )}
        </div>
    );
};

export default Offers;
