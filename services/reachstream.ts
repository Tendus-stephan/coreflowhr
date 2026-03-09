/**
 * ReachStream integration service.
 * Handles candidate search, mapping, and caching.
 *
 * ReachStream uses an async batch API:
 *   Step 1: POST /api/v2/async/records/filter/data  — initiates search, returns batch_process_id
 *   Step 2: GET  /api/v2/records/batch-process?batch_process_id=X — poll until status READY
 *
 * NOTE: This module is designed to run server-side only (Edge Functions / Node).
 * REACHSTREAM_API_KEY must NEVER be exposed to the browser.
 */

import { supabase } from './supabase';

const RS_FILTER_URL = 'https://api-prd.reachstream.com/api/v2/async/records/filter/data';
const RS_BATCH_URL  = 'https://api-prd.reachstream.com/api/v2/records/batch-process';

const POLL_INTERVAL_MS  = 2000;
const MAX_POLL_ATTEMPTS = 15; // 15 × 2s = 30s max wait

export interface ReachStreamPerson {
  id?: string | number;
  contact_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email_1?: string;
  contact_social_linkedin?: string;
  contact_job_title_1?: string;
  company_company_name?: string;
  contact_address_city?: string;
  contact_address_state?: string;
  contact_address_country?: string;
  [key: string]: unknown;
}

export interface SearchResult {
  data: ReachStreamPerson[];
  total: number;
}

/**
 * Search ReachStream for candidates matching the job criteria.
 * Uses the async batch flow: initiate → poll → return results.
 * Never throws — always returns gracefully.
 */
export async function searchCandidatesReachStream(
  job_title: string,
  location: string,
  skills: string[],
  size: number = 10,
  _offset: number = 0  // ReachStream does not support numeric offset; ignored
): Promise<SearchResult> {
  const apiKey = typeof process !== 'undefined'
    ? process.env.REACHSTREAM_API_KEY
    : undefined;

  if (!apiKey) {
    console.error('[ReachStream] REACHSTREAM_API_KEY not configured');
    return { data: [], total: 0 };
  }

  // Build filter object using ReachStream's numbered-key format
  const filter: Record<string, Record<string, string>> = {};

  if (job_title) {
    filter.job_title = { '0': job_title };
  }

  // ReachStream location filters against company address fields
  if (location) {
    // Try to split "City, Country" format; otherwise treat whole string as country
    const parts = location.split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      filter.company_address_city    = { '0': parts[0] };
      filter.company_address_country = { '0': parts[parts.length - 1] };
    } else {
      filter.company_address_country = { '0': location };
    }
  }

  // Skills → tech_keywords (closest ReachStream equivalent)
  if (skills.length > 0) {
    filter.tech_keywords = Object.fromEntries(
      skills.slice(0, 10).map((s, i) => [String(i), s])
    );
  }

  try {
    // Step 1: Initiate batch search
    const initRes = await fetch(RS_FILTER_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ fetchCount: size, filter }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => '');
      console.error(`[ReachStream] Initiate failed: ${initRes.status}`, errText);
      return { data: [], total: 0 };
    }

    const initJson = await initRes.json();
    const batchId: string | number | undefined =
      initJson?.batch_process_id ?? initJson?.data?.batch_process_id;

    if (!batchId) {
      console.error('[ReachStream] No batch_process_id in response:', JSON.stringify(initJson));
      return { data: [], total: 0 };
    }

    // Step 2: Poll until READY
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await fetch(`${RS_BATCH_URL}?batch_process_id=${batchId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!pollRes.ok) {
        const errText = await pollRes.text().catch(() => '');
        console.error(`[ReachStream] Poll failed: ${pollRes.status}`, errText);
        return { data: [], total: 0 };
      }

      const pollJson = await pollRes.json();
      const status: string = (pollJson?.status || pollJson?.record_status || '').toUpperCase();

      if (status === 'READY') {
        const records: ReachStreamPerson[] = pollJson?.data || pollJson?.records || [];
        const total: number = pollJson?.total_records ?? records.length;
        console.log(`[ReachStream] Batch ${batchId} READY | total: ${total} | returned: ${records.length}`);
        return { data: records, total };
      }

      if (status === 'INSUFFICIENT_BALANCE') {
        console.error('[ReachStream] Insufficient credits');
        return { data: [], total: 0 };
      }

      console.log(`[ReachStream] Batch ${batchId} status: ${status} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
    }

    console.error(`[ReachStream] Batch ${batchId} did not complete within ${MAX_POLL_ATTEMPTS} attempts`);
    return { data: [], total: 0 };
  } catch (err) {
    console.error('[ReachStream] Search request error:', err);
    return { data: [], total: 0 };
  }
}

/**
 * Map a ReachStream person object to a CoreflowHR candidate record.
 * Output format matches mapPdlPersonToCandidate exactly.
 */
export function mapReachStreamPersonToCandidate(person: ReachStreamPerson): Record<string, unknown> {
  const city    = person.contact_address_city    || '';
  const country = person.contact_address_country || '';
  const location = city && country
    ? `${city}, ${country}`
    : city || country || '';

  const firstName = person.contact_first_name || '';
  const lastName  = person.contact_last_name  || '';
  const fullName  = person.contact_name
    || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '');

  return {
    full_name:           fullName || null,
    first_name:          firstName || null,
    last_name:           lastName  || null,
    email:               person.contact_email_1        || null,
    linkedin_url:        person.contact_social_linkedin || null,
    current_job_title:   person.contact_job_title_1    || null,
    current_company:     person.company_company_name   || null,
    location,
    profile_picture_url: null, // Not provided by ReachStream API
    skills:              [],   // Not a structured field in ReachStream response
    experience:          [],   // Not a structured field in ReachStream response
    education:           [],   // Not a structured field in ReachStream response
    reachstream_id:      person.id != null ? String(person.id) : null,
    source:              'Sourced',
    sourced_at:          new Date().toISOString(),
  };
}

/**
 * Bulk upsert ReachStream person objects into the sourcing_cache table.
 * Uses linkedin_url as conflict key when available; falls back to insert-only
 * for records without linkedin_url (reachstream_id alone is not UNIQUE constrained).
 */
export async function saveReachStreamToCacheBulk(persons: ReachStreamPerson[]): Promise<void> {
  if (!persons.length) return;

  const withLinkedIn = persons.filter((p) => p.contact_social_linkedin);
  const withoutLinkedIn = persons.filter(
    (p) => !p.contact_social_linkedin && p.id != null
  );

  const mapToRecord = (p: ReachStreamPerson) => ({
    linkedin_url:        p.contact_social_linkedin || null,
    reachstream_id:      p.id != null ? String(p.id) : null,
    full_name:           p.contact_name
      || `${p.contact_first_name || ''} ${p.contact_last_name || ''}`.trim()
      || null,
    current_job_title:   p.contact_job_title_1  || null,
    current_company:     p.company_company_name || null,
    location:
      p.contact_address_city && p.contact_address_country
        ? `${p.contact_address_city}, ${p.contact_address_country}`
        : p.contact_address_city || p.contact_address_country || null,
    profile_picture_url: null,
    email:               p.contact_email_1 || null,
    skills:              [],
    experience:          [],
    education:           [],
    raw_pdl_data:        p, // reuse existing JSONB column for raw payload
    last_updated_at:     new Date().toISOString(),
  });

  // Upsert records that have linkedin_url (same conflict key as PDL)
  if (withLinkedIn.length > 0) {
    const records = withLinkedIn.map(mapToRecord);
    const { error } = await supabase
      .from('sourcing_cache')
      .upsert(records, { onConflict: 'linkedin_url', ignoreDuplicates: false });
    if (error) console.error('[ReachStream] Cache upsert (linkedin) error:', error);
  }

  // Insert records without linkedin_url — skip if reachstream_id already exists
  if (withoutLinkedIn.length > 0) {
    const records = withoutLinkedIn.map(mapToRecord);
    const { error } = await supabase
      .from('sourcing_cache')
      .insert(records);
    if (error && !error.message?.includes('duplicate')) {
      console.error('[ReachStream] Cache insert (no linkedin) error:', error);
    }
  }
}
