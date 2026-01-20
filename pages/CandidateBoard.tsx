import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Candidate, CandidateStage, Job } from '../types';
import { PipelineColumn } from '../components/PipelineColumn';
import { 
    Users, CheckCircle, Clock, Sparkles, Search, ChevronDown, 
    Filter, MoreHorizontal, TrendingUp, Download, Bell 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CandidateModal } from '../components/CandidateModal';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { Toast } from '../components/ui/Toast';
import { api, Notification } from '../services/api';

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

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

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
    };
    loadData();
  }, []);

  // Handle candidate ID from URL parameter
  useEffect(() => {
    const candidateId = searchParams.get('candidateId');
    if (candidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        setSelectedCandidate(candidate);
        // Remove the candidateId from URL after opening modal
        searchParams.delete('candidateId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [candidates, searchParams, setSearchParams]);

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
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
              <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className={trend.includes('+') ? 'text-green-600' : 'text-gray-400'} />
                  <span className={`text-[10px] font-medium ${trend.includes('+') ? 'text-green-600' : 'text-gray-500'}`}>
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

      try {
          // Update candidate stage via API
          const updatedCandidate = await api.candidates.update(candidateId, {
              stage: newStage
          });

          // Update local state
          await handleCandidateUpdate(updatedCandidate);
      } catch (error: any) {
          console.error('Error moving candidate:', error);
          const errorMessage = error?.message || 'Failed to move candidate. Please try again.';
          setToastMessage(errorMessage);
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
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
      return (
          <div className="flex items-center justify-center min-h-screen bg-white">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="flex flex-col bg-white min-h-full" style={{ height: '100%' }}>
      
      {/* Fixed Header Section */}
      <div className="px-8 pt-8 pb-4 space-y-6 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Candidates Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Manage and review candidates for your open positions.</p>
            </div>
            <div className="flex gap-3 items-center">
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors bg-white ${showNotifications ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
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
                    icon={<Download size={16} />}
                    onClick={async () => {
                        try {
                            // Export all filtered candidates to CSV
                            // Check export limit
                            const exportCheck = await api.plan.canExportCandidates(filteredCandidates.length);
                            if (!exportCheck.allowed) {
                                alert(exportCheck.message || `Your plan allows up to ${exportCheck.maxAllowed} candidates per export. Please filter to fewer candidates or upgrade to Professional.`);
                                return;
                            }
                            
                            const csvContent = [
                                ['Name', 'Email', 'Role', 'Stage', 'AI Match Score', 'Skills', 'Location', 'Experience'].join(','),
                                ...filteredCandidates.map(c => [
                                    `"${c.name}"`,
                                    `"${c.email || ''}"`,
                                    `"${c.role || ''}"`,
                                    `"${c.stage}"`,
                                    c.aiMatchScore || '',
                                    `"${(c.skills || []).join('; ')}"`,
                                    `"${c.location || ''}"`,
                                    c.experience || ''
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
                        } catch (error) {
                            console.error('Error exporting candidates:', error);
                            alert('Failed to export candidates. Please try again.');
                        }
                    }}
                >
                    Export
                </Button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Total Candidates" 
                value={metrics.total} 
                subtext="from last month" 
                trend="+12%" 
                icon={Users} 
              />
              <MetricCard 
                title="Qualified Candidates" 
                value={metrics.qualified} 
                subtext="from last week" 
                trend="+8%" 
                icon={CheckCircle} 
              />
              <MetricCard 
                title="Waitlist" 
                value={metrics.waitlist} 
                subtext="from last week" 
                trend="+5%" 
                icon={Clock} 
              />
              <MetricCard 
                title="Avg Match Score" 
                value={`${metrics.avgScore}%`} 
                subtext="from last week" 
                trend="+3%" 
                icon={Sparkles} 
              />
          </div>

          {/* Filter Bar Container */}
          <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm space-y-4">
              
              {/* Pills Row */}
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 px-2 pt-2 overflow-x-auto">
                   {[
                       { name: 'Qualified', color: 'bg-black' },
                       { name: 'Interview', color: 'bg-black' },
                       { name: 'Rejected', color: 'bg-black' },
                       { name: 'Waitlist', color: 'bg-black' },
                       { name: 'Offer', color: 'bg-black' },
                       { name: 'Hired', color: 'bg-black' },
                       { name: 'Screening', color: 'bg-black' },
                       { name: 'All', color: 'bg-black' }
                   ].map(pill => (
                       <button
                           key={pill.name}
                           onClick={() => setSelectedStageFilter(pill.name)}
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                               selectedStageFilter === pill.name 
                               ? 'bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-200' 
                               : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                           }`}
                       >
                           <span className={`w-2 h-2 rounded-full ${pill.color}`}></span>
                           {pill.name}
                           <span className="ml-1 bg-white border border-gray-200 px-1.5 rounded-md text-xs font-medium text-gray-500">
                               {counts[pill.name as keyof typeof counts]}
                           </span>
                       </button>
                   ))}
              </div>

              {/* Search & Dropdowns Row */}
              <div className="flex flex-col md:flex-row gap-4 px-2 pb-2">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search candidates, jobs, or skills..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                      />
                  </div>
                  <div className="relative">
                      <select 
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                          <option value="all">All jobs</option>
                          {jobs.map(job => (
                              <option key={job.id} value={job.id}>{job.title}</option>
                          ))}
                      </select>
                  </div>
              </div>
          </div>
      </div>

      {/* Flexible Board Area with Horizontal Scroll */}
      <div className="flex-1 bg-white px-8" style={{ overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
          <div className="flex gap-6 w-max snap-x snap-mandatory pb-4" style={{ height: '100%' }}>
            <PipelineColumn 
                title="Waitlist" 
                stage={CandidateStage.NEW} 
                candidates={getCandidatesByStage(CandidateStage.NEW)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
            <PipelineColumn 
                title="Screening" 
                stage={CandidateStage.SCREENING} 
                candidates={getCandidatesByStage(CandidateStage.SCREENING)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
            <PipelineColumn 
                title="Interview" 
                stage={CandidateStage.INTERVIEW} 
                candidates={getCandidatesByStage(CandidateStage.INTERVIEW)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
            <PipelineColumn 
                title="Offer" 
                stage={CandidateStage.OFFER} 
                candidates={getCandidatesByStage(CandidateStage.OFFER)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
            <PipelineColumn 
                title="Hired" 
                stage={CandidateStage.HIRED} 
                candidates={getCandidatesByStage(CandidateStage.HIRED)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
            <PipelineColumn 
                title="Rejected" 
                stage={CandidateStage.REJECTED} 
                candidates={getCandidatesByStage(CandidateStage.REJECTED)} 
                onSelectCandidate={setSelectedCandidate}
                onDropCandidate={handleDropCandidate}
                isValidDropTarget={isValidStageTransition}
            />
          </div>
      </div>

      {selectedCandidate && (
          <CandidateModal 
            candidate={selectedCandidate} 
            isOpen={!!selectedCandidate} 
            onClose={() => {
              setSelectedCandidate(null);
              // Remove candidateId from URL when closing modal
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('candidateId');
              setSearchParams(newSearchParams, { replace: true });
            }}
            onUpdate={handleCandidateUpdate}
          />
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default CandidateBoard;
