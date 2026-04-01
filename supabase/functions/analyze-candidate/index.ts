import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify JWT — reject unauthenticated callers
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { resumeSummary, skills, experience, role, jobTitle, jobDescription, jobSkills } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const skillsList = Array.isArray(skills) ? skills.join(", ") : "";
    const jobSkillsList = Array.isArray(jobSkills) ? jobSkills.join(", ") : "";
    const experienceText = experience != null ? `${experience} years` : "unknown";

    const prompt = `Assess this candidate holistically for the role of "${jobTitle}".

<candidate>
Role/Title: ${role || "Not specified"}
Experience: ${experienceText}
Skills: ${skillsList || "Not specified"}
Background summary: ${resumeSummary || "Not provided"}
</candidate>

<job>
Title: ${jobTitle}
Description: ${jobDescription || "Not provided"}
Required skills: ${jobSkillsList || "Not specified"}
</job>

Evaluate across ALL of these dimensions — do NOT just match keywords:

1. EXPERIENCE RELEVANCE: Is their background genuinely applicable, even if in a slightly different context or industry?
2. CAREER TRAJECTORY: Is this role a natural next step, or a lateral move, regression, or stretch beyond their level?
3. SENIORITY MATCH: Does their experience level match what the role demands (not over/under-qualified)?
4. SKILL DEPTH vs BREADTH: Do they have real expertise in the core skills, or just surface exposure?
5. TRANSFERABLE VALUE: What relevant skills/experience do they bring even if not exact keyword matches?
6. RED FLAGS: Anything concerning — very short tenures, unexplained gaps, significant misalignment?

Scoring (calibrated to real hiring standards — be honest, not generous):
- 88–100: Exceptional — would be a top hire; exceeds requirements
- 75–87: Strong — clearly qualified, hire with confidence, minor gaps only
- 60–74: Good — qualified, some development areas but hireable
- 45–59: Moderate — meets some requirements, notable gaps, risky hire
- 25–44: Weak — significant gaps, would need substantial development
- 0–24: Poor — does not meet core requirements

A score of 75+ means the candidate is genuinely ready to perform in this role today.

Return ONLY this JSON (no markdown, no backticks):
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentences: overall fit verdict, key reason for score, and one specific insight>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific gap or risk 1>", "<specific gap or risk 2>"]
}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: "You are a senior talent acquisition specialist with 15+ years of experience across technical and professional recruitment. You assess candidates holistically — considering career trajectory, seniority match, transferable skills, and real-world role fit — not just keyword overlap. Your scores are calibrated and honest. Return only valid JSON, no markdown.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json().catch(() => ({}));
      console.error("Anthropic API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Anthropic API error", details: errorData }),
        { status: anthropicResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from Anthropic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip markdown code fences if present
    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result = JSON.parse(jsonText);

    return new Response(
      JSON.stringify({
        score: typeof result.score === "number" ? result.score : null,
        summary: result.summary || "",
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error analyzing candidate:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
