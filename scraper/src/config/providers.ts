/**
 * Provider configuration and API keys
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from project root
// Try .env.local first (Vite convention), then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../../');
dotenv.config({ path: resolve(projectRoot, '.env.local') });
dotenv.config({ path: resolve(projectRoot, '.env') });

export interface ProviderConfig {
  apify?: {
    apiToken?: string; // FREE tier: 5 compute units/month, then ~$0.25/unit
  };
  github?: {
    token?: string; // Optional, for higher rate limits (GitHub API is FREE)
  };
}

export const providerConfig: ProviderConfig = {
  apify: {
    apiToken: process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN
  },
  github: {
    token: process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN // Optional
  }
};

// Validate required providers
export function validateProviderConfig(sources: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (sources.includes('linkedin')) {
    // LinkedIn requires Apify (only provider that works)
    if (!providerConfig.apify?.apiToken) {
      missing.push(
        'LinkedIn scraping requires APIFY_API_TOKEN. ' +
        'Setup: https://apify.com → Sign up (FREE) → Get API token → Set APIFY_API_TOKEN in .env.local'
      );
    }
  }


  // GitHub doesn't require API key (works without, but has lower rate limits)
  // So we don't validate it

  return {
    valid: missing.length === 0,
    missing
  };
}


