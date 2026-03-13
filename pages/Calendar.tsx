import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Interview } from '../types';
import { PageLoader } from '../components/ui/PageLoader';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import {
  Plus, ExternalLink, Calendar as CalendarIcon, RefreshCw,
  Video, Phone, MapPin, Clock, Briefcase, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

type GCalView = 'WEEK' | 'MONTH' | 'DAY' | 'AGENDA';
type TabMode = 'google' | 'coreflow';

// ── Upcoming interview list ─────────────────────────────────────────────────

const interviewTypeIcon = (type: Interview['type']) => {
  if (type === 'Google Meet') return <Video size={13} className="text-blue-500" />;
  if (type === 'Phone') return <Phone size={13} className="text-green-600" />;
  return <MapPin size={13} className="text-orange-500" />;
};

const InterviewList: React.FC<{ interviews: Interview[]; onSchedule: () => void }> = ({ interviews, onSchedule }) => {
  const upcoming = [...interviews].sort((a, b) =>
    new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  );

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <CalendarIcon size={22} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No upcoming interviews</p>
        <p className="text-xs text-gray-400 max-w-xs">Schedule your first interview to get started.</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={onSchedule}>Schedule Interview</Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {upcoming.map(iv => {
        const dt = new Date(`${iv.date}T${iv.time}`);
        const past = isPast(dt) && !isToday(dt);
        let dayLabel = format(dt, 'EEE d MMM');
        if (isToday(dt)) dayLabel = 'Today';
        else if (isTomorrow(dt)) dayLabel = 'Tomorrow';

        return (
          <div key={iv.id} className={`px-6 py-4 hover:bg-gray-50 transition-colors ${past ? 'opacity-40' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {interviewTypeIcon(iv.type)}
                  <span className="text-sm font-semibold text-gray-900 truncate">{iv.candidateName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                  <Briefcase size={11} className="text-gray-400" />
                  <span className="truncate">{iv.jobTitle}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {dayLabel} · {format(dt, 'h:mm a')}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>{iv.type}</span>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                iv.status === 'Completed' ? 'bg-green-50 text-green-700' :
                iv.status === 'Cancelled' ? 'bg-gray-100 text-gray-400' :
                'bg-blue-50 text-blue-700'
              }`}>
                {iv.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Calendar page ──────────────────────────────────────────────────────

const Calendar: React.FC = () => {
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [calView, setCalView] = useState<GCalView>('WEEK');
  const [iframeKey, setIframeKey] = useState(0);
  const [tab, setTab] = useState<TabMode>('google');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(140);

  useEffect(() => {
    const load = async () => {
      try {
        const integrations = await api.integrations.getIntegrations();
        const gcal = integrations.find(i =>
          i.name?.toLowerCase().includes('google') && (i.active || i.connectedEmail)
        );
        if (gcal) {
          setIsConnected(true);
          setConnectedEmail(gcal.connectedEmail || null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (tab === 'coreflow') {
      const today = format(new Date(), 'yyyy-MM-dd');
      const in30 = format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd');
      api.interviews.getCalendar(today, in30, {}).then(setInterviews).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight);
    });
    obs.observe(headerRef.current);
    setHeaderH(headerRef.current.offsetHeight);
    return () => obs.disconnect();
  }, []);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // No src= param — lets Google show the currently signed-in user's own calendar.
  // Using src=EMAIL embeds a specific public calendar which fails for private accounts.
  const embedSrc = `https://calendar.google.com/calendar/embed?ctz=${encodeURIComponent(tz)}&mode=${calView}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=1&showTz=0&wkst=2&hl=en`;

  const afterSchedule = () => {
    setShowScheduleModal(false);
    setIframeKey(k => k + 1);
    if (tab === 'coreflow') {
      const today = format(new Date(), 'yyyy-MM-dd');
      api.interviews.getCalendar(today, format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'), {})
        .then(setInterviews).catch(() => {});
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col bg-white" style={{ height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div ref={headerRef} className="flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="px-8 pt-7 pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Calendar</h1>
            <p className="mt-1.5 text-sm text-gray-400 font-normal">
              {isConnected && connectedEmail
                ? `Synced with ${connectedEmail} — interviews appear automatically.`
                : 'Schedule interviews. Connect Google Calendar in Settings to sync them.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'google' && (
              <>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  {(['DAY', 'WEEK', 'MONTH', 'AGENDA'] as GCalView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setCalView(v); setIframeKey(k => k + 1); }}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        calView === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {v.charAt(0) + v.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIframeKey(k => k + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
                <a
                  href="https://calendar.google.com/calendar/r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Open in Google Calendar"
                >
                  <ExternalLink size={14} />
                </a>
              </>
            )}
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowScheduleModal(true)}>
              Schedule Interview
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 flex items-center gap-1 -mb-px">
          <button
            onClick={() => setTab('google')}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'google' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Google Calendar
            {isConnected
              ? <CheckCircle size={12} className="text-green-500" />
              : <AlertCircle size={12} className="text-gray-300" />}
          </button>
          <button
            onClick={() => setTab('coreflow')}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'coreflow' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            CoreFlow Interviews
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ height: `calc(100vh - ${headerH}px)`, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'google' ? (
          // Always show the embed — Google renders the signed-in user's own calendar.
          // A soft banner at the bottom shows sync status (no hard gate).
          <div className="relative w-full h-full">
            <iframe
              key={iframeKey}
              src={embedSrc}
              title="Google Calendar"
              style={{ border: 0, width: '100%', height: 'calc(100% - 36px)', display: 'block' }}
              frameBorder="0"
              scrolling="no"
              allowFullScreen
            />
            {/* Sync status strip */}
            <div className="absolute bottom-0 left-0 right-0 h-9 bg-white border-t border-gray-100 px-5 flex items-center justify-between gap-3">
              {isConnected ? (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-green-500" />
                  Interviews sync automatically
                  {connectedEmail && <> to <strong className="text-gray-600">{connectedEmail}</strong></>}
                </p>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <AlertCircle size={11} className="text-amber-400" />
                  Interviews aren't syncing yet —{' '}
                  <a href="/settings?tab=integrations" className="text-gray-700 underline hover:text-gray-900">
                    connect Google Calendar in Settings
                  </a>
                </p>
              )}
              <a
                href="https://calendar.google.com/calendar/r"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                Open full screen <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <InterviewList interviews={interviews} onSchedule={() => setShowScheduleModal(true)} />
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={showScheduleModal}
        onClose={afterSchedule}
        preSelectedCandidate={undefined}
        initialDate={null}
        initialTime={null}
        editingInterviewId={null}
      />
    </div>
  );
};

export default Calendar;
