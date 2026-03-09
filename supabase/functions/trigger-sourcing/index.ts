/**
 * trigger-sourcing Edge Function
 *
 * Called fire-and-forget after job creation to kick off candidate sourcing.
 * Accepts: POST { job_id: string, workspace_id: string }
 * Auth: anon JWT (verified against workspace membership) OR service-role key.
 *
 * Provider is controlled by SOURCING_PROVIDER env var (default: 'pdl').
 * Changing to 'reachstream' switches the entire platform with no code deploy.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pdlApiKey       = Deno.env.get('PDL_API_KEY');
    const rsApiKey        = Deno.env.get('REACHSTREAM_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const envProvider     = (Deno.env.get('SOURCING_PROVIDER') || 'pdl') as 'pdl' | 'reachstream';

    // Require at least one sourcing API key
    if (!pdlApiKey && !rsApiKey) {
      console.warn('[trigger-sourcing] No sourcing API key set (PDL_API_KEY or REACHSTREAM_API_KEY)');
      return new Response(JSON.stringify({ ok: false, error: 'No sourcing API key configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { job_id, workspace_id } = body as { job_id?: string; workspace_id?: string };

    if (!job_id || !workspace_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing job_id or workspace_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller has access to this workspace
    const authHeader  = req.headers.get('authorization') || '';
    const callerToken = authHeader.replace(/^bearer\s+/i, '');

    const isServiceRole = (() => {
      try {
        const payload = JSON.parse(atob(callerToken.split('.')[1]));
        return payload?.role === 'service_role';
      } catch { return false; }
    })();

    if (callerToken && !isServiceRole) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { authorization: authHeader } },
      });
      const { data: membership } = await anonClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace_id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ ok: false, error: 'Not authorized for this workspace' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const result = await runSourcing(
      serviceClient, job_id, workspace_id, 'job_created',
      pdlApiKey, rsApiKey, anthropicApiKey, envProvider
    );

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[trigger-sourcing] Unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PDL_API_URL = 'https://api.peopledatalabs.com/v5/person/search';
const RS_FILTER_URL = 'https://api-prd.reachstream.com/api/v2/async/records/filter/data';
const RS_BATCH_URL  = 'https://api-prd.reachstream.com/api/v2/records/batch-process';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL   = 'claude-sonnet-4-20250514';

const JOB_CAP_PAID = 50;
const JOB_CAP_FREE = 20;
const BATCH_SIZE   = 10;

// ---------------------------------------------------------------------------
// Provider helpers
// ---------------------------------------------------------------------------

function getSourcingCap(isFreeAccess: boolean): number {
  return isFreeAccess ? JOB_CAP_FREE : JOB_CAP_PAID;
}

// deno-lint-ignore no-explicit-any
async function searchPdl(
  apiKey: string, jobTitle: string, _location: string, _skills: string[],
  size: number, scrollToken: string | null
): Promise<{ data: Record<string, unknown>[]; total: number; nextScrollToken: string | null; errorMessage?: string }> {
  const escapedTitle = jobTitle.replace(/'/g, "''");
  const sql = `SELECT * FROM person WHERE job_title LIKE '%${escapedTitle}%'`;

  const url = new URL(PDL_API_URL);
  url.searchParams.set('sql', sql);
  url.searchParams.set('size', String(size));
  if (scrollToken) url.searchParams.set('scroll_token', scrollToken);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-Api-Key': apiKey },
  });

  const responseText = await res.text().catch(() => '');
  if (!res.ok) {
    let errorMsg = `PDL HTTP ${res.status}`;
    try { errorMsg = (JSON.parse(responseText)?.error?.message as string) || errorMsg; } catch { /* ignore */ }
    console.error('[PDL] Search failed:', errorMsg);
    return { data: [], total: 0, nextScrollToken: null, errorMessage: errorMsg };
  }

  const json = JSON.parse(responseText);
  console.log('[PDL] HTTP 200 | total:', json.total, '| returned:', (json.data || []).length);
  return { data: json.data || [], total: json.total || 0, nextScrollToken: json.scroll_token || null };
}

async function searchReachStream(
  apiKey: string, jobTitle: string, location: string, skills: string[], size: number
): Promise<{ data: Record<string, unknown>[]; total: number; errorMessage?: string }> {
  const filter: Record<string, Record<string, string>> = {};

  if (jobTitle) filter.job_title = { '0': jobTitle };

  if (location) {
    const parts = location.split(',').map((s: string) => s.trim());
    if (parts.length >= 2) {
      filter.company_address_city    = { '0': parts[0] };
      filter.company_address_country = { '0': parts[parts.length - 1] };
    } else {
      filter.company_address_country = { '0': location };
    }
  }

  if (skills.length > 0) {
    filter.tech_keywords = Object.fromEntries(
      skills.slice(0, 10).map((s: string, i: number) => [String(i), s])
    );
  }

  try {
    const initRes = await fetch(RS_FILTER_URL, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ fetchCount: size, filter }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => '');
      console.error(`[ReachStream] Initiate failed: ${initRes.status}`, errText);
      return { data: [], total: 0, errorMessage: `ReachStream HTTP ${initRes.status}` };
    }

    const initJson = await initRes.json();
    const batchId = initJson?.batch_process_id ?? initJson?.data?.batch_process_id;
    if (!batchId) {
      console.error('[ReachStream] No batch_process_id in response');
      return { data: [], total: 0, errorMessage: 'No batch_process_id returned' };
    }

    // Poll until READY (max 15 attempts × 2s = 30s)
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`${RS_BATCH_URL}?batch_process_id=${batchId}`, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' },
      });

      if (!pollRes.ok) {
        const errText = await pollRes.text().catch(() => '');
        console.error(`[ReachStream] Poll failed: ${pollRes.status}`, errText);
        return { data: [], total: 0, errorMessage: `ReachStream poll HTTP ${pollRes.status}` };
      }

      const pollJson = await pollRes.json();
      const status = (pollJson?.status || pollJson?.record_status || '').toUpperCase();

      if (status === 'READY') {
        const records: Record<string, unknown>[] = pollJson?.data || pollJson?.records || [];
        console.log('[ReachStream] Batch READY | total:', pollJson?.total_records, '| returned:', records.length);
        return { data: records, total: pollJson?.total_records ?? records.length };
      }

      if (status === 'INSUFFICIENT_BALANCE') {
        return { data: [], total: 0, errorMessage: 'ReachStream insufficient credits' };
      }
    }

    return { data: [], total: 0, errorMessage: 'ReachStream batch timed out' };
  } catch (err) {
    console.error('[ReachStream] Error:', err);
    return { data: [], total: 0, errorMessage: String(err) };
  }
}

// deno-lint-ignore no-explicit-any
function mapPdlPerson(p: Record<string, unknown>, jobId: string, workspaceId: string, userId: string): Record<string, unknown> {
  const locality = (p.location_locality as string) || (p.job_company_location_locality as string) || '';
  const country  = (p.location_country  as string) || (p.job_company_location_country  as string) || '';
  const location = locality && country ? `${locality}, ${country}` : locality || country || (p.location_name as string) || '';
  return {
    job_id, workspace_id, user_id: userId,
    name: (p.full_name as string) || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
    email: (p.work_email as string) || (Array.isArray(p.personal_emails) ? (p.personal_emails as string[])[0] : null) || null,
    linkedin_url: (p.linkedin_url as string) || null,
    role: (p.job_title as string) || null,
    current_company: (p.job_company_name as string) || null,
    location,
    profile_picture_url: (p.profile_pic_url as string) || null,
    skills: Array.isArray(p.skills) ? p.skills : [],
    work_experience: Array.isArray(p.experience) ? p.experience : [],
    education: Array.isArray(p.education) ? p.education : [],
    pdl_id: (p.id as string) || null,
    reachstream_id: null,
    source: 'Sourced',
    sourced_at: new Date().toISOString(),
    stage: 'New',
    applied_date: new Date().toISOString(),
  };
}

function mapReachStreamPerson(p: Record<string, unknown>, jobId: string, workspaceId: string, userId: string): Record<string, unknown> {
  const city    = (p.contact_address_city    as string) || '';
  const country = (p.contact_address_country as string) || '';
  const location = city && country ? `${city}, ${country}` : city || country || '';
  const firstName = (p.contact_first_name as string) || '';
  const lastName  = (p.contact_last_name  as string) || '';
  const fullName  = (p.contact_name as string) || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Unknown');
  return {
    job_id, workspace_id, user_id: userId,
    name: fullName,
    email: (p.contact_email_1 as string) || null,
    linkedin_url: (p.contact_social_linkedin as string) || null,
    role: (p.contact_job_title_1 as string) || null,
    current_company: (p.company_company_name as string) || null,
    location,
    profile_picture_url: null,
    skills: [],
    work_experience: [],
    education: [],
    pdl_id: null,
    reachstream_id: p.id != null ? String(p.id) : null,
    source: 'Sourced',
    sourced_at: new Date().toISOString(),
    stage: 'New',
    applied_date: new Date().toISOString(),
  };
}

async function scoreCandidate(
  anthropicApiKey: string | undefined,
  job: { title: string; description: string; location: string; skills: string[] },
  candidate: { fullName: string; currentTitle: string; location: string; skills: string[] }
): Promise<{ score: number; reason: string }> {
  if (!anthropicApiKey) return { score: 0, reason: '' };

  const prompt = `You are a recruiter assistant. Score this candidate for the job on a scale of 0–100 and give a one-sentence reason.

JOB:
Title: ${job.title}
Location: ${job.location}
Skills required: ${job.skills.join(', ')}
Description: ${(job.description || '').slice(0, 400)}

CANDIDATE:
Name: ${candidate.fullName}
Current title: ${candidate.currentTitle}
Location: ${candidate.location}
Skills: ${candidate.skills.join(', ')}

Respond with exactly this JSON format and nothing else:
{"score": <number 0-100>, "reason": "<one sentence>"}`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'x-api-key': anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 128, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return { score: 0, reason: '' };
    const json = await res.json();
    const text: string = json?.content?.[0]?.text || '';
    const parsed = JSON.parse(text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim());
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
      reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    };
  } catch { return { score: 0, reason: '' }; }
}

// ---------------------------------------------------------------------------
// Main sourcing orchestrator
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function runSourcing(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  jobId: string,
  workspaceId: string,
  triggerType: string,
  pdlApiKey: string | undefined,
  rsApiKey: string | undefined,
  anthropicApiKey: string | undefined,
  envProvider: 'pdl' | 'reachstream'
) {
  // Fetch job
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, description, location, skills, sourcing_candidates_count, sourcing_pdl_scroll_token, user_id')
    .eq('id', jobId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!job) return { candidates_found: 0, candidates_created: 0, error: 'Job not found' };

  // Fetch workspace (including new cap fields)
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, is_free_access, free_access_expires_at, sourcing_provider, sourcing_credits_monthly, sourcing_credits_used_this_month, sourcing_credits_reset_at, sourcing_notifications_sent')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) console.error('[trigger-sourcing] workspace query error:', JSON.stringify(wsError));
  if (!workspace) return { candidates_found: 0, candidates_created: 0, error: 'Workspace not found' };

  const isFreeAccess = workspace.is_free_access === true;

  if (isFreeAccess && workspace.free_access_expires_at) {
    if (new Date(workspace.free_access_expires_at) < new Date()) {
      return { candidates_found: 0, candidates_created: 0, error: 'Design partner access expired' };
    }
  }

  if (!isFreeAccess) {
    const { data: ownerSettings } = await supabase
      .from('user_settings')
      .select('subscription_status')
      .eq('user_id', job.user_id)
      .maybeSingle();
    const subStatus = (ownerSettings?.subscription_status || '').toLowerCase();
    if (subStatus !== 'active') {
      return { candidates_found: 0, candidates_created: 0, error: 'No active subscription' };
    }
  }

  // Determine active provider (workspace setting overrides env var)
  const provider: 'pdl' | 'reachstream' =
    (workspace.sourcing_provider as 'pdl' | 'reachstream') || envProvider;

  // ---- Monthly cap check ----
  const now = new Date();
  let creditsUsed: number  = workspace.sourcing_credits_used_this_month ?? 0;
  let notifsSent: Record<string, boolean> = workspace.sourcing_notifications_sent ?? {};
  const creditsMonthly: number = workspace.sourcing_credits_monthly ?? 200;

  if (!isFreeAccess) {
    const resetAt = new Date(workspace.sourcing_credits_reset_at || now);
    const monthsSinceReset =
      (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());

    if (monthsSinceReset >= 1) {
      await supabase.from('workspaces').update({
        sourcing_credits_used_this_month: 0,
        sourcing_credits_reset_at: now.toISOString(),
        sourcing_notifications_sent: {},
      }).eq('id', workspaceId);
      creditsUsed = 0;
      notifsSent  = {};
    }

    const creditsRemaining = creditsMonthly - creditsUsed;
    if (creditsRemaining <= 0) {
      const resetDate = new Date(workspace.sourcing_credits_reset_at || now);
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      await supabase.from('notifications').insert({
        workspace_id: workspaceId,
        type: 'sourcing_cap',
        title: 'Monthly sourcing limit reached',
        message: `Your workspace has used all ${creditsMonthly} sourcing credits for this month. Sourcing resumes on the 1st of next month.`,
        metadata: { job_id: jobId },
        created_at: now.toISOString(),
        read: false,
      }).catch(() => {});
      return { candidates_found: 0, candidates_created: 0, reason: 'monthly_cap_reached' };
    }
  }

  // ---- Per-job cap check ----
  const JOB_CAP     = getSourcingCap(isFreeAccess);
  const currentCount: number = job.sourcing_candidates_count ?? 0;

  if (currentCount >= JOB_CAP) {
    await supabase.from('jobs').update({ sourcing_status: 'completed', sourcing_maxed_out: true }).eq('id', jobId);
    return { candidates_found: 0, candidates_created: 0, maxed_out: true };
  }

  const creditsRemaining = isFreeAccess ? JOB_CAP : (creditsMonthly - creditsUsed);
  const remainingJobSlots = JOB_CAP - currentCount;
  const batchSize = Math.min(BATCH_SIZE, remainingJobSlots, creditsRemaining);

  if (batchSize <= 0) {
    return { candidates_found: 0, candidates_created: 0, reason: 'no_capacity' };
  }

  // Create sourcing_jobs record
  const { data: sourcingJobRow } = await supabase
    .from('sourcing_jobs')
    .insert({
      job_id: jobId,
      workspace_id: workspaceId,
      trigger_type: triggerType,
      status: 'running',
      candidates_requested: batchSize,
      pdl_offset_start: 0,
      sourcing_provider: provider,
      started_at: now.toISOString(),
    })
    .select()
    .single();

  const sourcingJobId = sourcingJobRow?.id;
  await supabase.from('jobs').update({ sourcing_status: 'running' }).eq('id', jobId);

  // ---- Search primary provider ----
  const pdlScrollToken: string | null = job.sourcing_pdl_scroll_token || null;
  let persons: Record<string, unknown>[] = [];
  let nextScrollToken: string | null = null;
  let searchError: string | undefined;
  let effectiveProvider = provider;

  if (provider === 'reachstream' && rsApiKey) {
    const rsResult = await searchReachStream(
      rsApiKey, job.title || '', job.location || '',
      Array.isArray(job.skills) ? job.skills : [], batchSize
    );
    persons      = rsResult.data;
    searchError  = rsResult.errorMessage;

    // Fallback to PDL if ReachStream returns nothing
    if (persons.length === 0 && pdlApiKey) {
      console.log('[trigger-sourcing] ReachStream returned no results, falling back to PDL');
      const pdlFallback = await searchPdl(
        pdlApiKey, job.title || '', job.location || '',
        Array.isArray(job.skills) ? job.skills : [], batchSize, pdlScrollToken
      );
      persons           = pdlFallback.data;
      nextScrollToken   = pdlFallback.nextScrollToken;
      searchError       = pdlFallback.errorMessage;
      effectiveProvider = 'pdl';
    }
  } else if (pdlApiKey) {
    const pdlResult = await searchPdl(
      pdlApiKey, job.title || '', job.location || '',
      Array.isArray(job.skills) ? job.skills : [], batchSize, pdlScrollToken
    );
    persons         = pdlResult.data;
    nextScrollToken = pdlResult.nextScrollToken;
    searchError     = pdlResult.errorMessage;
  } else {
    searchError = 'No API key available for provider: ' + provider;
  }

  if (searchError && persons.length === 0) {
    await supabase.from('jobs').update({ sourcing_status: 'failed', sourcing_error_message: searchError }).eq('id', jobId);
    if (sourcingJobId) await supabase.from('sourcing_jobs').update({ status: 'failed', completed_at: now.toISOString() }).eq('id', sourcingJobId);
    return { candidates_found: 0, candidates_created: 0, error: searchError };
  }

  // Cache results
  if (persons.length > 0) {
    if (effectiveProvider === 'reachstream') {
      const cacheRecords = persons
        .filter((p) => p.contact_social_linkedin || p.id)
        .map((p) => ({
          linkedin_url: (p.contact_social_linkedin as string) || null,
          reachstream_id: p.id != null ? String(p.id) : null,
          full_name: (p.contact_name as string) || null,
          current_job_title: (p.contact_job_title_1 as string) || null,
          current_company: (p.company_company_name as string) || null,
          location: (p.contact_address_city && p.contact_address_country)
            ? `${p.contact_address_city}, ${p.contact_address_country}` : null,
          email: (p.contact_email_1 as string) || null,
          skills: [], experience: [], education: [],
          raw_pdl_data: p,
          last_updated_at: now.toISOString(),
        }));
      if (cacheRecords.length > 0) {
        await supabase.from('sourcing_cache')
          .upsert(cacheRecords, { onConflict: 'linkedin_url', ignoreDuplicates: false })
          .catch(() => {});
      }
    } else {
      const cacheRecords = persons
        .filter((p) => p.linkedin_url || p.id)
        .map((p) => ({
          linkedin_url: p.linkedin_url || null,
          pdl_id: p.id || null,
          full_name: p.full_name || null,
          current_job_title: p.job_title || null,
          current_company: p.job_company_name || null,
          location: p.location_name || null,
          email: p.work_email || (Array.isArray(p.personal_emails) ? (p.personal_emails as string[])[0] : null) || null,
          skills: p.skills || [], experience: p.experience || [], education: p.education || [],
          raw_pdl_data: p,
          last_updated_at: now.toISOString(),
        }));
      if (cacheRecords.length > 0) {
        await supabase.from('sourcing_cache')
          .upsert(cacheRecords, { onConflict: 'linkedin_url', ignoreDuplicates: false })
          .catch(() => {});
      }
    }
  }

  // Dedup — check all provider IDs
  const { data: existingLinkedIn } = await supabase
    .from('candidates').select('linkedin_url').eq('job_id', jobId).not('linkedin_url', 'is', null);
  const { data: existingPdlIds } = await supabase
    .from('candidates').select('pdl_id').eq('job_id', jobId).not('pdl_id', 'is', null);
  const { data: existingRsIds } = await supabase
    .from('candidates').select('reachstream_id').eq('job_id', jobId).not('reachstream_id', 'is', null);

  const linkedInSet = new Set((existingLinkedIn  || []).map((r: { linkedin_url: string })   => r.linkedin_url));
  const pdlIdSet    = new Set((existingPdlIds     || []).map((r: { pdl_id: string })         => r.pdl_id));
  const rsIdSet     = new Set((existingRsIds      || []).map((r: { reachstream_id: string }) => r.reachstream_id));

  const newPersons = persons.filter((p) => {
    const liUrl = effectiveProvider === 'reachstream'
      ? (p.contact_social_linkedin as string) : (p.linkedin_url as string);
    const pId   = effectiveProvider === 'reachstream'
      ? (p.id != null ? String(p.id) : null) : (p.id as string);

    if (liUrl && linkedInSet.has(liUrl)) return false;
    if (effectiveProvider === 'pdl'         && pId && pdlIdSet.has(pId)) return false;
    if (effectiveProvider === 'reachstream' && pId && rsIdSet.has(pId))  return false;
    return true;
  });

  if (newPersons.length === 0) {
    await supabase.from('jobs').update({
      sourcing_status: 'completed',
      sourcing_pdl_scroll_token: nextScrollToken,
      sourcing_last_run_at: now.toISOString(),
    }).eq('id', jobId);
    if (sourcingJobId) {
      await supabase.from('sourcing_jobs').update({
        status: 'completed', candidates_found: persons.length, candidates_created: 0, completed_at: now.toISOString(),
      }).eq('id', sourcingJobId);
    }
    return { candidates_found: persons.length, candidates_created: 0, maxed_out: false };
  }

  // Map to candidate records
  const candidateRecords = newPersons.map((p) =>
    effectiveProvider === 'reachstream'
      ? mapReachStreamPerson(p, jobId, workspaceId, job.user_id)
      : mapPdlPerson(p, jobId, workspaceId, job.user_id)
  );

  // AI score all simultaneously
  const scores = await Promise.all(
    candidateRecords.map((c) => scoreCandidate(anthropicApiKey, {
      title: job.title || '', description: job.description || '',
      location: job.location || '', skills: Array.isArray(job.skills) ? job.skills : [],
    }, {
      fullName: (c.name as string) || '',
      currentTitle: (c.role as string) || '',
      location: (c.location as string) || '',
      skills: Array.isArray(c.skills) ? (c.skills as string[]) : [],
    }))
  );

  const scoredCandidates = candidateRecords.map((c, i) => ({
    ...c, ai_match_score: scores[i]?.score ?? null, ai_match_reason: scores[i]?.reason ?? null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('candidates').insert(scoredCandidates).select('id');

  if (insertError) console.error('[trigger-sourcing] Insert error:', JSON.stringify(insertError));
  const created  = insertError ? 0 : (inserted || []).length;
  const newCount = currentCount + created;
  const maxedOut = newCount >= JOB_CAP;

  // Update job
  await supabase.from('jobs').update({
    sourcing_status: 'completed',
    sourcing_candidates_count: newCount,
    sourcing_maxed_out: maxedOut,
    sourcing_pdl_scroll_token: nextScrollToken,
    sourcing_last_run_at: now.toISOString(),
    sourcing_error_message: null,
  }).eq('id', jobId);

  // Update sourcing_jobs with effective provider
  if (sourcingJobId) {
    await supabase.from('sourcing_jobs').update({
      status: 'completed',
      candidates_found: persons.length,
      candidates_created: created,
      sourcing_provider: effectiveProvider,
      completed_at: now.toISOString(),
    }).eq('id', sourcingJobId);
  }

  // Update monthly workspace credits (paid workspaces only)
  if (!isFreeAccess) {
    const newTotal      = creditsUsed + created;
    const percentUsed   = (newTotal / creditsMonthly) * 100;

    if (percentUsed >= 50 && !notifsSent['50']) {
      await supabase.from('notifications').insert({
        workspace_id: workspaceId, type: 'sourcing_credits',
        title: 'Sourcing credits at 50%',
        message: `Your workspace has used ${newTotal} of ${creditsMonthly} sourcing credits this month.`,
        metadata: { job_id: jobId }, created_at: now.toISOString(), read: false,
      }).catch(() => {});
      notifsSent['50'] = true;
    }
    if (percentUsed >= 80 && !notifsSent['80']) {
      await supabase.from('notifications').insert({
        workspace_id: workspaceId, type: 'sourcing_credits',
        title: 'Sourcing credits at 80%',
        message: `Your workspace has used ${newTotal} of ${creditsMonthly} sourcing credits this month. At this rate you will run out before the month ends.`,
        metadata: { job_id: jobId }, created_at: now.toISOString(), read: false,
      }).catch(() => {});
      notifsSent['80'] = true;
    }
    if (percentUsed >= 100 && !notifsSent['100']) {
      await supabase.from('notifications').insert({
        workspace_id: workspaceId, type: 'sourcing_credits',
        title: 'Monthly sourcing credits exhausted',
        message: `Your workspace has used all ${creditsMonthly} sourcing credits for this month. Sourcing resumes on the 1st of next month. Contact us at team@coreflowhr.com if you need more.`,
        metadata: { job_id: jobId }, created_at: now.toISOString(), read: false,
      }).catch(() => {});
      notifsSent['100'] = true;
    }

    await supabase.from('workspaces').update({
      sourcing_credits_used_this_month: newTotal,
      sourcing_notifications_sent: notifsSent,
    }).eq('id', workspaceId).catch(() => {});
  }

  // Completion notification
  const message = maxedOut
    ? `Sourcing complete for "${job.title}" — reached the ${JOB_CAP}-candidate cap. ${created} candidate${created !== 1 ? 's' : ''} added.`
    : `Sourcing complete for "${job.title}" — ${created} new candidate${created !== 1 ? 's' : ''} added.`;

  await supabase.from('notifications').insert({
    workspace_id: workspaceId, type: 'sourcing_complete',
    title: 'Sourcing complete', message,
    metadata: { job_id: jobId, candidates_created: created, maxed_out: maxedOut },
    created_at: now.toISOString(), read: false,
  }).catch(() => {});

  // Slack notification
  const { data: wsSlack } = await supabase
    .from('workspaces').select('slack_webhook_url').eq('id', workspaceId).maybeSingle();
  const slackWebhook = (wsSlack as any)?.slack_webhook_url;
  if (slackWebhook) {
    const slackBlocks = [
      { type: 'section', text: { type: 'mrkdwn', text: `🔍 AI sourcing complete for *${job.title}* — *${created}* candidate${created !== 1 ? 's' : ''} found` } },
      { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Pipeline', emoji: true }, url: `https://www.coreflowhr.com/candidates?job=${jobId}` }] },
    ];
    await supabase.functions.invoke('notify-slack', {
      body: { webhookUrl: slackWebhook, text: `Sourcing complete for "${job.title}"`, blocks: slackBlocks },
    }).catch(() => {});
  }

  return { candidates_found: persons.length, candidates_created: created, maxed_out: maxedOut };
}
