/**
 * Sourcing provider abstraction layer.
 *
 * All sourcing code calls these three functions — never PDL or ReachStream directly.
 * The active provider is controlled by the SOURCING_PROVIDER environment variable
 * (or per-workspace workspace.sourcing_provider override).
 *
 * SOURCING_PROVIDER=pdl          → PeopleDataLabs (default)
 * SOURCING_PROVIDER=reachstream  → ReachStream
 */

import {
  searchCandidates,
  mapPdlPersonToCandidate,
  saveToCacheBulk,
  type PdlPerson,
} from './pdlService';

import {
  searchCandidatesReachStream,
  mapReachStreamPersonToCandidate,
  saveReachStreamToCacheBulk,
  type ReachStreamPerson,
} from './reachstream';

export type SourcingProvider = 'pdl' | 'reachstream';

/**
 * Search candidates using whichever provider is active.
 * Never throws — both underlying providers return gracefully.
 */
export async function searchCandidatesWithProvider(
  job_title: string,
  location: string,
  skills: string[],
  size: number = 10,
  offset: number = 0,
  provider: SourcingProvider = (
    (typeof process !== 'undefined' ? process.env.SOURCING_PROVIDER : undefined) || 'pdl'
  ) as SourcingProvider
) {
  if (provider === 'reachstream') {
    return await searchCandidatesReachStream(job_title, location, skills, size, offset);
  }
  return await searchCandidates(job_title, location, skills, size, offset);
}

/**
 * Map a raw provider person object to a CoreflowHR candidate record.
 */
export function mapPersonToCandidate(
  person: PdlPerson | ReachStreamPerson,
  provider: SourcingProvider
): Record<string, unknown> {
  if (provider === 'reachstream') {
    return mapReachStreamPersonToCandidate(person as ReachStreamPerson);
  }
  return mapPdlPersonToCandidate(person as PdlPerson);
}

/**
 * Bulk-save raw provider results into sourcing_cache.
 */
export async function saveToCacheWithProvider(
  persons: Array<PdlPerson | ReachStreamPerson>,
  provider: SourcingProvider
): Promise<void> {
  if (provider === 'reachstream') {
    return await saveReachStreamToCacheBulk(persons as ReachStreamPerson[]);
  }
  return await saveToCacheBulk(persons as PdlPerson[]);
}
