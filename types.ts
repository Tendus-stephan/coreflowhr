export enum CandidateStage {
  NEW = 'New',
  SCREENING = 'Screening',
  INTERVIEW = 'Interview',
  OFFER = 'Offer',
  HIRED = 'Hired',
  REJECTED = 'Rejected'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  notifications: {
      email: boolean;
      push: boolean;
      weeklyReport: boolean;
  };
}

export interface Client {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  scrapingStatus?: 'pending' | 'succeeded' | 'failed' | 'partial' | null;
  scrapingError?: string | null;
  scrapingAttemptedAt?: string | null;
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Part-time';
  status: 'Active' | 'Closed' | 'Draft';
  applicantsCount: number;
  postedDate: string;
  description: string;
  salaryRange?: string;
  experienceLevel?: string;
  remote?: boolean;
  skills?: string[];
  company?: string;
  clientId?: string; // Link to client
  client?: Client; // Full client object (when joined)
  isTest?: boolean;
}

export interface WorkExperience {
  role: string;
  company: string;
  startDate?: string;
  endDate?: string;
  period: string;
  description?: string;
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
}

export interface PortfolioURLs {
  github?: string;
  linkedin?: string;
  portfolio?: string;
  dribbble?: string;
  behance?: string;
  website?: string;
  stackoverflow?: string;
  medium?: string;
  [key: string]: string | undefined;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  jobId: string;
  stage: CandidateStage;
  appliedDate: string;
  location: string;
  resumeSummary?: string;
  aiMatchScore?: number;
  aiAnalysis?: string;
  avatarUrl?: string;
  experience?: number;
  skills: string[];
  updatedAt?: string;
  cvFileUrl?: string;
  cvFileName?: string;
  source?: 'ai_sourced' | 'direct_application' | 'email_application' | 'referral' | 'scraped';
  isTest?: boolean;
  workExperience?: WorkExperience[];
  projects?: Project[];
  portfolioUrls?: PortfolioURLs;
  profileUrl?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  date: string;
  time: string;
  endTime?: string;
  type: 'Google Meet' | 'Phone' | 'In-Person';
  interviewer: string;
  durationMinutes?: number;
  timezone?: string;
  reminderSent?: boolean;
  meetingLink?: string;
  notes?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
  attendees?: InterviewAttendee[];
}

export interface InterviewAttendee {
  id: string;
  interviewId: string;
  userId: string;
  role: 'interviewer' | 'observer';
  userName?: string;
  userAvatarUrl?: string;
}

export interface InterviewConflict {
  id: string;
  interviewId: string;
  conflictingInterviewId: string;
  userId: string;
  detectedAt: string;
  resolved: boolean;
  conflictingInterview?: Interview;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Interview;
  type: 'Google Meet' | 'Phone' | 'In-Person';
  candidateName: string;
  jobTitle: string;
}

// --- Interview Feedback ---

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  candidateId: string;
  userId: string;
  overallRating?: number; // 1-5
  technicalSkills?: number; // 1-5
  communication?: number; // 1-5
  culturalFit?: number; // 1-5
  problemSolving?: number; // 1-5
  strengths?: string;
  weaknesses?: string;
  overallImpression?: string;
  recommendation?: 'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Strong No';
  createdAt: string;
  updatedAt: string;
  userName?: string; // For display
  userAvatarUrl?: string; // For display
}

// --- Email History ---

export interface EmailLog {
  id: string;
  candidateId: string;
  userId: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  content: string; // HTML content
  emailType?: 'Screening' | 'Interview' | 'Offer' | 'Rejection' | 'Hired' | 'Reschedule' | 'Offer Accepted' | 'Offer Declined' | 'Counter Offer Response' | 'Custom';
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sentAt: string;
  threadId?: string;
  replyToId?: string;
  createdAt: string;
}

// --- Settings & Billing Types ---

export interface BillingPlan {
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  activeJobsLimit: number;
  candidatesLimit: number | 'Unlimited';
  currency: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  description?: string;
}

export interface RecruitmentSettings {
  maxActiveJobs: number;
  defaultJobDuration: number;
  maxCandidatesPerJob: number;
  autoDeleteJobs: boolean;
}

export interface EmailTemplate {
  id: string;
  title: string;
  desc: string;
  type: string;
  subject: string;
  content: string;
}

export interface Integration {
  id: string;
  name: string;
  desc: string;
  active: boolean;
  logo: string;
  connectedDate?: string;
}

export interface DashboardStats {
  activeJobs: number;
  totalCandidates: number;
  qualifiedCandidates: number;
  avgTimeToFill: string;
  activeJobsTrend: string;
  candidatesTrend: string;
  qualifiedTrend: string;
  timeToFillTrend: string;
}

export interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  to?: string;
  time: string;
  createdAt?: string;
}

// --- Candidate Notes ---

export interface Note {
  id: string;
  candidateId: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  userName?: string; // For display purposes
  userAvatarUrl?: string; // Profile picture URL
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Interview;
  type: 'Google Meet' | 'Phone' | 'In-Person';
  candidateName: string;
  jobTitle: string;
}

// --- Interview Feedback ---

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  candidateId: string;
  userId: string;
  overallRating?: number; // 1-5
  technicalSkills?: number; // 1-5
  communication?: number; // 1-5
  culturalFit?: number; // 1-5
  problemSolving?: number; // 1-5
  strengths?: string;
  weaknesses?: string;
  overallImpression?: string;
  recommendation?: 'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Strong No';
  createdAt: string;
  updatedAt: string;
  userName?: string; // For display
  userAvatarUrl?: string; // For display
}

// --- Email History ---

export interface EmailLog {
  id: string;
  candidateId: string;
  userId: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  content: string; // HTML content
  emailType?: 'Screening' | 'Interview' | 'Offer' | 'Rejection' | 'Hired' | 'Reschedule' | 'Offer Accepted' | 'Offer Declined' | 'Counter Offer Response' | 'Custom';
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sentAt: string;
  threadId?: string;
  replyToId?: string;
  createdAt: string;
}

// --- Settings & Billing Types ---

export interface BillingPlan {
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  activeJobsLimit: number;
  candidatesLimit: number | 'Unlimited';
  currency: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  description?: string;
}

export interface RecruitmentSettings {
  maxActiveJobs: number;
  defaultJobDuration: number;
  maxCandidatesPerJob: number;
  autoDeleteJobs: boolean;
}

export interface EmailTemplate {
  id: string;
  title: string;
  desc: string;
  type: string;
  subject: string;
  content: string;
}

export interface Integration {
  id: string;
  name: string;
  desc: string;
  active: boolean;
  logo: string;
  connectedDate?: string;
}

export interface DashboardStats {
  activeJobs: number;
  totalCandidates: number;
  qualifiedCandidates: number;
  avgTimeToFill: string;
  activeJobsTrend: string;
  candidatesTrend: string;
  qualifiedTrend: string;
  timeToFillTrend: string;
}

export interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  to?: string;
  time: string;
  createdAt?: string;
}

// --- Candidate Notes ---

export interface Note {
  id: string;
  candidateId: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  userName?: string; // For display purposes
  userAvatarUrl?: string; // Profile picture URL
}

// --- Email Workflows ---
export interface EmailWorkflow {
  id: string;
  userId: string;
  name: string;
  triggerStage: CandidateStage;
  emailTemplateId: string;
  minMatchScore?: number;
  sourceFilter?: string[];
  enabled: boolean;
  delayMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  candidateId: string;
  emailLogId?: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  executedAt: string;
  errorMessage?: string;
}

// --- Offer Management ---
export interface Offer {
  id: string;
  candidateId: string | null; // null for general offers
  jobId: string;
  userId: string;
  positionTitle: string;
  startDate?: string;
  salaryAmount?: number;
  salaryCurrency: string;
  salaryPeriod: 'hourly' | 'monthly' | 'yearly';
  benefits?: string[];
  notes?: string;
  status: 'draft' | 'sent' | 'viewed' | 'negotiating' | 'accepted' | 'declined' | 'expired';
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  expiresAt?: string;
  response?: string;
  negotiationHistory?: any;
  createdAt: string;
  updatedAt: string;
}

export interface OfferTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
