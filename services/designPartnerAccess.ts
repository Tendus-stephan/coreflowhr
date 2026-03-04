/**
 * Design partner access utility.
 * Grants and revokes free access to workspaces for design partners.
 *
 * Usage (admin only — call from a server context or privileged edge function):
 *   await grantDesignPartnerAccess(supabase, workspaceId, 90);  // 90-day access
 *   await revokeDesignPartnerAccess(supabase, workspaceId);
 */

const DEFAULT_ACCESS_DAYS = 90;

interface ServiceSupabase {
  from: (table: string) => {
    update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
}

/**
 * Grant design partner (free) access to a workspace for the given number of days.
 */
export async function grantDesignPartnerAccess(
  supabase: ServiceSupabase,
  workspaceId: string,
  days: number = DEFAULT_ACCESS_DAYS
): Promise<{ ok: boolean; error?: string }> {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('workspaces')
    .update({
      is_free_access: true,
      free_access_expires_at: expiresAt,
    })
    .eq('id', workspaceId);

  if (error) {
    console.error('[DesignPartner] grantDesignPartnerAccess error:', error);
    return { ok: false, error: String(error) };
  }

  console.log(`[DesignPartner] Granted ${days}-day access to workspace ${workspaceId}, expires ${expiresAt}`);
  return { ok: true };
}

/**
 * Revoke design partner access from a workspace.
 * Sets is_free_access=false and clears the expiry.
 */
export async function revokeDesignPartnerAccess(
  supabase: ServiceSupabase,
  workspaceId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('workspaces')
    .update({
      is_free_access: false,
      free_access_expires_at: null,
    })
    .eq('id', workspaceId);

  if (error) {
    console.error('[DesignPartner] revokeDesignPartnerAccess error:', error);
    return { ok: false, error: String(error) };
  }

  console.log(`[DesignPartner] Revoked design partner access from workspace ${workspaceId}`);
  return { ok: true };
}
