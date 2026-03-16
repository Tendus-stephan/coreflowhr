import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "https://coreflowhr.com",
  "https://www.coreflowhr.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin ? ALLOWED_ORIGINS.includes(origin) : false;
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1") || false;
  const isVercelPreview = origin?.includes("vercel.app") || false;
  const isChromeExtension = origin?.startsWith("chrome-extension://") || false;
  const allowOrigin = (isAllowed || isLocalhost || isVercelPreview || isChromeExtension) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate via JWT (standard Supabase auth)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // User-scoped client to verify the token and get user info
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service role client for cross-table queries
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get user's workspace
  const { data: membership, error: membershipError } = await adminClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (membershipError || !membership) {
    return new Response(JSON.stringify({ error: "No workspace found for user" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const workspaceId = membership.workspace_id as string;

  // GET — return list of active jobs for this workspace
  if (req.method === "GET") {
    const { data: jobs, error: jobsError } = await adminClient
      .from("jobs")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .eq("status", "Active")
      .order("created_at", { ascending: false });

    if (jobsError) {
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ jobs: jobs || [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST — upsert candidate from LinkedIn profile
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, profile } = body;

    if (!jobId || !profile) {
      return new Response(JSON.stringify({ error: "jobId and profile are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate job belongs to this workspace
    const { data: job, error: jobError } = await adminClient
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("workspace_id", workspaceId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found in this workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize linkedInUrl
    const linkedInUrl = (profile.linkedInUrl || "")
      .toLowerCase()
      .split("?")[0]
      .replace(/\/$/, "");

    // Check for existing candidate (dedup by job_id + linkedin_url)
    let existingId: string | null = null;
    if (linkedInUrl) {
      const { data: existing } = await adminClient
        .from("candidates")
        .select("id")
        .eq("job_id", jobId)
        .eq("linkedin_url", linkedInUrl)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

    const resumeSummary = profile.about
      ? (profile.about as string).substring(0, 2000)
      : null;

    const candidateData: Record<string, any> = {
      name: profile.name || "Unknown",
      role: profile.headline || "",
      location: profile.location || "",
      resume_summary: resumeSummary,
      skills: profile.skills || [],
      work_experience: profile.workExperience || [],
      linkedin_url: linkedInUrl || null,
      current_company: profile.currentCompany || null,
      profile_picture_url: profile.profilePhotoUrl || null,
      source: "linkedin_extension",
      workspace_id: workspaceId,
      job_id: jobId,
      user_id: user.id,
    };

    let candidateId: string;
    let isUpdate = false;

    if (existingId) {
      const { error: updateError } = await adminClient
        .from("candidates")
        .update(candidateData)
        .eq("id", existingId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      candidateId = existingId;
      isUpdate = true;
    } else {
      const { data: inserted, error: insertError } = await adminClient
        .from("candidates")
        .insert({
          ...candidateData,
          stage: "New",
          applied_date: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      candidateId = inserted.id as string;
      isUpdate = false;
    }

    return new Response(JSON.stringify({ success: true, candidateId, isUpdate }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
