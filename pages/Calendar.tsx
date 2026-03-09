import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageLoader } from '../components/ui/PageLoader';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Interview, CalendarEvent } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { toUserError } from '../utils/edgeFunctionError';
import { Button } from '../components/ui/Button';
import { InterviewDetailsModal } from '../components/InterviewDetailsModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, CheckCircle, Video, Phone, MapPin } from 'lucide-react';

// Inject modern calendar styles
if (typeof document !== 'undefined') {
  const styleId = 'rbc-modern-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Base calendar */
      .rbc-calendar { font-family: inherit; }
      .rbc-toolbar { display: none; }

      /* Month grid */
      .rbc-month-view { border: none; border-radius: 12px; overflow: hidden; }
      .rbc-month-row { border-color: #f3f4f6; }
      .rbc-day-bg { border-color: #f3f4f6 !important; }
      .rbc-off-range-bg { background: #fafafa; }
      .rbc-today { background: #eff6ff !important; }
      .rbc-header { padding: 10px 0; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; border-color: #f3f4f6; background: #fff; }
      .rbc-date-cell { padding: 6px 8px; font-size: 13px; font-weight: 500; color: #374151; }
      .rbc-date-cell.rbc-now { font-weight: 700; }
      .rbc-date-cell.rbc-now a {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; border-radius: 50%;
        background: #111827; color: #fff; font-weight: 700;
      }
      .rbc-off-range { color: #d1d5db; }

      /* Events */
      .rbc-event {
        border-radius: 5px !important; border: none !important;
        font-size: 12px !important; font-weight: 500 !important;
        padding: 2px 6px !important; cursor: grab !important;
        transition: opacity 0.15s, transform 0.1s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      }
      .rbc-event:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.2); }
      .rbc-event:active { cursor: grabbing !important; }
      .rbc-event-content { pointer-events: none; }
      .rbc-show-more { color: #6366f1; font-size: 11px; font-weight: 600; padding: 0 4px; }

      /* Week / Day view */
      .rbc-time-view { border: none; border-radius: 12px; overflow: hidden; }
      .rbc-time-header { border-color: #f3f4f6; }
      .rbc-time-content { border-color: #f3f4f6; }
      .rbc-timeslot-group { border-color: #f9fafb; min-height: 40px; }
      .rbc-time-slot { border-color: #f9fafb !important; }
      .rbc-current-time-indicator { background: #3b82f6; height: 2px; }
      .rbc-current-time-indicator::before { background: #3b82f6; }
      .rbc-label { font-size: 11px; color: #9ca3af; font-weight: 500; padding-right: 8px; }
      .rbc-day-slot .rbc-time-slot { border-color: #f9fafb !important; }
      .rbc-day-slot .rbc-event { border-radius: 6px !important; }

      /* Drag */
      .rbc-event.rbc-addons-dnd-dragging { opacity: 0.4 !important; }
      .rbc-addons-dnd-drag-preview {
        opacity: 0.85 !important; cursor: grabbing !important;
        z-index: 9999 !important; pointer-events: none !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important;
        transform: rotate(1deg) scale(1.02);
      }
      .rbc-addons-dnd-over { background-color: rgba(59,130,246,0.06) !important; }
      .rbc-slot-selecting { background: rgba(59,130,246,0.08) !important; }
    `;
    document.head.appendChild(style);
  }
}

// Configure localizer for react-big-calendar with date-fns
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales,
});

// Wrap Calendar with drag and drop functionality
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

const Calendar: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [conflicts, setConflicts] = useState<Interview[]>([]);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [filters, setFilters] = useState<{
    type?: 'Google Meet' | 'Phone' | 'In-Person';
    status?: 'Scheduled' | 'Completed' | 'Cancelled';
  }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const dragStartRef = useRef<{ eventId: string | null; startTime: number }>({ eventId: null, startTime: 0 });
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    api.auth.me().then((me) => setUserRole(me?.role ?? '')).catch(() => {});
  }, []);
  const isViewer = userRole === 'Viewer';

  // Convert interviews to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return interviews.map((interview) => {
      const dateStr = interview.date;
      const timeStr = interview.time;
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const start = new Date(dateStr);
      start.setHours(hours, minutes, 0, 0);

      // Calculate end time
      let end: Date;
      if (interview.endTime) {
        const [endHours, endMinutes] = interview.endTime.split(':').map(Number);
        end = new Date(dateStr);
        end.setHours(endHours, endMinutes, 0, 0);
      } else {
        const durationMinutes = interview.durationMinutes || 60;
        end = new Date(start);
        end.setMinutes(end.getMinutes() + durationMinutes);
      }

      return {
        id: interview.id,
        title: `${interview.candidateName} - ${interview.jobTitle}`,
        start,
        end,
        resource: interview,
        type: interview.type,
        candidateName: interview.candidateName,
        jobTitle: interview.jobTitle,
        allDay: false,
      };
    });
  }, [interviews]);

  // Load interviews for current view
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoading(true);
        
        // Calculate date range based on view
        let startDate: Date;
        let endDate: Date;
        
        switch (view) {
          case 'month':
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            break;
          case 'week':
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
            startDate = weekStart;
            endDate = addDays(weekStart, 6);
            break;
          case 'day':
            startDate = new Date(currentDate);
            endDate = new Date(currentDate);
            break;
          default:
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        const calendarInterviews = await api.interviews.getCalendar(startDateStr, endDateStr, filters);
        setInterviews(calendarInterviews);
      } catch (error: any) {
        console.error('Error loading interviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInterviews();
  }, [currentDate, view, filters]);

  // Event style getter
  const eventStyleGetter = (event: CalendarEvent, start?: Date, end?: Date, isSelected?: boolean) => {
    let backgroundColor = '#3174ad';
    switch (event.type) {
      case 'Google Meet':
        backgroundColor = '#4285f4';
        break;
      case 'Phone':
        backgroundColor = '#34a853';
        break;
      case 'In-Person':
        backgroundColor = '#ea4335';
        break;
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        cursor: 'move',
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
      },
      className: 'rbc-event rbc-event-draggable',
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const interview = event.resource as Interview;
    const status = interview?.calendarSyncStatus;
    const isFailed = status === 'failed';
    return (
      <div className="rbc-event-content flex items-center gap-1 overflow-hidden">
        {status === 'synced' && <CheckCircle size={12} className="text-white shrink-0 opacity-90" />}
        {isFailed && <AlertTriangle size={12} className="text-white shrink-0 opacity-90" title={interview?.calendarSyncError || 'Calendar sync failed. Click to retry.'} />}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  // Handle event click - only open modal on actual clicks, not drags
  const handleSelectEvent = (event: CalendarEvent) => {
    // Always check if this was a drag first
    if (draggedEventId === event.id) {
      return;
    }
    
    // Use a timeout to distinguish clicks from drags
    // If handleEventDrop fires, it will set draggedEventId and prevent modal opening
    setTimeout(() => {
      if (draggedEventId !== event.id) {
        setSelectedEvent(event);
        setSelectedInterview(event.resource);
      }
    }, 200);
  };

  // Handle slot select (for creating new interviews)
  const handleSelectSlot = ({ start, action }: { start: Date; end: Date; action?: string }) => {
    // Don't create new event if we're in the middle of a drag
    if (isDragging || draggedEventId) {
      return;
    }
    setScheduleDate(start);
    setShowScheduleModal(true);
    
    // Check for conflicts at this time
    checkConflictsForSlot(start);
  };

  // Check conflicts for a selected time slot
  const checkConflictsForSlot = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const timeStr = format(date, 'HH:mm:ss');
      const conflictsList = await api.interviews.checkConflicts(dateStr, timeStr, 60);
      setConflicts(conflictsList);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflicts([]);
    }
  };

  // Handle schedule interview button
  const handleScheduleClick = () => {
    setScheduleDate(new Date());
    setShowScheduleModal(true);
  };

  // Handle drag-and-drop rescheduling
  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    // Immediately mark this as a drag operation to prevent modal from opening
    setDraggedEventId(event.id);
    
    // Clear dragged event after a delay
    setTimeout(() => {
      setDraggedEventId(null);
    }, 2000);

    // Ensure we have valid start date
    if (!start || isNaN(start.getTime())) {
      console.error('Invalid start date in handleEventDrop');
      handleCalendarUpdate();
      return;
    }

    // Format the new date and time from the dropped position
    const newDate = format(start, 'yyyy-MM-dd');
    const newTime = format(start, 'HH:mm:ss');
    const oldDate = event.resource.date;
    const oldTime = event.resource.time;
    
    // Check if date or time actually changed
    if (oldDate === newDate && oldTime === newTime) {
      // No change detected, refresh to revert visual
      handleCalendarUpdate();
      setDraggedEventId(null);
      return;
    }

    // Fetch the candidate for the interview
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', event.resource.candidateId)
        .single();
      
      if (candidateData && !candidateError) {
        const candidate = {
          id: candidateData.id,
          name: candidateData.name,
          email: candidateData.email,
          role: candidateData.role || '',
          jobId: candidateData.job_id,
          stage: candidateData.stage as any,
          appliedDate: candidateData.applied_date || candidateData.created_at,
          location: candidateData.location || '',
          skills: candidateData.skills || [],
          avatarUrl: candidateData.avatar_url,
          cvFileUrl: candidateData.cv_file_url,
          aiMatchScore: candidateData.ai_match_score,
          aiAnalysis: candidateData.ai_analysis,
        };
        setEditingCandidate(candidate);
      }
      setEditingInterview(event.resource);
      setScheduleDate(start);
      setShowScheduleModal(true);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      // Still open modal even if candidate fetch fails
      setEditingInterview(event.resource);
      setScheduleDate(start);
      setShowScheduleModal(true);
    }
  };


  // Handle resize (duration change)
  const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      // Update interview duration
      await api.interviews.reschedule(event.resource.id, event.resource.date, event.resource.time, durationMinutes);
      
      // Play notification sound for successful reschedule
      const { playNotificationSound } = await import('../utils/soundUtils');
      playNotificationSound();
      
      // Refresh calendar
      handleCalendarUpdate();
    } catch (error: any) {
      console.error('Error updating interview duration:', error);
      alert(toUserError(error, 'Failed to update interview. Please try again.'));
      handleCalendarUpdate(); // Refresh to revert visual change
    }
  };

  // Refresh calendar after updates
  const handleCalendarUpdate = async () => {
    // Reload interviews
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      switch (view) {
        case 'month':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          break;
        case 'week':
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          startDate = weekStart;
          endDate = addDays(weekStart, 6);
          break;
        case 'day':
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
          break;
        default:
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const calendarInterviews = await api.interviews.getCalendar(startDateStr, endDateStr, filters);
      setInterviews(calendarInterviews);
    } catch (error: any) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate dates
  const navigate = (action: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    
    switch (action) {
      case 'prev':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() - 1);
        }
        break;
      case 'next':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
        break;
      case 'today':
        newDate.setTime(Date.now());
        break;
    }
    
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        {/* Title row */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Calendar</h1>
            <p className="text-sm text-gray-500 mt-0.5">Schedule and manage interviews</p>
          </div>
          {!isViewer && (
            <Button variant="black" size="sm" onClick={handleScheduleClick}>
              <Plus size={16} />
              Schedule Interview
            </Button>
          )}
        </div>

        {/* Controls row — nav + filters + view switcher */}
        <div className="px-6 py-2 flex flex-wrap items-center gap-2 border-t border-gray-50">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => navigate('today')}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-base font-semibold text-gray-900 ml-2 whitespace-nowrap">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`}
              {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="flex-1" />

          {/* Type filter chips */}
          <div className="flex items-center gap-1">
            {([
              { value: undefined, label: 'All types', icon: null },
              { value: 'Google Meet' as const, label: 'Meet', icon: <Video size={11} /> },
              { value: 'Phone' as const, label: 'Phone', icon: <Phone size={11} /> },
              { value: 'In-Person' as const, label: 'In-Person', icon: <MapPin size={11} /> },
            ]).map(({ value, label, icon }) => (
              <button
                key={value ?? 'all'}
                onClick={() => setFilters({ ...filters, type: value })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filters.type === value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 ml-1">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Color legend */}
        <div className="px-6 pb-2.5 flex items-center gap-5">
          {[
            { label: 'Google Meet', color: 'bg-[#4285f4]' },
            { label: 'Phone', color: 'bg-[#34a853]' },
            { label: 'In-Person', color: 'bg-[#ea4335]' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-6 overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {loading ? (
          <PageLoader fullScreen={false} />
        ) : (
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            startAccessor={(e: CalendarEvent) => e.start}
            endAccessor={(e: CalendarEvent) => e.end}
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={view !== 'month' && !isViewer ? handleSelectSlot : undefined}
            onEventDrop={!isViewer ? handleEventDrop : undefined}
            onEventResize={!isViewer ? handleEventResize : undefined}
            selectable={view !== 'month' && !isViewer}
            resizable={view !== 'month' && !isViewer}
            draggableAccessor={() => !isViewer}
            showMultiDayTimes
            allDayAccessor={() => false}
            eventPropGetter={eventStyleGetter}
            step={15}
            timeslots={4}
            formats={{
              dayFormat: 'EEE d',
              dayHeaderFormat: 'EEEE, MMMM d',
              dayRangeHeaderFormat: ({ start, end }) => `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
              monthHeaderFormat: 'MMMM yyyy',
            }}
            components={{
              toolbar: () => null,
              event: EventComponent,
            }}
          />
        )}
      </div>

      {/* Interview Details Modal */}
      <InterviewDetailsModal
        interview={selectedInterview}
        isOpen={selectedInterview !== null && editingInterview === null}
        onClose={() => {
          setSelectedInterview(null);
          setSelectedEvent(null);
        }}
        onUpdate={handleCalendarUpdate}
        onDelete={handleCalendarUpdate}
        readOnly={isViewer}
        onEdit={(interview) => {
          setEditingInterview(interview);
          setSelectedInterview(null);
          setSelectedEvent(null);
          // Convert interview date/time to Date for ScheduleInterviewModal
          const interviewDate = new Date(interview.date);
          const [hours, minutes] = interview.time.split(':').map(Number);
          interviewDate.setHours(hours, minutes);
          setScheduleDate(interviewDate);
          setShowScheduleModal(true);
        }}
      />

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setScheduleDate(null);
          setConflicts([]);
          setEditingInterview(null);
          setEditingCandidate(null);
          handleCalendarUpdate();
        }}
        preSelectedCandidate={editingCandidate || undefined}
        initialDate={scheduleDate || null}
        initialTime={scheduleDate ? format(scheduleDate, 'HH:mm') : null}
        editingInterviewId={editingInterview?.id || null}
      />

      {/* Conflict Warning */}
      {conflicts.length > 0 && showScheduleModal && (
        <div className="fixed bottom-8 right-8 z-50 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-yellow-900 mb-1">Scheduling Conflict</h4>
              <p className="text-xs text-yellow-800 mb-2">
                You already have {conflicts.length} interview{conflicts.length > 1 ? 's' : ''} scheduled at this time:
              </p>
              <ul className="text-xs text-yellow-800 space-y-1">
                {conflicts.slice(0, 3).map((conflict) => (
                  <li key={conflict.id}>• {conflict.candidateName} - {conflict.jobTitle}</li>
                ))}
                {conflicts.length > 3 && <li>• ...and {conflicts.length - 3} more</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;












