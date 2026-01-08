import React, { useState, useEffect } from 'react';
import { Offer, Candidate, Job } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { X, Plus, Trash2, Send, Save, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OfferModalProps {
    offer?: Offer | null;
    candidate?: Candidate | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
    offer,
    candidate,
    isOpen,
    onClose,
    onSave
}) => {
    const [positionTitle, setPositionTitle] = useState('');
    const [jobId, setJobId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [salaryAmount, setSalaryAmount] = useState<number | undefined>(undefined);
    const [salaryCurrency, setSalaryCurrency] = useState('USD');
    const [salaryPeriod, setSalaryPeriod] = useState<'hourly' | 'monthly' | 'yearly'>('yearly');
    const [benefits, setBenefits] = useState<string[]>([]);
    const [benefitInput, setBenefitInput] = useState('');
    const [notes, setNotes] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    
    const [jobs, setJobs] = useState<Job[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadJobs();
            // Always load candidates if we don't have one provided or if editing (to show candidate name)
            if (!candidate || offer) {
                loadCandidates();
            }
            if (offer) {
                // Editing existing offer
                setPositionTitle(offer.positionTitle);
                setJobId(offer.jobId);
                setSelectedCandidateId(offer.candidateId);
                setStartDate(offer.startDate || '');
                setSalaryAmount(offer.salaryAmount);
                setSalaryCurrency(offer.salaryCurrency);
                setSalaryPeriod(offer.salaryPeriod);
                setBenefits(offer.benefits || []);
                setNotes(offer.notes || '');
                setExpiresAt(offer.expiresAt || '');
            } else if (candidate) {
                // Creating new offer with candidate provided
                setPositionTitle(candidate.role || '');
                setJobId(candidate.jobId || '');
                setSelectedCandidateId(candidate.id);
                setBenefits([]); // Will require user to add at least one
                setNotes('');
                setStartDate('');
                setSalaryAmount(undefined);
                // Set default expiration to 7 days from now
                const defaultExpiration = new Date();
                defaultExpiration.setDate(defaultExpiration.getDate() + 7);
                setExpiresAt(defaultExpiration.toISOString().split('T')[0]);
            } else {
                // Creating new offer without candidate - reset form
                setPositionTitle('');
                setJobId('');
                setSelectedCandidateId('');
                setStartDate('');
                setSalaryAmount(undefined);
                setSalaryCurrency('USD');
                setSalaryPeriod('yearly');
                setBenefits([]); // Will require user to add at least one
                setNotes('');
                // Set default expiration to 7 days from now
                const defaultExpiration = new Date();
                defaultExpiration.setDate(defaultExpiration.getDate() + 7);
                setExpiresAt(defaultExpiration.toISOString().split('T')[0]);
            }
            setError(null);
        }
    }, [isOpen, offer, candidate]);

    const loadJobs = async () => {
        try {
            const result = await api.jobs.list();
            // Handle both array and { data: array } response formats
            const jobsData = Array.isArray(result) ? result : (result?.data || []);
            if (Array.isArray(jobsData)) {
                setJobs(jobsData);
            } else {
                setJobs([]);
            }
        } catch (err: any) {
            console.error('Error loading jobs:', err);
            setError(err.message || 'Failed to load jobs');
            setJobs([]); // Set empty array on error to prevent map error
        }
    };

    const loadCandidates = async () => {
        try {
            const result = await api.candidates.list();
            // Handle both array and { data: array } response formats
            const candidatesData = Array.isArray(result) ? result : (result?.data || []);
            if (Array.isArray(candidatesData)) {
                setCandidates(candidatesData);
            } else {
                setCandidates([]);
            }
        } catch (err: any) {
            console.error('Error loading candidates:', err);
            setCandidates([]); // Set empty array on error to prevent map error
        }
    };

    // Filter candidates by selected job
    const filteredCandidates = jobId 
        ? candidates.filter(c => c.jobId === jobId)
        : candidates;
    
    // Get selected candidate object
    const selectedCandidate = candidate || candidates.find(c => c.id === selectedCandidateId);
    
    // When job changes, auto-select candidate if only one matches
    useEffect(() => {
        if (jobId && !selectedCandidateId && !candidate && !offer) {
            const filtered = candidates.filter(c => c.jobId === jobId);
            if (filtered.length === 1) {
                setSelectedCandidateId(filtered[0].id);
                setPositionTitle(filtered[0].role || '');
            }
        }
    }, [jobId, candidates, selectedCandidateId, candidate, offer]);

    const handleAddBenefit = () => {
        if (benefitInput.trim() && !benefits.includes(benefitInput.trim())) {
            setBenefits([...benefits, benefitInput.trim()]);
            setBenefitInput('');
        }
    };

    const handleRemoveBenefit = (benefit: string) => {
        setBenefits(benefits.filter(b => b !== benefit));
    };

    const handleSave = async () => {
        if (!positionTitle.trim()) {
            setError('Position title is required');
            return;
        }

        if (!jobId) {
            setError('Job is required');
            return;
        }

        if (!salaryAmount || salaryAmount <= 0) {
            setError('Salary amount is required');
            return;
        }

        if (!startDate) {
            setError('Start date is required');
            return;
        }

        if (!expiresAt) {
            setError('Expiration date is required');
            return;
        }

        if (!benefits || benefits.length === 0) {
            setError('At least one benefit is required');
            return;
        }

        // Candidate is optional for general offers
        const candidateToUse = candidate || selectedCandidate;

        try {
            setSaving(true);
            setError(null);

            if (offer) {
                // Update existing offer - still validate required fields
                if (!positionTitle.trim()) {
                    setError('Position title is required');
                    return;
                }
                if (!jobId) {
                    setError('Job is required');
                    return;
                }
                if (!salaryAmount || salaryAmount <= 0) {
                    setError('Salary amount is required');
                    return;
                }
                if (!startDate) {
                    setError('Start date is required');
                    return;
                }
                if (!expiresAt) {
                    setError('Expiration date is required');
                    return;
                }
                if (!benefits || benefits.length === 0) {
                    setError('At least one benefit is required');
                    return;
                }

                await api.offers.update(offer.id, {
                    positionTitle: positionTitle.trim(),
                    startDate: startDate,
                    salaryAmount: salaryAmount,
                    salaryCurrency: salaryCurrency,
                    salaryPeriod: salaryPeriod,
                    benefits: benefits,
                    notes: notes.trim() || undefined,
                    expiresAt: expiresAt
                });
            } else {
                // Create new offer (candidate is optional for general offers)
                const candidateToUse = candidate || selectedCandidate;
                
                await api.offers.create({
                    candidateId: candidateToUse?.id || null, // null for general offers
                    jobId: jobId,
                    positionTitle: positionTitle.trim(),
                    startDate: startDate, // Required
                    salaryAmount: salaryAmount, // Required
                    salaryCurrency: salaryCurrency, // Required
                    salaryPeriod: salaryPeriod, // Required
                    benefits: benefits, // Required (at least one)
                    notes: notes.trim() || undefined, // Optional
                    expiresAt: expiresAt // Required
                });
            }

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error saving offer:', err);
            setError(err.message || 'Failed to save offer');
        } finally {
            setSaving(false);
        }
    };

    const handleSendOffer = async () => {
        if (!offer) {
            // Save first, then send
            await handleSave();
            // Get the newly created offer - use general filter if no candidate
            const candidateToUse = candidate || selectedCandidate;
            const offers = candidateToUse 
                ? await api.offers.list({ candidateId: candidateToUse.id })
                : await api.offers.list({ generalOnly: true });
            const newOffer = offers[0];
            if (newOffer) {
                // Can't send general offers - they need to be linked first
                if (!newOffer.candidateId) {
                    setError('Cannot send a general offer. Please link it to a candidate first from the candidate profile.');
                    return;
                }
                await sendOfferEmail(newOffer.id);
            }
        } else {
            // Can't send general offers - they need to be linked first
            if (!offer.candidateId) {
                setError('Cannot send a general offer. Please link it to a candidate first from the candidate profile.');
                return;
            }
            await sendOfferEmail(offer.id);
        }
    };

    const sendOfferEmail = async (offerId: string) => {
        try {
            setSending(true);
            setError(null);
            await api.offers.send(offerId);
            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error sending offer:', err);
            setError(err.message || 'Failed to send offer email');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {offer ? 'Edit Offer' : 'Create Offer'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Counter Offer Display */}
                    {offer && offer.negotiationHistory && offer.negotiationHistory.length > 0 && offer.negotiationHistory.some((item: any) => item.type === 'counter_offer') && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={16} className="text-orange-600" />
                                <h3 className="text-sm font-bold text-orange-900">Counter Offer Received</h3>
                            </div>
                            {offer.negotiationHistory
                                .filter((item: any) => item.type === 'counter_offer')
                                .map((item: any, index: number) => {
                                    const co = item.counterOffer;
                                    return (
                                        <div key={index} className="mb-3 last:mb-0 bg-white rounded-lg p-3 border border-orange-200">
                                            <p className="text-xs text-orange-700 mb-2 font-medium">
                                                {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                                            </p>
                                            <div className="space-y-1.5 text-sm text-gray-700">
                                                {co.salaryAmount && (
                                                    <p>
                                                        <span className="font-medium">Salary:</span>{' '}
                                                        {co.salaryCurrency === 'USD' ? '$' : co.salaryCurrency}
                                                        {co.salaryAmount.toLocaleString()}{' '}
                                                        {co.salaryPeriod === 'yearly' ? 'per year' : co.salaryPeriod === 'monthly' ? 'per month' : 'per hour'}
                                                    </p>
                                                )}
                                                {co.startDate && (
                                                    <p>
                                                        <span className="font-medium">Start Date:</span>{' '}
                                                        {format(new Date(co.startDate), 'MMM d, yyyy')}
                                                    </p>
                                                )}
                                                {co.benefits && co.benefits.length > 0 && (
                                                    <p>
                                                        <span className="font-medium">Benefits:</span> {co.benefits.join(', ')}
                                                    </p>
                                                )}
                                                {co.notes && (
                                                    <p className="mt-2 pt-2 border-t border-gray-200 italic text-gray-600">"{co.notes}"</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            <p className="text-xs text-orange-700 mt-2">You can update the offer terms above to respond to the counter offer.</p>
                        </div>
                    )}

                    {/* Candidate (if not provided and not editing) */}
                    {!candidate && !offer && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Candidate <span className="text-gray-400 text-xs font-normal">(Optional - leave blank for general offer)</span>
                            </label>
                            <select
                                value={selectedCandidateId}
                                onChange={(e) => {
                                    setSelectedCandidateId(e.target.value);
                                    const selected = candidates.find(c => c.id === e.target.value);
                                    if (selected) {
                                        setPositionTitle(selected.role || '');
                                        setJobId(selected.jobId || '');
                                    }
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            >
                                <option value="">Select a candidate...</option>
                                {jobId && filteredCandidates.length > 0 ? (
                                    // Show filtered candidates if job is selected and there are matches
                                    filteredCandidates.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} - {c.role}
                                        </option>
                                    ))
                                ) : (
                                    // Show all candidates if no job selected or no matches
                                    candidates.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} - {c.role} {c.jobId ? `(${jobs.find(j => j.id === c.jobId)?.title || 'Job'})` : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                            {jobId && filteredCandidates.length === 0 && candidates.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    No candidates found for this job. Select a candidate from all available candidates.
                                </p>
                            )}
                        </div>
                    )}
                    
                    {/* Show candidate info when editing offer */}
                    {offer && selectedCandidate && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Candidate
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                {selectedCandidate.name} - {selectedCandidate.role}
                            </div>
                        </div>
                    )}

                    {/* Position & Job */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position Title *
                            </label>
                            <input
                                type="text"
                                value={positionTitle}
                                onChange={(e) => setPositionTitle(e.target.value)}
                                placeholder="e.g., Senior Software Engineer"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Job *
                            </label>
                            <select
                                value={jobId}
                                onChange={(e) => {
                                    setJobId(e.target.value);
                                    // Auto-select candidate if only one matches
                                    const filtered = candidates.filter(c => c.jobId === e.target.value);
                                    if (filtered.length === 1 && !selectedCandidateId) {
                                        setSelectedCandidateId(filtered[0].id);
                                        setPositionTitle(filtered[0].role || '');
                                    }
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            >
                                <option value="">Select a job...</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>
                                        {job.title} - {job.company || 'Company'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date *
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>

                    {/* Salary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Salary Amount *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={salaryAmount || ''}
                                onChange={(e) => setSalaryAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="e.g., 100000"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Currency
                            </label>
                            <select
                                value={salaryCurrency}
                                onChange={(e) => setSalaryCurrency(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Period
                            </label>
                            <select
                                value={salaryPeriod}
                                onChange={(e) => setSalaryPeriod(e.target.value as 'hourly' | 'monthly' | 'yearly')}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            >
                                <option value="hourly">Per Hour</option>
                                <option value="monthly">Per Month</option>
                                <option value="yearly">Per Year</option>
                            </select>
                        </div>
                    </div>

                    {/* Benefits */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Benefits *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            At least one benefit is required
                        </p>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={benefitInput}
                                onChange={(e) => setBenefitInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddBenefit();
                                    }
                                }}
                                placeholder="e.g., Health Insurance, 401k"
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddBenefit}
                                icon={<Plus size={16} />}
                            >
                                Add
                            </Button>
                        </div>
                        {benefits.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {benefits.map(benefit => (
                                    <span
                                        key={benefit}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                    >
                                        {benefit}
                                        <button
                                            onClick={() => handleRemoveBenefit(benefit)}
                                            className="hover:text-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional offer details or notes (optional)..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-y"
                            rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Notes will not be included in the email template automatically, but can be added manually if needed.
                        </p>
                    </div>

                    {/* Expiration Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiration Date *
                        </label>
                        <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The offer will automatically expire after this date
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving || sending}
                    >
                        Cancel
                    </Button>
                    {offer && offer.status === 'draft' && (
                        <Button
                            variant="black"
                            onClick={handleSendOffer}
                            disabled={saving || sending}
                            icon={sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        >
                            {sending ? 'Sending...' : 'Save & Send Offer'}
                        </Button>
                    )}
                    {(!offer || offer.status === 'draft') && (
                        <Button
                            variant="black"
                            onClick={handleSave}
                            disabled={saving || sending}
                            icon={<Save size={16} />}
                        >
                            {saving ? 'Saving...' : offer ? 'Update Offer' : 'Save as Draft'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

