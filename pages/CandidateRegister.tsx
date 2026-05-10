import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../services/supabase';

const CandidateRegister: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<{ id: string; name: string; role: string; job_id: string } | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const validateTokenAndLoadCandidate = async () => {
      if (!candidateId) {
        setError('Candidate ID is required');
        setLoading(false);
        return;
      }

      const token = searchParams.get('token');
      if (!token) {
        setError('Registration token is required');
        setLoading(false);
        return;
      }

      try {
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidates')
          .select('id, name, role, job_id, registration_token, registration_token_expires_at, registration_token_used, email')
          .eq('id', candidateId)
          .single();

        if (candidateError || !candidateData) {
          setError('Candidate not found');
          setLoading(false);
          return;
        }

        if (candidateData.email) {
          setError('This candidate already has an email registered');
          setLoading(false);
          return;
        }

        if (!candidateData.registration_token || candidateData.registration_token !== token) {
          setError('Invalid registration token');
          setLoading(false);
          return;
        }

        if (candidateData.registration_token_used) {
          setError('This registration link has already been used');
          setLoading(false);
          return;
        }

        const expiresAt = candidateData.registration_token_expires_at
          ? new Date(candidateData.registration_token_expires_at)
          : null;

        if (expiresAt && expiresAt < new Date()) {
          setError('This registration link has expired. Please contact the recruiter for a new link.');
          setLoading(false);
          return;
        }

        setCandidate({
          id: candidateData.id,
          name: candidateData.name,
          role: candidateData.role || '',
          job_id: candidateData.job_id
        });

      } catch (err: any) {
        setError(err.message || 'Failed to validate registration link');
      } finally {
        setLoading(false);
      }
    };

    validateTokenAndLoadCandidate();
  }, [candidateId, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!candidateId || !candidate) {
      setError('Invalid registration link');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setError('Registration token is missing');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.candidates.register(candidateId, token, email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full shadow-sm">
          <div className="text-center">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Validating registration link…</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full shadow-sm">
          <div className="text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
              <polyline points="4,12 9,17 20,6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Registration complete</h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              Your email has been registered successfully. You'll receive an email shortly with instructions on how to upload your CV.
            </p>
            <p className="text-xs text-gray-400">Please check your inbox for the next steps.</p>
          </div>
        </div>
        <div className="mt-8">
          <a href="https://www.coreflowhr.com" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm">
            <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
            Powered by CoreflowHR
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full shadow-sm">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Register your email</h1>
          {candidate ? (
            <p className="text-sm text-gray-500">
              Hi <span className="font-medium text-gray-700">{candidate.name}</span>, please register your email to continue.
            </p>
          ) : (
            <p className="text-sm text-gray-500">Please register your email to continue.</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3.5 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{error.trim()}</p>
          </div>
        )}

        {/* Position badge */}
        {candidate?.role && (
          <div className="mb-6 flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <Briefcase size={15} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Position</p>
              <p className="text-sm font-medium text-gray-800">{candidate.role}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
              placeholder="your.email@example.com"
              required
              disabled={submitting || loading}
            />
          </div>

          <Button
            type="submit"
            variant="black"
            className="w-full !py-3 !rounded-xl text-sm font-semibold"
            disabled={submitting || !email || loading}
          >
            {submitting ? 'Registering…' : 'Register email'}
          </Button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
          By registering, you agree to receive communications regarding this position.
        </p>
      </div>

      <div className="mt-8">
        <a href="https://www.coreflowhr.com" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm">
          <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
          Powered by CoreflowHR
        </a>
      </div>
    </div>
  );
};

export default CandidateRegister;
