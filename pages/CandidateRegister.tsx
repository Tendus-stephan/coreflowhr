import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertCircle, Mail, Briefcase } from 'lucide-react';
import { supabase } from '../services/supabase';

const CandidateRegister: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
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
        console.error('Error validating token:', err);
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
      console.error('Error registering email:', err);
      setError(err.message || 'Failed to register email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Validating registration link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full">
          <div className="text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-gray-700" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Complete</h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Your email has been registered successfully. You'll receive an email shortly with instructions on how to upload your CV.
            </p>
            <p className="text-xs text-gray-400">Please check your inbox for the next steps.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Mail size={24} className="text-gray-700" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Register Your Email</h1>
          {candidate ? (
            <p className="text-sm text-gray-500">
              Hi <span className="font-medium text-gray-700">{candidate.name}</span>, please register your email to continue.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Please register your email to continue.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3.5 bg-gray-100 border border-gray-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">{error.trim()}</p>
          </div>
        )}

        {/* Position badge */}
        {candidate?.role && (
          <div className="mb-6 flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <Briefcase size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Position</p>
              <p className="text-sm font-medium text-gray-800">{candidate.role}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400"
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
            {submitting ? 'Registering...' : 'Register Email'}
          </Button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
          By registering, you agree to receive communications regarding this position.
        </p>
      </div>
    </div>
  );
};

export default CandidateRegister;
