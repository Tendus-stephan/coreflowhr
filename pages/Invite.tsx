import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Invite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link. Please check that you copied the full URL.');
    }
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

  useEffect(() => {
    if (!token || !user || loading || status !== 'idle') return;

    const accept = async () => {
      setStatus('accepting');
      setMessage('Accepting your invite…');
      const result = await api.workspaces.acceptInvite(token);
      if (!result.success) {
        // If backend says "Not authenticated", send the user through login/signup flow
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
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    };

    accept();
  }, [token, user, loading, status, navigate]);

  const showAuthCta = !loading && !user && !!token;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 shadow-sm p-8 bg-white">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Workspace Invitation</h1>
        <p className="text-sm text-gray-600 mb-6">
          You’ve been invited to join a CoreFlowHR workspace. Accept the invitation to start collaborating with your team.
        </p>

        {status === 'error' && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
            {message}
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

        {showAuthCta && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              To accept this invite, please log in or create an account. After signing in, come back to this link to finish joining the
              workspace.
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

        {!showAuthCta && status === 'idle' && (
          <p className="text-sm text-gray-500">
            {loading ? 'Checking your session…' : 'Processing your invite…'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Invite;

