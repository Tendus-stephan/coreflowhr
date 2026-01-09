/**
 * Candidate data processing: normalization, validation, and match scoring
 */

import { ScrapedCandidate, Job } from '../types';
import { logger } from '../utils/logger';

export interface ProcessedCandidate extends ScrapedCandidate {
  isValid: boolean;
  matchScore: number;
  validationErrors: string[];
}

export class CandidateProcessor {
  /**
   * Process and validate scraped candidate data
   */
  processCandidate(candidate: ScrapedCandidate, job: Job): ProcessedCandidate {
    const validationErrors: string[] = [];
    
    // Validate required fields
    if (!candidate.name || candidate.name.trim().length === 0) {
      validationErrors.push('Missing name');
    }

    if (!candidate.skills || candidate.skills.length === 0) {
      validationErrors.push('Missing skills');
    }

    // Normalize data
    const normalized: ScrapedCandidate = {
      ...candidate,
      name: candidate.name?.trim() || '',
      email: candidate.email?.toLowerCase().trim(),
      location: candidate.location?.trim(),
      skills: this.normalizeSkills(candidate.skills),
      resumeSummary: candidate.resumeSummary || this.generateResumeSummary(candidate, job)
    };

    // Calculate match score
    const matchScore = this.calculateMatchScore(normalized, job);

    const isValid = validationErrors.length === 0 && normalized.name.length > 0;

    return {
      ...normalized,
      isValid,
      matchScore,
      validationErrors
    };
  }

  /**
   * Normalize skills array (remove duplicates, capitalize properly)
   */
  private normalizeSkills(skills: string[]): string[] {
    const normalized = skills
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0)
      .map(skill => {
        // Capitalize first letter of each word
        return skill.split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      });

    // Remove duplicates (case-insensitive)
    const unique: string[] = [];
    const seen = new Set<string>();
    
    for (const skill of normalized) {
      const lower = skill.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(skill);
      }
    }

    return unique;
  }

  /**
   * Calculate match score based on job requirements
   */
  private calculateMatchScore(candidate: ScrapedCandidate, job: Job): number {
    let score = 0;
    const maxScore = 100;

    // Skills matching (60% weight)
    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
    const candidateSkills = candidate.skills.map(s => s.toLowerCase());
    
    const matchingSkills = candidateSkills.filter(skill => 
      jobSkills.some(jobSkill => 
        skill === jobSkill || 
        skill.includes(jobSkill) || 
        jobSkill.includes(skill)
      )
    );

    const skillsMatchRatio = jobSkills.length > 0 
      ? matchingSkills.length / jobSkills.length 
      : 0.5; // Default if no job skills specified

    score += skillsMatchRatio * 60;

    // Experience matching (20% weight)
    if (job.experienceLevel && candidate.experience !== undefined) {
      const experienceMatch = this.matchExperience(candidate.experience, job.experienceLevel);
      score += experienceMatch * 20;
    } else {
      score += 10; // Default if no experience requirement
    }

    // Location matching (10% weight)
    if (job.location && candidate.location) {
      const locationMatch = this.matchLocation(candidate.location, job.location);
      score += locationMatch * 10;
    } else {
      score += 5; // Default if no location specified
    }

    // Profile completeness (10% weight)
    const completeness = this.calculateCompleteness(candidate);
    score += completeness * 10;

    // Ensure score is between 0-100
    return Math.min(maxScore, Math.max(0, Math.round(score)));
  }

  /**
   * Match candidate experience with job requirements
   */
  private matchExperience(candidateExp: number, jobLevel: string): number {
    const level = jobLevel.toLowerCase();
    
    if (level.includes('senior') || level.includes('5+') || level.includes('lead')) {
      return candidateExp >= 5 ? 1.0 : candidateExp >= 3 ? 0.7 : 0.3;
    } else if (level.includes('mid') || level.includes('2-5') || level.includes('intermediate')) {
      return candidateExp >= 2 && candidateExp < 5 ? 1.0 : candidateExp >= 1 ? 0.7 : 0.3;
    } else if (level.includes('junior') || level.includes('entry') || level.includes('0-2')) {
      return candidateExp <= 2 ? 1.0 : candidateExp <= 3 ? 0.7 : 0.5;
    }

    return 0.7; // Default match
  }

  /**
   * Match candidate location with job location
   */
  private matchLocation(candidateLoc: string, jobLoc: string): number {
    const candidateLower = candidateLoc.toLowerCase();
    const jobLower = jobLoc.toLowerCase();

    // Exact match
    if (candidateLower === jobLower) return 1.0;

    // City match (e.g., "New York" in "New York, NY")
    if (candidateLower.includes(jobLower) || jobLower.includes(candidateLower)) {
      return 0.8;
    }

    // State/Country match
    const candidateState = candidateLower.split(',').pop()?.trim();
    const jobState = jobLower.split(',').pop()?.trim();
    if (candidateState === jobState) return 0.6;

    // Remote match
    if (jobLower.includes('remote') || candidateLower.includes('remote')) {
      return 0.9;
    }

    return 0.3; // Low match for different locations
  }

  /**
   * Calculate profile completeness score
   */
  private calculateCompleteness(candidate: ScrapedCandidate): number {
    let completeness = 0;
    let factors = 0;

    if (candidate.name) { completeness += 1; factors++; }
    if (candidate.email) { completeness += 1; factors++; }
    if (candidate.location) { completeness += 1; factors++; }
    if (candidate.experience !== undefined) { completeness += 1; factors++; }
    if (candidate.skills && candidate.skills.length > 0) { completeness += 1; factors++; }
    if (candidate.resumeSummary) { completeness += 1; factors++; }
    if (candidate.workExperience && candidate.workExperience.length > 0) { completeness += 0.5; factors++; }
    if (candidate.portfolioUrls) { completeness += 0.5; factors++; }

    return factors > 0 ? completeness / factors : 0;
  }

  /**
   * Generate resume summary if not provided
   */
  private generateResumeSummary(candidate: ScrapedCandidate, job: Job): string {
    const parts: string[] = [];

    if (candidate.experience) {
      parts.push(`Professional with ${candidate.experience} years of experience`);
    } else {
      parts.push('Experienced professional');
    }

    if (candidate.skills.length > 0) {
      const topSkills = candidate.skills.slice(0, 3).join(', ');
      parts.push(`specializing in ${topSkills}`);
    }

    if (candidate.location) {
      parts.push(`based in ${candidate.location}`);
    }

    parts.push(`seeking opportunities in ${job.title}`);

    return parts.join(' ') + '.';
  }
}


