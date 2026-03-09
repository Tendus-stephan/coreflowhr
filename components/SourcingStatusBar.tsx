/**
 * SourcingStatusBar — shows live sourcing progress for the selected job.
 * Polls every 5 seconds while status is 'pending' or 'running'.
 * Shows cap info, monthly credit balance, and Source 10 More button.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const JOB_CAP_PAID = 50;
const JOB_CAP_FREE = 20;

interface SourcingStatus {
  sourcing_status: 'pending' | 'running' | 'completed' | 'failed' | null;
  sourcing_candidates_count: number;
  sourcing_maxed_out: boolean;
  sourcing_last_run_at: string | null;
  sourcing_error_message: string | null;
  workspace_id?: string;
}

interface WorkspaceCredits {
  is_free_access: boolean;
  sourcing_credits_monthly: number;
  sourcing_credits_used_this_month: number;
  sourcing_credits_reset_at: string | null;
}

interface Props {
  jobId: string;
  workspaceId?: string;
  isReadOnly?: boolean;
  onCandidatesAdded?: () => void;
}

const POLL_INTERVAL_MS = 5000;

export const SourcingStatusBar: React.FC<Props> = ({
  jobId,
  workspaceId: workspaceIdProp,
  isReadOnly,
  onCandidatesAdded,
}) => {
  const [status, setStatus]                   = useState<SourcingStatus | null>(null);
  const [credits, setCredits]                 = useState<WorkspaceCredits | null>(null);
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(workspaceIdProp ?? null);
  const [sourcing, setSourcing]               = useState(false);
  const intervalRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('workspace_id, sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_last_run_at, sourcing_error_message')
      .eq('id', jobId)
      .maybeSingle();

    if (!error && data) {
      const wsId = (data.workspace_id as string) || resolvedWorkspaceId;
      if (wsId && !resolvedWorkspaceId) setResolvedWorkspaceId(wsId);
      setStatus(data as unknown as SourcingStatus);

      // Fetch workspace credit info whenever we resolve the workspace
      if (wsId && !credits) {
        fetchCredits(wsId);
      }
    }
  };

  const fetchCredits = async (wsId: string) => {
    const { data } = await supabase
      .from('workspaces')
      .select('is_free_access, sourcing_credits_monthly, sourcing_credits_used_this_month, sourcing_credits_reset_at')
      .eq('id', wsId)
      .maybeSingle();
    if (data) setCredits(data as WorkspaceCredits);
  };

  useEffect(() => {
    fetchStatus();
    if (workspaceIdProp) fetchCredits(workspaceIdProp);

    intervalRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('workspace_id, sourcing_status, sourcing_candidates_count, sourcing_maxed_out, sourcing_last_run_at, sourcing_error_message')
        .eq('id', jobId)
        .maybeSingle();

      if (!error && data) {
        const wsId = (data.workspace_id as string) || resolvedWorkspaceId;
        if (wsId && !resolvedWorkspaceId) setResolvedWorkspaceId(wsId);

        const newStatus = data as unknown as SourcingStatus;
        const wasRunning = status?.sourcing_status === 'pending' || status?.sourcing_status === 'running';
        const nowDone    = newStatus.sourcing_status === 'completed' || newStatus.sourcing_status === 'failed';

        setStatus(newStatus);

        if (wasRunning && nowDone) {
          if (onCandidatesAdded) onCandidatesAdded();
          if (wsId) fetchCredits(wsId); // refresh credit count
        }

        if (nowDone || newStatus.sourcing_status === null) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSourceMore = async () => {
    if (sourcing || isReadOnly || !resolvedWorkspaceId) return;
    setSourcing(true);
    try {
      await supabase.functions.invoke('source-more', {
        body: { job_id: jobId, workspace_id: resolvedWorkspaceId },
      });
      setStatus((prev) => prev ? { ...prev, sourcing_status: 'running' } : prev);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    } catch (err) {
      console.error('[SourcingStatusBar] source-more error:', err);
    } finally {
      setSourcing(false);
    }
  };

  if (!status) return null;

  const {
    sourcing_status,
    sourcing_candidates_count: count,
    sourcing_maxed_out,
    sourcing_error_message,
    sourcing_last_run_at,
  } = status;

  if (!sourcing_status) return null;

  const isFreeAccess   = credits?.is_free_access ?? false;
  const jobCap         = isFreeAccess ? JOB_CAP_FREE : JOB_CAP_PAID;
  const jobSlotsLeft   = Math.max(0, jobCap - count);
  const creditsMonthly = credits?.sourcing_credits_monthly ?? 200;
  const creditsUsed    = credits?.sourcing_credits_used_this_month ?? 0;
  const creditsLeft    = Math.max(0, creditsMonthly - creditsUsed);

  const resetDate = credits?.sourcing_credits_reset_at
    ? (() => {
        const d = new Date(credits.sourcing_credits_reset_at);
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      })()
    : null;

  const isStuckPending   = sourcing_status === 'pending' && !sourcing_last_run_at;
  const isMonthlyMaxed   = !isFreeAccess && creditsLeft <= 0;
  const canSourceMore    = !sourcing_maxed_out && !isMonthlyMaxed && !isReadOnly;

  return (
    <div className="mx-8 mb-3 px-4 py-2.5 rounded-xl text-sm border bg-white shadow-sm">
      {/* ── PENDING with 0 candidates (first run not started) ── */}
      {isStuckPending ? (
        <div className="flex items-center gap-3">
          <Users size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-gray-500">No candidates sourced yet</span>
          {!isReadOnly && (
            <button
              onClick={handleSourceMore}
              disabled={sourcing}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={12} className={sourcing ? 'animate-spin' : ''} />
              Source candidates
            </button>
          )}
        </div>

      /* ── RUNNING ── */
      ) : sourcing_status === 'pending' || sourcing_status === 'running' ? (
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
          <span className="text-gray-600">
            Sourcing candidates
            {count > 0 && (
              <span className="ml-1 text-blue-600 font-medium">— {count} found so far</span>
            )}
          </span>
        </div>

      /* ── COMPLETED ── */
      ) : sourcing_status === 'completed' ? (
        <>
          {/* Job cap reached */}
          {sourcing_maxed_out ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900">{jobCap} candidates sourced — this job is full</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Start screening your AI-scored matches to find your best hire
                </p>
              </div>
            </div>

          /* Monthly cap reached (but job not full) */
          ) : isMonthlyMaxed ? (
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-700">Monthly sourcing credits used up</span>
                {resetDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sourcing resumes on {resetDate}. {count} candidate{count !== 1 ? 's' : ''} sourced across all jobs this month.
                  </p>
                )}
              </div>
            </div>

          /* Normal completed */
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                <span className="text-gray-700">
                  <span className="font-medium text-gray-900">{count}</span>
                  {' '}candidate{count !== 1 ? 's' : ''} sourced for this job
                </span>
              </div>

              {canSourceMore && !isReadOnly && (
                <button
                  onClick={handleSourceMore}
                  disabled={sourcing}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                >
                  <RefreshCw size={12} className={sourcing ? 'animate-spin' : ''} />
                  {sourcing ? 'Sourcing...' : 'Source 10 more'}
                </button>
              )}

              <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
                <span>{jobSlotsLeft} job slot{jobSlotsLeft !== 1 ? 's' : ''} left</span>
                {!isFreeAccess && (
                  <span>{creditsLeft} monthly credit{creditsLeft !== 1 ? 's' : ''} remaining</span>
                )}
              </div>
            </div>
          )}
        </>

      /* ── FAILED ── */
      ) : sourcing_status === 'failed' ? (
        <div className="flex items-center gap-3">
          <AlertCircle size={16} className="text-orange-500 flex-shrink-0" />
          <div>
            <span className="text-orange-600 font-medium">Sourcing encountered an issue</span>
            {sourcing_error_message && (
              <span className="ml-1 text-orange-400 text-xs">— {sourcing_error_message}</span>
            )}
          </div>
          {!isReadOnly && (
            <button
              onClick={handleSourceMore}
              disabled={sourcing}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 disabled:opacity-50 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-colors"
            >
              <RefreshCw size={12} className={sourcing ? 'animate-spin' : ''} />
              Retry Sourcing
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
