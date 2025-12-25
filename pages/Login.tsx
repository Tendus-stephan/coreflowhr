import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Failed to sign in');
      } else {
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

          const isSubscribed = 
            settings?.subscription_status === 'active' || 
            (settings?.billing_plan_name && settings.billing_plan_name !== 'Basic' && settings.billing_plan_name !== 'Free') ||
            settings?.subscription_stripe_id !== null;

          if (!isSubscribed) {
            // Not subscribed - redirect to landing page pricing section
            navigate('/?pricing=true');
            return;
          }

          // Email verified and subscribed - go to dashboard
          navigate('/dashboard');
        } catch (settingsError) {
          // If settings query fails, still allow login but redirect to pricing
          console.error('Error checking subscription:', settingsError);
          navigate('/#pricing');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-8 text-gray-400 hover:text-gray-900 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <div className="flex justify-center">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-xl shadow-black/20">
                 <span className="text-3xl font-bold font-serif italic">C</span>
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
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
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-colors bg-white" 
                />
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
        </div>
      </div>
    </div>
  );
};

export default Login;