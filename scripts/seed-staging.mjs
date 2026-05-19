#!/usr/bin/env node
/**
 * seed-staging.mjs — populates a staging Supabase DB with realistic test data.
 *
 * Usage:
 *   1. Add staging values to .env.local:
 *        VITE_SUPABASE_URL=https://<STAGING_REF>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<STAGING_SERVICE_ROLE_KEY>
 *   2. npm run db:seed
 *
 * Safety: refuses to run against the production project ref.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ─────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = resolve(__dirname, '../.env.local');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn('⚠️  .env.local not found — relying on process.env');
  }
}

loadEnvLocal();

const PROD_REF = 'lpjyxpxkagctaibmqcoi';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Safety check ─────────────────────────────────────────────────────────────
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

if (SUPABASE_URL.includes(PROD_REF)) {
  console.error('❌  Refusing to seed — URL points to the PRODUCTION project.');
  console.error('   Set staging values in .env.local before running db:seed.');
  process.exit(1);
}

console.log(`🌱  Seeding staging DB: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Seed data definitions ────────────────────────────────────────────────────
const SEED_EMAIL = 'admin@staging.coreflowhr.com';
const SEED_WORKSPACE_NAME = 'Acme Corp';

async function seedAll() {
  // 1. Check if already seeded
  const { data: existingWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('name', SEED_WORKSPACE_NAME)
    .maybeSingle();

  if (existingWorkspace) {
    console.log('✅  Seed data already exists — skipping (idempotent run).');
    console.log(`   Workspace: "${SEED_WORKSPACE_NAME}" (${existingWorkspace.id})`);
    return;
  }

  // 2. Create admin user via auth.users
  console.log('👤  Creating admin user...');
  const { data: userResp, error: userErr } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    password: 'Staging123!',
    email_confirm: true,
    user_metadata: { name: 'Alice Admin' },
  });
  if (userErr) throw new Error(`Failed to create auth user: ${userErr.message}`);
  const userId = userResp.user.id;
  console.log(`   User created: ${SEED_EMAIL} (${userId})`);

  // 3. Upsert profile
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    name: 'Alice Admin',
    role: 'Admin',
    job_title: 'Head of Talent',
  });
  if (profileErr) throw new Error(`Failed to upsert profile: ${profileErr.message}`);

  // 4. Create workspace with active subscription
  console.log('🏢  Creating workspace...');
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: SEED_WORKSPACE_NAME,
      created_by: userId,
      plan: 'professional',
      plan_status: 'active',
      is_free_access: true,
      free_access_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      esignature_limit: 50,
      cv_parse_limit: 100,
    })
    .select('id')
    .single();
  if (wsErr) throw new Error(`Failed to create workspace: ${wsErr.message}`);
  const workspaceId = workspace.id;

  // 5. Add admin as workspace member
  const { error: memberErr } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'Admin',
  });
  if (memberErr) throw new Error(`Failed to add workspace member: ${memberErr.message}`);

  // 6. Create clients
  console.log('🏭  Creating clients...');
  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .insert([
      {
        user_id: userId,
        workspace_id: workspaceId,
        name: 'TechCorp',
        contact_email: 'hr@techcorp.example.com',
        notes: 'Fast-growing SaaS company. Mostly engineering roles.',
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        name: 'GrowthCo',
        contact_email: 'talent@growthco.example.com',
        notes: 'Marketing & sales focused startup.',
      },
    ])
    .select('id, name');
  if (clientsErr) throw new Error(`Failed to create clients: ${clientsErr.message}`);
  const [techcorp, growthco] = clients;

  // 7. Create jobs
  console.log('💼  Creating jobs...');
  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .insert([
      {
        user_id: userId,
        workspace_id: workspaceId,
        client_id: techcorp.id,
        title: 'Senior Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        status: 'Active',
        description: 'We are looking for a Senior Software Engineer to join our platform team.',
        salary_range: '$140,000 - $180,000',
        experience_level: 'Senior',
        remote: true,
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        client_id: techcorp.id,
        title: 'Product Manager',
        department: 'Product',
        location: 'San Francisco, CA',
        type: 'Full-time',
        status: 'Active',
        description: 'Drive product strategy and roadmap for our core platform.',
        salary_range: '$130,000 - $160,000',
        experience_level: 'Mid',
        remote: false,
        skills: ['Roadmapping', 'Agile', 'SQL', 'Figma'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        client_id: growthco.id,
        title: 'UX Designer',
        department: 'Design',
        location: 'Remote',
        type: 'Full-time',
        status: 'Active',
        description: 'Create intuitive experiences for our marketing platform.',
        salary_range: '$90,000 - $120,000',
        experience_level: 'Mid',
        remote: true,
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      },
    ])
    .select('id, title');
  if (jobsErr) throw new Error(`Failed to create jobs: ${jobsErr.message}`);
  const [sweJob, pmJob, designJob] = jobs;

  // 8. Create candidates across pipeline stages
  console.log('👥  Creating candidates...');
  const { data: candidates, error: candErr } = await supabase
    .from('candidates')
    .insert([
      {
        user_id: userId,
        workspace_id: workspaceId,
        job_id: sweJob.id,
        name: 'Bob Builder',
        email: 'bob.builder@example.com',
        role: 'Senior Software Engineer',
        stage: 'Screening',
        location: 'Austin, TX',
        resume_summary: '8 years of full-stack experience. Strong TypeScript and React background.',
        ai_match_score: 87,
        experience: 8,
        skills: ['TypeScript', 'React', 'Node.js', 'AWS'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        job_id: sweJob.id,
        name: 'Carol Chen',
        email: 'carol.chen@example.com',
        role: 'Software Engineer',
        stage: 'Interview',
        location: 'Remote',
        resume_summary: 'Full-stack engineer with 5 years at two SaaS companies.',
        ai_match_score: 74,
        experience: 5,
        skills: ['JavaScript', 'Vue.js', 'Python', 'PostgreSQL'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        job_id: pmJob.id,
        name: 'David Park',
        email: 'david.park@example.com',
        role: 'Product Manager',
        stage: 'Offer',
        location: 'San Francisco, CA',
        resume_summary: 'PM with 6 years at B2B SaaS companies. Led 0→1 products.',
        ai_match_score: 91,
        experience: 6,
        skills: ['Product Strategy', 'Roadmapping', 'SQL', 'Agile'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        job_id: designJob.id,
        name: 'Eva Martinez',
        email: 'eva.martinez@example.com',
        role: 'UX Designer',
        stage: 'Hired',
        location: 'Remote',
        resume_summary: 'Senior UX designer specialising in B2C and marketplace products.',
        ai_match_score: 88,
        experience: 7,
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      },
      {
        user_id: userId,
        workspace_id: workspaceId,
        job_id: sweJob.id,
        name: 'Frank O\'Brien',
        email: 'frank.obrien@example.com',
        role: 'Software Engineer',
        stage: 'New',
        location: 'Chicago, IL',
        resume_summary: 'Mid-level engineer transitioning from backend to full-stack.',
        ai_match_score: 62,
        experience: 3,
        skills: ['Python', 'Django', 'PostgreSQL'],
      },
    ])
    .select('id, name, stage');
  if (candErr) throw new Error(`Failed to create candidates: ${candErr.message}`);

  const davidCandidate = candidates.find(c => c.name === 'David Park');
  const evaCandidate = candidates.find(c => c.name === 'Eva Martinez');

  // 9. Create offers
  console.log('📋  Creating offers...');
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const { error: offersErr } = await supabase.from('offers').insert([
    {
      user_id: userId,
      workspace_id: workspaceId,
      candidate_id: davidCandidate.id,
      job_id: pmJob.id,
      position_title: 'Product Manager',
      start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      salary_amount: 145000,
      salary_currency: 'USD',
      salary_period: 'yearly',
      benefits: ['Health Insurance', '401k', 'Remote-friendly', 'Learning Budget'],
      status: 'sent',
      sent_at: new Date().toISOString(),
      expires_at: futureDate.toISOString(),
    },
    {
      user_id: userId,
      workspace_id: workspaceId,
      candidate_id: evaCandidate.id,
      job_id: designJob.id,
      position_title: 'UX Designer',
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      salary_amount: 110000,
      salary_currency: 'USD',
      salary_period: 'yearly',
      benefits: ['Health Insurance', '401k', 'Remote', 'Equipment Budget'],
      status: 'accepted',
      sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      responded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);
  if (offersErr) throw new Error(`Failed to create offers: ${offersErr.message}`);

  console.log('\n✅  Staging seed complete!');
  console.log(`   Workspace:  "${SEED_WORKSPACE_NAME}" (${workspaceId})`);
  console.log(`   Admin:      ${SEED_EMAIL} / password: Staging123!`);
  console.log(`   Clients:    TechCorp, GrowthCo`);
  console.log(`   Jobs:       ${jobs.map(j => j.title).join(', ')}`);
  console.log(`   Candidates: ${candidates.map(c => `${c.name} (${c.stage})`).join(', ')}`);
  console.log(`   Offers:     1 pending (David Park), 1 accepted (Eva Martinez)`);
  console.log('\n   Verify rows at: https://supabase.com/dashboard/project/<STAGING_REF>/editor');
}

seedAll().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
