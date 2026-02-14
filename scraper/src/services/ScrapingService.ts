/**
 * Main scraping service orchestrator
 * Coordinates between providers and processes candidates
 */

import { Job, ScrapeOptions, ScrapeResult, ScrapedCandidate } from '../types';
import { ApifyService } from './providers/ApifyService';
import { GitHubService } from './providers/GitHubService';
import { MightyRecruiterService } from './providers/MightyRecruiterService';
import { JobSpiderService } from './providers/JobSpiderService';
import { DatabaseService } from './DatabaseService';
import { CandidateProcessor } from './CandidateProcessor';
import { buildLinkedInQuery, buildGitHubQuery, buildMightyRecruiterQuery, buildJobSpiderQuery } from '../utils/queryBuilder';
import { validateProviderConfig, providerConfig } from '../config/providers';
import { logger } from '../utils/logger';
import { recommendSources, isTechnicalJob, type SourceType } from '../utils/jobAnalyzer';

export class ScrapingService {
  private apifyService: ApifyService | null;
  private githubService: GitHubService | null;
  private mightyRecruiterService: MightyRecruiterService | null;
  private jobSpiderService: JobSpiderService | null;
  private databaseService: DatabaseService;
  private candidateProcessor: CandidateProcessor;

  constructor() {
    // Initialize services (all FREE sources for candidate profiles)
    try {
      this.apifyService = new ApifyService(); // LinkedIn
    } catch (error: any) {
      logger.error('Failed to initialize ApifyService:', error);
      this.apifyService = null;
    }

    try {
      this.githubService = new GitHubService(); // GitHub API - FREE
    } catch (error: any) {
      logger.error('Failed to initialize GitHubService:', error);
      this.githubService = null;
    }

    try {
      this.mightyRecruiterService = new MightyRecruiterService(); // FREE - 21M+ resumes
    } catch (error: any) {
      logger.error('Failed to initialize MightyRecruiterService:', error);
      this.mightyRecruiterService = null;
    }

    try {
      this.jobSpiderService = new JobSpiderService(); // FREE resume database
    } catch (error: any) {
      logger.error('Failed to initialize JobSpiderService:', error);
      this.jobSpiderService = null;
    }

    this.databaseService = new DatabaseService();
    this.candidateProcessor = new CandidateProcessor();
  }

  /**
   * Scrape candidates for a specific job
   */
  async scrapeForJob(jobId: string, options: ScrapeOptions = {}): Promise<ScrapeResult[]> {
    logger.info(`Starting scraping for job ${jobId}`, { options });

    // Get job details
    const job = await this.databaseService.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'Active') {
      logger.warn(`Job ${jobId} is not active (status: ${job.status}). Skipping scraping.`);
      return [];
    }

    const results: ScrapeResult[] = [];
    // Default cap: 50 candidates per job to control costs
    // Can be overridden via options, but max 200 to prevent excessive usage
    const maxCandidates = Math.min(options.maxCandidates || 50, 200);
    
    logger.info(`Scraping job: "${job.title}" (${job.department})`);
    logger.info(`Max candidates: ${maxCandidates}`);

    // Intelligently determine sources based on job characteristics
    // FREE sources that provide candidate profiles: LinkedIn, GitHub, MightyRecruiter, JobSpider
    const availableSources: SourceType[] = options.sources || ['linkedin', 'github', 'mightyrecruiter', 'jobspider'];
    const sourceRecommendations = recommendSources(job, maxCandidates, availableSources);

    if (sourceRecommendations.length === 0) {
      logger.warn(`No suitable sources found for job: ${job.title}`);
      return results;
    }

    // Log job analysis
    const isTechnical = isTechnicalJob(job);
    logger.info(`Job classification: ${isTechnical ? 'Technical' : 'Non-Technical'}`);
    logger.info(`Recommended sources: ${sourceRecommendations.map(r => `${r.source} (${r.quota} candidates)`).join(', ')}`);

    // Scrape from each recommended source with equal distribution
    for (const recommendation of sourceRecommendations) {
      const { source, quota, reason } = recommendation;
      
      logger.info(`Scraping from ${source.toUpperCase()}: ${quota} candidates requested. Reason: ${reason}`);

      try {
        let candidates: ScrapedCandidate[] = [];

        // Scrape with source-specific quota
        if (source === 'linkedin') {
          candidates = await this.scrapeLinkedIn(job, { ...options, maxCandidates: quota });
        } else if (source === 'github') {
          candidates = await this.scrapeGitHub(job, { ...options, maxCandidates: quota });
        } else if (source === 'mightyrecruiter') {
          candidates = await this.scrapeMightyRecruiter(job, { ...options, maxCandidates: quota });
        } else if (source === 'jobspider') {
          candidates = await this.scrapeJobSpider(job, { ...options, maxCandidates: quota });
        } else {
          logger.warn(`Unknown source: ${source}. Skipping.`);
          continue;
        }

        // Process and save candidates - continue fetching until we have enough UNIQUE candidates
        // Fetch larger batches upfront (2-3x requested) to account for duplicates
        let allCandidates = candidates;
        
        // Prioritize candidates by job-seeking signals BEFORE processing
        // Sort by openToWork flag and job-seeking signals (highest priority first)
        allCandidates = allCandidates.sort((a, b) => {
          const aRaw = a.rawData || {};
          const bRaw = b.rawData || {};
          
          // Highest priority: openToWork = true
          if (aRaw.openToWork === true && bRaw.openToWork !== true) return -1;
          if (bRaw.openToWork === true && aRaw.openToWork !== true) return 1;
          
          // Second priority: hiring = false (not actively hiring, more likely available)
          if (aRaw.hiring === false && bRaw.hiring === true) return -1;
          if (bRaw.hiring === false && aRaw.hiring === true) return 1;
          
          // Third priority: Check for job-seeking keywords in summary
          const aText = (a.resumeSummary || '').toLowerCase();
          const bText = (b.resumeSummary || '').toLowerCase();
          const seekingKeywords = ['open to', 'looking for', 'seeking', 'available', 'actively'];
          const aHasKeywords = seekingKeywords.some(kw => aText.includes(kw));
          const bHasKeywords = seekingKeywords.some(kw => bText.includes(kw));
          if (aHasKeywords && !bHasKeywords) return -1;
          if (bHasKeywords && !aHasKeywords) return 1;
          
          return 0; // Equal priority
        });
        
        let saved = 0;
        let attempts = 0;
        let apifyRunsUsed = 0; // Track Apify runs for cost tracking
        const maxAttempts = 10; // Increased to ensure we can fetch enough candidates
        const fetchMultiplier = 2; // Fetch 2x to account for duplicates (reduced from 3 to save runs)
        
        // Track initial fetch
        if (source === 'linkedin') {
          apifyRunsUsed++;
          logger.info(`📊 Apify run #${apifyRunsUsed} (initial fetch: ${candidates.length} candidates)`);
        }
        
        // If initial fetch wasn't enough, fetch more upfront
        if (candidates.length < quota * fetchMultiplier) {
          logger.info(`📥 Fetching larger batch (${quota * fetchMultiplier} candidates) to ensure enough unique results...`);
          try {
            let moreCandidates: ScrapedCandidate[] = [];
            if (source === 'linkedin') {
              apifyRunsUsed++; // Track Apify run usage
              logger.info(`📊 Apify run #${apifyRunsUsed} (requesting ${quota * fetchMultiplier} candidates)`);
              moreCandidates = await this.scrapeLinkedIn(job, { ...options, maxCandidates: quota * fetchMultiplier });
            } else if (source === 'github') {
              moreCandidates = await this.scrapeGitHub(job, { ...options, maxCandidates: quota * fetchMultiplier });
            } else if (source === 'mightyrecruiter') {
              moreCandidates = await this.scrapeMightyRecruiter(job, { ...options, maxCandidates: quota * fetchMultiplier });
            } else if (source === 'jobspider') {
              moreCandidates = await this.scrapeJobSpider(job, { ...options, maxCandidates: quota * fetchMultiplier });
            }
            // Merge and deduplicate by name before processing
            const seenNames = new Set(allCandidates.map(c => c.name?.toLowerCase().trim()).filter(Boolean));
            const newUnique = moreCandidates.filter(c => {
              const name = c.name?.toLowerCase().trim();
              return name && !seenNames.has(name);
            });
            allCandidates = [...allCandidates, ...newUnique];
          } catch (error: any) {
            logger.warn(`⚠️ Failed to fetch larger batch: ${error.message}`);
          }
        }
        
        // Process candidates until we have EXACTLY the requested number
        // Continue fetching until quota is met (NO match score filtering)
        let processedCount = 0; // Track how many candidates we've processed from allCandidates
        let consecutiveEmptyFetches = 0; // Track consecutive empty fetches to detect source exhaustion
        let invalidCount = 0; // Track invalid candidates
        let duplicateCount = 0; // Track duplicate candidates
        let saveErrorCount = 0; // Track save errors
        
        while (saved < quota && attempts < maxAttempts) {
          const needed = quota - saved;
          
          // Process remaining candidates until we have enough unique, valid ones
          while (saved < quota && processedCount < allCandidates.length) {
            const candidate = allCandidates[processedCount];
            processedCount++;
            
            try {
              // Process and validate
              const processed = this.candidateProcessor.processCandidate(candidate, job);

              // Skip invalid candidates (but continue processing more)
              if (!processed.isValid) {
                invalidCount++;
                logger.warn(`⚠️ Skipping invalid candidate "${processed.name || 'Unknown'}": ${processed.validationErrors.join(', ')}. Will fetch replacement.`);
                continue;
              }

              // Save to database (duplicates will be skipped here)
              const result = await this.databaseService.saveCandidate(job, processed);

              if (result.success) {
                saved++;
                logger.info(`✅ Saved candidate: ${processed.name} (match: ${processed.matchScore}%) - ${saved}/${quota}`);
              } else if (result.error?.includes('already exists')) {
                // Duplicate - skip and continue to find more
                duplicateCount++;
                logger.debug(`⏭️ Skipped duplicate: ${processed.name}`);
              } else {
                saveErrorCount++;
                logger.error(`❌ Failed to save candidate "${processed.name}": ${result.error}`);
              }
            } catch (error: any) {
              logger.error(`Error processing candidate ${candidate.name}:`, error);
            }
          }
          
          // If we have the exact quota, stop immediately
          if (saved >= quota) {
            break;
          }
          
          // If we still need more unique candidates, fetch more to replace invalid/duplicate ones
          if (saved < quota && attempts < maxAttempts - 1) {
            attempts++;
            const additionalNeeded = quota - saved;
            logger.info(`📥 Need ${additionalNeeded} more valid candidates (saved ${saved}/${quota}). Fetching ${Math.max(additionalNeeded * fetchMultiplier, 10)} more to account for invalid/duplicate candidates...`);
            
            try {
              let moreCandidates: ScrapedCandidate[] = [];
              if (source === 'linkedin') {
                apifyRunsUsed++; // Track Apify run usage
                logger.info(`📊 Apify run #${apifyRunsUsed} (requesting ${Math.max((quota - saved) * fetchMultiplier, 10)} candidates)`);
                moreCandidates = await this.scrapeLinkedIn(job, { ...options, maxCandidates: Math.max((quota - saved) * fetchMultiplier, 10) });
              } else if (source === 'github') {
                moreCandidates = await this.scrapeGitHub(job, { ...options, maxCandidates: Math.max((quota - saved) * fetchMultiplier, 10) });
              } else if (source === 'mightyrecruiter') {
                moreCandidates = await this.scrapeMightyRecruiter(job, { ...options, maxCandidates: Math.max((quota - saved) * fetchMultiplier, 10) });
              } else if (source === 'jobspider') {
                moreCandidates = await this.scrapeJobSpider(job, { ...options, maxCandidates: Math.max((quota - saved) * fetchMultiplier, 10) });
              }
              
              // Deduplicate by name before adding (avoid processing same candidate twice)
              const seenNames = new Set(allCandidates.map(c => c.name?.toLowerCase().trim()).filter(Boolean));
              const newUnique = moreCandidates.filter(c => {
                const name = c.name?.toLowerCase().trim();
                return name && !seenNames.has(name);
              });
              allCandidates = [...allCandidates, ...newUnique];
              
              if (newUnique.length === 0) {
                consecutiveEmptyFetches++;
                logger.warn(`⚠️ No new unique candidates found (${consecutiveEmptyFetches} consecutive empty fetches). May have exhausted source.`);
                // Only break if we've had multiple consecutive empty fetches (source is exhausted)
                if (consecutiveEmptyFetches >= 3) {
                  logger.warn(`⚠️ Source appears exhausted. Stopping. Saved ${saved}/${quota} candidates.`);
                break;
                }
              } else {
                consecutiveEmptyFetches = 0; // Reset counter on successful fetch
                // Continue processing from where we left off (don't reset processedCount to 0)
                // processedCount already points to the next unprocessed candidate
              }
            } catch (error: any) {
              logger.warn(`⚠️ Failed to fetch more candidates: ${error.message}`);
              consecutiveEmptyFetches++;
              // Don't break immediately on error - try a few more times
              if (consecutiveEmptyFetches >= 3) {
              break;
              }
            }
          } else {
            break;
          }
        }

        // Log detailed statistics
        const stats = {
          found: allCandidates.length,
          saved,
          invalid: invalidCount,
          duplicates: duplicateCount,
          saveErrors: saveErrorCount,
          processed: processedCount
        };

        // Add diagnostic information if 0 candidates found
        const diagnostic: any = {};
        if (saved === 0 && allCandidates.length === 0) {
          // Build search query string for diagnostic purposes
          const searchQueryParts: string[] = [];
          if (job.title) {
            searchQueryParts.push(`"${job.title}"`);
          }
          if (job.skills && job.skills.length > 0) {
            const topSkills = job.skills.slice(0, 3).join(' OR ');
            searchQueryParts.push(`(${topSkills})`);
          }
          if (job.location && !job.remote) {
            searchQueryParts.push(job.location);
          }
          const searchQuery = searchQueryParts.join(' ');
          
          diagnostic.zeroResultsReason = {
            noCandidatesFound: true,
            possibleReasons: [
              'No LinkedIn profiles match the search criteria',
              'Search query too specific',
              'Location filter too restrictive',
              'Apify actor returned empty results',
              'Apify free tier limit reached'
            ],
            searchQuery: searchQuery || 'N/A',
            actorUsed: source || 'none',
            attempts: attempts,
            consecutiveEmptyFetches: consecutiveEmptyFetches
          };
        }

        results.push({
          success: true,
          candidatesFound: allCandidates.length,
          candidatesSaved: saved,
          source,
          statistics: stats,
          diagnostic: Object.keys(diagnostic).length > 0 ? diagnostic : undefined
        });

        if (source === 'linkedin' && apifyRunsUsed > 0) {
          logger.info(`✅ ${source.toUpperCase()}: Found ${allCandidates.length}, Saved ${saved} unique candidates (target: ${quota})`);
          logger.info(`📊 Statistics: ${stats.invalid} invalid, ${stats.duplicates} duplicates, ${stats.saveErrors} save errors`);
          logger.info(`📊 Apify runs used: ${apifyRunsUsed} (Free tier: 10 runs/day, ${10 - apifyRunsUsed} remaining today)`);
        } else {
        logger.info(`✅ ${source.toUpperCase()}: Found ${allCandidates.length}, Saved ${saved} unique candidates (target: ${quota})`);
          logger.info(`📊 Statistics: ${stats.invalid} invalid, ${stats.duplicates} duplicates, ${stats.saveErrors} save errors`);
        }
        
        // Warn if 0 candidates saved but some were found
        if (saved === 0 && allCandidates.length > 0) {
          logger.warn(`⚠️ WARNING: Found ${allCandidates.length} candidates but saved 0. Reasons: ${stats.invalid} invalid, ${stats.duplicates} duplicates, ${stats.saveErrors} save errors`);
        }
      } catch (error: any) {
        logger.error(`❌ Error scraping from ${source}:`, error);
        results.push({
          success: false,
          candidatesFound: 0,
          candidatesSaved: 0,
          source,
          errors: [error.message]
        });
      }
    }

    // Update job applicants count
    const totalSaved = results.reduce((sum, r) => sum + r.candidatesSaved, 0);
    if (totalSaved > 0) {
      await this.databaseService.updateJobApplicantsCount(jobId, totalSaved);
    }

    logger.info(`Scraping completed for job ${jobId}. Total saved: ${totalSaved}`);

    return results;
  }

  /**
   * Scrape LinkedIn profiles using Apify
   * Apify is our ONLY provider now - cost-effective, reliable, and has FREE tier!
   */
  private async scrapeLinkedIn(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    // Use the requested maxCandidates, but ensure it's at least 1
    const maxResults = Math.max(options.maxCandidates || 50, 1);
    
    // Log job data to verify location and experienceLevel are present
    logger.info(`📋 Job data for LinkedIn scraping:`, {
      title: job.title,
      location: job.location,
      experienceLevel: job.experienceLevel,
      remote: job.remote,
      skills: job.skills?.slice(0, 3) // Log first 3 skills
    });
    
    const query = buildLinkedInQuery(job, maxResults);
    
    // Log built query to verify location and experienceLevel are included
    logger.info(`📝 LinkedIn query built:`, {
      jobTitle: query.jobTitle,
      location: query.location,
      experienceLevel: query.experienceLevel,
      skills: query.skills?.slice(0, 3),
      maxResults: query.maxResults
    });
    
    // Ensure location and experienceLevel are passed to Apify
    if (!query.location && job.location && !job.remote) {
      logger.warn(`⚠️ Location is missing in query but exists in job: ${job.location}. Adding it.`);
      query.location = job.location;
    }
    if (!query.experienceLevel && job.experienceLevel) {
      logger.warn(`⚠️ Experience level is missing in query but exists in job: ${job.experienceLevel}. Adding it.`);
      query.experienceLevel = job.experienceLevel;
    }
    
    if (!this.apifyService) {
      throw new Error('ApifyService not initialized. Check server logs for initialization errors.');
    }

    try {
      // Check if token exists in config
      const hasToken = !!providerConfig.apify?.apiToken;
      logger.info(`[Apify Check] Token exists in config: ${hasToken}`);
      
      const isConfigured = await this.apifyService.isConfigured();
      logger.info(`[Apify Check] isConfigured() returned: ${isConfigured}`);
      
      if (isConfigured) {
        logger.info('✅ Using Apify for LinkedIn scraping (FREE tier: 5 compute units/month, then ~$0.25/unit)');
        return await this.apifyService.scrapeLinkedIn(query);
      } else {
        logger.warn(`[Apify Debug] Token in providerConfig: ${providerConfig.apify?.apiToken ? 'EXISTS (length: ' + providerConfig.apify.apiToken.length + ')' : 'MISSING'}`);
        throw new Error(
          'Apify not configured. Please set APIFY_API_TOKEN in .env.local\n\n' +
          'Setup:\n' +
          '1. Sign up at https://apify.com (FREE)\n' +
          '2. Go to Settings → Integrations → API tokens\n' +
          '3. Copy your API token\n' +
          '4. Add to .env.local: APIFY_API_TOKEN=your_token_here\n' +
          '5. Restart scraper UI server'
        );
      }
    } catch (error: any) {
      logger.error('Apify LinkedIn scraping failed:', error);
      logger.error(`[Apify Error] ${error.message}`);
      
      // Check if it's a free tier limit error - stop immediately
      if (error.message && error.message.includes('Free Tier Limit')) {
        logger.error('🚫 STOPPING: Apify free tier limit reached. No more runs will be attempted.');
        throw error; // Re-throw to stop the entire scraping process
      }
      
      if (error.stack) {
        logger.error(`[Apify Error Stack] ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Scrape GitHub developer profiles (FREE API)
   */
  private async scrapeGitHub(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    if (!this.githubService) {
      logger.warn('GitHubService not initialized, skipping GitHub');
      return [];
    }

    const isConfigured = await this.githubService.isConfigured();
    if (!isConfigured) {
      logger.warn('GitHub API not accessible. This is rare - GitHub API is usually always available.');
      return [];
    }

    const query = buildGitHubQuery(job, options.maxCandidates || 50);
    
    logger.info(`Scraping GitHub developers (FREE API) with quota: ${query.maxResults || 50} candidates`);
    logger.info(`✅ Using GitHub REST API (FREE - 5,000 requests/hour with token, 60/hour without)`);
    
    try {
      return await this.githubService.scrapeDevelopers(query);
    } catch (error: any) {
      logger.error('Error scraping GitHub developers:', error);
      throw new Error(`GitHub scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape MightyRecruiter resume database (FREE - 21M+ resumes)
   */
  private async scrapeMightyRecruiter(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    if (!this.mightyRecruiterService) {
      logger.warn('MightyRecruiterService not initialized, skipping MightyRecruiter');
      return [];
    }

    if (!this.mightyRecruiterService.isConfigured()) {
      logger.warn('MightyRecruiter not accessible');
      return [];
    }

    const query = buildMightyRecruiterQuery(job, options.maxCandidates || 50);
    
    logger.info(`Scraping MightyRecruiter resumes (FREE - 21M+ resumes) with quota: ${query.maxResults || 50} candidates`);
    logger.info(`✅ Using MightyRecruiter (FREE resume database)`);
    
    try {
      return await this.mightyRecruiterService.scrapeResumes(query);
    } catch (error: any) {
      logger.error('Error scraping MightyRecruiter resumes:', error);
      throw new Error(`MightyRecruiter scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape JobSpider resume database (FREE)
   */
  private async scrapeJobSpider(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    if (!this.jobSpiderService) {
      logger.warn('JobSpiderService not initialized, skipping JobSpider');
      return [];
    }

    if (!this.jobSpiderService.isConfigured()) {
      logger.warn('JobSpider not accessible');
      return [];
    }

    const query = buildJobSpiderQuery(job, options.maxCandidates || 50);
    
    logger.info(`Scraping JobSpider resumes (FREE) with quota: ${query.maxResults || 50} candidates`);
    logger.info(`✅ Using JobSpider (FREE resume database)`);
    
    try {
      return await this.jobSpiderService.scrapeResumes(query);
    } catch (error: any) {
      logger.error('Error scraping JobSpider resumes:', error);
      throw new Error(`JobSpider scraping failed: ${error.message}`);
    }
  }


  /**
   * Process and save candidates until we reach the target quota (skip duplicates and invalid, NO match score filtering)
   * Returns the number saved and the last processed index
   */
  private async processAndSaveCandidatesUntilQuota(
    job: Job,
    candidates: ScrapedCandidate[],
    targetQuota: number,
    minMatchScore: number // Not used for filtering, kept for compatibility
  ): Promise<{ saved: number; processedCount: number }> {
    let saved = 0;
    let processedCount = 0;
    
    // Process candidates until we reach the target quota
    for (const candidate of candidates) {
      if (saved >= targetQuota) {
        break; // We have enough
      }
      
      processedCount++;
      
      try {
        // Process and validate
        const processed = this.candidateProcessor.processCandidate(candidate, job);

        // Skip invalid candidates (but continue to find more)
        if (!processed.isValid) {
          logger.warn(`⚠️ Skipping invalid candidate "${processed.name || 'Unknown'}": ${processed.validationErrors.join(', ')}`);
          continue;
        }

        // Save to database (duplicates will be skipped here)
        const result = await this.databaseService.saveCandidate(job, processed);

        if (result.success) {
          saved++;
          logger.info(`✅ Saved candidate: ${processed.name}`);
        } else if (result.error?.includes('already exists')) {
          // Duplicate - skip and continue to find more
          logger.debug(`⏭️ Skipped duplicate: ${processed.name}`);
        } else {
          logger.error(`❌ Failed to save candidate "${processed.name}": ${result.error}`);
        }
      } catch (error: any) {
        logger.error(`Error processing candidate ${candidate.name}:`, error);
      }
    }

    return { saved, processedCount };
  }

  /**
   * Process and save candidates to database (legacy method - kept for compatibility)
   */
  private async processAndSaveCandidates(
    job: Job,
    candidates: ScrapedCandidate[],
    maxCandidates: number,
    minMatchScore: number // Still accepts this parameter for API compatibility, but doesn't filter by it
  ): Promise<number> {
    let saved = 0;
    let skippedInvalid = 0;
    let skippedDuplicates = 0;
    let errors = 0;

    // Process each candidate
    for (const candidate of candidates.slice(0, maxCandidates)) {
      try {
        // Process and validate
        const processed = this.candidateProcessor.processCandidate(candidate, job);

        if (!processed.isValid) {
          skippedInvalid++;
          logger.debug(`⚠️ Skipping invalid candidate "${processed.name}": ${processed.validationErrors.join(', ')}`);
          continue;
        }

        // NOTE: Match score filtering is disabled - save ALL candidates and let AI handle filtering later
        // Match scores are still calculated for ranking/display purposes only
        // if (processed.matchScore < minMatchScore) {
        //   skippedLowScore++;
        //   logger.debug(`⚠️ Skipping candidate "${processed.name}" (match score ${processed.matchScore} < ${minMatchScore})`);
        //   continue;
        // }

        // Save to database
        const result = await this.databaseService.saveCandidate(job, processed);

        if (result.success) {
          saved++;
          logger.info(`✅ Saved candidate: ${processed.name}`);
        } else if (result.error?.includes('already exists')) {
          skippedDuplicates++;
          logger.debug(`⏭️ Skipped duplicate: ${processed.name}`);
        } else {
          errors++;
          logger.error(`❌ Failed to save candidate "${processed.name}": ${result.error}`);
        }
      } catch (error: any) {
        errors++;
        logger.error(`Error processing candidate ${candidate.name}:`, error);
      }
    }

    // Log summary (no match score filtering - only duplicates and invalid are skipped)
    if (candidates.length > 0) {
      const summary = [
        `📊 Processing summary:`,
        `   • Processed: ${candidates.length}`,
        `   • Saved: ${saved}`,
        skippedDuplicates > 0 ? `   • Duplicates skipped: ${skippedDuplicates}` : null,
        skippedInvalid > 0 ? `   • Invalid skipped: ${skippedInvalid}` : null,
        errors > 0 ? `   • Errors: ${errors}` : null
      ].filter(Boolean).join('\n');
      logger.info(summary);
    }

    return saved;
  }
}


