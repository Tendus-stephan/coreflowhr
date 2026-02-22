import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChangeEmail: React.FC = () => {
    const { session, loading: authLoading } = useAuth();
    const location = useLocation();
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    // When landed from email-change link (success or error in hash), show message and clean URL
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
                setMessage({
                    type: 'success',
                    text: 'Confirmation link accepted. Please check the other email and click the link there to complete the change.',
                });
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        } catch {
            // ignore
        }
    }, []);

    const handleUpdateEmail = async (e: React.MouseEvent) => {
        e.preventDefault();
        const email = newEmail.trim();
        if (!email) return;
        setIsUpdating(true);
        setMessage(null);
        try {
            const result = await api.auth.updateEmail(email);
            if (result.success) {
                setMessage({
                    type: 'success',
                    text: `Confirmation sent to ${email}. Check that inbox and click the link to complete the change. Your sign-in email will update after you confirm.`,
                });
                setNewEmail('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update email' });
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
                            <div className={`mb-6 p-4 rounded-xl border text-sm ${
                                message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                                {message.text}
                            </div>
                        )}
                        <Link to="/login" state={{ from: returnTo }}>
                            <Button className="w-full">Sign in to change email</Button>
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
                        <div
                            className={`p-4 rounded-xl border text-sm ${
                                message.type === 'success'
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                        >
                            {message.text}
                        </div>
                    )}
                    <Button
                        type="button"
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
                        We’ll send a confirmation link to the new address. Your sign-in email updates after you click it.
                    </p>
                </div>
            </div>
        </div>
        </div>
    );
};

export default ChangeEmail;
