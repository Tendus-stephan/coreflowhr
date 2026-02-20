import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [verifyingMFA, setVerifyingMFA] = useState(false);
  const { signIn, verifyMFA } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error, requiresMFA: mfaRequired } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Failed to sign in');
      } else if (mfaRequired) {
        // MFA is required - create challenge and show code input
        // Note: TOTP codes come from authenticator app, not email/SMS
        setRequiresMFA(true);
      } else {
        // Regular login - proceed with normal flow
        await handleLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    setVerifyingMFA(true);

    try {
      const { error } = await verifyMFA(mfaCode);
      if (error) {
        setError(error.message || 'Invalid verification code. Please try again.');
        setMfaCode('');
      } else {
        // MFA verified - proceed with login
        await handleLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      setMfaCode('');
    } finally {
      setVerifyingMFA(false);
    }
  };

  const handleLoginSuccess = async () => {
    // Wait a moment for AuthContext to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check email verification and subscription status
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const user = currentSession?.user;
    
    if (!user?.email_confirmed_at) {
      // Email not verified - redirect to verify email page
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }

    // Check subscription status
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('subscription_status, subscription_stripe_id, billing_plan_name')
        .eq('user_id', user.id)
        .single();

      const { hasActiveSubscription } = await import('../services/subscriptionAccess');
      if (!hasActiveSubscription(settings)) {
        navigate('/?pricing=true');
        return;
      }

      // Email verified and has active/trialing subscription - go to dashboard
      // Set flag to show loader on dashboard entry
      sessionStorage.setItem('showDashboardLoader', 'true');
      navigate('/dashboard');
    } catch (settingsError) {
      // If settings query fails, still allow login but redirect to pricing
      console.error('Error checking subscription:', settingsError);
      navigate('/#pricing');
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
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or <Link to="/signup" className="font-semibold text-black hover:underline transition-all">Sign up</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_0_50px_-12px_rgb(0,0,0,0.12)] sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          
          {!requiresMFA ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
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
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="current-password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black bg-white" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-gray-500 hover:text-gray-900 hover:underline">Forgot your password?</Link>
                </div>
              </div>

              <div>
                <Button 
                  variant="black" 
                  className="w-full justify-center" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleMFAVerify}>
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  The code refreshes every 30 seconds. Make sure you're using the latest code.
                </p>
              </div>

              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <input 
                  id="mfa-code" 
                  name="mfa-code" 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required 
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={verifyingMFA}
                  autoFocus
                  placeholder="000000"
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-mono tracking-widest placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  type="button"
                  onClick={() => {
                    setRequiresMFA(false);
                    setMfaCode('');
                    setError(null);
                  }}
                  disabled={verifyingMFA}
                >
                  Back
                </Button>
                <Button 
                  variant="black" 
                  className="flex-1 justify-center" 
                  type="submit"
                  disabled={verifyingMFA || mfaCode.length !== 6}
                >
                  {verifyingMFA ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;