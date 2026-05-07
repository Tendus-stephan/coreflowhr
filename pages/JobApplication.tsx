import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { MapPin, Clock, DollarSign, Building2, Upload, FileText, X, AlertCircle, ArrowRight, Briefcase } from 'lucide-react';
import { supabase } from '../services/supabase';

const JobApplication: React.FC = () => {
  const { jobId, workspaceSlug, jobSlug } = useParams<{
    jobId?: string;
    workspaceSlug?: string;
    jobSlug?: string;
  }>();

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
  const [resolvedJobId, setResolvedJobId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedinUrl: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!jobId && !(workspaceSlug && jobSlug)) {
        setError('Job not found');
        setLoading(false);
        return;
      }
      try {
        let jobQuery;
        if (workspaceSlug && jobSlug) {
          const { data: ws } = await supabase
            .from('workspaces').select('id').eq('slug', workspaceSlug).single();
          if (!ws) throw new Error('Job not found or is no longer accepting applications');
          jobQuery = supabase
            .from('jobs')
            .select('id, title, department, location, type, status, applicants_count, posted_date, created_at, description, company, salary_range, remote, skills')
            .eq('workspace_id', ws.id).eq('slug', jobSlug).eq('status', 'Active').single();
        } else {
          jobQuery = supabase
            .from('jobs')
            .select('id, title, department, location, type, status, applicants_count, posted_date, created_at, description, company, salary_range, remote, skills')
            .eq('id', jobId!).eq('status', 'Active').single();
        }
        const { data: jobData, error: jobError } = await jobQuery;
        if (jobError || !jobData) throw new Error('Job not found or is no longer accepting applications');

        setResolvedJobId(jobData.id);
        setJob({
          id: jobData.id, title: jobData.title,
          department: jobData.department || 'General',
          location: jobData.location, type: jobData.type,
          description: jobData.description || '',
          company: jobData.company, salaryRange: jobData.salary_range,
          remote: jobData.remote || false, skills: jobData.skills || [],
        });

        const searchParams = new URLSearchParams(window.location.search);
        let token = searchParams.get('token');
        if (token) token = token.replace(/["']+$/, '').trim();
        if (token) {
          const { data: cd, error: te } = await supabase
            .from('candidates')
            .select('id, name, email, cv_upload_token_expires_at')
            .eq('cv_upload_token', token).eq('job_id', jobData.id).single();
          if (te || !cd) {
            setPrefillError('Invalid or expired link. You can still apply below.');
          } else if (cd.cv_upload_token_expires_at && new Date(cd.cv_upload_token_expires_at) < new Date()) {
            setPrefillError('This link has expired. You can still apply below.');
          } else {
            setFormData(p => ({ ...p, name: cd.name || '', email: cd.email || '' }));
            setPrefillMessage("We've pre-filled your details. Upload your CV to complete your application.");
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId, workspaceSlug, jobSlug]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !['.pdf', '.doc', '.docx'].includes(ext)) {
      setError('Please upload a PDF, DOC, or DOCX file'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('File size must be less than 5MB'); return; }
    setCvFile(file); setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!formData.name || !formData.email) { setError('Name and email are required'); return; }
    if (!cvFile) { setError('Please upload your CV'); return; }
    if (!resolvedJobId) { setError('Job ID is missing'); return; }
    setSubmitting(true);
    try {
      const result = await api.candidates.apply(resolvedJobId, {
        name: formData.name, email: formData.email,
        phone: formData.phone || undefined,
        coverLetter: formData.coverLetter || undefined,
        cvFile, linkedinProfileUrl: formData.linkedinUrl || undefined,
      });
      if (result.success) setSuccess(true);
      else setError(result.message || 'Failed to submit application');
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
        <img src="/assets/images/coreflow-favicon-logo.png" alt="CoreflowHR" className="object-contain mb-6" style={{ width: '120px', height: '120px' }} />
        <div className="w-full max-w-xl text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Role unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">Powered by CoreflowHR</p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
        <img src="/assets/images/coreflow-favicon-logo.png" alt="CoreflowHR" className="object-contain mb-6" style={{ width: '120px', height: '120px' }} />
        <div className="w-full max-w-xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application received</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Thanks for applying for <strong className="text-gray-700">{job?.title}</strong>.
            We'll be in touch if you're shortlisted.
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">Powered by CoreflowHR</p>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Page body */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ── LEFT PANEL: job info ── */}
        <div className="lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white">
          <div className="px-10 py-10 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto flex flex-col">

            {/* Role title */}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-6">{job?.title}</h1>

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {(job?.location || job?.remote) && (() => {
                const isRemoteOnly = !job.location || job.location.toLowerCase() === 'remote';
                const label = isRemoteOnly && job.remote
                  ? 'Remote'
                  : job.location + (job.remote ? ' · Remote' : '');
                return (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                    <MapPin size={11} className="text-gray-400" /> {label}
                  </span>
                );
              })()}
              {job?.type && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                  <Clock size={11} className="text-gray-400" /> {job.type}
                </span>
              )}
              {job?.salaryRange && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                  <DollarSign size={11} className="text-gray-400" /> {job.salaryRange}
                </span>
              )}
            </div>

            {/* Description */}
            {job?.description && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">About the role</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {job.description.length > 800
                    ? job.description.slice(0, 800) + '…'
                    : job.description}
                </p>
              </div>
            )}

            {/* Skills */}
            {job?.skills?.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s: string, i: number) => (
                    <span key={i} className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}


            {/* Platform attribution */}
            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-3">
              <span className="text-xs text-gray-300 whitespace-nowrap">Hiring powered by</span>
              <img
                src="/assets/images/coreflow-logo.png"
                alt="CoreflowHR"
                style={{ height: '140px', width: 'auto', display: 'block', opacity: 0.65 }}
              />
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL: form ── */}
        <div className="flex-1 bg-gray-50/60">
          <div className="max-w-xl mx-auto px-8 py-10">

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Apply for this role</h2>
              <p className="text-sm text-gray-400">Fill in your details and attach your CV.</p>
            </div>

            {/* Banners */}
            {prefillMessage && (
              <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-600">
                <CheckCircle size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                {prefillMessage}
              </div>
            )}
            {prefillError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {prefillError}
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Full name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                </label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Email <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                </label>
                <input
                  type="email" required value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Phone <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                </label>
                <input
                  type="tel" value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+44 7700 900000"
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  LinkedIn <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                </label>
                <input
                  type="url" value={formData.linkedinUrl}
                  onChange={e => setFormData(p => ({ ...p, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/janesmith"
                  className="w-full h-11 px-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
                />
              </div>

              {/* Cover letter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Cover letter <span className="text-gray-300 normal-case tracking-normal font-normal">Optional</span>
                </label>
                <textarea
                  rows={4} value={formData.coverLetter}
                  onChange={e => setFormData(p => ({ ...p, coverLetter: e.target.value }))}
                  placeholder="Tell us why you're a great fit…"
                  className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors resize-none"
                />
              </div>

              {/* CV upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  CV / Resume <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                </label>
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag}
                  onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => !cvFile && fileInputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-xl transition-all',
                    cvFile ? 'border-green-200 bg-green-50/50 cursor-default'
                      : dragActive ? 'border-gray-400 bg-gray-50 cursor-copy'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer',
                  ].join(' ')}
                >
                  <input
                    ref={fileInputRef} type="file" accept=".pdf,.doc,.docx"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  {cvFile ? (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div className="w-9 h-9 bg-white border border-green-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText size={15} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{cvFile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setCvFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-9 px-5 text-center">
                      <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mb-3">
                        <Upload size={16} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Drop your CV here</p>
                      <p className="text-xs text-gray-400">
                        or <span className="text-gray-600 underline underline-offset-2 decoration-gray-400">browse to upload</span>
                      </p>
                      <p className="text-xs text-gray-300 mt-1">PDF, DOC or DOCX · max 5 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !cvFile}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>Submit application <ArrowRight size={14} /></>
                )}
              </button>

            </form>
          </div>
        </div>

      </div>


    </div>
  );
};

export default JobApplication;
