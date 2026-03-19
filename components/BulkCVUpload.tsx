import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText, Sparkles } from 'lucide-react';
import { Job } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { calculateBasicMatchScore } from '../services/cvParser';
import { CustomSelect } from './ui/CustomSelect';
import { toUserError } from '../utils/edgeFunctionError';

// ── Types ─────────────────────────────────────────────────────────────────────

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  candidateId?: string;
  isUpdate?: boolean;
  error?: string;
}

interface MatchRow {
  candidateId: string;
  candidateName: string;
  score: number;
}

interface JobMatch {
  job: Job;
  top: MatchRow[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  jobs: Job[];
  defaultJobId?: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BulkCVUpload: React.FC<Props> = ({ jobs, defaultJobId, onClose, onImported }) => {
  const POOL = '__pool__';                   // sentinel = pool / no job
  const activeJobs = jobs.filter(j => j.status === 'Active' && j.title !== '__candidate_pool__');

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(defaultJobId ?? POOL);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  // Post-import match state
  const [matchPhase, setMatchPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [matchResults, setMatchResults] = useState<JobMatch[]>([]);
  const [matchDiag, setMatchDiag] = useState<{ jobsWithSkills: number; candidatesWithSkills: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── File helpers ─────────────────────────────────────────────────────────────

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(f =>
      /\.(pdf|doc|docx)$/i.test(f.name) && f.size <= 10 * 1024 * 1024
    );
    setFiles(prev => {
      const existing = new Set(prev.map(e => e.file.name));
      const deduped = valid.filter(f => !existing.has(f.name));
      return [
        ...prev,
        ...deduped.map(f => ({
          id: `${f.name}-${f.lastModified}`,
          file: f,
          status: 'pending' as const,
        })),
      ];
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  // ── Import ───────────────────────────────────────────────────────────────────

  const runImport = async () => {
    if (files.length === 0) return;
    setImporting(true);

    // Resolve job: use selected job or get/create pool
    let jobId: string;
    try {
      jobId = (selectedJobId && selectedJobId !== POOL) ? selectedJobId : await api.candidates.getOrCreateCandidatePool();
    } catch {
      setImporting(false);
      return;
    }

    const importedIds: string[] = [];

    for (const entry of files) {
      if (entry.status === 'done') continue;
      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'processing' } : f));

      try {
        const result = await api.candidates.bulkImport(jobId, entry.file);

        if (result.candidateId) importedIds.push(result.candidateId);

        setFiles(prev => prev.map(f =>
          f.id === entry.id
            ? { ...f, status: 'done', candidateId: result.candidateId }
            : f
        ));
      } catch (err: any) {
        setFiles(prev => prev.map(f =>
          f.id === entry.id
            ? { ...f, status: 'error', error: toUserError(err, 'Failed to import CV. Please try again.') }
            : f
        ));
      }
    }

    setImporting(false);
    setImportDone(true);
    if (importedIds.length > 0) onImported(importedIds.length);
  };

  // ── Match against jobs ───────────────────────────────────────────────────────

  const runMatch = async () => {
    if (activeJobs.length === 0) return;
    setMatchPhase('running');

    // Fetch imported candidates' skills
    const importedIds = files.filter(f => f.candidateId).map(f => f.candidateId!);
    if (importedIds.length === 0) { setMatchPhase('done'); return; }

    const { data: candidateRows } = await supabase
      .from('candidates')
      .select('id, name, skills')
      .in('id', importedIds);

    const candidates = (candidateRows ?? []) as { id: string; name: string; skills: string[] }[];

    setMatchDiag({
      jobsWithSkills: activeJobs.filter(j => j.skills && j.skills.length > 0).length,
      candidatesWithSkills: candidates.filter(c => c.skills && c.skills.length > 0).length,
    });

    // Score each candidate against each active job
    const results: JobMatch[] = activeJobs
      .filter(j => j.skills && j.skills.length > 0)
      .map(job => {
        const scored: MatchRow[] = candidates
          .map(c => ({
            candidateId: c.id,
            candidateName: c.name,
            score: calculateBasicMatchScore(c.skills ?? [], job.skills ?? []).score,
          }))
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        return { job, top: scored };
      })
      .filter(r => r.top.length > 0)
      .sort((a, b) => b.top[0].score - a.top[0].score);

    setMatchResults(results);
    setMatchPhase('done');
  };

  // ── Derived counts ───────────────────────────────────────────────────────────

  const successCount = files.filter(f => f.status === 'done').length;
  const errorCount   = files.filter(f => f.status === 'error').length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {matchPhase === 'done' ? 'Match Results' : 'Bulk CV Import'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {matchPhase === 'done'
                ? 'Top candidates per open role'
                : 'PDF or Word · max 10 MB each'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Match results view ── */}
          {matchPhase === 'done' && (
            matchResults.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400 leading-relaxed">
                {matchDiag?.jobsWithSkills === 0 ? (
                  <>
                    No active jobs have skills listed.<br/>
                    <span className="text-xs">Add skills to your job listings to enable candidate matching.</span>
                  </>
                ) : matchDiag?.candidatesWithSkills === 0 ? (
                  <>
                    Skills could not be extracted from the imported CVs.<br/>
                    <span className="text-xs">Candidates were imported successfully, but AI parsing may not be configured yet — so no skills were detected to match against.</span>
                  </>
                ) : (
                  <>
                    No skill overlaps found between the imported CVs and your open jobs.<br/>
                    <span className="text-xs">Try adding more relevant skills to your job listings.</span>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {matchResults.map(({ job, top }) => (
                  <div key={job.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-800">{job.title}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {top.map(row => (
                        <div key={row.candidateId} className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-gray-700">{row.candidateName}</span>
                          <span className="text-xs font-semibold text-gray-900">{row.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Import view ── */}
          {matchPhase !== 'done' && (
            <>
              {/* Job selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Import into
                </label>
                <CustomSelect
                  inputStyle
                  value={selectedJobId}
                  onChange={setSelectedJobId}
                  disabled={importing}
                  className="h-9"
                  options={[
                    { value: POOL, label: 'Candidate pool (no job)' },
                    ...activeJobs.map(j => ({ value: j.id, label: j.title })),
                  ]}
                />
                {selectedJobId === POOL && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Candidates will be saved and searchable. You can assign them to a job later.
                  </p>
                )}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !importing && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                } ${importing ? 'pointer-events-none opacity-50' : ''}`}
              >
                <Upload size={20} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  Drop CVs here or <span className="underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX · Multiple files supported</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{entry.file.name}</p>
                        {entry.status === 'done' && (
                          <p className="text-xs text-green-600 mt-0.5">
                            {entry.isUpdate ? 'Updated existing candidate' : 'Added to pipeline'}
                          </p>
                        )}
                        {entry.status === 'error' && (
                          <p className="text-xs text-red-500 mt-0.5 truncate">{entry.error}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {entry.status === 'pending' && !importing && (
                          <button
                            onClick={e => { e.stopPropagation(); removeFile(entry.id); }}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {entry.status === 'processing' && <Loader2 size={14} className="text-gray-500 animate-spin" />}
                        {entry.status === 'done'         && <CheckCircle size={14} className="text-green-500" />}
                        {entry.status === 'error'        && <AlertCircle size={14} className="text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Post-import match prompt */}
              {importDone && successCount > 0 && activeJobs.length > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <Sparkles size={15} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">
                      {successCount} candidate{successCount !== 1 ? 's' : ''} imported
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Match them against your open jobs to surface the best fits instantly.
                    </p>
                  </div>
                  <button
                    onClick={runMatch}
                    disabled={matchPhase === 'running'}
                    className="flex-shrink-0 px-3 h-7 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {matchPhase === 'running' && <Loader2 size={11} className="animate-spin" />}
                    {matchPhase === 'running' ? 'Matching…' : 'Match now'}
                  </button>
                </div>
              )}

              {/* Summary */}
              {importDone && (errorCount > 0 || successCount > 0) && (
                <p className="text-xs text-center text-gray-400">
                  {successCount > 0 && <span className="text-green-600 font-medium">{successCount} imported</span>}
                  {successCount > 0 && errorCount > 0 && ' · '}
                  {errorCount > 0 && <span className="text-red-500 font-medium">{errorCount} failed</span>}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {files.length === 0 ? 'No files selected' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 h-8 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {importDone ? 'Close' : 'Cancel'}
            </button>
            {matchPhase !== 'done' && (
              <button
                onClick={runImport}
                disabled={files.length === 0 || importing || (importDone && files.every(f => f.status === 'done'))}
                className="px-4 h-8 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing && <Loader2 size={13} className="animate-spin" />}
                {importing
                  ? 'Importing…'
                  : importDone
                  ? 'Done'
                  : `Import ${files.length > 0 ? files.length + ' CV' + (files.length !== 1 ? 's' : '') : ''}`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
