import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { Avatar } from './ui/Avatar';
import { MoreHorizontal, Briefcase, MapPin, BrainCircuit, ChevronLeft, ChevronRight } from 'lucide-react';

interface PipelineColumnProps {
    title: string;
    stage: CandidateStage;
    candidates: Candidate[];
    onSelectCandidate: (candidate: Candidate) => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ title, stage, candidates, onSelectCandidate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
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

  return (
    <div className="flex-shrink-0 w-[350px] snap-center flex flex-col h-full max-h-full bg-gray-50/50 rounded-xl border border-border min-h-0">
      <div className="p-4 flex items-center justify-between border-b border-border/50 bg-white rounded-t-xl sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{candidates.length}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {paginatedCandidates.map((candidate) => (
          <div 
            key={candidate.id}
            onClick={() => onSelectCandidate(candidate)}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group relative"
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
                     <div className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                         candidate.aiMatchScore >= 80 
                             ? 'bg-black text-white' 
                             : candidate.aiMatchScore >= 60 
                             ? 'bg-yellow-500 text-white' 
                             : candidate.aiMatchScore >= 40
                             ? 'bg-orange-500 text-white'
                             : 'bg-red-500 text-white'
                     }`}>
                        <BrainCircuit size={10} />
                        {candidate.aiMatchScore}%
                     </div>
                )}
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-3">
                {candidate.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="text-[10px] px-2 py-1 bg-gray-50 rounded text-gray-600 border border-gray-100 font-medium">
                        {skill}
                    </span>
                ))}
                {candidate.skills.length > 3 && (
                    <span className="text-[10px] px-1.5 py-1 text-gray-400 font-medium">+{candidate.skills.length - 3}</span>
                )}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-right pt-2 border-t border-gray-50">Sourced {new Date(candidate.appliedDate).toLocaleDateString()}</p>
          </div>
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