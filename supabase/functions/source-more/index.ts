/**
 * source-more Edge Function
 *
 * Called when the user clicks "Source More" on a job that has been sourced before.
 * Fetches the next batch from PDL starting at the current pdl_offset.
 * Accepts: POST { job_id: string, workspace_id: string }
 * Auth: anon JWT (workspace member required).
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const pdlApiKey = Deno.env.get('PDL_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!pdlApiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'PDL_API_KEY not configured' }), {
        status: 400,
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

    // Verify caller is a workspace member
    const authHeader = req.headers.get('authorization') || '';
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: membership } = await anonClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized for this workspace' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only Admin and Recruiter can trigger sourcing
    if (!['Admin', 'Recruiter'].includes(membership.role)) {
      return new Response(JSON.stringify({ ok: false, error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invoke trigger-sourcing with 'manual' trigger type using service-role client
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Inline the same runSourcing logic via internal function call
    const result = await callTriggerSourcing(supabaseUrl, serviceRoleKey, {
      job_id,
      workspace_id,
      trigger_type: 'manual',
      pdl_api_key: pdlApiKey,
      anthropic_api_key: anthropicApiKey,
    }, serviceClient);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[source-more] Unhandled error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const PDL_API_URL = 'https://api.peopledatalabs.com/v5/person/search';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

function getSourcingCap(isFreeAccess: boolean): number {
  return isFreeAccess ? 30 : 100;
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
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return { score: 0, reason: '' };

    const json = await res.json();
    const text: string = json?.content?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
      reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    };
  } catch {
    return { score: 0, reason: '' };
  }
}

// deno-lint-ignore no-explicit-any
async function callTriggerSourcing(
  _supabaseUrl: string,
  _serviceRoleKey: string,
  params: { job_id: string; workspace_id: string; trigger_type: string; pdl_api_key: string; anthropic_api_key: string | undefined },
  // deno-lint-ignore no-explicit-any
  supabase: any
) {
  const { job_id: jobId, workspace_id: workspaceId, trigger_type: triggerType, pdl_api_key: pdlApiKey, anthropic_api_key: anthropicApiKey } = params;

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, description, location, skills, sourcing_candidates_count, sourcing_pdl_offset')
    .eq('id', jobId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!job) return { candidates_found: 0, candidates_created: 0, error: 'Job not found' };

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, subscription_status, is_free_access, free_access_expires_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!workspace) return { candidates_found: 0, candidates_created: 0, error: 'Workspace not found' };

  const isFreeAccess = workspace.is_free_access === true;
  if (isFreeAccess && workspace.free_access_expires_at && new Date(workspace.free_access_expires_at) < new Date()) {
    return { candidates_found: 0, candidates_created: 0, error: 'Design partner access expired' };
  }

  const subStatus = (workspace.subscription_status || '').toLowerCase();
  if (!isFreeAccess && subStatus !== 'active') {
    return { candidates_found: 0, candidates_created: 0, error: 'No active subscription' };
  }

  const cap = getSourcingCap(isFreeAccess);
  const currentCount: number = job.sourcing_candidates_count || 0;
  if (currentCount >= cap) {
    await supabase.from('jobs').update({ sourcing_status: 'completed', sourcing_maxed_out: true }).eq('id', jobId);
    return { candidates_found: 0, candidates_created: 0, maxed_out: true };
  }

  const batchSize = Math.min(cap - currentCount, 20);
  const pdlOffset: number = job.sourcing_pdl_offset || 0;

  const { data: sourcingJobRow } = await supabase
    .from('sourcing_jobs')
    .insert({
      job_id: jobId,
      workspace_id: workspaceId,
      trigger_type: triggerType,
      status: 'running',
      candidates_requested: batchSize,
      pdl_offset_start: pdlOffset,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const sourcingJobId = sourcingJobRow?.id;
  await supabase.from('jobs').update({ sourcing_status: 'running' }).eq('id', jobId);

  // Search PDL
  const pdlBody = {
    query: {
      bool: {
        must: [{ match: { job_title: job.title || '' } }],
        should: [
          { term: { location_locality: (job.location || '').toLowerCase() } },
          { term: { location_country: (job.location || '').toLowerCase() } },
          ...(Array.isArray(job.skills) ? job.skills : []).map((s: string) => ({ term: { skills: s.toLowerCase() } })),
        ],
        minimum_should_match: 1,
      },
    },
    size: batchSize,
    from: pdlOffset,
  };

  const pdlRes = await fetch(PDL_API_URL, {
    method: 'POST',
    headers: { 'X-Api-Key': pdlApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(pdlBody),
  });

  const pdlJson = pdlRes.ok ? await pdlRes.json() : { data: [] };
  const persons: Record<string, unknown>[] = pdlJson.data || [];

  // Dedup
  const { data: existingLinkedIn } = await supabase.from('candidates').select('linkedin_url').eq('job_id', jobId).not('linkedin_url', 'is', null);
  const { data: existingPdlIds } = await supabase.from('candidates').select('pdl_id').eq('job_id', jobId).not('pdl_id', 'is', null);

  const linkedInSet = new Set((existingLinkedIn || []).map((r: { linkedin_url: string }) => r.linkedin_url));
  const pdlIdSet = new Set((existingPdlIds || []).map((r: { pdl_id: string }) => r.pdl_id));

  const newPersons = persons.filter((p) => {
    if (p.linkedin_url && linkedInSet.has(p.linkedin_url)) return false;
    if (p.id && pdlIdSet.has(p.id)) return false;
    return true;
  });

  const newOffset = pdlOffset + batchSize;

  if (newPersons.length === 0) {
    await supabase.from('jobs').update({ sourcing_status: 'completed', sourcing_pdl_offset: newOffset, sourcing_last_run_at: new Date().toISOString() }).eq('id', jobId);
    if (sourcingJobId) await supabase.from('sourcing_jobs').update({ status: 'completed', candidates_found: persons.length, candidates_created: 0, pdl_offset_end: newOffset, completed_at: new Date().toISOString() }).eq('id', sourcingJobId);
    return { candidates_found: persons.length, candidates_created: 0, maxed_out: false };
  }

  // Map candidates
  const candidateRecords = newPersons.map((p) => {
    const locality = (p.job_company_location_locality as string) || '';
    const country = (p.job_company_location_country as string) || '';
    const location = locality && country ? `${locality}, ${country}` : locality || country || (p.location_name as string) || '';
    return {
      job_id: jobId,
      workspace_id: workspaceId,
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      email: p.work_email || (Array.isArray(p.personal_emails) ? p.personal_emails[0] : null) || null,
      linkedin_url: p.linkedin_url || null,
      current_job_title: p.job_title || null,
      current_company: p.job_company_name || null,
      location,
      profile_picture_url: p.profile_pic_url || null,
      skills: Array.isArray(p.skills) ? p.skills : [],
      experience: Array.isArray(p.experience) ? p.experience : [],
      education: Array.isArray(p.education) ? p.education : [],
      pdl_id: p.id || null,
      source: 'Sourced',
      sourced_at: new Date().toISOString(),
      stage: 'New',
      applied_date: new Date().toISOString(),
    };
  });

  // AI score
  const scores = await Promise.all(
    candidateRecords.map((c) => scoreCandidate(anthropicApiKey, { title: job.title || '', description: job.description || '', location: job.location || '', skills: Array.isArray(job.skills) ? job.skills : [] }, { fullName: c.name, currentTitle: c.current_job_title || '', location: c.location, skills: Array.isArray(c.skills) ? c.skills : [] }))
  );

  const scoredCandidates = candidateRecords.map((c, i) => ({ ...c, ai_match_score: scores[i]?.score ?? null, ai_match_reason: scores[i]?.reason ?? null }));

  const { data: inserted, error: insertError } = await supabase.from('candidates').insert(scoredCandidates).select('id');
  const created = insertError ? 0 : (inserted || []).length;
  const newCount = currentCount + created;
  const maxedOut = newCount >= cap;

  await supabase.from('jobs').update({ sourcing_status: 'completed', sourcing_candidates_count: newCount, sourcing_maxed_out: maxedOut, sourcing_pdl_offset: newOffset, sourcing_last_run_at: new Date().toISOString(), sourcing_error_message: null }).eq('id', jobId);

  if (sourcingJobId) {
    await supabase.from('sourcing_jobs').update({ status: 'completed', candidates_found: persons.length, candidates_created: created, pdl_offset_end: newOffset, completed_at: new Date().toISOString() }).eq('id', sourcingJobId);
  }

  const message = maxedOut
    ? `Sourcing complete for "${job.title}" — reached the sourcing cap. ${created} candidate${created !== 1 ? 's' : ''} added.`
    : `Sourcing complete for "${job.title}" — ${created} new candidate${created !== 1 ? 's' : ''} added.`;

  await supabase.from('notifications').insert({ workspace_id: workspaceId, type: 'sourcing_complete', title: 'Sourcing complete', message, metadata: { job_id: jobId, candidates_created: created, maxed_out: maxedOut }, created_at: new Date().toISOString(), read: false }).catch(() => {});

  return { candidates_found: persons.length, candidates_created: created, maxed_out: maxedOut };
}
