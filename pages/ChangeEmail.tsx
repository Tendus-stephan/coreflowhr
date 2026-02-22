import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
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
    const [sentToNewAddress, setSentToNewAddress] = useState(false); // after confirming from current email
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

    // Step "confirm current": user clicked link in current-email message; verify token then send to new address.
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
            try {
                const verify = await api.auth.verifyEmailChangeToken(confirmCurrentToken);
                if (!verify.success || !verify.newEmail) {
                    setMessage({ type: 'error', text: verify.error || 'Invalid or expired link. Request a new one from the change-email form.' });
                    window.history.replaceState(null, '', window.location.pathname);
                    return;
                }
                const update = await api.auth.updateEmail(verify.newEmail);
                if (update.success) {
                    try {
                        sessionStorage.setItem('pendingEmailChange', verify.newEmail);
                    } catch {
                        // ignore
                    }
                    setSentToNewAddress(true);
                    setMessage({
                        type: 'success',
                        text: `We've sent a confirmation link to ${verify.newEmail}. Click it to complete the change.`,
                    });
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

    // When landed from email-change link (success or error in hash), parse and set flag. Do NOT clear hash yet so Supabase can process tokens.
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
        } catch {
            // ignore
        }
    }, []);

    // Capture initial session email when we have confirmation hash (so we can detect "email changed" on first click).
    useEffect(() => {
        if (!confirmationHashPresent || !session?.user?.email) return;
        if (initialEmailRef.current === null) initialEmailRef.current = (session.user.email || '').toLowerCase();
    }, [confirmationHashPresent, session, session?.user?.email]);

    // After hash is present, wait for auth to process tokens then decide: success if session email changed or matches pending.
    useEffect(() => {
        if (!confirmationHashPresent || authLoading || confirmationDecided.current) return;
        const pending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingEmailChange') : null;
        const decide = () => {
            if (confirmationDecided.current) return;
            const currentSessionEmail = (session?.user?.email || '').toLowerCase();
            const pendingEmail = (pending || '').toLowerCase();
            const initialEmail = (initialEmailRef.current || '').toLowerCase();

            // First click = success: session email changed from initial (Supabase already updated).
            if (session && currentSessionEmail && initialEmail && currentSessionEmail !== initialEmail) {
                confirmationDecided.current = true;
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                try {
                    sessionStorage.removeItem('pendingEmailChange');
                } catch {
                    // ignore
                }
                setEmailChangeJustConfirmed(true);
                setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
                return;
            }
            // Or session already shows new email (matches pending).
            if (session && pending && currentSessionEmail === pendingEmail) {
                confirmationDecided.current = true;
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                try {
                    sessionStorage.removeItem('pendingEmailChange');
                } catch {
                    // ignore
                }
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
            if (pending) {
                try {
                    sessionStorage.removeItem('pendingEmailChange');
                } catch {
                    // ignore
                }
            }
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
        };
        const t = setTimeout(decide, 1500);
        return () => clearTimeout(t);
    }, [confirmationHashPresent, authLoading, session, session?.user?.email]);

    // When session updates to the new email (after Supabase processes hash), mark complete immediately.
    useEffect(() => {
        if (!confirmationHashPresent || authLoading || !session) return;
        const currentSessionEmail = (session.user?.email || '').toLowerCase();
        const initialEmail = (initialEmailRef.current || '').toLowerCase();
        const pending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingEmailChange') : null;
        const pendingEmail = (pending || '').toLowerCase();

        if (currentSessionEmail && initialEmail && currentSessionEmail !== initialEmail) {
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            try {
                sessionStorage.removeItem('pendingEmailChange');
            } catch {
                // ignore
            }
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
            return;
        }
        if (pending && currentSessionEmail === pendingEmail) {
            confirmationDecided.current = true;
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            try {
                sessionStorage.removeItem('pendingEmailChange');
            } catch {
                // ignore
            }
            setEmailChangeJustConfirmed(true);
            setMessage({ type: 'success', text: 'Email changed. Sign in with your new email.' });
        }
    }, [confirmationHashPresent, authLoading, session, session?.user?.email]);

    // After confirmation: send success email if logged in, then sign out and redirect to login (user must log in with new email before dashboard).
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

    // When not logged in but confirmation just happened, redirect to login (user must log in with new email).
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
                setMessage({
                    type: 'success',
                    text: 'Sending confirmation to your current email address. Click the link there; we\'ll then send a link to your new address to complete the change.',
                });
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

    if (authLoading || (session && loading)) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
        );
    }

    const returnTo = { pathname: '/change-email', search: location.search, hash: location.hash };

    // After confirming from current email we sent to new address; show short message.
    if (session && sentToNewAddress) {
        return (
            <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 font-sans">
                <div className="mx-auto w-full max-w-md">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
                        <ArrowLeft size={16} />
                        Back to dashboard
                    </Link>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-xl">
                                <Mail size={24} className="text-gray-700" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">Check your new email</h1>
                        </div>
                        <p className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">
                            {message?.text}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (emailChangeJustConfirmed && session) {
        return (
            <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 font-sans">
                <div className="mx-auto w-full max-w-md text-center">
                    <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-800 font-medium">Email changed. Sign in with your new email.</p>
                    <p className="text-sm text-gray-500 mt-1">Sending confirmation to your new email and redirecting to login…</p>
                </div>
            </div>
        );
    }

    if (session && waitingForSecondConfirmation) {
        return (
            <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 font-sans">
                <div className="mx-auto w-full max-w-md">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
                        <ArrowLeft size={16} />
                        Back to dashboard
                    </Link>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-xl">
                                <Mail size={24} className="text-gray-700" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">Check your new email</h1>
                        </div>
                        <p className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">
                            {message?.text}
                        </p>
                        <p className="mt-4 text-sm text-gray-600">
                            If you didn&apos;t receive an email, the change may already be complete—try signing in with your new email.
                        </p>
                        <Link to="/login" className="mt-4 block">
                            <Button variant="outline" className="w-full">Sign in with new email</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 font-sans">
                <div className="mx-auto w-full max-w-md">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-100 rounded-xl">
                                <Mail size={24} className="text-gray-700" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Change email address</h1>
                                <p className="text-sm text-gray-500">Sign in to update the email you use to sign in.</p>
                            </div>
                        </div>
                        {message && (
                            <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">
                                {message.text}
                            </div>
                        )}
                        {emailChangeJustConfirmed && (
                            <p className="mb-4 text-xs text-gray-500">Redirecting to login in 3 seconds…</p>
                        )}
                        <Link to="/login" state={{ from: returnTo }}>
                            <Button className="w-full">{emailChangeJustConfirmed ? 'Sign in with your new email' : 'Sign in to change email'}</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 font-sans">
        <div className="max-w-xl mx-auto w-full">
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft size={16} />
                Back to dashboard
            </Link>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 rounded-xl">
                        <Mail size={24} className="text-gray-700" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Change email address</h1>
                        <p className="text-sm text-gray-500">Update the email you use to sign in.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Current email</label>
                        <input
                            type="email"
                            value={currentEmail}
                            disabled
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">New email address</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => {
                                setNewEmail(e.target.value);
                                setMessage(null);
                            }}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none"
                            disabled={isUpdating}
                        />
                    </div>
                    {message && (
                        <div className={`p-4 rounded-xl border text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}>
                            {message.text}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleUpdateEmail}
                        disabled={isUpdating || !newEmail.trim()}
                        className="flex items-center gap-2"
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Update email'
                        )}
                    </Button>
                    <p className="text-xs text-gray-500">
                        We’ll send a confirmation link to your current address first; after you click it, we'll send a link to your new address to complete the change.
                    </p>
                </div>
            </div>
        </div>
        </div>
    );
};

export default ChangeEmail;
