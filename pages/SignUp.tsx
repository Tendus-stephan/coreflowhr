import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

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
        const errorMsg = error.message || 'Failed to create account';
        const normalizedError = normalizePasswordError(errorMsg);
        
        if (normalizedError.includes('already exists') || normalizedError.includes('already registered')) {
          // User already exists - show error, don't redirect
          setError(normalizedError);
        } else if (errorMsg?.includes('email') || errorMsg?.includes('sending')) {
          // Account created but email failed - redirect to verify email page
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        } else {
          // Other errors - show error message
          setError(normalizedError);
        }
      } else {
        // Account created successfully - redirect to verify email page
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or <Link to="/login" className="font-semibold text-black hover:underline transition-all">Sign in</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_0_50px_-12px_rgb(0,0,0,0.12)] sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
              {error}
            </div>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
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