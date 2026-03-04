/**
 * AI candidate scoring service.
 * Uses Claude (claude-sonnet-4-20250514) to score candidates against a job.
 */

import type { Job } from '../types'; // Candidate type not used here — scoring uses CandidateScoringInput

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

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
 * Score a single candidate against a job using Claude AI.
 * Returns { score: 0, reason: '' } on any error — never throws.
 */
export async function scoreCandidate(
  job: Pick<Job, 'title' | 'description' | 'skills' | 'location'>,
  candidate: CandidateScoringInput
): Promise<CandidateScore> {
  // NOTE: scoringService runs server-side (Edge Function) only.
  // Anthropic API key must NEVER be exposed to the browser.
  const apiKey = typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined;

  if (!apiKey) {
    console.error('[Scoring] ANTHROPIC_API_KEY not configured — scoring is server-side only');
    return { score: 0, reason: '' };
  }

  const prompt = buildScoringPrompt(job, candidate);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[Scoring] API error ${response.status}:`, errText);
      return { score: 0, reason: '' };
    }

    const json = await response.json();
    const text: string = json?.content?.[0]?.text || '';
    return parseScoreResponse(text);
  } catch (err) {
    console.error('[Scoring] Request error:', err);
    return { score: 0, reason: '' };
  }
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
