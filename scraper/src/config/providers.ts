/**
 * Provider configuration and API keys
 */

import * as dotenv from 'dotenv';

dotenv.config();

export interface ProviderConfig {
  apify?: {
    apiToken?: string;
  };
  scraperapi?: {
    apiKey?: string;
  };
  github?: {
    token?: string; // Optional, for higher rate limits
  };
}

export const providerConfig: ProviderConfig = {
  apify: {
    apiToken: process.env.APIFY_API_TOKEN
  },
  scraperapi: {
    apiKey: process.env.SCRAPERAPI_KEY
  },
  github: {
    token: process.env.GITHUB_TOKEN // Optional
  }
};

// Validate required providers
export function validateProviderConfig(sources: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (sources.includes('linkedin') || sources.includes('jobboard')) {
    if (!providerConfig.apify?.apiToken && !providerConfig.scraperapi?.apiKey) {
      missing.push('APIFY_API_TOKEN or SCRAPERAPI_KEY (at least one required for LinkedIn/Job Boards)');
    }
  }

  // GitHub doesn't require API key (works without, but has lower rate limits)
  // So we don't validate it

  return {
    valid: missing.length === 0,
    missing
  };
}


