/**
 * Build provider-specific queries from job requirements
 */

import { Job, LinkedInQuery, GitHubQuery, MightyRecruiterQuery, JobSpiderQuery, JobBoardQuery } from '../types';

export function buildLinkedInQuery(job: Job, maxResults: number = 50): LinkedInQuery {
  // Only use actual skills from job.skills array - don't extract from description (can get long sentences)
  // Filter out any skills that are too long (likely sentences, not actual skills)
  const actualSkills = (job.skills || []).filter(skill => {
    const trimmed = skill.trim();
    // Only keep skills that are short enough (max 50 chars) and don't contain multiple sentences
    return trimmed.length > 0 && trimmed.length <= 50 && !trimmed.includes('.') && trimmed.split(/\s+/).length <= 5;
  });
  
  // Only extract technical keywords from description if job.skills is empty
  // But limit to known technical terms, not random sentences
  let descriptionSkills: string[] = [];
  if (actualSkills.length === 0 && job.description) {
    descriptionSkills = extractSkillsFromDescription(job.description || '');
  }
  
  const allSkills = [...new Set([...actualSkills, ...descriptionSkills])];
  
  return {
    jobTitle: job.title,
    skills: allSkills,
    location: job.remote ? undefined : job.location, // Don't filter by location for remote jobs
    experienceLevel: job.experienceLevel,
    maxResults
  };
}

export function buildGitHubQuery(job: Job, maxResults: number = 50): GitHubQuery {
  // Extract programming languages from skills
  const languages = extractLanguages(job.skills || []);
  
  // Build keywords from job title + description + experience level for better matching
  const keywords = extractKeywords(job.title, job.description || '', job.experienceLevel);

  // For remote jobs, don't use location filtering (or use it less strictly)
  // For non-remote jobs, use location
  const location = job.remote ? undefined : job.location;

  return {
    language: languages[0], // Use primary language
    location,
    keywords,
    maxResults
  };
}

export function buildMightyRecruiterQuery(job: Job, maxResults: number = 50): MightyRecruiterQuery {
  // Extract additional skills from description
  const descriptionSkills = extractSkillsFromDescription(job.description || '');
  const allSkills = [...new Set([...(job.skills || []), ...descriptionSkills])];
  
  return {
    jobTitle: job.title,
    skills: allSkills,
    location: job.remote ? undefined : job.location, // Don't filter by location for remote jobs
    experienceLevel: job.experienceLevel,
    maxResults
  };
}

export function buildJobSpiderQuery(job: Job, maxResults: number = 50): JobSpiderQuery {
  // Extract additional skills from description
  const descriptionSkills = extractSkillsFromDescription(job.description || '');
  const allSkills = [...new Set([...(job.skills || []), ...descriptionSkills])];
  
  return {
    jobTitle: job.title,
    skills: allSkills,
    location: job.remote ? undefined : job.location, // Don't filter by location for remote jobs
    maxResults
  };
}

export function buildJobBoardQuery(job: Job, maxResults: number = 50): JobBoardQuery {
  return {
    jobTitle: job.title,
    skills: job.skills || [],
    location: job.location,
    maxResults
  };
}

/**
 * Extract programming languages from skills array
 */
function extractLanguages(skills: string[]): string[] {
  const languageMap: { [key: string]: string } = {
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'Python': 'python',
    'Java': 'java',
    'Go': 'go',
    'Rust': 'rust',
    'C++': 'cpp',
    'C#': 'csharp',
    'Ruby': 'ruby',
    'PHP': 'php',
    'Swift': 'swift',
    'Kotlin': 'kotlin',
    'Dart': 'dart',
    'R': 'r'
  };

  const languages: string[] = [];
  for (const skill of skills) {
    const normalized = skill.toLowerCase();
    for (const [key, value] of Object.entries(languageMap)) {
      if (normalized.includes(key.toLowerCase()) || normalized.includes(value)) {
        languages.push(value);
        break;
      }
    }
  }

  return languages.length > 0 ? languages : ['javascript']; // Default fallback
}

/**
 * Extract keywords from job title, description, and experience level
 * Optimized for technical roles - extracts relevant tech terms
 */
function extractKeywords(title: string, description: string, experienceLevel?: string): string[] {
  const keywords: string[] = [];
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'looking', 'company', 'will', 'should', 'have', 'has', 'are', 'is', 'was', 'were'];
  
  // Extract from job title first (most important)
  const titleWords = title.toLowerCase().split(/\s+/);
  titleWords.forEach(word => {
    const cleaned = word.replace(/[^a-z0-9]/g, ''); // Remove punctuation
    if (cleaned.length >= 4 && !stopWords.includes(cleaned)) {
      keywords.push(cleaned);
    }
  });

  // Add experience level keywords if present
  if (experienceLevel) {
    const levelWords = extractExperienceLevelKeywords(experienceLevel);
    keywords.push(...levelWords);
  }

  // Extract technical terms from description (frameworks, tools, etc.)
  if (description) {
    const techTerms = extractTechnicalTerms(description);
    keywords.push(...techTerms);
  }

  // Remove duplicates and limit to most relevant
  const uniqueKeywords = [...new Set(keywords)];
  
  // Prioritize: title words > experience level > tech terms
  // Limit to 4-5 keywords max for GitHub search effectiveness
  return uniqueKeywords.slice(0, 5);
}

/**
 * Extract experience level keywords (senior, mid-level, etc.)
 */
function extractExperienceLevelKeywords(level: string): string[] {
  const levelLower = level.toLowerCase();
  const keywords: string[] = [];
  
  // Common experience level keywords
  if (levelLower.includes('senior') || levelLower.includes('sr') || levelLower.includes('lead') || levelLower.includes('principal')) {
    keywords.push('senior');
  }
  if (levelLower.includes('mid') || levelLower.includes('middle') || levelLower.includes('intermediate')) {
    keywords.push('mid');
  }
  if (levelLower.includes('junior') || levelLower.includes('jr') || levelLower.includes('entry') || levelLower.includes('associate')) {
    keywords.push('junior');
  }
  
  return keywords;
}

/**
 * Extract technical terms from description (frameworks, libraries, tools)
 */
function extractTechnicalTerms(description: string): string[] {
  const techTerms: string[] = [];
  const descLower = description.toLowerCase();
  
  // Common technical frameworks and tools
  const technicalKeywords = [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'remix',
    'node.js', 'express', 'nestjs', 'fastify', 'koa',
    'django', 'flask', 'fastapi', 'rails', 'laravel', 'symfony',
    'spring', 'springboot', 'asp.net', 'dotnet',
    'typescript', 'javascript', 'python', 'java', 'go', 'rust', 'kotlin', 'swift',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb',
    'graphql', 'rest', 'api', 'microservices', 'serverless',
    'testing', 'jest', 'cypress', 'selenium', 'pytest', 'mocha',
    'ci/cd', 'jenkins', 'github actions', 'gitlab', 'circleci',
    'webpack', 'vite', 'rollup', 'esbuild',
    'tailwind', 'bootstrap', 'material-ui', 'chakra',
    'redux', 'mobx', 'zustand', 'recoil'
  ];
  
  // Find matching technical terms in description
  technicalKeywords.forEach(term => {
    if (descLower.includes(term)) {
      // Clean the term and add to keywords
      const cleaned = term.replace(/[^a-z0-9\s]/g, '').trim();
      if (cleaned.length >= 3) {
        techTerms.push(cleaned.split(/\s+/)[0]); // Take first word of multi-word terms
      }
    }
  });
  
  return techTerms.slice(0, 4); // Limit to top 4 technical terms
}

/**
 * Extract skills from job description
 */
function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  
  const skills: string[] = [];
  const descLower = description.toLowerCase();
  
  // Common technical and professional skills mentioned in job descriptions
  const skillKeywords = [
    // Languages
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    // Frameworks
    'react', 'vue', 'angular', 'node.js', 'django', 'flask', 'rails', 'laravel',
    // Tools & Technologies
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github',
    // Databases
    'mongodb', 'postgresql', 'mysql', 'redis', 'sql',
    // Soft skills
    'leadership', 'communication', 'collaboration', 'problem-solving', 'analytical',
    // Methodologies
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd'
  ];
  
  // Find matching skills in description
  skillKeywords.forEach(skill => {
    if (descLower.includes(skill)) {
      // Capitalize first letter for consistency
      skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  
  return [...new Set(skills)]; // Remove duplicates
}


