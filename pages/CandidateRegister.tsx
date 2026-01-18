import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
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

  // Validate token and load candidate data
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
        // Load candidate data and validate token
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

        // Token is valid - set candidate data
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
      
      // Don't redirect to CV upload page - candidate will receive Screening email with CV upload link
      // They can upload CV via the link in the email
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full mb-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Validating registration link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full mb-0">
          <div className="text-center">
            <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-gray-600 mb-4">
              Your email has been registered successfully. You'll receive an email shortly with instructions on how to upload your CV.
            </p>
            <p className="text-sm text-gray-500">Please check your inbox for the next steps.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full mb-0">
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <Mail size={32} className="text-gray-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Register Your Email</h1>
          {candidate ? (
            <p className="text-sm text-gray-600 text-center">
              Hi <span className="font-semibold">{candidate.name}</span>, please register your email to continue.
            </p>
          ) : (
            <p className="text-sm text-gray-600 text-center">
              Please register your email to continue.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 whitespace-normal">{error.trim()}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-colors"
              placeholder="your.email@example.com"
              required
              disabled={submitting || loading}
            />
          </div>

          {candidate?.role && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">Position:</p>
              <p>{candidate.role}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="black"
            className="w-full"
            disabled={submitting || !email || loading}
          >
            {submitting ? 'Registering...' : 'Register Email'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CandidateRegister;
