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
    apiToken?: string; // Single token (legacy support)
    apiTokens?: string[]; // Multiple tokens for rotation (comma-separated in env)
  };
  github?: {
    token?: string; // Optional, for higher rate limits (GitHub API is FREE)
  };
}

// Parse multiple Apify tokens from environment variable
// Supports: APIFY_API_TOKENS=token1,token2,token3 or APIFY_API_TOKEN=single_token
function parseApifyTokens(): string[] {
  // First, try APIFY_API_TOKENS (comma-separated multiple tokens)
  const tokensEnv = process.env.APIFY_API_TOKENS || process.env.VITE_APIFY_API_TOKENS;
  if (tokensEnv) {
    const tokens = tokensEnv.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length > 0) {
      return tokens;
    }
  }
  
  // Fallback to single APIFY_API_TOKEN (legacy support)
  const singleToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN;
  if (singleToken) {
    return [singleToken];
  }
  
  return [];
}

const apifyTokens = parseApifyTokens();

export const providerConfig: ProviderConfig = {
  apify: {
    apiToken: apifyTokens[0] || undefined, // First token for backward compatibility
    apiTokens: apifyTokens.length > 0 ? apifyTokens : undefined // All tokens for rotation
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
    const hasTokens = (providerConfig.apify?.apiTokens && providerConfig.apify.apiTokens.length > 0) || 
                     providerConfig.apify?.apiToken;
    if (!hasTokens) {
      missing.push(
        'LinkedIn scraping requires APIFY_API_TOKEN or APIFY_API_TOKENS. ' +
        'Setup: https://apify.com → Sign up (FREE) → Get API token(s) → Set APIFY_API_TOKEN or APIFY_API_TOKENS in .env.local\n' +
        'For multiple tokens (rotation): APIFY_API_TOKENS=token1,token2,token3'
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


