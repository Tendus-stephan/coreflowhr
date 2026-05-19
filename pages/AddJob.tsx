import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Briefcase, DollarSign, Check, Save } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { api } from '../services/api';
import type { JobTemplate } from '../types';
import { toUserError } from '../utils/edgeFunctionError';
import { useToast } from '../contexts/ToastContext';

const BUILTIN_TEMPLATES: Array<{ name: string; title: string; department: string; location: string; type: 'Full-time' | 'Contract' | 'Part-time'; skills: string; description: string; remote: boolean }> = [
  { name: 'Software Engineer', title: 'Software Engineer', department: 'Engineering', location: '', type: 'Full-time', skills: 'JavaScript, TypeScript, React, Node.js', description: 'We are looking for a software engineer to build and maintain our products.', remote: false },
  { name: 'Product Manager', title: 'Product Manager', department: 'Product', location: '', type: 'Full-time', skills: 'Product strategy, Roadmapping, Agile, User research', description: 'Drive product vision and work with engineering and design.', remote: false },
  { name: 'Sales Representative', title: 'Sales Representative', department: 'Sales', location: '', type: 'Full-time', skills: 'Communication, CRM, Negotiation', description: 'Generate leads and close deals with new and existing clients.', remote: false },
];

// --- Preview Modal ---
const PreviewModal = ({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: any }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Job Preview</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8">
          <div className="border-b border-gray-100 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.title || 'Untitled Job Title'}</h1>
            <div className="flex items-center gap-2 text-lg text-gray-600 font-medium">
              {data.company || 'Company Name'}
              {data.remote && <><span className="text-gray-400">•</span><span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-sm border border-gray-200">Remote</span></>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 uppercase font-semibold tracking-widest">Location</span>
              <div className="flex items-center gap-2 text-gray-900 font-medium"><MapPin size={14} className="text-gray-400" />{data.location || 'Not specified'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 uppercase font-semibold tracking-widest">Type</span>
              <div className="flex items-center gap-2 text-gray-900 font-medium"><Briefcase size={14} className="text-gray-400" />{data.type}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 uppercase font-semibold tracking-widest">Salary</span>
              <div className="flex items-center gap-2 text-gray-900 font-medium"><DollarSign size={14} className="text-gray-400" />{data.salary || 'Not specified'}</div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {data.skills ? data.skills.split(',').map((s: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">{s.trim()}</span>
              )) : <span className="text-gray-400 text-sm italic">No skills listed</span>}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">About the Role</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{data.description || 'No description provided.'}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const AddJob: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;
  const toast = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    title: string; company: string; location: string;
    type: 'Full-time' | 'Contract' | 'Part-time';
    salary: string; remote: boolean; skills: string; description: string; clientId?: string;
  }>({ title: '', company: '', location: '', type: 'Full-time', salary: '', remote: false, skills: '', description: '', clientId: undefined });

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [saveAsTemplateName, setSaveAsTemplateName] = useState('');
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [canCreateJobs, setCanCreateJobs] = useState<boolean | null>(null);

  const applyTemplate = (t: JobTemplate | typeof BUILTIN_TEMPLATES[number]) => {
    setFormData(prev => ({
      ...prev,
      title: t.title,
      location: 'location' in t ? (t.location || '') : '',
      type: t.type,
      skills: Array.isArray((t as JobTemplate).skills) ? (t as JobTemplate).skills.join(', ') : (t as typeof BUILTIN_TEMPLATES[number]).skills,
      description: t.description || '',
      remote: t.remote ?? false,
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingClients(true);
      try {
        const clientsList = await api.clients.list();
        setClients(clientsList.map(c => ({ id: c.id, name: c.name })));
      } catch { /* ignore */ } finally { setLoadingClients(false); }

      if (!id) {
        try {
          const [list, me] = await Promise.all([api.jobTemplates.list(), api.auth.me()]);
          setTemplates(list);
          setCanCreateJobs(me?.role !== 'HiringManager' && me?.role !== 'Viewer');
        } catch { setCanCreateJobs(true); }
        return;
      }
      setCanCreateJobs(true);
      setLoading(true);
      try {
        const job = await api.jobs.get(id);
        if (job) {
          setFormData({
            title: job.title || '', company: job.company || '', location: job.location || '',
            type: job.type || 'Full-time', salary: job.salaryRange || '', remote: job.remote || false,
            skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''),
            description: job.description || '', clientId: job.clientId || undefined,
          });
        }
      } catch {
        toast.error('Failed to load job. Redirecting...');
        navigate('/jobs');
      } finally { setLoading(false); }
    };
    loadData();
  }, [id, navigate]);

  useEffect(() => {
    if (id) return;
    if (canCreateJobs === false) navigate('/jobs', { replace: true });
  }, [id, canCreateJobs, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleSaveDraft = async () => {
    if (!formData.title?.trim()) {
      setFieldErrors({ title: 'Title is required' });
      return;
    }
    setIsSubmitting(true);
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      if (isEditing && id) {
        await api.jobs.update(id, { ...formData, skills: skillsArray, status: 'Draft', clientId: formData.clientId || undefined });
      } else {
        await api.jobs.create({ ...formData, skills: skillsArray, status: 'Draft', clientId: formData.clientId || undefined });
      }
      navigate('/jobs');
    } catch (e: any) { console.error('Save draft error:', e); toast.error(toUserError(e, 'Failed to save draft. Please try again.')); }
    finally { setIsSubmitting(false); }
  };

  const handlePost = async () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = 'Title is required';
    if (!formData.clientId) errors.clientId = 'Please select a client';
    if (!formData.company?.trim()) errors.company = 'Company name is required';
    if (!formData.location?.trim()) errors.location = 'Location is required';
    if (!formData.salary?.trim()) errors.salary = 'Salary range is required';
    if (!formData.skills?.trim()) errors.skills = 'Required skills are required';
    if (!formData.description?.trim()) errors.description = 'Job description is required';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setIsSubmitting(true);
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      if (isEditing && id) {
        await api.jobs.update(id, { ...formData, skills: skillsArray, status: 'Active' });
        const updatedJob = await api.jobs.get(id);
        if (!updatedJob) throw new Error('Failed to retrieve updated job');
      } else {
        await api.jobs.create({ ...formData, skills: skillsArray, status: 'Active' });
      }
      navigate('/jobs');
    } catch (e: any) { toast.error(toUserError(e, 'Failed to save job. Please try again.')); }
    finally { setIsSubmitting(false); }
  };

  if (!id && canCreateJobs === false) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[200px] text-gray-500 text-sm">
        You don't have permission to post jobs. Redirecting...
      </div>
    );
  }

  const templateOptions = [
    { value: '', label: 'Blank job' },
    ...BUILTIN_TEMPLATES.map((b, i) => ({ value: `builtin-${i}`, label: b.name })),
    ...templates.map(t => ({ value: t.id, label: t.name })),
  ];

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={formData} />

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Page header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Job' : 'Post a New Job'}</h1>
              <p className="text-sm text-gray-400 mt-1">{isEditing ? 'Update your job listing.' : 'Create a job listing to start finding candidates.'}</p>
            </div>
            {!isEditing && templateOptions.length > 1 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400 whitespace-nowrap">Start from a template</span>
                <div className="w-44">
                  <CustomSelect
                    inputStyle
                    value=""
                    onChange={(v) => {
                      if (!v) return;
                      if (v.startsWith('builtin-')) {
                        const i = parseInt(v.replace('builtin-', ''), 10);
                        if (!isNaN(i) && BUILTIN_TEMPLATES[i]) applyTemplate(BUILTIN_TEMPLATES[i]);
                      } else {
                        const t = templates.find(tpl => tpl.id === v);
                        if (t) applyTemplate(t);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm"
                    options={templateOptions}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-8">

            {/* Save as template (editing) */}
            {isEditing && id && (
              <div className="mb-8 pb-6 border-b border-gray-100 flex flex-wrap items-center gap-3">
                {!showSaveAsTemplate ? (
                  <button type="button" onClick={() => setShowSaveAsTemplate(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    <Save size={13} /> Save as template
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text" placeholder="Template name" value={saveAsTemplateName}
                      onChange={e => setSaveAsTemplateName(e.target.value)}
                      className="h-8 px-3 border border-gray-200 rounded-lg text-sm w-44 focus:outline-none focus:border-gray-400"
                    />
                    <Button variant="black" size="sm" disabled={savingAsTemplate || !saveAsTemplateName.trim()} onClick={async () => {
                      if (!saveAsTemplateName.trim()) return;
                      setSavingAsTemplate(true);
                      try {
                        await api.jobTemplates.createFromJob(id, saveAsTemplateName.trim());
                        setShowSaveAsTemplate(false); setSaveAsTemplateName('');
                      } catch (e: any) { toast.error(toUserError(e, 'Failed to save template')); }
                      finally { setSavingAsTemplate(false); }
                    }}>{savingAsTemplate ? 'Saving…' : 'Save'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowSaveAsTemplate(false); setSaveAsTemplateName(''); }}>Cancel</Button>
                  </div>
                )}
              </div>
            )}

            <form className="space-y-6" onSubmit={e => e.preventDefault()}>

              {/* Section: Role */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Role</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Job Title <span className="text-red-400">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange}
                      placeholder="e.g. Senior Product Designer"
                      className={`w-full h-10 px-4 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors ${fieldErrors.title ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Company Name <span className="text-red-400">*</span></label>
                    <input type="text" name="company" value={formData.company} onChange={handleChange}
                      placeholder="e.g. Acme Corp"
                      className={`w-full h-10 px-4 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors ${fieldErrors.company ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.company && <p className="text-xs text-red-500 mt-1">{fieldErrors.company}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Client <span className="text-red-400">*</span></label>
                    <CustomSelect inputStyle value={formData.clientId || ''} onChange={val => { setFormData(prev => ({ ...prev, clientId: val || undefined })); if (fieldErrors.clientId) setFieldErrors(prev => { const next = { ...prev }; delete next.clientId; return next; }); }}
                      className="px-4 py-2 rounded-xl text-sm" disabled={loadingClients}
                      options={[
                        { value: '', label: loadingClients ? 'Loading…' : 'Select a client' },
                        ...clients.map(c => ({ value: c.id, label: c.name }))
                      ]} />
                    {fieldErrors.clientId && <p className="text-xs text-red-500 mt-1">{fieldErrors.clientId}</p>}
                    {clients.length === 0 && !loadingClients && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Link to="/clients" className="text-gray-900 underline">Create a client</Link> first
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Job Type <span className="text-red-400">*</span></label>
                    <CustomSelect inputStyle value={formData.type} onChange={val => setFormData(prev => ({ ...prev, type: val }))}
                      className="px-4 py-2 rounded-xl text-sm"
                      options={[
                        { value: 'Full-time', label: 'Full-time' },
                        { value: 'Part-time', label: 'Part-time' },
                        { value: 'Contract', label: 'Contract' },
                      ]} />
                  </div>
                </div>
              </div>

              {/* Section: Location & Comp */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Location & Compensation</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Location <span className="text-red-400">*</span></label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange}
                      placeholder="e.g. London, UK"
                      className={`w-full h-10 px-4 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors ${fieldErrors.location ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.location && <p className="text-xs text-red-500 mt-1">{fieldErrors.location}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Salary Range <span className="text-red-400">*</span></label>
                    <input type="text" name="salary" value={formData.salary} onChange={handleChange}
                      placeholder="e.g. £60k – £80k"
                      className={`w-full h-10 px-4 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors ${fieldErrors.salary ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.salary && <p className="text-xs text-red-500 mt-1">{fieldErrors.salary}</p>}
                  </div>
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, remote: !prev.remote }))}
                    className={`h-10 flex items-center gap-2.5 px-4 rounded-xl border cursor-pointer select-none transition-colors ${formData.remote ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.remote ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>
                      {formData.remote && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-gray-700">Remote</span>
                  </div>
                </div>
              </div>

              {/* Section: Details */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Job Details</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Required Skills <span className="text-red-400">*</span></label>
                    <input type="text" name="skills" value={formData.skills} onChange={handleChange}
                      placeholder="e.g. React, TypeScript, Node.js (comma separated)"
                      className={`w-full h-10 px-4 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors ${fieldErrors.skills ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.skills
                      ? <p className="text-xs text-red-500 mt-1">{fieldErrors.skills}</p>
                      : <p className="text-xs text-gray-400">Used to AI-score inbound applicants when they apply.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Job Description <span className="text-red-400">*</span></label>
                    <textarea name="description" value={formData.description} onChange={handleChange}
                      rows={8} placeholder="Describe the role, responsibilities, and requirements…"
                      className={`w-full px-4 py-3 text-sm bg-white border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none ${fieldErrors.description ? 'border-red-300' : 'border-gray-200'}`} />
                    {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                  {error.includes('plan limit') && (
                    <a href="/settings?tab=billing" className="text-red-700 underline ml-2">Upgrade →</a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Button variant="outline" type="button" onClick={handleSaveDraft} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save as Draft'}
                </Button>
                <Button variant="outline" type="button" onClick={() => setIsPreviewOpen(true)}>Preview</Button>
                <Button variant="black" type="button" onClick={handlePost} disabled={isSubmitting}>
                  {isSubmitting ? (isEditing ? 'Updating…' : 'Posting…') : (isEditing ? 'Update Job' : 'Post Job')}
                </Button>
              </div>

            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AddJob;
