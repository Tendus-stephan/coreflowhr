/**
 * Build provider-specific queries from job requirements
 */

import { Job, LinkedInQuery, GitHubQuery, JobBoardQuery } from '../types';

export function buildLinkedInQuery(job: Job, maxResults: number = 50): LinkedInQuery {
  return {
    jobTitle: job.title,
    skills: job.skills || [],
    location: job.location,
    experienceLevel: job.experienceLevel,
    maxResults
  };
}

export function buildGitHubQuery(job: Job, maxResults: number = 50): GitHubQuery {
  // Extract programming languages from skills
  const languages = extractLanguages(job.skills || []);
  
  // Build keywords from job title and description
  const keywords = extractKeywords(job.title, job.description || '');

  return {
    language: languages[0], // Use primary language
    location: job.location,
    keywords,
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
 * Extract keywords from job title and description
 */
function extractKeywords(title: string, description: string): string[] {
  const keywords: string[] = [];
  
  // Add job title words (excluding common words)
  const titleWords = title.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  titleWords.forEach(word => {
    if (word.length > 3 && !stopWords.includes(word)) {
      keywords.push(word);
    }
  });

  // Extract key terms from description (first 200 chars)
  const descSnippet = description.substring(0, 200).toLowerCase();
  const techTerms = descSnippet.match(/\b\w{4,}\b/g) || [];
  keywords.push(...techTerms.slice(0, 5)); // Limit to 5 additional keywords

  return [...new Set(keywords)]; // Remove duplicates
}


