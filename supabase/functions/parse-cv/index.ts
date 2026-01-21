import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cvText, jobSkills } = await req.json();

    if (!cvText || typeof cvText !== "string") {
      return new Response(
        JSON.stringify({ error: "cvText is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Truncate CV text to stay within token limits (first 8000 characters)
    const truncatedText = cvText.substring(0, 8000);
    
    const jobSkillsText = jobSkills && jobSkills.length > 0 
      ? `\n\nJob Requirements (for skill matching):\nRequired Skills: ${jobSkills.join(", ")}`
      : '';
    
    const prompt = `Extract structured information from this CV/resume. Return ONLY valid JSON.

CV Text:
${truncatedText}${jobSkillsText}

Extract the following information:
- name: Full name of the candidate (or null if not found)
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
- Return ONLY valid JSON, no additional text
- Extract information accurately - do not invent or assume
- For dates: Use simple format like "2022" or "2022-Present" (no parentheses, no repetition)
- If information is missing, use null (not empty strings)
- For skills: Include ALL relevant technical skills, tools, frameworks mentioned`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert CV/resume parser. Extract information accurately from CVs and return only valid JSON in the exact structure requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API error", 
          details: errorData 
        }),
        {
          status: openaiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from OpenAI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse JSON (should always succeed with JSON Mode)
    const parsed = JSON.parse(content);
    
    // Validate and clean work experience
    const cleanWorkExperience = (parsed.workExperience || []).map((exp: any) => ({
      role: exp.role || '',
      company: exp.company || '',
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      period: exp.period || (exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : (exp.startDate ? `${exp.startDate} - Present` : '')),
      description: exp.description || undefined
    })).filter((exp: any) => exp.role && exp.company);
    
    // Return parsed data
    const result = {
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      location: parsed.location || undefined,
      skills: parsed.skills || [],
      experienceYears: parsed.experienceYears || undefined,
      workExperience: cleanWorkExperience,
      projects: (parsed.projects || []).filter((p: any) => p && p.name),
      portfolioUrls: parsed.portfolioUrls || undefined
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error parsing CV:", error);
    try {
      const sentryDsn = Deno.env.get("SENTRY_DSN");
      if (sentryDsn) {
        const sentry = await import("https://esm.sh/@sentry/node@10.35.0");
        sentry.init({ dsn: sentryDsn, environment: Deno.env.get("ENVIRONMENT") || "production" });
        sentry.captureException(error);
        await sentry.flush(2000);
      }
    } catch (sentryError) {
      console.error("Failed to send parse-cv error to Sentry:", sentryError);
    }
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});




