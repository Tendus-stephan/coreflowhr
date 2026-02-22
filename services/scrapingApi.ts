/**
 * API client for candidate scraping
 * Calls the scraper server API endpoint instead of importing Node.js code
 */

import { supabase } from './supabase';
import { getMonthlyScrapeLimit, canScrapeThisMonth } from './planLimits';

export interface ScrapeUsage {
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
}

export async function getScrapeUsage(planName: string | null | undefined): Promise<ScrapeUsage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('get_scrape_usage', { p_user_id: user.id });

  const used = data?.[0]?.used ?? 0;
  const resetDate = data?.[0]?.reset_date ?? new Date().toISOString();
  const limit = getMonthlyScrapeLimit(planName);

  return { used, limit, remaining: Math.max(0, limit - used), resetDate };
}

export async function incrementScrapeCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('increment_scrape_count', { p_user_id: user.id });

  return data ?? 0;
}

export interface ScrapeOptions {
  sources: string[];
  maxCandidates: number;
}

export interface ScrapeResult {
  source: string;
  candidatesFound: number;
  candidatesSaved: number;
  errors?: string[];
  statistics?: {
    found: number;
    saved: number;
    invalid: number;
    duplicates: number;
    saveErrors: number;
    processed: number;
  };
}

export interface ScrapeResponse {
  success: boolean;
  results: ScrapeResult[];
  totalSaved: number;
  error?: string;
}

/**
 * Scrape candidates for a job
 * In development: Calls the local scraper server
 * In production: Calls the Supabase Edge Function
 * 
 * Includes timeout and retry logic for network resilience
 */
export async function scrapeCandidates(
  jobId: string,
  options: ScrapeOptions
): Promise<ScrapeResponse> {
  const maxRetries = 3;
  const timeoutMs = 300000; // 5 minutes timeout for long-running scrapes
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const isDevelopment = import.meta.env.DEV;
      let apiUrl: string;
      let headers: Record<string, string>;

      if (isDevelopment) {
        // In development, call the local scraper server
        apiUrl = 'http://localhost:3005/api/scrape';
        headers = {
          'Content-Type': 'application/json',
        };
      } else {
        // In production, call the Supabase Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (supabase as any).supabaseKey;

        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        apiUrl = `${supabaseUrl}/functions/v1/scrape-candidates`;
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        };
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jobId,
            sources: options.sources,
            maxCandidates: options.maxCandidates,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Scraping failed' }));
          const err = new Error(errorData.userMessage || errorData.error || 'Scraping failed');
          (err as any).suggestion = errorData.suggestion ?? null;
          throw err;
        }

        const data = await response.json();
        // In dev we call the local scraper; edge function does not run, so increment count here
        if (isDevelopment) {
          try {
            await incrementScrapeCount();
          } catch (_) {}
        }
        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // If it's an abort (timeout), throw immediately
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. The scraping process is taking longer than expected. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      
      // Check if it's a network error that we should retry
      const isNetworkError = 
        errorMessage.includes('fetch') || 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('aborted');

      // Don't retry on non-network errors or if it's the last attempt
      if (!isNetworkError || attempt === maxRetries - 1) {
        // Convert to user-friendly error
        if (isNetworkError) {
          throw new Error('Unable to connect to scraping service after multiple attempts. Please check your internet connection and try again.');
        }
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s
      const waitTime = Math.pow(2, attempt + 1) * 1000;
      console.warn(`Network error (attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitTime/1000}s...`, errorMessage);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Scraping failed after multiple retry attempts');
}
