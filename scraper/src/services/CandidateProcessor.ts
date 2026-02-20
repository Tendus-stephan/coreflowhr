/**
 * Candidate data processing: normalization, validation, and match scoring
 */

import { ScrapedCandidate, Job } from '../types';
import { logger } from '../utils/logger';
import { detectJobSeekingSignals, applyJobSeekingBoost } from '../utils/jobSeekingSignals';

export interface ProcessedCandidate extends ScrapedCandidate {
  isValid: boolean;
  matchScore: number;
  validationErrors: string[];
  jobSeekingSignals?: {
    signalStrength: number;
    detectedSignals: string[];
  };
}

export class CandidateProcessor {
  /**
   * Process and validate scraped candidate data
   */
  processCandidate(candidate: ScrapedCandidate, job: Job): ProcessedCandidate {
    const validationErrors: string[] = [];
    
    // Validate required fields
    // Allow "Unknown Candidate" since we extract it from URL as fallback
    if (!candidate.name || candidate.name.trim().length === 0) {
      validationErrors.push('Missing name');
    }

    // SOFT LOCATION CHECK: Only hard-reject if candidate is clearly in a different country.
    // Suburb/borough mismatches (e.g. "Barking, England" for a "London" job) are handled
    // by the match score, not by rejection.
    if (!job.remote && job.location && candidate.location) {
      if (this.isClearlyDifferentCountry(candidate.location, job.location)) {
        validationErrors.push(`Location mismatch: candidate in "${candidate.location}" — different country from "${job.location}"`);
      }
    }

    // SOFT EXPERIENCE CHECK: Only hard-reject if experience data is clearly a parsing error
    // (negative years or the 40-year cap was hit, suggesting bad data). Over/under-qualification
    // is communicated to the user via the AI match score.
    if (candidate.experience !== undefined) {
      if (candidate.experience < 0) {
        validationErrors.push(`Invalid experience: ${candidate.experience} years (negative)`);
      } else if (candidate.experience >= 40) {
        validationErrors.push(`Experience data likely invalid: ${candidate.experience} years (hit parsing cap — profile may have overlapping roles)`);
      }
    }

    // Skills are optional - extract from summary if missing, but don't fail validation
    let candidateSkills = candidate.skills || [];
    if (candidateSkills.length === 0 && candidate.resumeSummary) {
      // Try to extract basic tech keywords from summary as fallback
      const techKeywords = ['JavaScript', 'React', 'Python', 'Java', 'TypeScript', 'Node', 'SQL', 'HTML', 'CSS', 'Git', 'Angular', 'Vue', 'PHP', 'Ruby', 'Go', 'C++', 'C#', 'Swift', 'Kotlin'];
      const foundSkills = techKeywords.filter(keyword => 
        candidate.resumeSummary.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundSkills.length > 0) {
        candidateSkills = foundSkills;
      }
    }
    // If still no skills, use empty array (validation will pass)

    // Normalize data
    // Handle location - it might be a string or an object
    let locationString: string | undefined;
    if (typeof candidate.location === 'string') {
      locationString = candidate.location.trim() || undefined;
    } else if (candidate.location && typeof candidate.location === 'object') {
      // Location is an object, extract as string
      const loc: any = candidate.location as any;
      const locationParts: string[] = [];
      if (loc.city) locationParts.push(String(loc.city));
      if (loc.country) locationParts.push(String(loc.country));
      if (loc.region) locationParts.push(String(loc.region));
      locationString = locationParts.length > 0 ? locationParts.join(', ') : undefined;
    }
    
    // Normalize email - if empty/invalid, set to undefined (not a random value)
    let normalizedEmail: string | undefined = candidate.email?.toLowerCase().trim();
    if (normalizedEmail && (normalizedEmail === '' || !normalizedEmail.includes('@'))) {
      normalizedEmail = undefined; // Invalid email format
    }
    
    const normalized: ScrapedCandidate = {
      ...candidate,
      name: candidate.name?.trim() || '',
      email: normalizedEmail,
      location: locationString,
      skills: this.normalizeSkills(candidateSkills),
      resumeSummary: candidate.resumeSummary || this.generateResumeSummary(candidate, job)
    };

    // Calculate base match score
    let matchScore = this.calculateMatchScore(normalized, job);

    // Detect job-seeking signals and apply boost
    const jobSeekingSignals = detectJobSeekingSignals(normalized);
    if (jobSeekingSignals.signalStrength > 0) {
      matchScore = applyJobSeekingBoost(matchScore, jobSeekingSignals);
      logger.debug(`Candidate ${normalized.name}: Job-seeking signals detected (strength: ${jobSeekingSignals.signalStrength}) - boosted score from ${this.calculateMatchScore(normalized, job)} to ${matchScore}`);
    }

    const isValid = validationErrors.length === 0 && normalized.name.length > 0;

    return {
      ...normalized,
      isValid,
      matchScore,
      validationErrors,
      jobSeekingSignals: {
        signalStrength: jobSeekingSignals.signalStrength,
        detectedSignals: jobSeekingSignals.detectedSignals
      }
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
   * Uses standardized experience levels: Entry (0-2), Mid (2-5), Senior (5+)
   */
  private matchExperience(candidateExp: number, jobLevel: string): number {
    const jobExpLevel = this.parseExperienceLevel(jobLevel);
    
    if (jobExpLevel.level === 'senior') {
      // Senior level (5+ years)
      if (candidateExp >= jobExpLevel.minYears) {
        return 1.0; // Perfect match
      } else if (candidateExp >= jobExpLevel.minYears - 2) {
        return 0.7; // Close match (3-4 years for 5+ requirement)
      } else {
        return 0.3; // Poor match
      }
    } else if (jobExpLevel.level === 'mid') {
      // Mid level (2-5 years)
      if (candidateExp >= jobExpLevel.minYears && candidateExp <= (jobExpLevel.maxYears || 5)) {
        return 1.0; // Perfect match
      } else if (candidateExp >= jobExpLevel.minYears - 1 && candidateExp <= (jobExpLevel.maxYears || 5) + 2) {
        return 0.7; // Close match (1-7 years for 2-5 requirement)
      } else {
        return 0.3; // Poor match
      }
    } else if (jobExpLevel.level === 'entry') {
      // Entry level (0-2 years)
      if (candidateExp <= (jobExpLevel.maxYears || 2)) {
        return 1.0; // Perfect match
      } else if (candidateExp <= (jobExpLevel.maxYears || 2) + 2) {
        return 0.7; // Close match (0-4 years for 0-2 requirement)
      } else {
        return 0.5; // Overqualified but still acceptable
      }
    }

    return 0.7; // Default match
  }

  /**
   * Hard-reject only when candidate and job are in clearly different countries.
   * Suburb/borough mismatches within the same country are allowed through (scored lower).
   */
  private isClearlyDifferentCountry(candidateLoc: string, jobLoc: string): boolean {
    const candLower = candidateLoc.toLowerCase().trim();
    const jobLower = jobLoc.toLowerCase().trim();

    // Country keyword sets — if both locations contain keywords but from different groups, reject
    const countryGroups: string[][] = [
      ['united states', 'usa', ', us', ' us ', 'new york', 'california', 'texas', 'chicago', 'los angeles', 'san francisco'],
      ['united kingdom', 'england', 'scotland', 'wales', ', uk', 'london', 'manchester', 'birmingham', 'edinburgh'],
      ['canada', 'toronto', 'vancouver', 'montreal', 'ontario', 'british columbia'],
      ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'],
      ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'deutschland'],
      ['france', 'paris', 'lyon', 'marseille'],
      ['india', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune'],
      ['netherlands', 'amsterdam', 'rotterdam', 'the hague'],
      ['sweden', 'stockholm', 'gothenburg', 'malmö'],
      ['singapore'],
      ['dubai', 'uae', 'united arab emirates'],
    ];

    let candGroup = -1;
    let jobGroup = -1;
    for (let i = 0; i < countryGroups.length; i++) {
      if (countryGroups[i].some(kw => candLower.includes(kw))) candGroup = i;
      if (countryGroups[i].some(kw => jobLower.includes(kw))) jobGroup = i;
    }

    // Only reject if BOTH are identified AND they belong to different groups
    if (candGroup !== -1 && jobGroup !== -1 && candGroup !== jobGroup) {
      return true;
    }
    return false;
  }

  /**
   * Check if candidate location matches job location (strict - same city/state/country only)
   */
  private isLocationMatch(candidateLoc: string, jobLoc: string): boolean {
    const candidateLower = candidateLoc.toLowerCase().trim();
    const jobLower = jobLoc.toLowerCase().trim();

    // Fast path: substring match (e.g. "London, England, UK" contains "london")
    if (candidateLower.includes(jobLower) || jobLower.includes(candidateLower)) {
      return true;
    }

    const candidateParts = this.parseLocation(candidateLower);
    const jobParts = this.parseLocation(jobLower);

    // City match (either side)
    if (candidateParts.city && jobParts.city && candidateParts.city === jobParts.city) {
      return true;
    }

    // State match
    if (candidateParts.state && jobParts.state && candidateParts.state === jobParts.state) {
      return true;
    }

    // Country match
    if (candidateParts.country && jobParts.country && candidateParts.country === jobParts.country) {
      return true;
    }

    // Lenient fallback: if candidate has no city (e.g. "United Kingdom, UK") and
    // the job city is plausibly in the candidate's country/region, accept it.
    // We can't confirm the exact city so we give benefit of the doubt.
    if (!candidateParts.city && candidateParts.country) {
      // Accept if job location could be in that country (no way to confirm otherwise)
      return true;
    }

    return false;
  }

  /**
   * Parse location into city, state, country parts
   */
  private parseLocation(location: string): { city?: string; state?: string; country?: string } {
    const parts: { city?: string; state?: string; country?: string } = {};
    
    // Common patterns:
    // "City, State" (US)
    // "City, State, Country"
    // "City, Country"
    // "State, Country"
    // "Country"
    
    const segments = location.split(',').map(s => s.trim()).filter(Boolean);
    
    if (segments.length >= 3) {
      // "City, State, Country"
      parts.city = segments[0];
      parts.state = segments[1];
      parts.country = segments[2];
    } else if (segments.length === 2) {
      // Could be "City, State" or "City, Country" or "State, Country"
      // US states are typically 2 letters or full names
      const usStates = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'];
      const secondPart = segments[1].toLowerCase();
      if (usStates.includes(secondPart) || secondPart.length === 2) {
        // Likely "City, State"
        parts.city = segments[0];
        parts.state = segments[1];
      } else {
        // Likely "City, Country" or "State, Country"
        parts.city = segments[0];
        parts.country = segments[1];
      }
    } else if (segments.length === 1) {
      // Single segment - treat as city (e.g. "London", "Berlin")
      // Most job postings use a city name; country-only jobs are rare
      parts.city = segments[0];
    }
    
    return parts;
  }

  /**
   * Parse experience level from job requirement
   * Uses standardized experience levels: Entry (0-2), Mid (2-5), Senior (5+)
   */
  private parseExperienceLevel(level: string): { level: string; minYears: number; maxYears?: number } {
    const levelLower = level.toLowerCase();
    
    // Parse standardized format: "Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"
    const entryMatch = level.match(/entry\s*level\s*\((\d+)\s*[-–]\s*(\d+)\s*years?\)/i);
    if (entryMatch) {
      return { level: 'entry', minYears: parseInt(entryMatch[1]), maxYears: parseInt(entryMatch[2]) };
    }
    
    const midMatch = level.match(/mid\s*level\s*\((\d+)\s*[-–]\s*(\d+)\s*years?\)/i);
    if (midMatch) {
      return { level: 'mid', minYears: parseInt(midMatch[1]), maxYears: parseInt(midMatch[2]) };
    }
    
    const seniorMatch = level.match(/senior\s*level\s*\((\d+)\s*\+/i);
    if (seniorMatch) {
      return { level: 'senior', minYears: parseInt(seniorMatch[1]), maxYears: undefined };
    }
    
    // Fallback to keyword matching
    if (levelLower.includes('senior') || levelLower.includes('sr') || levelLower.includes('lead') || levelLower.includes('principal')) {
      // Extract years if mentioned (e.g., "Senior (5+ years)")
      const yearMatch = level.match(/(\d+)\s*\+/);
      const minYears = yearMatch ? parseInt(yearMatch[1]) : 5;
      return { level: 'senior', minYears, maxYears: undefined };
    } else if (levelLower.includes('mid') || levelLower.includes('middle') || levelLower.includes('intermediate')) {
      const yearMatch = level.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (yearMatch) {
        return { level: 'mid', minYears: parseInt(yearMatch[1]), maxYears: parseInt(yearMatch[2]) };
      }
      return { level: 'mid', minYears: 2, maxYears: 5 };
    } else if (levelLower.includes('junior') || levelLower.includes('jr') || levelLower.includes('entry') || levelLower.includes('associate')) {
      const yearMatch = level.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (yearMatch) {
        return { level: 'entry', minYears: parseInt(yearMatch[1]), maxYears: parseInt(yearMatch[2]) };
      }
      return { level: 'entry', minYears: 0, maxYears: 2 };
    }
    
    // Default: assume mid-level
    return { level: 'mid', minYears: 2, maxYears: 5 };
  }

  /**
   * Match candidate location with job location (for scoring, not filtering)
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
