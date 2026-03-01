import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'company-assets';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

function getUserIdFromJwt(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = getUserIdFromJwt(authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { workspaceId, fileBase64, contentType, filename } = body as {
      workspaceId?: string;
      fileBase64?: string;
      contentType?: string;
      filename?: string;
    };

    if (!workspaceId || typeof workspaceId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure user is Admin or Recruiter in this workspace
    const { data: membership, error: memberError } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .in('role', ['Admin', 'Recruiter'])
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to upload a logo for this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedExt = ['png', 'jpg', 'jpeg', 'svg'];
    const ext = filename?.split('.').pop()?.toLowerCase() ?? contentType?.split('/').pop()?.toLowerCase();
    const safeExt = ext && allowedExt.includes(ext) ? (ext === 'jpg' ? 'jpg' : ext) : 'png';
    const mime = contentType && ALLOWED_TYPES.includes(contentType) ? contentType : `image/${safeExt}`;

    let bytes: Uint8Array;
    try {
      const binary = atob(fileBase64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid file encoding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (bytes.length > MAX_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: 'File is too large. Maximum size is 2MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const path = `${workspaceId}/logo.${safeExt}`;

    // Remove existing logos for this workspace
    const existing = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.svg']
      .map((f) => `${workspaceId}/${f}`)
      .filter((p) => p !== path);
    if (existing.length > 0) {
      await admin.storage.from(BUCKET).remove(existing).catch(() => {});
    }

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: true });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message || 'Upload failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    return new Response(
      JSON.stringify({ publicUrl: urlData.publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('upload-company-logo error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
