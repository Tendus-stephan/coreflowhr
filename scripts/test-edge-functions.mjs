#!/usr/bin/env node
/**
 * Test Edge Functions one by one.
 * Usage:
 *   node scripts/test-edge-functions.mjs
 *   node scripts/test-edge-functions.mjs --local
 *
 * Loads VITE_SUPABASE_URL from .env.local or .env. For auth-required functions
 * pass a JWT via SUPABASE_JWT env var (optional); otherwise those show 401 (expected).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const name of candidates) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
    return env;
  }
  return {};
}

const env = loadEnv();
const baseUrl = process.argv.includes('--local')
  ? 'http://localhost:54321/functions/v1'
  : (env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1';
const jwt = process.env.SUPABASE_JWT || env.SUPABASE_JWT || '';

if (!baseUrl || baseUrl === '/functions/v1') {
  console.error('Set VITE_SUPABASE_URL in .env.local (e.g. https://xxx.supabase.co) or run with --local after supabase functions serve.');
  process.exit(1);
}

const authHeader = jwt ? { Authorization: `Bearer ${jwt}` } : {};

const tests = [
  {
    name: 'send-weekly-digest',
    method: 'POST',
    body: {},
    headers: { 'Content-Type': 'application/json' },
    expectStatus: [200],
    expectBody: (r) => r.ok === true,
  },
  {
    name: 'get-billing-details',
    method: 'POST',
    body: {},
    headers: { 'Content-Type': 'application/json', ...authHeader },
    expectStatus: [200, 401],
  },
  {
    name: 'get-invoices',
    method: 'POST',
    body: {},
    headers: { 'Content-Type': 'application/json', ...authHeader },
    expectStatus: [200, 401],
  },
  {
    name: 'create-portal-session',
    method: 'POST',
    body: {},
    headers: { 'Content-Type': 'application/json', ...authHeader },
    expectStatus: [200, 401, 500],
  },
  {
    name: 'send-email',
    method: 'POST',
    body: { to: 'test@example.com', subject: 'Test', content: 'Test body' },
    headers: { 'Content-Type': 'application/json' },
    expectStatus: [200, 400, 429, 500],
  },
  {
    name: 'parse-cv',
    method: 'POST',
    body: { cvText: 'John Doe\nSoftware Engineer' },
    headers: { 'Content-Type': 'application/json' },
    expectStatus: [200, 400, 500],
  },
  {
    name: 'scrape-candidates',
    method: 'POST',
    body: { jobId: '00000000-0000-0000-0000-000000000000' },
    headers: { 'Content-Type': 'application/json', ...authHeader },
    expectStatus: [200, 400, 401, 402, 500],
  },
];

async function runOne(test) {
  const url = `${baseUrl}/${test.name}`;
  try {
    const res = await fetch(url, {
      method: test.method,
      headers: test.headers,
      body: ['POST', 'PUT', 'PATCH'].includes(test.method) && Object.keys(test.body).length
        ? JSON.stringify(test.body)
        : undefined,
    });
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {}

    const statusOk = test.expectStatus.includes(res.status);
    const bodyOk = !test.expectBody || test.expectBody(data);
    const pass = statusOk && bodyOk;

    return {
      name: test.name,
      status: res.status,
      pass,
      statusOk,
      bodyOk: test.expectBody ? bodyOk : true,
      data: data || text?.slice(0, 120),
    };
  } catch (err) {
    return {
      name: test.name,
      status: null,
      pass: false,
      error: err.message,
    };
  }
}

async function main() {
  console.log('Base URL:', baseUrl);
  console.log('JWT set:', !!jwt);
  console.log('');

  for (const test of tests) {
    const result = await runOne(test);
    const icon = result.pass ? '✓' : '✗';
    const status = result.status != null ? result.status : result.error;
    console.log(`${icon} ${result.name}: ${status}`);
    if (!result.pass && result.data && typeof result.data === 'object') {
      console.log('   ', JSON.stringify(result.data).slice(0, 100));
    }
    if (result.error) {
      console.log('   ', result.error);
    }
  }
}

main().catch(console.error);
