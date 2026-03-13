import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { Avatar } from './ui/Avatar';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

/** One-line summary from AI analysis (first sentence or ~80 chars) */
function oneLineSummary(aiAnalysis: string | undefined | null): string | null {
  if (!aiAnalysis || !aiAnalysis.trim()) return null;
  const trimmed = aiAnalysis.trim();
  const firstSentence = trimmed.split(/[.!?]\s+/)[0];
  const line = (firstSentence || trimmed).trim();
  if (line.length <= 85) return line;
  return line.slice(0, 82) + '...';
}

interface PipelineColumnProps {
    title: string;
    stage: CandidateStage;
    candidates: Candidate[];
    onSelectCandidate: (candidate: Candidate) => void;
    onDropCandidate?: (candidateId: string, newStage: CandidateStage) => void;
    isValidDropTarget?: (sourceStage: CandidateStage, targetStage: CandidateStage) => boolean;
    jobRequiredSkills?: string[];
    readOnly?: boolean;
}

const DraggableCandidateCard: React.FC<{
    candidate: Candidate;
    onSelect: (candidate: Candidate) => void;
    jobRequiredSkills?: string[];
    draggable?: boolean;
}> = ({ candidate, onSelect, draggable = true }) => {
    const [isDragging, setIsDragging] = useState(false);
    const summaryLine = oneLineSummary(candidate.aiAnalysis);

    const handleDragStart = (e: React.DragEvent) => {
        if (!draggable) return;
        e.dataTransfer.setData('candidateId', candidate.id);
        e.dataTransfer.setData('sourceStage', candidate.stage);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => setIsDragging(false);

    const handleClick = (e: React.MouseEvent) => {
        if (!isDragging) onSelect(candidate);
    };

    const score = candidate.aiMatchScore as number | undefined;
    const scoreColor = score != null
        ? score >= 70 ? 'text-green-700 bg-green-50'
        : score >= 50 ? 'text-amber-700 bg-amber-50'
        : 'text-red-600 bg-red-50'
        : '';

    return (
        <div
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={`bg-white p-3 rounded-xl border transition-colors group relative ${
                draggable ? 'cursor-move' : 'cursor-pointer'
            } ${isDragging ? 'opacity-40 border-dashed border-gray-300' : 'border-gray-100 hover:border-gray-200'}`}
        >
            {/* Top row: avatar + name + score */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={candidate.name} className="w-7 h-7 text-[9px] flex-shrink-0 border border-gray-100" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-none">{candidate.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            {candidate.currentCompany || candidate.role || '—'}
                        </p>
                    </div>
                </div>
                {score != null && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${scoreColor}`}>
                        {score}%
                    </span>
                )}
            </div>

            {/* Duplicate flag */}
            {candidate.alsoInJobTitles && candidate.alsoInJobTitles.length > 0 && (
                <p className="text-[10px] text-gray-400 mb-1.5 truncate">
                    Also in: {candidate.alsoInJobTitles.map(a => a.jobTitle).join(', ')}
                </p>
            )}

            {/* Skills */}
            {candidate.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {candidate.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-gray-50 rounded text-gray-500 border border-gray-100 font-medium">
                            {skill}
                        </span>
                    ))}
                    {candidate.skills.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">+{candidate.skills.length - 3}</span>
                    )}
                </div>
            )}

            {/* AI summary */}
            {(candidate.aiMatchReason || summaryLine) && (
                <p className="text-[10px] text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                    {candidate.aiMatchReason || summaryLine}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
                <span className="text-[10px] text-gray-400">
                    {candidate.source === 'Sourced' ? 'Sourced' : 'Applied'} {new Date(candidate.appliedDate).toLocaleDateString()}
                </span>
                {(candidate.linkedInUrl || candidate.profileUrl || candidate.portfolioUrls?.linkedin) && (
                    <a
                        href={candidate.linkedInUrl || candidate.profileUrl || candidate.portfolioUrls?.linkedin || ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-gray-400 hover:text-gray-700 inline-flex items-center gap-0.5 transition-colors"
                    >
                        LinkedIn <ExternalLink size={9} />
                    </a>
                )}
            </div>
        </div>
    );
};

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
    title, stage, candidates, onSelectCandidate, onDropCandidate,
    isValidDropTarget, jobRequiredSkills, readOnly = false
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragSourceStage, setDragSourceStage] = useState<CandidateStage | null>(null);
    const ITEMS_PER_PAGE = 5;

    const totalPages = Math.ceil(candidates.length / ITEMS_PER_PAGE);
    const paginatedCandidates = candidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [candidates.length, stage]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceStage = e.dataTransfer.getData('sourceStage') as CandidateStage;
        setDragSourceStage(sourceStage || null);
        if (sourceStage && isValidDropTarget) {
            setIsDragOver(isValidDropTarget(sourceStage as CandidateStage, stage) || sourceStage === stage);
        } else {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDragSourceStage(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDragSourceStage(null);
        const candidateId = e.dataTransfer.getData('candidateId');
        const sourceStage = e.dataTransfer.getData('sourceStage') as CandidateStage;
        if (candidateId && sourceStage !== stage && onDropCandidate) {
            if (isValidDropTarget && !isValidDropTarget(sourceStage as CandidateStage, stage)) return;
            onDropCandidate(candidateId, stage);
        }
    };

    const isInvalidDropTarget = dragSourceStage && isValidDropTarget && dragSourceStage !== stage && !isValidDropTarget(dragSourceStage, stage);

    return (
        <div
            className={`flex-shrink-0 w-[272px] snap-center flex flex-col rounded-xl border transition-colors ${
                isDragOver
                    ? 'bg-blue-50/60 border-blue-200'
                    : isInvalidDropTarget
                    ? 'bg-gray-50 border-gray-100 opacity-50'
                    : 'bg-gray-50/40 border-gray-100'
            }`}
            style={{ height: '100%' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Column header */}
            <div className="px-3.5 py-3 flex items-center justify-between border-b border-gray-100 bg-white rounded-t-xl">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
                    <span className="text-xs font-medium tabular-nums bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-500">
                        {candidates.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar" style={{ minHeight: 0 }}>
                {paginatedCandidates.map(candidate => (
                    <DraggableCandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onSelect={onSelectCandidate}
                        jobRequiredSkills={jobRequiredSkills}
                        draggable={!readOnly && stage !== CandidateStage.NEW}
                    />
                ))}
                {candidates.length === 0 && (
                    <div className="h-20 flex items-center justify-center text-gray-300 text-xs italic border border-dashed border-gray-200 rounded-lg mx-0.5">
                        No candidates
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-3 py-2 border-t border-gray-100 bg-white rounded-b-xl flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[11px] text-gray-400 font-medium">{currentPage} / {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
