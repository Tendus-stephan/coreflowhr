/**
 * Plan-based limits and privileges configuration
 * Two limits only: how many jobs can be sourced per month, and how many candidates per scrape.
 */

export type PlanName = 'Basic' | 'Professional';

export interface PlanLimits {
  name: PlanName;
  /** How many sourcing actions (scrapes) the user can trigger per month */
  maxJobsPerMonth: number;
  /** How many candidates are fetched per single scrape action */
  candidatesPerScrape: number;
  sourcingSources: string[];
  aiAnalysis: boolean;
  aiEmailGeneration: boolean;
  advancedAnalytics: boolean;
  integrationsEnabled: boolean;
  prioritySupport: boolean;
  customEmailTemplates: boolean;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  Basic: {
    name: 'Basic',
    maxJobsPerMonth: 10,
    candidatesPerScrape: 25,
    sourcingSources: ['profiles'],
    aiAnalysis: true,
    aiEmailGeneration: false,
    advancedAnalytics: false,
    integrationsEnabled: false,
    prioritySupport: false,
    customEmailTemplates: false,
    features: [
      'Source candidates for up to 10 jobs per month',
      '25 candidates per sourcing run',
      'AI-powered candidate matching',
      'Email templates',
      'Basic analytics',
      'Email support',
    ],
  },
  Professional: {
    name: 'Professional',
    maxJobsPerMonth: 50,
    candidatesPerScrape: 50,
    sourcingSources: ['profiles'],
    aiAnalysis: true,
    aiEmailGeneration: true,
    advancedAnalytics: true,
    integrationsEnabled: true,
    prioritySupport: true,
    customEmailTemplates: true,
    features: [
      'Source candidates for up to 50 jobs per month',
      '50 candidates per sourcing run',
      'AI email generation',
      'Advanced analytics & reports',
      'Integrations (Google Calendar, Meet, Teams)',
      'Priority support',
    ],
  },
};

export function getPlanLimits(planName: string | null | undefined): PlanLimits {
  const normalized = planName?.toLowerCase() || 'basic';
  if (normalized.includes('professional') || normalized.includes('pro')) {
    return PLAN_LIMITS.Professional;
  }
  return PLAN_LIMITS.Basic;
}

export function getAvailableSources(planName: string | null | undefined): string[] {
  return getPlanLimits(planName).sourcingSources;
}

export function hasFeature(
  planName: string | null | undefined,
  feature: keyof Omit<PlanLimits, 'name' | 'maxJobsPerMonth' | 'candidatesPerScrape' | 'features' | 'sourcingSources'>
): boolean {
  return getPlanLimits(planName)[feature] === true;
}

export function getMonthlyScrapeLimit(planName: string | null | undefined): number {
  return getPlanLimits(planName).maxJobsPerMonth;
}

export function canScrapeThisMonth(
  planName: string | null | undefined,
  scrapesUsed: number,
  renewalDate?: string | null
): { allowed: boolean; remaining: number; limit: number; message?: string } {
  const limit = getMonthlyScrapeLimit(planName);
  const remaining = Math.max(0, limit - scrapesUsed);
  if (scrapesUsed < limit) {
    return { allowed: true, remaining, limit };
  }
  const renewalText = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'your cycle renews';
  return {
    allowed: false,
    remaining: 0,
    limit,
    message: `You've used your ${limit} sourcing runs this month. Upgrade to Pro or wait until ${renewalText}.`,
  };
}
