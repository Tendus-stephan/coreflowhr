import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const INVITE_REDIRECT_DONE_KEY = 'inviteRedirectDone';

function clearInviteStorage() {
  try {
    localStorage.removeItem('workspaceInviteToken');
    sessionStorage.removeItem(INVITE_REDIRECT_DONE_KEY);
  } catch {
    // ignore
  }
}

const Invite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error' | 'expired'>('idle');
  const [message, setMessage] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const acceptStartedRef = useRef(false);

  const token = searchParams.get('token') || '';
  const [inviteWorkspaceName, setInviteWorkspaceName] = useState<string | null>(null);

  // Persist token only when invite is usable and not wrong-account (so after email verification we can return to /invite).
  const isWrongAccount = !!(inviteEmail && user?.email && inviteEmail.trim().toLowerCase() !== (user.email || '').trim().toLowerCase());
  useEffect(() => {
    if (token && status !== 'error' && status !== 'expired' && !isWrongAccount) {
      try {
        localStorage.setItem('workspaceInviteToken', token);
      } catch {
        // ignore
      }
    }
  }, [token, status, isWrongAccount]);

  // Clear token when invite is unusable or wrong account so user isn't stuck in redirect loop
  useEffect(() => {
    if (status === 'error' || status === 'expired' || isWrongAccount) {
      clearInviteStorage();
    }
  }, [status, isWrongAccount]);

  useEffect(() => {
    if (!token) {
      setStatus('expired');
      setMessage('Invalid invite link. Please check that you copied the full URL.');
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    api.workspaces.getInviteByToken(token).then((r) => {
      if (!cancelled) {
        if (r.found && r.email) {
          setInviteEmail(r.email);
          if (r.workspaceName) setInviteWorkspaceName(r.workspaceName);
          if (r.alreadyAccepted) setAlreadyAccepted(true);
        } else {
          setInviteEmail(null);
          setStatus('expired');
          setMessage('This invite has expired or has already been used. Ask your Admin to send a new one.');
          clearInviteStorage();
        }
        setInviteLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setInviteEmail(null);
        setStatus('expired');
        setMessage('This invite has expired or has already been used. Ask your Admin to send a new one.');
        clearInviteStorage();
        setInviteLoading(false);
      }
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

  const handleGoToHome = () => {
    clearInviteStorage();
    navigate('/', { replace: true });
  };

  const emailMatches = inviteEmail && user?.email
    ? user.email.trim().toLowerCase() === inviteEmail.trim().toLowerCase()
    : false;

  // Already-accepted invite: skip re-accepting and redirect straight to dashboard.
  useEffect(() => {
    if (!alreadyAccepted || loading || !user || !inviteEmail) return;
    if (!emailMatches) return; // wrong account — let the wrong-account UI handle it
    clearInviteStorage();
    setStatus('success');
    setMessage('You\'re already in the workspace. Redirecting to dashboard…');
    setTimeout(() => navigate('/dashboard'), 1500);
  }, [alreadyAccepted, loading, user, inviteEmail, emailMatches, navigate]);

  useEffect(() => {
    if (!token || loading || status !== 'idle') return;
    if (!user) return;
    if (inviteLoading || inviteEmail === null) return;
    if (!inviteEmail) {
      setStatus('expired');
      setMessage('This invite has expired or has already been used. Ask your Admin to send a new one.');
      return;
    }
    if (!emailMatches) return;
    if (alreadyAccepted) return; // handled by the effect above
    if (acceptStartedRef.current) return;
    acceptStartedRef.current = true;

    const accept = async () => {
      setStatus('accepting');
      setMessage('Accepting your invite…');
      const result = await api.workspaces.acceptInvite(token);
      if (!result.success) {
        const errMsg = (result.error || '').toLowerCase();
        if (errMsg.includes('not authenticated')) {
          clearInviteStorage();
          setStatus('error');
          setMessage('Your session may have expired. Please log in again to accept this invite.');
          return;
        }
        // Wrong account: invite was sent to another email — show wrong-account UI (no generic error box)
        if (errMsg.includes('this invitation was sent to') || errMsg.includes('log in or sign up with that email')) {
          const match = (result.error || '').match(/sent to\s+([^\s.]+@[^\s.]+)/i);
          if (match?.[1]) setInviteEmail(match[1].trim());
          setStatus('idle');
          setMessage('');
          return;
        }
        // Invite may already be accepted — if user is already in a workspace, treat as success
        if (errMsg.includes('invalid') || errMsg.includes('expired')) {
          try {
            await api.workspaces.getWorkspaceWithMembers();
            clearInviteStorage();
            setStatus('success');
            setMessage('You\'re already in the workspace. Redirecting to dashboard…');
            setTimeout(() => navigate('/dashboard'), 1500);
            return;
          } catch {
            // Not in a workspace — show error
          }
        }
        clearInviteStorage();
        setStatus('error');
        setMessage(result.error || 'Failed to accept invite. It may have expired.');
        return;
      }
      setStatus('success');
      setMessage('Invite accepted. Redirecting you to your dashboard…');
      clearInviteStorage();
      setTimeout(() => navigate('/dashboard'), 1500);
    };

    accept();
  }, [token, user, loading, status, inviteLoading, inviteEmail, emailMatches, alreadyAccepted, navigate]);

  const showAuthCta = !loading && !user && !!token && status !== 'expired';
  const showWrongAccount = !loading && !!user && !!token && !!inviteEmail && !emailMatches && status !== 'expired';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border border-gray-100 p-10 bg-white">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{status === 'expired' ? 'Invite no longer valid' : 'Workspace Invitation'}</h1>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          You've been invited to join{inviteWorkspaceName ? <> <strong>{inviteWorkspaceName}</strong></> : ' a workspace on CoreFlowHR'}. Accept the invitation to start collaborating with your team.
        </p>

        {status === 'expired' && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-5 text-center">
            <p className="font-semibold text-gray-900">Invite expired</p>
            <p className="mt-2 text-gray-600">{message}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoToHome}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 underline hover:no-underline"
              >
                Go to homepage
              </button>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 bg-white border border-gray-100 border-l-4 border-l-amber-500 rounded-2xl shadow-sm px-4 py-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[13px] font-bold text-gray-900 leading-tight">Something went wrong</p>
              <p className="text-[12px] text-gray-500 mt-0.5">{message}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {message.toLowerCase().includes('log in') ? (
                  <>
                    <button type="button" onClick={() => handleGoToAuth('/login')} className="text-[12px] font-medium text-gray-700 underline hover:no-underline">Log in</button>
                    <button type="button" onClick={handleGoToHome} className="text-[12px] font-medium text-gray-700 underline hover:no-underline">Go to homepage</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { acceptStartedRef.current = false; setStatus('idle'); setMessage(''); }} className="text-[12px] font-medium text-gray-700 underline hover:no-underline">Try again</button>
                    <button type="button" onClick={handleGoToHome} className="text-[12px] font-medium text-gray-700 underline hover:no-underline">Go to homepage</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {status === 'accepting' && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {message}
          </div>
        )}
        {status === 'success' && (
          <div className="mb-4 bg-white border border-gray-100 border-l-4 border-l-green-500 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={14} className="text-white" />
            </div>
            <p className="text-[12px] text-gray-700">{message}</p>
          </div>
        )}

        {showWrongAccount && (
          <div className="mb-6 bg-white border border-gray-100 border-l-4 border-l-amber-500 rounded-2xl shadow-sm px-4 py-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div className="flex-1 pt-0.5">
            <p className="text-[13px] font-bold text-gray-900 leading-tight">Wrong account</p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
              This invitation was sent to <strong className="text-gray-700">{inviteEmail}</strong>. You're signed in as <strong className="text-gray-700">{user?.email}</strong>. To accept, use the invited email address.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGoToHome}
                className="inline-flex justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Go to homepage
              </button>
              <button
                type="button"
                onClick={() => signOut().then(() => { setInviteEmail(null); setStatus('idle'); setMessage(''); })}
                className="inline-flex justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={() => handleGoToAuth('/signup')}
                className="inline-flex justify-center px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Sign up with {inviteEmail}
              </button>
            </div>
            </div>
          </div>
        )}

        {showAuthCta && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {inviteEmail
                ? `This invite was sent to ${inviteEmail}. Log in or sign up with that email to accept and join ${inviteWorkspaceName ? inviteWorkspaceName : 'the workspace'}.`
                : `To accept this invite, please log in or create an account. After signing in, return to this link to join ${inviteWorkspaceName ? inviteWorkspaceName : 'the workspace'}.`}
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

        <p className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={handleGoToHome}
            className="text-sm text-gray-500 hover:text-gray-700 underline hover:no-underline"
          >
            Go to homepage
          </button>
        </p>
      </div>
    </div>
  );
};

export default Invite;

