/**
 * Plan-based limits and privileges configuration
 * Defines sourcing limits, features, and privileges for each subscription plan
 */

export type PlanName = 'Basic' | 'Professional';

export interface PlanLimits {
  name: PlanName;
  maxCandidatesPerJob: number | 'Unlimited';
  maxActiveJobs: number | 'Unlimited';
  maxCandidatesPerMonth?: number | 'Unlimited';
  features: string[];
  sourcingSources: string[]; // Which sources are available
  aiAnalysis: boolean;
  advancedAnalytics: boolean;
  teamCollaboration: boolean;
  prioritySupport: boolean;
  customEmailTemplates: boolean;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  Basic: {
    name: 'Basic',
    maxCandidatesPerJob: 50,
    maxActiveJobs: 5,
    maxCandidatesPerMonth: 500,
    features: [
      'Up to 5 active jobs',
      'Up to 50 candidates per job',
      'Up to 500 candidates per month',
      'LinkedIn sourcing via Apify',
      'AI-powered candidate matching',
      'Email templates',
      'Basic analytics',
      'Email support',
    ],
    sourcingSources: ['linkedin'],
    aiAnalysis: true,
    advancedAnalytics: false,
    teamCollaboration: false,
    prioritySupport: false,
    customEmailTemplates: false,
  },
  Professional: {
    name: 'Professional',
    maxCandidatesPerJob: 'Unlimited',
    maxActiveJobs: 'Unlimited',
    maxCandidatesPerMonth: 'Unlimited',
    features: [
      'Unlimited active jobs',
      'Unlimited candidates per job',
      'Unlimited candidates per month',
      'LinkedIn sourcing via Apify',
      'Advanced AI matching',
      'Custom email templates',
      'Advanced analytics & reports',
      'Team collaboration',
      'Priority support',
      'API access',
    ],
    sourcingSources: ['linkedin'],
    aiAnalysis: true,
    advancedAnalytics: true,
    teamCollaboration: true,
    prioritySupport: true,
    customEmailTemplates: true,
  },
};

/**
 * Get plan limits for a given plan name
 */
export function getPlanLimits(planName: string | null | undefined): PlanLimits {
  // Normalize plan name
  const normalized = planName?.toLowerCase() || 'basic';
  
  if (normalized.includes('professional') || normalized.includes('pro')) {
    return PLAN_LIMITS.Professional;
  } else {
    // Default to Basic plan
    return PLAN_LIMITS.Basic;
  }
}

/**
 * Check if a plan allows a certain number of candidates per job
 */
export function canSourceCandidates(
  planName: string | null | undefined,
  requestedCount: number
): { allowed: boolean; maxAllowed: number | 'Unlimited'; message?: string } {
  const limits = getPlanLimits(planName);
  const maxAllowed = limits.maxCandidatesPerJob;

  if (maxAllowed === 'Unlimited') {
    return { allowed: true, maxAllowed: 'Unlimited' };
  }

  if (requestedCount <= maxAllowed) {
    return { allowed: true, maxAllowed };
  }

  return {
    allowed: false,
    maxAllowed,
    message: `Your ${limits.name} plan allows up to ${maxAllowed} candidates per job. Upgrade to Professional for unlimited candidates.`,
  };
}

/**
 * Get available sourcing sources for a plan
 */
export function getAvailableSources(planName: string | null | undefined): string[] {
  const limits = getPlanLimits(planName);
  return limits.sourcingSources;
}

/**
 * Check if plan has a specific feature
 */
export function hasFeature(
  planName: string | null | undefined,
  feature: keyof Omit<PlanLimits, 'name' | 'maxCandidatesPerJob' | 'maxActiveJobs' | 'maxCandidatesPerMonth' | 'features' | 'sourcingSources'>
): boolean {
  const limits = getPlanLimits(planName);
  return limits[feature] === true;
}

/**
 * Get plan upgrade message
 */
export function getUpgradeMessage(
  currentPlan: string | null | undefined,
  targetPlan: PlanName = 'Professional'
): string {
  const current = getPlanLimits(currentPlan);
  const target = PLAN_LIMITS[targetPlan];

  return `Upgrade to ${target.name} to unlock ${target.maxCandidatesPerJob === 'Unlimited' ? 'unlimited' : target.maxCandidatesPerJob} candidates per job and more features.`;
}

