/**
 * SourcingStatusBar — shows live PDL sourcing progress for the selected job.
 * Polls every 5 seconds while status is 'pending' or 'running'.
 * Shows a "Source More" button when completed and not maxed out.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Users, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SourcingStatus {
  sourcing_status: 'pending' | 'running' | 'completed' | 'failed' | null;
  sourcing_candidates_count: number;
  sourcing_maxed_out: boolean;
  sourcing_last_run_at: string | null;
  sourcing_error_message: string | null;
}

interface Props {
  jobId: string;
  workspaceId?: string; // optional — fetched from job row if omitted
  isReadOnly?: boolean;
  onCandidatesAdded?: () => void;
}

const POLL_INTERVAL_MS = 5000;

export const SourcingStatusBar: React.FC<Props> = ({ jobId, workspaceId: workspaceIdProp, isReadOnly, onCandidatesAdded }) => {
  const [status, setStatus] = useState<SourcingStatus | null>(null);
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(workspaceIdProp ?? null);
  const [sourcing, setSourcing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    const query = supabase
      .from('jobs')
      .select('workspace_id, sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_last_run_at, sourcing_error_message')
      .eq('id', jobId);

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      if (!resolvedWorkspaceId && data.workspace_id) {
        setResolvedWorkspaceId(data.workspace_id as string);
      }
      setStatus(data as unknown as SourcingStatus);
    }
  };

  useEffect(() => {
    fetchStatus();

    intervalRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('workspace_id, sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_last_run_at, sourcing_error_message')
        .eq('id', jobId)
        .maybeSingle();

      if (!error && data) {
        if (!resolvedWorkspaceId && (data as Record<string, unknown>).workspace_id) {
          setResolvedWorkspaceId((data as Record<string, unknown>).workspace_id as string);
        }
        const newStatus = data as unknown as SourcingStatus;
        const wasRunning = status?.sourcing_status === 'pending' || status?.sourcing_status === 'running';
        const nowDone = newStatus.sourcing_status === 'completed' || newStatus.sourcing_status === 'failed';

        setStatus(newStatus);

        if (wasRunning && nowDone && onCandidatesAdded) {
          onCandidatesAdded();
        }

        // Stop polling when no longer active
        if (nowDone || newStatus.sourcing_status === null) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSourceMore = async () => {
    if (sourcing || isReadOnly || !resolvedWorkspaceId) return;
    setSourcing(true);
    try {
      await supabase.functions.invoke('source-more', {
        body: { job_id: jobId, workspace_id: resolvedWorkspaceId },
      });
      // Start polling again
      setStatus((prev) => prev ? { ...prev, sourcing_status: 'running' } : prev);
      intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    } catch (err) {
      console.error('[SourcingStatusBar] source-more error:', err);
    } finally {
      setSourcing(false);
    }
  };

  if (!status) return null;

  const { sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_error_message } = status;

  // Don't render if never sourced
  if (!sourcing_status) return null;

  return (
    <div className="mx-8 mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border bg-white shadow-sm">
      {sourcing_status === 'pending' || sourcing_status === 'running' ? (
        <>
          <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
          <span className="text-gray-600">
            Sourcing candidates from PeopleDataLabs
            {sourcing_candidates_count > 0 && (
              <span className="ml-1 text-blue-600 font-medium">— {sourcing_candidates_count} found so far</span>
            )}
          </span>
        </>
      ) : sourcing_status === 'completed' ? (
        <>
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
          <span className="text-gray-700 flex items-center gap-1">
            <Users size={14} className="text-gray-400" />
            <span className="font-medium text-gray-900">{sourcing_candidates_count}</span>
            <span>candidate{sourcing_candidates_count !== 1 ? 's' : ''} sourced</span>
            {sourcing_maxed_out && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Cap reached</span>
            )}
          </span>
          {!sourcing_maxed_out && !isReadOnly && (
            <button
              onClick={handleSourceMore}
              disabled={sourcing}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={12} className={sourcing ? 'animate-spin' : ''} />
              Source more
            </button>
          )}
        </>
      ) : sourcing_status === 'failed' ? (
        <>
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-red-600">
            Sourcing failed
            {sourcing_error_message && <span className="ml-1 text-red-400 text-xs">— {sourcing_error_message}</span>}
          </span>
          {!isReadOnly && (
            <button
              onClick={handleSourceMore}
              disabled={sourcing}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={12} className={sourcing ? 'animate-spin' : ''} />
              Retry
            </button>
          )}
        </>
      ) : null}
    </div>
  );
};
