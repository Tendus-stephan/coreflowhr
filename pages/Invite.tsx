import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Invite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  const token = searchParams.get('token') || '';

  // Security: always force sign-out when visiting an invite link so acceptance
  // is done only after an explicit login/signup with the correct email.
  useEffect(() => {
    if (!token || loading) return;
    if (user) {
      signOut();
    }
  }, [token, user, loading, signOut]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link. Please check that you copied the full URL.');
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    api.workspaces.getInviteByToken(token).then((r) => {
      if (!cancelled) {
        setInviteEmail(r.found && r.email ? r.email : null);
        setInviteLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setInviteLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const handleGoToAuth = (path: '/login' | '/signup') => {
    if (token) {
      try {
        localStorage.setItem('workspaceInviteToken', token);
      } catch {
        // ignore
      }
    }
    navigate(`${path}?invite_token=${encodeURIComponent(token)}`);
  };

  const emailMatches = inviteEmail && user?.email
    ? user.email.trim().toLowerCase() === inviteEmail.trim().toLowerCase()
    : false;

  useEffect(() => {
    if (!token || loading || status !== 'idle') return;
    if (!user) return;
    if (inviteLoading || inviteEmail === null) return;
    if (!inviteEmail) {
      setStatus('error');
      setMessage('This invite link is invalid or has expired.');
      return;
    }
    if (!emailMatches) return;

    const accept = async () => {
      setStatus('accepting');
      setMessage('Accepting your invite…');
      const result = await api.workspaces.acceptInvite(token);
      if (!result.success) {
        if (result.error && result.error.toLowerCase().includes('not authenticated')) {
          setStatus('idle');
          setMessage('');
          handleGoToAuth('/login');
          return;
        }
        setStatus('error');
        setMessage(result.error || 'Failed to accept invite. It may have expired.');
        return;
      }
      setStatus('success');
      setMessage('Invite accepted. Redirecting you to your dashboard…');
      setTimeout(() => navigate('/dashboard'), 1500);
    };

    accept();
  }, [token, user, loading, status, inviteLoading, inviteEmail, emailMatches, navigate]);

  const showAuthCta = !loading && !user && !!token;
  const showWrongAccount = !loading && !!user && !!token && !!inviteEmail && !emailMatches;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 shadow-sm p-8 bg-white">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Workspace Invitation</h1>
        <p className="text-sm text-gray-600 mb-6">
          You’ve been invited to join a CoreFlowHR workspace. Accept the invitation to start collaborating with your team.
        </p>

        {status === 'error' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 text-amber-700">{message}</p>
            <button
              type="button"
              onClick={() => { setStatus('idle'); setMessage(''); }}
              className="mt-3 text-sm font-medium text-amber-800 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
        {status === 'accepting' && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {message}
          </div>
        )}
        {status === 'success' && (
          <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {showWrongAccount && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <p className="font-medium">Wrong account</p>
            <p className="mt-1 text-amber-700">
              This invitation was sent to <strong>{inviteEmail}</strong>. You're signed in as <strong>{user?.email}</strong>. To accept, use the invited email address.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => signOut().then(() => { setInviteEmail(null); setStatus('idle'); setMessage(''); })}
                className="inline-flex justify-center px-4 py-2 rounded-lg border border-amber-700 text-amber-800 text-sm font-medium hover:bg-amber-100"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={() => handleGoToAuth('/signup')}
                className="inline-flex justify-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Sign up with {inviteEmail}
              </button>
            </div>
          </div>
        )}

        {showAuthCta && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {inviteEmail
                ? `This invite was sent to ${inviteEmail}. Log in or sign up with that email to accept and join the workspace.`
                : 'To accept this invite, please log in or create an account. After signing in, return to this link to join the workspace.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleGoToAuth('/login')}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => handleGoToAuth('/signup')}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-gray-200 bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {!showAuthCta && !showWrongAccount && status === 'idle' && (
          <p className="text-sm text-gray-500">
            {loading || inviteLoading ? 'Checking your session…' : 'Processing your invite…'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Invite;

