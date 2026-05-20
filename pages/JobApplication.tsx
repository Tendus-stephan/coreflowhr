import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { MapPin, Clock, DollarSign, Upload, FileText, X, AlertCircle, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { darkenHex } from '../utils/colorUtils';

const DEFAULT_BANNER = '#1e3a5f';
const buildGradient = (color: string) =>
    `linear-gradient(135deg, ${color} 0%, ${darkenHex(color, 38)} 100%)`;

// ── Shell: used for all full-page state screens ───────────────────────────────
const Shell: React.FC<{
    children: React.ReactNode;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    bannerColor?: string | null;
}> = ({ children, companyName, companyLogoUrl, bannerColor }) => {
    const [logoErr, setLogoErr] = useState(false);
    const gradient = buildGradient(bannerColor || DEFAULT_BANNER);

    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="relative">
                <div className="relative w-full overflow-hidden" style={{ height: '200px', background: gradient }}>
                    <div
                        className="absolute inset-x-0 bottom-0"
                        style={{ height: '80px', background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }}
                    />
                    <svg viewBox="0 0 1440 40" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '40px' }}>
                        <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                    </svg>
                </div>
                <div className="mx-auto px-6 relative" style={{ maxWidth: '560px' }}>
                    <div className="flex items-center gap-4 -mt-10 pb-6">
                        <div
                            className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden"
                            style={{ width: 80, height: 80, borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', border: '0.5px solid #e5e7eb' }}
                        >
                            {companyLogoUrl && !logoErr ? (
                                <img src={companyLogoUrl} alt={companyName || 'Company'} className="w-full h-full object-contain p-2" onError={() => setLogoErr(true)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                    <span className="text-white text-2xl font-extrabold select-none">
                                        {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {companyName && (
                            <div className="min-w-0">
                                <h1 className="font-bold text-gray-900 leading-tight text-lg">{companyName}</h1>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mx-auto px-6 pb-10" style={{ maxWidth: '560px' }}>
                {children}
            </div>
            <div className="flex justify-center pb-12">
                <a href="https://www.coreflowhr.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm">
                    <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
                    Powered by CoreflowHR
                </a>
            </div>
        </div>
    );
};

// ── BannerHeader: used at top of the main two-column layout ───────────────────
const BannerHeader: React.FC<{
    companyName: string;
    companyLogoUrl: string | null;
    bannerColor: string | null;
}> = ({ companyName, companyLogoUrl, bannerColor }) => {
    const [logoErr, setLogoErr] = useState(false);
    const gradient = buildGradient(bannerColor || DEFAULT_BANNER);

    return (
        <div className="relative">
            <div className="relative w-full overflow-hidden" style={{ height: '200px', background: gradient }}>
                <div className="absolute inset-x-0 bottom-0"
                    style={{ height: '80px', background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }} />
                <svg viewBox="0 0 1440 40" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '40px' }}>
                    <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                </svg>
            </div>
            <div className="px-10 relative">
                <div className="flex items-center gap-4 -mt-10 pb-4">
                    <div
                        className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden"
                        style={{ width: 80, height: 80, borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', border: '0.5px solid #e5e7eb' }}
                    >
                        {companyLogoUrl && !logoErr ? (
                            <img src={companyLogoUrl} alt={companyName} className="w-full h-full object-contain p-2" onError={() => setLogoErr(true)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                <span className="text-white text-2xl font-extrabold select-none">
                                    {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 leading-tight text-lg">{companyName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [resolvedJobId, setResolvedJobId] = useState<string | null>(null);

  // Branding
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [bannerColor, setBannerColor] = useState<string | null>(null);

  const [descExpanded, setDescExpanded] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedinUrl: '',
  });

  // Check localStorage on mount so re-visiting the same link shows "already applied"
  useEffect(() => {
    const key = `applied_${jobId || `${workspaceSlug}_${jobSlug}`}`;
    if (localStorage.getItem(key) === 'true') setAlreadyApplied(true);
  }, [jobId, workspaceSlug, jobSlug]);

  useEffect(() => {
    const load = async () => {
      if (!jobId && !(workspaceSlug && jobSlug)) {
        setError('Job not found');
        setLoading(false);
        return;
      }
      try {
        let jobQuery;
        let workspaceId: string | null = null;

        if (workspaceSlug && jobSlug) {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('id, name, company_logo_url, banner_color')
            .eq('slug', workspaceSlug)
            .single();
          if (!ws) throw new Error('Job not found or is no longer accepting applications');
          workspaceId = ws.id;

          // Branding resolved after job fetch (we need client_id from job)
          setBannerColor((ws as any).banner_color ?? null);

          jobQuery = supabase
            .from('jobs')
            .select('id, title, department, location, type, status, applicants_count, posted_date, created_at, description, company, salary_range, remote, skills, workspace_id, client_id')
            .eq('workspace_id', ws.id).eq('slug', jobSlug).eq('status', 'Active').single();
        } else {
          jobQuery = supabase
            .from('jobs')
            .select('id, title, department, location, type, status, applicants_count, posted_date, created_at, description, company, salary_range, remote, skills, workspace_id, client_id')
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

        // Resolve branding: prefer the job's linked client, fall back to workspace
        const resolveWsId = workspaceId || (jobData as any).workspace_id;
        if (resolveWsId) {
          if (!workspaceId) workspaceId = resolveWsId;
          try {
            const clientId = (jobData as any).client_id;
            if (clientId) {
              // Job is linked to a client — use client name + logo
              const { data: client } = await supabase
                .from('clients')
                .select('name, logo_url')
                .eq('id', clientId)
                .single();
              if (client) {
                setCompanyName((client as any).name || jobData.company || '');
                setCompanyLogoUrl((client as any).logo_url ?? null);
              } else {
                setCompanyName(jobData.company || '');
              }
            } else {
              // No client linked — fall back to workspace branding
              const { data: ws } = await supabase
                .from('workspaces')
                .select('name, company_logo_url, banner_color')
                .eq('id', resolveWsId)
                .single();
              if (ws) {
                setCompanyName((ws as any).name || jobData.company || '');
                if (!workspaceSlug) setBannerColor((ws as any).banner_color ?? null);
                setCompanyLogoUrl((ws as any).company_logo_url ?? null);
              } else {
                setCompanyName(jobData.company || '');
              }
            }
          } catch {
            setCompanyName(jobData.company || '');
          }
        }

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
      if (result.success) {
        const key = `applied_${resolvedJobId || jobId || `${workspaceSlug}_${jobSlug}`}`;
        localStorage.setItem(key, 'true');
        setSuccess(true);
      }
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
      <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      </Shell>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !job) {
    return (
      <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Role unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </Shell>
    );
  }

  // ── Already applied (same device re-visit) ────────────────────────────────
  if (alreadyApplied && !success) {
    return (
      <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">You've already applied</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your application for <strong className="text-gray-700">{job?.title || 'this role'}</strong> has already been submitted.
            We'll be in touch if you're shortlisted.
          </p>
        </div>
      </Shell>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <Shell companyName={companyName || null} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Application received</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Thanks for applying for <strong className="text-gray-700">{job?.title}</strong>.
            We'll be in touch if you're shortlisted.
          </p>
        </div>
      </Shell>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">

      {/* Banner + logo header */}
      <BannerHeader companyName={companyName || job?.company || ''} companyLogoUrl={companyLogoUrl} bannerColor={bannerColor} />

      {/* Two-column content */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ── LEFT PANEL: job info ── */}
        <div className="lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white">
          <div className="px-10 py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto flex flex-col">

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
                  {job.description.length > 800 && !descExpanded
                    ? job.description.slice(0, 800) + '…'
                    : job.description}
                </p>
                {job.description.length > 800 && (
                  <button type="button" onClick={() => setDescExpanded(v => !v)} className="text-xs font-medium text-gray-500 hover:text-gray-700 underline mt-1 block">
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
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
            <div className="mt-auto pt-6 border-t border-gray-100">
              <a
                href="https://www.coreflowhr.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all shadow-sm"
              >
                <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
                Powered by CoreflowHR
              </a>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL: form ── */}
        <div className="flex-1 bg-gray-50">
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
                        aria-label="Remove CV"
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
                className="w-full h-11 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
