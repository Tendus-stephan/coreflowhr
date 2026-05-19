import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { cvText, jobSkills } = await req.json();

    if (!cvText || typeof cvText !== "string") {
      return new Response(
        JSON.stringify({ error: "cvText is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncatedText = cvText.substring(0, 8000);
    const jobSkillsText = jobSkills && jobSkills.length > 0
      ? `\n\nJob Requirements (for skill matching):\nRequired Skills: ${jobSkills.join(", ")}`
      : '';

    const prompt = `Extract structured information from this CV/resume. Return ONLY valid JSON with no extra text.

CV Text:
${truncatedText}${jobSkillsText}

Extract the following information:
- name: Full personal name ONLY (first + last name). Do NOT include job title, designation, company, or any other text. Example: "Fatima AlHassan" not "Fatima AlHassan HR Business Partner"
- email: Email address (or null if not found)
- phone: Phone number (or null if not found)
- location: City, state/country (or null if not found)
- skills: Array of technical skills, programming languages, tools, frameworks mentioned
- experienceYears: Years of experience calculated from work history (number or null)
- workExperience: Array of work history entries, each with:
  * role: Job title/role
  * company: Company name
  * startDate: Start date (format: "YYYY" or "MM/YYYY" or null)
  * endDate: End date (format: "YYYY", "MM/YYYY", "Present", or null)
  * period: Formatted period string (e.g., "2020 - Present")
  * description: Job description/key responsibilities (optional, max 500 chars)
- projects: Array of projects, each with:
  * name: Project name
  * description: Project description (optional)
  * technologies: Array of technologies used (optional)
- portfolioUrls: Object with:
  * github: GitHub URL (or null)
  * linkedin: LinkedIn URL (or null)
  * portfolio: Portfolio website URL (or null)
  * website: Personal website URL (or null)

IMPORTANT RULES:
- Return ONLY a valid JSON object, no markdown, no backticks, no explanation
- Extract information accurately — do not invent or assume
- For dates: Use simple format like "2022" or "2022-Present"
- If information is missing, use null (not empty strings)
- For skills: Include ALL relevant technical skills, tools, frameworks mentioned`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: "You are an expert CV/resume parser. Extract information accurately from CVs and return only a valid JSON object in the exact structure requested. Never wrap your response in markdown code blocks. For the name field, return ONLY the person's full name (e.g. 'Fatima AlHassan'), never include their job title or designation.",
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

    // Strip markdown code fences if Claude adds them despite instructions
    const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText);

    const cleanWorkExperience = (parsed.workExperience || []).map((exp: any) => ({
      role: exp.role || '',
      company: exp.company || '',
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      period: exp.period || (exp.startDate && exp.endDate
        ? `${exp.startDate} - ${exp.endDate}`
        : exp.startDate ? `${exp.startDate} - Present` : ''),
      description: exp.description || undefined,
    })).filter((exp: any) => exp.role && exp.company);

    const result = {
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      location: parsed.location || undefined,
      skills: parsed.skills || [],
      experienceYears: parsed.experienceYears || undefined,
      workExperience: cleanWorkExperience,
      projects: (parsed.projects || []).filter((p: any) => p && p.name),
      portfolioUrls: parsed.portfolioUrls || undefined,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error parsing CV:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
