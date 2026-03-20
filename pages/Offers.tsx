import React, { useState, useEffect } from 'react';
import { Offer } from '../types';
import { api } from '../services/api';
import { OffersSkeleton } from '../components/ui/Skeleton';
import { CustomSelect } from '../components/ui/CustomSelect';
import { OfferCard } from '../components/OfferCard';
import { OfferModal } from '../components/OfferModal';
import { NegotiateCounterOfferModal } from '../components/NegotiateCounterOfferModal';
import { Button } from '../components/ui/Button';
import { Plus, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Offers: React.FC = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<Offer['status'] | 'all' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
    const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
    const [candidateMap, setCandidateMap] = useState<Map<string, string>>(new Map());
    const [jobMap, setJobMap] = useState<Map<string, string>>(new Map());
    const [userRole, setUserRole] = useState<string>('');
    const toast = useToast();
    const confirm = useConfirm();

    // Pagination: 3 columns × 2 rows = 6 items per page
    const ITEMS_PER_PAGE = 6;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadOffers();
    }, []);

    useEffect(() => {
        api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
    }, []);

    useEffect(() => {
        // Filter offers
        let filtered = offers;

        if (statusFilter === 'archived') {
            filtered = filtered.filter(offer => offer.archived);
        } else if (statusFilter === 'all') {
            filtered = filtered.filter(offer => !offer.archived);
        } else {
            filtered = filtered.filter(offer => offer.status === statusFilter && !offer.archived);
        }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(offer => {
                    const candidateName = offer.candidateId ? candidateMap.get(offer.candidateId)?.toLowerCase() || '' : 'general offer';
                    const jobTitle = jobMap.get(offer.jobId)?.toLowerCase() || '';
                    const ref = (offer.referenceNumber || '').toLowerCase();
                    return (
                        offer.positionTitle.toLowerCase().includes(query) ||
                        candidateName.includes(query) ||
                        jobTitle.includes(query) ||
                        ref.includes(query)
                    );
                });
            }

        setFilteredOffers(filtered);
        // Reset to page 1 when filters change
        setCurrentPage(1);
    }, [offers, statusFilter, searchQuery, candidateMap, jobMap]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load all offers (archived + active) and filter client-side
            const data = await api.offers.list({ includeArchived: true });
            setOffers(data);

            // Load candidate and job names
            const candidateIds = [...new Set(data.map(o => o.candidateId))];
            const jobIds = [...new Set(data.map(o => o.jobId))];

            // Load candidates
            if (candidateIds.length > 0) {
                const candidatesResult = await api.candidates.list();
                // Handle both array and { data: array } response formats
                const candidates = Array.isArray(candidatesResult) ? candidatesResult : (candidatesResult?.data || []);
                if (Array.isArray(candidates)) {
                    const candidateNameMap = new Map<string, string>(
                        candidates.map((c: any): [string, string] => [String(c.id), String(c.name ?? '')])
                    );
                    setCandidateMap(candidateNameMap);
                }
            }

            // Load jobs
            if (jobIds.length > 0) {
                const jobsResult = await api.jobs.list();
                // Handle both array and { data: array } response formats
                const jobs = Array.isArray(jobsResult) ? jobsResult : (jobsResult?.data || []);
                if (Array.isArray(jobs)) {
                    const jobTitleMap = new Map<string, string>(
                        jobs.map((j: any): [string, string] => [String(j.id), String(j.title ?? '')])
                    );
                    setJobMap(jobTitleMap);
                }
            }
        } catch (err: any) {
            console.error('Error loading offers:', err);
            setError(err.message || 'Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const [sendingOfferId, setSendingOfferId] = useState<string | null>(null);
    const [archivingOfferId, setArchivingOfferId] = useState<string | null>(null);

    const handleEdit = (offer: Offer) => {
        setEditingOffer(offer);
        setIsModalOpen(true);
    };

    const handleSend = async (offer: Offer) => {
        if (sendingOfferId) return;
        if (!offer.candidateId) {
            toast.error('Cannot send a general offer. Please link it to a candidate first from the candidate profile.');
            return;
        }
        try {
            setSendingOfferId(offer.id);
            await api.offers.send(offer.id);
            // Play notification sound
            const { playNotificationSound } = await import('../utils/soundUtils');
            playNotificationSound();
            await loadOffers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to send offer');
        } finally {
            setSendingOfferId(null);
        }
    };

    const handleArchive = async (offer: Offer) => {
        if (archivingOfferId) return;
        const ok = await confirm({
            title: 'Archive this offer?',
            description: 'It will be hidden from the main list but kept for history.',
            confirmLabel: 'Archive',
        });
        if (!ok) return;
        try {
            setArchivingOfferId(offer.id);
            await api.offers.update(offer.id, { archived: true });
            await loadOffers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to archive offer');
        } finally {
            setArchivingOfferId(null);
        }
    };

    const handleUnarchive = async (offer: Offer) => {
        if (archivingOfferId) return;
        try {
            setArchivingOfferId(offer.id);
            await api.offers.update(offer.id, { archived: false });
            await loadOffers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to restore offer');
        } finally {
            setArchivingOfferId(null);
        }
    };

    const handleAcceptCounterOffer = async (offer: Offer) => {
        const ok = await confirm({
            title: 'Accept counter offer terms?',
            description: 'This will update the offer and notify the candidate.',
            confirmLabel: 'Accept',
        });
        if (!ok) return;
        try {
            await api.offers.acceptCounterOffer(offer.id);
            toast.success('Counter offer accepted! Candidate has been notified.');
            await loadOffers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to accept counter offer');
        }
    };

    const handleDeclineCounterOffer = async (offer: Offer) => {
        const ok = await confirm({
            title: 'Decline counter offer?',
            description: 'The original offer terms will remain, and the candidate will be notified.',
            confirmLabel: 'Decline',
            variant: 'destructive',
        });
        if (!ok) return;
        try {
            await api.offers.declineCounterOffer(offer.id);
            toast.info('Counter offer declined. Candidate has been notified.');
            await loadOffers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to decline counter offer');
        }
    };

    const handleNegotiateCounterOffer = (offer: Offer) => {
        setNegotiatingOffer(offer);
        setIsNegotiateModalOpen(true);
    };

    const handleDownloadSigned = async (offer: Offer) => {
        try {
            const url = await api.offers.getSignedPdfUrl(offer.id);
            if (url) window.open(url, '_blank');
            else toast.error('Signed document is not available.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to load signed document');
        }
    };

    const statusOptions: Array<{ value: Offer['status'] | 'all' | 'archived'; label: string }> = [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'awaiting_signature', label: 'Awaiting Sign.' },
        { value: 'signed', label: 'Signed' },
        { value: 'viewed', label: 'Viewed' },
        { value: 'negotiating', label: 'Negotiating' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'declined', label: 'Declined' },
        { value: 'expired', label: 'Expired' },
        { value: 'archived', label: 'Archived' }
    ];

    if (loading) return <OffersSkeleton />;

    const statusTabs: Array<{ value: Offer['status'] | 'all'; label: string }> = [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'awaiting_signature', label: 'Awaiting Sign.' },
        { value: 'negotiating', label: 'Negotiating' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'declined', label: 'Declined' },
        { value: 'archived', label: 'Archived' },
    ];

    const tabCounts: Record<string, number> = {
        all: offers.length,
        ...Object.fromEntries(
            statusTabs.slice(1).map(t => [t.value, offers.filter(o => o.status === t.value || (t.value === 'archived' && o.archived)).length])
        )
    };

    const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col h-full bg-gray-50/40">
            {/* Page Header */}
            <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white flex items-start justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Offers</h1>
                    <p className="mt-1.5 text-sm text-gray-400 font-normal">
                        Manage and track job offers sent to candidates.
                    </p>
                </div>
                <Button
                    size="sm"
                    icon={<Plus size={15} />}
                    onClick={() => { setEditingOffer(null); setIsModalOpen(true); }}
                >
                    Create Offer
                </Button>
            </div>

            {/* Filter tabs + search */}
            <div className="px-8 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1 -mb-px">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => { setStatusFilter(tab.value as any); setCurrentPage(1); }}
                            className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                <div className="relative py-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search offers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-7 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors w-52"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-5">
                        {error}
                    </div>
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
                            {offers.length === 0
                                ? 'Create your first job offer to get started'
                                : 'Try adjusting your search or filter criteria'}
                        </p>
                        {offers.length === 0 && (
                            <Button
                                size="sm"
                                icon={<Plus size={15} />}
                                onClick={() => { setEditingOffer(null); setIsModalOpen(true); }}
                            >
                                Create Your First Offer
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredOffers
                                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                .map((offer) => (
                                    <OfferCard
                                        key={offer.id}
                                        offer={offer}
                                        candidateName={offer.candidateId ? candidateMap.get(offer.candidateId) : 'General Offer (Not Linked)'}
                                        jobTitle={jobMap.get(offer.jobId)}
                                        onEdit={handleEdit}
                                        onSend={handleSend}
                                        onAcceptCounterOffer={handleAcceptCounterOffer}
                                        onDeclineCounterOffer={handleDeclineCounterOffer}
                                        onNegotiateCounterOffer={handleNegotiateCounterOffer}
                                        isSending={sendingOfferId === offer.id}
                                        onArchive={handleArchive}
                                        onUnarchive={handleUnarchive}
                                        isArchiving={archivingOfferId === offer.id}
                                        hideSalary={userRole === 'HiringManager'}
                                        onDownloadSigned={handleDownloadSigned}
                                    />
                                ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-5">
                                <p className="text-xs text-gray-400">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOffers.length)} of {filteredOffers.length} offers
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                                                currentPage === page
                                                    ? 'bg-gray-900 text-white'
                                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
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

            {/* Offer Modal */}
            {isModalOpen && (
                <OfferModal
                    offer={editingOffer}
                    candidate={null}
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingOffer(null); }}
                    onSave={loadOffers}
                />
            )}

            {/* Negotiate Counter Offer Modal */}
            {isNegotiateModalOpen && negotiatingOffer && (
                <NegotiateCounterOfferModal
                    offer={negotiatingOffer}
                    isOpen={isNegotiateModalOpen}
                    onClose={() => { setIsNegotiateModalOpen(false); setNegotiatingOffer(null); }}
                    onSave={loadOffers}
                />
            )}
        </div>
    );
};

export default Offers;

