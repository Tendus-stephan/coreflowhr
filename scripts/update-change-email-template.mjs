#!/usr/bin/env node
/**
 * Updates the Supabase Auth "Change email address" template via Management API.
 * Requires: SUPABASE_ACCESS_TOKEN (personal access token from https://supabase.com/dashboard/account/tokens)
 *   - Set in .env.local as SUPABASE_ACCESS_TOKEN=... or pass when running.
 * Optional: PROJECT_REF (default: lpjyxpxkagctaibmqcoi)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root so SUPABASE_ACCESS_TOKEN can be set there
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: join(__dirname, '..', '.env.local') });
} catch (_) {}

const PROJECT_REF = process.env.PROJECT_REF || process.env.VITE_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '') || 'lpjyxpxkagctaibmqcoi';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Get a personal access token from:');
  console.error('  https://supabase.com/dashboard/account/tokens');
  console.error('Then run: SUPABASE_ACCESS_TOKEN=<your-token> node scripts/update-change-email-template.mjs');
  process.exit(1);
}

const templatePath = join(__dirname, '..', 'supabase', 'email-templates', 'change-email.html');
let html;
try {
  html = readFileSync(templatePath, 'utf8');
} catch (e) {
  console.error('Failed to read template:', templatePath, e.message);
  process.exit(1);
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const body = {
  mailer_subjects_email_change: 'Confirm email change',
  mailer_templates_email_change_content: html,
};

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  console.error('API error', res.status, res.statusText, text);
  process.exit(1);
}

console.log('Change email template updated successfully on Supabase.');
