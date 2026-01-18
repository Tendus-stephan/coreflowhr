/**
 * Database configuration and Supabase client setup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from project root
// Try .env.local first (Vite convention), then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../../');

// Load environment variables with explicit paths
const envLocalPath = resolve(projectRoot, '.env.local');
const envPath = resolve(projectRoot, '.env');

console.log(`[Database Config] Loading env from: ${envLocalPath}`);
// IMPORTANT: override: true ensures .env.local values take precedence over any existing process.env values
const envLocalResult = dotenv.config({ path: envLocalPath, override: true });
if (envLocalResult.error) {
  console.log(`[Database Config] ⚠️  .env.local not found: ${envLocalResult.error.message}`);
} else {
  console.log(`[Database Config] ✅ Loaded .env.local`);
  if (envLocalResult.parsed) {
    console.log(`[Database Config]    Loaded ${Object.keys(envLocalResult.parsed).length} variables from .env.local`);
    // Show which Supabase vars were loaded
    if (envLocalResult.parsed.VITE_SUPABASE_URL || envLocalResult.parsed.SUPABASE_URL) {
      const url = envLocalResult.parsed.VITE_SUPABASE_URL || envLocalResult.parsed.SUPABASE_URL;
      console.log(`[Database Config]    SUPABASE_URL from file: ${url.substring(0, Math.min(50, url.length))}...`);
    }
  }
}

console.log(`[Database Config] Loading env from: ${envPath}`);
const envResult = dotenv.config({ path: envPath, override: false }); // Don't override .env.local values
if (envResult.error) {
  console.log(`[Database Config] ⚠️  .env not found (this is OK if using .env.local)`);
} else {
  console.log(`[Database Config] ✅ Loaded .env (${Object.keys(envResult.parsed || {}).length} variables)`);
}

// CRITICAL: Use values from .env.local file FIRST (if available), then fall back to process.env
// This ensures file values override system environment variables
const envVars = envLocalResult?.parsed || {};
let supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Ensure URL has https:// protocol
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.log(`[Database Config] ⚠️  URL missing protocol, adding https://`);
  supabaseUrl = `https://${supabaseUrl}`;
}

console.log(`[Database Config] SUPABASE_URL: ${supabaseUrl ? `${supabaseUrl.substring(0, Math.min(50, supabaseUrl.length))}...` : '❌ MISSING'}`);
console.log(`[Database Config] SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? `✅ Set (${supabaseServiceRoleKey.substring(0, 10)}...)` : '❌ MISSING'}`);
const adminUserId = process.env.ADMIN_USER_ID || process.env.VITE_ADMIN_USER_ID;
console.log(`[Database Config] ADMIN_USER_ID: ${adminUserId ? `✅ Set (${adminUserId.substring(0, 8)}...)` : '❌ MISSING'}`);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
    'You can use either SUPABASE_URL or VITE_SUPABASE_URL, and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY.');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

