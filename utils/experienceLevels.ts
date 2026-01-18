/**
 * Experience level definitions with accurate year ranges
 * Used across the application for consistency
 */

export interface ExperienceLevel {
  label: string;
  value: string;
  minYears: number;
  maxYears: number | null; // null means no upper limit
  description: string;
}

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  {
    label: 'Entry Level',
    value: 'Entry Level (0-2 years)',
    minYears: 0,
    maxYears: 2,
    description: '0-2 years of experience'
  },
  {
    label: 'Mid Level',
    value: 'Mid Level (2-5 years)',
    minYears: 2,
    maxYears: 5,
    description: '2-5 years of experience'
  },
  {
    label: 'Senior Level',
    value: 'Senior Level (5+ years)',
    minYears: 5,
    maxYears: null,
    description: '5+ years of experience'
  }
];

/**
 * Get experience level by value
 */
export function getExperienceLevel(value: string): ExperienceLevel | undefined {
  return EXPERIENCE_LEVELS.find(level => level.value === value || level.label === value);
}

/**
 * Check if candidate experience matches job requirement
 */
export function matchesExperienceLevel(
  candidateYears: number,
  jobLevel: string
): { matches: boolean; reason?: string } {
  const level = getExperienceLevel(jobLevel);
  if (!level) {
    return { matches: true }; // If level not recognized, allow it
  }

  if (level.maxYears === null) {
    // Senior level (5+ years)
    if (candidateYears < level.minYears) {
      return {
        matches: false,
        reason: `Candidate has ${candidateYears} years but job requires ${level.minYears}+ years (${level.label})`
      };
    }
  } else {
    // Entry or Mid level (has max)
    if (candidateYears < level.minYears) {
      return {
        matches: false,
        reason: `Candidate has ${candidateYears} years but job requires ${level.minYears}-${level.maxYears} years (${level.label})`
      };
    }
    // For entry level, reject overqualified candidates (more than 2 years over max)
    if (level.minYears === 0 && candidateYears > level.maxYears + 2) {
      return {
        matches: false,
        reason: `Candidate has ${candidateYears} years but job is entry level (0-${level.maxYears} years) - overqualified`
      };
    }
    // For mid level, reject significantly overqualified candidates (more than 3 years over max)
    if (level.minYears === 2 && candidateYears > level.maxYears + 3) {
      return {
        matches: false,
        reason: `Candidate has ${candidateYears} years but job requires ${level.minYears}-${level.maxYears} years (${level.label}) - overqualified`
      };
    }
  }

  return { matches: true };
}

/**
 * Parse experience level string to get min/max years
 */
export function parseExperienceLevel(level: string): { level: string; minYears: number; maxYears: number | null } {
  const found = getExperienceLevel(level);
  if (found) {
    return {
      level: found.label.toLowerCase().replace(' ', '-'),
      minYears: found.minYears,
      maxYears: found.maxYears
    };
  }

  // Fallback parsing for legacy formats
  const levelLower = level.toLowerCase();
  
  if (levelLower.includes('senior') || levelLower.includes('sr') || levelLower.includes('lead') || levelLower.includes('principal')) {
    const yearMatch = level.match(/(\d+)\s*\+/);
    const minYears = yearMatch ? parseInt(yearMatch[1]) : 5;
    return { level: 'senior', minYears, maxYears: null };
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
