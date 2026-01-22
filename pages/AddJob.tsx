import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, X, MapPin, Briefcase, DollarSign, Globe, Check, Building2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { CandidateSourcingModal } from '../components/CandidateSourcingModal';
import { scrapeCandidates } from '../services/scrapingApi';
import { supabase } from '../services/supabase';
import { useSourcing } from '../contexts/SourcingContext';
import { canSourceCandidates, getAvailableSources, getPlanLimits } from '../services/planLimits';
import { handleScrapingError, logScrapingError } from '../services/scrapingErrorHandler';

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

// Animated Counter Component
const AnimatedCounter: React.FC<{ target: number; duration?: number }> = ({ target, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0); // Reset when target changes
    const startTime = Date.now();
    const frames = (duration / 16); // ~60fps
    const increment = target / frames;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setCount(target);
        clearInterval(timer);
        return;
      }
      
      setCount(prev => {
        const next = Math.min(prev + increment, target);
        return next;
      });
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span className="font-bold text-2xl text-gray-900">{Math.round(count)}</span>;
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
  const [userPlan, setUserPlan] = useState<string | null>(null);
  
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
      clientId?: string;
  }>({
      title: '',
      company: '',
      location: '',
      type: 'Full-time',
      experience: 'Mid Level (2-5 years)',
      salary: '',
      remote: false,
      skills: '',
      description: '',
      clientId: undefined
  });
  
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load user plan, clients, and job data
  useEffect(() => {
      const loadData = async () => {
          // Load user plan
          try {
              const billingPlan = await api.settings.getPlan();
              setUserPlan(billingPlan.name);
          } catch (error) {
              console.error('Failed to load billing plan:', error);
              setUserPlan('Basic'); // Default to Basic if error
          }

          // Load clients
          setLoadingClients(true);
          try {
              const clientsList = await api.clients.list();
              setClients(clientsList.map(c => ({ id: c.id, name: c.name })));
          } catch (error) {
              console.error('Failed to load clients:', error);
          } finally {
              setLoadingClients(false);
          }

          // Load job data if editing
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
                      description: job.description || '',
                      clientId: job.clientId || undefined
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

      loadData();
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
      // For drafts, only title is required
      if (!formData.title || !formData.title.trim()) {
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
                  status: 'Draft' as const,
                  clientId: formData.clientId || undefined
              });
          } else {
          // Create the job as draft (no candidates generated)
          await api.jobs.create({
              ...formData,
              skills: skillsArray,
              status: 'Draft' as const,
              clientId: formData.clientId || undefined
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
      // Validate all required fields
      if (!formData.title || !formData.title.trim()) {
          alert('Please enter a job title');
          return;
      }
      if (!formData.clientId) {
          alert('Please select a client');
          return;
      }
      if (!formData.company || !formData.company.trim()) {
          alert('Please enter a company name');
          return;
      }
      if (!formData.location || !formData.location.trim()) {
          alert('Please enter a location');
          return;
      }
      if (!formData.salary || !formData.salary.trim()) {
          alert('Please enter a salary range');
          return;
      }
      if (!formData.skills || !formData.skills.trim()) {
          alert('Please enter required skills');
          return;
      }
      if (!formData.description || !formData.description.trim()) {
          alert('Please enter a job description');
          return;
      }
      setIsSubmitting(true);
      try {
          // Convert comma separated skills to array
          const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
          
          // Note: "New" stage workflow requirement removed - emails are no longer sent automatically after sourcing
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

              // Get user's plan limits
              const planLimits = getPlanLimits(userPlan);
              const defaultCandidates = Math.min(10, planLimits.maxCandidatesPerJob);
              
              // Check if user can source this many candidates
              const limitCheck = canSourceCandidates(userPlan, defaultCandidates);
              
              if (!limitCheck.allowed) {
                  setError(limitCheck.message || 'You have reached your plan limit for candidate sourcing. Please upgrade your plan.');
                  setIsSubmitting(false);
                  return;
              }

              // Use the allowed limit (may be less than requested)
              const maxCandidates = Math.min(defaultCandidates, limitCheck.maxAllowed);
              
              // Get available sources for this plan
              const availableSources = getAvailableSources(userPlan) as any[];
              
              // Start sourcing with progress tracking
              startSourcing(maxCandidates);

          // Scrape real candidates using API
          try {
              // Update progress: Starting
              updateProgress({ current: 0, total: maxCandidates, currentCandidateName: 'Initializing scraper...' });

              // Scrape candidates - the API handles saving to database automatically
              // Use available sources based on user's plan
              const sourceNames = availableSources.length > 0 
                ? availableSources.join(', ')
                : 'LinkedIn';
              updateProgress({ current: 0, total: maxCandidates, currentCandidateName: `Searching ${sourceNames} for candidates...` });
              
              const response = await scrapeCandidates(createdJob.id, {
                  sources: availableSources.length > 0 ? availableSources : ['linkedin'], // Use plan-allowed sources
                  maxCandidates: maxCandidates
              });

              if (!response.success) {
                  throw new Error(response.error || 'Scraping failed');
              }

              // Calculate total candidates saved
              const totalSaved = response.totalSaved || 0;
              const totalFound = response.results.reduce((sum, result) => sum + result.candidatesFound, 0);
              
              // Get diagnostic information from results
              const diagnostic = (response.results[0] as any)?.diagnostic;
              
              // Check if 0 candidates were saved but some were found
              if (totalSaved === 0 && totalFound > 0) {
                  // Get statistics from results
                  const stats = (response.results[0] as any)?.statistics;
                  const reasons: string[] = [];
                  if (stats?.invalid) reasons.push(`${stats.invalid} invalid`);
                  if (stats?.duplicates) reasons.push(`${stats.duplicates} duplicates`);
                  if (stats?.saveErrors) reasons.push(`${stats.saveErrors} save errors`);
                  
                  const reasonText = reasons.length > 0 
                      ? ` (${reasons.join(', ')})` 
                      : '';
                  
                  // Update scraping status to failed with detailed error
                  try {
                      await supabase
                          .from('jobs')
                          .update({ 
                              scraping_status: 'failed',
                              scraping_error: `Found ${totalFound} candidates but none were saved${reasonText}. This may be due to strict validation criteria or all candidates being duplicates.`
                          })
                          .eq('id', createdJob.id);
                  } catch (dbError: any) {
                      // Handle missing column gracefully
                      if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                          console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
                      } else if (dbError.message?.includes('check constraint') || dbError.code === '23514') {
                          // Constraint error - try with simpler error message
                          try {
                              await supabase
                                  .from('jobs')
                                  .update({ 
                                      scraping_status: 'failed',
                                      scraping_error: `Found ${totalFound} candidates but none were saved.`
                                  })
                                  .eq('id', createdJob.id);
                          } catch (retryError) {
                              console.error('Failed to update scraping status on retry:', retryError);
                          }
                      } else {
                          console.error('Failed to update scraping status:', dbError);
                      }
                  }
                  
                  // Show warning message
                  setError(`Found ${totalFound} candidates but none were saved${reasonText}. Try adjusting your job requirements (location, skills, experience level) or check if candidates already exist.`);
                  
                  // Update progress
                  updateProgress({ 
                      current: 0, 
                      total: maxCandidates, 
                      currentCandidateName: `Found ${totalFound} candidates but none met the requirements${reasonText}` 
                  });
                  
                  stopSourcing();
                  
                  // Navigate after showing error
                  setTimeout(() => {
                      navigate('/jobs');
                  }, 5000);
                  return;
              }
              
              // Update scraping status to succeeded
              try {
                  await supabase
                      .from('jobs')
                      .update({ 
                          scraping_status: 'succeeded',
                          scraping_error: null
                      })
                      .eq('id', createdJob.id);
              } catch (dbError: any) {
                  // Handle missing column gracefully
                  if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                      console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
                  } else {
                      console.error('Failed to update scraping status:', dbError);
                  }
              }

              // Update progress: Complete
              updateProgress({ 
                  current: totalSaved, 
                  total: maxCandidates, 
                  currentCandidateName: `Saved ${totalSaved} of ${totalFound} candidates found` 
              });

              // Play notification sound when sourcing completes
              if (totalSaved > 0) {
                  const { playNotificationSound } = await import('../utils/soundUtils');
                  playNotificationSound();
              }

              // Update job applicants count with actual number created
              // Note: The scraper already updates this via DatabaseService, but we'll ensure it's correct
              try {
                  // For edited jobs, add to existing count; for new jobs, set the count
                  const currentCount = isEditing ? (createdJob.applicantsCount || 0) : 0;
                  await supabase
                      .from('jobs')
                      .update({ applicants_count: currentCount + totalSaved })
                      .eq('id', createdJob.id);
              } catch (error) {
                  console.error('Failed to update applicants count:', error);
              }

              // Log results with detailed statistics
              console.group('📊 Scraping Completed');
              console.log('Total Saved:', totalSaved);
              console.log('Total Found:', totalFound);
              console.log('Results:', response.results.map(r => {
                  const stats = (r as any).statistics;
                  if (stats) {
                      return {
                          source: r.source,
                          found: r.candidatesFound,
                          saved: r.candidatesSaved,
                          invalid: stats.invalid,
                          duplicates: stats.duplicates,
                          saveErrors: stats.saveErrors,
                          processed: stats.processed
                      };
                  }
                  return {
                      source: r.source,
                      found: r.candidatesFound,
                      saved: r.candidatesSaved
                  };
              }));
              
              // Detailed diagnostics if 0 results
              if (totalFound === 0 && totalSaved === 0) {
                  console.group('⚠️ WARNING: No Candidates Found!');
                  console.warn('No candidates were found or saved.');
                  console.log('');
                  console.log('📋 Job Details:');
                  console.log('   Title:', formData.title);
                  console.log('   Location:', formData.location || 'Not specified');
                  console.log('   Experience:', formData.experience);
                  console.log('   Skills:', formData.skills || 'Not specified');
                  console.log('');
                  
                  // Show diagnostic info if available
                  if (diagnostic?.zeroResultsReason) {
                      const reason = diagnostic.zeroResultsReason;
                      console.log('🔍 Diagnostic Information:');
                      console.log('   Search Query:', reason.searchQuery || 'Not available');
                      console.log('   Actor Used:', reason.actorUsed || 'Not available');
                      console.log('   Attempts:', reason.attempts || 0);
                      console.log('   Consecutive Empty Fetches:', reason.consecutiveEmptyFetches || 0);
                      console.log('');
                      console.log('   Possible Reasons:');
                      reason.possibleReasons.forEach((r: string, i: number) => {
                          console.log(`   ${i + 1}. ${r}`);
                      });
                      console.log('');
                  } else {
                      console.log('🔍 Possible Reasons:');
                      console.log('  1. Search query too specific');
                      console.log('  2. Location filter too restrictive');
                      console.log('  3. Apify free tier limit reached (10 runs/day)');
                      console.log('  4. Actor limitations or rate limiting');
                      console.log('  5. Apify not configured (missing APIFY_API_TOKEN)');
                      console.log('  6. No LinkedIn profiles match the search criteria');
                      console.log('');
                  }
                  
                  console.log('💡 NEXT STEPS:');
                  console.log('');
                  console.log('📺 Check the SERVER TERMINAL where you ran "npm run scraper-ui:server"');
                  console.log('   Look for these logs:');
                  console.log('   - 📝 Search query: "..."');
                  console.log('   - 📋 Query details: {...}');
                  console.log('   - 📤 Actor input sent: {...}');
                  console.log('   - 📊 Run created: ID=..., Status=...');
                  console.log('   - ⚠️ WARNING: Apify returned 0 profiles');
                  console.log('   - ❌ Error messages');
                  console.log('');
                  console.log('🔧 Quick Troubleshooting:');
                  console.log('   1. Check diagnostic endpoint: http://localhost:3005/api/diagnostic');
                  console.log('   2. Verify APIFY_API_TOKEN is set in .env.local');
                  console.log('   3. Check if Apify free tier limit reached');
                  console.log('   4. Try broader search (remove location/skills filters)');
                  console.log('   5. Check Apify dashboard: https://console.apify.com/actors/runs');
                  console.groupEnd();
              }
              console.groupEnd();

                  // Keep notification visible for a few seconds to show completion, then navigate
                  setTimeout(() => {
                      navigate('/jobs');
                      // Keep notification visible for a bit longer, then auto-close after navigation
              setTimeout(() => {
                          stopSourcing();
                      }, 3000);
                  }, 2000);
          } catch (error: any) {
              // Check for partial saves before showing error
              let partialSaveCount = 0;
              try {
                  const { count } = await supabase
                      .from('candidates')
                      .select('*', { count: 'exact', head: true })
                      .eq('job_id', createdJob.id)
                      .eq('source', 'scraped');
                  partialSaveCount = count || 0;
              } catch (countError) {
                  console.error('Failed to check partial saves:', countError);
              }
              
              // Handle error gracefully - convert to user-friendly message
              const errorInfo = handleScrapingError(error);
              
              // Log technical details internally (never show to user)
              logScrapingError(createdJob.id, errorInfo, { error, partialSaveCount });
              
              // Update progress to show error (or partial success)
              if (partialSaveCount > 0) {
                  updateProgress({ 
                      current: partialSaveCount, 
                      total: maxCandidates, 
                      currentCandidateName: `Saved ${partialSaveCount} candidates before connection error. ${errorInfo.userMessage}` 
                  });
              } else {
                  updateProgress({ 
                      current: 0, 
                      total: maxCandidates, 
                      currentCandidateName: errorInfo.userMessage 
                  });
              }
              
              // Store scraping status in job metadata (for retry functionality)
              try {
                  await supabase
                      .from('jobs')
                      .update({ 
                          scraping_status: 'failed',
                          scraping_error: partialSaveCount > 0 
                              ? `${errorInfo.userMessage} (${partialSaveCount} candidates were saved before the error)`
                              : errorInfo.userMessage,
                          scraping_attempted_at: new Date().toISOString()
                      })
                      .eq('id', createdJob.id);
              } catch (dbError: any) {
                  // Handle missing column gracefully
                  if (dbError.message?.includes('does not exist') || dbError.code === '42703') {
                      console.warn('⚠️ scraping_status column does not exist. Please run the migration: RUN_SCRAPING_STATUS_MIGRATION.sql');
                  } else if (dbError.message?.includes('check constraint') || dbError.code === '23514') {
                      // Constraint error - try with simpler error message
                      try {
                          await supabase
                              .from('jobs')
                              .update({ 
                                  scraping_status: 'failed',
                                  scraping_error: partialSaveCount > 0 
                                      ? `${errorInfo.userMessage} (${partialSaveCount} candidates saved)`
                                      : errorInfo.userMessage,
                                  scraping_attempted_at: new Date().toISOString()
                              })
                              .eq('id', createdJob.id);
                      } catch (retryError) {
                          console.error('Failed to update scraping status on retry:', retryError);
                      }
                  } else {
                      console.error('Failed to store scraping status:', dbError);
                  }
              }
              
              // Show user-friendly error message with partial save info
              const errorMessage = partialSaveCount > 0
                  ? `${partialSaveCount} candidates were saved before the connection error. ${errorInfo.userMessage} You can retry sourcing to get the remaining candidates.`
                  : errorInfo.userMessage;
              setError(errorMessage);
                  stopSourcing();
              
              // Navigate to jobs after showing error (job was created successfully)
              setTimeout(() => {
                  navigate('/jobs');
              }, 5000); // Give user more time to read error with partial save info
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
          {/* Candidate Count Display */}
          <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                  <div>
                      <p className="text-sm text-gray-600 font-medium mb-1">Candidates Available</p>
                      <p className="text-xs text-gray-500">Maximum candidates you can source for this job</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <AnimatedCounter target={50} />
                      <span className="text-sm text-gray-500 font-medium">candidates</span>
                  </div>
              </div>
          </div>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              {/* Basic Info */}
              <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Job Title *</label>
                          <input 
                            type="text" 
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Senior Product Designer" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                            required
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Client (Agency) *</label>
                          <select
                            name="clientId"
                            value={formData.clientId || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value || undefined }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                            disabled={loadingClients}
                            required
                          >
                            <option value="">Select a client</option>
                            {clients.map(client => (
                              <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                          </select>
                          {clients.length === 0 && !loadingClients && (
                            <p className="text-xs text-gray-500 mt-1">
                              <Link to="/clients" className="text-gray-900 underline">Create a client</Link> to organize jobs by company
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Company Name *</label>
                          <input 
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="e.g. CoreFlow Inc." 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                            required
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
                          <label className="text-sm font-bold text-gray-900">Job Type *</label>
                          <div className="relative">
                            <select 
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
                                required
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
                          <label className="text-sm font-bold text-gray-900">Experience Level *</label>
                          <div className="relative">
                            <select 
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
                                required
                            >
                                <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                                <option value="Mid Level (2-5 years)">Mid Level (2-5 years)</option>
                                <option value="Senior Level (5+ years)">Senior Level (5+ years)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Salary Range *</label>
                          <input 
                            type="text" 
                            name="salary"
                            value={formData.salary}
                            onChange={handleChange}
                            placeholder="e.g. $120k - $150k" 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                            required
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
                      <label className="text-sm font-bold text-gray-900">Required Skills *</label>
                      <input 
                        type="text" 
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="e.g. React, TypeScript, Node.js (comma separated)" 
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all" 
                        required
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">Job Description *</label>
                      <textarea 
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the role, responsibilities, and requirements..." 
                        className="w-full h-64 px-4 py-4 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        required
                      ></textarea>
                  </div>
              </div>

              {/* Error Message Display */}
              {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-red-800 font-medium">{error}</p>
                      {error.includes('plan limit') && (
                          <a 
                              href="/settings?tab=billing" 
                              className="text-sm text-red-600 underline mt-2 inline-block"
                          >
                              Upgrade your plan →
                          </a>
                      )}
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