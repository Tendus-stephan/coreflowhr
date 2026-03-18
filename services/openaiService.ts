import { supabase } from './supabase';
import { ParsedCVData } from './cvParser';

/**
 * Parse CV text using OpenAI via Supabase Edge Function
 * This keeps the API key secure on the server side
 */
export const parseCVWithOpenAI = async (
  cvText: string, 
  jobSkills?: string[]
): Promise<Partial<ParsedCVData>> => {
  console.log('📡 Calling Supabase Edge Function (parse-cv) for OpenAI CV parsing...');
  
  try {
    // Call Supabase Edge Function (API key is secure on server)
    const { data, error } = await supabase.functions.invoke('parse-cv', {
      body: {
        cvText,
        jobSkills: jobSkills || []
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw new Error(error.message || 'Failed to parse CV');
    }

    if (!data) {
      console.error('❌ No data returned from Edge Function');
      throw new Error('No data returned from CV parser');
    }

    console.log('✅ Edge Function returned parsed data successfully');
    
    // Return parsed data
    return data as Partial<ParsedCVData>;
    
  } catch (error: any) {
    console.error("❌ CV Parsing Failed:", error);
    throw new Error('CV parsing temporarily unavailable. Please try again.');
  }
};

