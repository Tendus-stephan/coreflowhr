import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, AlertTriangle, Clock } from 'lucide-react';
import { Candidate } from '../types';
import { api } from '../services/api';
import { CustomSelect } from './ui/CustomSelect';
import { useToast } from '../contexts/ToastContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    candidate: Candidate;
    jobId: string;
    jobTitle: string;
    onCreated: (link: { token: string }) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

export const SendSchedulingLinkModal: React.FC<Props> = ({
    isOpen,
    onClose,
    candidate,
    jobId,
    jobTitle,
    onCreated,
}) => {
    const toast = useToast();

    const [interviewType, setInterviewType] = useState<'Video Call' | 'Phone Screen' | 'In-Person'>('Video Call');
    const [duration, setDuration] = useState(30);
    const [dateRangeStart, setDateRangeStart] = useState(today());
    const [dateRangeEnd, setDateRangeEnd] = useState(plusDays(14));
    const [hoursStart, setHoursStart] = useState('09:00');
    const [hoursEnd, setHoursEnd] = useState('17:00');
    const [bufferMinutes, setBufferMinutes] = useState(0);
    const [message, setMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        // Reset state when opened
        setInterviewType('Video Call');
        setDuration(30);
        setDateRangeStart(today());
        setDateRangeEnd(plusDays(14));
        setHoursStart('09:00');
        setHoursEnd('17:00');
        setBufferMinutes(0);
        setMessage('');
        setGoogleConnected(null);

        api.settings.getIntegrations().then((integrations) => {
            const calendarConnected = integrations.some(
                (i: any) => (i.name === 'Google Calendar' || i.name === 'Google Meet') && i.active
            );
            setGoogleConnected(calendarConnected);
        }).catch(() => setGoogleConnected(false));
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!dateRangeStart || !dateRangeEnd) return;
        if (dateRangeEnd < dateRangeStart) {
            toast.error('End date must be after start date');
            return;
        }
        setIsCreating(true);
        try {
            const link = await api.schedulingLinks.create({
                candidateId: candidate.id,
                jobId,
                interviewType,
                durationMinutes: duration,
                dateRangeStart,
                dateRangeEnd,
                availableHoursStart: hoursStart,
                availableHoursEnd: hoursEnd,
                bufferMinutes,
                message: message.trim() || undefined,
            });
            onCreated(link);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create scheduling link');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    const modal = (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-gray-700" />
                        <h2 className="text-sm font-bold text-gray-900">Send scheduling link</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Google Calendar warning */}
                    {googleConnected === false && (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Google Calendar isn't connected. Connect it in{' '}
                                <span className="font-semibold">Settings → Integrations</span> to enable automatic event creation.
                            </p>
                        </div>
                    )}

                    {/* Interview type */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Interview type</label>
                        <div className="flex gap-2">
                            {(['Video Call', 'Phone Screen', 'In-Person'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setInterviewType(t)}
                                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                                        interviewType === t
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Duration</label>
                        <CustomSelect
                            inputStyle
                            value={String(duration)}
                            onChange={(v) => setDuration(Number(v))}
                            className="py-2.5 rounded-xl"
                            leftIcon={<Clock size={15} />}
                            options={[
                                { value: '15', label: '15 min' },
                                { value: '30', label: '30 min' },
                                { value: '45', label: '45 min' },
                                { value: '60', label: '60 min' },
                            ]}
                        />
                    </div>

                    {/* Date range */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Date range</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="date"
                                    value={dateRangeStart}
                                    min={today()}
                                    onChange={(e) => setDateRangeStart(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black"
                                />
                            </div>
                            <div>
                                <input
                                    type="date"
                                    value={dateRangeEnd}
                                    min={dateRangeStart || today()}
                                    onChange={(e) => setDateRangeEnd(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Available hours */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Available hours</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">From</label>
                                <input
                                    type="time"
                                    value={hoursStart}
                                    onChange={(e) => setHoursStart(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">To</label>
                                <input
                                    type="time"
                                    value={hoursEnd}
                                    onChange={(e) => setHoursEnd(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Buffer */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Buffer between slots</label>
                        <CustomSelect
                            inputStyle
                            value={String(bufferMinutes)}
                            onChange={(v) => setBufferMinutes(Number(v))}
                            className="py-2.5 rounded-xl"
                            options={[
                                { value: '0', label: 'No buffer' },
                                { value: '15', label: '15 min buffer' },
                                { value: '30', label: '30 min buffer' },
                            ]}
                        />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                            Message to candidate{' '}
                            <span className="text-gray-400 normal-case font-normal">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Hi ${candidate.name.split(' ')[0]}, please pick a time that works for you.`}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-black resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isCreating || !dateRangeStart || !dateRangeEnd}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreating ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>
                                <Link2 size={14} />
                                Generate link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};
