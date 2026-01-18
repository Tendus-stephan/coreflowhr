/**
 * Error handler for scraping operations
 * Converts technical errors to user-friendly messages
 * NEVER exposes provider-specific errors (e.g., Apify limits) to maintain product authenticity
 */

export interface ScrapingError {
  userMessage: string;
  category: 'network' | 'no_results' | 'configuration' | 'unknown';
  canRetry: boolean;
  technicalDetails?: string; // For internal logging only
}

/**
 * Convert technical error to user-friendly message
 * Hides provider-specific details (Apify, API keys, etc.)
 */
export function handleScrapingError(error: any): ScrapingError {
  const errorMessage = error?.message || String(error) || 'Unknown error';
  const errorCode = error?.code || '';

  // Never expose Apify-specific errors to users
  if (
    errorMessage.includes('Apify') ||
    errorMessage.includes('apify') ||
    errorMessage.includes('Free Tier Limit') ||
    errorMessage.includes('free user run limit') ||
    errorMessage.includes('free tier') ||
    errorMessage.includes('APIFY') ||
    errorCode === 'APIFY_LIMIT'
  ) {
    // Apify limit reached - show generic "sourcing unavailable" message
    return {
      userMessage: 'Candidate sourcing is temporarily unavailable. Please try again in a few moments.',
      category: 'network',
      canRetry: true,
      technicalDetails: `Apify limit: ${errorMessage}` // Internal only
    };
  }

  // Network/connection errors
  if (
    errorCode === 'ECONNRESET' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ECONNREFUSED' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection')
  ) {
    return {
      userMessage: 'Connection error while sourcing candidates. Please check your internet connection and try again.',
      category: 'network',
      canRetry: true,
      technicalDetails: `Network error: ${errorMessage}`
    };
  }

  // No candidates found
  if (
    errorMessage.includes('No candidates found') ||
    errorMessage.includes('0 candidates') ||
    errorMessage.includes('no results') ||
    errorMessage.includes('empty') ||
    errorMessage.includes('not found')
  ) {
    return {
      userMessage: 'No candidates found matching your job requirements. Try adjusting the location, skills, or experience level.',
      category: 'no_results',
      canRetry: true,
      technicalDetails: `No results: ${errorMessage}`
    };
  }

  // Configuration/authentication errors (shouldn't happen in production)
  if (
    errorMessage.includes('API key') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('403') ||
    errorMessage.includes('401')
  ) {
    return {
      userMessage: 'Candidate sourcing service is temporarily unavailable. Please try again later.',
      category: 'configuration',
      canRetry: true,
      technicalDetails: `Config error: ${errorMessage}` // Internal only
    };
  }

  // Generic error - never expose technical details
  return {
    userMessage: 'Unable to source candidates at this time. Please try again later or contact support if the issue persists.',
    category: 'unknown',
    canRetry: true,
    technicalDetails: `Generic error: ${errorMessage}` // Internal only
  };
}

/**
 * Log error internally without exposing to user
 */
export function logScrapingError(jobId: string, error: ScrapingError, context?: any): void {
  console.error('[Scraping Error - Internal Only]', {
    jobId,
    category: error.category,
    canRetry: error.canRetry,
    technicalDetails: error.technicalDetails,
    context
  });
  
  // TODO: Send to error tracking service (e.g., Sentry) if needed
  // But NEVER expose technical details to users in UI
}

