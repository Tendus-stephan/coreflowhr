import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Candidate, CandidateStage, Job, Offer } from '../types';
import { X, BrainCircuit, Mail, Calendar, FileText, ExternalLink, Briefcase, AlertTriangle, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
import { generateCandidateAnalysis, draftEmail, draftOutreachMessage } from '../services/geminiService';
import { api } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Legend } from 'recharts';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { Avatar } from './ui/Avatar';
import { CandidateNotes } from './CandidateNotes';
import { InterviewFeedbackForm } from './InterviewFeedback';
import { InterviewFeedbackCard } from './InterviewFeedbackCard';
import { EmailHistory } from './EmailHistory';
import { OfferModal } from './OfferModal';
import { OfferCard } from './OfferCard';
import { supabase } from '../services/supabase';
import { Plus } from 'lucide-react';
import { useModal } from '../contexts/ModalContext';

interface CandidateModalProps {
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (c: Candidate) => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({ candidate, isOpen, onClose, onUpdate }) => {
  const { setCandidateModalOpen } = useModal();
  
  // Update modal context when modal opens/closes
  useEffect(() => {
    setCandidateModalOpen(isOpen);
  }, [isOpen, setCandidateModalOpen]);
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'email' | 'notes' | 'feedback' | 'offers'>('overview');
  const [emailSubTab, setEmailSubTab] = useState<'compose' | 'history'>('compose');
  const [interviewFeedbacks, setInterviewFeedbacks] = useState<any[]>([]);
  const [candidateInterviews, setCandidateInterviews] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [selectedInterviewForFeedback, setSelectedInterviewForFeedback] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; content: string } | null>(null);
  const [outreachDraft, setOutreachDraft] = useState<{ subject: string; content: string; registrationLink: string } | null>(null);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const [loadingOutreach, setLoadingOutreach] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [currentEmailType, setCurrentEmailType] = useState<'Screening' | 'Offer' | 'Hired' | 'Rejection' | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isLinkOfferModalOpen, setIsLinkOfferModalOpen] = useState(false);
  const [generalOffers, setGeneralOffers] = useState<Offer[]>([]);
  const [loadingGeneralOffers, setLoadingGeneralOffers] = useState(false);
  const [jobsMap, setJobsMap] = useState<Record<string, Job>>({});

  useEffect(() => {
      const fetchJob = async () => {
          if (candidate.jobId) {
              const j = await api.jobs.get(candidate.jobId);
              setJob(j);
          }
      };
      if (isOpen) fetchJob();
  }, [candidate.jobId, isOpen]);

  // Silently regenerate AI analysis in background if missing or incomplete (no loading messages)
  useEffect(() => {
      const regenerateAnalysisSilently = async () => {
          if (!isOpen || !job) return;
          
          // Check if analysis is missing or incomplete (just basic "Skills matched" format)
          // This catches cases like "Skills matched: 9/4." or "Skills matched: 3/4. Experience: 5 years."
          // Only generate AI analysis for candidates who have uploaded a CV
          if (!candidate.cvFileUrl) {
              return; // Skip AI analysis for candidates without CVs
          }

          const hasIncompleteAnalysis = candidate.aiAnalysis && 
              candidate.aiAnalysis.startsWith('Skills matched:') && 
              !candidate.aiAnalysis.includes('Strengths:') && 
              !candidate.aiAnalysis.includes('Areas to Explore:') &&
              candidate.aiAnalysis.length < 200; // Basic format is short
          
          if (!candidate.aiAnalysis || hasIncompleteAnalysis) {
              // Regenerate for candidates with CV (resumeSummary indicates CV was uploaded)
              if (candidate.resumeSummary && candidate.resumeSummary.length > 100) {
                  try {
                      const analysis = await generateCandidateAnalysis(candidate, job);
                      
                      // Only update if we got valid analysis
                      if (analysis && analysis.summary && analysis.summary !== "AI Analysis temporarily unavailable. Please try again.") {
                          const strengthsText = analysis.strengths && analysis.strengths.length > 0 
                              ? `\n\nStrengths:\n• ${analysis.strengths.join('\n• ')}`
                              : '';
                          const weaknessesText = analysis.weaknesses && analysis.weaknesses.length > 0
                              ? `\n\nAreas to Explore:\n• ${analysis.weaknesses.join('\n• ')}`
                              : '';
                          const formattedAnalysis = `${analysis.summary}${strengthsText}${weaknessesText}`;
                          
                          // Update silently in background - this will trigger a re-render with the new analysis
                          onUpdate({
                              ...candidate,
                              aiMatchScore: analysis.score || candidate.aiMatchScore,
                              aiAnalysis: formattedAnalysis
                          });
                      }
                  } catch (error) {
                      // Silently fail - don't show errors to user
                      console.warn('Background analysis regeneration failed:', error);
                  }
              }
          }
      };
      
      // Small delay to ensure job is loaded
      const timer = setTimeout(() => {
          if (isOpen && job) {
              regenerateAnalysisSilently();
          }
      }, 100);
      
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, job?.id, candidate.id, candidate.aiAnalysis]); // Regenerate when modal opens, job loads, candidate changes, or analysis changes


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset email states when modal opens
      setEmailSent(false);
      setEmailError(null);
      setShowConfirmSend(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load interviews and feedback when feedback tab is opened
  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'offers' && candidate.id) {
        try {
          setLoadingOffers(true);
          const data = await api.offers.list({ candidateId: candidate.id });
          setOffers(data);
        } catch (err: any) {
          console.error('Error loading offers:', err);
        } finally {
          setLoadingOffers(false);
        }
      }
      if (activeTab === 'feedback' && candidate.id) {
        try {
          setLoadingFeedback(true);
          
          // Load interviews for this candidate
          const interviews = await api.interviews.getCandidateInterviews(candidate.id);
          setCandidateInterviews(interviews);
          
          // Load existing feedback
          const feedbacks = await api.interviews.getCandidateFeedback(candidate.id);
          
          // Get interview details for each feedback
          const feedbacksWithInterviews = await Promise.all(
            feedbacks.map(async (fb) => {
              try {
                const { data: interview } = await supabase
                  .from('interviews')
                  .select('date, time, job_title')
                  .eq('id', fb.interviewId)
                  .single();
                return {
                  ...fb,
                  interviewDate: interview?.date,
                  interviewTime: interview?.time,
                  jobTitle: interview?.job_title
                };
              } catch {
                return fb;
              }
            })
          );
          
          setInterviewFeedbacks(feedbacksWithInterviews);
        } catch (err: any) {
          console.error('Error loading feedback:', err);
        } finally {
          setLoadingFeedback(false);
        }
      }
    };

    loadData();
  }, [activeTab, candidate.id]);

  if (!isOpen) return null;

  const handleRunAIAnalysis = async () => {
      if (!job) return;
      
      // Check AI analysis quota
      try {
          const usage = await api.plan.getAiAnalysisUsage();
          if (!usage.remaining || usage.remaining <= 0) {
              alert(
                `You've reached your monthly AI analysis limit (${usage.max} analyses). ` +
                `Your quota will reset next month.`
              );
              return;
          }
      } catch (error) {
          console.error('Error checking AI analysis quota:', error);
      }
      
      setLoadingAI(true);
      try {
        const analysis = await generateCandidateAnalysis(candidate, job);
        // Format AI analysis with strengths and weaknesses (formatted for display)
        const strengthsText = analysis.strengths && analysis.strengths.length > 0 
            ? `\n\nStrengths:\n• ${analysis.strengths.join('\n• ')}`
            : '';
        const weaknessesText = analysis.weaknesses && analysis.weaknesses.length > 0
            ? `\n\nAreas to Explore:\n• ${analysis.weaknesses.join('\n• ')}`
            : '';
        const formattedAnalysis = `${analysis.summary}${strengthsText}${weaknessesText}`;
        onUpdate({
            ...candidate,
            aiMatchScore: analysis.score,
            aiAnalysis: formattedAnalysis
        });
        
        // Increment AI analysis count in database
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('ai_analysis_count, ai_analysis_reset_date')
                    .eq('user_id', userId)
                    .single();
                
                const now = new Date();
                const resetDate = settings?.ai_analysis_reset_date ? new Date(settings.ai_analysis_reset_date) : null;
                let count = 0;
                
                // Reset if new month
                if (!resetDate || resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
                    count = 1;
                    await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: userId,
                            ai_analysis_count: 1,
                            ai_analysis_reset_date: now.toISOString()
                        }, { onConflict: 'user_id' });
                } else {
                    count = (settings?.ai_analysis_count || 0) + 1;
                    await supabase
                        .from('user_settings')
                        .update({ ai_analysis_count: count })
                        .eq('user_id', userId);
                }
            }
        } catch (error) {
            console.error('Error updating AI analysis count:', error);
            // Don't block user if tracking fails
        }
      } finally {
        setLoadingAI(false);
      }
  };

  const handleGenerateEmail = async (type: 'Screening' | 'Offer' | 'Hired' | 'Rejection') => {
      // Check if AI email generation is allowed
      try {
          const canUseAi = await api.plan.canUseAiEmailGeneration();
          if (!canUseAi) {
              alert('AI email generation is only available on the Professional plan. Upgrade to Professional to use this feature.');
              return;
          }
      } catch (error) {
          console.error('Error checking AI email generation permission:', error);
      }
      
      setLoadingAI(true);
      setEmailSent(false);
      setEmailError(null);
      setShowConfirmSend(false); // Reset confirmation when generating new email
      setCurrentEmailType(type); // Track the email type
      try {
      const draft = await draftEmail(candidate, type);
      setEmailDraft(draft);
      } catch (error) {
          console.error('Error generating email draft:', error);
          setEmailDraft({
              subject: `${type} - ${candidate.role}`,
              content: "Error generating draft. Please try again."
          });
      } finally {
      setLoadingAI(false);
      }
  };

  const handleSendEmailClick = () => {
      if (!emailDraft || !candidate.email) {
          setEmailError('Missing email draft or candidate email');
          return;
      }

      // Show confirmation dialog (emails sent to all candidates, including test candidates)
      setShowConfirmSend(true);
  };

  const handleConfirmSend = async () => {
      setShowConfirmSend(false);
      
      if (!emailDraft || !candidate.email) {
          setEmailError('Missing email draft or candidate email');
          return;
      }

      setSendingEmail(true);
      setEmailSent(false);
      setEmailError(null);

      try {
          // Get current user info for fromName
          const user = await api.auth.me();

          // Send email via edge function
          console.log('[Send Email] Sending email to candidate:', candidate.email);
          const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                  to: candidate.email, // Email goes to candidate, not user
                  subject: emailDraft.subject,
                  content: emailDraft.content,
                  fromName: 'Recruiter', // Always use "Recruiter" as sender name
                  candidateId: candidate.id,
                  emailType: currentEmailType || 'Custom'
              }
          });

          if (emailError) {
              console.error('Error sending email:', emailError);
              setEmailError(emailError.message || 'Failed to send email');
          } else {
              console.log('[Send Email] Email sent successfully to candidate:', candidate.email);
              setEmailSent(true);
              setEmailError(null);

              // Play notification sound for successful email send
              const { playNotificationSound } = await import('../utils/soundUtils');
              playNotificationSound();

              // Automatically update candidate stage for Rejection and Hired emails
              if (currentEmailType === 'Rejection' || currentEmailType === 'Hired') {
                  try {
                      const newStage = currentEmailType === 'Rejection' ? CandidateStage.REJECTED : CandidateStage.HIRED;
                      const updatedCandidate = await api.candidates.update(candidate.id, {
                          stage: newStage
                      });
                      
                      // Play notification sound
                      const { playNotificationSound } = await import('../utils/soundUtils');
                      playNotificationSound();
                      
                      onUpdate(updatedCandidate);
                  } catch (stageError) {
                      console.error('Error updating candidate stage:', stageError);
                      // Don't show error to user - email was sent successfully
                  }
              }
          }
      } catch (error: any) {
          console.error('Unexpected error sending email:', error);
          setEmailError(error.message || 'Failed to send email');
      } finally {
          setSendingEmail(false);
      }
  };

  const handleCancelSend = () => {
      setShowConfirmSend(false);
  };

  const handleGenerateOutreach = async () => {
      if (!job) {
          setEmailError('Job information not available');
          return;
      }
      
      setLoadingOutreach(true);
      setEmailError(null);
      try {
          // Check if a Screening workflow is enabled before generating outreach
          // This prevents candidates from registering but not receiving CV upload emails
          const workflows = await api.workflows.list();
          const screeningWorkflow = workflows.find(w => w.triggerStage === 'Screening' && w.enabled);
          
          if (!screeningWorkflow) {
              const errorMessage = 'Please create and enable a Screening workflow in Settings > Email Workflows before generating outreach messages. Candidates who register their email need to receive a CV upload email automatically.';
              alert(errorMessage);
              throw new Error(errorMessage);
          }
          
          // Generate registration token
          const token = await api.candidates.generateRegistrationToken(candidate.id);
          
          // Build registration link
          // Always use production URL for links in messages (never localhost)
          // window.location.origin is checked if we're in production, otherwise use default production URL
          const frontendUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
              ? window.location.origin 
              : 'https://www.coreflowhr.com';
          const registrationLink = `${frontendUrl}/candidates/register/${candidate.id}?token=${token}`;
          
          // Generate outreach draft
          const draft = await draftOutreachMessage(candidate, job, registrationLink);
          
          setOutreachDraft({
              subject: draft.subject,
              content: draft.content,
              registrationLink: registrationLink
          });
      } catch (error: any) {
          console.error('Error generating outreach message:', error);
          setEmailError(error.message || 'Failed to generate outreach message');
      } finally {
          setLoadingOutreach(false);
      }
  };

  const handleCopyOutreachMessage = async () => {
      if (!outreachDraft) return;
      
      // Copy full message (subject + content)
      const fullMessage = `${outreachDraft.subject}\n\n${outreachDraft.content}`;
      
      try {
          await navigator.clipboard.writeText(fullMessage);
          setOutreachCopied(true);
          setTimeout(() => setOutreachCopied(false), 2000);
      } catch (error) {
          console.error('Failed to copy message:', error);
          setEmailError('Failed to copy message to clipboard');
      }
  };

  const getScoreColor = (score?: number) => {
      if (!score) return 'text-gray-400';
      if (score >= 80) return 'text-gray-900';
      if (score >= 60) return 'text-gray-700';
      if (score >= 40) return 'text-gray-600';
      return 'text-gray-500';
  };

  const getScoreBgColor = (score?: number) => {
      if (!score) return 'bg-gray-100 text-gray-400';
      if (score >= 80) return 'bg-gray-900 text-white';
      if (score >= 60) return 'bg-gray-600 text-white';
      if (score >= 40) return 'bg-gray-500 text-white';
      return 'bg-gray-400 text-white';
  };

  // Logic for Risk Level
  const riskLevel = !candidate.aiMatchScore ? 'Unknown' : candidate.aiMatchScore >= 85 ? 'Low' : candidate.aiMatchScore >= 60 ? 'Medium' : 'High';
  const riskColor = 'text-gray-900 bg-gray-50 border-gray-200';
  const RiskIcon = riskLevel === 'Low' ? CheckCircle : riskLevel === 'Medium' ? AlertTriangle : AlertCircle;

  // Chart Data: Skills (Pie Chart) - Only calculate for candidates with CVs
  // For CV-submitted candidates: Weight skills based on frequency/importance in CV
  // For candidates without CVs: Don't show chart
  const calculateSkillsWeight = (skill: string, resumeSummary?: string): number => {
      if (!candidate.cvFileUrl || !resumeSummary) {
          // No CV = no data to weight
          return 0;
      }
      
      if (candidate.source !== 'direct_application') {
          // For AI-sourced candidates with CV, return default weight
          return 85;
      }
      
      // Count how many times skill appears in resume summary (case-insensitive)
      const skillLower = skill.toLowerCase();
      const resumeLower = resumeSummary.toLowerCase();
      
      // Simple frequency count (word boundary aware)
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = resumeLower.match(regex);
      const frequency = matches ? matches.length : 0;
      
      // Weight based on frequency (1-5 mentions = 70-95%, more = 100%)
      if (frequency === 0) return 60; // Skill mentioned but not in resume summary
      if (frequency === 1) return 70;
      if (frequency === 2) return 80;
      if (frequency >= 3 && frequency <= 5) return 90;
      return 100; // Frequently mentioned = high importance
  };

  // Only calculate skills data for candidates with CVs
  const skillsData = candidate.cvFileUrl 
      ? candidate.skills.slice(0, 5).map((skill, index) => ({
      name: skill,
          value: calculateSkillsWeight(skill, candidate.resumeSummary),
      })).filter(item => item.value > 0).sort((a, b) => b.value - a.value) // Sort by importance, filter out zero values
      : []; // Empty array for candidates without CVs
  const PIE_COLORS = ['#111827', '#374151', '#6b7280', '#9ca3af', '#e5e7eb'];

  // Chart Data: Readiness (Bar Chart) - Only calculate for candidates with CVs
  const calculateInterviewReadiness = () => {
      // If no CV, return empty array
      if (!candidate.cvFileUrl) {
          return [];
      }

      // Resume Completeness (based on resumeSummary presence and length)
      const resumeScore = candidate.resumeSummary 
          ? Math.min(100, Math.max(60, (candidate.resumeSummary.length / 500) * 100))
          : 50;
      
      // Skills Match (already calculated)
      const skillsScore = candidate.aiMatchScore || 0;
      
      // Communication Quality (based on cover letter presence and length for direct applications)
      // For CV submissions, presence of cover letter indicates communication skills
      let commsScore = 70; // Default
      if (candidate.source === 'direct_application' && (candidate as any).coverLetter) {
          // Cover letter present = good communication indicator
          commsScore = 85;
      } else if (candidate.resumeSummary && candidate.resumeSummary.length > 200) {
          // Well-written resume summary = good communication
          commsScore = 80;
      }
      
      // Availability (based on CV data - if location matches job or remote indicator)
      // For now, assume available (could be enhanced with actual availability parsing)
      const availabilityScore = candidate.location ? 95 : 70;
      
      return [
          { name: 'Resume', value: Math.round(resumeScore) },
          { name: 'Skills', value: skillsScore },
          { name: 'Comms', value: commsScore },
          { name: 'Avail.', value: availabilityScore },
      ];
  };
  
  const readinessData = calculateInterviewReadiness();

  // Logic for disabling buttons based on candidate stage
  const isHired = candidate.stage === CandidateStage.HIRED;
  const isOffer = candidate.stage === CandidateStage.OFFER;
  const isInterview = candidate.stage === CandidateStage.INTERVIEW;
  const isScreening = candidate.stage === CandidateStage.SCREENING;

  // Disable Draft Screening if already in Screening, Interview, Offer, or Hired
  const disableScreening = isScreening || isInterview || isOffer || isHired;
  // Disable Draft Offer if in Screening (before interview), Offer, or Hired
  // Only enable for Interview stage (after screening, before offer)
  const disableOffer = isScreening || isOffer || isHired;
  // Show Draft Hired button for Offer stage
  const showHired = isOffer;
  // Disable Rejection if Hired
  const disableRejection = isHired;

  // Use real work experience from candidate data
  const experienceHistory = candidate.workExperience || [];

  return (
    <>
    <ScheduleInterviewModal 
        isOpen={isScheduleOpen} 
        onClose={() => setIsScheduleOpen(false)} 
        preSelectedCandidate={candidate} 
    />
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
      <div className="w-[800px] h-full bg-white border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between bg-white">
            <div className="flex gap-4">
                <Avatar name={candidate.name} className="w-16 h-16 rounded-xl text-xl" />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
                    <p className="text-gray-500 font-medium">{candidate.role}</p>
                    {candidate.email && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                            <Mail size={14} className="text-gray-400" />
                            <a href={`mailto:${candidate.email}`} className="hover:text-gray-900 hover:underline">
                                {candidate.email}
                            </a>
                        </div>
                    )}
                    {candidate.location && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <MapPin size={14} className="text-gray-400" />
                            <span>{candidate.location}</span>
                        </div>
                    )}
                    {(() => {
                        const work = candidate.workExperience || [];
                        const tenure = candidate.experience != null && candidate.experience > 0
                            ? `${candidate.experience}yr exp`
                            : work.length > 0 && work[0]
                                ? (work[0].period ? `${work[0].period} at ${work[0].company || '—'}` : work[0].company ? `at ${work[0].company}` : null)
                                : null;
                        return tenure ? (
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <Briefcase size={14} className="text-gray-400" />
                                <span>{tenure}</span>
                            </div>
                        ) : null;
                    })()}
                    {candidate.alsoInJobTitles && candidate.alsoInJobTitles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-1 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 w-fit">
                            <span className="font-medium">Also in pipeline:</span>
                            {candidate.alsoInJobTitles.map((a, i) => (
                                <span key={a.jobId}>
                                    {i > 0 && ', '}
                                    <a href={`/candidates?job=${a.jobId}`} className="underline hover:no-underline">{a.jobTitle}</a>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                         {(candidate.profileUrl || candidate.portfolioUrls?.linkedin) && (
                             <a
                                 href={candidate.profileUrl || candidate.portfolioUrls?.linkedin || ''}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
                             >
                                 <ExternalLink size={12} /> Open LinkedIn profile
                             </a>
                         )}
                         {candidate.cvFileUrl && (
                             <button 
                                 onClick={async () => {
                                     try {
                                         // Extract file path from the URL
                                         // URL format: https://project.supabase.co/storage/v1/object/public/candidate-cvs/path/to/file.pdf
                                         // or: https://project.supabase.co/storage/v1/object/sign/candidate-cvs/path/to/file.pdf?token=...
                                         const fileUrl = new URL(candidate.cvFileUrl!);
                                         const pathParts = fileUrl.pathname.split('/');
                                         const bucketIndex = pathParts.indexOf('candidate-cvs');
                                         
                                         if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
                                             throw new Error('Invalid CV file URL');
                                         }
                                         
                                         // Extract path after bucket name (e.g., "jobId/candidateId/file.pdf")
                                         const filePath = pathParts.slice(bucketIndex + 1).join('/');
                                         
                                         // Download file using Supabase Storage (includes authentication)
                                         const { data, error } = await supabase.storage
                                             .from('candidate-cvs')
                                             .download(filePath);
                                         
                                         if (error) throw error;
                                         if (!data) throw new Error('No file data received');
                                         
                                         // Create download link
                                         const blobUrl = window.URL.createObjectURL(data);
                                         const a = document.createElement('a');
                                         a.href = blobUrl;
                                         a.download = candidate.cvFileName || filePath.split('/').pop() || 'candidate-cv.pdf';
                                         document.body.appendChild(a);
                                         a.click();
                                         window.URL.revokeObjectURL(blobUrl);
                                         document.body.removeChild(a);
                                     } catch (error: any) {
                                         console.error('Error downloading CV:', error);
                                         alert(`Failed to download CV: ${error.message || 'Please try again.'}`);
                                     }
                                 }}
                                 className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
                             >
                                 <FileText size={12} /> Download CV
                         </button>
                         )}
                         <span className="text-xs bg-white border border-border px-2 py-1 rounded text-gray-500 flex items-center">
                            {(candidate.source === 'ai_sourced' || candidate.isTest) ? 'Sourced' : 'Applied'}: {new Date(candidate.appliedDate).toLocaleDateString()}
                         </span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Overview & AI
            </button>
            <button 
                onClick={() => setActiveTab('portfolio')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'portfolio' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Portfolio
            </button>
            <button 
                onClick={() => setActiveTab('email')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Communication
            </button>
            <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Notes
            </button>
            <button 
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'feedback' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Interview Feedback
            </button>
            <button 
                onClick={() => setActiveTab('offers')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'offers' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Offers
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Top Row: AI Summary & Score - Only show for candidates with CVs */}
                    {candidate.cvFileUrl && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-gray-900">
                                <BrainCircuit size={18} />
                                <h3 className="font-bold text-sm">AI Summary Insights</h3>
                            </div>
                                {candidate.aiMatchScore !== undefined && candidate.aiMatchScore !== null && (
                                <span className={`text-xl font-bold px-3 py-1 rounded-lg ${getScoreBgColor(candidate.aiMatchScore)}`}>{candidate.aiMatchScore}% Match</span>
                            )}
                        </div>
                         {candidate.aiAnalysis ? (
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {candidate.aiAnalysis}
                                </div>
                        ) : (
                                <p className="text-sm text-gray-500 italic">AI analysis is being generated...</p>
                        )}
                        
                            {/* Risk Analysis Section - Only show if match score exists */}
                        {candidate.aiMatchScore && (
                             <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${riskColor}`}>
                                <RiskIcon size={16} />
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide">Risk Assessment: {riskLevel}</p>
                                </div>
                             </div>
                        )}
                    </div>
                    )}
                    
                    {/* Message for candidates without CVs */}
                    {!candidate.cvFileUrl && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 text-gray-900 mb-2">
                                <FileText size={18} />
                                <h3 className="font-bold text-sm">CV Required for Analysis</h3>
                            </div>
                            <p className="text-sm text-gray-700">
                                This candidate hasn't uploaded a CV yet. AI analysis and match scoring will be available once they submit their CV.
                            </p>
                        </div>
                    )}

                    {/* Charts Row - Only show for candidates with CVs */}
                    {candidate.cvFileUrl && (
                    <div className="grid grid-cols-2 gap-4">
                        {/* Skills Assessment Pie Chart */}
                        <div className="border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-64">
                             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Skills Assessment</h4>
                             <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={skillsData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {skillsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} 
                                        />
                                        <Legend 
                                            layout="horizontal" 
                                            verticalAlign="bottom" 
                                            align="center"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        </div>

                        {/* Interview Readiness Bar Chart */}
                        <div className="border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-64">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Interview Readiness</h4>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        layout="vertical" 
                                        data={readinessData} 
                                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide domain={[0, 100]} />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={50} 
                                            tick={{fontSize: 10, fill: '#374151', fontWeight: 500}} 
                                            axisLine={false} 
                                            tickLine={false}
                                        />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ fontSize: '10px', borderRadius: '4px' }} />
                                        <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} barSize={18}>
                                            <LabelList 
                                                dataKey="value" 
                                                position="right" 
                                                formatter={(val: any) => `${val}%`} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6b7280' }} 
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Skills Tags */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {candidate.source === 'direct_application' ? 'Skills from CV' : 'Identified Skills'}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {candidate.skills.length > 0 ? (
                                candidate.skills.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-white border border-border rounded-full text-xs font-medium text-gray-700">
                                    {skill}
                                </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-400 italic">No skills identified</span>
                            )}
                        </div>
                        {candidate.source === 'direct_application' && (
                            <p className="text-xs text-gray-500 mt-2">Skills extracted from uploaded CV</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'portfolio' && (
                <div className="space-y-8">
                    {/* Experience Timeline */}
                    {experienceHistory.length > 0 && (
                    <div>
                         <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Experience</h3>
                         <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100">
                                {experienceHistory.map((exp, index) => (
                                    <div key={index} className="relative pl-8">
                                     <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                                     <h4 className="text-sm font-bold text-gray-900">{exp.role || 'Position'}</h4>
                                        <p className="text-xs font-medium text-gray-600 mb-1">
                                            {exp.company || 'Company'}
                                            {(exp.period || exp.startDate || exp.endDate) && (
                                                <span className="text-gray-500">
                                                    {exp.period 
                                                        ? ` • ${exp.period}`
                                                        : exp.startDate && exp.endDate
                                                        ? ` • ${exp.startDate} - ${exp.endDate}`
                                                        : exp.startDate
                                                        ? ` • ${exp.startDate} - Present`
                                                        : ''
                                                    }
                                                </span>
                                            )}
                                        </p>
                                        {exp.description && (
                                            <p className="text-xs text-gray-500 leading-relaxed mt-2">{exp.description}</p>
                                        )}
                                 </div>
                             ))}
                         </div>
                    </div>
                    )}

                    {/* Featured Projects */}
                    {candidate.projects && candidate.projects.length > 0 && (
                        <>
                            {experienceHistory.length > 0 && <div className="h-px bg-gray-100"></div>}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                             <h3 className="text-sm font-bold text-gray-900">Featured Projects</h3>
                                    {candidate.portfolioUrls?.portfolio && (
                                        <a 
                                            href={candidate.portfolioUrls.portfolio} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-black underline font-medium hover:text-blue-600"
                                        >
                                            View Portfolio Site
                                        </a>
                                    )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                                    {candidate.projects.slice(0, 4).map((project, index) => (
                                        <div key={index} className="group">
                                            {project.url && (
                                                <a 
                                                    href={project.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="block cursor-pointer"
                                                >
                                                    <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 flex items-center justify-center">
                                                        <ExternalLink size={24} className="text-gray-400 group-hover:text-gray-600" />
                                                    </div>
                                                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{project.name || 'Project'}</h4>
                                                    {project.technologies && project.technologies.length > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">{project.technologies.slice(0, 3).join(' • ')}{project.technologies.length > 3 && ` +${project.technologies.length - 3}`}</p>
                                                    )}
                                                    {project.description && (
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                                                    )}
                                                </a>
                                            )}
                                            {!project.url && (
                                                <>
                                                    <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 flex items-center justify-center">
                                                        <Briefcase size={24} className="text-gray-400" />
                                    </div>
                                                    <h4 className="font-bold text-sm text-gray-900">{project.name || 'Project'}</h4>
                                                    {project.technologies && project.technologies.length > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">{project.technologies.slice(0, 3).join(' • ')}{project.technologies.length > 3 && ` +${project.technologies.length - 3}`}</p>
                                                    )}
                                                    {project.description && (
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                                                    )}
                                                </>
                                            )}
                                </div>
                            ))}
                        </div>
                        {candidate.projects.length > 4 && (
                            <p className="text-xs text-gray-400 text-center mt-2">Showing 4 of {candidate.projects.length} projects</p>
                        )}
                    </div>
                        </>
                    )}

                    {/* Portfolio URLs & LinkedIn */}
                    {((candidate.profileUrl || candidate.portfolioUrls?.linkedin) || (candidate.portfolioUrls && Object.keys(candidate.portfolioUrls).length > 0)) && (
                        <>
                            {(experienceHistory.length > 0 || (candidate.projects && candidate.projects.length > 0)) && (
                                <div className="h-px bg-gray-100"></div>
                            )}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-900">Portfolio & Links</h3>
                                <div className="space-y-3">
                                    {(candidate.profileUrl || candidate.portfolioUrls?.linkedin) && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.profileUrl || candidate.portfolioUrls?.linkedin || ''} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">LinkedIn profile</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.profileUrl || candidate.portfolioUrls?.linkedin}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                    {candidate.portfolioUrls.github && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.portfolioUrls.github} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">GitHub</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.portfolioUrls.github}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                    {candidate.portfolioUrls.portfolio && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.portfolioUrls.portfolio} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Portfolio Website</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.portfolioUrls.portfolio}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                    {candidate.portfolioUrls.dribbble && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.portfolioUrls.dribbble} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Dribbble</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.portfolioUrls.dribbble}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                    {candidate.portfolioUrls.behance && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.portfolioUrls.behance} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Behance</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.portfolioUrls.behance}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                    {candidate.portfolioUrls.website && candidate.portfolioUrls.website !== candidate.portfolioUrls.portfolio && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                            <a href={candidate.portfolioUrls.website} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center group">
                                                <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-gray-300">
                                                    <ExternalLink size={16} className="text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Website</h4>
                                                    <p className="text-xs text-gray-500 truncate">{candidate.portfolioUrls.website}</p>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                             </div>
                             </div>
                        </>
                    )}

                    {/* Empty state */}
                    {experienceHistory.length === 0 && 
                     (!candidate.projects || candidate.projects.length === 0) && 
                     !candidate.profileUrl && !candidate.portfolioUrls?.linkedin &&
                     (!candidate.portfolioUrls || Object.keys(candidate.portfolioUrls).length === 0) && (
                        <div className="text-center py-12">
                            <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-sm text-gray-500">No portfolio information available</p>
                            <p className="text-xs text-gray-400 mt-2">Portfolio data is extracted from uploaded CVs</p>
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'email' && (
                <div className="space-y-6">
                    {/* Email Sub-tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setEmailSubTab('compose')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                emailSubTab === 'compose' 
                                    ? 'border-black text-black' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Compose
                        </button>
                        <button
                            onClick={() => setEmailSubTab('history')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                emailSubTab === 'history' 
                                    ? 'border-black text-black' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            History
                        </button>
                    </div>

                    {emailSubTab === 'compose' && (
                        <>
                            {/* Show outreach section if candidate has no email */}
                            {!candidate.email ? (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle size={20} className="text-gray-600 mt-0.5" />
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-1">Outreach</h3>
                                                <p className="text-sm text-gray-700">This candidate doesn't have an email. Generate an outreach message with a registration link to send via direct message.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={handleGenerateOutreach}
                                            disabled={loadingOutreach || !job}
                                        >
                                            <BrainCircuit size={14} className="mr-2" />
                                            Generate Outreach Message
                                        </Button>
                                        
                                    </div>

                                    {loadingOutreach && (
                                        <div className="text-sm text-gray-500 animate-pulse flex items-center gap-2">
                                            <BrainCircuit size={14} className="animate-spin"/>
                                            Generating outreach message...
                                        </div>
                                    )}

                                    {outreachDraft && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Subject (for reference)</label>
                                                <input 
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-border rounded-lg p-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                                    value={outreachDraft.subject}
                                                    readOnly
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Outreach message</label>
                                                <textarea 
                                                    className="w-full h-64 bg-gray-50 border border-border rounded-lg p-4 text-sm text-gray-900 focus:border-black focus:outline-none resize-none focus:ring-2 focus:ring-black/10 whitespace-pre-wrap"
                                                    value={outreachDraft.content}
                                                    readOnly
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Registration Link</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text"
                                                        className="flex-1 bg-gray-50 border border-border rounded-lg p-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 font-mono text-xs"
                                                        value={outreachDraft.registrationLink}
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                            {emailError && (
                                                <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg p-2">
                                                    {emailError}
                                                </div>
                                            )}
                                            {outreachCopied && (
                                                <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                                                    <CheckCircle size={16} className="text-gray-600" />
                                                    Message copied to clipboard!
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-3">
                                                <Button 
                                                    variant="outline" 
                                                    onClick={handleCopyOutreachMessage}
                                                    disabled={!outreachDraft}
                                                >
                                                    Copy Message to Clipboard
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {!outreachDraft && !loadingOutreach && (
                                        <div className="text-center py-12 text-gray-500">
                                            <Mail size={48} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-sm">Click "Generate Outreach Message" to create an outreach message with registration link</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Show regular email compose for candidates with email */
                                <>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleGenerateEmail('Screening')} 
                                            disabled={loadingAI || disableScreening}
                                            className={disableScreening ? 'opacity-50 cursor-not-allowed' : ''}
                                        >
                                            Draft Screening
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleGenerateEmail('Offer')} 
                                            disabled={loadingAI || disableOffer}
                                            className={disableOffer ? 'opacity-50 cursor-not-allowed' : ''}
                                        >
                                            Draft Offer
                                        </Button>
                                        {showHired && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleGenerateEmail('Hired')} 
                                                disabled={loadingAI}
                                            >
                                                Draft Hired
                                            </Button>
                                        )}
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleGenerateEmail('Rejection')} 
                                            disabled={loadingAI || disableRejection} 
                                            className={`hover:text-gray-700 hover:border-gray-300 ${disableRejection ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Draft Rejection
                                        </Button>
                                    </div>
                                    
                                    {loadingAI && <div className="text-sm text-gray-500 animate-pulse flex items-center gap-2"><BrainCircuit size={14} className="animate-spin"/> Generating draft...</div>}

                                    {emailDraft && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Subject</label>
                                                <input 
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-border rounded-lg p-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                                    value={emailDraft.subject}
                                                    onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                                                    placeholder="Email subject..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Email Content</label>
                                                <textarea 
                                                    className="w-full h-64 bg-gray-50 border border-border rounded-lg p-4 text-sm text-gray-900 focus:border-black focus:outline-none resize-none focus:ring-2 focus:ring-black/10 whitespace-pre-wrap"
                                                    value={emailDraft.content}
                                                    onChange={(e) => setEmailDraft({ ...emailDraft, content: e.target.value })}
                                                    placeholder="Email content will appear here..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                {emailError && (
                                                    <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg p-2">
                                                        {emailError}
                                                    </div>
                                                )}
                                                {emailSent && (
                                                    <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                                                        <CheckCircle size={16} className="text-gray-600" />
                                                        Email sent successfully!
                                                    </div>
                                                )}
                                                <div className="flex justify-end">
                                                    <Button 
                                                        icon={<Mail size={16}/>} 
                                                        variant="black" 
                                                        onClick={handleSendEmailClick}
                                                        disabled={sendingEmail || !emailDraft}
                                                    >
                                                        {sendingEmail ? 'Sending...' : 'Send Email'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!emailDraft && !loadingAI && (
                                        <div className="text-center py-12 text-gray-500">
                                            <Mail size={48} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-sm">Click a button above to generate an email draft</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {emailSubTab === 'history' && (
                        <EmailHistory candidateId={candidate.id} />
                    )}
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="space-y-6">
                    <CandidateNotes candidateId={candidate.id} />
                </div>
            )}

            {activeTab === 'feedback' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Interview Feedback</h3>
                    </div>

                    {loadingFeedback ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Interviews List - Submit Feedback */}
                            {candidateInterviews.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Interviews</h4>
                                    <div className="space-y-2">
                                        {candidateInterviews.map((interview) => {
                                            const existingFeedback = interviewFeedbacks.find(fb => fb.interviewId === interview.id);
                                            const interviewDate = new Date(interview.date);
                                            const isPast = interviewDate < new Date() || (interviewDate.toDateString() === new Date().toDateString() && interview.time < new Date().toTimeString().substring(0, 5));
                                            
                                            return (
                                                <div key={interview.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h5 className="text-sm font-bold text-gray-900">{interview.jobTitle}</h5>
                                                                {existingFeedback && (
                                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">Feedback Submitted</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                <span>{interviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                <span>•</span>
                                                                <span>{interview.time}</span>
                                                                <span>•</span>
                                                                <span>{interview.type}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {selectedInterviewForFeedback === interview.id ? (
                                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                                            <InterviewFeedbackForm
                                                                interviewId={interview.id}
                                                                candidateId={candidate.id}
                                                                onFeedbackSubmitted={() => {
                                                                    setSelectedInterviewForFeedback(null);
                                                                    // Reload feedback
                                                                    const reloadFeedback = async () => {
                                                                        const feedbacks = await api.interviews.getCandidateFeedback(candidate.id);
                                                                        const feedbacksWithInterviews = await Promise.all(
                                                                            feedbacks.map(async (fb) => {
                                                                                try {
                                                                                    const { data: interview } = await supabase
                                                                                        .from('interviews')
                                                                                        .select('date, time, job_title')
                                                                                        .eq('id', fb.interviewId)
                                                                                        .single();
                                                                                    return {
                                                                                        ...fb,
                                                                                        interviewDate: interview?.date,
                                                                                        interviewTime: interview?.time,
                                                                                        jobTitle: interview?.job_title
                                                                                    };
                                                                                } catch {
                                                                                    return fb;
                                                                                }
                                                                            })
                                                                        );
                                                                        setInterviewFeedbacks(feedbacksWithInterviews);
                                                                    };
                                                                    reloadFeedback();
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedInterviewForFeedback(interview.id)}
                                                            className="w-full"
                                                        >
                                                            {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Submitted Feedback Display */}
                            {interviewFeedbacks.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Submitted Feedback</h4>
                                    <div className="space-y-4">
                                        {interviewFeedbacks.map((feedback) => (
                                            <InterviewFeedbackCard
                                                key={feedback.id}
                                                feedback={feedback}
                                                interviewDate={feedback.interviewDate}
                                                interviewTime={feedback.interviewTime}
                                                jobTitle={feedback.jobTitle}
                                            />
                            ))}
                        </div>
                    </div>
                            )}

                            {/* Empty State */}
                            {candidateInterviews.length === 0 && interviewFeedbacks.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-sm">No interviews scheduled yet</p>
                                    <p className="text-xs text-gray-400 mt-2">Schedule an interview to provide feedback</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'offers' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Job Offers</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="black"
                                size="sm"
                                icon={<Plus size={14} />}
                                onClick={() => {
                                    setEditingOffer(null);
                                    setIsOfferModalOpen(true);
                                }}
                            >
                                Create Offer
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        setLoadingGeneralOffers(true);
                                        // Load general offers (offers without candidates)
                                        const offers = await api.offers.list({ generalOnly: true });
                                        
                                        if (offers.length === 0) {
                                            alert('No general offers available. Create a general offer from the Offers tab first.');
                                            setLoadingGeneralOffers(false);
                                            return;
                                        }
                                        
                                        setGeneralOffers(offers);
                                        
                                        // Load jobs for all offers
                                        const jobs: Record<string, Job> = {};
                                        for (const offer of offers) {
                                            if (offer.jobId) {
                                                const job = await api.jobs.get(offer.jobId);
                                                if (job) {
                                                    jobs[offer.jobId] = job;
                                                }
                                            }
                                        }
                                        setJobsMap(jobs);
                                        
                                        // Auto-link if only one, otherwise show modal
                                        if (offers.length === 1) {
                                            if (confirm(`Link "${offers[0].positionTitle}" offer to ${candidate.name}?`)) {
                                                await api.offers.linkToCandidate(offers[0].id, candidate.id);
                                                const data = await api.offers.list({ candidateId: candidate.id });
                                                setOffers(data);
                                                // Play notification sound
                                                const { playNotificationSound } = await import('../utils/soundUtils');
                                                playNotificationSound();
                                            }
                                            setLoadingGeneralOffers(false);
                                        } else {
                                            setIsLinkOfferModalOpen(true);
                                            setLoadingGeneralOffers(false);
                                        }
                                    } catch (err: any) {
                                        alert(err.message || 'Failed to load general offers');
                                        setLoadingGeneralOffers(false);
                                    }
                                }}
                                disabled={loadingGeneralOffers}
                            >
                                {loadingGeneralOffers ? 'Loading...' : 'Link General Offer'}
                            </Button>
                        </div>
                    </div>

                    {loadingOffers ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            Loading offers...
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-sm text-gray-500 mb-4">No offers yet for this candidate</p>
                            <p className="text-xs text-gray-400 mb-4">Create an offer or link a general offer</p>
                            <div className="flex gap-2 justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Plus size={14} />}
                                    onClick={() => {
                                        setEditingOffer(null);
                                        setIsOfferModalOpen(true);
                                    }}
                                >
                                    Create Offer
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            setLoadingGeneralOffers(true);
                                            // Load general offers (offers without candidates)
                                            const offers = await api.offers.list({ generalOnly: true });
                                            
                                            if (offers.length === 0) {
                                                alert('No general offers available. Create a general offer from the Offers tab first.');
                                                setLoadingGeneralOffers(false);
                                                return;
                                            }
                                            
                                            setGeneralOffers(offers);
                                            
                                            // Load jobs for all offers
                                            const jobs: Record<string, Job> = {};
                                            for (const offer of offers) {
                                                if (offer.jobId) {
                                                    const job = await api.jobs.get(offer.jobId);
                                                    if (job) {
                                                        jobs[offer.jobId] = job;
                                                    }
                                                }
                                            }
                                            setJobsMap(jobs);
                                            
                                            // Auto-link if only one, otherwise show modal
                                            if (offers.length === 1) {
                                                if (confirm(`Link "${offers[0].positionTitle}" offer to ${candidate.name}?`)) {
                                                    await api.offers.linkToCandidate(offers[0].id, candidate.id);
                                                    const data = await api.offers.list({ candidateId: candidate.id });
                                                    setOffers(data);
                                                    // Play notification sound
                                                    const { playNotificationSound } = await import('../utils/soundUtils');
                                                    playNotificationSound();
                                                }
                                                setLoadingGeneralOffers(false);
                                            } else {
                                                setIsLinkOfferModalOpen(true);
                                                setLoadingGeneralOffers(false);
                                            }
                                        } catch (err: any) {
                                            alert(err.message || 'Failed to load general offers');
                                            setLoadingGeneralOffers(false);
                                        }
                                    }}
                                    disabled={loadingGeneralOffers}
                                >
                                    {loadingGeneralOffers ? 'Loading...' : 'Link General Offer'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {offers.map((offer) => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer}
                                    onEdit={(offer) => {
                                        setEditingOffer(offer);
                                        setIsOfferModalOpen(true);
                                    }}
                                    onSend={async (offer) => {
                                        try {
                                            await api.offers.send(offer.id);
                                            // Play notification sound
                                            const { playNotificationSound } = await import('../utils/soundUtils');
                                            playNotificationSound();
                                            const data = await api.offers.list({ candidateId: candidate.id });
                                            setOffers(data);
                                        } catch (err: any) {
                                            alert(err.message || 'Failed to send offer');
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-border bg-gray-50 flex justify-end items-center">
                        <div className="flex gap-3">
                <Button
                                variant="outline"
                                icon={<Calendar size={16} />}
                                onClick={() => {
                                  if (candidate.stage !== CandidateStage.INTERVIEW) {
                                    window.alert('Only candidates in the Interview stage can have interviews scheduled. Move this candidate to the Interview stage first.');
                                    return;
                                  }
                                  setIsScheduleOpen(true);
                                }}
                              >
                                Schedule
                              </Button>
                <Button variant="primary" onClick={onClose}>Save Changes</Button>
                             </div>
        </div>
      </div>
    </div>

    {/* Confirmation Modal */}
    {showConfirmSend && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Send Email</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to send this email to <strong>{candidate.name}</strong>?
                {currentEmailType === 'Rejection' && (
                  <span className="block mt-2 text-gray-700 font-medium">
                    The candidate will be moved to "Rejected" stage automatically.
                  </span>
                )}
                {currentEmailType === 'Hired' && (
                  <span className="block mt-2 text-gray-700 font-medium">
                    The candidate will be moved to "Hired" stage automatically.
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleCancelSend}>
                  Cancel
                </Button>
                <Button variant="black" onClick={handleConfirmSend} disabled={sendingEmail}>
                  {sendingEmail ? 'Sending...' : 'Yes, Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Schedule Interview Modal */}
    {isScheduleOpen && (
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        preSelectedCandidate={candidate}
      />
    )}

    {/* Offer Modal */}
    {isOfferModalOpen && (
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setEditingOffer(null);
        }}
        offer={editingOffer}
        candidate={candidate}
        onSave={async () => {
          const data = await api.offers.list({ candidateId: candidate.id });
          setOffers(data);
        }}
      />
    )}

    {/* Link General Offer Selection Modal */}
    {isLinkOfferModalOpen && createPortal(
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', width: '100vw', height: '100vh' }}>
        <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Link General Offer</h2>
                <p className="text-sm text-gray-500 mt-1">Select a general offer to link to {candidate.name}</p>
              </div>
              <button 
                onClick={() => setIsLinkOfferModalOpen(false)} 
                className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {generalOffers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">No general offers available</p>
                  <p className="text-xs text-gray-400 mt-2">Create a general offer from the Offers tab first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generalOffers.map((offer) => (
                    <button
                      key={offer.id}
                      onClick={async () => {
                        try {
                          await api.offers.linkToCandidate(offer.id, candidate.id);
                          const data = await api.offers.list({ candidateId: candidate.id });
                          setOffers(data);
                          setIsLinkOfferModalOpen(false);
                          // Play notification sound
                          const { playNotificationSound } = await import('../utils/soundUtils');
                          playNotificationSound();
                        } catch (err: any) {
                          alert(err.message || 'Failed to link offer');
                        }
                      }}
                      className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900 mb-1">{offer.positionTitle}</h3>
                          {offer.jobId && jobsMap[offer.jobId] && (
                            <p className="text-xs text-gray-500 mb-2">{jobsMap[offer.jobId].title}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            {offer.salaryAmount && (
                              <span>
                                {offer.salaryCurrency === 'USD' ? '$' : offer.salaryCurrency} 
                                {offer.salaryAmount.toLocaleString()} 
                                {offer.salaryPeriod === 'yearly' ? '/year' : offer.salaryPeriod === 'monthly' ? '/month' : '/hour'}
                              </span>
                            )}
                            {offer.startDate && (
                              <span>Start: {new Date(offer.startDate).toLocaleDateString()}</span>
                            )}
                            {offer.expiresAt && (
                              <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>
                          {offer.benefits && offer.benefits.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Benefits:</p>
                              <div className="flex flex-wrap gap-1">
                                {offer.benefits.slice(0, 3).map((benefit, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    {benefit}
                                  </span>
                                ))}
                                {offer.benefits.length > 3 && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    +{offer.benefits.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                            {offer.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <Button variant="outline" onClick={() => setIsLinkOfferModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

















