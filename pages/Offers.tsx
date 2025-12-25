import React, { useState, useEffect } from 'react';
import { Offer } from '../types';
import { api } from '../services/api';
import { OfferCard } from '../components/OfferCard';
import { OfferModal } from '../components/OfferModal';
import { Button } from '../components/ui/Button';
import { Plus, Filter, Search } from 'lucide-react';

const Offers: React.FC = () => {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<Offer['status'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [candidateMap, setCandidateMap] = useState<Map<string, string>>(new Map());
    const [jobMap, setJobMap] = useState<Map<string, string>>(new Map());

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
                const candidates = await api.candidates.list();
                const candidateNameMap = new Map(candidates.map(c => [c.id, c.name]));
                setCandidateMap(candidateNameMap);
            }

            // Load jobs
            if (jobIds.length > 0) {
                const jobs = await api.jobs.list();
                const jobTitleMap = new Map(jobs.map(j => [j.id, j.title]));
                setJobMap(jobTitleMap);
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
            <div className="p-8">
                <div className="flex items-center justify-center py-12">
                    <div className="text-sm text-gray-500">Loading offers...</div>
                </div>
            </div>
        );
    }

    return (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOffers.map((offer) => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            candidateName={offer.candidateId ? candidateMap.get(offer.candidateId) : 'General Offer (Not Linked)'}
                            jobTitle={jobMap.get(offer.jobId)}
                            onEdit={handleEdit}
                            onSend={handleSend}
                        />
                    ))}
                </div>
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
        </div>
    );
};

export default Offers;

