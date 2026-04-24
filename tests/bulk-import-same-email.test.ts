/**
 * Verifies that bulk-importing 5 CVs that all share the same email address
 * produces 5 separate candidate records (not 1 overwritten record).
 *
 * How the fix works:
 *   - bulkImport always attempts INSERT (no code-level email dedup).
 *   - If the DB fires a 23505 email-uniqueness constraint, it retries with
 *     email = null so every CV always creates its own candidate row.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock dynamic dependencies ─────────────────────────────────────────────────

vi.mock('../services/cvParser', () => ({
  extractTextFromCV: vi.fn().mockResolvedValue(
    'Jane Doe\nSoftware Engineer\nEmail: same@example.com\n5 years experience in TypeScript'
  ),
}));

vi.mock('../services/activityLogger', () => ({
  logCandidateAdded: vi.fn().mockResolvedValue(undefined),
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (table: string) => mockFrom(table),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/cv.pdf' },
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          name: 'Jane Doe',
          email: 'same@example.com',
          skills: ['TypeScript', 'JavaScript'],
          workExperience: [{ role: 'Software Engineer', company: 'Acme', years: 5 }],
          portfolioUrls: {},
          location: 'London',
          experienceYears: 5,
        },
        error: null,
      }),
    },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Chainable + thenable mock for simple Supabase query chains. */
const chainable = (data: any, error: any = null) => {
  const result = { data, error };
  const obj: any = {
    select: () => obj,
    eq: () => obj,
    in: () => obj,
    limit: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return obj;
};

const EMAIL_CONSTRAINT_ERROR = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "candidates_job_email_unique"',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Bulk import — 5 CVs with the same email', () => {
  /** Tracks how many times insert was called with a non-null email. */
  let emailInsertCount: number;
  /** Tracks how many times the null-email fallback insert was called. */
  let noEmailInsertCount: number;

  const CANDIDATE_IDS = ['cand-1', 'cand-2', 'cand-3', 'cand-4', 'cand-5'];

  beforeEach(() => {
    vi.clearAllMocks();
    emailInsertCount = 0;
    noEmailInsertCount = 0;

    mockFrom.mockImplementation((table: string) => {
      // ── workspace / auth helpers ──────────────────────────────────────────
      if (table === 'workspace_members') {
        return {
          select: () => chainable([{ workspace_id: 'ws-1', role: 'Admin' }]),
        };
      }

      if (table === 'workspaces') {
        const result = { data: [{ id: 'ws-1' }], error: null };
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          limit: () => Promise.resolve(result),
          then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        };
        return chain;
      }

      // ── job lookup ────────────────────────────────────────────────────────
      if (table === 'jobs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      user_id: 'user-1',
                      title: 'Candidate Pool',
                      skills: ['TypeScript'],
                      location: 'London',
                      workspace_id: 'ws-1',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      // ── candidates ────────────────────────────────────────────────────────
      if (table === 'candidates') {
        return {
          insert: (fields: any) => ({
            select: () => ({
              single: () => {
                if (fields.email !== null) {
                  emailInsertCount++;
                  if (emailInsertCount === 1) {
                    // First CV: no conflict yet, email insert succeeds
                    return Promise.resolve({ data: { id: CANDIDATE_IDS[0] }, error: null });
                  }
                  // CVs 2-5: email already taken → DB constraint fires
                  return Promise.resolve({ data: null, error: EMAIL_CONSTRAINT_ERROR });
                } else {
                  // Fallback insert without email — always succeeds
                  noEmailInsertCount++;
                  return Promise.resolve({
                    data: { id: CANDIDATE_IDS[noEmailInsertCount] },
                    error: null,
                  });
                }
              },
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }

      // fallback
      return chainable([]);
    });
  });

  it('creates 5 separate candidate records even when all CVs share the same email', async () => {
    const { api } = await import('../services/api');

    const JOB_ID = 'job-pool-1';
    const makeFile = (name: string) =>
      new File(['fake cv content — ' + name], name, { type: 'application/pdf' });

    const cvFiles = [
      makeFile('alice-resume.pdf'),
      makeFile('bob-resume.pdf'),
      makeFile('charlie-resume.pdf'),
      makeFile('dana-resume.pdf'),
      makeFile('eve-resume.pdf'),
    ];

    // Process sequentially (mirrors the real BulkCVUpload import loop)
    const results: Array<{ success: boolean; candidateId?: string }> = [];
    for (const file of cvFiles) {
      results.push(await api.candidates.bulkImport(JOB_ID, file));
    }

    // All 5 should succeed
    results.forEach((r, i) => {
      expect(r.success, `CV ${i + 1} should succeed`).toBe(true);
      expect(r.candidateId, `CV ${i + 1} should have a candidateId`).toBeDefined();
    });

    // All 5 should have distinct IDs — no record was overwritten
    const uniqueIds = new Set(results.map(r => r.candidateId));
    expect(uniqueIds.size).toBe(5);
  });

  it('first CV keeps its email; subsequent CVs fall back to null email on constraint', async () => {
    const { api } = await import('../services/api');

    const JOB_ID = 'job-pool-1';
    const makeFile = (name: string) =>
      new File(['fake cv content'], name, { type: 'application/pdf' });

    await api.candidates.bulkImport(JOB_ID, makeFile('cv1.pdf'));
    await api.candidates.bulkImport(JOB_ID, makeFile('cv2.pdf'));
    await api.candidates.bulkImport(JOB_ID, makeFile('cv3.pdf'));

    // 3 attempts with email (1 success + 2 constraint violations)
    expect(emailInsertCount).toBe(3);
    // 2 fallback inserts without email (for CVs 2 & 3)
    expect(noEmailInsertCount).toBe(2);
  });

  it('does NOT collapse all same-email CVs into one record (regression guard)', async () => {
    const { api } = await import('../services/api');

    const JOB_ID = 'job-pool-1';
    const makeFile = (name: string) =>
      new File(['fake cv content'], name, { type: 'application/pdf' });

    const r1 = await api.candidates.bulkImport(JOB_ID, makeFile('person1.pdf'));
    const r2 = await api.candidates.bulkImport(JOB_ID, makeFile('person2.pdf'));
    const r3 = await api.candidates.bulkImport(JOB_ID, makeFile('person3.pdf'));

    expect(r1.candidateId).not.toEqual(r2.candidateId);
    expect(r1.candidateId).not.toEqual(r3.candidateId);
    expect(r2.candidateId).not.toEqual(r3.candidateId);
  });
});
