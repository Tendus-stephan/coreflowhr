import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { Avatar } from './ui/Avatar';
import { Briefcase, MapPin, BrainCircuit, ChevronLeft, ChevronRight, Copy, ExternalLink } from 'lucide-react';

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
    /** When filtering by one job, required skills for green/red match tags */
    jobRequiredSkills?: string[];
}

// Separate component for draggable candidate card
const DraggableCandidateCard: React.FC<{
    candidate: Candidate;
    onSelect: (candidate: Candidate) => void;
    jobRequiredSkills?: string[];
}> = ({ candidate, onSelect, jobRequiredSkills }) => {
    const [isDragging, setIsDragging] = useState(false);
    const requiredSet = jobRequiredSkills ? new Set(jobRequiredSkills.map(s => s.toLowerCase().trim())) : null;
    const summaryLine = oneLineSummary(candidate.aiAnalysis);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('candidateId', candidate.id);
        e.dataTransfer.setData('sourceStage', candidate.stage);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!isDragging) {
            onSelect(candidate);
        }
    };

    const skillClass = (_skill: string) => {
        return 'text-[10px] px-2 py-1 bg-gray-100 rounded text-gray-600 border border-gray-200 font-medium';
    };

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-move group relative mb-2 ${
                isDragging ? 'opacity-50 border-gray-400' : 'border-gray-200 cursor-pointer'
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Avatar name={candidate.name} className="w-10 h-10 border border-gray-100" />
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate w-32">{candidate.name}</p>
                        
                        {/* Job & Location */}
                        <div className="flex items-center gap-1 text-xs text-gray-600 font-medium mt-0.5 w-32">
                           <Briefcase size={10} className="text-gray-400 shrink-0" />
                           <p className="truncate">{candidate.role}</p>
                        </div>
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 w-32">
                           <MapPin size={10} className="shrink-0" />
                           <p className="truncate">{candidate.location}</p>
                        </div>
                    </div>
                </div>
                {candidate.aiMatchScore !== undefined && candidate.aiMatchScore !== null && (
                     <div className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 bg-gray-100 text-gray-700 border border-gray-200">
                        <BrainCircuit size={10} />
                        {candidate.aiMatchScore}%
                     </div>
                )}
            </div>
            
            {/* Cross-job duplicate flag */}
            {candidate.alsoInJobTitles && candidate.alsoInJobTitles.length > 0 && (
                <div className="mb-2 flex items-center gap-1 flex-wrap">
                    <Copy size={10} className="text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-500 font-medium">
                        Also in: {candidate.alsoInJobTitles.map(a => a.jobTitle).join(', ')}
                    </span>
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
                {candidate.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className={skillClass(skill)}>
                        {skill}
                    </span>
                ))}
                {candidate.skills.length > 3 && (
                    <span className="text-[10px] px-1.5 py-1 text-gray-400 font-medium">+{candidate.skills.length - 3}</span>
                )}
            </div>
            {summaryLine && (
                <p className="text-[10px] text-gray-500 mt-2 line-clamp-2 border-t border-gray-50 pt-2" title={candidate.aiAnalysis || ''}>
                    {summaryLine}
                </p>
            )}
            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-50">
                <p className="text-[10px] text-gray-400">Sourced {new Date(candidate.appliedDate).toLocaleDateString()}</p>
                {(candidate.profileUrl || candidate.portfolioUrls?.linkedin) && (
                    <a
                        href={candidate.profileUrl || candidate.portfolioUrls?.linkedin || ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
                    >
                        LinkedIn <ExternalLink size={10} />
                    </a>
                )}
            </div>
        </div>
    );
};

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ title, stage, candidates, onSelectCandidate, onDropCandidate, isValidDropTarget, jobRequiredSkills }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragSourceStage, setDragSourceStage] = useState<CandidateStage | null>(null);
  const ITEMS_PER_PAGE = 4;
  
  const totalPages = Math.ceil(candidates.length / ITEMS_PER_PAGE);
  const paginatedCandidates = candidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 if the underlying candidates list changes significantly (e.g. filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [candidates.length, stage]);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sourceStage = e.dataTransfer.getData('sourceStage') as CandidateStage;
    setDragSourceStage(sourceStage || null);
    
    // Only show drag over effect if it's a valid drop target
    if (sourceStage && isValidDropTarget) {
      const isValid = isValidDropTarget(sourceStage as CandidateStage, stage);
      if (isValid || sourceStage === stage) {
        setIsDragOver(true);
      } else {
        setIsDragOver(false);
      }
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
    
    // Only process if dropped on a different stage
    if (candidateId && sourceStage !== stage && onDropCandidate) {
      // Validation is handled in handleDropCandidate, but we can do a quick check here too
      if (isValidDropTarget && !isValidDropTarget(sourceStage as CandidateStage, stage)) {
        // Invalid drop - the error will be shown by handleDropCandidate
        return;
      }
      onDropCandidate(candidateId, stage);
    }
  };

  // Check if this column is a valid drop target for the current drag
  const isInvalidDropTarget = dragSourceStage && isValidDropTarget && dragSourceStage !== stage && !isValidDropTarget(dragSourceStage, stage);
  
  return (
    <div 
      className={`flex-shrink-0 w-[350px] snap-center flex flex-col rounded-xl border transition-colors ${
        isDragOver 
          ? 'bg-blue-50 border-blue-300 border-2' 
          : isInvalidDropTarget
          ? 'bg-gray-100 border-gray-200 opacity-60'
          : 'bg-gray-50/50 border-border'
      }`}
      style={{ height: '100%' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 flex items-center justify-between border-b border-border/50 bg-white rounded-t-xl sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{candidates.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar" style={{ minHeight: '0' }}>
        {paginatedCandidates.map((candidate) => (
          <DraggableCandidateCard 
            key={candidate.id}
            candidate={candidate}
            onSelect={onSelectCandidate}
            jobRequiredSkills={jobRequiredSkills}
          />
        ))}
        {candidates.length === 0 && (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-2 border-2 border-dashed border-gray-200 rounded-xl m-2">
                <span className="text-xs font-medium italic">No candidates in {title}</span>
            </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
          <div className="p-3 border-t border-border/50 bg-white rounded-b-xl flex items-center justify-between">
              <button 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                  <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-400 font-medium">Page {currentPage} of {totalPages}</span>
              <button 
                  onClick={nextPage} 
                  disabled={currentPage === totalPages}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                  <ChevronRight size={16} />
              </button>
          </div>
      )}
    </div>
  );
};