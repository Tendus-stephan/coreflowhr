import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Interview } from '../types';
import { CalendarSkeleton } from '../components/ui/Skeleton';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import {
    Plus, ChevronLeft, ChevronRight,
    Video, Phone, MapPin, Clock, Briefcase,
    Calendar as CalendarIcon, ExternalLink, CheckCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import {
    format, isToday, isSameDay, isSameMonth, isPast,
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths,
} from 'date-fns';

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_CHIP: Record<Interview['type'], string> = {
    'Google Meet': 'bg-blue-50 text-blue-700 border-blue-100',
    'Phone':       'bg-green-50 text-green-700 border-green-100',
    'In-Person':   'bg-orange-50 text-orange-700 border-orange-100',
};

const TypeIcon: React.FC<{ type: Interview['type']; size?: number }> = ({ type, size = 11 }) => {
    if (type === 'Google Meet') return <Video size={size} />;
    if (type === 'Phone') return <Phone size={size} />;
    return <MapPin size={size} />;
};

// ── Main Calendar ─────────────────────────────────────────────────────────────

const Calendar: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

    // Google Calendar sync status (best-effort — API may not expose this yet)
    useEffect(() => {
        try {
            (api as any).integrations?.getIntegrations?.()
                ?.then((ints: any[]) => {
                    const gcal = ints?.find((i: any) =>
                        i.name?.toLowerCase().includes('google') && (i.active || i.connectedEmail)
                    );
                    if (gcal?.connectedEmail) setConnectedEmail(gcal.connectedEmail);
                })
                ?.catch(() => {});
        } catch { /* ignore */ }
    }, []);

    // Load interviews for the visible grid range
    const loadInterviews = (month: Date) => {
        const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
        return api.interviews.getCalendar(
            format(start, 'yyyy-MM-dd'),
            format(end, 'yyyy-MM-dd'),
            {}
        );
    };

    useEffect(() => {
        loadInterviews(currentMonth)
            .then(data => { setInterviews(data); setInitialLoading(false); })
            .catch(() => setInitialLoading(false));
    }, [currentMonth]);

    // Calendar grid days (Mon-start, fills 5-6 weeks)
    const gridDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Interviews keyed by date string
    const byDate = useMemo(() => {
        const map = new Map<string, Interview[]>();
        for (const iv of interviews) {
            if (!map.has(iv.date)) map.set(iv.date, []);
            map.get(iv.date)!.push(iv);
        }
        return map;
    }, [interviews]);

    // Selected day interviews sorted by time
    const dayInterviews = useMemo(() => {
        const key = format(selectedDay, 'yyyy-MM-dd');
        return (byDate.get(key) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
    }, [selectedDay, byDate]);

    const upcomingCount = useMemo(() =>
        interviews.filter(iv =>
            !isPast(new Date(`${iv.date}T${iv.time}`)) && iv.status !== 'Cancelled'
        ).length,
        [interviews]
    );

    const afterSchedule = () => {
        setShowScheduleModal(false);
        loadInterviews(currentMonth).then(setInterviews).catch(() => {});
    };

    if (initialLoading) return <CalendarSkeleton />;

    const numWeeks = gridDays.length / 7;

    return (
        <div className="flex flex-col bg-white" style={{ height: '100vh', minHeight: 0, overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h1>

                    {/* Month navigation */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <button
                        onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
                        className="px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors"
                    >
                        Today
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {connectedEmail && (
                        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                            <CheckCircle size={11} className="text-green-500" />
                            Synced · {connectedEmail}
                        </span>
                    )}
                    <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowScheduleModal(true)}>
                        Schedule Interview
                    </Button>
                </div>
            </div>

            {/* ── Body: grid + side panel ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Calendar grid */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
                        {DAY_HEADERS.map(d => (
                            <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grid cells */}
                    <div
                        className="flex-1 grid grid-cols-7 overflow-hidden"
                        style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(100px, 1fr))` }}
                    >
                        {gridDays.map(day => {
                            const key = format(day, 'yyyy-MM-dd');
                            const dayIvs = byDate.get(key) ?? [];
                            const isSelected = isSameDay(day, selectedDay);
                            const inMonth = isSameMonth(day, currentMonth);
                            const isCurrentDay = isToday(day);

                            return (
                                <div
                                    key={key}
                                    onClick={() => setSelectedDay(day)}
                                    className={`border-b border-r border-gray-100 p-1.5 cursor-pointer flex flex-col overflow-hidden transition-colors ${
                                        isSelected
                                            ? 'bg-gray-50'
                                            : 'hover:bg-gray-50/50'
                                    } ${!inMonth ? 'opacity-35' : ''}`}
                                >
                                    {/* Date number */}
                                    <div className="flex items-center mb-1 flex-shrink-0">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-medium leading-none flex-shrink-0 ${
                                            isCurrentDay
                                                ? 'bg-gray-900 text-white'
                                                : isSelected
                                                ? 'font-bold text-gray-900'
                                                : 'text-gray-500'
                                        }`}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    {/* Interview chips — max 2 shown, then "+N more" */}
                                    <div className="flex flex-col gap-0.5 min-h-0">
                                        {dayIvs.slice(0, 2).map(iv => (
                                            <div
                                                key={iv.id}
                                                className={`flex items-center gap-1 px-1.5 py-[3px] rounded text-[10px] font-medium border truncate flex-shrink-0 ${
                                                    iv.status === 'Cancelled'
                                                        ? 'bg-gray-50 text-gray-400 border-gray-100 line-through'
                                                        : iv.status === 'Completed'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : TYPE_CHIP[iv.type]
                                                }`}
                                            >
                                                <TypeIcon type={iv.type} size={9} />
                                                <span className="truncate leading-none">
                                                    {iv.candidateName.split(' ')[0]}
                                                </span>
                                            </div>
                                        ))}
                                        {dayIvs.length > 2 && (
                                            <span className="text-[10px] text-gray-400 pl-1 flex-shrink-0">
                                                +{dayIvs.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Day detail panel ── */}
                <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col overflow-hidden">
                    {/* Panel header */}
                    <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                            {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEE, d MMM yyyy')}
                        </p>
                        <div className="flex items-end justify-between gap-2">
                            <p className="text-lg font-bold text-gray-900 leading-tight">
                                {format(selectedDay, 'EEEE')}
                            </p>
                            {dayInterviews.length > 0 && (
                                <span className="text-[11px] font-medium text-gray-400 mb-0.5">
                                    {dayInterviews.length} interview{dayInterviews.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Interviews for selected day */}
                    <div className="flex-1 overflow-y-auto">
                        {dayInterviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-12 text-center">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <CalendarIcon size={16} className="text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-400">No interviews scheduled</p>
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                                >
                                    Schedule one →
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 px-1">
                                {dayInterviews.map(iv => {
                                    const [h, m] = iv.time.split(':').map(Number);
                                    const startDt = new Date(selectedDay);
                                    startDt.setHours(h, m, 0, 0);

                                    return (
                                        <div key={iv.id} className="px-3 py-3">
                                            {/* Type + status row */}
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                                    iv.status === 'Cancelled'
                                                        ? 'bg-gray-50 text-gray-400 border-gray-100'
                                                        : iv.status === 'Completed'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : TYPE_CHIP[iv.type]
                                                }`}>
                                                    <TypeIcon type={iv.type} size={10} />
                                                    {iv.type}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                                    iv.status === 'Completed' ? 'bg-green-50 text-green-700' :
                                                    iv.status === 'Cancelled' ? 'bg-gray-100 text-gray-400' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {iv.status ?? 'Scheduled'}
                                                </span>
                                            </div>

                                            {/* Candidate name */}
                                            <p className="text-[13px] font-semibold text-gray-900 leading-snug mb-1">
                                                {iv.candidateName}
                                            </p>

                                            {/* Job title */}
                                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                                                <Briefcase size={10} className="flex-shrink-0" />
                                                <span className="truncate">{iv.jobTitle}</span>
                                            </div>

                                            {/* Time */}
                                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <Clock size={10} className="flex-shrink-0" />
                                                <span>
                                                    {format(startDt, 'h:mm a')}
                                                    {iv.durationMinutes ? ` · ${iv.durationMinutes} min` : ''}
                                                </span>
                                            </div>

                                            {/* Scheduled by */}
                                            {iv.creatorName && (
                                                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                                                    <span>by {iv.creatorName}</span>
                                                </div>
                                            )}

                                            {/* Meeting link */}
                                            {iv.meetingLink && (
                                                <a
                                                    href={iv.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    <ExternalLink size={10} />
                                                    Join meeting
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Panel footer */}
                    <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                        <p className="text-[11px] text-gray-400">
                            {upcomingCount > 0
                                ? `${upcomingCount} upcoming this month`
                                : 'No upcoming interviews this month'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule modal — passes selected day as initial date */}
            <ScheduleInterviewModal
                isOpen={showScheduleModal}
                onClose={afterSchedule}
                preSelectedCandidate={undefined}
                initialDate={selectedDay}
                initialTime={null}
                editingInterviewId={null}
            />
        </div>
    );
};

export default Calendar;
