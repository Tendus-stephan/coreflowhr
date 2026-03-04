/**
 * PeopleDataLabs (PDL) integration service.
 * Handles candidate search, mapping, and caching.
 */

import { supabase } from './supabase';

const PDL_API_URL = 'https://api.peopledatalabs.com/v5/person/search';

export interface PdlPerson {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  work_email?: string;
  personal_emails?: string[];
  linkedin_url?: string;
  job_title?: string;
  job_company_name?: string;
  job_company_location_locality?: string;
  job_company_location_country?: string;
  location_name?: string;
  profile_pic_url?: string;
  skills?: string[];
  experience?: Array<{ title?: string; company?: { name?: string }; start_date?: string; end_date?: string }>;
  education?: Array<{ school?: { name?: string }; degree?: string; start_date?: string; end_date?: string }>;
  [key: string]: unknown;
}

export interface SearchResult {
  data: PdlPerson[];
  total: number;
}

/**
 * Search PDL for candidates matching the job criteria.
 */
export async function searchCandidates(
  job_title: string,
  location: string,
  skills: string[],
  size: number = 20,
  offset: number = 0
): Promise<SearchResult> {
  // NOTE: pdlService runs server-side (Edge Function) only.
  // PDL API key must NEVER be exposed to the browser.
  const apiKey = typeof process !== 'undefined' ? process.env.PDL_API_KEY : undefined;

  if (!apiKey || apiKey === 'YOUR_PDL_API_KEY_HERE') {
    console.error('[PDL] PDL_API_KEY not configured');
    return { data: [], total: 0 };
  }

  const requestBody = {
    query: {
      bool: {
        must: [
          {
            match: {
              job_title: job_title,
            },
          },
        ],
        should: [
          {
            term: {
              location_locality: location.toLowerCase(),
            },
          },
          {
            term: {
              location_country: location.toLowerCase(),
            },
          },
          ...skills.map((skill) => ({
            term: {
              skills: skill.toLowerCase(),
            },
          })),
        ],
        minimum_should_match: 1,
      },
    },
    size,
    from: offset,
    pretty: true,
  };

  try {
    const response = await fetch(PDL_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[PDL] Search failed: ${response.status} ${response.statusText}`, errText);
      return { data: [], total: 0 };
    }

    const json = await response.json();
    return {
      data: json.data || [],
      total: json.total || 0,
    };
  } catch (err) {
    console.error('[PDL] Search request error:', err);
    return { data: [], total: 0 };
  }
}

/**
 * Map a PDL person object to a CoreflowHR candidate record.
 */
export function mapPdlPersonToCandidate(pdlPerson: PdlPerson): Record<string, unknown> {
  const locality = pdlPerson.job_company_location_locality || '';
  const country = pdlPerson.job_company_location_country || '';
  const location =
    locality && country
      ? `${locality}, ${country}`
      : locality || country || pdlPerson.location_name || '';

  return {
    full_name: pdlPerson.full_name || `${pdlPerson.first_name || ''} ${pdlPerson.last_name || ''}`.trim(),
    first_name: pdlPerson.first_name || null,
    last_name: pdlPerson.last_name || null,
    email: pdlPerson.work_email || (pdlPerson.personal_emails?.[0] ?? null),
    linkedin_url: pdlPerson.linkedin_url || null,
    current_job_title: pdlPerson.job_title || null,
    current_company: pdlPerson.job_company_name || null,
    location,
    profile_picture_url: pdlPerson.profile_pic_url || null,
    skills: Array.isArray(pdlPerson.skills) ? pdlPerson.skills : [],
    experience: Array.isArray(pdlPerson.experience) ? pdlPerson.experience : [],
    education: Array.isArray(pdlPerson.education) ? pdlPerson.education : [],
    pdl_id: pdlPerson.id || null,
    source: 'Sourced',
    sourced_at: new Date().toISOString(),
  };
}

/**
 * Check the sourcing_cache for a cached PDL profile.
 * Returns the record if found and updated within 30 days, otherwise null.
 */
export async function checkCacheForProfile(
  linkedin_url: string | null,
  pdl_id: string | null
): Promise<Record<string, unknown> | null> {
  if (!linkedin_url && !pdl_id) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('sourcing_cache')
    .select('*')
    .gt('last_updated_at', thirtyDaysAgo);

  if (linkedin_url) {
    query = query.eq('linkedin_url', linkedin_url);
  } else if (pdl_id) {
    query = query.eq('pdl_id', pdl_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[PDL] Cache lookup error:', error);
    return null;
  }

  return data || null;
}

/**
 * Bulk upsert PDL person objects into the sourcing_cache table.
 * Uses linkedin_url as the conflict key.
 */
export async function saveToCacheBulk(pdlPersons: PdlPerson[]): Promise<void> {
  if (!pdlPersons.length) return;

  const records = pdlPersons
    .filter((p) => p.linkedin_url || p.id)
    .map((p) => ({
      linkedin_url: p.linkedin_url || null,
      pdl_id: p.id || null,
      full_name: p.full_name || null,
      current_job_title: p.job_title || null,
      current_company: p.job_company_name || null,
      location:
        p.job_company_location_locality && p.job_company_location_country
          ? `${p.job_company_location_locality}, ${p.job_company_location_country}`
          : p.location_name || null,
      profile_picture_url: p.profile_pic_url || null,
      email: p.work_email || p.personal_emails?.[0] || null,
      skills: p.skills || [],
      experience: p.experience || [],
      education: p.education || [],
      raw_pdl_data: p,
      last_updated_at: new Date().toISOString(),
    }));

  if (!records.length) return;

  const { error } = await supabase
    .from('sourcing_cache')
    .upsert(records, { onConflict: 'linkedin_url', ignoreDuplicates: false });

  if (error) {
    console.error('[PDL] Cache bulk save error:', error);
  }
}
