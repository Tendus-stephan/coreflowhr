/**
 * test-sourcing-providers.mjs
 *
 * Side-by-side comparison of PDL vs ReachStream for the same job search.
 * Outputs a quality comparison table.
 *
 * Usage:
 *   node scripts/test-sourcing-providers.mjs [job_title] [location] [skills] [size]
 *
 * Example:
 *   node scripts/test-sourcing-providers.mjs "Software Engineer" "London, UK" "React,TypeScript" 15
 *
 * Required env vars (in .env or shell):
 *   PDL_API_KEY
 *   REACHSTREAM_API_KEY
 */

import 'dotenv/config';
import https from 'node:https';

const PDL_API_KEY        = process.env.PDL_API_KEY        || '';
const REACHSTREAM_API_KEY = process.env.REACHSTREAM_API_KEY || '';

const JOB_TITLE = process.argv[2] || 'Software Engineer';
const LOCATION  = process.argv[3] || 'London, UK';
const SKILLS    = process.argv[4] || 'JavaScript,React';
const SIZE      = parseInt(process.argv[5] || '15', 10);

// ─── Utility ──────────────────────────────────────────────────────────────────

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body, json: () => JSON.parse(body) });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── PDL Search ───────────────────────────────────────────────────────────────

async function searchPdl(jobTitle, location, skills) {
  if (!PDL_API_KEY) {
    console.warn('[PDL] PDL_API_KEY not set — skipping');
    return { candidates: [], durationMs: 0, error: 'No API key' };
  }

  const t0 = Date.now();

  // Build location SQL clause
  const locParts    = location.split(',').map((s) => s.trim());
  const city        = locParts[0] || '';
  const country     = locParts[1] || '';
  const skillList   = skills.split(',').map((s) => s.trim()).filter(Boolean);

  let locationSql = '';
  if (city && country)      locationSql = `job_company_location_name LIKE '%${city}%' OR location_country = '${country.toLowerCase()}'`;
  else if (city)            locationSql = `job_company_location_name LIKE '%${city}%'`;
  else if (country)         locationSql = `location_country = '${country.toLowerCase()}'`;

  const skillsSql = skillList.length
    ? skillList.map((s) => `'${s.toLowerCase()}' IN skills`).join(' OR ')
    : '';

  const clauses = [
    `job_title LIKE '%${jobTitle}%'`,
    locationSql,
    skillsSql,
  ].filter(Boolean);

  const sqlQuery = `SELECT * FROM person WHERE ${clauses.join(' AND ')} LIMIT ${SIZE};`;

  try {
    const res = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': PDL_API_KEY,
      },
      body: JSON.stringify({ sql: sqlQuery, size: SIZE, pretty: false }),
    });

    const data = res.json();
    const durationMs = Date.now() - t0;

    if (res.status !== 200) {
      return { candidates: [], durationMs, error: `HTTP ${res.status}: ${data?.error?.message || res.body}` };
    }

    const candidates = (data.data || []).map((p) => ({
      id:       p.id,
      name:     p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email:    (p.work_email || p.personal_emails?.[0] || ''),
      linkedin: p.linkedin_url || '',
      title:    p.job_title || '',
      company:  p.job_company_name || '',
      city:     p.job_company_location_locality || p.location_locality || '',
      country:  p.job_company_location_country || p.location_country || '',
      skills:   (p.skills || []).slice(0, 5),
      hasEmail: !!(p.work_email || p.personal_emails?.[0]),
      hasLinkedIn: !!p.linkedin_url,
    }));

    return { candidates, durationMs, error: null, total: data.total };
  } catch (err) {
    return { candidates: [], durationMs: Date.now() - t0, error: String(err) };
  }
}

// ─── ReachStream Search ────────────────────────────────────────────────────────

async function searchReachStream(jobTitle, location, skills) {
  if (!REACHSTREAM_API_KEY) {
    console.warn('[ReachStream] REACHSTREAM_API_KEY not set — skipping');
    return { candidates: [], durationMs: 0, error: 'No API key' };
  }

  const t0 = Date.now();

  const locParts  = location.split(',').map((s) => s.trim());
  const city      = locParts[0] || '';
  const country   = locParts[1] || '';
  const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);

  // Build filter object with numbered string keys
  const filterEntries = [];
  if (jobTitle)  filterEntries.push(['contact_job_title_1', jobTitle]);
  if (city)      filterEntries.push(['company_address_city', city]);
  if (country)   filterEntries.push(['company_address_country', country]);
  if (skillList.length) filterEntries.push(['tech_keywords', skillList.join(',')]);

  const filter = {};
  filterEntries.forEach(([key, val], i) => {
    filter[String(i * 2)]     = key;
    filter[String(i * 2 + 1)] = val;
  });

  try {
    // Step 1 — initiate async search
    const initRes = await fetch('https://api-prd.reachstream.com/api/v2/async/records/filter/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': REACHSTREAM_API_KEY,
      },
      body: JSON.stringify({ filter, fetchCount: SIZE }),
    });

    if (initRes.status !== 200 && initRes.status !== 201 && initRes.status !== 202) {
      return { candidates: [], durationMs: Date.now() - t0, error: `Init HTTP ${initRes.status}: ${initRes.body}` };
    }

    const initData = initRes.json();
    const batchId  = initData?.batch_process_id || initData?.id;

    if (!batchId) {
      return { candidates: [], durationMs: Date.now() - t0, error: `No batch_process_id in response: ${initRes.body}` };
    }

    // Step 2 — poll until READY
    const MAX_ATTEMPTS = 15;
    const POLL_MS      = 2000;
    let persons        = [];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await sleep(POLL_MS);
      const pollRes = await fetch(
        `https://api-prd.reachstream.com/api/v2/records/batch-process?batch_process_id=${batchId}`,
        {
          headers: { 'X-API-Key': REACHSTREAM_API_KEY },
        }
      );

      if (pollRes.status !== 200) continue;

      const pollData = pollRes.json();
      if (pollData?.status !== 'READY') continue;

      persons = Array.isArray(pollData.records) ? pollData.records : [];
      break;
    }

    const durationMs = Date.now() - t0;

    const candidates = persons.map((p) => ({
      id:       p.id || '',
      name:     p.contact_name || `${p.contact_first_name || ''} ${p.contact_last_name || ''}`.trim(),
      email:    p.contact_email_1 || '',
      linkedin: p.contact_social_linkedin || '',
      title:    p.contact_job_title_1 || '',
      company:  p.company_company_name || '',
      city:     p.contact_address_city || p.company_address_city || '',
      country:  p.contact_address_country || p.company_address_country || '',
      skills:   [],   // not in ReachStream response
      hasEmail: !!p.contact_email_1,
      hasLinkedIn: !!p.contact_social_linkedin,
    }));

    return { candidates, durationMs, error: null, total: persons.length };
  } catch (err) {
    return { candidates: [], durationMs: Date.now() - t0, error: String(err) };
  }
}

// ─── Quality Metrics ──────────────────────────────────────────────────────────

function computeMetrics(candidates) {
  const n = candidates.length;
  if (n === 0) return { n, emailRate: 0, linkedInRate: 0, avgSkills: 0 };
  const emailRate    = Math.round(candidates.filter((c) => c.hasEmail).length    / n * 100);
  const linkedInRate = Math.round(candidates.filter((c) => c.hasLinkedIn).length / n * 100);
  const avgSkills    = (candidates.reduce((s, c) => s + c.skills.length, 0) / n).toFixed(1);
  return { n, emailRate, linkedInRate, avgSkills };
}

// ─── Display ──────────────────────────────────────────────────────────────────

function printCandidateTable(candidates, label) {
  console.log(`\n── ${label} ──`);
  if (!candidates.length) {
    console.log('  (no candidates)');
    return;
  }
  console.log('  #  Name                        Title                        Company                    Email?  LinkedIn?');
  console.log('  ─'.repeat(110));
  candidates.forEach((c, i) => {
    const num     = String(i + 1).padStart(2);
    const name    = c.name.padEnd(27).slice(0, 27);
    const title   = c.title.padEnd(28).slice(0, 28);
    const company = c.company.padEnd(26).slice(0, 26);
    const email   = c.hasEmail    ? '  ✓  ' : '  ✗  ';
    const linkedin = c.hasLinkedIn ? '  ✓  ' : '  ✗  ';
    console.log(`  ${num} ${name}  ${title}  ${company}  ${email}  ${linkedin}`);
  });
}

function printComparison(pdlResult, rsResult) {
  const pdlM = computeMetrics(pdlResult.candidates);
  const rsM  = computeMetrics(rsResult.candidates);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           PROVIDER COMPARISON SUMMARY                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ Metric               PDL                  ReachStream        ║`);
  console.log('║──────────────────────────────────────────────────────────────║');

  const row = (label, pdl, rs) =>
    `║ ${label.padEnd(20)} ${String(pdl).padEnd(20)} ${String(rs).padEnd(18)} ║`;

  console.log(row('Candidates returned', pdlResult.error ? `ERROR` : pdlM.n, rsResult.error ? 'ERROR' : rsM.n));
  console.log(row('Email rate',       pdlResult.error ? '-' : `${pdlM.emailRate}%`,    rsResult.error ? '-' : `${rsM.emailRate}%`));
  console.log(row('LinkedIn rate',    pdlResult.error ? '-' : `${pdlM.linkedInRate}%`, rsResult.error ? '-' : `${rsM.linkedInRate}%`));
  console.log(row('Avg skills',       pdlResult.error ? '-' : pdlM.avgSkills,          rsResult.error ? '-' : rsM.avgSkills));
  console.log(row('Response time',    pdlResult.error ? '-' : `${pdlResult.durationMs}ms`, rsResult.error ? '-' : `${rsResult.durationMs}ms`));

  if (pdlResult.error)  console.log(`║ PDL error: ${String(pdlResult.error).slice(0, 50).padEnd(50)} ║`);
  if (rsResult.error)   console.log(`║ RS error:  ${String(rsResult.error).slice(0, 50).padEnd(50)} ║`);

  console.log('╚══════════════════════════════════════════════════════════════╝');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSourcing Provider Comparison`);
  console.log(`  Job title : ${JOB_TITLE}`);
  console.log(`  Location  : ${LOCATION}`);
  console.log(`  Skills    : ${SKILLS}`);
  console.log(`  Batch size: ${SIZE}`);
  console.log('\nRunning both providers in parallel...\n');

  const [pdlResult, rsResult] = await Promise.all([
    searchPdl(JOB_TITLE, LOCATION, SKILLS),
    searchReachStream(JOB_TITLE, LOCATION, SKILLS),
  ]);

  printCandidateTable(pdlResult.candidates, `PDL — ${pdlResult.durationMs}ms${pdlResult.error ? ` [ERROR: ${pdlResult.error}]` : ''}`);
  printCandidateTable(rsResult.candidates,  `ReachStream — ${rsResult.durationMs}ms${rsResult.error ? ` [ERROR: ${rsResult.error}]` : ''}`);
  printComparison(pdlResult, rsResult);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
