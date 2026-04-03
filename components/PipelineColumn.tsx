import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { Avatar } from './ui/Avatar';
import { ExternalLink, ChevronLeft, ChevronRight, XCircle, Trash2, Users } from 'lucide-react';

export const STAGE_META: Record<CandidateStage, { label: string; dot: string; badge: string; bg: string }> = {
    [CandidateStage.NEW]:       { label: 'Waitlist',  dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600',    bg: '#f9fafb' },
    [CandidateStage.SCREENING]: { label: 'Screening', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700',    bg: '#eff6ff' },
    [CandidateStage.INTERVIEW]: { label: 'Interview', dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700', bg: '#f5f3ff' },
    [CandidateStage.OFFER]:     { label: 'Offer',     dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700',  bg: '#fffbeb' },
    [CandidateStage.HIRED]:     { label: 'Hired',     dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700',  bg: '#f0fdf4' },
    [CandidateStage.REJECTED]:  { label: 'Rejected',  dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600',      bg: '#fef2f2' },
};

interface PipelineColumnProps {
    title: string;
    stage: CandidateStage;
    candidates: Candidate[];
    onSelectCandidate: (candidate: Candidate) => void;
    onDropCandidate?: (candidateId: string, newStage: CandidateStage) => void;
    isValidDropTarget?: (sourceStage: CandidateStage, targetStage: CandidateStage) => boolean;
    jobRequiredSkills?: string[];
    readOnly?: boolean;
    onRejectCandidate?: (candidateId: string) => void;
    onDeleteCandidate?: (candidateId: string) => void;
}

const DraggableCandidateCard: React.FC<{
    candidate: Candidate;
    onSelect: (candidate: Candidate) => void;
    jobRequiredSkills?: string[];
    draggable?: boolean;
    onReject?: (id: string) => void;
    onDelete?: (id: string) => void;
}> = ({ candidate, onSelect, draggable = true, onReject, onDelete }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        if (!draggable) return;
        e.dataTransfer.setData('candidateId', candidate.id);
        e.dataTransfer.setData('sourceStage', candidate.stage);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => setIsDragging(false);

    const score = candidate.aiMatchScore as number | undefined;
    const scoreColor = score != null
        ? score >= 70 ? 'text-green-700 bg-green-50'
        : score >= 50 ? 'text-amber-700 bg-amber-50'
        : 'text-red-600 bg-red-50'
        : '';

    const linkedInUrl = candidate.linkedInUrl || candidate.profileUrl || candidate.portfolioUrls?.linkedin;

    return (
        <div
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={() => { if (!isDragging) onSelect(candidate); }}
            className={`bg-white p-2.5 rounded-xl border transition-all duration-150 group relative ${
                draggable ? 'cursor-move' : 'cursor-pointer'
            } ${isDragging
                ? 'opacity-40 scale-95 border-dashed border-gray-300 shadow-none'
                : 'border-gray-150 shadow-sm hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'
            }`}
        >
            {/* Row 1: avatar + name + score */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={candidate.name} className="w-8 h-8 text-[11px] flex-shrink-0 border border-gray-100" />
                    <p className="text-[13px] font-semibold text-gray-900 truncate leading-none">{candidate.name}</p>
                </div>
                {score != null && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 transition-opacity ${scoreColor} ${(onReject || onDelete) ? 'group-hover:opacity-0' : ''}`}>
                        {score}%
                    </span>
                )}
            </div>

            {/* Row 2: company · role */}
            {(candidate.currentCompany || candidate.role) && (
                <p className="text-[11px] text-gray-400 mt-1 truncate pl-[42px]">
                    {candidate.currentCompany && candidate.role
                        ? `${candidate.currentCompany} · ${candidate.role}`
                        : candidate.currentCompany || candidate.role}
                </p>
            )}

            {/* Divider + Skills row */}
            {candidate.skills.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 flex-wrap">
                    {candidate.skills.slice(0, 2).map(skill => (
                        <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-100 rounded text-gray-500">
                            {skill}
                        </span>
                    ))}
                    {candidate.skills.length > 2 && (
                        <span className={`text-[10px] text-gray-400 ${linkedInUrl ? 'group-hover:hidden' : ''}`}>+{candidate.skills.length - 2}</span>
                    )}
                </div>
            )}

            {/* Hover: LinkedIn link */}
            {linkedInUrl && (
                <a
                    href={linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2.5 right-2.5 hidden group-hover:flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                >
                    LinkedIn <ExternalLink size={9} />
                </a>
            )}

            {/* Waitlist quick actions — visible on hover */}
            {(onReject || onDelete) && (
                <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
                    {onReject && (
                        <button
                            title="Reject candidate"
                            onClick={(e) => { e.stopPropagation(); onReject(candidate.id); }}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        >
                            <XCircle size={13} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            title="Delete candidate"
                            onClick={(e) => { e.stopPropagation(); onDelete(candidate.id); }}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
    title, stage, candidates, onSelectCandidate, onDropCandidate,
    isValidDropTarget, jobRequiredSkills, readOnly = false,
    onRejectCandidate, onDeleteCandidate,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragSourceStage, setDragSourceStage] = useState<CandidateStage | null>(null);
    const ITEMS_PER_PAGE = 5;

    const totalPages = Math.ceil(candidates.length / ITEMS_PER_PAGE);
    const paginatedCandidates = candidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const meta = STAGE_META[stage];

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
                    ? 'border-blue-200'
                    : isInvalidDropTarget
                    ? 'bg-gray-50 border-gray-100 opacity-50'
                    : 'border-gray-200/70'
            }`}
            style={{ height: '100%', backgroundColor: (isDragOver || isInvalidDropTarget) ? undefined : meta.bg }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Column header */}
            <div className="px-3.5 py-3 flex items-center justify-between border-b border-gray-100 bg-white/80 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                    <h3 className="text-[13px] font-semibold text-gray-700">{meta.label}</h3>
                </div>
                <span className="text-[11px] font-medium tabular-nums bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md text-gray-500">
                    {candidates.length}
                </span>
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
                        onReject={!readOnly && stage === CandidateStage.NEW ? onRejectCandidate : undefined}
                        onDelete={!readOnly && stage === CandidateStage.NEW ? onDeleteCandidate : undefined}
                    />
                ))}
                {candidates.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users size={14} className="text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-300">No candidates</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-3 py-2 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[11px] text-gray-400">{currentPage}/{totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
