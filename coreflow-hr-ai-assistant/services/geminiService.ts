
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client with the direct process.env.API_KEY string as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `You are CoreFlow AI, a world-class HR assistant. 
Your goal is to help recruiters manage candidates, draft professional communications, and analyze recruitment data. 
Be concise, professional, and helpful. 
Current dashboard context:
- 4 Active Jobs
- 33 Total Candidates
- 3 Qualified Candidates for the Senior Frontend role
- Average time to fill: 1 day.`;

export const getAIResponse = async (userPrompt: string, history: { role: string; text: string }[] = []) => {
  try {
    // Generate content using the recommended pattern, explicitly naming the model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.8,
        // maxOutputTokens is omitted to avoid potential response blocking per the guidelines
      }
    });

    // Directly access the .text property from GenerateContentResponse
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to connect to CoreFlow AI. Please check your API key.";
  }
};
