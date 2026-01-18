/**
 * Gemini AI service for candidate analysis
 * Provides AI-powered analysis with strengths, weaknesses, and job-relevant insights
 */

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Job, ScrapedCandidate } from '../types';
import { logger } from '../utils/logger';

interface CandidateForAnalysis {
  name: string;
  role?: string;
  location?: string;
  experience?: number;
  skills: string[];
  resumeSummary?: string;
  workExperience?: Array<{
    role: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    school?: string;
    field?: string;
    year?: string;
  }>;
  source?: string;
}

interface AIAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Get Gemini AI client
 */
function getAiClient(): GoogleGenAI {
  // Check process.env.API_KEY (for Node.js environments like scraper)
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '' || apiKey === 'dummy-key') {
    throw new Error('Gemini API key not configured. Please set API_KEY or GEMINI_API_KEY in your .env.local file.');
  }
  
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate AI analysis for a candidate
 * Provides strengths, weaknesses, expertise, and job-relevant insights
 */
export async function generateCandidateAnalysis(
  candidate: CandidateForAnalysis,
  job: Job
): Promise<AIAnalysisResult> {
  const modelId = "gemini-2.0-flash-exp";
  
  // Build candidate context from available data
  let candidateContext = `Name: ${candidate.name}\n`;
  if (candidate.role) candidateContext += `Current Role: ${candidate.role}\n`;
  if (candidate.location) candidateContext += `Location: ${candidate.location}\n`;
  if (candidate.experience) candidateContext += `Experience: ${candidate.experience} years\n`;
  
  candidateContext += `Skills: ${candidate.skills.join(', ')}\n`;
  
  if (candidate.resumeSummary) {
    candidateContext += `\nProfile Summary:\n${candidate.resumeSummary.substring(0, 1000)}\n`;
  }
  
  if (candidate.workExperience && candidate.workExperience.length > 0) {
    candidateContext += `\nWork Experience:\n`;
    candidate.workExperience.slice(0, 5).forEach(exp => {
      candidateContext += `- ${exp.role} at ${exp.company}${exp.duration ? ` (${exp.duration})` : ''}\n`;
      if (exp.description) {
        candidateContext += `  ${exp.description.substring(0, 200)}\n`;
      }
    });
  }
  
  const jobSkillsText = job.skills && job.skills.length > 0 
    ? `Required Skills: ${job.skills.join(', ')}`
    : 'No specific skills listed';
  
  const prompt = `
You are an expert technical recruiter using the CoreFlow system.

Analyze the following candidate for the specific job role. Provide a concise, honest assessment with actionable insights.

Job Details:
Title: ${job.title}
${jobSkillsText}
Description: ${job.description || 'No description provided'}

Candidate Details:
${candidateContext}

CRITICAL SCORING GUIDELINES (Strict but Fair):
- Score 85-100: Excellent match - candidate has 80%+ of required skills and strong experience alignment
- Score 70-84: Good match - candidate has 60-79% of required skills and reasonable experience
- Score 50-69: Minimum acceptable - candidate has 40-59% of required skills (bare minimum threshold)
- Score 0-49: Below minimum - candidate lacks essential skills (less than 40% match)

DO NOT inflate scores. Be strict: candidates must demonstrate significant skill overlap with job requirements.

Output a JSON object containing:
1. "score": A match score from 0 to 100 based on strict skills and experience alignment (see guidelines above).
2. "summary": A detailed 3-4 sentence summary that:
   - Clearly states how well the candidate matches the job description
   - Highlights key strengths and alignment points
   - Mentions specific gaps or areas of concern
   - Provides actionable insights for the recruiter
3. "strengths": An array of 3-5 specific strengths based on profile analysis, skills match, and experience relevance.
4. "weaknesses": An array of 2-4 specific gaps, missing skills, experience level concerns, or areas that need exploration.

Be honest, direct, and provide actionable insights that help recruiters make informed decisions.
`;

  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    const resultText = response.text;
    if (!resultText) {
      throw new Error('No response from Gemini AI');
    }
    
    // Parse JSON response (remove markdown code blocks if present)
    const jsonText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonText);
    
    // Validate response structure
    if (!analysis.score || !analysis.summary || !Array.isArray(analysis.strengths) || !Array.isArray(analysis.weaknesses)) {
      throw new Error('Invalid AI response structure');
    }
    
    return {
      score: Math.max(0, Math.min(100, analysis.score)),
      summary: analysis.summary,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || []
    };
  } catch (error: any) {
    logger.error('Gemini AI analysis failed:', error.message || error);
    // Return fallback analysis
    return {
      score: 0,
      summary: `AI Analysis temporarily unavailable: ${error.message || 'Unknown error'}. Please review candidate manually.`,
      strengths: [],
      weaknesses: []
    };
  }
}

