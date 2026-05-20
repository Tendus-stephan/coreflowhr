/**
 * Direct Supabase API helpers for seeding and cleaning test data.
 * Uses the service-role key so RLS is bypassed for setup/teardown.
 * Never call these from production code — test context only.
 */
import { createClient } from '@supabase/supabase-js';
import { TEST_CLIENT, TEST_JOB, TEST_CANDIDATES, TEST_WORKSPACE } from '../fixtures/test-data';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E data helpers.'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SeedResult {
  workspaceId: string;
  clientId: string;
  jobId: string;
  candidateId: string;
}

/** Create a workspace owned by the given user id. */
export async function createTestWorkspace(ownerId: string): Promise<string> {
  const admin = getAdminClient();
  const slug = `qa-${Date.now()}`;
  const { data, error } = await admin
    .from('workspaces')
    .insert({ name: TEST_WORKSPACE.name, slug, created_by: ownerId })
    .select('id')
    .single();
  if (error) throw new Error(`createTestWorkspace: ${error.message}`);
  return data.id;
}

/** Create a client record inside a workspace. */
export async function createTestClient(workspaceId: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('clients')
    .insert({
      name: TEST_CLIENT.name,
      workspace_id: workspaceId,
      contact_email: TEST_CLIENT.contactEmail,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createTestClient: ${error.message}`);
  return data.id;
}

/** Create a job under a workspace (optionally linked to a client). */
export async function createTestJob(workspaceId: string, clientId?: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('jobs')
    .insert({
      title: TEST_JOB.title,
      department: TEST_JOB.department,
      location: TEST_JOB.location,
      type: TEST_JOB.type,
      status: 'Active',
      workspace_id: workspaceId,
      client_id: clientId ?? null,
      description: TEST_JOB.description,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createTestJob: ${error.message}`);
  return data.id;
}

/** Create a candidate record linked to a job. */
export async function createTestCandidate(jobId: string, workspaceId: string): Promise<string> {
  const admin = getAdminClient();
  const cand = TEST_CANDIDATES.primary;
  const { data, error } = await admin
    .from('candidates')
    .insert({
      name: cand.name,
      email: cand.email,
      phone: cand.phone,
      job_id: jobId,
      workspace_id: workspaceId,
      stage: 'Screening',
    })
    .select('id')
    .single();
  if (error) throw new Error(`createTestCandidate: ${error.message}`);
  return data.id;
}

/** Seed the minimum data set required for most E2E tests. */
export async function seedMinimalData(ownerId: string): Promise<SeedResult> {
  const workspaceId = await createTestWorkspace(ownerId);
  const clientId = await createTestClient(workspaceId);
  const jobId = await createTestJob(workspaceId, clientId);
  const candidateId = await createTestCandidate(jobId, workspaceId);
  return { workspaceId, clientId, jobId, candidateId };
}

/** Delete all test records created during the run. */
export async function cleanupTestData(workspaceId: string): Promise<void> {
  const admin = getAdminClient();
  // Cascade delete: candidates → jobs → clients → workspace members → workspace
  await admin.from('candidates').delete().eq('workspace_id', workspaceId);
  await admin.from('jobs').delete().eq('workspace_id', workspaceId);
  await admin.from('clients').delete().eq('workspace_id', workspaceId);
  await admin.from('workspace_members').delete().eq('workspace_id', workspaceId);
  await admin.from('workspaces').delete().eq('id', workspaceId);
}
