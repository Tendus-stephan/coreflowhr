// Simple test to verify Apify LinkedIn actor is working
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN || 'YOUR_APIFY_API_TOKEN_HERE'
});

async function testApify() {
  console.log('🧪 Testing Apify LinkedIn actor...\n');
  
  // Test 1: Very simple query, no location
  console.log('Test 1: Simple query "software engineer" (no location)');
  try {
    const run1 = await client.actor('harvestapi/linkedin-profile-search').call({
      searchQuery: 'software engineer',
      maxResults: 5,
      maxItems: 5, // Add to avoid warning
      takePages: 1 // Add to avoid warning
    });
    
    const dataset1 = await client.dataset(run1.defaultDatasetId).listItems();
    console.log(`✅ Found ${dataset1.items.length} profiles\n`);
    
    if (dataset1.items.length > 0) {
      console.log('Sample profile:', {
        name: dataset1.items[0].fullName || dataset1.items[0].name,
        location: dataset1.items[0].location,
        headline: dataset1.items[0].headline
      });
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Simple query with location
  console.log('\nTest 2: Simple query "business analyst" with location "New York"');
  try {
    const run2 = await client.actor('harvestapi/linkedin-profile-search').call({
      searchQuery: 'business analyst',
      locations: ['New York'],
      maxResults: 5,
      maxItems: 5, // Add to avoid warning
      takePages: 1 // Add to avoid warning
    });
    
    const dataset2 = await client.dataset(run2.defaultDatasetId).listItems();
    console.log(`✅ Found ${dataset2.items.length} profiles\n`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Test with Roseland (small city)
  console.log('\nTest 3: Simple query "business analyst" with location "Roseland"');
  try {
    const run3 = await client.actor('harvestapi/linkedin-profile-search').call({
      searchQuery: 'business analyst',
      locations: ['Roseland'],
      maxResults: 5,
      maxItems: 5, // Add to avoid warning
      takePages: 1 // Add to avoid warning
    });
    
    const dataset3 = await client.dataset(run3.defaultDatasetId).listItems();
    console.log(`✅ Found ${dataset3.items.length} profiles\n`);
    
    if (dataset3.items.length === 0) {
      console.log('⚠️  Roseland might be too small - trying nearby "Newark" instead...');
      const run4 = await client.actor('harvestapi/linkedin-profile-search').call({
        searchQuery: 'business analyst',
        locations: ['Newark'], // Nearby larger city
        maxResults: 5,
        maxItems: 5, // Add to avoid warning
        takePages: 1 // Add to avoid warning
      });
      const dataset4 = await client.dataset(run4.defaultDatasetId).listItems();
      console.log(`✅ Found ${dataset4.items.length} profiles with "Newark"\n`);
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
}

testApify().catch(console.error);
