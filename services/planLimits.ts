/**
 * Plan-based limits and privileges configuration
 * Defines sourcing limits, features, and privileges for each subscription plan
 */

export type PlanName = 'Basic' | 'Professional';

export interface PlanLimits {
  name: PlanName;
  maxCandidatesPerJob: number;
  maxActiveJobs: number;
  maxCandidatesPerMonth: number;
  maxAiAnalysisPerMonth: number;
  maxEmailWorkflows: number;
  maxExportCandidates: number;
  features: string[];
  sourcingSources: string[]; // Which sources are available
  aiAnalysis: boolean;
  aiEmailGeneration: boolean;
  advancedAnalytics: boolean;
  integrationsEnabled: boolean;
  prioritySupport: boolean;
  customEmailTemplates: boolean;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  Basic: {
    name: 'Basic',
    maxCandidatesPerJob: 50,
    maxActiveJobs: 5,
    maxCandidatesPerMonth: 500,
    maxAiAnalysisPerMonth: 20,
    maxEmailWorkflows: 3,
    maxExportCandidates: 50,
    features: [
      '5 active jobs',
      '50 candidates per job',
      '500 candidates per month',
      '20 AI analyses per month',
      '3 email workflows',
      'AI-powered candidate matching',
      'Email templates',
      'Basic analytics',
      'Email support',
    ],
    sourcingSources: ['linkedin'],
    aiAnalysis: true,
    aiEmailGeneration: false,
    advancedAnalytics: false,
    integrationsEnabled: false,
    prioritySupport: false,
    customEmailTemplates: false,
  },
  Professional: {
    name: 'Professional',
    maxCandidatesPerJob: 100,
    maxActiveJobs: 15,
    maxCandidatesPerMonth: 2000,
    maxAiAnalysisPerMonth: 100,
    maxEmailWorkflows: 10,
    maxExportCandidates: 500,
    features: [
      '15 active jobs (base) + buy more',
      '100 candidates per job (base) + buy more',
      '2,000 candidates per month (base) + buy more',
      '100 AI analyses per month (base) + buy more',
      '10 email workflows (base) + buy more',
      'AI email generation',
      'Advanced analytics & reports',
      'Integrations (Google Calendar, Meet, Teams)',
      'Priority support',
    ],
    sourcingSources: ['linkedin'],
    aiAnalysis: true,
    aiEmailGeneration: true,
    advancedAnalytics: true,
    integrationsEnabled: true,
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
): { allowed: boolean; maxAllowed: number; message?: string } {
  const limits = getPlanLimits(planName);
  const maxAllowed = limits.maxCandidatesPerJob;

  if (requestedCount <= maxAllowed) {
    return { allowed: true, maxAllowed };
  }

  return {
    allowed: false,
    maxAllowed,
    message: `Your ${limits.name} plan allows up to ${maxAllowed} candidates per job. Upgrade to Professional for up to ${PLAN_LIMITS.Professional.maxCandidatesPerJob} candidates per job.`,
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
  feature: keyof Omit<PlanLimits, 'name' | 'maxCandidatesPerJob' | 'maxActiveJobs' | 'maxCandidatesPerMonth' | 'maxAiAnalysisPerMonth' | 'maxEmailWorkflows' | 'maxExportCandidates' | 'features' | 'sourcingSources'>
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

  return `Upgrade to ${target.name} to unlock ${target.maxCandidatesPerJob} candidates per job and more features.`;
}

