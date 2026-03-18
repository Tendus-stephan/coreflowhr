/**
 * Sanitize error messages before showing them to users.
 * Never leak internal URLs, database errors, Supabase internals, stack traces,
 * API keys, edge function names, or environment variable details.
 */

const TECHNICAL_PATTERNS: RegExp[] = [
  // URLs
  /https?:\/\//i,
  /supabase\.co/i,
  /supabase\.in/i,
  // Fetch / network
  /Failed to fetch/i,
  /NetworkError/i,
  /Network request failed/i,
  /fetch.*failed/i,
  /ERR_NETWORK/i,
  /ERR_HTTP2/i,
  /ERR_INTERNET/i,
  /net::/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  // Edge functions
  /Edge Function/i,
  /non-2xx/i,
  /status code \d+/i,
  /FunctionsHttpError/i,
  /FunctionsRelayError/i,
  /edge function/i,
  /deployed/i,
  // API keys & environment variables
  /API key/i,
  /api_key/i,
  /VITE_/i,
  /\.env/i,
  /environment variable/i,
  /configured correctly/i,
  /Please ensure/i,
  /Please set/i,
  // AI provider names (technical context)
  /Anthropic/i,
  /Gemini/i,
  /OpenAI/i,
  /parse-cv/i,
  /analyze-candidate/i,
  // PostgREST / PostgreSQL
  /PGRST\d+/,
  /\b(42|23|08|0A|22|25|40|53|54|55|58|F0|HV|P0|XX)\w{3}\b/,
  /permission denied/i,
  /schema cache/i,
  /does not exist/i,
  /already exists/i,
  /relation .+ does not/i,
  /column .+ does/i,
  /function .+ does/i,
  /invalid input syntax/i,
  /violates (foreign key|unique|not-null|check)/i,
  /duplicate key/i,
  /operator does not exist/i,
  // JavaScript internals
  /TypeError:/i,
  /ReferenceError:/i,
  /SyntaxError:/i,
  /at Object\./i,
  /at Array\./i,
];

/**
 * Returns a user-friendly error message, or the fallback if the message looks technical/internal.
 */
export function sanitizeError(
  message: string | undefined | null,
  fallback: string
): string {
  const raw = (message ?? '').trim();
  if (!raw) return fallback;
  if (TECHNICAL_PATTERNS.some((p) => p.test(raw))) return fallback;
  return raw;
}

/**
 * Extract and sanitize an error from a caught value (Error object, string, or unknown).
 * Always logs the full technical error to the console for developers.
 */
export function toUserError(err: unknown, fallback: string): string {
  if (err) console.error('[error]', err);
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : (err as any)?.message ?? '';
  return sanitizeError(msg, fallback);
}

/**
 * @deprecated Use sanitizeError() instead.
 */
export function userFacingEdgeError(
  message: string | undefined | null,
  fallback: string
): string {
  return sanitizeError(message, fallback);
}
