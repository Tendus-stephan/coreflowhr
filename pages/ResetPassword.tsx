import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabase';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Supabase puts the recovery tokens in the URL hash.
  // onAuthStateChange fires PASSWORD_RECOVERY once the hash is parsed.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check if a session already exists (e.g. page refresh after landing)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to update password.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex justify-center items-center gap-2 mb-3 text-gray-400 hover:text-gray-900 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Sign in</span>
        </Link>
        <div className="flex justify-center mb-2">
          <img
            src="/assets/images/coreflow-favicon-logo.png"
            alt="CoreFlow"
            className="object-contain"
            style={{ width: '120px', height: '120px' }}
          />
        </div>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-gray-900">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a new password for your account.
        </p>
      </div>

      <div className="mt-8 w-full max-w-md">
        <div className="bg-white py-8 px-4 sm:rounded-xl sm:px-10 border border-gray-100">
          {!ready && !success && (
            <p className="text-sm text-gray-500 text-center">Verifying reset link…</p>
          )}

          {ready && !success && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                  {error}
                </div>
              )}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full appearance-none rounded-lg border border-gray-200 px-3 py-2 pr-10 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 sm:text-sm transition-colors bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="block w-full appearance-none rounded-lg border border-gray-200 px-3 py-2 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 sm:text-sm transition-colors bg-white"
                    />
                  </div>
                </div>

                <Button variant="black" className="w-full justify-center" type="submit" disabled={loading}>
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-700 font-medium">Password updated successfully!</p>
              <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
