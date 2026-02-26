/**
 * Never show raw Edge Function / non-2xx errors to users.
 * Use this whenever surfacing errors from supabase.functions.invoke().
 */
export function userFacingEdgeError(message: string | undefined | null, fallback: string): string {
  const raw = (message || '').trim();
  if (!raw) return fallback;
  if (/Edge Function|non-2xx|status code/i.test(raw)) return fallback;
  return raw;
}
