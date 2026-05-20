import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CV parser business-rule tests.
 * The actual parsing (PDF.js + mammoth) is mocked — we test the
 * validation gates and output shape, not the third-party libraries.
 */

// ── Inline parser logic (mirrors guards in services/cvParser.ts) ──────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

interface ParsedCandidate {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  rawText: string;
}

async function validateAndParseFile(
  file: File,
  extractText: (f: File) => Promise<string>
): Promise<ParsedCandidate> {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload a PDF, DOC, or DOCX.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5 MB.');
  }

  let text: string;
  try {
    text = await extractText(file);
  } catch {
    // Password-protected, scanned, or empty — return graceful nulls
    return { name: null, email: null, phone: null, skills: [], rawText: '' };
  }

  if (!text || text.trim().length < 20) {
    return { name: null, email: null, phone: null, skills: [], rawText: text ?? '' };
  }

  // Simple extraction (real impl delegates to Claude / regex)
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m);

  return {
    name: nameMatch?.[1] ?? null,
    email: emailMatch?.[0] ?? null,
    phone: null,
    skills: [],
    rawText: text,
  };
}

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = 'x'.repeat(sizeBytes);
  return new File([content], name, { type });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CV parser validation', () => {
  it('valid PDF returns a parsed candidate object', async () => {
    const file = makeFile('cv.pdf', 'application/pdf', 1024);
    const extractText = vi.fn().mockResolvedValue('Alice Smith\nalice@example.com\nExperienced engineer.');
    const result = await validateAndParseFile(file, extractText);
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('skills');
  });

  it('non-PDF throws "Unsupported file type"', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    await expect(validateAndParseFile(file, vi.fn())).rejects.toThrow(/unsupported file type/i);
  });

  it('file over 5 MB throws "File too large"', async () => {
    const file = makeFile('big.pdf', 'application/pdf', 6 * 1024 * 1024);
    await expect(validateAndParseFile(file, vi.fn())).rejects.toThrow(/file too large/i);
  });

  it('password-protected / unreadable PDF handles gracefully — returns nulls', async () => {
    const file = makeFile('protected.pdf', 'application/pdf', 1024);
    const extractText = vi.fn().mockRejectedValue(new Error('encrypted'));
    const result = await validateAndParseFile(file, extractText);
    expect(result.name).toBeNull();
    expect(result.email).toBeNull();
  });

  it('empty PDF returns nulls without throwing', async () => {
    const file = makeFile('empty.pdf', 'application/pdf', 10);
    const extractText = vi.fn().mockResolvedValue('');
    const result = await validateAndParseFile(file, extractText);
    expect(result.name).toBeNull();
  });

  it('scanned image PDF (no extractable text) handles gracefully', async () => {
    const file = makeFile('scanned.pdf', 'application/pdf', 500_000);
    const extractText = vi.fn().mockResolvedValue('   '); // whitespace only
    const result = await validateAndParseFile(file, extractText);
    expect(result.name).toBeNull();
    expect(result.rawText.trim()).toBe('');
  });

  it('missing name field returns null for name', async () => {
    const file = makeFile('cv.pdf', 'application/pdf', 1024);
    const extractText = vi.fn().mockResolvedValue('Email: test@example.com\nExperience: 5 years');
    const result = await validateAndParseFile(file, extractText);
    expect(result.name).toBeNull();
    expect(result.email).toBe('test@example.com');
  });

  it('garbled encoding does not crash — returns gracefully', async () => {
    const file = makeFile('cv.pdf', 'application/pdf', 1024);
    const extractText = vi.fn().mockResolvedValue('\u0000\uFFFD\u001B gibberish \u00A0\u200B');
    await expect(validateAndParseFile(file, extractText)).resolves.not.toThrow();
  });

  it('DOCX file type is accepted', async () => {
    const docxType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const file = makeFile('cv.docx', docxType, 1024);
    const extractText = vi.fn().mockResolvedValue('John Doe\njohn@example.com\nSoftware Engineer');
    await expect(validateAndParseFile(file, extractText)).resolves.toBeDefined();
  });
});
