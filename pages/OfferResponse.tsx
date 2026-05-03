import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Offer } from '../types';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { X, AlertCircle, Loader2, Mail } from 'lucide-react';
import { format } from 'date-fns';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
        <img src="/assets/images/coreflow-favicon-logo.png" alt="CoreflowHR" className="object-contain mb-6" style={{ width: '120px', height: '120px' }} />
        <div className="w-full max-w-xl">
            {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">Powered by CoreflowHR</p>
    </div>
);

const OfferResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<'accepted' | 'declined' | 'counter_offered' | null>(null);
    const [signingInProgress, setSigningInProgress] = useState(false);
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
                const result = await api.offers.getByToken(token);
                if (!result) {
                    setError('Invalid or expired offer link. Please contact the recruiter if you believe this is an error.');
                    setLoading(false);
                    return;
                }

                const { offer: offerData, jobTitle: jt, companyName: cn, candidateName: cand } = result;
                setOffer(offerData);
                setJobTitle(jt);
                setCompanyName(cn || 'Our Company');
                setCandidateName(cand);

                if (offerData.salaryAmount) setCounterSalary(offerData.salaryAmount.toString());
                setCounterCurrency(offerData.salaryCurrency || 'USD');
                setCounterPeriod(offerData.salaryPeriod || 'yearly');
                if (offerData.startDate) setCounterStartDate(offerData.startDate);
                if (offerData.benefits) setCounterBenefits(offerData.benefits);

                if (offerData.status === 'accepted' || offerData.status === 'declined') {
                    setSuccess(offerData.status === 'accepted' ? 'accepted' : 'declined');
                }

                // Mark as viewed (fire-and-forget) if still in a pre-response state
                if (offerData.status === 'awaiting_response' || offerData.status === 'sent') {
                    api.offers.markViewedByToken(token).catch(() => {});
                }
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
            const updatedOffer = await api.offers.acceptByToken(token, responseNote.trim() || undefined);
            setOffer(updatedOffer);
            setSuccess('accepted');
        } catch (err: any) {
            const msg = err?.message || '';
            const isTechnical = /failed to accept|schema cache|could not find|42883|postgres|supabase/i.test(msg);
            setError(isTechnical ? 'Something went wrong on our end. Please try again or contact the company.' : msg);
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
            const msg = err?.message || '';
            const isTechnical = /failed to decline|schema cache|could not find|42883|postgres|supabase/i.test(msg);
            setError(isTechnical ? 'Something went wrong on our end. Please try again or contact the company.' : msg);
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
            if (counterSalary) counterOfferData.salaryAmount = parseFloat(counterSalary);
            counterOfferData.salaryCurrency = counterCurrency;
            counterOfferData.salaryPeriod = counterPeriod;
            if (counterStartDate) counterOfferData.startDate = counterStartDate;
            if (counterBenefits.length > 0) counterOfferData.benefits = counterBenefits;
            if (counterNote.trim()) counterOfferData.notes = counterNote.trim();

            await api.offers.counterOfferByToken(token, counterOfferData);
            setSuccess('counter_offered');
            setShowCounterOffer(false);
        } catch (err: any) {
            const msg = err?.message || '';
            const isTechnical = /failed to|schema cache|could not find|42883|postgres|supabase/i.test(msg);
            setError(isTechnical ? 'Something went wrong on our end. Please try again or contact the company.' : msg);
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
        const per = period === 'yearly' ? '/yr' : period === 'monthly' ? '/mo' : '/hr';
        return `${curr}${amount.toLocaleString()}${per}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not specified';
        return format(new Date(dateString), 'MMM d, yyyy');
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Shell>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-3">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Loading your offer…</p>
                </div>
            </Shell>
        );
    }

    // ── Error (no offer) ─────────────────────────────────────────────────────
    if (error && !offer) {
        return (
            <Shell>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle size={18} className="text-red-500" />
                    </div>
                    <h2 className="text-base font-semibold text-gray-900">Link not found</h2>
                    <p className="text-sm text-gray-500 max-w-xs">{error}</p>
                </div>
            </Shell>
        );
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (success) {
        const isAccepted = success === 'accepted';
        const isCounter = success === 'counter_offered';
        return (
            <Shell>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
                    {isAccepted
                        ? <img src="/assets/images/toast-success.png" alt="Success" className="w-12 h-12 object-contain" />
                        : isCounter
                        ? <img src="/assets/images/toast-success.png" alt="Counter Offer" className="w-12 h-12 object-contain" />
                        : <img src="/assets/images/toast-error.png" alt="Declined" className="w-12 h-12 object-contain" />
                    }
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 mb-1">
                            {isAccepted ? 'Offer Accepted' : isCounter ? 'Counter Offer Submitted' : 'Offer Declined'}
                        </h2>
                        <p className="text-sm text-gray-500 max-w-xs">
                            {isAccepted
                                ? 'Your acceptance is recorded. Check your email for the signing link from Dropbox Sign to complete the process.'
                                : isCounter
                                ? 'Your counter offer has been sent. The recruiter will review and get back to you.'
                                : 'Your response has been recorded. Thank you for your time.'}
                        </p>
                    </div>
                </div>
            </Shell>
        );
    }

    if (!offer) return null;

    const isExpired = offer.expiresAt && new Date(offer.expiresAt) < new Date();
    const signViaEmailOnly = offer.requireEsignature && offer.status === 'awaiting_signature' && !!offer.respondedAt;
    const awaitingEsignature = signViaEmailOnly;
    const canRespond = (
        offer.status === 'sent' ||
        offer.status === 'viewed' ||
        offer.status === 'negotiating' ||
        offer.status === 'awaiting_response' ||
        (offer.status === 'awaiting_signature' && !offer.respondedAt)
    ) && !awaitingEsignature;

    // ── DS screen (candidate already accepted, signing email en route) ────────
    if (signViaEmailOnly) {
        return (
            <Shell>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                        <Mail size={16} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 mb-1">Check your email</h2>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Your offer letter has been sent via Dropbox Sign. Open the email to review and sign the document. Check your spam folder if you don't see it.
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Questions? Contact {companyName || 'the company'} directly.</p>
                </div>
            </Shell>
        );
    }

    // ── Company initial avatar ────────────────────────────────────────────────
    const companyInitial = (companyName || 'C')[0].toUpperCase();

    return (
        <Shell>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* ── Card header ── */}
                <div className="px-6 pt-6 pb-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {companyInitial}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">Job Offer</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{companyName || 'Company'}</p>
                    </div>
                    {offer.expiresAt && (
                        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isExpired ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {isExpired ? 'Expired' : `Expires ${formatDate(offer.expiresAt)}`}
                        </span>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="px-6 py-5 space-y-5">

                    {/* Greeting */}
                    <p className="text-sm text-gray-700">
                        Dear <span className="font-semibold text-gray-900">{candidateName || 'Candidate'}</span>,
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        We're pleased to extend this offer for the position of{' '}
                        <span className="font-semibold text-gray-900">{offer.positionTitle}</span>
                        {companyName ? ` at ${companyName}` : ''}. Please review the details below.
                    </p>

                    {/* Offer details grid */}
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Position</p>
                            <p className="text-sm font-semibold text-gray-900">{offer.positionTitle}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Salary</p>
                            <p className="text-sm font-semibold text-gray-900">{formatSalary(offer.salaryAmount, offer.salaryCurrency, offer.salaryPeriod)}</p>
                        </div>
                        {offer.startDate && (
                            <div>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Start Date</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDate(offer.startDate)}</p>
                            </div>
                        )}
                        {jobTitle && jobTitle !== offer.positionTitle && (
                            <div>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Role</p>
                                <p className="text-sm font-semibold text-gray-900">{jobTitle}</p>
                            </div>
                        )}
                    </div>

                    {/* Benefits */}
                    {offer.benefits && offer.benefits.length > 0 && (
                        <div>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Benefits & Perks</p>
                            <div className="flex flex-wrap gap-1.5">
                                {offer.benefits.map((b, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">{b}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {offer.notes && (
                        <div className="text-sm text-gray-600 leading-relaxed border-l-2 border-gray-200 pl-3">
                            {offer.notes}
                        </div>
                    )}

                    {/* Negotiation history */}
                    {offer.status === 'negotiating' && offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Negotiation History</p>
                            {offer.negotiationHistory
                                .filter((item: any) => item.type === 'counter_offer_response' || item.type === 'counter_offer')
                                .slice(-3)
                                .map((item: any, index: number) => (
                                    <div key={index} className="bg-gray-50 rounded-xl p-3 text-sm">
                                        <p className="text-[10px] text-gray-400 mb-1">{format(new Date(item.timestamp), 'MMM d, yyyy · h:mm a')}</p>
                                        {item.type === 'counter_offer_response' && item.updatedFields && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-700">Recruiter updated terms:</p>
                                                {item.updatedFields.salaryAmount && (
                                                    <p className="text-xs text-gray-600">
                                                        Salary: {item.updatedFields.salaryCurrency === 'USD' ? '$' : item.updatedFields.salaryCurrency}
                                                        {item.updatedFields.salaryAmount.toLocaleString()} {item.updatedFields.salaryPeriod === 'yearly' ? '/yr' : item.updatedFields.salaryPeriod === 'monthly' ? '/mo' : '/hr'}
                                                    </p>
                                                )}
                                                {item.notes && <p className="text-xs text-gray-500 italic">"{item.notes}"</p>}
                                            </div>
                                        )}
                                        {item.type === 'counter_offer' && item.counterOffer && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-700">Your counter offer:</p>
                                                {item.counterOffer.salaryAmount && (
                                                    <p className="text-xs text-gray-600">
                                                        Salary: {item.counterOffer.salaryCurrency === 'USD' ? '$' : item.counterOffer.salaryCurrency}
                                                        {item.counterOffer.salaryAmount.toLocaleString()} {item.counterOffer.salaryPeriod === 'yearly' ? '/yr' : item.counterOffer.salaryPeriod === 'monthly' ? '/mo' : '/hr'}
                                                    </p>
                                                )}
                                                {item.counterOffer.notes && <p className="text-xs text-gray-500 italic">"{item.counterOffer.notes}"</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* ── Inline error ── */}
                {error && (
                    <div className="mx-6 mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-700">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p>{error}</p>
                            <button onClick={() => setError(null)} className="mt-1 text-xs font-medium text-red-600 underline underline-offset-2">Dismiss</button>
                        </div>
                    </div>
                )}

                {/* ── Expired banner ── */}
                {isExpired && (
                    <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                        <AlertCircle size={15} className="flex-shrink-0" />
                        This offer has expired. Contact the recruiter if you'd still like to proceed.
                    </div>
                )}

                {/* ── Awaiting signature banner ── */}
                {awaitingEsignature && (
                    <div className="mx-6 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
                        <Mail size={15} className="flex-shrink-0" />
                        A signing link has been sent to your email. Complete the signature there.
                    </div>
                )}

                {/* ── Actions ── */}
                {canRespond && !isExpired && (
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-3">
                        {!showCounterOffer ? (
                            <>
                                <textarea
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                    placeholder="Add an optional message…"
                                    rows={2}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 resize-none text-gray-700 placeholder-gray-400"
                                />
                                <div className="flex gap-2">
                                    <Button variant="black" onClick={handleAccept} disabled={submitting} className="flex-1 text-sm">
                                        {submitting ? 'Processing…' : 'Accept Offer'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowCounterOffer(true)} disabled={submitting} className="flex-1 text-sm">
                                        Counter
                                    </Button>
                                    <Button variant="outline" onClick={handleDecline} disabled={submitting} className="flex-1 text-sm">
                                        {submitting ? '…' : 'Decline'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">Counter Offer</p>
                                    <button onClick={() => setShowCounterOffer(false)} className="text-gray-400 hover:text-gray-700">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        value={counterSalary}
                                        onChange={(e) => setCounterSalary(e.target.value)}
                                        placeholder="Amount"
                                        className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                                    />
                                    <CustomSelect
                                        inputStyle
                                        value={counterCurrency}
                                        onChange={setCounterCurrency}
                                        className="py-2 rounded-xl text-sm"
                                        options={[
                                            { value: 'USD', label: 'USD' },
                                            { value: 'EUR', label: 'EUR' },
                                            { value: 'GBP', label: 'GBP' },
                                        ]}
                                    />
                                    <CustomSelect
                                        inputStyle
                                        value={counterPeriod}
                                        onChange={(val) => setCounterPeriod(val as 'hourly' | 'monthly' | 'yearly')}
                                        className="py-2 rounded-xl text-sm"
                                        options={[
                                            { value: 'yearly', label: '/yr' },
                                            { value: 'monthly', label: '/mo' },
                                            { value: 'hourly', label: '/hr' },
                                        ]}
                                    />
                                </div>

                                <input
                                    type="date"
                                    value={counterStartDate}
                                    onChange={(e) => setCounterStartDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                                />

                                <div>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={newBenefit}
                                            onChange={(e) => setNewBenefit(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                                            placeholder="Add a benefit…"
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900"
                                        />
                                        <Button variant="outline" onClick={addBenefit} size="sm">Add</Button>
                                    </div>
                                    {counterBenefits.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {counterBenefits.map((b, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                                    {b}
                                                    <button onClick={() => removeBenefit(idx)} className="text-gray-400 hover:text-gray-700"><X size={11} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    value={counterNote}
                                    onChange={(e) => setCounterNote(e.target.value)}
                                    placeholder="Explain your counter offer…"
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 resize-none"
                                />

                                <div className="flex gap-2">
                                    <Button variant="black" onClick={handleCounterOffer} disabled={submitting} className="flex-1 text-sm">
                                        {submitting ? 'Submitting…' : 'Submit Counter'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowCounterOffer(false)} disabled={submitting}>Cancel</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Already responded ── */}
                {!canRespond && !signViaEmailOnly && !isExpired && (
                    <div className="px-6 pb-6 pt-4 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">This offer has already been <span className="font-medium text-gray-700">{offer.status}</span>.</p>
                    </div>
                )}
            </div>
        </Shell>
    );
};

export default OfferResponse;
