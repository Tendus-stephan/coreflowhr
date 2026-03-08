import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import { sanitizeError } from '../utils/edgeFunctionError';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite_token') || '';
  const loginPath = inviteToken ? `/login?invite_token=${encodeURIComponent(inviteToken)}` : '/login';

  // Keep invite token in URL and localStorage so post-signup redirect goes to /invite
  useEffect(() => {
    if (inviteToken) {
      try {
        localStorage.setItem('workspaceInviteToken', inviteToken);
      } catch {
        // ignore
      }
    }
  }, [inviteToken]);

  // Invite flow: prefill and lock email from invite
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    api.workspaces.getInviteByToken(inviteToken).then((r) => {
      if (cancelled) return;
      if (r.found && r.email) {
        setEmail(r.email);
        setInviteEmailLocked(true);
      } else {
        setInviteInvalid(true);
      }
    }).catch(() => {
      if (!cancelled) setInviteInvalid(true);
    });
    return () => { cancelled = true; };
  }, [inviteToken]);

  // Helper function to simplify password validation errors
  const normalizePasswordError = (errorMessage: string): string => {
    if (errorMessage?.includes('Password should contain at least one character')) {
      return 'Password must contain uppercase, lowercase, numbers, and special characters';
    }
    // Check for user already exists errors
    if (errorMessage?.includes('already exists') || errorMessage?.includes('already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    return errorMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, name);
      if (error) {
        // Check if this is a "user already exists" error
        const errorMsg = sanitizeError(error.message, 'Failed to create account');
        const normalizedError = normalizePasswordError(errorMsg);
        
        if (normalizedError.includes('already exists') || normalizedError.includes('already registered')) {
          // User already exists - show error, don't redirect
          setError(normalizedError);
        } else if (errorMsg?.includes('email') || errorMsg?.includes('sending')) {
          const verifyUrl = `/verify-email?email=${encodeURIComponent(email)}`;
          setTimeout(() => navigate(verifyUrl, { replace: true }), 0);
          return;
        } else {
          // Other errors - show error message
          setError(normalizedError);
        }
      } else {
        // Account created successfully - go to verify email page after auth state settles
        // (defer so route doesn't flicker to login; use replace so back button doesn't return to signup)
        const verifyUrl = `/verify-email?email=${encodeURIComponent(email)}`;
        setTimeout(() => {
          navigate(verifyUrl, { replace: true });
        }, 0);
      }
    } catch (err: any) {
      const errorMsg = sanitizeError(err?.message, 'An unexpected error occurred');
      setError(normalizePasswordError(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-3 text-gray-400 hover:text-gray-900 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <div className="flex justify-center mb-2">
            <img 
              src="/assets/images/coreflow-favicon-logo.png" 
              alt="CoreFlow" 
              className="object-contain"
              style={{ 
                width: '120px',
                height: '120px'
              }}
            />
        </div>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-gray-900">
          {inviteEmailLocked ? 'Join your team' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or <Link to={loginPath} className="font-semibold text-black hover:underline transition-all">Sign in</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_0_50px_-12px_rgb(0,0,0,0.12)] sm:rounded-2xl sm:px-10 border border-gray-100">
          {inviteInvalid && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              This invite has expired or is invalid. Ask your admin to send a new invitation.
              <Link to="/" className="block mt-2 font-medium hover:underline">Go to homepage</Link>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
              {error}
            </div>
          )}
          {!inviteEmailLocked && (
            <>
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-gray-400">or</span>
                </div>
              </div>
            </>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input 
                  id="name" 
                  name="name" 
                  type="text" 
                  autoComplete="name" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email}
                  onChange={(e) => !inviteEmailLocked && setEmail(e.target.value)}
                  readOnly={inviteEmailLocked}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-700" 
                />
                {inviteEmailLocked && (
                  <p className="mt-1 text-xs text-gray-500">This invite was sent to this email address.</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="new-password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1 relative">
                <input 
                  id="confirm-password" 
                  name="confirm-password" 
                  type={showConfirmPassword ? "text" : "password"} 
                  autoComplete="new-password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
                <input id="terms" name="terms" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black bg-white" required />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                    I agree to the <Link to="/terms" className="text-black font-medium hover:underline">Terms</Link> and <Link to="/privacy" className="text-black font-medium hover:underline">Privacy Policy</Link>
                </label>
            </div>

            <div>
              <Button 
                variant="black" 
                className="w-full justify-center" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;