import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChangeEmail: React.FC = () => {
    const { session, loading: authLoading, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [emailChangeJustConfirmed, setEmailChangeJustConfirmed] = useState(false);
    const [waitingForSecondConfirmation, setWaitingForSecondConfirmation] = useState(false);
    const [sentToNewAddress, setSentToNewAddress] = useState(false);
    const didSendSuccessEmail = useRef(false);
    const initialEmailRef = useRef<string | null>(null);
    const didHandleConfirmCurrent = useRef(false);

    useEffect(() => {
        if (!session) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const user = await api.auth.me();
                if (!cancelled) setCurrentEmail(user.email || '');
            } catch {
                if (!cancelled) setMessage({ type: 'error', text: 'Could not load your email.' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [session]);

    const searchParams = new URLSearchParams(location.search);
    const confirmCurrentToken = searchParams.get('token');
    const stepConfirmCurrent = searchParams.get('step') === 'confirm_current';
    useEffect(() => {
        if (!stepConfirmCurrent || !confirmCurrentToken || didHandleConfirmCurrent.current) return;
        if (authLoading) return;
        if (!session) {
            navigate('/login', { state: { from: { pathname: '/change-email', search: location.search } }, replace: true });
            return;
        }
        didHandleConfirmCurrent.current = true;
        (async () => {
            await new Promise((r) => setTimeout(r, 800));
            const doVerify = () => api.auth.verifyEmailChangeToken(confirmCurrentToken);
            let verify = await doVerify();
            if (!verify.success && verify.error?.includes("couldn't verify the link right now")) {
                await new Promise((r) => setTimeout(r, 2000));
                verify = await doVerify();
            }
            try {
                if (!verify.success || !verify.newEmail) {
                    setMessage({ type: 'error', text: verify.error || 'Invalid or expired link. Request a new one from the change-email form.' });
                    window.history.replaceState(null, '', window.location.pathname);
                    return;
                }
                const update = await api.auth.updateEmail(verify.newEmail);
                if (update.success) {
                    try { sessionStorage.setItem('pendingEmailChange', verify.newEmail); } catch { /* ignore */ }
                    setSentToNewAddress(true);
                    setMessage({ type: 'success', text: `We've sent a confirmation link to ${verify.newEmail}. Click it to complete the change.` });
                    window.history.replaceState(null, '', window.location.pathname);
                } else {
                    setMessage({ type: 'error', text: update.error || 'Failed to send to new address' });
                    window.history.replaceState(null, '', window.location.pathname);
                }
            } catch (err) {
                setMessage({ type: 'error', text: (err as Error).message || 'Something went wrong' });
                window.history.replaceState(null, '', window.location.pathname);
            }
        })();
    }, [stepConfirmCurrent, confirmCurrentToken, session, authLoading, navigate, location.search]);

    const [confirmationHashPresent, setConfirmationHashPresent] = useState(false);
    const confirmationDecided = useRef(false);
    useEffect(() => {
        const hash = window.location.hash || '';
        if (!hash) return;
        try {
            const params = new URLSearchParams(hash.replace(/^#?/, ''));
            const error = params.get('error');
            const errorDesc = params.get('error_description');
            const errorCode = params.get('error_code');
            if (error || errorCode) {
                const isExpired = errorCode === 'otp_expired' || (errorDesc && /expired|invalid/i.test(errorDesc));
                setMessage({
                    type: 'error',
                    text: isExpired
                        ? 'This link has expired or is invalid. Please enter your new email below and click Update email to get a fresh link.'
                        : (errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Something went wrong. Please try again.'),
                });
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                return;
            }
            const msg = params.get('message');
            if (msg && (msg.includes('Confirmation') || msg.includes('link accepted'))) {
                setConfirmationHashPresent(true);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!confirmationHashPresent || !session?.user?.email) return;
        if (initialEmailRef.current === null) initialEmailRef.current = (session.user.email || '').toLowerCase();
    }, [confirmationHashPresent, session, session?.user?.email]);

    useEffect(() => {
        if (!confirmationHashPresent || authLoading || confirmationDecided.current) return;
        const pending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingEmailChange') : null;
        const decide = () => {
            if (confirmationDecided.current) return;
            const currentSessionEmail = (session?.user?.email || '').toLowerCase();
            const pendingEmail = (pending || '').toLowerCase();
            const initialEmail = (initialEmailRef.current || '').toLowerCase();
            if (session && currentSessionEmail && initialEmail && currentSessionEmail !== initialEmail) {
                confirmationDecided.current = true;
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                try { sessionStorage.removeItem('pendingEmailChange'); } catch { /* ignore */ }
                setEmailChangeJustConfirmed(true);
                setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
                return;
            }
            if (session && pending && currentSessionEmail === pendingEmail) {
                confirmationDecided.current = true;
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                try { sessionStorage.removeItem('pendingEmailChange'); } catch { /* ignore */ }
                setEmailChangeJustConfirmed(true);
                setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
                return;
            }
            if (session) {
                confirmationDecided.current = true;
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setWaitingForSecondConfirmation(true);
                setMessage({ type: 'success', text: 'Check your new inbox for the confirmation link.' });
                return;
            }
            if (pending) { try { sessionStorage.removeItem('pendingEmailChange'); } catch { /* ignore */ } }
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
        };
        const t = setTimeout(decide, 1500);
        return () => clearTimeout(t);
    }, [confirmationHashPresent, authLoading, session, session?.user?.email]);

    useEffect(() => {
        if (!confirmationHashPresent || authLoading || !session) return;
        const currentSessionEmail = (session.user?.email || '').toLowerCase();
        const initialEmail = (initialEmailRef.current || '').toLowerCase();
        const pending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingEmailChange') : null;
        const pendingEmail = (pending || '').toLowerCase();
        if (currentSessionEmail && initialEmail && currentSessionEmail !== initialEmail) {
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            try { sessionStorage.removeItem('pendingEmailChange'); } catch { /* ignore */ }
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
            return;
        }
        if (pending && currentSessionEmail === pendingEmail) {
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            try { sessionStorage.removeItem('pendingEmailChange'); } catch { /* ignore */ }
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
        }
    }, [confirmationHashPresent, authLoading, session, session?.user?.email]);

    useEffect(() => {
        if (!emailChangeJustConfirmed) return;
        if (session && !didSendSuccessEmail.current) {
            didSendSuccessEmail.current = true;
            (async () => {
                await api.auth.sendEmailChangeSuccessNotification();
                await signOut();
                navigate('/login', { replace: true, state: { emailChanged: true } });
            })();
        }
    }, [emailChangeJustConfirmed, session, signOut, navigate]);

    useEffect(() => {
        if (!emailChangeJustConfirmed || session || authLoading) return;
        const t = setTimeout(() => navigate('/login', { replace: true, state: { emailChanged: true } }), 3000);
        return () => clearTimeout(t);
    }, [emailChangeJustConfirmed, session, authLoading, navigate]);

    const handleUpdateEmail = async (e: React.MouseEvent) => {
        e.preventDefault();
        const email = newEmail.trim();
        if (!email) return;
        setIsUpdating(true);
        setMessage(null);
        try {
            const result = await api.auth.requestEmailChange(email);
            if (result.success) {
                setMessage({ type: 'success', text: "Confirmation sent to your current address. Click the link there and we'll send a final link to your new address." });
                setNewEmail('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send confirmation' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message || 'Something went wrong' });
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Shared layout shell ──────────────────────────────────────────────────
    const Shell: React.FC<{ backTo?: string; backLabel?: string; children: React.ReactNode }> = ({
        backTo = '/dashboard',
        backLabel = 'Back to dashboard',
        children,
    }) => (
        <div className="min-h-screen bg-white flex flex-col py-16 px-4 font-sans">
            <div className="mx-auto w-full max-w-[440px]">
                <Link
                    to={backTo}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
                >
                    <ArrowLeft size={14} />
                    {backLabel}
                </Link>
                {children}
            </div>
        </div>
    );

    // ── Loading ──────────────────────────────────────────────────────────────
    if (authLoading || (session && loading)) {
        return (
            <Shell>
                <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
            </Shell>
        );
    }

    const returnTo = { pathname: '/change-email', search: location.search, hash: location.hash };

    // ── Sent to new address ──────────────────────────────────────────────────
    if (session && sentToNewAddress) {
        return (
            <Shell>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h1 className="text-base font-semibold text-gray-900">Check your new inbox</h1>
                        <p className="mt-0.5 text-sm text-gray-500">One more step to complete the change.</p>
                    </div>
                    <div className="px-6 py-5">
                        <p className="text-sm text-gray-700">{message?.text}</p>
                    </div>
                </div>
            </Shell>
        );
    }

    // ── Confirmed — signing out ──────────────────────────────────────────────
    if (emailChangeJustConfirmed && session) {
        return (
            <Shell>
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-14 px-6 text-center">
                    <Loader2 size={24} className="animate-spin text-gray-300 mb-4" />
                    <p className="text-sm font-medium text-gray-800">Email updated successfully</p>
                    <p className="mt-1 text-xs text-gray-400">Signing you out and redirecting to login…</p>
                </div>
            </Shell>
        );
    }

    // ── Waiting for second confirmation ──────────────────────────────────────
    if (session && waitingForSecondConfirmation) {
        return (
            <Shell>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h1 className="text-base font-semibold text-gray-900">Check your new inbox</h1>
                        <p className="mt-0.5 text-sm text-gray-500">A confirmation link is on its way.</p>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <p className="text-sm text-gray-700">{message?.text}</p>
                        <p className="text-xs text-gray-400">
                            Didn't get it? The change may already be complete — try signing in with your new email.
                        </p>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <Link to="/login">
                            <Button variant="black" size="sm" className="rounded-lg w-full justify-center">
                                Sign in with new email
                            </Button>
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    // ── Not signed in ────────────────────────────────────────────────────────
    if (!session) {
        return (
            <Shell backTo="/" backLabel="Back to home">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h1 className="text-base font-semibold text-gray-900">Change email address</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Sign in to update the email you use to sign in.</p>
                    </div>
                    <div className="px-6 py-5">
                        {message && (
                            <div className={`mb-4 px-3.5 py-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {message.text}
                            </div>
                        )}
                        {emailChangeJustConfirmed && (
                            <p className="mb-3 text-xs text-gray-400">Redirecting to login in 3 seconds…</p>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <Link to="/login" state={{ from: returnTo }}>
                            <Button variant="black" size="sm" className="rounded-lg w-full justify-center">
                                {emailChangeJustConfirmed ? 'Sign in with your new email' : 'Sign in to continue'}
                            </Button>
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    // ── Main form ────────────────────────────────────────────────────────────
    return (
        <Shell>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <h1 className="text-base font-semibold text-gray-900">Change email address</h1>
                    <p className="mt-0.5 text-sm text-gray-500">Update the email you use to sign in.</p>
                </div>

                {/* Fields */}
                <div className="px-6 py-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-600">Current email</label>
                        <input
                            type="email"
                            value={currentEmail}
                            disabled
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">New email address</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => { setNewEmail(e.target.value); setMessage(null); }}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0 focus:border-gray-900 transition-colors"
                            disabled={isUpdating}
                            onKeyDown={(e) => { if (e.key === 'Enter' && newEmail.trim()) handleUpdateEmail(e as any); }}
                        />
                    </div>
                    {message && (
                        <div className={`px-3.5 py-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-400 leading-snug">
                        We'll send confirmation links to both addresses to verify the change.
                    </p>
                    <Button
                        type="button"
                        variant="black"
                        size="sm"
                        onClick={handleUpdateEmail}
                        disabled={isUpdating || !newEmail.trim()}
                        className="shrink-0 rounded-lg flex items-center gap-1.5"
                    >
                        {isUpdating ? (
                            <><Loader2 size={13} className="animate-spin" />Sending…</>
                        ) : (
                            'Update email'
                        )}
                    </Button>
                </div>
            </div>
        </Shell>
    );
};

export default ChangeEmail;
