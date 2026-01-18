import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Candidate, Job } from "../types";
import { ParsedCVData } from "./cvParser";
import { COMPREHENSIVE_SYSTEM_PROMPT } from "./geminiSystemPrompt";

// Initialize Gemini Client
// IMPORTANT: The API key is injected by the environment.
// We support both process.env (Node/Playground) and import.meta.env (Vite/Local)
const getApiKey = () => {
    // Check VITE_API_KEY first (most common for Vite projects)
    // @ts-ignore - Vite specific
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        const key = import.meta.env.VITE_API_KEY;
        if (key && key.trim() !== '') {
            return key.trim();
        }
    }
    // Fallback to process.env.API_KEY (for Node.js environments)
    if (typeof process !== "undefined" && process.env && process.env.API_KEY) {
        const key = process.env.API_KEY;
        if (key && key.trim() !== '') {
            return key.trim();
        }
    }
    return "";
};

// Lazy initialization - create client on demand with fresh API key check
let aiInstance: GoogleGenAI | null = null;
let lastApiKey: string | null = null;

const getAiClient = (): GoogleGenAI => {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey.trim() === '' || apiKey === 'dummy-key') {
        throw new Error('Gemini API key not configured. Please set VITE_API_KEY in your .env file. See GEMINI_SETUP.md for setup instructions.');
    }
    
    // Re-initialize if API key changed or client doesn't exist
    if (!aiInstance || lastApiKey !== apiKey) {
        aiInstance = new GoogleGenAI({ apiKey });
        lastApiKey = apiKey;
    }
    
    return aiInstance;
};

/**
 * Parse CV text using Gemini AI to extract structured candidate information
 * This provides more accurate parsing than regex-based extraction
 */
export const parseCVWithAI = async (cvText: string, jobSkills?: string[]): Promise<Partial<ParsedCVData>> => {
  const modelId = "gemini-2.0-flash";
  
  // Validate input text
  if (!cvText || cvText.trim().length === 0) {
    throw new Error("CV text is empty or invalid");
  }
  
  // Log CV text preview for debugging (first 500 chars)
  console.log("📄 CV Text Preview (first 500 chars):", cvText.substring(0, 500));
  console.log("📊 CV Text Length:", cvText.length, "characters");
  
  // Truncate CV text to stay within token limits (keep first 6000 characters to avoid overwhelming model)
  const truncatedText = cvText.substring(0, 6000);
  
  // Check if text looks corrupted (too many control characters or nonsense)
  const controlCharCount = (truncatedText.match(/[\x00-\x1F\x7F]/g) || []).length;
  const controlCharRatio = controlCharCount / truncatedText.length;
  if (controlCharRatio > 0.1) { // More than 10% control characters is suspicious
    console.warn("⚠️ CV text appears to contain many control characters. Text may be corrupted.");
  }
  
  const jobSkillsText = jobSkills && jobSkills.length > 0 
    ? `\n\nJob Requirements (for skill matching):\nRequired Skills: ${jobSkills.join(", ")}`
    : '';
  
  const prompt = `Extract structured information from this CV/resume. Return ONLY valid JSON.

CV Text:
${truncatedText}${jobSkillsText}

IMPORTANT RULES:
- Return ONLY valid JSON, no additional text
- For dates: Use simple format like "2022" or "2022-Present" (no parentheses, no repetition)
- For descriptions: Keep concise (max 300 characters per field)
- If information is missing, use null
- Do NOT repeat date information or create patterns

Extract:
- name, email, phone, location (strings or null)
- skills (array of strings)
- experienceYears (number or null) 
- workExperience (array with: role, company, startDate, endDate, period, description - all strings or null)
- projects (array with: name, description, technologies - all strings/arrays or null)
- portfolioUrls (object with: github, linkedin, portfolio, website - all strings or null)`;

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
            name: { type: Type.STRING, nullable: true },
            email: { type: Type.STRING, nullable: true },
            phone: { type: Type.STRING, nullable: true },
            location: { type: Type.STRING, nullable: true },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experienceYears: { type: Type.INTEGER, nullable: true },
            workExperience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  company: { type: Type.STRING },
                  startDate: { type: Type.STRING, nullable: true },
                  endDate: { type: Type.STRING, nullable: true },
                  period: { type: Type.STRING, nullable: true },
                  description: { type: Type.STRING, nullable: true }
                },
                required: ["role", "company"]
              }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING, nullable: true },
                  technologies: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["name"]
              }
            },
            portfolioUrls: {
              type: Type.OBJECT,
              properties: {
                github: { type: Type.STRING, nullable: true },
                linkedin: { type: Type.STRING, nullable: true },
                portfolio: { type: Type.STRING, nullable: true },
                website: { type: Type.STRING, nullable: true }
              }
            }
          }
        },
        temperature: 0.1, // Low temperature for accurate extraction
        maxOutputTokens: 8192, // Limit output to prevent huge/corrupted responses
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");
    
    // FIRST: Aggressively clean control characters from the entire response
    // JSON strings cannot contain unescaped control characters (0x00-0x1F)
    // Clean the entire text first, then clean string values more carefully
    let cleanedText = resultText;
    
    // Step 1: Remove control characters from the entire text (except in escape sequences)
    // This is more aggressive and handles cases where strings are malformed
    cleanedText = cleanedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      // Convert tab, newline, carriage return to spaces (these might be escaped)
      if (code === 0x09 || code === 0x0A || code === 0x0D) {
        return ' ';
      }
      // Remove all other control characters
      return '';
    });
    
    // Step 2: Clean string values more carefully - handle escaped quotes and malformed strings
    // Use a more robust regex that handles escaped quotes
    cleanedText = cleanedText.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content) => {
      // Clean control characters that weren't caught in step 1
      let cleaned = content.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code === 0x09 || code === 0x0A || code === 0x0D || code === 0x0C) {
          return ' ';
        }
        return '';
      });
      // Collapse multiple consecutive spaces
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      // If the cleaned content is empty or just control characters, set to empty string
      if (!cleaned || cleaned.length === 0) {
        return '""';
      }
      // Escape any unescaped quotes that might cause issues
      cleaned = cleaned.replace(/(?<!\\)"/g, '\\"');
      return `"${cleaned}"`;
    });
    
    // Try to parse JSON, with better error handling for malformed responses
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError: any) {
      // If JSON parsing still fails, try to fix other common JSON issues
      // Common issues: unclosed strings, duplicate keys, malformed date values
      
      // Fix duplicate/malformed date entries - the AI sometimes generates corrupted date strings
      // Pattern 1: "startDate": "2022', '2022–Present': 'Present'..." -> "startDate": "2022"
      // Pattern 2: "startDate": "2022–Present (2022-Present) (2022-Present)..." -> "startDate": "2022-Present"
      cleanedText = cleanedText.replace(/"startDate":\s*"([^"]+)"/g, (match, content) => {
        // Extract just the first valid date part (before any parentheses, quotes, or repeated patterns)
        let firstValidPart = content.split(/[\(\)'",]/)[0].trim();
        // If it contains "Present" or date range, take just that part
        if (firstValidPart.includes('Present') || firstValidPart.match(/^\d{4}[-–]\d{4}/)) {
          firstValidPart = firstValidPart.split(/\s*\(/)[0].trim();
        }
        // Limit length to prevent huge corrupted strings
        firstValidPart = firstValidPart.substring(0, 50);
        return firstValidPart ? `"startDate": "${firstValidPart}"` : `"startDate": null`;
      });
      cleanedText = cleanedText.replace(/"endDate":\s*"([^"]+)"/g, (match, content) => {
        let firstValidPart = content.split(/[\(\)'",]/)[0].trim();
        if (firstValidPart.includes('Present') || firstValidPart.match(/^\d{4}[-–]\d{4}/)) {
          firstValidPart = firstValidPart.split(/\s*\(/)[0].trim();
        }
        firstValidPart = firstValidPart.substring(0, 50);
        return firstValidPart ? `"endDate": "${firstValidPart}"` : `"endDate": null`;
      });
      cleanedText = cleanedText.replace(/"period":\s*"([^"]+)"/g, (match, content) => {
        let firstValidPart = content.split(/[\(\)'",]/)[0].trim();
        if (firstValidPart.includes('Present') || firstValidPart.match(/^\d{4}[-–]\d{4}/)) {
          firstValidPart = firstValidPart.split(/\s*\(/)[0].trim();
        }
        firstValidPart = firstValidPart.substring(0, 50);
        return firstValidPart ? `"period": "${firstValidPart}"` : `"period": null`;
      });
      // Fix any description fields that might have similar corruption
      cleanedText = cleanedText.replace(/"description":\s*"([^"]{0,2000})"/g, (match, content) => {
        // For descriptions, truncate if too long and remove obvious corruption patterns
        let fixed = content;
        // Remove repeated patterns in parentheses
        fixed = fixed.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
        // Limit length to prevent issues
        fixed = fixed.substring(0, 500);
        // Escape any quotes that might break JSON
        fixed = fixed.replace(/"/g, '\\"');
        return fixed ? `"description": "${fixed}"` : `"description": null`;
      });
      
      // Try to extract JSON from the response if it's wrapped
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (retryError: any) {
          // Last resort: try to fix unclosed strings by truncating at error position
          console.error("Failed to parse JSON even after cleaning:", retryError);
          console.error("Response text preview:", cleanedText.substring(0, 1000));
          
          // If error position is available, try truncating problematic fields
          if (retryError.message?.includes('position')) {
            const posMatch = retryError.message.match(/position (\d+)/);
            if (posMatch) {
              const errorPos = parseInt(posMatch[1]);
              // Try parsing up to the error position (may produce partial data)
              try {
                const truncated = cleanedText.substring(0, errorPos - 10) + '"}';
                const partialMatch = truncated.match(/\{[\s\S]*\}/);
                if (partialMatch) {
                  parsed = JSON.parse(partialMatch[0]);
                  console.warn("Parsed partial JSON due to malformed response");
                }
              } catch (partialError) {
                // Give up
              }
            }
          }
          
          if (!parsed) {
            throw new Error(`Invalid JSON response from AI. The CV content may be too complex. Error: ${retryError.message}. Please try uploading the CV again.`);
          }
        }
      } else {
        console.error("No JSON object found in response");
        console.error("Response text (first 500 chars):", resultText.substring(0, 500));
        throw new Error(`No valid JSON found in AI response: ${parseError.message}. Please try again.`);
      }
    }
    
    // Validate and clean parsed data
    // Filter out corrupted work experience entries (containing only numbers, symbols, or very short garbage)
    const cleanWorkExperience = (parsed.workExperience || []).filter((exp: any) => {
      if (!exp || !exp.role || !exp.company) return false;
      // Check if role or company looks like garbage (only numbers, symbols, or very short)
      const roleStr = String(exp.role).trim();
      const companyStr = String(exp.company).trim();
      // Reject if it's mostly symbols/numbers or too short/nonsensical
      if (roleStr.length < 2 || companyStr.length < 2) return false;
      // Reject if it's mostly numbers and symbols (like "0 1 2" or "8 9 $ 7 !")
      const roleSymbolRatio = (roleStr.match(/[^a-zA-Z0-9\s]/g) || []).length / roleStr.length;
      const companySymbolRatio = (companyStr.match(/[^a-zA-Z0-9\s]/g) || []).length / companyStr.length;
      if (roleSymbolRatio > 0.5 || companySymbolRatio > 0.5) return false;
      // Reject if it's mostly single characters/numbers separated by spaces (like "0 1 2")
      if (/^[\d\s!$"\\]*$/.test(roleStr) || /^[\d\s!$"\\]*$/.test(companyStr)) return false;
      return true;
    });
    
    // Validate skills array
    const cleanSkills = (parsed.skills || []).filter((skill: any) => {
      if (!skill || typeof skill !== 'string') return false;
      const skillStr = skill.trim();
      // Reject empty or too short skills
      if (skillStr.length < 2) return false;
      // Reject if it's mostly symbols
      const symbolRatio = (skillStr.match(/[^a-zA-Z0-9\s+#-.]/g) || []).length / skillStr.length;
      return symbolRatio < 0.5; // Keep if less than 50% symbols
    });
    
    // Log parsed results for debugging
    console.log("✅ Parsed CV Data:", {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      skillsCount: cleanSkills.length,
      workExpCount: cleanWorkExperience.length,
      experienceYears: parsed.experienceYears
    });
    
    // Return as Partial<ParsedCVData> format with cleaned data
    return {
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      location: parsed.location || undefined,
      skills: cleanSkills,
      experienceYears: parsed.experienceYears || undefined,
      workExperience: cleanWorkExperience,
      projects: (parsed.projects || []).filter((p: any) => p && p.name && typeof p.name === 'string' && p.name.trim().length > 0),
      portfolioUrls: parsed.portfolioUrls || undefined
    };
  } catch (error: any) {
    console.error("AI CV Parsing Failed:", error);
    // Throw error - no fallback, AI parsing is required
    throw new Error(`AI CV parsing failed: ${error.message || 'Unknown error'}. Please ensure your Gemini API key is configured correctly.`);
  }
};

export const generateCandidateAnalysis = async (candidate: Candidate, job: Job): Promise<{ score: number; summary: string; strengths: string[]; weaknesses: string[] }> => {
  
  const modelId = "gemini-2.0-flash";
  
  // Build prompt with CV content if available (for direct applications)
  const cvContext = candidate.resumeSummary && candidate.source === 'direct_application'
    ? `\n\nCV/Resume Summary:\n${candidate.resumeSummary.substring(0, 800)}`
    : '';
  
  const jobSkillsText = job.skills && job.skills.length > 0 
    ? `Required Skills: ${job.skills.join(", ")}`
    : '';
  
  const prompt = `
    You are an expert technical recruiter using the CoreFlow system.
    
    Analyze the following candidate for the specific job role. Provide a concise, honest assessment.
    
    Job Details:
    Title: ${job.title}
    ${jobSkillsText}
    Description: ${job.description}
    
    Candidate Details:
    Name: ${candidate.name}
    Skills Found: ${candidate.skills.join(", ")}
    Experience: ${candidate.experience ? `${candidate.experience} years` : 'Not specified'}
    Current Role: ${candidate.role}${cvContext}
    
    CRITICAL SCORING GUIDELINES (Strict but Fair):
    - Score 85-100: Excellent match - candidate has 80%+ of required skills and strong experience alignment
    - Score 70-84: Good match - candidate has 60-79% of required skills and reasonable experience
    - Score 50-69: Minimum acceptable - candidate has 40-59% of required skills (bare minimum threshold)
    - Score 0-49: Below minimum - candidate lacks essential skills (less than 40% match)
    
    DO NOT inflate scores. Be strict: candidates must demonstrate significant skill overlap with job requirements.
    
    Output a JSON object containing:
    1. "score": A match score from 0 to 100 based on strict skills and experience alignment (see guidelines above).
    2. "summary": A concise 2-3 sentence summary that:
       - Clearly states how well the candidate's CV/resume matches the job description
       - Highlights key strengths and alignment points
       - Mentions specific flaws or gaps where the candidate falls short
       - Be honest and direct about fit
    3. "strengths": An array of 3 specific strengths based on CV analysis and skill match.
    4. "weaknesses": An array of 2-3 specific gaps, missing skills, or areas of concern identified from CV review.
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
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback mock response in case of API failure/quota limits for demo stability
    return {
      score: 0,
      summary: "AI Analysis temporarily unavailable. Please try again.",
      strengths: [],
      weaknesses: []
    };
  }
};

export interface EmailDraft {
    subject: string;
    content: string;
}

export const draftEmail = async (candidate: Candidate, type: 'Screening' | 'Offer' | 'Hired' | 'Rejection'): Promise<EmailDraft> => {
    const modelId = "gemini-2.0-flash";
    
    // Build context about the candidate
    const candidateContext = [];
    if (candidate.experience) {
        candidateContext.push(`${candidate.experience} years of experience`);
    }
    if (candidate.skills && candidate.skills.length > 0) {
        candidateContext.push(`Skills: ${candidate.skills.slice(0, 5).join(', ')}`);
    }
    if (candidate.aiMatchScore) {
        candidateContext.push(`Match score: ${candidate.aiMatchScore}%`);
    }
    
    const contextText = candidateContext.length > 0 ? `\n\nCandidate Context:\n${candidateContext.join('\n')}` : '';
    
    const typeSpecificInstructions = {
        Screening: `Write a warm, engaging screening email that invites the candidate to proceed to the next stage. Highlight why they're a good fit based on their background. Keep it concise (2-3 short paragraphs max).`,
        Offer: `Write an enthusiastic job offer email. Congratulate them and express excitement about having them join the team. Include next steps. Keep it concise (2-3 short paragraphs max).`,
        Hired: `Write a warm welcome email for a newly hired candidate. Express excitement about them joining the team. Include onboarding information and next steps. Keep it concise (2-3 short paragraphs max).`,
        Rejection: `Write a respectful and empathetic rejection email. Thank them for their interest and time. Keep it brief and professional (1-2 short paragraphs max).`
    };
    
    const prompt = `Write a professional ${type} email for ${candidate.name} applying for the ${candidate.role} position.

${typeSpecificInstructions[type]}

Requirements:
- Generate both a subject line and email body
- Subject line should be clear, professional, and under 60 characters
- Email body should be concise, warm, and professional
- Use the candidate's name naturally
- Keep the tone appropriate for a ${type} email

Return a JSON object with:
1. "subject": The email subject line (string)
2. "content": The email body content (string, use \\n for line breaks)

${contextText}`;
    
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
                        subject: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ["subject", "content"]
                }
            }
        });
        
        const resultText = response.text;
        if (!resultText) throw new Error("No response from AI");
        
        const parsed = JSON.parse(resultText);
        return {
            subject: parsed.subject || `${type} - ${candidate.role}`,
            content: parsed.content || "Could not generate email draft."
        };
    } catch (e) {
        console.error("Email draft generation failed:", e);
        return {
            subject: `${type} - ${candidate.role}`,
            content: "Error generating draft. Please try again."
        };
    }
};

export const draftOutreachMessage = async (candidate: Candidate, job: Job, registrationLink: string): Promise<EmailDraft> => {
    const modelId = "gemini-2.0-flash";
    
    // Build context about the candidate and job
    const candidateContext = [];
    if (candidate.experience) {
        candidateContext.push(`${candidate.experience} years of experience`);
    }
    if (candidate.skills && candidate.skills.length > 0) {
        candidateContext.push(`Skills: ${candidate.skills.slice(0, 5).join(', ')}`);
    }
    if (candidate.location) {
        candidateContext.push(`Location: ${candidate.location}`);
    }
    
    const contextText = candidateContext.length > 0 ? `\n\nCandidate Context:\n${candidateContext.join('\n')}` : '';
    
    const prompt = `Write a professional LinkedIn outreach message for ${candidate.name} about a ${job.title} opportunity at ${job.company || 'our company'}.

This is a LinkedIn message (not an email), so it should be:
- Warm and personable, suitable for LinkedIn messaging
- Concise (2-3 short paragraphs max)
- Professional but approachable
- Include the registration link naturally in the message

HOW THE REGISTRATION PROCESS WORKS:
1. Candidate clicks the registration link you provide in the message
2. They land on a registration page where they enter their email address
3. Once they register their email, it's stored in our system
4. After registration, they can receive regular email communications from us for different stages (screening, interviews, offers, etc.)
5. The registration link is secure and one-time use only

The message should:
- Introduce yourself/company briefly
- Mention why their background caught your attention
- Present the job opportunity briefly
- Explain that they need to register their email via the link to continue the process (since we can't contact them directly on LinkedIn for subsequent communications)
- Include this registration link: ${registrationLink}
- Express interest in learning more about them
- Make it clear that after registering, they'll receive further communications via email

Requirements:
- Generate both a subject line (for reference, though LinkedIn messages don't use subjects) and message content
- Subject line should be clear and professional (under 60 characters)
- Message body should naturally incorporate the registration link and explain why they need to register
- Use the candidate's name naturally
- Keep the tone professional but friendly
- Briefly explain that email registration is needed for continued communication

Return a JSON object with:
1. "subject": A subject line for reference (string)
2. "content": The LinkedIn message content (string, use \\n for line breaks, include the registration link)

${contextText}`;
    
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
                        subject: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ["subject", "content"]
                }
            }
        });
        
        const resultText = response.text;
        if (!resultText) throw new Error("No response from AI");
        
        const parsed = JSON.parse(resultText);
        return {
            subject: parsed.subject || `Opportunity: ${job.title}`,
            content: parsed.content || `Hi ${candidate.name},\n\nI came across your profile and was impressed by your background. We have an opening for ${job.title} that seems like a great fit.\n\nIf you're interested, please register here: ${registrationLink}\n\nLooking forward to hearing from you!`
        };
    } catch (e) {
        console.error("Outreach message draft generation failed:", e);
        return {
            subject: `Opportunity: ${job.title}`,
            content: `Hi ${candidate.name},\n\nI came across your profile and was impressed by your background. We have an opening for ${job.title} that seems like a great fit.\n\nIf you're interested, please register here: ${registrationLink}\n\nLooking forward to hearing from you!`
        };
    }
};

export interface EmailTemplateGeneration {
    subject: string;
    content: string;
}

export const generateEmailTemplate = async (templateType: 'interview' | 'screening' | 'rejection' | 'offer' | 'hired' | 'reschedule'): Promise<EmailTemplateGeneration> => {
    const modelId = "gemini-2.0-flash";
    
    const templateDescriptions: Record<string, { name: string; purpose: string; tone: string; variables: string }> = {
        interview: {
            name: 'Interview Invitation',
            purpose: 'invite candidates for an interview',
            tone: 'professional, warm, and welcoming',
            variables: '{candidate_name}, {job_title}, {company_name}, {interview_date}, {interview_time}, {interview_duration}, {interview_type}, {interviewer_name}, {meeting_link} (for video calls), {address} (for in-person), {interview_details}, {your_name}'
        },
        screening: {
            name: 'Screening Outreach',
            purpose: 'reach out to potential candidates and invite them to apply',
            tone: 'engaging, professional, and inviting',
            variables: '{candidate_name}, {job_title}, {company_name}, {your_name}, {cv_upload_link}'
        },
        rejection: {
            name: 'Rejection Letter',
            purpose: 'politely inform candidates that they were not selected',
            tone: 'respectful, empathetic, and encouraging',
            variables: '{candidate_name}, {job_title}, {company_name}, {your_name}'
        },
        offer: {
            name: 'Offer Letter',
            purpose: 'extend a job offer to a selected candidate',
            tone: 'excited, professional, and welcoming',
            variables: '{candidate_name}, {job_title}, {position_title}, {company_name}, {salary}, {salary_amount}, {salary_currency}, {salary_period}, {start_date}, {expires_at}, {benefits}, {benefits_list}, {notes}, {your_name}, {offer_response_link}'
        },
        hired: {
            name: 'Hired/Onboarding Letter',
            purpose: 'welcome newly hired candidates and provide onboarding information',
            tone: 'enthusiastic, welcoming, and informative',
            variables: '{candidate_name}, {company_name}, {job_title}, {your_name}'
        },
        reschedule: {
            name: 'Interview Reschedule',
            purpose: 'notify candidates when an interview has been rescheduled',
            tone: 'apologetic, professional, and clear',
            variables: '{candidate_name}, {job_title}, {company_name}, {old_interview_date}, {old_interview_time}, {previous_interview_time}, {interview_date}, {interview_time}, {new_interview_time}, {meeting_link} (for video calls), {address} (for in-person), {your_name}'
        }
    };

    const templateInfo = templateDescriptions[templateType];
    if (!templateInfo) {
        throw new Error(`Unknown template type: ${templateType}`);
    }

    // Add multiple layers of variation to ensure different templates each time
    const styleVariations = [
        { 
            style: 'direct and concise', 
            opening: 'Start with a direct, impactful statement that immediately captures attention', 
            structure: 'Use short, punchy paragraphs (2-3 sentences each)',
            example: 'Example opening: "Your application stood out to us."'
        },
        { 
            style: 'warm and conversational', 
            opening: 'Begin with a friendly, personal greeting that feels genuine', 
            structure: 'Use longer, flowing paragraphs that feel like a conversation',
            example: 'Example opening: "Hi {candidate_name}, I hope this message finds you well."'
        },
        { 
            style: 'professional and formal', 
            opening: 'Start with a formal, respectful salutation and professional tone', 
            structure: 'Use structured sections with clear headings or breaks',
            example: 'Example opening: "Dear {candidate_name}, We are writing to inform you..."'
        },
        { 
            style: 'enthusiastic and energetic', 
            opening: 'Begin with excitement and positive energy', 
            structure: 'Use varied sentence lengths to create rhythm and energy',
            example: 'Example opening: "Great news! We\'re excited to..."'
        },
        { 
            style: 'personal and authentic', 
            opening: 'Start with a personal touch that shows genuine interest', 
            structure: 'Mix short and long paragraphs to create natural flow',
            example: 'Example opening: "I wanted to reach out personally because..."'
        },
        {
            style: 'modern and innovative',
            opening: 'Start with a fresh, contemporary approach that breaks traditional patterns',
            structure: 'Use a modern email format with creative formatting',
            example: 'Example opening: "We noticed something special about your profile."'
        }
    ];
    
    const structureApproaches = [
        { approach: 'traditional email format', detail: 'with clear sections: greeting, body, closing' },
        { approach: 'modern streamlined format', detail: 'with minimal formality, maximum impact' },
        { approach: 'bullet points or lists', detail: 'where appropriate to break up information' },
        { approach: 'narrative flow', detail: 'that tells a story or creates a journey' },
        { approach: 'question-based engagement', detail: 'that invites the reader to think and respond' },
        { approach: 'benefit-focused structure', detail: 'that highlights what\'s in it for the candidate' }
    ];
    
    const closingStyles = [
        { style: 'warm personal closing', example: 'Example: "Looking forward to connecting with you!"' },
        { style: 'professional standard closing', example: 'Example: "Best regards,"' },
        { style: 'action-oriented closing', example: 'Example: "Let\'s schedule a time to discuss next steps."' },
        { style: 'enthusiastic closing', example: 'Example: "We can\'t wait to hear from you!"' },
        { style: 'friendly conversational closing', example: 'Example: "Feel free to reach out if you have any questions."' },
        { style: 'forward-looking closing', example: 'Example: "Excited about the possibility of working together."' }
    ];
    
    // Randomly select variations - this ensures different combinations each time
    const selectedStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];
    const selectedStructure = structureApproaches[Math.floor(Math.random() * structureApproaches.length)];
    const selectedClosing = closingStyles[Math.floor(Math.random() * closingStyles.length)];
    
    // Add unique identifier and random elements to force variation
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const randomWords = ['innovative', 'dynamic', 'compelling', 'memorable', 'distinctive', 'fresh', 'original', 'engaging', 'captivating', 'inspiring'];
    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    // Add random context to make each prompt truly unique
    const contextVariations = [
        'for a fast-growing tech startup',
        'for a Fortune 500 company',
        'for a creative agency',
        'for a healthcare organization',
        'for a financial services firm',
        'for a non-profit organization',
        'for a consulting firm',
        'for a manufacturing company'
    ];
    const randomContext = contextVariations[Math.floor(Math.random() * contextVariations.length)];
    
    // Create few-shot examples that vary
    const exampleTemplates = {
        interview: [
            {
                subject: 'Let\'s Talk: {job_title} Opportunity at {company_name}',
                opening: 'Hi {candidate_name},\n\nYour background caught our attention, and we\'d love to learn more about you.'
            },
            {
                subject: 'Next Step: Interview for {job_title} Role',
                opening: 'Dear {candidate_name},\n\nCongratulations! Your application for the {job_title} position has progressed to the interview stage.'
            },
            {
                subject: 'Interview Invitation: {job_title} at {company_name}',
                opening: '{candidate_name},\n\nWe were impressed by your qualifications and would like to invite you for an interview.'
            }
        ],
        screening: [
            {
                subject: 'An Opportunity That Matches Your Profile',
                opening: 'Hi {candidate_name},\n\nWe came across your profile and believe you\'d be an excellent fit for our {job_title} position.'
            },
            {
                subject: 'We\'d Love to Connect About {job_title}',
                opening: 'Dear {candidate_name},\n\nYour experience aligns perfectly with what we\'re looking for in our {job_title} role.'
            }
        ],
        rejection: [
            {
                subject: 'Update on Your {job_title} Application',
                opening: 'Dear {candidate_name},\n\nThank you for taking the time to apply for the {job_title} position at {company_name}.'
            },
            {
                subject: 'Regarding Your Application for {job_title}',
                opening: 'Hi {candidate_name},\n\nWe appreciate your interest in joining our team as {job_title}.'
            }
        ],
        offer: [
            {
                subject: 'We\'d Like to Extend an Offer: {job_title}',
                opening: 'Dear {candidate_name},\n\nWe\'re thrilled to extend an offer for the {job_title} position at {company_name}.'
            },
            {
                subject: 'Congratulations! Job Offer for {job_title}',
                opening: 'Hi {candidate_name},\n\nGreat news! We\'d like to formally offer you the {job_title} position.'
            }
        ],
        hired: [
            {
                subject: 'Welcome to {company_name}!',
                opening: 'Dear {candidate_name},\n\nWelcome aboard! We\'re excited to have you join our team as {job_title}.'
            },
            {
                subject: 'Your Journey at {company_name} Begins',
                opening: 'Hi {candidate_name},\n\nCongratulations on your new role! We\'re delighted to welcome you as our new {job_title}.'
            }
        ]
    };
    
    const examples = exampleTemplates[templateType] || exampleTemplates.interview;
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    
    // Create a more dynamic prompt with explicit variation instructions
    const variationInstructions = [
        'Use a completely different sentence structure than typical emails',
        'Start with an unexpected opening that grabs attention',
        'Include a unique perspective or angle',
        'Use creative formatting or structure',
        'Add a personal touch that feels authentic',
        'Create a narrative or story element',
        'Use questions to engage the reader',
        'Include specific details that make it memorable'
    ];
    const selectedVariation = variationInstructions[Math.floor(Math.random() * variationInstructions.length)];
    
    const prompt = `You are an expert HR and recruitment professional with 15+ years of experience crafting effective, memorable recruitment emails ${randomContext}. Your specialty is creating ${randomWord} templates that stand out.

TASK: Generate a COMPLETELY UNIQUE email template for ${templateInfo.name} that will ${templateInfo.purpose}.

CRITICAL: This is generation #${randomNumber} with unique ID ${uniqueId}. You MUST create a template that is COMPLETELY DIFFERENT from any previous generation. Do NOT reuse any phrases, structures, or approaches.

EXAMPLE OF VARIATION (Do NOT copy this, but use it as inspiration for creating something different):
Subject: ${randomExample.subject}
Opening: ${randomExample.opening}

STYLE SPECIFICATIONS (Follow these EXACTLY - they are different from the example above):
- Overall Writing Style: ${selectedStyle.style}
- Opening Approach: ${selectedStyle.opening}
  ${selectedStyle.example}
- Email Structure: ${selectedStructure.approach} ${selectedStructure.detail}
- Closing Style: ${selectedClosing.style}
  ${selectedClosing.example}
- Tone: ${templateInfo.tone}
- Context: ${randomContext}
- Variation Technique: ${selectedVariation}

CONTENT REQUIREMENTS:
- Professional and polished, but with distinct personality
- Clear and concise, yet engaging and memorable
- Include ALL required placeholders: ${templateInfo.variables}
- For interview template: Include a section with {interview_details} placeholder
- Variables must be in {variable_name} format
- Use specific, concrete language - avoid vague or generic phrases
- Vary sentence structure and length throughout
- Create a subject line that is unique and attention-grabbing (max 60 characters)
- Make it feel ${randomWord} and authentic
- Apply this variation technique: ${selectedVariation}

STRUCTURE & FORMATTING REQUIREMENTS:
- Use proper paragraph breaks (\\n\\n between paragraphs for clear separation)
- Structure content with clear sections when appropriate (greeting, body, closing)
- Use line breaks strategically to create visual hierarchy and readability
- Keep paragraphs concise (2-4 sentences max per paragraph for better readability)
- Use natural flow: greeting → body content → closing/signature
- Ensure good readability with proper spacing between paragraphs
- Format content in a clean, professional structure similar to well-designed email templates

FORBIDDEN PHRASES (Do NOT use these - they are too common):
- "Thank you for your interest"
- "We are pleased to"
- "We would like to"
- "After careful consideration"
- "We appreciate your interest"
- "We hope this message finds you well"
- Any other generic corporate phrases

REQUIRED ELEMENTS:
1. SUBJECT LINE: Must be unique, compelling, and under 60 characters. It should be DIFFERENT from the example above and incorporate the ${selectedVariation} technique.
2. EMAIL BODY: Must follow the style specifications above. Be creative, original, and engaging while maintaining professionalism. The opening should be DIFFERENT from the example above and use the ${selectedVariation} technique.

IMPORTANT: Your template must be UNIQUE. Do not copy the example structure or wording. Create something fresh and original that follows the style specifications and uses the variation technique specified.

Format your response as JSON with "subject" and "content" fields. The content should use \\n for line breaks.`;

    try {
        // Get API key for logging (getAiClient will validate it)
        const apiKey = getApiKey();
        
        // Log the unique ID to verify different prompts are being generated
        const shortId = uniqueId.split('-')[1];
        console.log(`[Gemini] Generating template for ${templateType} (ID: ${shortId})`);
        console.log(`[Gemini] Style: ${selectedStyle.style} | Structure: ${selectedStructure.approach} | Closing: ${selectedClosing.style}`);
        console.log(`[Gemini] Random word: ${randomWord} | Context: ${randomContext} | Number: ${randomNumber}`);
        console.log(`[Gemini] Variation technique: ${selectedVariation}`);
        console.log(`[Gemini] Full prompt length: ${prompt.length} chars`);
        // Log API key status (NOT the key itself or its length to prevent leaks)
        console.log(`[Gemini] API key configured: ${apiKey ? 'Yes' : 'No'}`);
        
        // Add a small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
        
        // Try generating without strict JSON schema first to allow more variation
        // If that fails, fall back to structured generation
        let result;
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
                            subject: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["subject", "content"]
                    },
                    // Maximum creativity settings for variation - ensures different content each time
                    temperature: 1.0, // Maximum temperature for maximum variation (0-1 scale, 1.0 = most creative)
                    topP: 0.95, // Nucleus sampling for diversity (0-1, higher = more diverse)
                    topK: 50 // Consider top K tokens for variety (higher = more diverse word choices)
                },
            });

            const resultText = response.text;
            if (!resultText) throw new Error("No response from AI");
            
            const parsed = JSON.parse(resultText);
            result = {
                subject: parsed.subject || `Template for ${templateInfo.name}`,
                content: parsed.content || "Could not generate template content."
            };
            
            console.log(`[Gemini] Generated subject: "${result.subject.substring(0, 50)}..."`);
            console.log(`[Gemini] Content preview: "${result.content.substring(0, 100)}..."`);
        } catch (parseError) {
            console.error("[Gemini] JSON parsing error, trying alternative approach:", parseError);
            // Fallback: try without JSON schema
            const ai = getAiClient();
            const fallbackResponse: GenerateContentResponse = await ai.models.generateContent({
                model: modelId,
                contents: prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON in this exact format: {\"subject\": \"...\", \"content\": \"...\"}",
                config: {
                    temperature: 1.0,
                    topP: 0.95,
                    topK: 50
                },
            });
            
            const fallbackText = fallbackResponse.text || "";
            // Try to extract JSON from response
            const jsonMatch = fallbackText.match(/\{[\s\S]*"subject"[\s\S]*"content"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                result = {
                    subject: parsed.subject || `Template for ${templateInfo.name}`,
                    content: parsed.content || "Could not generate template content."
                };
            } else {
                throw new Error("Could not parse response");
            }
        }
        
        return result;
    } catch (error: any) {
        console.error("Gemini Template Generation Failed:", error);
        
        // Provide helpful error message for API key issues
        if (error?.message?.includes('API key') || error?.error?.message?.includes('API key')) {
            const errorMsg = 'Gemini API key is missing or invalid. Please:\n' +
                '1. Get your API key from https://aistudio.google.com/app/apikey\n' +
                '2. Add it to your .env file as: VITE_API_KEY=your_key_here\n' +
                '3. Restart your development server\n' +
                'See GEMINI_SETUP.md for detailed instructions.';
            console.error('[Gemini]', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Return a fallback template for other errors
        return getFallbackTemplate(templateType);
    }
};

const getFallbackTemplate = (templateType: string): EmailTemplateGeneration => {
    const fallbacks: Record<string, EmailTemplateGeneration> = {
        interview: {
            subject: 'Interview Invitation – {job_title} Position at {company_name}',
            content: 'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don\'t hesitate to reach out.\n\nWe look forward to meeting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'
        },
        screening: {
            subject: 'Application Invitation – {job_title} Position at {company_name}',
            content: 'Dear {candidate_name},\n\nWe are writing to express our interest in your professional profile. We believe you would be an excellent fit for the {job_title} position at {company_name}.\n\nWe would love to learn more about your experience and discuss how you could contribute to our team. If you\'re interested, please apply through our portal.\n\nLooking forward to hearing from you!\n\nBest regards,\n{company_name}'
        },
        rejection: {
            subject: 'Application Status Update – {job_title} Position at {company_name}',
            content: 'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name} and for taking the time to apply.\n\nAfter careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest in {company_name} and wish you the best in your job search.\n\nBest regards,\n{company_name}'
        },
        offer: {
            subject: 'Formal Job Offer – {position_title} at {company_name}',
            content: 'Dear {candidate_name},\n\nWe are delighted to extend a formal job offer for the {position_title} position at {company_name}.\n\nOffer Details:\nPosition: {position_title}\nSalary: {salary}\nStart Date: {start_date}\nExpires: {expires_at}\n\n{benefits}\n\nWe were impressed with your qualifications and believe you will be a valuable addition to our team.\n\nPlease review the offer details and let us know if you have any questions. We look forward to welcoming you to {company_name}!\n\nBest regards,\n{company_name}'
        },
        hired: {
            subject: 'Welcome to {company_name} – Onboarding Information',
            content: 'Dear {candidate_name},\n\nOn behalf of {company_name}, I would like to welcome you to our team! We are thrilled to have you join us as {job_title}.\n\nThis email contains important onboarding information. Please review the attached materials and don\'t hesitate to reach out if you have any questions.\n\nWe look forward to working with you!\n\nWelcome aboard!\n{company_name}'
        }
    };

    return fallbacks[templateType] || {
        subject: 'Email Template',
        content: 'Dear {candidate_name},\n\n[Email content here]\n\nBest regards,\n{company_name}'
    };
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Get AI chat response for general conversation
 */
export const getAIChatResponse = async (userPrompt: string, history: ChatMessage[] = []): Promise<string> => {
  const modelId = "gemini-2.0-flash";
  
  // Use the comprehensive system prompt with full platform knowledge
  const SYSTEM_PROMPT = COMPREHENSIVE_SYSTEM_PROMPT;

  try {
    const ai = getAiClient();
    
    // Build message history
    const contents = [
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })),
      { role: 'user' as const, parts: [{ text: userPrompt }] }
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.8,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");
    
    return resultText;
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    
    // Check for quota/rate limit error (429 RESOURCE_EXHAUSTED)
    if (error?.error?.code === 429 || error?.error?.status === 'RESOURCE_EXHAUSTED') {
      const errorMessage = error?.error?.message || '';
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('free tier')) {
        // Extract retry delay if available
        const retryDelay = error?.error?.details?.find((detail: any) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay;
        const delaySeconds = retryDelay ? Math.ceil(parseFloat(retryDelay.replace('s', ''))) : 60;
        
        // Check if it's a daily quota (limit: 0 means quota exhausted)
        const isDailyQuota = errorMessage.includes('PerDay') || errorMessage.includes('limit: 0');
        
        if (isDailyQuota) {
          return `⚠️ Daily quota exhausted: You've used all free tier requests for today. The quota resets in 24 hours, or you can upgrade to a paid plan at https://aistudio.google.com/ for unlimited usage.`;
        }
        
        return `⚠️ Rate limit reached: Please wait ${delaySeconds} seconds before trying again. To avoid this, upgrade to a paid plan at https://aistudio.google.com/ for higher limits.`;
      }
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    
    // Check for leaked API key error (403 PERMISSION_DENIED)
    if (error?.error?.code === 403 || error?.error?.status === 'PERMISSION_DENIED') {
      const errorMessage = error?.error?.message || '';
      const errorDetails = error?.error?.details || [];
      
      // Check for HTTP referrer blocking (common in localhost development)
      const isReferrerBlocked = errorMessage.includes('referer') || 
                                errorMessage.includes('referrer') ||
                                errorDetails.some((detail: any) => 
                                  detail.reason === 'API_KEY_HTTP_REFERRER_BLOCKED'
                                );
      
      if (isReferrerBlocked) {
        const referrer = errorDetails.find((detail: any) => detail.metadata?.httpReferrer);
        const referrerUrl = referrer?.metadata?.httpReferrer || 'localhost';
        
        return `🔒 API Key Referrer Restriction: Your Gemini API key is blocking requests from ${referrerUrl}.\n\n` +
               `If you don't have a Gemini API key yet:\n` +
               `1. Go to https://aistudio.google.com/app/apikey\n` +
               `2. Click "Create API Key"\n` +
               `3. Copy your API key\n` +
               `4. Add it to your .env file as: VITE_API_KEY=your_key_here\n` +
               `5. Restart your development server\n\n` +
               `If you already have an API key, to fix the referrer restriction:\n` +
               `1. Go to https://console.cloud.google.com/apis/credentials\n` +
               `2. Click on your Gemini API key\n` +
               `3. Under "Application restrictions" → "HTTP referrers (websites)"\n` +
               `4. Click "Add an item" and add: ${referrerUrl}/*\n` +
               `5. Also add: http://localhost:3002/* and http://localhost:5173/*\n` +
               `6. Click "Save"\n\n` +
               `Or remove the referrer restriction entirely for development.\n\n` +
               `See GEMINI_API_KEY_REFERRER_FIX.md for detailed instructions.`;
      }
      
      if (errorMessage.includes('leaked') || errorMessage.includes('reported')) {
        return "Your API key has been reported as leaked and needs to be replaced. Please generate a new API key from Google AI Studio and update your VITE_API_KEY environment variable.";
      }
      
      return "API access denied. Please check your API key permissions and ensure it's valid.";
    }
    
    // Check if it's an API key configuration error
    if (error?.message?.includes('API key') || error?.message?.includes('apiKey') || error?.message?.includes('not configured')) {
      return "I'm having trouble connecting. Please ensure your Gemini API key is configured correctly in your environment variables (VITE_API_KEY).";
    }
    
    // Generic error message
    return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
  }
};