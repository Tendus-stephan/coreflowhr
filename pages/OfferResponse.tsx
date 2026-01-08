import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Offer } from '../types';
import { Button } from '../components/ui/Button';
import { CheckCircle, XCircle, AlertCircle, Calendar, DollarSign, Briefcase, Clock, Loader2, X, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

const OfferResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<'accepted' | 'declined' | 'counter_offered' | null>(null);
    const [responseNote, setResponseNote] = useState('');
    const [jobTitle, setJobTitle] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [candidateName, setCandidateName] = useState<string>('');
    const [showCounterOffer, setShowCounterOffer] = useState(false);
    
    // Counter offer form state
    const [counterSalary, setCounterSalary] = useState<string>('');
    const [counterCurrency, setCounterCurrency] = useState<string>('USD');
    const [counterPeriod, setCounterPeriod] = useState<'hourly' | 'monthly' | 'yearly'>('yearly');
    const [counterStartDate, setCounterStartDate] = useState<string>('');
    const [counterBenefits, setCounterBenefits] = useState<string[]>([]);
    const [counterNote, setCounterNote] = useState<string>('');
    const [newBenefit, setNewBenefit] = useState<string>('');

    useEffect(() => {
        const loadOffer = async () => {
            if (!token) {
                setError('Invalid offer link');
                setLoading(false);
                return;
            }

            try {
                const offerData = await api.offers.getByToken(token);
                if (!offerData) {
                    setError('Invalid or expired offer link. Please contact the recruiter if you believe this is an error.');
                    setLoading(false);
                    return;
                }

                setOffer(offerData);

                // Load job details
                if (offerData.jobId) {
                    const job = await api.jobs.get(offerData.jobId);
                    if (job) {
                        setJobTitle(job.title);
                        setCompanyName(job.company || 'Our Company');
                    }
                }

                // Get candidate name if available (query directly since this is a public page)
                if (offerData.candidateId) {
                    try {
                        const { supabase } = await import('../services/supabase');
                        const { data: candidateData } = await supabase
                            .from('candidates')
                            .select('name')
                            .eq('id', offerData.candidateId)
                            .single();
                        if (candidateData) {
                            setCandidateName(candidateData.name);
                        }
                    } catch (err) {
                        console.error('Error fetching candidate:', err);
                    }
                }

                // Pre-fill counter offer with current offer values
                if (offerData.salaryAmount) {
                    setCounterSalary(offerData.salaryAmount.toString());
                }
                setCounterCurrency(offerData.salaryCurrency || 'USD');
                setCounterPeriod(offerData.salaryPeriod || 'yearly');
                if (offerData.startDate) {
                    setCounterStartDate(offerData.startDate);
                }
                if (offerData.benefits) {
                    setCounterBenefits(offerData.benefits);
                }

                // Check if already responded (only show success screen for accepted/declined)
                // For negotiating status, show the offer details so user can see recruiter's response
                if (offerData.status === 'accepted' || offerData.status === 'declined') {
                    setSuccess(offerData.status === 'accepted' ? 'accepted' : 'declined');
                }
                // Don't set success for 'negotiating' - let user see the updated offer

            } catch (err: any) {
                setError(err.message || 'Failed to load offer');
            } finally {
                setLoading(false);
            }
        };

        loadOffer();
    }, [token]);

    const handleAccept = async () => {
        if (!token || !offer) return;

        setSubmitting(true);
        setError(null);

        try {
            await api.offers.acceptByToken(token, responseNote.trim() || undefined);
            setSuccess('accepted');
        } catch (err: any) {
            setError(err.message || 'Failed to accept offer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDecline = async () => {
        if (!token || !offer) return;

        setSubmitting(true);
        setError(null);

        try {
            await api.offers.declineByToken(token, responseNote.trim() || undefined);
            setSuccess('declined');
        } catch (err: any) {
            setError(err.message || 'Failed to decline offer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCounterOffer = async () => {
        if (!token || !offer) return;

        setSubmitting(true);
        setError(null);

        try {
            const counterOfferData: any = {};
            
            if (counterSalary) {
                counterOfferData.salaryAmount = parseFloat(counterSalary);
            }
            counterOfferData.salaryCurrency = counterCurrency;
            counterOfferData.salaryPeriod = counterPeriod;
            
            if (counterStartDate) {
                counterOfferData.startDate = counterStartDate;
            }
            
            if (counterBenefits.length > 0) {
                counterOfferData.benefits = counterBenefits;
            }
            
            if (counterNote.trim()) {
                counterOfferData.notes = counterNote.trim();
            }

            await api.offers.counterOfferByToken(token, counterOfferData);
            setSuccess('counter_offered');
            setShowCounterOffer(false);
        } catch (err: any) {
            setError(err.message || 'Failed to submit counter offer');
        } finally {
            setSubmitting(false);
        }
    };

    const addBenefit = () => {
        if (newBenefit.trim() && !counterBenefits.includes(newBenefit.trim())) {
            setCounterBenefits([...counterBenefits, newBenefit.trim()]);
            setNewBenefit('');
        }
    };

    const removeBenefit = (index: number) => {
        setCounterBenefits(counterBenefits.filter((_, i) => i !== index));
    };

    const formatSalary = (amount?: number, currency?: string, period?: string) => {
        if (!amount) return 'To be discussed';
        const curr = currency === 'USD' ? '$' : currency || 'USD';
        const per = period === 'yearly' ? 'per year' : period === 'monthly' ? 'per month' : 'per hour';
        return `${curr}${amount.toLocaleString()} ${per}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not specified';
        return format(new Date(dateString), 'MMMM d, yyyy');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-gray-900 mx-auto mb-4 animate-spin" />
                    <p className="text-sm text-gray-600">Loading offer details...</p>
                </div>
            </div>
        );
    }

    if (error && !offer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                    {success === 'accepted' ? (
                        <>
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Accepted!</h2>
                            <p className="text-gray-600 mb-6">
                                Congratulations! Your acceptance has been recorded. The recruiter will be notified and will contact you with next steps.
                            </p>
                        </>
                    ) : success === 'counter_offered' ? (
                        <>
                            <CheckCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Counter Offer Submitted</h2>
                            <p className="text-gray-600 mb-6">
                                Your counter offer has been submitted. The recruiter will review it and get back to you soon.
                            </p>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Declined</h2>
                            <p className="text-gray-600 mb-6">
                                Your response has been recorded. Thank you for your time and interest.
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (!offer) return null;

    const isExpired = offer.expiresAt && new Date(offer.expiresAt) < new Date();
    const canRespond = offer.status === 'sent' || offer.status === 'viewed' || offer.status === 'negotiating';

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Letter-style offer document */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header with company name and date */}
                    <div className="bg-gray-900 text-white px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">{companyName || 'Company'}</h1>
                                <p className="text-gray-300 text-sm mt-1">Job Offer Letter</p>
                            </div>
                            <div className="text-right text-gray-300 text-sm">
                                <p>{format(new Date(), 'MMMM d, yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Letter content */}
                    <div className="px-8 py-8">
                        {/* Greeting */}
                        <div className="mb-6">
                            <p className="text-gray-900 text-lg mb-2">Dear {candidateName || 'Candidate'},</p>
                        </div>

                        {/* Main letter text */}
                        <div className="text-gray-700 leading-relaxed space-y-4 mb-8">
                            <p>
                                We are pleased to extend this offer of employment to you for the position of <strong>{offer.positionTitle}</strong> at {companyName || 'our company'}. We believe your skills and experience will be a valuable addition to our team.
                            </p>

                            {/* Offer Details */}
                            <div className="bg-gray-50 rounded-lg p-6 my-6 space-y-4">
                                <h3 className="font-bold text-gray-900 text-lg mb-4">Offer Details</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <Briefcase size={16} />
                                <span className="font-medium text-sm">Position</span>
                            </div>
                                        <p className="text-gray-900 font-semibold">{offer.positionTitle}</p>
                        </div>

                        <div>
                                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <DollarSign size={16} />
                                <span className="font-medium text-sm">Salary</span>
                            </div>
                                        <p className="text-gray-900 font-semibold">{formatSalary(offer.salaryAmount, offer.salaryCurrency, offer.salaryPeriod)}</p>
                        </div>

                        {offer.startDate && (
                            <div>
                                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                                    <Calendar size={16} />
                                    <span className="font-medium text-sm">Start Date</span>
                                </div>
                                            <p className="text-gray-900 font-semibold">{formatDate(offer.startDate)}</p>
                            </div>
                        )}

                        {offer.expiresAt && (
                            <div>
                                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                                    <Clock size={16} />
                                    <span className="font-medium text-sm">Offer Expires</span>
                                </div>
                                            <p className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatDate(offer.expiresAt)}
                                </p>
                            </div>
                        )}
                                </div>

                        {offer.benefits && offer.benefits.length > 0 && (
                                    <div className="mt-4">
                                        <p className="font-medium text-gray-700 mb-2">Benefits & Perks</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {offer.benefits.map((benefit, idx) => (
                                        <li key={idx}>{benefit}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {offer.notes && (
                                    <div className="mt-4">
                                <p className="font-medium text-gray-700 mb-2">Additional Information</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{offer.notes}</p>
                            </div>
                        )}
                    </div>

                            <p>
                                Please review the terms of this offer. If you have any questions or would like to discuss any aspect of this offer, please don't hesitate to reach out.
                            </p>
                        </div>

                        {/* Signature section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <p className="text-gray-700 mb-2">Best regards,</p>
                            <p className="text-gray-900 font-semibold">{companyName || 'The Hiring Team'}</p>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mx-8 mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {isExpired && (
                        <div className="mx-8 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                            <AlertCircle className="w-5 h-5 inline-block mr-2" />
                            This offer has expired. Please contact the recruiter if you would still like to proceed.
                        </div>
                    )}

                    {/* Negotiation History / Recruiter Response */}
                    {offer.status === 'negotiating' && offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                        <div className="px-8 py-6 bg-orange-50 border-t border-orange-200">
                            <h3 className="text-lg font-bold text-orange-900 mb-3">Negotiation Status</h3>
                            <div className="space-y-3">
                                {offer.negotiationHistory
                                    .filter((item: any) => item.type === 'counter_offer_response' || item.type === 'counter_offer')
                                    .slice(-3) // Show last 3 negotiation items
                                    .map((item: any, index: number) => (
                                        <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                                            <p className="text-xs text-orange-700 mb-2">
                                                {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                                            </p>
                                            {item.type === 'counter_offer_response' && item.updatedFields && (
                                                <div className="space-y-2 text-sm text-gray-700">
                                                    <p className="font-medium text-gray-900">Recruiter has proposed updated terms:</p>
                                                    {item.updatedFields.salaryAmount && (
                                                        <p>
                                                            <span className="font-medium">Salary:</span> {item.updatedFields.salaryCurrency === 'USD' ? '$' : item.updatedFields.salaryCurrency}
                                                            {item.updatedFields.salaryAmount.toLocaleString()} {item.updatedFields.salaryPeriod === 'yearly' ? 'per year' : item.updatedFields.salaryPeriod === 'monthly' ? 'per month' : 'per hour'}
                                                        </p>
                                                    )}
                                                    {item.updatedFields.benefits && item.updatedFields.benefits.length > 0 && (
                                                        <p>
                                                            <span className="font-medium">Benefits:</span> {item.updatedFields.benefits.join(', ')}
                                                        </p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="mt-2 italic text-gray-600">"{item.notes}"</p>
                                                    )}
                                                </div>
                                            )}
                                            {item.type === 'counter_offer' && item.counterOffer && (
                                                <div className="space-y-2 text-sm text-gray-700">
                                                    <p className="font-medium text-gray-900">Your counter offer:</p>
                                                    {item.counterOffer.salaryAmount && (
                                                        <p>
                                                            <span className="font-medium">Salary:</span> {item.counterOffer.salaryCurrency === 'USD' ? '$' : item.counterOffer.salaryCurrency}
                                                            {item.counterOffer.salaryAmount.toLocaleString()} {item.counterOffer.salaryPeriod === 'yearly' ? 'per year' : item.counterOffer.salaryPeriod === 'monthly' ? 'per month' : 'per hour'}
                                                        </p>
                                                    )}
                                                    {item.counterOffer.notes && (
                                                        <p className="mt-2 italic text-gray-600">"{item.counterOffer.notes}"</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {canRespond && !isExpired && (
                        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
                            {!showCounterOffer ? (
                        <>
                                    <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Optional Message
                                </label>
                                <textarea
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                    placeholder="Add a message to your response (optional)..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                                            rows={3}
                                />
                            </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="black"
                                    onClick={handleAccept}
                                    disabled={submitting}
                                    icon={<CheckCircle size={16} />}
                                    className="flex-1"
                                >
                                    {submitting ? 'Processing...' : 'Accept Offer'}
                                </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowCounterOffer(true)}
                                            disabled={submitting}
                                            icon={<Edit2 size={16} />}
                                            className="flex-1"
                                        >
                                            Counter Offer
                                        </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDecline}
                                    disabled={submitting}
                                    icon={<XCircle size={16} />}
                                    className="flex-1"
                                >
                                    {submitting ? 'Processing...' : 'Decline Offer'}
                                </Button>
                            </div>
                        </>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">Submit Counter Offer</h3>
                                        <button
                                            onClick={() => setShowCounterOffer(false)}
                                            className="text-gray-400 hover:text-gray-900"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Salary Amount
                                                </label>
                                                <input
                                                    type="number"
                                                    value={counterSalary}
                                                    onChange={(e) => setCounterSalary(e.target.value)}
                                                    placeholder="Enter amount"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Currency
                                                </label>
                                                <select
                                                    value={counterCurrency}
                                                    onChange={(e) => setCounterCurrency(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                >
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Period
                                                </label>
                                                <select
                                                    value={counterPeriod}
                                                    onChange={(e) => setCounterPeriod(e.target.value as 'hourly' | 'monthly' | 'yearly')}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                >
                                                    <option value="yearly">Per Year</option>
                                                    <option value="monthly">Per Month</option>
                                                    <option value="hourly">Per Hour</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={counterStartDate}
                                                onChange={(e) => setCounterStartDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Benefits & Perks
                                            </label>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={newBenefit}
                                                    onChange={(e) => setNewBenefit(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                                                    placeholder="Add a benefit"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={addBenefit}
                                                    size="sm"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                            {counterBenefits.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {counterBenefits.map((benefit, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                                        >
                                                            {benefit}
                                                            <button
                                                                onClick={() => removeBenefit(idx)}
                                                                className="text-gray-500 hover:text-gray-900"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Additional Notes
                                            </label>
                                            <textarea
                                                value={counterNote}
                                                onChange={(e) => setCounterNote(e.target.value)}
                                                placeholder="Explain your counter offer or any additional requests..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                                                rows={4}
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="black"
                                                onClick={handleCounterOffer}
                                                disabled={submitting}
                                                className="flex-1"
                                            >
                                                {submitting ? 'Submitting...' : 'Submit Counter Offer'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowCounterOffer(false)}
                                                disabled={submitting}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!canRespond && (
                        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 text-center">
                            <p className="font-medium text-gray-700 mb-2">This offer has already been {offer.status}</p>
                            {offer.response && (
                                <p className="text-sm text-gray-500 mt-2">Your response: {offer.response}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfferResponse;
