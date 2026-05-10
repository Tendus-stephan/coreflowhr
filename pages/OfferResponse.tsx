import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Offer } from '../types';
import { CustomSelect } from '../components/ui/CustomSelect';
import { X, AlertCircle, Mail, DollarSign, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { darkenHex } from '../utils/colorUtils';

const DEFAULT_BANNER = '#1e3a5f';
const buildGradient = (color: string) =>
    `linear-gradient(135deg, ${color} 0%, ${darkenHex(color, 38)} 100%)`;

// ── Shell: used for all full-page state screens (loading / error / success) ──
const Shell: React.FC<{
    children: React.ReactNode;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    bannerColor?: string | null;
}> = ({ children, companyName, companyLogoUrl, bannerColor }) => {
    const [logoErr, setLogoErr] = useState(false);
    const gradient = buildGradient(bannerColor || DEFAULT_BANNER);

    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="relative">
                <div className="relative w-full overflow-hidden" style={{ height: '200px', background: gradient }}>
                    <div
                        className="absolute inset-x-0 bottom-0"
                        style={{ height: '80px', background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }}
                    />
                    <svg viewBox="0 0 1440 40" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '40px' }}>
                        <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                    </svg>
                </div>
                <div className="mx-auto px-6 relative" style={{ maxWidth: '560px' }}>
                    <div className="flex items-center gap-4 -mt-10 pb-6">
                        <div
                            className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden"
                            style={{ width: 80, height: 80, borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', border: '0.5px solid #e5e7eb' }}
                        >
                            {companyLogoUrl && !logoErr ? (
                                <img src={companyLogoUrl} alt={companyName || 'Company'} className="w-full h-full object-contain p-2" onError={() => setLogoErr(true)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                    <span className="text-white text-2xl font-extrabold select-none">
                                        {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {companyName && (
                            <div className="min-w-0">
                                <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: '18px' }}>{companyName}</h1>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mx-auto px-6 pb-10" style={{ maxWidth: '560px' }}>
                {children}
            </div>
            <div className="flex justify-center pb-12">
                <a href="https://www.coreflowhr.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm">
                    <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
                    Powered by CoreflowHR
                </a>
            </div>
        </div>
    );
};

// ── BannerHeader: used at the top of the main two-column layout ──────────────
const BannerHeader: React.FC<{
    companyName: string;
    companyLogoUrl: string | null;
    bannerColor: string | null;
}> = ({ companyName, companyLogoUrl, bannerColor }) => {
    const [logoErr, setLogoErr] = useState(false);
    const gradient = buildGradient(bannerColor || DEFAULT_BANNER);

    return (
        <div className="relative">
            <div className="relative w-full overflow-hidden" style={{ height: '200px', background: gradient }}>
                <div className="absolute inset-x-0 bottom-0"
                    style={{ height: '80px', background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }} />
                <svg viewBox="0 0 1440 40" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '40px' }}>
                    <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                </svg>
            </div>
            <div className="px-10 relative">
                <div className="flex items-center gap-4 -mt-10 pb-4">
                    <div
                        className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden"
                        style={{ width: 80, height: 80, borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', border: '0.5px solid #e5e7eb' }}
                    >
                        {companyLogoUrl && !logoErr ? (
                            <img src={companyLogoUrl} alt={companyName} className="w-full h-full object-contain p-2" onError={() => setLogoErr(true)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                <span className="text-white text-2xl font-extrabold select-none">
                                    {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: '18px' }}>{companyName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OfferResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<'accepted' | 'declined' | 'counter_offered' | null>(null);
    const [responseNote, setResponseNote] = useState('');
    const [jobTitle, setJobTitle] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
    const [bannerColor, setBannerColor] = useState<string | null>(null);
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

                const { offer: offerData, jobTitle: jt, companyName: cn, candidateName: cand, companyLogoUrl: logo, bannerColor: bc } = result;
                setOffer(offerData);
                setJobTitle(jt);
                setCompanyName(cn || 'Our Company');
                setCandidateName(cand);
                setCompanyLogoUrl(logo);
                setBannerColor(bc);

                if (offerData.salaryAmount) setCounterSalary(offerData.salaryAmount.toString());
                setCounterCurrency(offerData.salaryCurrency || 'USD');
                setCounterPeriod(offerData.salaryPeriod || 'yearly');
                if (offerData.startDate) setCounterStartDate(offerData.startDate);
                if (offerData.benefits) setCounterBenefits(offerData.benefits);

                if (offerData.status === 'accepted' || offerData.status === 'declined') {
                    setSuccess(offerData.status === 'accepted' ? 'accepted' : 'declined');
                }

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
        return `${curr}${Math.round(amount).toLocaleString()}${per}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not specified';
        return format(new Date(dateString), 'MMM d, yyyy');
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
                <div className="flex justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-gray-400" />
                </div>
            </Shell>
        );
    }

    // ── Error (no offer) ─────────────────────────────────────────────────────
    if (error && !offer) {
        return (
            <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <AlertCircle size={28} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Link not found</h2>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </Shell>
        );
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (success) {
        const isAccepted = success === 'accepted';
        const isCounter = success === 'counter_offered';
        return (
            <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    {isAccepted ? (
                        <>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                                <polyline points="4,12 9,17 20,6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Offer accepted</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Your acceptance is recorded. Check your email for the signing link from Dropbox Sign to complete the process.
                            </p>
                        </>
                    ) : isCounter ? (
                        <>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                                <polyline points="4,12 9,17 20,6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Counter offer submitted</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Your counter offer has been sent. The recruiter will review and get back to you.
                            </p>
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                                <line x1="5" y1="12" x2="19" y2="12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Offer declined</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Your response has been recorded. Thank you for your time.
                            </p>
                        </>
                    )}
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

    // ── Check email (Dropbox Sign) ────────────────────────────────────────────
    if (signViaEmailOnly) {
        return (
            <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                    <Mail size={28} className="text-gray-400 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Your offer letter has been sent via Dropbox Sign. Open the email to review and sign the document.
                        Check your spam folder if you don't see it.
                    </p>
                    <p className="text-xs text-gray-400 mt-4">Questions? Contact {companyName || 'the company'} directly.</p>
                </div>
            </Shell>
        );
    }

    // ── Main page ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">

            {/* Banner + logo header */}
            <BannerHeader companyName={companyName} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor} />

            {/* Two-column content */}
            <div className="flex-1 flex flex-col lg:flex-row">

                {/* ── LEFT PANEL: offer details ── */}
                <div className="lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white">
                    <div className="px-10 py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto flex flex-col">

                        {/* Position title */}
                        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-6">{offer.positionTitle}</h1>

                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-2 mb-8">
                            {offer.salaryAmount && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                                    <DollarSign size={11} className="text-gray-400" />
                                    {formatSalary(offer.salaryAmount, offer.salaryCurrency, offer.salaryPeriod)}
                                </span>
                            )}
                            {offer.startDate && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                                    <Calendar size={11} className="text-gray-400" />
                                    Starts {formatDate(offer.startDate)}
                                </span>
                            )}
                            {offer.expiresAt && (
                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${isExpired ? 'bg-red-50 border border-red-100 text-red-600' : 'bg-gray-50 border border-gray-100 text-gray-600'}`}>
                                    <Clock size={11} className={isExpired ? 'text-red-400' : 'text-gray-400'} />
                                    {isExpired ? 'Expired' : `Expires ${formatDate(offer.expiresAt)}`}
                                </span>
                            )}
                        </div>

                        {/* Notes */}
                        {offer.notes && (
                            <div className="mb-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">About this offer</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{offer.notes}</p>
                            </div>
                        )}

                        {/* Benefits */}
                        {offer.benefits && offer.benefits.length > 0 && (
                            <div className="mb-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Benefits & Perks</p>
                                <div className="flex flex-wrap gap-2">
                                    {offer.benefits.map((b, i) => (
                                        <span key={i} className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Negotiation history */}
                        {offer.status === 'negotiating' && offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                            <div className="mb-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Negotiation History</p>
                                <div className="space-y-2">
                                    {offer.negotiationHistory
                                        .filter((item: any) => item.type === 'counter_offer_response' || item.type === 'counter_offer')
                                        .slice(-3)
                                        .map((item: any, index: number) => (
                                            <div key={index} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                                <p className="text-[10px] text-gray-400 mb-1">{format(new Date(item.timestamp), 'MMM d, yyyy · h:mm a')}</p>
                                                {item.type === 'counter_offer_response' && item.updatedFields && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-gray-700">Recruiter updated terms:</p>
                                                        {item.updatedFields.salaryAmount && (
                                                            <p className="text-xs text-gray-600">
                                                                Salary: {item.updatedFields.salaryCurrency === 'USD' ? '$' : item.updatedFields.salaryCurrency}
                                                                {Math.round(item.updatedFields.salaryAmount).toLocaleString()} {item.updatedFields.salaryPeriod === 'yearly' ? '/yr' : item.updatedFields.salaryPeriod === 'monthly' ? '/mo' : '/hr'}
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
                                                                {Math.round(item.counterOffer.salaryAmount).toLocaleString()} {item.counterOffer.salaryPeriod === 'yearly' ? '/yr' : item.counterOffer.salaryPeriod === 'monthly' ? '/mo' : '/hr'}
                                                            </p>
                                                        )}
                                                        {item.counterOffer.notes && <p className="text-xs text-gray-500 italic">"{item.counterOffer.notes}"</p>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Platform attribution */}
                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <a
                                href="https://www.coreflowhr.com"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm"
                            >
                                <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
                                Powered by CoreflowHR
                            </a>
                        </div>

                    </div>
                </div>

                {/* ── RIGHT PANEL: response ── */}
                <div className="flex-1 bg-gray-50/60">
                    <div className="max-w-xl mx-auto px-8 py-10">

                        {!showCounterOffer ? (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                        {canRespond ? 'Review your offer' : 'Offer details'}
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        Dear {candidateName || 'Candidate'}, we're pleased to extend this offer for{' '}
                                        <strong className="text-gray-600">{offer.positionTitle}</strong>.
                                    </p>
                                </div>

                                {/* Error banner */}
                                {error && (
                                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
                                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p>{error}</p>
                                            <button onClick={() => setError(null)} className="mt-1 text-xs font-medium text-red-600 underline underline-offset-2">Dismiss</button>
                                        </div>
                                    </div>
                                )}

                                {/* Expired banner */}
                                {isExpired && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-800">
                                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                                        This offer has expired. Contact the recruiter if you'd still like to proceed.
                                    </div>
                                )}

                                {/* Awaiting signature banner */}
                                {awaitingEsignature && (
                                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
                                        <Mail size={15} className="mt-0.5 flex-shrink-0" />
                                        A signing link has been sent to your email. Complete the signature there.
                                    </div>
                                )}

                                {/* Action area */}
                                {canRespond && !isExpired && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                                Message <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                                            </label>
                                            <textarea
                                                value={responseNote}
                                                onChange={(e) => setResponseNote(e.target.value)}
                                                placeholder="Add an optional message…"
                                                rows={3}
                                                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors resize-none"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAccept}
                                            disabled={submitting}
                                            className="w-full h-11 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing…
                                                </>
                                            ) : (
                                                <>Accept offer <ArrowRight size={14} /></>
                                            )}
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setShowCounterOffer(true)}
                                                disabled={submitting}
                                                className="h-11 flex items-center justify-center text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Make a counter offer
                                            </button>
                                            <button
                                                onClick={handleDecline}
                                                disabled={submitting}
                                                className="h-11 flex items-center justify-center text-sm font-medium text-gray-400 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {submitting ? '…' : 'Decline'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Already responded */}
                                {!canRespond && !signViaEmailOnly && !isExpired && !awaitingEsignature && (
                                    <div className="py-8 text-center">
                                        <p className="text-sm text-gray-500">
                                            This offer has already been <span className="font-medium text-gray-700">{offer.status}</span>.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Counter offer form ── */
                            <>
                                <div className="mb-8 flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 mb-1">Counter offer</h2>
                                        <p className="text-sm text-gray-400">Propose your preferred terms below.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCounterOffer(false)}
                                        className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
                                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Salary */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Salary</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                type="number"
                                                value={counterSalary}
                                                onChange={(e) => setCounterSalary(e.target.value)}
                                                placeholder="Amount"
                                                className="h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                                            />
                                            <CustomSelect
                                                inputStyle
                                                value={counterCurrency}
                                                onChange={setCounterCurrency}
                                                className="rounded-xl text-sm"
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
                                                className="rounded-xl text-sm"
                                                options={[
                                                    { value: 'yearly', label: '/yr' },
                                                    { value: 'monthly', label: '/mo' },
                                                    { value: 'hourly', label: '/hr' },
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {/* Start date */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                            Start date <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={counterStartDate}
                                            onChange={(e) => setCounterStartDate(e.target.value)}
                                            className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                                        />
                                    </div>

                                    {/* Benefits */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                            Benefits <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                                        </label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newBenefit}
                                                onChange={(e) => setNewBenefit(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                                                placeholder="Add a benefit…"
                                                className="flex-1 h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={addBenefit}
                                                className="h-11 px-4 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
                                            >
                                                Add
                                            </button>
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

                                    {/* Message */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                                            Message <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                                        </label>
                                        <textarea
                                            value={counterNote}
                                            onChange={(e) => setCounterNote(e.target.value)}
                                            placeholder="Explain your counter offer…"
                                            rows={3}
                                            className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleCounterOffer}
                                        disabled={submitting}
                                        className="w-full h-11 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Submitting…
                                            </>
                                        ) : (
                                            <>Submit counter offer <ArrowRight size={14} /></>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setShowCounterOffer(false)}
                                        disabled={submitting}
                                        className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default OfferResponse;
