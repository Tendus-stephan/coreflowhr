/**
 * trigger-sourcing Edge Function
 *
 * Called fire-and-forget after job creation to kick off PDL candidate sourcing.
 * Accepts: POST { job_id: string, workspace_id: string }
 * Auth: anon JWT (verified against workspace membership) OR service-role key.
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
    const pdlApiKey = Deno.env.get('PDL_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!pdlApiKey) {
      console.warn('[trigger-sourcing] PDL_API_KEY not set — sourcing disabled');
      return new Response(JSON.stringify({ ok: false, error: 'PDL_API_KEY not configured' }), {
        status: 200, // Return 200 so fire-and-forget caller doesn't error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { job_id, workspace_id } = body as { job_id?: string; workspace_id?: string };

    if (!job_id || !workspace_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing job_id or workspace_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller has access to this workspace
    const authHeader = req.headers.get('authorization') || '';
    const callerToken = authHeader.replace(/^bearer\s+/i, '');

    // Check if caller is service_role (decode JWT claims without verification)
    const isServiceRole = (() => {
      try {
        const payload = JSON.parse(atob(callerToken.split('.')[1]));
        return payload?.role === 'service_role';
      } catch { return false; }
    })();

    if (callerToken && !isServiceRole) {
      // Verify user belongs to workspace
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

    // Run sourcing with service-role client
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const result = await runSourcing(serviceClient, job_id, workspace_id, 'job_created', pdlApiKey, anthropicApiKey);

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
// Inline sourcing logic (avoids cross-function imports in Deno)
// ---------------------------------------------------------------------------

const PDL_API_URL = 'https://api.peopledatalabs.com/v5/person/search';
// Note: PDL v5 Person Search requires SQL-style queries via GET; pagination via scroll_token (not 'from').
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

function getSourcingCap(isFreeAccess: boolean): number {
  return isFreeAccess ? 30 : 100;
}

async function searchPdl(
  apiKey: string,
  jobTitle: string,
  _location: string,
  _skills: string[],
  size: number,
  scrollToken: string | null
): Promise<{ data: Record<string, unknown>[]; total: number; nextScrollToken: string | null; errorMessage?: string }> {
  // PDL v5 Person Search uses SQL-style queries; 'from' offset is no longer supported — use scroll_token.
  // We use job_title as the primary (broad) filter and let AI scoring rank by relevance.
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
    try {
      const j = JSON.parse(responseText);
      errorMsg = (j?.error?.message as string) || errorMsg;
    } catch { /* ignore */ }
    console.error('[PDL] Search failed:', errorMsg);
    return { data: [], total: 0, nextScrollToken: null, errorMessage: errorMsg };
  }

  const json = JSON.parse(responseText);
  console.log('[PDL] HTTP 200 | total:', json.total, '| returned:', (json.data || []).length);
  return { data: json.data || [], total: json.total || 0, nextScrollToken: json.scroll_token || null };
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
async function runSourcing(supabase: any, jobId: string, workspaceId: string, triggerType: string, pdlApiKey: string, anthropicApiKey: string | undefined) {
  // Fetch job
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, description, location, skills, sourcing_candidates_count, sourcing_pdl_offset, sourcing_pdl_scroll_token, user_id')
    .eq('id', jobId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!job) return { candidates_found: 0, candidates_created: 0, error: 'Job not found' };

  // Fetch workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, is_free_access, free_access_expires_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) console.error('[trigger-sourcing] workspace query error:', JSON.stringify(wsError));
  if (!workspace) return { candidates_found: 0, candidates_created: 0, error: 'Workspace not found: ' + (wsError?.message || 'no row') };

  const isFreeAccess = workspace.is_free_access === true;

  if (isFreeAccess && workspace.free_access_expires_at) {
    if (new Date(workspace.free_access_expires_at) < new Date()) {
      return { candidates_found: 0, candidates_created: 0, error: 'Design partner access expired' };
    }
  }

  // Check subscription via user_settings if not on free access
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

  const cap = getSourcingCap(isFreeAccess);
  const currentCount: number = job.sourcing_candidates_count || 0;

  if (currentCount >= cap) {
    await supabase.from('jobs').update({ sourcing_status: 'completed', sourcing_maxed_out: true }).eq('id', jobId);
    return { candidates_found: 0, candidates_created: 0, maxed_out: true };
  }

  const remaining = cap - currentCount;
  const batchSize = Math.min(remaining, 20);
  const pdlScrollToken: string | null = job.sourcing_pdl_scroll_token || null;

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
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const sourcingJobId = sourcingJobRow?.id;

  await supabase.from('jobs').update({ sourcing_status: 'running' }).eq('id', jobId);

  // Search PDL (SQL-style, scroll_token for pagination)
  const pdlResult = await searchPdl(
    pdlApiKey,
    job.title || '',
    job.location || '',
    Array.isArray(job.skills) ? job.skills : [],
    batchSize,
    pdlScrollToken
  );

  const persons = pdlResult.data || [];
  const nextScrollToken = pdlResult.nextScrollToken;

  // If PDL returned an error, mark the job as failed and surface the message
  if (pdlResult.errorMessage) {
    await supabase.from('jobs').update({
      sourcing_status: 'failed',
      sourcing_error_message: pdlResult.errorMessage,
    }).eq('id', jobId);
    if (sourcingJobId) {
      await supabase.from('sourcing_jobs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      }).eq('id', sourcingJobId);
    }
    return { candidates_found: 0, candidates_created: 0, error: pdlResult.errorMessage };
  }

  // Cache PDL results
  if (persons.length > 0) {
    const cacheRecords = persons
      .filter((p: Record<string, unknown>) => p.linkedin_url || p.id)
      .map((p: Record<string, unknown>) => ({
        linkedin_url: p.linkedin_url || null,
        pdl_id: p.id || null,
        full_name: p.full_name || null,
        current_job_title: p.job_title || null,
        current_company: p.job_company_name || null,
        location: p.location_name || null,
        email: p.work_email || (Array.isArray(p.personal_emails) ? p.personal_emails[0] : null) || null,
        skills: p.skills || [],
        experience: p.experience || [],
        education: p.education || [],
        raw_pdl_data: p,
        last_updated_at: new Date().toISOString(),
      }));

    if (cacheRecords.length > 0) {
      await supabase
        .from('sourcing_cache')
        .upsert(cacheRecords, { onConflict: 'linkedin_url', ignoreDuplicates: false });
    }
  }

  // Dedup
  const { data: existingLinkedIn } = await supabase
    .from('candidates')
    .select('linkedin_url')
    .eq('job_id', jobId)
    .not('linkedin_url', 'is', null);

  const { data: existingPdlIds } = await supabase
    .from('candidates')
    .select('pdl_id')
    .eq('job_id', jobId)
    .not('pdl_id', 'is', null);

  const linkedInSet = new Set((existingLinkedIn || []).map((r: { linkedin_url: string }) => r.linkedin_url));
  const pdlIdSet = new Set((existingPdlIds || []).map((r: { pdl_id: string }) => r.pdl_id));

  const newPersons = persons.filter((p: Record<string, unknown>) => {
    if (p.linkedin_url && linkedInSet.has(p.linkedin_url)) return false;
    if (p.id && pdlIdSet.has(p.id)) return false;
    return true;
  });

  if (newPersons.length === 0) {
    await supabase.from('jobs').update({
      sourcing_status: 'completed',
      sourcing_pdl_scroll_token: nextScrollToken,
      sourcing_last_run_at: new Date().toISOString(),
    }).eq('id', jobId);

    if (sourcingJobId) {
      await supabase.from('sourcing_jobs').update({
        status: 'completed',
        candidates_found: persons.length,
        candidates_created: 0,
        completed_at: new Date().toISOString(),
      }).eq('id', sourcingJobId);
    }

    return { candidates_found: persons.length, candidates_created: 0, maxed_out: false };
  }

  // Map to candidate records — field names must match the candidates table schema
  const candidateRecords = newPersons.map((p: Record<string, unknown>) => {
    const locality = (p.location_locality as string) || (p.job_company_location_locality as string) || '';
    const country = (p.location_country as string) || (p.job_company_location_country as string) || '';
    const location = locality && country ? `${locality}, ${country}` : locality || country || (p.location_name as string) || '';
    return {
      job_id: jobId,
      workspace_id: workspaceId,
      user_id: job.user_id,
      name: (p.full_name as string) || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      email: (p.work_email as string) || (Array.isArray(p.personal_emails) ? (p.personal_emails as string[])[0] : null) || null,
      linkedin_url: (p.linkedin_url as string) || null,
      role: (p.job_title as string) || null,               // 'role' = current job title in candidates table
      current_company: (p.job_company_name as string) || null,
      location,
      profile_picture_url: (p.profile_pic_url as string) || null,
      skills: Array.isArray(p.skills) ? p.skills : [],
      work_experience: Array.isArray(p.experience) ? p.experience : [],  // JSONB column
      education: Array.isArray(p.education) ? p.education : [],          // JSONB column
      pdl_id: (p.id as string) || null,
      source: 'Sourced',
      sourced_at: new Date().toISOString(),
      stage: 'New',
      applied_date: new Date().toISOString(),
    };
  });

  // AI score all simultaneously
  const scores = await Promise.all(
    candidateRecords.map((c: Record<string, unknown>) =>
      scoreCandidate(anthropicApiKey, {
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        skills: Array.isArray(job.skills) ? job.skills : [],
      }, {
        fullName: (c.name as string) || '',
        currentTitle: (c.role as string) || '',
        location: (c.location as string) || '',
        skills: Array.isArray(c.skills) ? (c.skills as string[]) : [],
      })
    )
  );

  const scoredCandidates = candidateRecords.map((c: Record<string, unknown>, i: number) => ({
    ...c,
    ai_match_score: scores[i]?.score ?? null,
    ai_match_reason: scores[i]?.reason ?? null,
  }));

  // Bulk insert
  const { data: inserted, error: insertError } = await supabase
    .from('candidates')
    .insert(scoredCandidates)
    .select('id');

  if (insertError) console.error('[trigger-sourcing] Insert error:', JSON.stringify(insertError));
  const created = insertError ? 0 : (inserted || []).length;
  const newCount = currentCount + created;
  const maxedOut = newCount >= cap;

  // Update job — persist scroll_token for next "Source More" call
  await supabase.from('jobs').update({
    sourcing_status: 'completed',
    sourcing_candidates_count: newCount,
    sourcing_maxed_out: maxedOut,
    sourcing_pdl_scroll_token: nextScrollToken,
    sourcing_last_run_at: new Date().toISOString(),
    sourcing_error_message: null,
  }).eq('id', jobId);

  // Update sourcing_jobs
  if (sourcingJobId) {
    await supabase.from('sourcing_jobs').update({
      status: 'completed',
      candidates_found: persons.length,
      candidates_created: created,
      completed_at: new Date().toISOString(),
    }).eq('id', sourcingJobId);
  }

  // Notification
  const message = maxedOut
    ? `Sourcing complete for "${job.title}" — reached the sourcing cap. ${created} candidate${created !== 1 ? 's' : ''} added.`
    : `Sourcing complete for "${job.title}" — ${created} new candidate${created !== 1 ? 's' : ''} added.`;

  try {
    await supabase.from('notifications').insert({
      workspace_id: workspaceId,
      type: 'sourcing_complete',
      title: 'Sourcing complete',
      message,
      metadata: { job_id: jobId, candidates_created: created, maxed_out: maxedOut },
      created_at: new Date().toISOString(),
      read: false,
    });
  } catch { /* non-critical */ }

  return { candidates_found: persons.length, candidates_created: created, maxed_out: maxedOut };
}
