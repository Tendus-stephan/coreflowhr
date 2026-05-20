import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { format, addDays, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { Check, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { darkenHex } from '../utils/colorUtils';

// Detect candidate's local timezone abbreviation (e.g. "BST", "EST", "PST")
function getTzAbbr(): string | null {
    try {
        return new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
            .formatToParts(new Date())
            .find(p => p.type === 'timeZoneName')?.value ?? null;
    } catch {
        return null;
    }
}

// ── Shell (same pattern as OfferResponse) ─────────────────────────────────────
const DEFAULT_BANNER = '#1e3a5f';
const buildGradient = (color: string) =>
    `linear-gradient(135deg, ${color} 0%, ${darkenHex(color, 38)} 100%)`;

const MAX_W = '680px';

const Shell: React.FC<{
    children: React.ReactNode;
    companyName?: string | null;
    companyLogoUrl?: string | null;
    bannerColor?: string | null;
}> = ({ children, companyName, companyLogoUrl, bannerColor }) => {
    const [logoErr, setLogoErr] = useState(false);
    const gradient = buildGradient(bannerColor || DEFAULT_BANNER);

    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="relative">
                <div className="relative w-full overflow-hidden" style={{ height: '200px', background: gradient }}>
                    <div
                        className="absolute inset-x-0 bottom-0"
                        style={{ height: '80px', background: 'linear-gradient(to bottom, transparent 0%, white 100%)' }}
                    />
                    <svg viewBox="0 0 1440 40" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '40px' }}>
                        <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#ffffff" />
                    </svg>
                </div>
                <div className="mx-auto px-6 relative" style={{ maxWidth: MAX_W }}>
                    <div className="flex items-center gap-4 -mt-10 pb-6">
                        <div
                            className="flex-shrink-0 bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm"
                            style={{ width: 80, height: 80, borderRadius: '10px' }}
                        >
                            {companyLogoUrl && !logoErr ? (
                                <img src={companyLogoUrl} alt={companyName || 'Company'} className="w-full h-full object-contain p-2" onError={() => setLogoErr(true)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
                                    <span className="text-white text-2xl font-extrabold select-none">
                                        {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {companyName && (
                            <div className="min-w-0">
                                <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: '18px' }}>{companyName}</h1>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto px-6 pb-10" style={{ maxWidth: MAX_W }}>
                {children}
            </div>

            <div className="flex justify-center pb-12">
                <a
                    href="https://www.coreflowhr.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
                >
                    <img src="/assets/images/coreflow-favicon-logo.png" alt="" className="w-4 h-4 object-contain opacity-70" />
                    Powered by CoreflowHR
                </a>
            </div>
        </div>
    );
};

// ── Slot generation ────────────────────────────────────────────────────────────
function generateSlots(
    dateRangeStart: string,
    dateRangeEnd: string,
    hoursStart: string,
    hoursEnd: string,
    durationMinutes: number,
    bufferMinutes: number,
    takenSlots: string[],
): Map<string, string[]> {
    const result = new Map<string, string[]>();
    const now = new Date();

    const [hsH, hsM] = hoursStart.split(':').map(Number);
    const [heH, heM] = hoursEnd.split(':').map(Number);

    const startDay = parseISO(dateRangeStart);
    const endDay = parseISO(dateRangeEnd);

    // Parse taken slots into intervals [start, end]
    const taken = takenSlots.map((iso) => {
        const s = new Date(iso);
        // Assume interview duration same as link duration (best effort; real collision check is server-side)
        const e = new Date(s.getTime() + durationMinutes * 60_000);
        return { start: s, end: e };
    });

    const stepMs = (durationMinutes + bufferMinutes) * 60_000;

    let day = startDay;
    while (!isAfter(day, endDay)) {
        const dow = day.getDay();
        if (dow !== 0 && dow !== 6) {
            // Build slots for this day
            const dateStr = format(day, 'yyyy-MM-dd');
            const slots: string[] = [];

            const slotStart = new Date(day);
            slotStart.setHours(hsH, hsM, 0, 0);

            const slotLimit = new Date(day);
            slotLimit.setHours(heH, heM, 0, 0);
            // Last slot must end by hoursEnd
            const latestStart = new Date(slotLimit.getTime() - durationMinutes * 60_000);

            let cursor = slotStart.getTime();
            while (cursor <= latestStart.getTime()) {
                const slotS = new Date(cursor);
                const slotE = new Date(cursor + durationMinutes * 60_000);

                // Must be in the future
                if (isBefore(slotS, now)) {
                    cursor += stepMs;
                    continue;
                }

                // Check overlap with taken slots
                const overlaps = taken.some(
                    (t) => slotS < t.end && slotE > t.start,
                );

                if (!overlaps) {
                    slots.push(slotS.toISOString());
                }
                cursor += stepMs;
            }

            if (slots.length > 0) {
                result.set(dateStr, slots);
            }
        }
        day = addDays(day, 1);
    }
    return result;
}

// ── Main page ──────────────────────────────────────────────────────────────────
const SchedulingPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();

    const [linkData, setLinkData] = useState<any | null>(null);
    const [takenSlots, setTakenSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [booked, setBooked] = useState(false);
    const [bookError, setBookError] = useState<string | null>(null);

    // Week navigation — which week is shown (index 0 = first week of date range)
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const tzAbbr = useMemo(() => getTzAbbr(), []);

    useEffect(() => {
        if (!token) {
            setError('Invalid link');
            setLoading(false);
            return;
        }
        Promise.all([
            api.schedulingLinks.getByToken(token),
            api.schedulingLinks.getTakenSlots(token),
        ]).then(([link, taken]) => {
            if (!link) {
                setError('This scheduling link could not be found.');
            } else {
                setLinkData(link);
                setTakenSlots(taken);
                setName(link.candidateName ?? '');
                setEmail(link.candidateEmail ?? '');
            }
        }).catch(() => {
            setError('Failed to load scheduling link. Please try again.');
        }).finally(() => setLoading(false));
    }, [token]);

    const slotMap = useMemo(() => {
        if (!linkData) return new Map<string, string[]>();
        return generateSlots(
            linkData.dateRangeStart,
            linkData.dateRangeEnd,
            linkData.availableHoursStart,
            linkData.availableHoursEnd,
            linkData.durationMinutes,
            linkData.bufferMinutes,
            takenSlots,
        );
    }, [linkData, takenSlots]);

    // Build list of days that have slots
    const daysWithSlots = useMemo(() => {
        const days: string[] = [];
        if (!linkData) return days;
        const start = parseISO(linkData.dateRangeStart);
        const end = parseISO(linkData.dateRangeEnd);
        let d = start;
        while (!isAfter(d, end)) {
            days.push(format(d, 'yyyy-MM-dd'));
            d = addDays(d, 1);
        }
        return days;
    }, [linkData]);

    // Week-strip: 7 days at a time starting from date range start
    const weekDays = useMemo(() => {
        if (!linkData) return [];
        const start = parseISO(linkData.dateRangeStart);
        const weekStart = addDays(start, weekOffset * 7);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
            .filter((d) => !isAfter(d, parseISO(linkData.dateRangeEnd)));
    }, [linkData, weekOffset]);

    const maxWeekOffset = useMemo(() => {
        if (!linkData) return 0;
        const start = parseISO(linkData.dateRangeStart);
        const end = parseISO(linkData.dateRangeEnd);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
        return Math.max(0, Math.ceil(totalDays / 7) - 1);
    }, [linkData]);

    const handleBook = async () => {
        if (!selectedSlot || !name.trim() || !email.trim() || !token) return;
        setSubmitting(true);
        setBookError(null);
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('book-scheduling-slot', {
                body: { token, slot: selectedSlot, name: name.trim(), email: email.trim() },
            });
            if (fnErr) throw fnErr;
            if (data?.error) {
                setBookError(data.error);
                return;
            }
            setBooked(true);
        } catch (err: any) {
            setBookError(err?.message || 'Booking failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Shell>
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                </div>
            </Shell>
        );
    }

    if (error) {
        return (
            <Shell>
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Link not found</h2>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </Shell>
        );
    }

    if (!linkData) return null;

    const isExpired = linkData.status === 'expired';
    const isAlreadyBooked = linkData.status === 'booked';

    if (isExpired) {
        return (
            <Shell companyName={linkData.companyName} companyLogoUrl={linkData.companyLogoUrl} bannerColor={linkData.bannerColor}>
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Clock size={24} className="text-gray-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">This link has expired</h2>
                    <p className="text-sm text-gray-500">Please contact your recruiter to send a new scheduling link.</p>
                </div>
            </Shell>
        );
    }

    if (isAlreadyBooked && !booked) {
        return (
            <Shell companyName={linkData.companyName} companyLogoUrl={linkData.companyLogoUrl} bannerColor={linkData.bannerColor}>
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <Check size={24} className="text-green-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Interview already booked</h2>
                    <p className="text-sm text-gray-500">This scheduling link has already been used.</p>
                    {linkData.bookedSlot && (
                        <p className="text-sm font-medium text-gray-700 mt-2">
                            {format(new Date(linkData.bookedSlot), 'EEEE, MMMM d · h:mm a')}
                        </p>
                    )}
                </div>
            </Shell>
        );
    }

    if (booked && selectedSlot) {
        return (
            <Shell companyName={linkData.companyName} companyLogoUrl={linkData.companyLogoUrl} bannerColor={linkData.bannerColor}>
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <Check size={24} className="text-green-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Interview booked</h2>
                    <p className="text-sm text-gray-500">
                        {format(new Date(selectedSlot), 'EEEE, MMMM d · h:mm a')}{tzAbbr ? ` ${tzAbbr}` : ''} · {linkData.durationMinutes} min
                    </p>
                    <p className="text-xs text-gray-400 mt-2">A confirmation email has been sent to {email}</p>
                </div>
            </Shell>
        );
    }

    const selectedDaySlots = selectedDay ? (slotMap.get(selectedDay) ?? []) : [];

    return (
        <Shell companyName={linkData.companyName} companyLogoUrl={linkData.companyLogoUrl} bannerColor={linkData.bannerColor}>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Info banner */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                        {linkData.jobTitle ? `${linkData.interviewType} — ${linkData.jobTitle}` : linkData.interviewType}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {linkData.durationMinutes} min · Select a time that works for you
                        {tzAbbr && <span className="ml-1 text-gray-400">· {tzAbbr}</span>}
                    </p>
                    {linkData.message && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{linkData.message}"</p>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Week strip */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                {weekDays.length > 0
                                    ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}`
                                    : ''}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => { setWeekOffset((o) => Math.max(0, o - 1)); setSelectedDay(null); setSelectedSlot(null); }}
                                    disabled={weekOffset === 0}
                                    aria-label="Previous week"
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => { setWeekOffset((o) => Math.min(maxWeekOffset, o + 1)); setSelectedDay(null); setSelectedSlot(null); }}
                                    disabled={weekOffset >= maxWeekOffset}
                                    aria-label="Next week"
                                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-1 px-1 pb-0.5">
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(weekDays.length, 7)}, minmax(40px, 1fr))`, minWidth: `${Math.min(weekDays.length, 7) * 48}px` }}>
                            {weekDays.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const hasSlots = slotMap.has(dateStr);
                                const isSelected = selectedDay === dateStr;
                                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                                return (
                                    <button
                                        key={dateStr}
                                        onClick={() => {
                                            if (!hasSlots || isPast) return;
                                            setSelectedDay(dateStr);
                                            setSelectedSlot(null);
                                        }}
                                        disabled={!hasSlots || isPast}
                                        className={`flex flex-col items-center py-3 px-1 rounded-xl text-center transition-colors ${
                                            isSelected
                                                ? 'bg-gray-900 text-white'
                                                : hasSlots && !isPast
                                                    ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400 cursor-pointer'
                                                    : 'bg-gray-50 text-gray-300 cursor-default'
                                        }`}
                                    >
                                        <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                                        <span className="text-base font-bold mt-0.5">{format(day, 'd')}</span>
                                    </button>
                                );
                            })}
                        </div>
                        </div>
                    </div>

                    {/* Slot list */}
                    {selectedDay && (
                        <div>
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                                {format(parseISO(selectedDay), 'EEEE, MMMM d')}
                            </p>
                            {selectedDaySlots.length === 0 ? (
                                <p className="text-sm text-gray-400">No available slots for this day.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {selectedDaySlots.map((slot) => {
                                        const isChosen = selectedSlot === slot;
                                        return (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors ${
                                                    isChosen
                                                        ? 'bg-gray-900 text-white border-gray-900'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                                }`}
                                            >
                                                {format(new Date(slot), 'h:mm a')}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Confirmation form */}
                    {selectedSlot && (
                        <div className="pt-4 border-t border-gray-100 space-y-3">
                            <p className="text-sm font-semibold text-gray-900">
                                Confirm for {format(new Date(selectedSlot), 'EEEE, MMMM d · h:mm a')}
                            </p>
                            <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                            />
                            <input
                                type="email"
                                placeholder="Your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                            />
                            {bookError && (
                                <div className="flex items-center gap-2 text-red-600 text-sm">
                                    <AlertCircle size={14} />
                                    {bookError}
                                </div>
                            )}
                            <button
                                onClick={handleBook}
                                disabled={submitting || !name.trim() || !email.trim()}
                                className="w-full h-10 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Booking…
                                    </span>
                                ) : (
                                    'Confirm booking'
                                )}
                            </button>
                        </div>
                    )}

                    {/* No slots at all */}
                    {slotMap.size === 0 && (
                        <div className="text-center py-8">
                            <Clock size={24} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No available slots in the selected date range.</p>
                            <p className="text-xs text-gray-400 mt-1">Please contact your recruiter.</p>
                        </div>
                    )}
                </div>
            </div>
        </Shell>
    );
};

export default SchedulingPage;
