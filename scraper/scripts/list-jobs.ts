#!/usr/bin/env node
/**
 * Helper script to list active jobs (for getting job IDs to scrape)
 */

import { supabase } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function listJobs() {
  try {
    logger.info('Fetching active jobs...');

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, status, location, company')
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      console.log('\nNo active jobs found.');
      console.log('Create a job in the CoreFlow dashboard first, then run the scraper.\n');
      return;
    }

    console.log('\n=== Active Jobs ===\n');
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Company: ${job.company || 'N/A'}`);
      console.log(`   Location: ${job.location}`);
      console.log();
    });

    console.log('To scrape candidates for a job, run:');
    console.log(`npm run scraper:job -- --job-id <job-id> --sources linkedin\n`);
  } catch (error: any) {
    logger.error('Error listing jobs:', error);
    console.error('\nError:', error.message);
    
    if (error.message.includes('SUPABASE_URL') || error.message.includes('SERVICE_ROLE_KEY')) {
      console.error('\nMake sure you have set up your .env file with:');
      console.error('  SUPABASE_URL=your_supabase_url');
      console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n');
    }
    
    process.exit(1);
  }
}

listJobs();


