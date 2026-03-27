import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Check if email is in URL params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [searchParams, user]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const doRedirect = () => {
      if (!isMounted) return;
      setVerified(true);
      // Route through /auth/redirect so subscription + onboarding checks run
      timer = setTimeout(() => {
        if (isMounted) navigate('/auth/redirect', { replace: true });
      }, 2000);
    };

    // Check if user is already verified
    const checkVerification = async () => {
      if (!user) return;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) doRedirect();
    };

    checkVerification();

    // Listen for auth state changes (when email is confirmed in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) doRedirect();
    });

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up cooldown interval on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const normalizeResendError = (err: any): string => {
    const raw = (err?.message || '').toLowerCase();
    const status = err?.status ?? (err as any)?.code;
    if (status === 429 || raw.includes('rate limit') || raw.includes('too many requests')) {
      return 'Too many requests. Please wait a minute before requesting another email.';
    }
    if (raw.includes('failed to fetch') || raw.includes('network')) {
      return 'We could not reach the email service. Please check your internet connection and try again.';
    }
    return 'We could not resend the verification email right now. Please try again in a moment.';
  };

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0 || resending) return;

    setResending(true);
    setResent(false);
    setResendError(null);
    // Start cooldown immediately — before the API call — so rapid clicks can
    // never queue up multiple sends regardless of success or failure.
    startResendCooldown();

    try {
      // Preserve invite token redirect if one is stored (matches original signup email behaviour)
      let emailRedirectTo = `${window.location.origin}/auth/redirect`;
      try {
        const inviteToken = localStorage.getItem('workspaceInviteToken');
        if (inviteToken) {
          emailRedirectTo = `${window.location.origin}/invite?token=${encodeURIComponent(inviteToken)}`;
        }
      } catch {
        // localStorage unavailable — fall back to /auth/redirect
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo },
      });

      if (error) {
        setResendError(normalizeResendError(error));
        console.error('Error resending email:', error);
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setResendError(normalizeResendError(err));
      console.error('Error resending email:', err);
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Email Verified!
          </h2>
          <p className="mt-4 text-center text-sm text-gray-600">
            Your email has been confirmed. Redirecting you...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-8 text-gray-400 hover:text-gray-900 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Mail className="text-gray-700" size={32} />
          </div>
        </div>

        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Check your email
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 sm:rounded-xl sm:px-10 border border-gray-100">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              We've sent a verification link to
            </p>
            {email && (
              <p className="font-semibold text-gray-900">
                {email}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Click the link in the email to verify your account and activate it.
            </p>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={resending || !email || resendCooldown > 0}
                className="w-full"
              >
                {resending
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </Button>

              {resent && (
                <p className="mt-2 text-sm text-green-600">
                  Verification email sent! Check your inbox.
                </p>
              )}
              {resendError && (
                <p className="mt-2 text-sm text-red-600">
                  {resendError}
                </p>
              )}
            </div>

            <div className="pt-4">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Make sure to check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

