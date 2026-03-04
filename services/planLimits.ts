/**
 * Plan utility — CoreflowHR Professional is the only plan.
 * The only limits that exist are:
 *   - Sourcing cap per job: 100 (paid) or 30 (free_access design partner)
 *   - eSignature limit: only for is_free_access workspaces (esignature_count vs esignature_limit)
 *   - CV parse limit: only for is_free_access workspaces (cv_parse_count vs cv_parse_limit)
 * Everything else is unlimited for paying customers.
 */

export function getSourcingCap(isFreeAccess: boolean): number {
  return isFreeAccess ? 30 : 100;
}
