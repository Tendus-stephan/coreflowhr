/**
 * Job analyzer utility
 * Analyzes job details to determine the best sources for candidate sourcing
 */

import { Job } from '../types';
import { logger } from './logger';

export type SourceType = 'linkedin' | 'github' | 'mightyrecruiter' | 'jobspider';

export interface SourceRecommendation {
  source: SourceType;
  priority: number; // Higher number = higher priority
  quota: number; // Number of candidates to fetch from this source
  reason: string;
}

/**
 * Technical job keywords and patterns
 */
const TECHNICAL_KEYWORDS = [
  // Titles
  'developer', 'engineer', 'programmer', 'coder', 'architect', 'devops', 'sre',
  'data scientist', 'data engineer', 'ml engineer', 'ai engineer', 'analyst',
  'technical', 'software', 'programming', 'coding', 'backend', 'frontend',
  'fullstack', 'full stack', 'mobile', 'ios', 'android', 'web developer',
  
  // Skills/Technologies
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php',
  'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask',
  'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github',
  'algorithm', 'data structure', 'api', 'microservice', 'cloud',
  'machine learning', 'deep learning', 'neural network', 'nlp', 'computer vision'
];

/**
 * Non-technical job keywords
 */
const NON_TECHNICAL_KEYWORDS = [
  'hr', 'human resources', 'recruiter', 'talent acquisition',
  'marketing', 'brand', 'advertising', 'social media', 'content', 'seo',
  'sales', 'account executive', 'business development', 'account manager',
  'operations', 'logistics', 'supply chain', 'procurement',
  'finance', 'accounting', 'bookkeeping', 'analyst', 'controller',
  'customer service', 'support', 'representative',
  'designer', 'graphic design', 'ui/ux', 'product design',
  'manager', 'director', 'coordinator', 'specialist', 'assistant',
  'administrative', 'executive assistant', 'office manager',
  'legal', 'lawyer', 'paralegal', 'compliance',
  'healthcare', 'nurse', 'doctor', 'medical',
  'education', 'teacher', 'instructor', 'trainer',
  'consultant', 'advisor', 'strategist'
];

/**
 * Check if a job is technical based on title, department, skills, and description
 */
export function isTechnicalJob(job: Job): boolean {
  const searchText = [
    job.title,
    job.department,
    job.description,
    ...(job.skills || [])
  ].join(' ').toLowerCase();

  // Count technical and non-technical keyword matches
  const technicalMatches = TECHNICAL_KEYWORDS.filter(keyword => 
    searchText.includes(keyword.toLowerCase())
  ).length;

  const nonTechnicalMatches = NON_TECHNICAL_KEYWORDS.filter(keyword => 
    searchText.includes(keyword.toLowerCase())
  ).length;

  // If technical keywords significantly outweigh non-technical, it's technical
  // Also consider department (Engineering, IT, Tech, etc.)
  const technicalDepartments = ['engineering', 'it', 'technology', 'tech', 'development', 'dev', 'product'];
  const isTechnicalDepartment = technicalDepartments.some(dept => 
    job.department?.toLowerCase().includes(dept)
  );

  // Decision logic
  if (isTechnicalDepartment) {
    return true;
  }

  if (technicalMatches > 0 && technicalMatches >= nonTechnicalMatches * 1.5) {
    return true;
  }

  // If no clear indicators, default to false (non-technical)
  return false;
}

/**
 * Determine the best sources for a job and how to distribute candidates
 * 
 * Rules:
 * - Technical jobs: Prioritize LinkedIn → GitHub → MightyRecruiter → JobSpider
 *   (LinkedIn is MORE comprehensive: work history, education, skills, experience levels)
 * - Non-technical jobs: LinkedIn → MightyRecruiter → JobSpider (skip GitHub)
 * - If job could benefit from multiple sources, split candidates unequally (favor LinkedIn)
 * 
 * Why LinkedIn is prioritized:
 * - More comprehensive profiles (full work history, education, career progression)
 * - Better for experience levels (senior, mid, junior with actual work history)
 * - Covers all industries and roles (not just active GitHub contributors)
 * - Better matching for remote roles and location preferences
 * - Includes soft skills, endorsements, recommendations
 * 
 * GitHub is complementary for technical roles:
 * - Shows actual code contributions and projects
 * - Good for developers who actively code
 * - But misses many qualified candidates (not everyone has an active GitHub)
 * 
 * FREE sources that provide candidate profiles (job seekers):
 * - LinkedIn: Professional profiles (all industries) - via Apify
 * - GitHub: Developer profiles (technical roles) - FREE API
 * - MightyRecruiter: Resume database (21M+ resumes, all roles) - FREE
 * - JobSpider: Resume database (all roles) - FREE
 */
export function recommendSources(
  job: Job,
  maxCandidates: number,
  availableSources: SourceType[] = ['linkedin', 'github', 'mightyrecruiter', 'jobspider']
): SourceRecommendation[] {
  const recommendations: SourceRecommendation[] = [];
  const isTechnical = isTechnicalJob(job);

  logger.info(`Analyzing job: "${job.title}" (${job.department}) - Technical: ${isTechnical}`);

  // Filter to only available sources that provide candidate profiles (job seekers)
  const sources = availableSources.filter(src => {
    // GitHub only makes sense for technical jobs (developer profiles)
    if (src === 'github' && !isTechnical) {
      logger.info(`Skipping GitHub for non-technical job: ${job.title}`);
      return false;
    }
    // All other sources work for both technical and non-technical (resume databases)
    return src === 'linkedin' || src === 'github' || src === 'mightyrecruiter' || src === 'jobspider';
  });

  if (sources.length === 0) {
    logger.warn(`No suitable sources found for job: ${job.title}`);
    return [];
  }

  // Calculate weighted distribution (LinkedIn gets more for comprehensive profiles)
  let totalWeight = 0;
  const sourceWeights: { source: SourceType; weight: number }[] = [];
  
  if (isTechnical) {
    // Technical: LinkedIn (60%), GitHub (30%), Others (10%)
    sources.forEach(source => {
      let weight: number;
      if (source === 'linkedin') {
        weight = 6;
      } else if (source === 'github') {
        weight = 3;
      } else {
        weight = 1;
      }
      sourceWeights.push({ source, weight });
      totalWeight += weight;
    });
  } else {
    // Non-technical: LinkedIn (70%), Others (30%)
    sources.forEach(source => {
      let weight: number;
      if (source === 'linkedin') {
        weight = 7;
      } else {
        weight = 3;
      }
      sourceWeights.push({ source, weight });
      totalWeight += weight;
    });
  }

  // Distribute candidates based on weights, with remainder going to highest priority
  sourceWeights.forEach(({ source, weight }) => {
    const quota = Math.floor((maxCandidates * weight) / totalWeight);
    
    let priority: number;
    let reason: string;

    if (isTechnical) {
      // Technical jobs: LinkedIn > GitHub > MightyRecruiter > JobSpider
      if (source === 'linkedin') {
        priority = 4;
        reason = 'LinkedIn provides comprehensive professional profiles with full work history, education, and skills (MOST comprehensive for tech roles)';
      } else if (source === 'github') {
        priority = 3;
        reason = 'GitHub provides developer profiles with actual code and contributions (complementary to LinkedIn)';
      } else if (source === 'mightyrecruiter') {
        priority = 2;
        reason = 'MightyRecruiter has 21M+ resumes including technical professionals (FREE)';
      } else if (source === 'jobspider') {
        priority = 1;
        reason = 'JobSpider resume database includes technical job seekers (FREE)';
      }
    } else {
      // Non-technical jobs: LinkedIn > MightyRecruiter > JobSpider (GitHub skipped)
      if (source === 'linkedin') {
        priority = 3;
        reason = 'LinkedIn is the primary source for non-technical roles - covers all industries';
      } else if (source === 'mightyrecruiter') {
        priority = 2;
        reason = 'MightyRecruiter has 21M+ resumes from all industries (FREE)';
      } else if (source === 'jobspider') {
        priority = 1;
        reason = 'JobSpider resume database includes job seekers from all industries (FREE)';
      }
    }

    recommendations.push({
      source,
      priority,
      quota,
      reason
    });
  });

  // Add remainder to highest priority source (LinkedIn for technical, LinkedIn for non-technical)
  const totalQuota = recommendations.reduce((sum, r) => sum + r.quota, 0);
  const remainder = maxCandidates - totalQuota;
  if (remainder > 0 && recommendations.length > 0) {
    recommendations[0].quota += remainder;
  }

  // Sort by priority (highest first)
  recommendations.sort((a, b) => b.priority - a.priority);

  logger.info(`Recommended sources for "${job.title}":`, 
    recommendations.map(r => `${r.source} (${r.quota} candidates, priority: ${r.priority})`).join(', ')
  );

  return recommendations;
}

/**
 * Get the priority order of sources for a job (for fallback logic)
 */
export function getSourcePriority(job: Job, availableSources: SourceType[] = ['linkedin', 'github', 'mightyrecruiter', 'jobspider']): SourceType[] {
  const isTechnical = isTechnicalJob(job);
  
  if (isTechnical) {
    // Technical: LinkedIn → GitHub → MightyRecruiter → JobSpider
    // LinkedIn first because it's more comprehensive (work history, education, skills)
    return (['linkedin', 'github', 'mightyrecruiter', 'jobspider'] as SourceType[]).filter(src => availableSources.includes(src));
  } else {
    // Non-technical: LinkedIn → MightyRecruiter → JobSpider (no GitHub)
    return (['linkedin', 'mightyrecruiter', 'jobspider'] as SourceType[]).filter(src => availableSources.includes(src));
  }
}

