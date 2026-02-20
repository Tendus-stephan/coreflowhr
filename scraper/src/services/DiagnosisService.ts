import { Job } from '../types';

export interface EmptyResultsDiagnosis {
  message: string;
  suggestion?: string | string[];
  action?:
    | 'edit_title'
    | 'edit_location'
    | 'reduce_skills'
    | 'broaden_title'
    | 'remove_location'
    | 'multiple_options';
}

export function simplifyTitle(title: string): string {
  let simple = title
    .replace(/senior\s+/gi, '')
    .replace(/junior\s+/gi, '')
    .replace(/lead\s+/gi, '')
    .replace(/principal\s+/gi, '')
    .replace(/staff\s+/gi, '');

  simple = simple
    .replace(/\(.*?\)/g, '')
    .replace(/with .*$/gi, '')
    .replace(/\d+\+?\s*years?/gi, '');

  return simple.trim();
}

function isCommonLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  const commonCities = [
    'London',
    'New York',
    'San Francisco',
    'Los Angeles',
    'Chicago',
    'Boston',
    'Seattle',
    'Austin',
    'Denver',
    'Miami',
    'Atlanta',
    'Paris',
    'Berlin',
    'Amsterdam',
    'Toronto',
    'Sydney',
    'Singapore',
    'Tokyo',
    'Dubai',
    'Mumbai',
    'Bangalore',
    'Hong Kong',
  ];

  const city = location.split(',')[0].trim();
  return commonCities.includes(city);
}

function isUnusualTitle(title: string): boolean {
  const commonTitles = [
    'software engineer',
    'developer',
    'product manager',
    'designer',
    'data analyst',
    'marketing manager',
    'sales',
    'customer success',
    'recruiter',
    'accountant',
  ];

  const lower = title.toLowerCase();
  return !commonTitles.some((common) => lower.includes(common));
}

function suggestSimilarTitle(title: string): string {
  const titleMap: Record<string, string> = {
    ninja: 'engineer',
    rockstar: 'engineer',
    wizard: 'engineer',
    guru: 'specialist',
    hacker: 'engineer',
    jedi: 'engineer',
  };

  let suggested = title.toLowerCase();
  for (const [slang, proper] of Object.entries(titleMap)) {
    suggested = suggested.replace(new RegExp(slang, 'gi'), proper);
  }

  return suggested;
}

export function diagnoseEmptyResults(job: Job): EmptyResultsDiagnosis {
  const title = (job.title || '').trim();
  const location = (job.location || '').trim();
  const skills = Array.isArray(job.skills) ? job.skills : [];

  if (title.length > 40 || title.split(' ').length > 5) {
    return {
      message: `Your job title "${title}" is very specific. Try a simpler title like "${simplifyTitle(
        title
      )}" for more results.`,
      suggestion: simplifyTitle(title),
      action: 'edit_title',
    };
  }

  if (location && !isCommonLocation(location)) {
    return {
      message: `Location "${location}" returned no results. Try just the city name (e.g. "London" instead of "${location}").`,
      suggestion: location.split(',')[0].trim(),
      action: 'edit_location',
    };
  }

  if (skills.length > 3) {
    return {
      message: `Your search has ${skills.length} required skills which is very restrictive. Try reducing to 1–2 key skills.`,
      suggestion: skills.slice(0, 2),
      action: 'reduce_skills',
    };
  }

  if (isUnusualTitle(title)) {
    return {
      message: `"${title}" is an uncommon job title on LinkedIn. Try "${suggestSimilarTitle(title)}" instead.`,
      suggestion: suggestSimilarTitle(title),
      action: 'edit_title',
    };
  }

  return {
    message: `No candidates found for "${title}" in "${location || 'Any location'}". This combination might be too specific. Try: 1) Remove location to search globally, or 2) Use a broader job title like "${simplifyTitle(
      title
    )}".`,
    suggestion: [ 'remove_location', simplifyTitle(title) ],
    action: 'multiple_options',
  };
}

export function makeBroaderSearchTitle(originalTitle: string): string {
  return simplifyTitle(originalTitle);
}

