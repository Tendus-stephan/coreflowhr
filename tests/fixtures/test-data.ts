/**
 * Centralised test data. Never hardcode values in tests — import from here.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Credentials ───────────────────────────────────────────────────────────────
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@coreflow-qa.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin!2025',
    name: 'QA Admin',
  },
  recruiter: {
    email: process.env.TEST_RECRUITER_EMAIL || 'test-recruiter@coreflow-qa.com',
    password: process.env.TEST_RECRUITER_PASSWORD || 'TestRecruiter!2025',
    name: 'QA Recruiter',
  },
} as const;

// ── Workspace ─────────────────────────────────────────────────────────────────
export const TEST_WORKSPACE = {
  name: 'QA Test Agency',
  slug: 'qa-test-agency',
};

// ── Client ────────────────────────────────────────────────────────────────────
export const TEST_CLIENT = {
  name: 'Acme Corp QA',
  industry: 'Technology',
  location: 'London, UK',
  website: 'https://acme-qa.example.com',
  contactEmail: 'hr@acme-qa.example.com',
  contactPhone: '+44 20 1234 5678',
  bannerColor: '#1e3a5f',
};

// ── Job ───────────────────────────────────────────────────────────────────────
export const TEST_JOB = {
  title: 'Senior Software Engineer QA',
  department: 'Engineering',
  location: 'London, UK',
  type: 'Full-time' as const,
  remote: true,
  description: 'This is a QA test job posting. We are looking for a senior engineer.',
  salaryRange: '£80,000 – £100,000',
  skills: ['TypeScript', 'React', 'Node.js'],
};

// ── Candidates ────────────────────────────────────────────────────────────────
export const TEST_CANDIDATES = {
  primary: {
    name: 'Alice QA Testington',
    email: 'alice.qa@coreflow-test.com',
    phone: '+44 7700 900001',
    experience: '5 years',
    linkedinUrl: 'https://linkedin.com/in/alice-qa',
    coverLetter: 'I am applying for this position as part of automated QA testing.',
  },
  secondary: {
    name: 'Bob QA Testersson',
    email: 'bob.qa@coreflow-test.com',
    phone: '+44 7700 900002',
    experience: '3 years',
    linkedinUrl: '',
    coverLetter: '',
  },
  inviteEmail: 'invited-member@coreflow-qa.com',
};

// ── Offer ─────────────────────────────────────────────────────────────────────
export const TEST_OFFER = {
  salary: 90000,
  currency: 'GBP',
  period: 'per year' as const,
  startDate: '2025-09-01',
  benefits: 'Health insurance, 25 days holiday, pension',
  notes: 'QA test offer — do not sign',
  requiresApproval: false,
  approverEmail: 'approver@acme-qa.example.com',
};

// ── File paths ────────────────────────────────────────────────────────────────
export const TEST_FILES = {
  validPdf: path.join(__dirname, '../fixtures/files/valid-cv.pdf'),
  validDoc: path.join(__dirname, '../fixtures/files/valid-cv.docx'),
  oversizedPdf: path.join(__dirname, '../fixtures/files/oversized.pdf'),
  invalidType: path.join(__dirname, '../fixtures/files/invalid.jpg'),
  emptyPdf: path.join(__dirname, '../fixtures/files/empty.pdf'),
  scannedPdf: path.join(__dirname, '../fixtures/files/scanned.pdf'),
};

// ── Timeouts ──────────────────────────────────────────────────────────────────
export const TIMEOUTS = {
  emailDelivery: 30_000,   // ms to wait for email delivery
  aiScoring: 60_000,       // ms to wait for AI scoring
  webhookProcessing: 5_000, // ms to wait for webhook processing
};

// ── Routes ────────────────────────────────────────────────────────────────────
export const ROUTES = {
  login: '/login',
  signup: '/signup',
  dashboard: '/dashboard',
  onboarding: '/onboarding',
  jobs: '/jobs',
  candidates: '/candidates',
  clients: '/clients',
  offers: '/offers',
  calendar: '/calendar',
  settings: '/settings',
  billing: '/settings/billing',
};
