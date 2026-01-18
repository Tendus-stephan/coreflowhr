/**
 * Quick test script to verify scraper is working
 * Run with: node test-scraper.js
 */

const testScraper = async () => {
  console.log('🧪 Testing Scraper Setup...\n');

  // Test 1: Check if scraper server is running
  console.log('1️⃣ Checking scraper server...');
  try {
    const response = await fetch('http://localhost:3005/api/health');
    const data = await response.json();
    console.log('✅ Scraper server is running:', data);
  } catch (error) {
    console.error('❌ Scraper server not running:', error.message);
    console.log('   → Start it with: npm run scraper-ui:server');
    return;
  }

  // Test 2: Check Apify configuration
  console.log('\n2️⃣ Checking Apify configuration...');
  try {
    // Check if APIFY_API_TOKEN is set (basic check)
    const hasToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN;
    if (hasToken) {
      console.log('✅ APIFY_API_TOKEN is set (length:', hasToken.length, ')');
    } else {
      console.warn('⚠️  APIFY_API_TOKEN not found in environment');
      console.log('   → Add APIFY_API_TOKEN to .env.local');
      console.log('   → Get token from: https://apify.com/settings/integrations');
    }
  } catch (error) {
    console.error('❌ Error checking Apify config:', error.message);
  }

  // Test 3: Check Supabase connection (from scraper perspective)
  console.log('\n3️⃣ Checking Supabase connection...');
  try {
    // This would require Supabase client setup, but we can at least check if env vars exist
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      console.log('✅ Supabase credentials found');
      console.log('   URL:', supabaseUrl.substring(0, 30) + '...');
    } else {
      console.warn('⚠️  Supabase credentials not found');
      console.log('   → Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    }
  } catch (error) {
    console.error('❌ Error checking Supabase:', error.message);
  }

  console.log('\n✅ Test complete!');
};

testScraper().catch(console.error);
