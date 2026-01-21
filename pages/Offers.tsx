import React, { useState, useEffect } from 'react';
import { Offer } from '../types';
import { api } from '../services/api';
import { OfferCard } from '../components/OfferCard';
import { OfferModal } from '../components/OfferModal';
import { NegotiateCounterOfferModal } from '../components/NegotiateCounterOfferModal';
import { Button } from '../components/ui/Button';
import { Plus, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const Offers: React.FC = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<Offer['status'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [negotiatingOffer, setNegotiatingOffer] = useState<Offer | null>(null);
    const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
    const [candidateMap, setCandidateMap] = useState<Map<string, string>>(new Map());
    const [jobMap, setJobMap] = useState<Map<string, string>>(new Map());
    
    // Pagination: 3 columns × 2 rows = 6 items per page
    const ITEMS_PER_PAGE = 6;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadOffers();
    }, []);

    useEffect(() => {
        // Filter offers
        let filtered = offers;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(offer => offer.status === statusFilter);
        }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(offer => {
                    const candidateName = offer.candidateId ? candidateMap.get(offer.candidateId)?.toLowerCase() || '' : 'general offer';
                    const jobTitle = jobMap.get(offer.jobId)?.toLowerCase() || '';
                    return (
                        offer.positionTitle.toLowerCase().includes(query) ||
                        candidateName.includes(query) ||
                        jobTitle.includes(query)
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
            const data = await api.offers.list();
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

    const handleEdit = (offer: Offer) => {
        setEditingOffer(offer);
        setIsModalOpen(true);
    };

    const handleSend = async (offer: Offer) => {
        if (!offer.candidateId) {
            alert('Cannot send a general offer. Please link it to a candidate first from the candidate profile.');
            return;
        }
        try {
            await api.offers.send(offer.id);
            // Play notification sound
            const { playNotificationSound } = await import('../utils/soundUtils');
            playNotificationSound();
            await loadOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to send offer');
        }
    };

    const handleAcceptCounterOffer = async (offer: Offer) => {
        if (!confirm('Are you sure you want to accept the counter offer terms? This will update the offer and notify the candidate.')) {
            return;
        }
        try {
            await api.offers.acceptCounterOffer(offer.id);
            alert('Counter offer accepted! Candidate has been notified.');
            await loadOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to accept counter offer');
        }
    };

    const handleDeclineCounterOffer = async (offer: Offer) => {
        if (!confirm('Are you sure you want to decline the counter offer? The original offer terms will remain, and the candidate will be notified.')) {
            return;
        }
        try {
            await api.offers.declineCounterOffer(offer.id);
            alert('Counter offer declined. Candidate has been notified.');
            await loadOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to decline counter offer');
        }
    };

    const handleNegotiateCounterOffer = (offer: Offer) => {
        setNegotiatingOffer(offer);
        setIsNegotiateModalOpen(true);
    };

    const statusOptions: Array<{ value: Offer['status'] | 'all'; label: string }> = [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'viewed', label: 'Viewed' },
        { value: 'negotiating', label: 'Negotiating' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'declined', label: 'Declined' },
        { value: 'expired', label: 'Expired' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="p-8">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm text-gray-500">Loading offers...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Job Offers</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage and track job offers for candidates</p>
                    </div>
                    <Button
                        variant="black"
                        icon={<Plus size={16} />}
                        onClick={() => {
                            setEditingOffer(null);
                            setIsModalOpen(true);
                        }}
                    >
                        Create Offer
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by candidate name, job title, or position..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as Offer['status'] | 'all')}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">
                    {error}
                </div>
            )}

            {filteredOffers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">
                        {offers.length === 0 ? 'No offers yet' : 'No offers match your filters'}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                        {offers.length === 0 
                            ? 'Create your first job offer to get started'
                            : 'Try adjusting your search or filter criteria'}
                    </p>
                    {offers.length === 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Plus size={16} />}
                            onClick={() => {
                                setEditingOffer(null);
                                setIsModalOpen(true);
                            }}
                        >
                            Create Your First Offer
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* Paginated Offers Grid - Max 3 columns, 2 rows (6 items per page) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                />
                            ))}
                    </div>

                    {/* Pagination Controls */}
                    {Math.ceil(filteredOffers.length / ITEMS_PER_PAGE) > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredOffers.length)}</span> of <span className="font-bold text-gray-900">{filteredOffers.length}</span> offers
                            </p>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: Math.ceil(filteredOffers.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === page
                                                ? 'bg-black text-white'
                                                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOffers.length / ITEMS_PER_PAGE), prev + 1))}
                                    disabled={currentPage === Math.ceil(filteredOffers.length / ITEMS_PER_PAGE)}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Offer Modal */}
            {isModalOpen && (
                <OfferModal
                    offer={editingOffer}
                    candidate={null}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingOffer(null);
                    }}
                    onSave={loadOffers}
                />
            )}

            {/* Negotiate Counter Offer Modal */}
            {isNegotiateModalOpen && negotiatingOffer && (
                <NegotiateCounterOfferModal
                    offer={negotiatingOffer}
                    isOpen={isNegotiateModalOpen}
                    onClose={() => {
                        setIsNegotiateModalOpen(false);
                        setNegotiatingOffer(null);
                    }}
                    onSave={loadOffers}
                />
            )}
            </div>
        </div>
    );
};

export default Offers;

