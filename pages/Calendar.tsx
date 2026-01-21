import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Interview, CalendarEvent } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { Button } from '../components/ui/Button';
import { InterviewDetailsModal } from '../components/InterviewDetailsModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus, AlertTriangle } from 'lucide-react';

// Add custom styles for drag feedback - event should follow cursor
if (typeof document !== 'undefined') {
  const styleId = 'rbc-drag-feedback-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .rbc-event.rbc-addons-dnd-dragging {
        opacity: 0.5 !important;
        cursor: grabbing !important;
      }
      .rbc-addons-dnd-drag-preview {
        opacity: 0.85 !important;
        cursor: grabbing !important;
        z-index: 9999 !important;
        box-shadow: 0 8px 16px rgba(0,0,0,0.4) !important;
        transform: rotate(2deg);
        pointer-events: none !important;
      }
      .rbc-addons-dnd-over {
        background-color: rgba(66, 133, 244, 0.1) !important;
      }
      .rbc-event {
        cursor: grab !important;
        transition: opacity 0.2s;
      }
      .rbc-event:active {
        cursor: grabbing !important;
      }
      .rbc-event-content {
        pointer-events: none;
      }
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
      alert(`Failed to update interview duration: ${error.message || 'Please try again.'}`);
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
    <div className="flex flex-col bg-white min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and schedule interviews</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} />
              Filters
            </Button>
            <Button variant="black" size="sm" onClick={handleScheduleClick}>
              <Plus size={16} />
              Schedule Interview
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex gap-3 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
              <select
                value={filters.type || 'all'}
                onChange={(e) => setFilters({
                  ...filters,
                  type: e.target.value === 'all' ? undefined : e.target.value as any
                })}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Phone">Phone</option>
                <option value="In-Person">In-Person</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => setFilters({
                  ...filters,
                  status: e.target.value === 'all' ? undefined : e.target.value as any
                })}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('next')}>
              <ChevronRight size={16} />
            </Button>
            <span className="text-lg font-semibold text-gray-900 ml-4">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`}
              {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'month' ? 'black' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'black' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'day' ? 'black' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-6 overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading calendar...</div>
          </div>
        ) : (
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            startAccessor={(event: any) => event.start}
            endAccessor={(event: any) => event.end}
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={view !== 'month' ? handleSelectSlot : undefined}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            selectable={view !== 'month'}
            resizable={view !== 'month'}
            draggableAccessor={() => true}
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
              toolbar: () => null
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












