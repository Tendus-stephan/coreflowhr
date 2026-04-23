import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Job } from '../types';
import { api } from '../services/api';
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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ImportSessionUpdate {
  id: string;
  status: 'processing' | 'done';
  total: number;
  succeeded: number;
  failed: number;
  jobId: string;
  jobName: string;
}

interface Props {
  jobs: Job[];
  defaultJobId?: string;
  /** Called when the modal closes. `count` is 0 if nothing was imported or import was cancelled. */
  onClose: (count: number, importedJobId?: string) => void;
  onSessionUpdate?: (update: ImportSessionUpdate) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BulkCVUpload: React.FC<Props> = ({ jobs, defaultJobId, onClose, onSessionUpdate }) => {
  const POOL = '__pool__';                   // sentinel = pool / no job
  const activeJobs = jobs.filter(j => j.status === 'Active' && j.title !== '__candidate_pool__');

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(defaultJobId ?? POOL);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const resolvedJobIdRef = useRef<string | null>(null);
  // Accumulate totals across all import/retry runs so Done always passes the right count
  const totalImportedRef = useRef(0);
  const totalFailedRef = useRef(0);

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

  const resolveJobId = async (): Promise<string | null> => {
    try {
      return (selectedJobId && selectedJobId !== POOL)
        ? selectedJobId
        : await api.candidates.getOrCreateCandidatePool();
    } catch {
      return null;
    }
  };

  // Process files one at a time so Cancel stops after the current file, not the entire batch
  const importEntries = async (entries: FileEntry[]) => {
    if (entries.length === 0) return;
    cancelledRef.current = false;
    setImporting(true);

    const sessionId = crypto.randomUUID();
    const jobName = selectedJobId === POOL
      ? 'Candidate pool'
      : jobs.find(j => j.id === selectedJobId)?.title ?? 'Unknown job';

    const jobId = await resolveJobId();
    if (!jobId) { setImporting(false); return; }
    resolvedJobIdRef.current = jobId;

    onSessionUpdate?.({ id: sessionId, status: 'processing', total: entries.length, succeeded: 0, failed: 0, jobId, jobName });

    let newlyImported = 0;
    let failCount = 0;

    for (const entry of entries) {
      // Check before each file — cancel takes effect within one file's processing time
      if (cancelledRef.current) {
        setFiles(prev => prev.map(f =>
          f.status === 'pending' ? { ...f, status: 'error', error: 'Cancelled' } : f
        ));
        break;
      }

      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, status: 'processing', error: undefined } : f
      ));

      try {
        const result = await api.candidates.bulkImport(jobId, entry.file);
        if (result.candidateId) newlyImported++;
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, status: 'done', candidateId: result.candidateId, isUpdate: result.isUpdate } : f
        ));
      } catch (err: any) {
        failCount++;
        setFiles(prev => prev.map(f =>
          f.id === entry.id
            ? { ...f, status: 'error', error: toUserError(err, 'Failed to import CV. Please try again.') }
            : f
        ));
      }
    }

    totalImportedRef.current += newlyImported;
    totalFailedRef.current += failCount;

    setImporting(false);
    if (!cancelledRef.current) setImportDone(true);

    onSessionUpdate?.({ id: sessionId, status: 'done', total: entries.length, succeeded: newlyImported, failed: failCount, jobId, jobName });
  };

  const runImport   = () => importEntries(files.filter(f => f.status === 'pending'));
  const retryFailed = () => importEntries(files.filter(f => f.status === 'error'));
  const retrySingle = (entry: FileEntry) => importEntries([entry]);

  // ── Derived counts ───────────────────────────────────────────────────────────

  const successCount = files.filter(f => f.status === 'done').length;
  const errorCount   = files.filter(f => f.status === 'error').length;
  const allDone      = files.length > 0 && files.every(f => f.status === 'done');
  const hasErrors    = errorCount > 0;
  const hasPending   = files.some(f => f.status === 'pending');

  const handleClose = () => {
    cancelledRef.current = true;
    setImporting(false);
    onClose(totalImportedRef.current, resolvedJobIdRef.current ?? undefined);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Bulk CV Import</h2>
            <p className="text-xs text-gray-400 mt-0.5">PDF or Word · max 10 MB each</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

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
              Drop CVs here or <span className="text-gray-900 font-semibold underline">browse</span>
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
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.isUpdate ? 'Updated existing candidate' : 'Added to pipeline'}
                      </p>
                    )}
                    {entry.status === 'error' && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">{entry.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {entry.status === 'pending' && !importing && (
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(entry.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                    {entry.status === 'processing' && <Loader2 size={14} className="text-gray-500 animate-spin" />}
                    {entry.status === 'done'       && <CheckCircle size={14} className="text-gray-400" />}
                    {entry.status === 'error'      && (
                      <>
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                        {!importing && (
                          <button
                            onClick={e => { e.stopPropagation(); retrySingle(entry); }}
                            className="px-2 h-5 rounded text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            Try again
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary after import */}
          {importDone && (successCount > 0 || errorCount > 0) && (
            <p className="text-xs text-center text-gray-400">
              {successCount > 0 && <span className="text-gray-700 font-medium">{successCount} imported</span>}
              {successCount > 0 && errorCount > 0 && ' · '}
              {errorCount > 0 && <span className="text-red-500 font-medium">{errorCount} failed</span>}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {files.length === 0 ? 'No files selected' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex gap-2">
            {/* "Done" closes the modal — board is already refreshed via onImported */}
            {importDone ? (
              <button
                onClick={handleClose}
                className="px-4 h-8 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 h-8 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={hasErrors && !hasPending ? retryFailed : runImport}
                  disabled={files.length === 0 || importing || allDone}
                  className="px-4 h-8 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing && <Loader2 size={13} className="animate-spin" />}
                  {importing
                    ? 'Importing…'
                    : hasErrors && !hasPending
                    ? `Retry failed (${errorCount})`
                    : `Import ${files.length > 0 ? files.length + ' CV' + (files.length !== 1 ? 's' : '') : ''}`}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
