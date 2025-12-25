import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These should be set as environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fail fast if critical configuration is missing
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'CRITICAL: Supabase configuration missing. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables. ' +
    'Application cannot start without these values.';
  
  if (typeof window !== 'undefined') {
    // In browser, show user-friendly error
    console.error(errorMessage);
    // Could also show a modal or redirect to setup page
  } else {
    // In Node/SSR, throw error
    throw new Error(errorMessage);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


