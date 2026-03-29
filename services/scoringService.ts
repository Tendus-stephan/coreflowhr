/**
 * AI candidate scoring service — types and helpers only.
 * Actual scoring runs server-side inside the analyze-candidate / trigger-sourcing
 * Edge Functions. This module must NEVER make direct calls to third-party AI APIs
 * from the browser — API keys must not be exposed client-side.
 */

import type { Job } from '../types'; // Candidate type not used here — scoring uses CandidateScoringInput

export interface CandidateScore {
  score: number;       // 0–100
  reason: string;      // one-sentence explanation
}

/** Minimal candidate info needed for scoring */
export interface CandidateScoringInput {
  fullName?: string;
  currentJobTitle?: string;
  currentCompany?: string;
  location?: string;
  skills?: string[];
  experience?: unknown[];
  education?: unknown[];
}

/**
 * Score a single candidate against a job.
 * This is a no-op stub on the client — real scoring is handled server-side
 * by the analyze-candidate and trigger-sourcing Edge Functions.
 */
export async function scoreCandidate(
  _job: Pick<Job, 'title' | 'description' | 'skills' | 'location'>,
  _candidate: CandidateScoringInput
): Promise<CandidateScore> {
  return { score: 0, reason: '' };
}

/**
 * Score multiple candidates simultaneously using Promise.all.
 * Returns an array of CandidateScore in the same order as the input candidates.
 */
export async function scoreCandidatesBulk(
  job: Pick<Job, 'title' | 'description' | 'skills' | 'location'>,
  candidates: CandidateScoringInput[]
): Promise<CandidateScore[]> {
  return Promise.all(candidates.map((c) => scoreCandidate(job, c)));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildScoringPrompt(
  job: Pick<Job, 'title' | 'description' | 'skills' | 'location'>,
  candidate: CandidateScoringInput
): string {
  const jobSkills = Array.isArray(job.skills) ? job.skills.join(', ') : '';
  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : '';

  const experience = Array.isArray(candidate.experience)
    ? candidate.experience
        .map((e) => {
          const title = (e as { title?: string }).title || '';
          const company = (e as { company?: { name?: string } }).company?.name || '';
          return title && company ? `${title} at ${company}` : title || company;
        })
        .filter(Boolean)
        .join('; ')
    : '';

  const education = Array.isArray(candidate.education)
    ? candidate.education
        .map((e) => {
          const school = (e as { school?: { name?: string } }).school?.name || '';
          const degree = (e as { degree?: string }).degree || '';
          return degree && school ? `${degree} from ${school}` : school || degree;
        })
        .filter(Boolean)
        .join('; ')
    : '';

  return `You are a recruiter assistant. Score this candidate for the job on a scale of 0–100 and give a one-sentence reason.

JOB:
Title: ${job.title || ''}
Location: ${job.location || ''}
Skills required: ${jobSkills}
Description: ${(job.description || '').slice(0, 400)}

CANDIDATE:
Name: ${candidate.fullName || ''}
Current title: ${candidate.currentJobTitle || ''}
Current company: ${candidate.currentCompany || ''}
Location: ${candidate.location || ''}
Skills: ${candidateSkills}
Experience: ${experience}
Education: ${education}

Respond with exactly this JSON format and nothing else:
{"score": <number 0-100>, "reason": "<one sentence>"}`;
}

function parseScoreResponse(text: string): CandidateScore {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const json = JSON.parse(cleaned);
    const score = Math.min(100, Math.max(0, Math.round(Number(json.score) || 0)));
    const reason = typeof json.reason === 'string' ? json.reason.trim() : '';
    return { score, reason };
  } catch {
    // Fallback: extract score with regex
    const match = text.match(/"score"\s*:\s*(\d+)/);
    const score = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 0;
    return { score, reason: '' };
  }
}
