#!/usr/bin/env node
/**
 * CLI script to scrape candidates for a specific job
 * 
 * Usage:
 *   npm run scraper:job -- --job-id <job-uuid> --sources linkedin,github --max-candidates 50
 */

// Must be first: Node 18.17 global File polyfill for undici
import '../src/polyfill-node18-file.mjs';

import { ScrapingService } from '../src/services/ScrapingService';
import { logger } from '../src/utils/logger';

interface CliOptions {
  jobId?: string;
  sources?: string;
  maxCandidates?: number;
  minMatchScore?: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--job-id' && args[i + 1]) {
      options.jobId = args[++i];
    } else if (arg === '--sources' && args[i + 1]) {
      options.sources = args[++i];
    } else if (arg === '--max-candidates' && args[i + 1]) {
      options.maxCandidates = parseInt(args[++i], 10);
    } else if (arg === '--min-match-score' && args[i + 1]) {
      options.minMatchScore = parseInt(args[++i], 10);
    }
  }

  return options;
}

async function scrapeJob() {
  try {
    const options = parseArgs();

    if (!options.jobId) {
      console.error('\n❌ Error: --job-id is required\n');
      console.log('Usage:');
      console.log('  npm run scraper:job -- --job-id <job-uuid> [options]\n');
      console.log('Options:');
      console.log('  --job-id <uuid>           Job ID to scrape candidates for (required)');
      console.log('  --sources <list>          Comma-separated sources: linkedin,github,mightyrecruiter,jobspider');
      console.log('  --max-candidates <num>    Maximum candidates to scrape (default: 50, max: 200)');
      console.log('  --min-match-score <num>   Minimum match score (default: 60)\n');
      process.exit(1);
    }

    logger.info('Starting scraper...');
    
    const scrapingService = new ScrapingService();
    
    // Parse sources
    const sources = options.sources
      ? options.sources.split(',').map(s => s.trim().toLowerCase()) as any[]
      : undefined;

    const scrapeOptions = {
      sources,
      maxCandidates: options.maxCandidates,
      minMatchScore: options.minMatchScore,
    };

    logger.info(`Scraping job: ${options.jobId}`, scrapeOptions);
    
    const results = await scrapingService.scrapeForJob(options.jobId, scrapeOptions);

    console.log('\n=== Scraping Complete ===\n');
    
    let totalSaved = 0;
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.source.toUpperCase()}`);
      console.log(`   Candidates found: ${result.candidatesFound}`);
      console.log(`   Candidates saved: ${result.candidatesSaved}`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }
      console.log();
      totalSaved += result.candidatesSaved;
    });

    console.log(`Total candidates saved: ${totalSaved}\n`);
    console.log('View results in CoreFlow:');
    console.log('  http://localhost:3002 → Candidates → Filter by source: "scraped"\n');
    
    process.exit(0);
  } catch (error: any) {
    logger.error('Error running scraper:', error);
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('SUPABASE_URL') || error.message.includes('SERVICE_ROLE_KEY')) {
      console.error('\nMake sure you have set up your .env file with:');
      console.error('  SUPABASE_URL=your_supabase_url');
      console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n');
    }
    
    if (error.message.includes('APIFY_API_TOKEN')) {
      console.error('\nMake sure you have set up your .env file with:');
      console.error('  APIFY_API_TOKEN=your_apify_token\n');
    }
    
    process.exit(1);
  }
}

scrapeJob();
