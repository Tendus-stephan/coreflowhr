/**
 * Job-seeking signal detection
 * Analyzes public profile data to identify passive indicators that candidates are open to opportunities
 */

import { ScrapedCandidate } from '../types';
import { logger } from './logger';

export interface JobSeekingSignals {
  hasOpenToWorkBadge: boolean; // LinkedIn "Open to work" badge (if detectable)
  hasJobSeekingLanguage: boolean; // Bio/summary contains job-seeking phrases
  hasCareerTransition: boolean; // Career gap, short tenure, end dates
  hasRecentActivity: boolean; // Recent profile updates, posts
  signalStrength: number; // 0-100 score indicating likelihood of job seeking
  detectedSignals: string[]; // Human-readable list of detected signals
}

/**
 * Job-seeking language patterns to detect in bios/summaries
 */
const JOB_SEEKING_PATTERNS = [
  'open to',
  'looking for',
  'seeking',
  'available',
  'actively',
  'next opportunity',
  'next challenge',
  'next role',
  'new opportunity',
  'new challenge',
  'career change',
  'freelance',
  'consulting',
  'contract work',
  'exploring',
  'considering',
  'interested in'
];

/**
 * Career transition indicators
 */
const TRANSITION_PATTERNS = [
  'contract',
  'freelance',
  'consultant',
  'temporary',
  'short-term',
  'transition',
  'between'
];

/**
 * Analyze candidate profile for job-seeking signals
 */
export function detectJobSeekingSignals(candidate: ScrapedCandidate): JobSeekingSignals {
  const signals: JobSeekingSignals = {
    hasOpenToWorkBadge: false,
    hasJobSeekingLanguage: false,
    hasCareerTransition: false,
    hasRecentActivity: false,
    signalStrength: 0,
    detectedSignals: []
  };

  // Check rawData for openToWork and hiring flags (from Apify harvestapi)
  const rawData = candidate.rawData || {};
  const openToWork = rawData.openToWork === true;
  const isHiring = rawData.hiring === true;
  
  // Strongest signal: LinkedIn "Open to work" badge
  if (openToWork) {
    signals.hasOpenToWorkBadge = true;
    signals.detectedSignals.push('LinkedIn "Open to work" badge');
    signals.signalStrength += 50; // Strong signal
  }
  
  // Negative signal: Actively hiring (less likely to be job-seeking)
  if (isHiring) {
    signals.detectedSignals.push('Actively hiring (may not be job-seeking)');
    signals.signalStrength -= 20; // Reduce priority
  }

  const textToAnalyze = [
    candidate.resumeSummary || '',
    candidate.workExperience?.map(exp => `${exp.role} ${exp.company} ${exp.description || ''}`).join(' ') || '',
    candidate.portfolioUrls?.website || ''
  ].join(' ').toLowerCase();

  // 1. Check for job-seeking language in bio/summary
  for (const pattern of JOB_SEEKING_PATTERNS) {
    if (textToAnalyze.includes(pattern)) {
      signals.hasJobSeekingLanguage = true;
      signals.detectedSignals.push(`Job-seeking language detected: "${pattern}"`);
      signals.signalStrength += 25;
      break;
    }
  }

  // 2. Check for career transition indicators
  for (const pattern of TRANSITION_PATTERNS) {
    if (textToAnalyze.includes(pattern)) {
      signals.hasCareerTransition = true;
      signals.detectedSignals.push(`Career transition signal: "${pattern}"`);
      signals.signalStrength += 20;
      break;
    }
  }

  // 3. Analyze work experience for transition signals
  if (candidate.workExperience && candidate.workExperience.length > 0) {
    // Check for short tenure (< 1 year) at current/most recent role
    const recentRoles = candidate.workExperience.slice(0, 2);
    const hasShortTenure = recentRoles.some(exp => {
      // Look for duration indicators (approximate)
      if (exp.duration) {
        const duration = exp.duration.toLowerCase();
        if (duration.includes('month') && !duration.includes('year')) {
          return true;
        }
      }
      return false;
    });

    if (hasShortTenure) {
      signals.hasCareerTransition = true;
      signals.detectedSignals.push('Short tenure at current/recent role');
      signals.signalStrength += 15;
    }

    // Check for end dates (indicates between jobs or available)
    const hasEndDates = recentRoles.some(exp => {
      // If role description or company name suggests contract/temporary
      const roleText = `${exp.role} ${exp.company} ${exp.description || ''}`.toLowerCase();
      return roleText.includes('contract') || roleText.includes('temporary') || 
             roleText.includes('freelance') || roleText.includes('consultant');
    });

    if (hasEndDates) {
      signals.hasCareerTransition = true;
      signals.detectedSignals.push('Contract/freelance work history');
      signals.signalStrength += 15;
    }
    
    // Check for recent position end dates (indicates between jobs or available)
    const recentRole = candidate.workExperience[0];
    if (recentRole.duration && !recentRole.duration.includes('Present')) {
      // Check if end date is recent (within last year)
      const endDateMatch = recentRole.duration.match(/(\d{4})/);
      if (endDateMatch) {
        const endYear = parseInt(endDateMatch[1]);
        const currentYear = new Date().getFullYear();
        if (endYear >= currentYear - 1) {
          signals.hasCareerTransition = true;
          signals.detectedSignals.push('Recent position end date');
          signals.signalStrength += 20;
        }
      }
    }
  }

  // 4. Check for profile freshness (recent activity)
  // Note: We can't detect LinkedIn "Open to work" badge without scraping LinkedIn HTML
  // But we can check GitHub profile updates (if available in future)
  // For now, we'll assume active GitHub profiles are more likely to be engaged
  if (candidate.source === 'github' && candidate.profileUrl) {
    // Active GitHub profiles with recent commits are indicators of engagement
    // This is a weak signal but still useful
    signals.hasRecentActivity = true;
    signals.signalStrength += 5;
  }

  // Cap signal strength at 100 (but allow negative for hiring flag)
  signals.signalStrength = Math.max(-20, Math.min(signals.signalStrength, 100));

  if (signals.detectedSignals.length > 0) {
    logger.debug(`Job-seeking signals detected for ${candidate.name}: ${signals.detectedSignals.join(', ')} (strength: ${signals.signalStrength})`);
  }

  return signals;
}

/**
 * Boost match score based on job-seeking signals
 * Candidates with stronger signals get a boost, as they're more likely to respond
 */
export function applyJobSeekingBoost(baseMatchScore: number, signals: JobSeekingSignals): number {
  // Add boost based on signal strength (max +15 points)
  const boost = Math.floor(signals.signalStrength / 6.67); // 100 -> 15, 50 -> 7.5, etc.
  const boostedScore = Math.min(baseMatchScore + boost, 100);
  
  if (boost > 0) {
    logger.debug(`Applied job-seeking boost: +${boost} points (${baseMatchScore} -> ${boostedScore})`);
  }
  
  return boostedScore;
}

/**
 * Check if candidate should be prioritized (high job-seeking signals)
 */
export function shouldPrioritizeCandidate(signals: JobSeekingSignals, threshold: number = 30): boolean {
  return signals.signalStrength >= threshold;
}


