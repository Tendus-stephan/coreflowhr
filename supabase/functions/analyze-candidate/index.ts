import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const prompt = `You are an expert technical recruiter. Analyze this candidate for the role of "${jobTitle}" and provide a structured assessment.

Candidate Information:
- Current/Recent Role: ${role || "Not specified"}
- Experience: ${experienceText}
- Skills: ${skillsList || "Not specified"}
- Resume Summary: ${resumeSummary || "Not provided"}

Job Requirements:
- Job Title: ${jobTitle}
- Job Description: ${jobDescription || "Not provided"}
- Required Skills: ${jobSkillsList || "Not specified"}

Provide a JSON response with this exact structure:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence assessment of fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<gap 1>", "<gap 2>"]
}

Scoring guide (be strict):
- 85-100: Exceptional fit — meets or exceeds all key requirements
- 70-84: Strong fit — meets most requirements with minor gaps
- 50-69: Moderate fit — meets some requirements but has notable gaps
- 0-49: Poor fit — significant gaps in skills or experience

Return ONLY the JSON object, no markdown, no backticks, no explanation.`;

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
        system: "You are an expert technical recruiter. Analyze candidates and return only valid JSON assessments. Never wrap your response in markdown code blocks.",
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
