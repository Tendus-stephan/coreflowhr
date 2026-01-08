import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, X, MapPin, Briefcase, DollarSign, Globe, Check } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { CandidateSourcingModal } from '../components/CandidateSourcingModal';
import { generateCandidates } from '../services/candidateGenerator';
import { supabase } from '../services/supabase';
import { useSourcing } from '../contexts/SourcingContext';

// --- Preview Modal Component ---
const PreviewModal = ({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: any }) => {
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Job Preview</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    {/* Header */}
                    <div className="border-b border-gray-100 pb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.title || 'Untitled Job Title'}</h1>
                                <div className="flex items-center gap-2 text-lg text-gray-600 font-medium">
                                    {data.company || 'Company Name'} 
                                    {data.remote && <span className="text-gray-400">•</span>}
                                    {data.remote && <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-sm border border-gray-200">Remote</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="space-y-1">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Location</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <MapPin size={16} className="text-gray-400" />
                                {data.location || 'Not specified'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Type</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <Briefcase size={16} className="text-gray-400" />
                                {data.type}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Experience</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <Globe size={16} className="text-gray-400" />
                                {data.experience}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Salary</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <DollarSign size={16} className="text-gray-400" />
                                {data.salary || 'Not specified'}
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {data.skills ? data.skills.split(',').map((skill: string, i: number) => (
                                <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium shadow-sm">
                                    {skill.trim()}
                                </span>
                            )) : <span className="text-gray-400 italic">No specific skills listed.</span>}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900">About the Role</h3>
                        <div className="prose prose-gray max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {data.description || 'No description provided.'}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <Button variant="outline" onClick={onClose}>Close Preview</Button>
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
  const { startSourcing, updateProgress, stopSourcing } = useSourcing();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<{
      title: string;
      company: string;
      location: string;
      type: 'Full-time' | 'Contract' | 'Part-time';
      experience: string;
      salary: string;
      remote: boolean;
      skills: string;
      description: string;
  }>({
      title: '',
      company: '',
      location: '',
      type: 'Full-time',
      experience: 'Mid Level (2-5 years)',
      salary: '',
      remote: false,
      skills: '',
      description: ''
  });

  // Load job data if editing
  useEffect(() => {
      const loadJob = async () => {
          if (!id) return;
          
          setLoading(true);
          try {
              const job = await api.jobs.get(id);
              if (job) {
                  setFormData({
                      title: job.title || '',
                      company: job.company || '',
                      location: job.location || '',
                      type: job.type || 'Full-time',
                      experience: job.experienceLevel || 'Mid Level (2-5 years)',
                      salary: job.salaryRange || '',
                      remote: job.remote || false,
                      skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''),
                      description: job.description || ''
                  });
              }
          } catch (error) {
              console.error('Failed to load job:', error);
              alert('Failed to load job. Redirecting...');
              navigate('/jobs');
          } finally {
              setLoading(false);
          }
      };

      loadJob();
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: value
      }));
  };

  const toggleRemote = () => {
      setFormData(prev => ({ ...prev, remote: !prev.remote }));
  };

  const handleSaveDraft = async () => {
      if (!formData.title) {
          alert('Please enter a job title');
          return;
      }
      setIsSubmitting(true);
      try {
          // Convert comma separated skills to array
          const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
          
          if (isEditing && id) {
              // Update existing job as draft
              await api.jobs.update(id, {
                  ...formData,
                  skills: skillsArray,
                  status: 'Draft' as const
              });
          } else {
          // Create the job as draft (no candidates generated)
          await api.jobs.create({
              ...formData,
              skills: skillsArray,
              status: 'Draft' as const
          });
          }
          
          navigate('/jobs');
      } catch (e) {
          console.error("Failed to save draft", e);
          alert('Failed to save draft. Please try again.');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handlePost = async () => {
      if (!formData.title) return;
      setIsSubmitting(true);
      try {
          // Convert comma separated skills to array
          const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
          
          // Check workflow BEFORE creating/updating job (only if posting as Active)
          // Check if a workflow is configured for "New" stage before sourcing
          // Candidates are automatically sent an email after successful sourcing via the "New" stage workflow
          try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user?.id) {
                  const { data: workflows, error: workflowCheckError } = await supabase
                      .from('email_workflows')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('trigger_stage', 'New')
                      .eq('enabled', true)
                      .limit(1);
                  
                  if (workflowCheckError) {
                      setError(`Error checking workflows: ${workflowCheckError.message}. Please ensure you have configured workflows in Settings > Email Workflows before posting a job as Active.`);
                      setIsSubmitting(false);
                      return;
                  }
                  
                  if (!workflows || workflows.length === 0) {
                      setError('Cannot post job as Active. Please create an email workflow for the "New" stage in Settings > Email Workflows first. This is required because an email is automatically sent to candidates after successful sourcing.');
                      setIsSubmitting(false);
                      return;
                  }
              }
          } catch (workflowCheckError: any) {
              console.error('Error checking workflows:', workflowCheckError);
              setError('Error checking email workflows. Please ensure you have configured workflows in Settings > Email Workflows before posting a job as Active.');
              setIsSubmitting(false);
              return;
          }

          // Only create/update job if workflow check passes
          let createdJob;
          
          if (isEditing && id) {
              // Update existing job to Active
              await api.jobs.update(id, {
                  ...formData,
                  skills: skillsArray,
                  status: 'Active' as const
              });
              // Fetch the updated job to get its ID
              const updatedJob = await api.jobs.get(id);
              if (!updatedJob) {
                  throw new Error('Failed to retrieve updated job');
              }
              createdJob = updatedJob;
          } else {
              // Create the job with explicit Active status
              createdJob = await api.jobs.create({
              ...formData,
                  skills: skillsArray,
                  status: 'Active' as const
              });
          }

          // Only source candidates if job is Active (same logic for both new and edited jobs)
          if (createdJob.status === 'Active') {

              // Clear any previous errors
              setError(null);

              // Start sourcing and generate candidates (5 for testing)
              startSourcing(5);

          // Generate candidates with progress updates
          try {
              let successfullyCreated = 0;
              
              await generateCandidates(
                  {
                      id: createdJob.id,
                      title: formData.title,
                      skills: skillsArray,
                      location: formData.location,
                      experienceLevel: formData.experience,
                      company: formData.company,
                      description: formData.description
                  },
                  5, // 5 candidates for testing
                  async (current, total, candidateName, candidateData) => {
                      // Update progress in global context
                      updateProgress({ current, total, currentCandidateName: candidateName });

                      // Save candidate to database
                      try {
                          await api.candidates.create(createdJob.id, {
                              name: candidateData.name,
                              email: candidateData.email,
                              role: candidateData.role,
                              location: candidateData.location,
                              experience: candidateData.experience,
                              skills: candidateData.skills,
                              resumeSummary: candidateData.resumeSummary,
                              aiMatchScore: candidateData.aiMatchScore,
                              stage: candidateData.stage // All newly sourced candidates go to "New" stage
                          });
                          successfullyCreated++;
                      } catch (error) {
                          console.error(`Failed to save candidate ${candidateData.name}:`, error);
                          // Continue even if one fails
                      }
                  }
              );

              // Play notification sound when sourcing completes
              if (successfullyCreated > 0) {
                  const { playNotificationSound } = await import('../utils/soundUtils');
                  playNotificationSound();
              }

              // Update job applicants count with actual number created
              try {
                  // For edited jobs, add to existing count; for new jobs, set the count
                  const currentCount = isEditing ? (createdJob.applicantsCount || 0) : 0;
                  await supabase
                      .from('jobs')
                      .update({ applicants_count: currentCount + successfullyCreated })
                      .eq('id', createdJob.id);
              } catch (error) {
                  console.error('Failed to update applicants count:', error);
              }

                  // Keep notification visible for a few seconds to show completion, then navigate
                  setTimeout(() => {
                      navigate('/jobs');
                      // Keep notification visible for a bit longer, then auto-close after navigation
              setTimeout(() => {
                          stopSourcing();
                      }, 3000);
                  }, 2000);
          } catch (error) {
              console.error("Failed to generate candidates:", error);
                  stopSourcing();
              // Still navigate even if candidate generation fails
                  navigate('/jobs');
              }
          } else {
              // Job is not Active, navigate without sourcing
              navigate('/jobs');
          }
      } catch (e) {
          console.error("Failed to post job", e);
          alert('Failed to save job. Please try again.');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      {/* Modal Injection */}
      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={formData} />
      

      {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
      ) : (
          <>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link to="/jobs" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Job' : 'Post a New Job'}</h1>
                <p className="text-sm text-gray-500">{isEditing ? 'Update your job listing details.' : 'Create a job listing to start finding candidates.'}</p>
            </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>Back to Jobs</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              {/* Basic Info */}
              <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Job Title</label>
                          <input 
                            type="text" 
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Senior Product Designer" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Company</label>
                          <input 
                            type="text" 
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="e.g. CoreFlow Inc." 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Location</label>
                          <input 
                            type="text" 
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. New York, NY" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                          />
                      </div>
                      
                      {/* Custom Dropdown: Job Type */}
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Job Type</label>
                          <div className="relative">
                            <select 
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option>Full-time</option>
                                <option>Part-time</option>
                                <option>Contract</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          </div>
                      </div>

                      {/* Custom Dropdown: Experience */}
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Experience Level</label>
                          <div className="relative">
                            <select 
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option>Entry Level (0-2 years)</option>
                                <option>Mid Level (2-5 years)</option>
                                <option>Senior Level (5+ years)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Salary Range</label>
                          <input 
                            type="text" 
                            name="salary"
                            value={formData.salary}
                            onChange={handleChange}
                            placeholder="e.g. $120k - $150k" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                          />
                      </div>
                      
                      {/* Remote Checkbox - Simplified Logic */}
                      <div 
                        className="flex items-center gap-3 h-[42px] bg-gray-50 border border-gray-200 rounded-xl px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none" 
                        onClick={toggleRemote}
                      >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.remote ? 'bg-black border-black' : 'bg-white border-gray-300'}`}>
                              {formData.remote && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-medium text-gray-700">Remote Position</span>
                      </div>
                  </div>
              </div>

              {/* Details */}
              <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Job Details</h3>
                  
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">Required Skills</label>
                      <input 
                        type="text" 
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="e.g. React, TypeScript, Node.js (comma separated)" 
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">Job Description</label>
                      <textarea 
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the role, responsibilities, and requirements..." 
                        className="w-full h-64 px-4 py-4 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                      ></textarea>
                  </div>
              </div>

              {/* Error Message Display */}
              {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
              )}

              {/* Actions */}
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                  <Button 
                      variant="outline" 
                      type="button" 
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                  >
                      {isSubmitting ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setIsPreviewOpen(true)}>Preview</Button>
                  <Button variant="black" type="button" onClick={handlePost} disabled={isSubmitting}>
                      {isSubmitting ? (isEditing ? 'Updating...' : 'Posting...') : (isEditing ? 'Update Job' : 'Post Job')}
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