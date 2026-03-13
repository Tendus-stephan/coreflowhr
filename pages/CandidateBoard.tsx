import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PageLoader } from '../components/ui/PageLoader';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { Candidate, CandidateStage, Job } from '../types';
import { PipelineColumn } from '../components/PipelineColumn';
import { SourcingStatusBar } from '../components/SourcingStatusBar';
import { 
    Users, CheckCircle, Clock, Sparkles, Search, ChevronDown, 
    Filter, MoreHorizontal, TrendingUp, Download, Bell, Loader2, AlertTriangle, Info
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CandidateModal } from '../components/CandidateModal';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { Toast } from '../components/ui/Toast';
import { api, Notification } from '../services/api';
import { sendSlackNotification, buildCandidateStagedBlocks } from '../services/slack';

const stageDisplayName: Record<CandidateStage, string> = {
  [CandidateStage.NEW]: 'Waitlist',
  [CandidateStage.SCREENING]: 'Screening',
  [CandidateStage.INTERVIEW]: 'Interview',
  [CandidateStage.OFFER]: 'Offer',
  [CandidateStage.HIRED]: 'Hired',
  [CandidateStage.REJECTED]: 'Rejected',
};

const CandidateBoard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [initialTabFromUrl, setInitialTabFromUrl] = useState<string | undefined>();
  const [initialEmailSubTabFromUrl, setInitialEmailSubTabFromUrl] = useState<string | undefined>();

  // Horizontal scroll container for pipeline columns
  const boardRef = useRef<HTMLDivElement | null>(null);

  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!boardRef.current) return;
    e.preventDefault();

    const container = boardRef.current;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 120; // px from edge to start scrolling
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const scrollSpeed = 40; // px per event

    // Scroll right
    if (e.clientX > rect.right - edgeThreshold && container.scrollLeft < maxScrollLeft) {
      container.scrollLeft = Math.min(container.scrollLeft + scrollSpeed, maxScrollLeft);
    }

    // Scroll left
    if (e.clientX < rect.left + edgeThreshold && container.scrollLeft > 0) {
      container.scrollLeft = Math.max(container.scrollLeft - scrollSpeed, 0);
    }
  };

  // Move confirmation (after drag)
  const [pendingMove, setPendingMove] = useState<{
    candidateId: string;
    candidateName: string;
    fromStage: CandidateStage;
    toStage: CandidateStage;
  } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Job dropdown open state (for scrollable list)
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);

  const isViewer = userRole === 'Viewer';

  // Close job dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) setJobDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const [candidatesResult, jobsResult, n] = await Promise.all([
            api.candidates.list({ page: 1, pageSize: 1000 }), // Load first 1000 candidates
            api.jobs.list({ excludeClosed: true, page: 1, pageSize: 100 }), // Load first 100 jobs
            api.notifications.list()
        ]);
        setCandidates(candidatesResult.data || []);
        setJobs(jobsResult.data || []);
        setNotifications(n);
        setLoading(false);
        // Reminders: past interviews (feedback) and upcoming (coming soon)
        try {
            await api.interviews.ensureFeedbackReminders();
            await api.interviews.ensureUpcomingInterviewReminders();
            const updatedN = await api.notifications.list();
            setNotifications(updatedN);
        } catch (_) {}
        // Inactivity nudge: record visit so pipeline view counts as activity
        try { await api.settings.recordSeen(); } catch (_) {}
    };
    loadData();
  }, []);

  // Handle candidate ID and tab from URL (e.g. /candidates?candidateId=...&tab=email&emailSubTab=history)
  useEffect(() => {
    const candidateId = searchParams.get('candidateId');
    if (candidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        const tab = searchParams.get('tab');
        const emailSubTab = searchParams.get('emailSubTab');
        setInitialTabFromUrl(tab || undefined);
        setInitialEmailSubTabFromUrl(emailSubTab || undefined);
        setSelectedCandidate(candidate);
        const next = new URLSearchParams(searchParams);
        next.delete('candidateId');
        next.delete('tab');
        next.delete('emailSubTab');
        setSearchParams(next, { replace: true });
      }
    }
  }, [candidates, searchParams, setSearchParams]);

  // Preselect job from ?job= when jobs are loaded; show sourcing toast when ?sourcing=started
  useEffect(() => {
    const jobId = searchParams.get('job');
    const sourcing = searchParams.get('sourcing');
    if (jobId && jobs.length > 0 && jobs.some(j => j.id === jobId)) {
      setSelectedJob(jobId);
    }
    if (sourcing === 'started') {
      setToastMessage('Job created! Candidate sourcing has started in the background — check back shortly.');
      setToastType('info');
      setShowToast(true);
      const next = new URLSearchParams(searchParams);
      next.delete('sourcing');
      setSearchParams(next, { replace: true });
    }
  }, [jobs, searchParams, setSearchParams]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The full job object for the currently selected job filter (null when "all")
  const selectedJobData = useMemo(
    () => (selectedJob === 'all' ? null : jobs.find(j => j.id === selectedJob) ?? null),
    [selectedJob, jobs]
  );

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
    const total = candidates.length;
    // Defining "Qualified" as Interview, Offer, or Hired for this stat
    const qualified = candidates.filter(c => 
        [CandidateStage.INTERVIEW, CandidateStage.OFFER, CandidateStage.HIRED].includes(c.stage)
    ).length;
    const waitlist = candidates.filter(c => c.stage === CandidateStage.NEW).length;
    
    const scores = candidates.map(c => c.aiMatchScore || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

    return { total, qualified, waitlist, avgScore };
  }, [candidates]);

  // --- Stats Card Component (Updated to match Dashboard) ---
  const MetricCard = ({ title, value, subtext, trend, icon: Icon }: any) => (
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between transition-shadow">
          <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
              <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className={trend.includes('+') ? 'text-gray-700' : 'text-gray-400'} />
                  <span className={`text-[10px] font-medium ${trend.includes('+') ? 'text-gray-700' : 'text-gray-500'}`}>
                      {trend} <span className="text-gray-400">{subtext}</span>
                  </span>
              </div>
          </div>
          <div className="p-2.5 rounded-lg bg-gray-50 text-gray-900 border border-gray-100">
              <Icon size={18} />
          </div>
      </div>
  );

  // --- Filtering Logic ---
  const filteredCandidates = useMemo(() => {
      return candidates.filter(c => {
          // Job Filter
          const matchesJob = selectedJob === 'all' || c.jobId === selectedJob;
          
          // Search Filter
          const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

          // Pill Filter (Custom grouping logic)
          let matchesPill = true;
          if (selectedStageFilter === 'Qualified') {
              matchesPill = [CandidateStage.INTERVIEW, CandidateStage.OFFER, CandidateStage.HIRED, CandidateStage.SCREENING].includes(c.stage);
          } else if (selectedStageFilter === 'Interview') {
              matchesPill = c.stage === CandidateStage.INTERVIEW;
          } else if (selectedStageFilter === 'Rejected') {
              matchesPill = c.stage === CandidateStage.REJECTED;
          } else if (selectedStageFilter === 'Waitlist') {
              matchesPill = c.stage === CandidateStage.NEW;
          } else if (selectedStageFilter === 'Offer') {
              matchesPill = c.stage === CandidateStage.OFFER;
          } else if (selectedStageFilter === 'Hired') {
              matchesPill = c.stage === CandidateStage.HIRED;
          } else if (selectedStageFilter === 'Screening') {
              matchesPill = c.stage === CandidateStage.SCREENING;
          }

          return matchesJob && matchesSearch && matchesPill;
      });
  }, [candidates, selectedJob, searchQuery, selectedStageFilter]);

  const getCandidatesByStage = (stage: CandidateStage) => {
      return filteredCandidates.filter(c => c.stage === stage);
  };

  const handleCandidateUpdate = async (updatedCandidate: Candidate) => {
      // Check if stage changed
      const oldCandidate = candidates.find(c => c.id === updatedCandidate.id);
      const stageChanged = oldCandidate && oldCandidate.stage !== updatedCandidate.stage;
      
      // Update candidate in local state - this ensures the candidate appears only in the NEW stage
      // The database enforces one stage per candidate, so updating the stage REPLACES the old value
      setCandidates(prev => prev.map(c => 
          c.id === updatedCandidate.id ? updatedCandidate : c
      ));
      setSelectedCandidate(updatedCandidate);
      
      // Show toast and play sound if stage changed
      if (stageChanged && oldCandidate) {
          // Play notification sound
          const { playNotificationSound } = await import('../utils/soundUtils');
          playNotificationSound();

          // Show toast notification
          setToastMessage(`${updatedCandidate.name} moved to ${updatedCandidate.stage}`);
          setToastType('success');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);

          // Fire Slack notification (non-blocking)
          api.settings.getSlackWebhook().then((webhookUrl) => {
              if (webhookUrl) {
                  const jobTitle = jobs.find(j => j.id === updatedCandidate.jobId)?.title;
                  sendSlackNotification(
                      webhookUrl,
                      `${updatedCandidate.name} moved to ${updatedCandidate.stage}`,
                      buildCandidateStagedBlocks(updatedCandidate.name, updatedCandidate.stage, jobTitle)
                  );
              }
          }).catch(() => {});
      }
      
      // Refresh notifications after candidate update (in case notification was created)
      try {
          const updatedNotifications = await api.notifications.list();
          setNotifications(updatedNotifications);
      } catch (error) {
          console.error('Error refreshing notifications:', error);
      }
  };

  // Get valid next stage for a candidate (follows same logic as "Move to Next Stage")
  const getValidNextStage = (currentStage: CandidateStage): CandidateStage | null => {
      switch (currentStage) {
          case CandidateStage.NEW: return CandidateStage.SCREENING;
          case CandidateStage.SCREENING: return CandidateStage.INTERVIEW;
          case CandidateStage.INTERVIEW: return CandidateStage.OFFER;
          case CandidateStage.OFFER: return CandidateStage.HIRED;
          case CandidateStage.HIRED: return null; // Terminal stage
          case CandidateStage.REJECTED: return null; // Terminal stage
          default: return null;
      }
  };

  // Check if a stage transition is valid
  // Only allows: forward movement to the next stage OR to Rejected
  const isValidStageTransition = (currentStage: CandidateStage, targetStage: CandidateStage): boolean => {
      // Can always move to Rejected from any non-terminal stage
      if (targetStage === CandidateStage.REJECTED) {
          // Cannot move from Hired or Rejected
          return currentStage !== CandidateStage.HIRED && currentStage !== CandidateStage.REJECTED;
      }
      
      // Cannot move from terminal stages
      if (currentStage === CandidateStage.HIRED || currentStage === CandidateStage.REJECTED) {
          return false;
      }
      
      // Cannot move to New stage manually
      if (targetStage === CandidateStage.NEW) {
          return false;
      }
      
      // Only allow forward movement to the immediate next stage
      const validNextStage = getValidNextStage(currentStage);
      return validNextStage === targetStage;
  };

  // Handle drag and drop for candidates
  const handleDropCandidate = async (candidateId: string, newStage: CandidateStage) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;

      // Check if stage actually changed
      if (candidate.stage === newStage) return;

      // Validate stage transition
      if (!isValidStageTransition(candidate.stage, newStage)) {
          let errorMessage = '';
          
          if (candidate.stage === CandidateStage.HIRED || candidate.stage === CandidateStage.REJECTED) {
              errorMessage = `Cannot move candidate from ${candidate.stage}. This is a terminal stage. Candidates can only be moved to "Rejected" if not already rejected.`;
          } else if (newStage === CandidateStage.NEW) {
              errorMessage = `Cannot move candidate to "New" stage. Candidates automatically progress from New after registration.`;
          } else {
              errorMessage = `Cannot move candidate from ${candidate.stage} to ${newStage}. Invalid stage transition.`;
          }
          
          setToastMessage(errorMessage);
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
          return;
      }

      // Show confirmation before moving (like draft email send)
      setPendingMove({
          candidateId,
          candidateName: candidate.name,
          fromStage: candidate.stage,
          toStage: newStage
      });
  };

  const confirmMoveCandidate = async () => {
      if (!pendingMove) return;
      setIsMoving(true);
      try {
          const updatedCandidate = await api.candidates.update(pendingMove.candidateId, {
              stage: pendingMove.toStage
          });
          await handleCandidateUpdate(updatedCandidate);
          setPendingMove(null);
      } catch (error: any) {
          console.error('Error moving candidate:', error);
          setToastMessage(error?.message || 'Failed to move candidate. Please try again.');
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
      } finally {
          setIsMoving(false);
      }
  };

  // --- Filter Pill Counts ---
  const counts = useMemo(() => {
      const getCount = (filterType: string) => {
          if (filterType === 'All') return candidates.length;
          if (filterType === 'Waitlist') return candidates.filter(c => c.stage === CandidateStage.NEW).length;
          if (filterType === 'Interview') return candidates.filter(c => c.stage === CandidateStage.INTERVIEW).length;
          if (filterType === 'Rejected') return candidates.filter(c => c.stage === CandidateStage.REJECTED).length;
          if (filterType === 'Screening') return candidates.filter(c => c.stage === CandidateStage.SCREENING).length;
          if (filterType === 'Offer') return candidates.filter(c => c.stage === CandidateStage.OFFER).length;
          if (filterType === 'Hired') return candidates.filter(c => c.stage === CandidateStage.HIRED).length;
          if (filterType === 'Qualified') return candidates.filter(c => [CandidateStage.INTERVIEW, CandidateStage.OFFER, CandidateStage.HIRED, CandidateStage.SCREENING].includes(c.stage)).length;
          return 0;
      };
      return {
          All: getCount('All'),
          Waitlist: getCount('Waitlist'),
          Interview: getCount('Interview'),
          Rejected: getCount('Rejected'),
          Screening: getCount('Screening'),
          Offer: getCount('Offer'),
          Hired: getCount('Hired'),
          Qualified: getCount('Qualified'),
      }
  }, [candidates]);

  if (loading) {
      return <PageLoader />;
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="flex flex-col bg-white min-h-full" style={{ height: '100%' }}>

      {/* Page Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Candidates</h1>
          <p className="mt-1.5 text-sm text-gray-400 font-normal">
            Move candidates through your hiring pipeline and track their progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
              )}
            </button>
            {showNotifications && (
              <NotificationDropdown
                notifications={notifications}
                onMarkAllRead={async () => {
                  await api.notifications.markRead();
                  const updated = await api.notifications.list();
                  setNotifications(updated);
                }}
              />
            )}
          </div>
          <Button
            variant="black"
            size="sm"
            icon={<Download size={14} />}
            onClick={async () => {
              try {
                const exportCheck = await api.plan.canExportCandidates(filteredCandidates.length);
                if (!exportCheck.allowed) {
                  alert(exportCheck.message || `Your plan allows up to ${exportCheck.maxAllowed} candidates per export.`);
                  return;
                }
                const csvContent = [
                  ['Name', 'Email', 'Role', 'Stage', 'AI Match Score', 'Skills', 'Location', 'Experience'].join(','),
                  ...filteredCandidates.map(c => [
                    `"${c.name}"`, `"${c.email || ''}"`, `"${c.role || ''}"`, `"${c.stage}"`,
                    c.aiMatchScore || '', `"${(c.skills || []).join('; ')}"`, `"${c.location || ''}"`, c.experience || ''
                  ].join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch {
                alert('Failed to export candidates. Please try again.');
              }
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="px-8 py-3 border-b border-gray-100 flex items-center gap-5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-sm font-semibold text-gray-900">{metrics.total}</span>
        </div>
        <div className="w-px h-3.5 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Qualified</span>
          <span className="text-sm font-semibold text-gray-900">{metrics.qualified}</span>
        </div>
        <div className="w-px h-3.5 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Waitlist</span>
          <span className="text-sm font-semibold text-gray-900">{metrics.waitlist}</span>
        </div>
        {metrics.avgScore > 0 && (
          <>
            <div className="w-px h-3.5 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Avg match</span>
              <span className="text-sm font-semibold text-gray-900">{metrics.avgScore}%</span>
            </div>
          </>
        )}
      </div>

      {/* Filter Row: stage tabs + search + job select */}
      <div className="px-8 flex items-center justify-between border-b border-gray-100 flex-shrink-0" style={{ position: 'relative', zIndex: 2 }}>
        <div className="flex items-end gap-0">
          {(['All', 'Waitlist', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const).map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStageFilter(stage)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                selectedStageFilter === stage
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {stage}
              <span className="text-xs text-gray-400 font-normal tabular-nums">
                {counts[stage]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors w-48"
            />
          </div>
          <div className="w-40">
            <CustomSelect
              inputStyle
              value={selectedJob}
              onChange={setSelectedJob}
              className="py-1.5 text-sm"
              options={[
                { value: 'all', label: 'All jobs' },
                ...jobs.map(j => ({ value: j.id, label: j.title }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* Sourcing status bar */}
      {selectedJob !== 'all' && (
        <SourcingStatusBar
          jobId={selectedJob}
          isReadOnly={isViewer}
          onCandidatesAdded={() => {
            api.candidates.list({ page: 1, pageSize: 1000 }).then((r) => setCandidates(r.data || [])).catch(() => {});
          }}
        />
      )}

      {/* Board */}
      <div
        ref={boardRef}
        onDragOver={handleBoardDragOver}
        className="flex-1 bg-white px-8 pt-4"
        style={{ overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
      >
        <div className="flex gap-3 w-max snap-x snap-mandatory pb-4" style={{ height: '100%' }}>
          <PipelineColumn title="Waitlist" stage={CandidateStage.NEW} candidates={getCandidatesByStage(CandidateStage.NEW)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
          <PipelineColumn title="Screening" stage={CandidateStage.SCREENING} candidates={getCandidatesByStage(CandidateStage.SCREENING)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
          <PipelineColumn title="Interview" stage={CandidateStage.INTERVIEW} candidates={getCandidatesByStage(CandidateStage.INTERVIEW)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
          <PipelineColumn title="Offer" stage={CandidateStage.OFFER} candidates={getCandidatesByStage(CandidateStage.OFFER)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
          <PipelineColumn title="Hired" stage={CandidateStage.HIRED} candidates={getCandidatesByStage(CandidateStage.HIRED)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
          <PipelineColumn title="Rejected" stage={CandidateStage.REJECTED} candidates={getCandidatesByStage(CandidateStage.REJECTED)} onSelectCandidate={setSelectedCandidate} onDropCandidate={isViewer ? undefined : handleDropCandidate} isValidDropTarget={isValidStageTransition} jobRequiredSkills={selectedJob !== 'all' ? jobs.find(j => j.id === selectedJob)?.skills : undefined} readOnly={isViewer} />
        </div>
      </div>

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => {
            setSelectedCandidate(null);
            setInitialTabFromUrl(undefined);
            setInitialEmailSubTabFromUrl(undefined);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('candidateId');
            setSearchParams(newSearchParams, { replace: true });
          }}
          onUpdate={handleCandidateUpdate}
          initialActiveTab={initialTabFromUrl as 'overview' | 'portfolio' | 'email' | 'notes' | 'feedback' | 'offers' | undefined}
          initialEmailSubTab={initialEmailSubTabFromUrl as 'compose' | 'history' | undefined}
        />
      )}

      {/* Move candidate confirmation (after drag) */}
      {pendingMove && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Move candidate?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to move <strong>{pendingMove.candidateName}</strong> from{' '}
                  <strong>{stageDisplayName[pendingMove.fromStage]}</strong> to{' '}
                  <strong>{stageDisplayName[pendingMove.toStage]}</strong>?
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setPendingMove(null)} disabled={isMoving}>Cancel</Button>
                  <Button variant="black" onClick={confirmMoveCandidate} disabled={isMoving}>
                    {isMoving ? 'Moving...' : 'Yes, move'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default CandidateBoard;
