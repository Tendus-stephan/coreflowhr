#!/usr/bin/env node
/**
 * CLI script to scrape candidates for a specific job
 * 
 * Usage:
 *   npm run scraper:job -- --job-id <uuid> [options]
 * 
 * Options:
 *   --job-id <uuid>        Job ID to scrape candidates for (required)
 *   --sources <list>       Comma-separated list of sources (linkedin,github,jobboard)
 *   --max-candidates <n>   Maximum candidates to scrape per source (default: 50)
 *   --min-match-score <n>  Minimum match score to save (default: 60)
 *   --provider <name>      Preferred provider (apify or scraperapi)
 */

import { ScrapingService } from '../src/services/ScrapingService';
import { ScrapeOptions } from '../src/types';
import { logger } from '../src/utils/logger';

// Parse command line arguments
function parseArgs(): { jobId: string; options: ScrapeOptions } {
  const args = process.argv.slice(2);
  let jobId = '';
  const options: ScrapeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--job-id' && nextArg) {
      jobId = nextArg;
      i++;
    } else if (arg === '--sources' && nextArg) {
      options.sources = nextArg.split(',').map(s => s.trim()) as any;
      i++;
    } else if (arg === '--max-candidates' && nextArg) {
      options.maxCandidates = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--min-match-score' && nextArg) {
      options.minMatchScore = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--provider' && nextArg) {
      options.provider = nextArg as 'apify' | 'scraperapi';
      i++;
    }
  }

  if (!jobId) {
    console.error('Error: --job-id is required');
    console.log('\nUsage:');
    console.log('  npm run scraper:job -- --job-id <uuid> [options]');
    console.log('\nOptions:');
    console.log('  --job-id <uuid>        Job ID to scrape candidates for (required)');
    console.log('  --sources <list>       Comma-separated list (linkedin,github,jobboard)');
    console.log('  --max-candidates <n>   Maximum candidates per source (default: 50)');
    console.log('  --min-match-score <n>  Minimum match score (default: 60)');
    console.log('  --provider <name>      Preferred provider (apify or scraperapi)');
    process.exit(1);
  }

  return { jobId, options };
}

// Main execution
async function main() {
  try {
    const { jobId, options } = parseArgs();

    logger.info('Starting candidate scraping...', { jobId, options });

    const scrapingService = new ScrapingService();
    const results = await scrapingService.scrapeForJob(jobId, options);

    // Print results
    console.log('\n=== Scraping Results ===\n');
    
    let totalFound = 0;
    let totalSaved = 0;

    for (const result of results) {
      const status = result.success ? '✓' : '✗';
      console.log(`${status} ${result.source.toUpperCase()}:`);
      console.log(`   Found: ${result.candidatesFound}`);
      console.log(`   Saved: ${result.candidatesSaved}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      console.log();

      totalFound += result.candidatesFound;
      totalSaved += result.candidatesSaved;
    }

    console.log('=== Summary ===');
    console.log(`Total candidates found: ${totalFound}`);
    console.log(`Total candidates saved: ${totalSaved}`);
    console.log();

    if (totalSaved > 0) {
      logger.info(`Successfully saved ${totalSaved} candidates for job ${jobId}`);
    } else {
      logger.warn(`No candidates were saved for job ${jobId}`);
    }
  } catch (error: any) {
    logger.error('Scraping failed:', error);
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();


