import React, { useState, useEffect } from 'react';
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
    // Check if user is already verified
    const checkVerification = async () => {
      if (user) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        setVerified(true);
        // Redirect to login after email confirmation
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
      }
    };

    checkVerification();

    // Listen for auth state changes (when email is confirmed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setVerified(true);
        // Redirect to login after email confirmation
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [user, navigate]);

  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) return;

    setResending(true);
    setResent(false);
    setResendError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setResendError(error.message || 'Failed to send email. Please check your Supabase email configuration.');
        console.error('Error resending email:', error);
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setResendError(err.message || 'Failed to send email. Please check your Supabase email configuration.');
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
            Your email has been confirmed. Redirecting to login...
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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="text-blue-600" size={32} />
          </div>
        </div>

        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Check your email
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 shadow-[0_0_50px_-12px_rgb(0,0,0,0.12)] sm:rounded-2xl sm:px-10 border border-gray-100">
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

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={resending || resent || !email}
                className="w-full"
              >
                {resending ? 'Sending...' : resent ? 'Email Sent!' : 'Resend Verification Email'}
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

