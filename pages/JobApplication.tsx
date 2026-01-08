import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Briefcase, MapPin, DollarSign, Clock, FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

const JobApplication: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: ''
  });

  // Load job data and validate token if present
  useEffect(() => {
    const loadJobAndValidateToken = async () => {
      if (!jobId) {
        setError('Job ID is required');
        setLoading(false);
        return;
      }

      try {
        // Load job data
        const jobData = await api.jobs.get(jobId);
        setJob(jobData);

        // Check for token in URL
        const searchParams = new URLSearchParams(window.location.search);
        let token = searchParams.get('token');
        // Clean token - remove any trailing quotes or invalid characters that might have been URL encoded
        if (token) {
          token = token.replace(/["']+$/, '').trim();
        }

        if (token) {
          // Validate token
          const { data: candidateData, error: tokenError } = await supabase
            .from('candidates')
            .select('id, name, email, cv_upload_token, cv_upload_token_expires_at, job_id')
            .eq('cv_upload_token', token)
            .eq('job_id', jobId)
            .single();

          if (tokenError || !candidateData) {
            setPrefillError('Invalid or expired CV upload link. You can still apply manually below.');
          } else {
            // Check if token is expired
            if (candidateData.cv_upload_token_expires_at) {
              const expiresAt = new Date(candidateData.cv_upload_token_expires_at);
              if (expiresAt < new Date()) {
                setPrefillError('This CV upload link has expired. You can still apply manually below.');
              } else {
                // Valid token - pre-fill data
                setFormData(prev => ({
                  ...prev,
                  name: candidateData.name || '',
                  email: candidateData.email || ''
                }));
                setPrefillMessage('We\'ve pre-filled your information. Please upload your CV to complete your application.');
              }
            } else {
              setPrefillError('Invalid CV upload link. You can still apply manually below.');
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading job:', err);
        setError(err.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    loadJobAndValidateToken();
  }, [jobId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setCvFile(file);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    if (!cvFile) {
      setError('Please upload your CV');
      return;
    }

    if (!jobId) {
      setError('Job ID is missing');
      return;
    }

    setSubmitting(true);

    try {
      const result = await api.candidates.apply(jobId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        coverLetter: formData.coverLetter || undefined,
        cvFile: cvFile
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to submit application');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button variant="black" onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your interest. We've received your application and will review it shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Job Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 aspect-square max-h-[500px] sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Details</h2>
            
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Briefcase size={16} />
                  <span className="font-medium">Position</span>
                </div>
                <p className="text-gray-900 font-semibold">{job?.title}</p>
              </div>

              {job?.company && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Briefcase size={16} />
                    <span className="font-medium">Company</span>
                  </div>
                  <p className="text-gray-900">{job.company}</p>
                </div>
              )}

              {job?.location && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MapPin size={16} />
                    <span className="font-medium">Location</span>
                  </div>
                  <p className="text-gray-900">{job.location}</p>
                </div>
              )}

              {job?.type && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock size={16} />
                    <span className="font-medium">Type</span>
                  </div>
                  <p className="text-gray-900">{job.type}</p>
                </div>
              )}

              {job?.salaryRange && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <DollarSign size={16} />
                    <span className="font-medium">Salary</span>
                  </div>
                  <p className="text-gray-900">{job.salaryRange}</p>
                </div>
              )}

              {job?.experienceLevel && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Briefcase size={16} />
                    <span className="font-medium">Experience</span>
                  </div>
                  <p className="text-gray-900">{job.experienceLevel}</p>
                </div>
              )}

              {job?.skills && job.skills.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <FileText size={16} />
                    <span className="font-medium">Required Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.slice(0, 6).map((skill: string, idx: number) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 6 && (
                      <span className="text-gray-500 text-xs">+{job.skills.length - 6} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for {job?.title}</h1>
            <p className="text-gray-600 mb-8">Fill out the form below to submit your application</p>

            {/* Pre-fill Messages */}
            {prefillMessage && (
              <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                {prefillMessage}
              </div>
            )}

            {prefillError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {prefillError}
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="john.doe@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Cover Letter */}
              <div>
                <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  id="coverLetter"
                  rows={6}
                  value={formData.coverLetter}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Tell us why you're interested in this position..."
                />
              </div>

              {/* CV Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CV/Resume <span className="text-red-500">*</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : cvFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  
                  {cvFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 text-green-600 mx-auto" />
                      <p className="text-sm font-medium text-gray-900">{cvFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCvFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-sm text-red-600 hover:text-red-700 mt-2"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Drag and drop your CV here, or
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          browse to upload
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, or DOCX (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="black"
                disabled={submitting || !cvFile}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApplication;






