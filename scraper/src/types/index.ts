/**
 * TypeScript types for the scraper service
 */

export interface Job {
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
  userId: string;
}

export interface ScrapedCandidate {
  name: string;
  email?: string; // May not always be available
  location?: string;
  experience?: number;
  skills: string[];
  resumeSummary: string;
  profileUrl?: string; // Source profile URL
  workExperience?: WorkExperience[];
  education?: Education[];
  portfolioUrls?: {
    github?: string;
    linkedin?: string;
    website?: string;
    twitter?: string;
  };
  // Additional metadata
  source: 'linkedin' | 'github' | 'jobboard' | 'twitter' | 'portfolio';
  rawData?: any; // Store raw provider response for debugging
}

export interface WorkExperience {
  role: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface Education {
  degree?: string;
  school?: string;
  field?: string;
  year?: string;
}

export interface ScrapeOptions {
  maxCandidates?: number;
  minMatchScore?: number;
  sources?: ('linkedin' | 'github' | 'jobboard')[];
  provider?: 'apify' | 'scraperapi';
}

export interface ScrapeResult {
  success: boolean;
  candidatesFound: number;
  candidatesSaved: number;
  errors?: string[];
  source: string;
}

export interface LinkedInQuery {
  jobTitle?: string;
  skills?: string[];
  location?: string;
  experienceLevel?: string;
  maxResults?: number;
}

export interface GitHubQuery {
  language?: string;
  location?: string;
  keywords?: string[];
  maxResults?: number;
}

export interface JobBoardQuery {
  jobTitle?: string;
  skills?: string[];
  location?: string;
  maxResults?: number;
}


