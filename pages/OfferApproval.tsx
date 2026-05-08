import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Offer } from '../types';
import { Button } from '../components/ui/Button';
import { CheckCircle, XCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalData {
    request: {
        id: string;
        status: 'pending' | 'approved' | 'rejected';
        approvalTokenExpiresAt: string;
        note?: string | null;
    };
    offer: Offer;
    candidateName: string | null;
    jobTitle: string | null;
    companyName: string | null;
    companyLogoUrl: string | null;
}

const Shell: React.FC<{ children: React.ReactNode; companyName?: string | null; companyLogoUrl?: string | null }> = ({ children, companyName, companyLogoUrl }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4">
        {/* Brand header — matches offer letter */}
        <div className="w-full mb-6" style={{ background: '#1e3a5f' }}>
            <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-center">
                {companyLogoUrl ? (
                    <img
                        src={companyLogoUrl}
                        alt={companyName || 'Company'}
                        className="max-h-[48px] max-w-[200px] object-contain"
                    />
                ) : companyName ? (
                    <span className="text-white text-lg font-bold">{companyName}</span>
                ) : (
                    <img
                        src="/assets/images/coreflow-favicon-logo.png"
                        alt="CoreflowHR"
                        className="object-contain"
                        style={{ width: '44px', height: '44px' }}
                    />
                )}
            </div>
        </div>
        <div className="w-full max-w-xl pb-10">
            {children}
        </div>
        <p className="text-center text-xs text-gray-400 pb-8">Powered by CoreflowHR</p>
    </div>
);

const OfferApproval: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();

    const [data, setData] = useState<ApprovalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ decision: 'approved' | 'rejected'; offerSent: boolean } | null>(null);
    const [brandName, setBrandName] = useState<string | null>(null);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);

    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectNote, setRejectNote] = useState('');

    // Pre-fill decision from query param (from email CTA buttons)
    const prefillDecision = searchParams.get('decision');

    useEffect(() => {
        if (!token) {
            setError('Invalid approval link.');
            setLoading(false);
            return;
        }

        api.offers.getApprovalByToken(token)
            .then(result => {
                if (!result) {
                    setError('This approval link is invalid or has expired.');
                    return;
                }
                setData(result as ApprovalData);
                setBrandName(result.companyName);
                setBrandLogo(result.companyLogoUrl);
                // If pre-filled with reject decision, show the rejection form immediately
                if (prefillDecision === 'reject' && result.request.status === 'pending') {
                    setShowRejectForm(true);
                }
            })
            .catch(() => setError('Failed to load approval details. Please try again.'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleDecision = async (decision: 'approved' | 'rejected', note?: string) => {
        if (!token) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await api.offers.respondToApproval(token, decision, note);
            setSuccess({ decision, offerSent: result.offerSent });
        } catch (err: any) {
            setError(err.message || 'Failed to submit your response. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatSalary = (offer: Offer) => {
        if (!offer.salaryAmount) return 'Not specified';
        const sym = offer.salaryCurrency === 'USD' ? '$' : offer.salaryCurrency === 'EUR' ? '€' : offer.salaryCurrency === 'GBP' ? '£' : offer.salaryCurrency + ' ';
        const period = offer.salaryPeriod === 'yearly' ? 'per year' : offer.salaryPeriod === 'monthly' ? 'per month' : 'per hour';
        return `${sym}${offer.salaryAmount.toLocaleString()} ${period}`;
    };

    if (loading) {
        return (
            <Shell companyName={brandName} companyLogoUrl={brandLogo}>
                <div className="flex justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-gray-400" />
                </div>
            </Shell>
        );
    }

    if (error) {
        return (
            <Shell companyName={brandName} companyLogoUrl={brandLogo}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to load request</h2>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </Shell>
        );
    }

    if (!data) return null;

    const { request, offer, candidateName, jobTitle, companyName } = data;
    const isExpired = new Date(request.approvalTokenExpiresAt) < new Date();
    const alreadyResponded = request.status !== 'pending';

    // Already responded
    if (alreadyResponded) {
        return (
            <Shell companyName={brandName} companyLogoUrl={brandLogo}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    {request.status === 'approved' ? (
                        <>
                            <CheckCircle size={36} className="text-green-500 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Already approved</h2>
                            <p className="text-sm text-gray-500">You have already approved this offer.</p>
                        </>
                    ) : (
                        <>
                            <XCircle size={36} className="text-red-400 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Already rejected</h2>
                            <p className="text-sm text-gray-500">You have already rejected this offer.</p>
                        </>
                    )}
                </div>
            </Shell>
        );
    }

    // Expired
    if (isExpired) {
        return (
            <Shell companyName={brandName} companyLogoUrl={brandLogo}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <Clock size={36} className="text-amber-400 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Link expired</h2>
                    <p className="text-sm text-gray-500">This approval link has expired. Please contact the recruiter to request a new one.</p>
                </div>
            </Shell>
        );
    }

    // Success state
    if (success) {
        return (
            <Shell companyName={brandName} companyLogoUrl={brandLogo}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    {success.decision === 'approved' ? (
                        <>
                            <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Offer approved</h2>
                            <p className="text-sm text-gray-500">
                                {success.offerSent
                                    ? `You approved this offer — it has been sent to ${candidateName || 'the candidate'}.`
                                    : 'Your approval has been recorded. The offer is awaiting approval from other reviewers.'}
                            </p>
                        </>
                    ) : (
                        <>
                            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Offer rejected</h2>
                            <p className="text-sm text-gray-500">
                                You rejected this offer — the recruiter has been notified.
                            </p>
                        </>
                    )}
                </div>
            </Shell>
        );
    }

    // Main review UI
    return (
        <Shell companyName={brandName} companyLogoUrl={brandLogo}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Offer Approval Request</p>
                    <h2 className="text-xl font-bold text-gray-900">{offer.positionTitle}</h2>
                    {candidateName && <p className="text-sm text-gray-500 mt-0.5">Candidate: <span className="font-medium text-gray-700">{candidateName}</span></p>}
                    {companyName && <p className="text-xs text-gray-400 mt-0.5">{companyName}{jobTitle ? ` · ${jobTitle}` : ''}</p>}
                </div>

                {/* Offer details */}
                <div className="px-6 py-5 space-y-3">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-gray-50">
                                <td className="py-2.5 text-gray-500 font-medium w-32">Salary</td>
                                <td className="py-2.5 text-gray-900 font-semibold">{formatSalary(offer)}</td>
                            </tr>
                            {offer.startDate && (
                                <tr className="border-b border-gray-50">
                                    <td className="py-2.5 text-gray-500 font-medium">Start Date</td>
                                    <td className="py-2.5 text-gray-900">
                                        {format(new Date(offer.startDate), 'MMMM d, yyyy')}
                                    </td>
                                </tr>
                            )}
                            {offer.expiresAt && (
                                <tr className="border-b border-gray-50">
                                    <td className="py-2.5 text-gray-500 font-medium">Offer Expires</td>
                                    <td className="py-2.5 text-gray-900">
                                        {format(new Date(offer.expiresAt), 'MMMM d, yyyy')}
                                    </td>
                                </tr>
                            )}
                            {offer.benefits && offer.benefits.length > 0 && (
                                <tr className="border-b border-gray-50">
                                    <td className="py-2.5 text-gray-500 font-medium align-top">Benefits</td>
                                    <td className="py-2.5 text-gray-900">
                                        <div className="flex flex-wrap gap-1.5">
                                            {offer.benefits.map(b => (
                                                <span key={b} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{b}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {offer.notes && (
                                <tr>
                                    <td className="py-2.5 text-gray-500 font-medium align-top">Notes</td>
                                    <td className="py-2.5 text-gray-700 italic text-sm">"{offer.notes}"</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Rejection form */}
                {showRejectForm ? (
                    <div className="px-6 pb-6 space-y-3">
                        <div className="h-px bg-gray-100" />
                        <p className="text-sm font-medium text-gray-700">Reason for rejection <span className="text-gray-400 font-normal">(required)</span></p>
                        <textarea
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="Please explain why you are rejecting this offer..."
                            rows={4}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 resize-none"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-600">{error}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setShowRejectForm(false); setRejectNote(''); setError(null); }}
                                disabled={submitting}
                            >
                                Back
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (!rejectNote.trim()) { setError('Please provide a reason for rejection.'); return; }
                                    handleDecision('rejected', rejectNote.trim());
                                }}
                                disabled={submitting || !rejectNote.trim()}
                                icon={submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                className="bg-red-600 hover:bg-red-700 text-white border-0"
                            >
                                {submitting ? 'Submitting…' : 'Confirm Rejection'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 pb-6">
                        <div className="h-px bg-gray-100 mb-5" />
                        {error && (
                            <p className="text-xs text-red-600 mb-3">{error}</p>
                        )}
                        <div className="flex gap-3">
                            <Button
                                size="sm"
                                onClick={() => handleDecision('approved')}
                                disabled={submitting}
                                icon={submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                            >
                                {submitting ? 'Processing…' : 'Approve Offer'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRejectForm(true)}
                                disabled={submitting}
                                icon={<XCircle size={14} />}
                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            >
                                Reject Offer
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Shell>
    );
};

export default OfferApproval;
