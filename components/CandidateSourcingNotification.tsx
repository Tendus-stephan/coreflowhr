import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Users, Clock, Sparkles, Info, ChevronUp } from 'lucide-react';
import { useSourcing } from '../contexts/SourcingContext';

export const CandidateSourcingNotification: React.FC = () => {
    const { isSourcing, sourcingProgress, stopSourcing } = useSourcing();
    const { current, total, currentCandidateName } = sourcingProgress;
    const [minutesRemaining, setMinutesRemaining] = useState<number>(0);
    const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Initialize start time when sourcing begins
    useEffect(() => {
        if (isSourcing && startTime === null) {
            setStartTime(Date.now());
        }
        if (!isSourcing) {
            setStartTime(null);
            setMinutesRemaining(0);
            setSecondsRemaining(0);
        }
    }, [isSourcing, startTime]);

    // Calculate time remaining based on progress
    useEffect(() => {
        if (!isSourcing || current >= total || startTime === null) {
            if (current >= total) {
                setMinutesRemaining(0);
                setSecondsRemaining(0);
            }
            return;
        }

        // Each candidate takes approximately 0.5 seconds
        const timePerCandidate = 0.5; // seconds
        const remainingCandidates = total - current;
        const estimatedTotalSeconds = total * timePerCandidate;
        
        // Calculate elapsed time
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        
        // Calculate remaining time (estimated total - elapsed, but at least remaining candidates * time per candidate)
        const remainingSeconds = Math.max(
            remainingCandidates * timePerCandidate,
            estimatedTotalSeconds - elapsedSeconds
        );
        
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = Math.max(0, Math.floor(remainingSeconds % 60));
        
        setMinutesRemaining(minutes);
        setSecondsRemaining(seconds);

        // Update every second
        const interval = setInterval(() => {
            if (startTime === null) return;
            const newElapsed = (Date.now() - startTime) / 1000;
            const newRemaining = Math.max(
                0,
                Math.max(
                    remainingCandidates * timePerCandidate,
                    estimatedTotalSeconds - newElapsed
                )
            );
            const newMinutes = Math.floor(newRemaining / 60);
            const newSeconds = Math.max(0, Math.floor(newRemaining % 60));
            setMinutesRemaining(newMinutes);
            setSecondsRemaining(newSeconds);
        }, 1000);

        return () => clearInterval(interval);
    }, [isSourcing, current, total, startTime]);

    const progressPercentage = total > 0 ? (current / total) * 100 : 0;
    const isComplete = current >= total && total > 0;

    return createPortal(
        <div className="fixed bottom-8 right-8 z-40">
            {!isExpanded ? (
                // Collapsed: Small Button
                <button
                    onClick={() => setIsExpanded(true)}
                    className="relative w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in"
                >
                    {isSourcing ? (
                        <Loader2 className="text-white animate-spin" size={24} />
                    ) : (
                        <Sparkles className="text-white" size={24} />
                    )}
                    {isSourcing && current > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">
                            {current}
                        </span>
                    )}
                </button>
            ) : (
                // Expanded: Full Panel
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[380px] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Sparkles className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">CoreFlowHR AI</h3>
                                <p className="text-white/80 text-xs">Candidate Sourcing</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSourcing && (
                                <button
                                    onClick={stopSourcing}
                                    className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                                    title="Stop sourcing"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                                title="Minimize"
                            >
                                <ChevronUp size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {!isSourcing ? (
                            <>
                                {/* Idle State - Show CoreFlow AI Info */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Info size={16} className="text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                            CoreFlowHR AI Assistant
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Your AI-powered recruitment assistant is ready to help you source candidates, analyze profiles, and streamline your hiring process.
                                    </p>
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-[10px] text-gray-500">
                                            Post a job to start sourcing candidates automatically.
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : !isComplete ? (
                        <>
                            {/* Progress Info */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                            Sourcing candidates
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">
                                        {current} / {total}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-gray-900 to-gray-700 transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>

                                {/* Time Remaining */}
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>
                                        {minutesRemaining > 0 
                                            ? `${minutesRemaining}m ${secondsRemaining}s remaining`
                                            : `${secondsRemaining}s remaining`
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Current Candidate */}
                            {currentCandidateName && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <Loader2 className="text-gray-900 animate-spin" size={16} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                            Processing: {currentCandidateName}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            Analyzing profile and calculating match score...
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-xl border border-gray-200">
                                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                                    <Users className="text-white" size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">
                                        Sourcing Complete!
                                    </p>
                                    <p className="text-xs text-gray-700 mt-0.5">
                                        {total} candidates successfully sourced
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Info Footer */}
                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                {isSourcing 
                                    ? "Candidates are being sourced one by one using AI. They will appear in your candidate board as they're processed."
                                    : "Post a job to start sourcing candidates automatically."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};







