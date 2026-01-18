import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { X } from 'lucide-react';

interface CandidateSourcingModalProps {
    isOpen: boolean;
    current: number;
    total: number;
    currentCandidateName: string;
    onClose?: () => void;
}

export const CandidateSourcingModal: React.FC<CandidateSourcingModalProps> = ({
    isOpen,
    current,
    total,
    currentCandidateName,
    onClose
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const progressPercentage = (current / total) * 100;
    const isComplete = current >= total;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">
                            {isComplete ? 'Sourcing Complete!' : 'Sourcing Candidates...'}
                        </h2>
                        {onClose && isComplete && (
                            <button 
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">
                                {isComplete ? `All ${total} candidates sourced` : `Sourcing candidate ${current} of ${total}`}
                            </span>
                            <span className="text-gray-900 font-bold">
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                                className="h-full bg-black transition-all duration-300 ease-out rounded-full flex items-center justify-end pr-1"
                                style={{ width: `${progressPercentage}%` }}
                            >
                                {isComplete && (
                                    <CheckCircle size={12} className="text-white" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Current Status */}
                    {!isComplete && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <Loader2 className="text-gray-900 animate-spin" size={20} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Processing: {currentCandidateName}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Scraping LinkedIn profiles and validating candidates...
                                </p>
                            </div>
                        </div>
                    )}

                    {isComplete && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="text-green-600" size={20} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-900">
                                    Successfully sourced {current} candidates
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                    Candidates are now available in your candidate board
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-900">
                            <span className="font-semibold">Note:</span> Candidates are being sourced from LinkedIn using real profiles. 
                            This may take a few moments depending on the number of candidates requested.
                        </p>
                    </div>
                </div>

                {isComplete && onClose && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

