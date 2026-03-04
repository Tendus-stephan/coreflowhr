/**
 * Main sourcing orchestrator.
 * Coordinates PDL search → cache → dedup → AI scoring → DB insert → notification.
 *
 * NOTE: This module is designed to run inside a Supabase Edge Function (Deno).
 * It uses Deno.env for secrets and a service-role Supabase client passed in.
 * Do NOT import this in frontend code.
 */

import { searchCandidates, mapPdlPersonToCandidate, saveToCacheBulk, type PdlPerson } from './pdlService';
import { scoreCandidatesBulk } from './scoringService';
import { getSourcingCap } from './planLimits';
import type { Job } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourcingResult {
  sourcing_job_id: string | null;
  candidates_found: number;
  candidates_created: number;
  maxed_out: boolean;
  error?: string;
}

// Minimal Supabase client interface (service-role, passed in from Edge Function)
interface ServiceSupabase {
  from: (table: string) => {
    select: (...args: unknown[]) => unknown;
    insert: (data: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    update: (data: unknown) => { eq: (...args: unknown[]) => Promise<{ error: unknown }> };
    upsert: (data: unknown, opts?: unknown) => Promise<{ error: unknown }>;
  };
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Run sourcing for a job. Steps:
 *  A. Fetch job details
 *  B. Check workspace eligibility (paid or design partner)
 *  C. Determine batch size (sourcing cap)
 *  D. Create sourcing_jobs tracking record (status=running)
 *  E. Call PDL with job_title, location, skills
 *  F. Bulk-cache results in sourcing_cache
 *  G. Dedup against existing candidates (same job + linkedin_url or pdl_id)
 *  H. Map PDL persons to candidate records
 *  I. AI-score all new candidates simultaneously
 *  J. Bulk-insert scored candidates into candidates table
 *  K. Update job sourcing fields (count, maxed_out, offset, last_run_at, status)
 *  L. Update sourcing_jobs record (status=completed)
 *  M. Insert in-app notification
 *  N. Error handling: update sourcing_jobs + job on failure
 */
export async function sourceCandidatesForJob(
  supabase: ServiceSupabase,
  jobId: string,
  workspaceId: string,
  triggerType: 'job_created' | 'manual' = 'job_created'
): Promise<SourcingResult> {
  let sourcingJobId: string | null = null;

  try {
    // A. Fetch job
    const jobRow = await fetchJob(supabase, jobId, workspaceId);
    if (!jobRow) {
      return { sourcing_job_id: null, candidates_found: 0, candidates_created: 0, maxed_out: false, error: 'Job not found' };
    }

    // B. Check workspace eligibility
    const workspace = await fetchWorkspace(supabase, workspaceId);
    if (!workspace) {
      return { sourcing_job_id: null, candidates_found: 0, candidates_created: 0, maxed_out: false, error: 'Workspace not found' };
    }

    const isFreeAccess: boolean = workspace.is_free_access === true;

    // Design partner expiry check
    if (isFreeAccess && workspace.free_access_expires_at) {
      const expiry = new Date(workspace.free_access_expires_at as string);
      if (expiry < new Date()) {
        return { sourcing_job_id: null, candidates_found: 0, candidates_created: 0, maxed_out: false, error: 'Design partner access expired' };
      }
    }

    // Require active subscription unless design partner
    const subStatus = ((workspace.subscription_status as string) || '').toLowerCase();
    if (!isFreeAccess && subStatus !== 'active') {
      return { sourcing_job_id: null, candidates_found: 0, candidates_created: 0, maxed_out: false, error: 'No active subscription' };
    }

    // C. Determine cap & offset
    const cap = getSourcingCap(isFreeAccess);
    const currentCount: number = (jobRow.sourcing_candidates_count as number) || 0;

    if (currentCount >= cap) {
      // Already at cap — mark maxed
      await updateJobSourcing(supabase, jobId, {
        sourcing_status: 'completed',
        sourcing_maxed_out: true,
      });
      return { sourcing_job_id: null, candidates_found: 0, candidates_created: 0, maxed_out: true };
    }

    const remaining = cap - currentCount;
    const batchSize = Math.min(remaining, 20); // PDL max page size = 100, we fetch 20 at a time
    const pdlOffset: number = (jobRow.sourcing_pdl_offset as number) || 0;

    // D. Create sourcing_jobs record
    sourcingJobId = await createSourcingJob(supabase, {
      job_id: jobId,
      workspace_id: workspaceId,
      trigger_type: triggerType,
      status: 'running',
      candidates_requested: batchSize,
      pdl_offset_start: pdlOffset,
      started_at: new Date().toISOString(),
    });

    // Mark job as running
    await updateJobSourcing(supabase, jobId, { sourcing_status: 'running' });

    // E. Call PDL
    const job = jobRow as unknown as Job;
    const pdlResult = await searchCandidates(
      job.title || '',
      job.location || '',
      Array.isArray(job.skills) ? job.skills : [],
      batchSize,
      pdlOffset
    );

    const pdlPersons: PdlPerson[] = pdlResult.data || [];

    // F. Bulk cache
    if (pdlPersons.length > 0) {
      await saveToCacheBulk(pdlPersons);
    }

    // G. Dedup — fetch existing linkedin_urls and pdl_ids for this job
    const existingLinkedIn = await getExistingLinkedInUrls(supabase, jobId);
    const existingPdlIds = await getExistingPdlIds(supabase, jobId);

    const newPersons = pdlPersons.filter((p) => {
      if (p.linkedin_url && existingLinkedIn.has(p.linkedin_url)) return false;
      if (p.id && existingPdlIds.has(p.id)) return false;
      return true;
    });

    if (newPersons.length === 0) {
      await finalizeSourcingJob(supabase, sourcingJobId, {
        status: 'completed',
        candidates_found: pdlPersons.length,
        candidates_created: 0,
        pdl_offset_end: pdlOffset + batchSize,
        completed_at: new Date().toISOString(),
      });

      const newOffset = pdlOffset + batchSize;
      const maxedOut = currentCount >= cap;
      await updateJobSourcing(supabase, jobId, {
        sourcing_status: 'completed',
        sourcing_pdl_offset: newOffset,
        sourcing_last_run_at: new Date().toISOString(),
        sourcing_maxed_out: maxedOut,
      });

      return { sourcing_job_id: sourcingJobId, candidates_found: pdlPersons.length, candidates_created: 0, maxed_out: maxedOut };
    }

    // H. Map to candidate records
    const mappedCandidates = newPersons.map((p) => ({
      ...mapPdlPersonToCandidate(p),
      job_id: jobId,
      workspace_id: workspaceId,
      stage: 'New',
      applied_date: new Date().toISOString(),
    }));

    // I. AI score all simultaneously
    const scoringInputs = newPersons.map((p) => ({
      fullName: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      currentJobTitle: p.job_title || '',
      currentCompany: p.job_company_name || '',
      location: p.location_name || p.job_company_location_locality || '',
      skills: Array.isArray(p.skills) ? p.skills : [],
      experience: Array.isArray(p.experience) ? p.experience : [],
      education: Array.isArray(p.education) ? p.education : [],
    }));

    const scores = await scoreCandidatesBulk(
      { title: job.title, description: job.description, skills: job.skills, location: job.location },
      scoringInputs
    );

    // Merge scores into candidate records
    const scoredCandidates = mappedCandidates.map((c, i) => ({
      ...c,
      ai_match_score: scores[i]?.score ?? null,
      ai_match_reason: scores[i]?.reason ?? null,
    }));

    // J. Bulk insert
    const insertResult = await bulkInsertCandidates(supabase, scoredCandidates);
    const created = insertResult.count;

    // K. Update job
    const newCount = currentCount + created;
    const newOffset = pdlOffset + batchSize;
    const maxedOut = newCount >= cap;

    await updateJobSourcing(supabase, jobId, {
      sourcing_status: 'completed',
      sourcing_candidates_count: newCount,
      sourcing_maxed_out: maxedOut,
      sourcing_pdl_offset: newOffset,
      sourcing_last_run_at: new Date().toISOString(),
      sourcing_error_message: null,
    });

    // L. Update sourcing_jobs record
    await finalizeSourcingJob(supabase, sourcingJobId, {
      status: 'completed',
      candidates_found: pdlPersons.length,
      candidates_created: created,
      pdl_offset_end: newOffset,
      completed_at: new Date().toISOString(),
    });

    // M. In-app notification for workspace members
    await insertSourcingNotification(supabase, workspaceId, jobId, job.title || '', created, maxedOut);

    return { sourcing_job_id: sourcingJobId, candidates_found: pdlPersons.length, candidates_created: created, maxed_out: maxedOut };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Sourcing] Fatal error:', errorMessage);

    // N. Error handling
    if (sourcingJobId) {
      await finalizeSourcingJob(supabase, sourcingJobId, {
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).catch(() => {});
    }

    await updateJobSourcing(supabase, jobId, {
      sourcing_status: 'failed',
      sourcing_error_message: errorMessage,
      sourcing_last_run_at: new Date().toISOString(),
    }).catch(() => {});

    return { sourcing_job_id: sourcingJobId, candidates_found: 0, candidates_created: 0, maxed_out: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchJob(supabase: ServiceSupabase, jobId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
  const client = supabase.from('jobs') as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
        };
      };
    };
  };

  const { data, error } = await client
    .select('id, title, description, location, skills, sourcing_candidates_count, sourcing_pdl_offset')
    .eq('id', jobId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) console.error('[Sourcing] fetchJob error:', error);
  return data;
}

async function fetchWorkspace(supabase: ServiceSupabase, workspaceId: string): Promise<Record<string, unknown> | null> {
  const client = supabase.from('workspaces') as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };

  const { data, error } = await client
    .select('id, subscription_status, is_free_access, free_access_expires_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) console.error('[Sourcing] fetchWorkspace error:', error);
  return data;
}

async function getExistingLinkedInUrls(supabase: ServiceSupabase, jobId: string): Promise<Set<string>> {
  const client = supabase.from('candidates') as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        not: (col: string, op: string, val: unknown) => Promise<{ data: Array<{ linkedin_url: string }> | null; error: unknown }>;
      };
    };
  };

  const { data } = await client
    .select('linkedin_url')
    .eq('job_id', jobId)
    .not('linkedin_url', 'is', null);

  return new Set((data || []).map((r) => r.linkedin_url).filter(Boolean));
}

async function getExistingPdlIds(supabase: ServiceSupabase, jobId: string): Promise<Set<string>> {
  const client = supabase.from('candidates') as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        not: (col: string, op: string, val: unknown) => Promise<{ data: Array<{ pdl_id: string }> | null; error: unknown }>;
      };
    };
  };

  const { data } = await client
    .select('pdl_id')
    .eq('job_id', jobId)
    .not('pdl_id', 'is', null);

  return new Set((data || []).map((r) => r.pdl_id).filter(Boolean));
}

async function createSourcingJob(supabase: ServiceSupabase, record: Record<string, unknown>): Promise<string | null> {
  const client = supabase.from('sourcing_jobs') as {
    insert: (data: unknown) => {
      select: () => { single: () => Promise<{ data: { id: string } | null; error: unknown }> };
    };
  };

  const { data, error } = await client.insert(record).select().single();
  if (error) console.error('[Sourcing] createSourcingJob error:', error);
  return (data as { id: string } | null)?.id ?? null;
}

async function finalizeSourcingJob(supabase: ServiceSupabase, id: string, updates: Record<string, unknown>): Promise<void> {
  const client = supabase.from('sourcing_jobs') as {
    update: (data: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };

  const { error } = await client.update(updates).eq('id', id);
  if (error) console.error('[Sourcing] finalizeSourcingJob error:', error);
}

async function updateJobSourcing(supabase: ServiceSupabase, jobId: string, updates: Record<string, unknown>): Promise<void> {
  const client = supabase.from('jobs') as {
    update: (data: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };

  const { error } = await client.update(updates).eq('id', jobId);
  if (error) console.error('[Sourcing] updateJobSourcing error:', error);
}

async function bulkInsertCandidates(supabase: ServiceSupabase, candidates: Record<string, unknown>[]): Promise<{ count: number }> {
  if (!candidates.length) return { count: 0 };

  const client = supabase.from('candidates') as unknown as {
    insert: (data: unknown) => {
      select: () => Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };

  const { data, error } = await client.insert(candidates).select();
  if (error) {
    console.error('[Sourcing] bulkInsertCandidates error:', error);
    return { count: 0 };
  }
  return { count: (data || []).length };
}

async function insertSourcingNotification(
  supabase: ServiceSupabase,
  workspaceId: string,
  jobId: string,
  jobTitle: string,
  created: number,
  maxedOut: boolean
): Promise<void> {
  const message = maxedOut
    ? `Sourcing complete for "${jobTitle}" — reached the sourcing cap. ${created} candidate${created !== 1 ? 's' : ''} added.`
    : `Sourcing complete for "${jobTitle}" — ${created} new candidate${created !== 1 ? 's' : ''} added.`;

  const client = supabase.from('notifications') as unknown as {
    insert: (data: unknown) => Promise<{ error: unknown }>;
  };

  const { error } = await client.insert({
    workspace_id: workspaceId,
    type: 'sourcing_complete',
    title: 'Sourcing complete',
    message,
    metadata: { job_id: jobId, candidates_created: created, maxed_out: maxedOut },
    created_at: new Date().toISOString(),
    read: false,
  });

  if (error) console.error('[Sourcing] insertSourcingNotification error:', error);
}
