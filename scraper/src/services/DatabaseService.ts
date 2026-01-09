/**
 * Database service for candidate storage and retrieval
 */

import { supabase } from '../config/database';
import { ScrapedCandidate, Job } from '../types';
import { logger } from '../utils/logger';

export interface CandidateInsertData {
  user_id: string;
  job_id: string;
  name: string;
  email?: string;
  role: string;
  location?: string;
  experience?: number;
  skills: string[];
  resume_summary: string;
  ai_match_score?: number;
  ai_analysis?: string;
  stage: 'New' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
  source: 'scraped';
  is_test: false;
  applied_date: string;
  profile_url?: string;
  portfolio_urls?: any;
  work_experience?: any;
}

export class DatabaseService {
  /**
   * Check if candidate already exists (by email + job_id)
   */
  async candidateExists(jobId: string, email?: string, name?: string): Promise<boolean> {
    if (!email && !name) return false;

    let query = supabase
      .from('candidates')
      .select('id')
      .eq('job_id', jobId)
      .limit(1);

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    } else if (name) {
      // Fuzzy name matching (case-insensitive)
      query = query.ilike('name', name.trim());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error checking candidate existence:', error);
      return false; // Assume doesn't exist on error
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Get job details by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      logger.error('Error fetching job:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      department: data.department || 'General',
      location: data.location,
      type: data.type,
      status: data.status,
      applicantsCount: data.applicants_count || 0,
      postedDate: data.posted_date || data.created_at,
      description: data.description || '',
      company: data.company,
      salaryRange: data.salary_range,
      experienceLevel: data.experience_level,
      remote: data.remote || false,
      skills: data.skills || [],
      userId: data.user_id
    };
  }

  /**
   * Save scraped candidate to database
   */
  async saveCandidate(
    job: Job,
    candidate: ScrapedCandidate,
    matchScore: number
  ): Promise<{ success: boolean; candidateId?: string; error?: string }> {
    try {
      // Check for duplicates
      const exists = await this.candidateExists(job.id, candidate.email, candidate.name);
      if (exists) {
        logger.debug(`Candidate ${candidate.name} already exists for job ${job.id}`);
        return { success: false, error: 'Candidate already exists' };
      }

      // Prepare data for insertion
      const insertData: CandidateInsertData = {
        user_id: job.userId,
        job_id: job.id,
        name: candidate.name,
        email: candidate.email?.toLowerCase().trim() || `scraped-${Date.now()}@coreflow.local`,
        role: job.title,
        location: candidate.location || job.location,
        experience: candidate.experience,
        skills: candidate.skills,
        resume_summary: candidate.resumeSummary,
        ai_match_score: matchScore,
        ai_analysis: candidate.resumeSummary, // Use resume summary as analysis for now
        stage: 'New',
        source: 'scraped',
        is_test: false,
        applied_date: new Date().toISOString(),
        profile_url: candidate.profileUrl,
        portfolio_urls: candidate.portfolioUrls,
        work_experience: candidate.workExperience
      };

      const { data, error } = await supabase
        .from('candidates')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        logger.error('Error saving candidate:', error);
        return { success: false, error: error.message };
      }

      logger.info(`Saved candidate: ${candidate.name} (match score: ${matchScore})`);
      return { success: true, candidateId: data.id };
    } catch (error: any) {
      logger.error('Unexpected error saving candidate:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Update job applicants count
   */
  async updateJobApplicantsCount(jobId: string, increment: number = 1): Promise<void> {
    const { error } = await supabase.rpc('increment_applicants_count', {
      job_id: jobId,
      increment_by: increment
    });

    if (error) {
      // Fallback to manual update if RPC doesn't exist
      const { data: job } = await supabase
        .from('jobs')
        .select('applicants_count')
        .eq('id', jobId)
        .single();

      if (job) {
        await supabase
          .from('jobs')
          .update({ applicants_count: (job.applicants_count || 0) + increment })
          .eq('id', jobId);
      }
    }
  }

  /**
   * Get all active jobs
   */
  async getActiveJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching active jobs:', error);
      return [];
    }

    return (data || []).map(job => ({
      id: job.id,
      title: job.title,
      department: job.department || 'General',
      location: job.location,
      type: job.type,
      status: job.status,
      applicantsCount: job.applicants_count || 0,
      postedDate: job.posted_date || job.created_at,
      description: job.description || '',
      company: job.company,
      salaryRange: job.salary_range,
      experienceLevel: job.experience_level,
      remote: job.remote || false,
      skills: job.skills || [],
      userId: job.user_id
    }));
  }

  /**
   * Get candidates for a specific job
   */
  async getCandidatesForJob(jobId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('job_id', jobId)
      .eq('source', 'scraped')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching candidates:', error);
      return [];
    }

    return data || [];
  }
}


