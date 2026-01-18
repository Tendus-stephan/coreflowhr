/**
 * Database service for candidate storage and retrieval
 */

import { supabase } from '../config/database';
import { ScrapedCandidate, Job } from '../types';
import { logger } from '../utils/logger';
import { generateCandidateAnalysis } from './geminiService';

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
  // Note: profile_url, portfolio_urls, and work_experience are embedded in resume_summary and ai_analysis
}

export class DatabaseService {
  private adminUserId: string | null = null;

  /**
   * Get admin user ID by email (for scraped candidates)
   * Uses tendusstephan@gmail.com as the admin account
   * Caches the result to avoid repeated lookups
   */
  async getAdminUserId(adminEmail: string = 'tendusstephan@gmail.com'): Promise<string | null> {
    // Cache the admin user ID to avoid repeated lookups
    if (this.adminUserId) {
      return this.adminUserId;
    }

    try {
      // First, check environment variable (fastest and most reliable)
      const envAdminUserId = process.env.ADMIN_USER_ID || process.env.VITE_ADMIN_USER_ID;
      if (envAdminUserId) {
        this.adminUserId = envAdminUserId;
        logger.info(`Using admin user ID from environment: ${envAdminUserId}`);
        return envAdminUserId;
      }

      // Try to find user ID by querying auth.users via RPC function
      // This requires a custom SQL function in Supabase
      try {
        const { data: userIdData, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
          user_email: adminEmail
        });

        if (!rpcError && userIdData) {
          this.adminUserId = userIdData;
          logger.info(`Found admin user ID via RPC: ${userIdData}`);
          return userIdData;
        }
      } catch (rpcErr) {
        // RPC function might not exist, continue to next method
        logger.debug('RPC function get_user_id_by_email not available, trying alternative method');
      }

      // Alternative: Query profiles table if it has email column
      // Note: This depends on your schema - adjust if profiles.email doesn't exist
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', adminEmail)
          .single();

        if (!profileError && profile?.id) {
          this.adminUserId = profile.id;
          logger.info(`Found admin user ID from profiles table: ${profile.id}`);
          return profile.id;
        }
      } catch (profileErr) {
        logger.debug('Could not find admin user in profiles table');
      }

      // If we can't find it, return null
      logger.warn(`Admin user ${adminEmail} not found.`);
      logger.warn(`To fix: Set ADMIN_USER_ID in .env.local with the user ID for ${adminEmail}`);
      logger.warn(`Or create a Supabase RPC function 'get_user_id_by_email' that queries auth.users`);
      return null;
    } catch (error: any) {
      logger.error('Error getting admin user ID:', error);
      return null;
    }
  }

  /**
   * Check if candidate already exists (by name + job_id, since email is null for scraped candidates)
   */
  async candidateExists(jobId: string, email?: string, name?: string): Promise<boolean> {
    if (!name) return false;

    // For scraped candidates, we only check by name (email is null)
    const query = supabase
      .from('candidates')
      .select('id')
      .eq('job_id', jobId)
      .ilike('name', name.trim())
      .limit(1);

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

    // Log raw data to debug experience level and skills
    logger.info(`📋 Raw job data from database:`, {
      id: data.id,
      title: data.title,
      location: data.location,
      experience_level: data.experience_level,
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 3) : data.skills,
      skills_count: Array.isArray(data.skills) ? data.skills.length : 'not array',
      remote: data.remote
    });

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
      experienceLevel: data.experience_level || null, // Explicitly handle null
      remote: data.remote || false,
      skills: Array.isArray(data.skills) ? data.skills : (data.skills ? [data.skills] : []), // Ensure it's an array
      userId: data.user_id
    };
  }

  /**
   * Save scraped candidate to database
   * Uses admin account (tendusstephan@gmail.com) for all scraped candidates
   */
  async saveCandidate(
    job: Job,
    candidate: ScrapedCandidate
  ): Promise<{ success: boolean; candidateId?: string; error?: string }> {
    try {
      // Check for duplicates by name (we don't use email since LinkedIn scraping doesn't provide emails)
      const existsByName = await this.candidateExists(job.id, undefined, candidate.name);
      if (existsByName) {
        logger.info(`⏭️ Skipping duplicate candidate "${candidate.name}" (already exists for this job)`);
        return { success: false, error: 'Candidate already exists (duplicate name)' };
      }

      // Get admin user ID for scraped candidates (tendusstephan@gmail.com)
      // If admin account is not found, we'll use the job owner's account
      // In production, ensure the admin account exists in the database
      const adminUserId = await this.getAdminUserId('tendusstephan@gmail.com');
      
      // Use admin account for scraped candidates, fallback to job owner if admin not found
      const userId = adminUserId || job.userId;
      
      if (adminUserId) {
        logger.debug(`Using admin account (${adminUserId}) for scraped candidate`);
      } else {
        logger.warn(`Admin account not found, using job owner (${job.userId}) for scraped candidate`);
      }

      // Prepare data for insertion
      // Include profile URL and portfolio info in resume_summary if available
      let resumeSummary = candidate.resumeSummary || '';
      if (candidate.profileUrl || candidate.portfolioUrls) {
        const links: string[] = [];
        if (candidate.profileUrl) {
          links.push(`LinkedIn Profile: ${candidate.profileUrl}`);
        }
        if (candidate.portfolioUrls?.github) {
          links.push(`GitHub: ${candidate.portfolioUrls.github}`);
        }
        if (candidate.portfolioUrls?.linkedin && candidate.portfolioUrls.linkedin !== candidate.profileUrl) {
          links.push(`LinkedIn: ${candidate.portfolioUrls.linkedin}`);
        }
        if (candidate.portfolioUrls?.website) {
          links.push(`Website: ${candidate.portfolioUrls.website}`);
        }
        if (candidate.portfolioUrls?.twitter) {
          links.push(`Twitter: ${candidate.portfolioUrls.twitter}`);
        }
        if (links.length > 0) {
          resumeSummary += (resumeSummary ? '\n\n' : '') + `🔗 Links:\n${links.join('\n')}`;
        }
      }

      // Generate AI analysis using Gemini (strengths, weaknesses, expertise, job-relevant insights)
      let aiAnalysis = '';
      try {
        const aiResult = await generateCandidateAnalysis(
          {
            name: candidate.name,
            role: job.title,
            location: candidate.location,
            experience: candidate.experience,
            skills: candidate.skills,
            resumeSummary: resumeSummary,
            workExperience: candidate.workExperience,
            education: candidate.education,
            source: candidate.source
          },
          job
        );
        
        // Format AI analysis with strengths and weaknesses
        if (aiResult && aiResult.summary && !aiResult.summary.includes('temporarily unavailable')) {
          const strengthsText = aiResult.strengths && aiResult.strengths.length > 0 
            ? `\n\nStrengths:\n${aiResult.strengths.map(s => `• ${s}`).join('\n')}`
            : '';
          const weaknessesText = aiResult.weaknesses && aiResult.weaknesses.length > 0
            ? `\n\nAreas to Explore:\n${aiResult.weaknesses.map(w => `• ${w}`).join('\n')}`
            : '';
          aiAnalysis = `${aiResult.summary}${strengthsText}${weaknessesText}`;
        } else {
          // Fallback to summary if AI analysis failed
          aiAnalysis = resumeSummary;
        }
      } catch (error: any) {
        logger.warn('AI analysis generation failed, using summary as fallback:', error.message);
        aiAnalysis = resumeSummary;
      }

      // Include job-seeking signals in summary if detected
      const processedCandidate = candidate as any; // TypeScript type check
      if (processedCandidate.jobSeekingSignals && processedCandidate.jobSeekingSignals.detectedSignals.length > 0) {
        const signalsText = `\n\n🎯 Job-Seeking Signals Detected (${processedCandidate.jobSeekingSignals.signalStrength}% strength):\n${processedCandidate.jobSeekingSignals.detectedSignals.map((s: string) => `- ${s}`).join('\n')}`;
        resumeSummary += signalsText;
      }

      const insertData: any = {
        user_id: userId,
        job_id: job.id,
        name: candidate.name,
        email: null, // Email removed - LinkedIn scraping doesn't provide emails (illegal/confidential)
        role: job.title,
        location: candidate.location || job.location,
        experience: candidate.experience ? Math.round(candidate.experience) : null, // Round to integer
        skills: candidate.skills,
        resume_summary: resumeSummary,
        ai_analysis: aiAnalysis,
        stage: 'New',
        source: 'scraped',
        is_test: false,
        applied_date: new Date().toISOString()
      };

      // Add profile_url and portfolio_urls (columns added via migration)
      if (candidate.profileUrl) {
        insertData.profile_url = candidate.profileUrl;
      }
      if (candidate.portfolioUrls && Object.keys(candidate.portfolioUrls).length > 0) {
        insertData.portfolio_urls = candidate.portfolioUrls;
      }
      if (candidate.workExperience && candidate.workExperience.length > 0) {
        insertData.work_experience = candidate.workExperience;
      }
      if (candidate.education && candidate.education.length > 0) {
        insertData.education = candidate.education;
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        logger.error(`❌ Error saving candidate "${candidate.name}":`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          insertData: {
            name: insertData.name,
            email: insertData.email,
            job_id: insertData.job_id,
            user_id: insertData.user_id,
            source: insertData.source
          }
        });
        return { success: false, error: error.message };
      }

      logger.info(`✅ Saved candidate: ${candidate.name}`);
      return { success: true, candidateId: data.id };
    } catch (error: any) {
      logger.error(`❌ Unexpected error saving candidate "${candidate.name}":`, {
        message: error.message,
        stack: error.stack,
        error
      });
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
   * Get jobs by status (or all jobs if status is 'All')
   * Fetches jobs ONLY from admin account (tendusstephan@gmail.com)
   * Falls back to showing all active jobs if admin account not found (with warning)
   */
  async getJobsByStatus(status: string = 'Active'): Promise<Job[]> {
    try {
      // First, try to get all jobs (for debugging) to see if database connection works
      const { data: allJobsDebug, error: debugError } = await supabase
        .from('jobs')
        .select('id, title, status, user_id')
        .limit(5);

      if (debugError) {
        logger.error('Database connection error:', debugError);
        logger.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly in .env.local');
        return [];
      }

      logger.info(`✅ Database connection OK. Found ${allJobsDebug?.length || 0} total jobs (sample)`);
      if (allJobsDebug && allJobsDebug.length > 0) {
        logger.info(`Sample jobs found:`);
        allJobsDebug.forEach((j: any) => {
          logger.info(`  - ${j.title} | Status: ${j.status} | User ID: ${j.user_id?.substring(0, 8)}...`);
        });
      } else {
        logger.warn(`⚠️  No jobs found in database at all. Make sure you've created jobs in the main CoreFlow site.`);
      }

      // Get admin user ID
      const adminUserId = await this.getAdminUserId('tendusstephan@gmail.com');
      
      if (!adminUserId) {
        logger.warn('⚠️  Admin user ID not found for tendusstephan@gmail.com');
        logger.warn('Falling back to showing ALL active jobs (not filtered by account)');
        logger.warn('To fix: Set ADMIN_USER_ID in .env.local with your user ID');
        
        // Fallback: Show all jobs if admin account not found
        let query = supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false });

        if (status !== 'All') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) {
          logger.error(`Error fetching jobs:`, error);
          return [];
        }

        logger.info(`Found ${data?.length || 0} jobs (ALL accounts) with status: ${status}`);
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

      logger.info(`✅ Using admin user ID: ${adminUserId.substring(0, 8)}...`);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('user_id', adminUserId) // Filter by admin account
        .order('created_at', { ascending: false });

      if (status !== 'All') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`Error fetching jobs for admin account:`, error);
        return [];
      }

      logger.info(`✅ Found ${data?.length || 0} jobs with status: ${status} for admin account (${adminUserId.substring(0, 8)}...)`);
      if (data && data.length > 0) {
        logger.info(`Jobs: ${data.map((j: any) => `${j.title} (${j.status})`).join(', ')}`);
      } else {
        logger.warn(`⚠️  No jobs found for admin account with status: ${status}`);
        logger.warn(`Make sure you're creating jobs while logged in as tendusstephan@gmail.com`);
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
    } catch (error: any) {
      logger.error('Unexpected error in getJobsByStatus:', error);
      return [];
    }
  }

  /**
   * Get all active jobs
   * Fetches jobs from ALL users (not filtered by account)
   */
  async getActiveJobs(): Promise<Job[]> {
    return this.getJobsByStatus('Active');
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
