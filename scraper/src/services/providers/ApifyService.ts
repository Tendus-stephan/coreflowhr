/**
 * Apify service for LinkedIn scraping
 * Uses Apify's pre-built LinkedIn profile scrapers
 */

import { LinkedInQuery, JobBoardQuery, ScrapedCandidate } from '../../types';
import { providerConfig } from '../../config/providers';
import { logger } from '../../utils/logger';

export class ApifyService {
  private client: any = null;
  private initialized: boolean = false;
  private initializationError: Error | null = null;

  constructor() {
    // Don't initialize here - do it lazily when needed
    // This prevents crashes if the module import fails
  }

  /**
   * Lazy initialization of ApifyClient
   */
  private async initializeClient(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info(`[Apify Init] Checking for API token...`);
    logger.info(`[Apify Init] providerConfig.apify exists: ${!!providerConfig.apify}`);
    logger.info(`[Apify Init] providerConfig.apify.apiToken exists: ${!!providerConfig.apify?.apiToken}`);
    logger.info(`[Apify Init] Token value (first 10 chars): ${providerConfig.apify?.apiToken?.substring(0, 10)}...`);

    if (!providerConfig.apify?.apiToken) {
      logger.warn('Apify API token not configured. LinkedIn scraping via Apify will not be available.');
      logger.warn(`[Apify Init] process.env.APIFY_API_TOKEN: ${process.env.APIFY_API_TOKEN ? 'EXISTS' : 'MISSING'}`);
      this.initialized = true;
      return;
    }

    try {
      // Dynamic import to handle ES module compatibility
      const apifyModule = await import('apify-client');
      
      // Try different ways to access ApifyClient
      const ApifyClient = apifyModule.ApifyClient || 
                         (apifyModule as any).default?.ApifyClient || 
                         (apifyModule as any).default;
      
      if (!ApifyClient || typeof ApifyClient !== 'function') {
        throw new Error('ApifyClient not found in apify-client module. Available keys: ' + Object.keys(apifyModule).slice(0, 5).join(', '));
      }
      
      this.client = new ApifyClient({
        token: providerConfig.apify.apiToken
      });
      logger.info('ApifyClient initialized successfully');
      this.initialized = true;
    } catch (error: any) {
      logger.error('Failed to initialize ApifyClient:', error);
      this.initializationError = error;
      this.client = null;
      this.initialized = true; // Mark as initialized even if failed, to avoid retrying
    }
  }

  /**
   * Check if Apify is configured
   */
  async isConfigured(): Promise<boolean> {
    await this.initializeClient();
    return this.client !== null && !this.initializationError;
  }

  /**
   * Scrape job boards using Apify actors
   * 
   * ⚠️ IMPORTANT: Most job board scrapers return JOB POSTINGS, not candidate profiles.
   * For candidate sourcing, we primarily use LinkedIn and GitHub.
   * Job boards are supplementary - we extract candidate info from job applicants when available.
   * 
   * Supported boards: Indeed, Stack Overflow Jobs
   */
  async scrapeJobBoards(query: JobBoardQuery, maxResults: number = 50): Promise<ScrapedCandidate[]> {
    await this.initializeClient();
    
    if (!this.client) {
      const errorMsg = this.initializationError 
        ? `ApifyClient failed to initialize: ${this.initializationError.message}`
        : 'Apify API token not configured';
      throw new Error(errorMsg);
    }

    logger.info('Starting job board scraping via Apify...', { query, maxResults });
    logger.warn('⚠️  Note: Job boards return job postings, not candidate profiles. Results may be limited.');

    const candidates: ScrapedCandidate[] = [];
    const boards = ['indeed', 'stackoverflow'];
    const quotaPerBoard = Math.floor(maxResults / boards.length);

    for (const board of boards) {
      try {
        let actorId: string;
        let actorInput: any;

        if (board === 'indeed') {
          // Apify Indeed Jobs Scraper - searches job postings
          // Note: To find candidates, we'd need Indeed's candidate database access (paid)
          actorId = 'apify/indeed-jobs-scraper';
          actorInput = {
            query: query.jobTitle || '',
            location: query.location || '',
            maxResults: quotaPerBoard,
            sortBy: 'relevance'
          };
        } else if (board === 'stackoverflow') {
          // Apify Stack Overflow Jobs Scraper
          actorId = 'apify/stackoverflow-jobs-scraper';
          actorInput = {
            query: query.jobTitle || '',
            location: query.location || '',
            maxResults: quotaPerBoard
          };
        } else {
          continue;
        }

        logger.info(`Scraping ${board} via Apify actor: ${actorId}`);
        logger.warn(`⚠️  ${board} returns job postings, not candidate profiles. Extracting candidate info if available.`);

        // Run the actor
        const run = await this.client.actor(actorId).call(actorInput);

        // Wait for run to finish and get results
        const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

        // Transform job postings to candidates (if candidate info is available)
        let candidateCount = 0;
        for (const item of items) {
          const candidate = this.transformJobBoardPosting(item, board);
          if (candidate) {
            candidates.push(candidate);
            candidateCount++;
          }
        }

        logger.info(`Apify ${board} scraping completed. Found ${items.length} job postings, extracted ${candidateCount} candidate profiles`);
        
        if (candidateCount === 0 && items.length > 0) {
          logger.warn(`⚠️  ${board} returned ${items.length} job postings but no candidate profiles. Job boards show jobs, not candidates.`);
        }
      } catch (error: any) {
        logger.warn(`Error scraping ${board} via Apify:`, error.message);
        // Continue with other boards
      }
    }

    if (candidates.length === 0) {
      logger.warn('⚠️  No candidates extracted from job boards. This is normal - job boards show job postings, not candidate profiles.');
      logger.warn('    For candidate sourcing, focus on LinkedIn (candidate profiles) and GitHub (developer profiles).');
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Scrape LinkedIn profiles using Apify actors
   * 
   * Note: This uses Apify's LinkedIn Profile Scraper actor
   * Actor ID: apify/linkedin-profile-scraper
   */
  async scrapeLinkedIn(query: LinkedInQuery): Promise<ScrapedCandidate[]> {
    await this.initializeClient();
    
    if (!this.client) {
      const errorMsg = this.initializationError 
        ? `ApifyClient failed to initialize: ${this.initializationError.message}`
        : 'Apify API token not configured';
      throw new Error(errorMsg);
    }

    logger.info('Starting LinkedIn scraping via Apify...', { query });

    try {
      if (!this.client) {
        throw new Error('Apify client not initialized');
      }

      // Try common LinkedIn actor names on Apify
      // ⚠️ IMPORTANT: Actor names change frequently. Visit https://apify.com/store and search "LinkedIn" to find current actors
      // ⚠️ NOTE: harvestapi/linkedin-profile-search is currently returning 0 results - may need alternative
      const possibleActorIds = [
        'apify/linkedin-profile-scraper', // Try this first - more reliable
        'harvestapi/linkedin-profile-search', // ⭐ Was working but now returns 0 results
        'jancurn/linkedin-profiles-scraper',
        'apify/linkedin-scraper',
        'heds/linkedin-profile-scraper',
        'apify/linkedin-profiles-scraper',
        'dev_fusion/Linkedin-Profile-Scraper' // Requires profile URLs (not search queries) - last resort
      ];
      
      let run;
      let actorId = '';
      let lastError: any = null;
      let triedActors: string[] = [];

      // Build search query for LinkedIn
      const searchQuery = this.buildLinkedInSearchQuery(query);

      logger.info(`🔍 Attempting to scrape LinkedIn. Will try ${possibleActorIds.length} different actors...`);
      logger.info(`📝 Search query: "${searchQuery}"`);
      logger.info(`📋 Query details:`, {
        jobTitle: query.jobTitle,
        skills: query.skills,
        location: query.location,
        experienceLevel: query.experienceLevel,
        maxResults: query.maxResults
      });

      // Try each actor until one works
      // Note: Different actors may expect different input formats:
      // - harvestapi/linkedin-profile-search: { query: string, location: string, maxResults: number }
      // - Some accept: { searchQuery: string, maxResults: number }
      // - Others may accept: { profileUrls: string[], ... } or other formats
      // If an actor fails, we try the next one (fallback strategy)
      for (const candidateId of possibleActorIds) {
        try {
          actorId = candidateId;
          triedActors.push(candidateId);
          logger.info(`🔄 Trying Apify actor: ${actorId}`);
          
          // Build input based on actor type
          let actorInput: any;
          if (candidateId === 'harvestapi/linkedin-profile-search') {
            // harvestapi actor expects: searchQuery (fuzzy search string), locations (array), maxResults
            // Build SIMPLE query - LinkedIn works best with simple, short queries
            // LESS IS MORE: Use only job title to avoid over-filtering and get more results
            const queryParts: string[] = [];
            if (query.jobTitle) {
              queryParts.push(query.jobTitle);
            }
            // SKIP skills and experience level for initial search - they make queries too specific
            // This increases search breadth and helps find more candidates
            // Skills and experience will be filtered later during candidate processing
            logger.info(`🔍 Using SIMPLIFIED query: job title only (no skills/experience to maximize results)`);
            
            const fuzzyQuery = queryParts.join(' ');
            
            // Parse location - expand small cities to nearby larger cities/metro areas for better results
            // Small cities like "Roseland" often have 0 results - expand to nearby larger cities
            let locationParam: string[] | undefined = undefined;
            if (query.location && query.location.trim()) {
              // Extract city and state from "City, State" or "City, Country" format
              const locationParts = query.location.split(',').map(s => s.trim()).filter(Boolean);
              const cityName = locationParts[0];
              const stateOrCountry = locationParts[1] || '';
              
              // Map of small cities to nearby larger cities/metro areas for better search results
              const cityExpansions: { [key: string]: string[] } = {
                // New Jersey - expand small cities to nearby larger metros
                'Roseland': ['Newark', 'Jersey City', 'New York'], // Roseland → Newark/Jersey City/New York metro
                'Newark': ['New York', 'Jersey City'], // Include nearby major cities
                'Jersey City': ['New York', 'Newark'],
                // California
                'Oakland': ['San Francisco', 'San Jose'],
                'Berkeley': ['Oakland', 'San Francisco'],
                // Add more common small cities as needed
              };
              
              // Check if we should expand this city
              const normalizedCity = cityName.toLowerCase();
              const expansions = cityExpansions[cityName] || 
                                Object.keys(cityExpansions).find(key => key.toLowerCase() === normalizedCity) 
                                  ? cityExpansions[Object.keys(cityExpansions).find(key => key.toLowerCase() === normalizedCity)!]
                                  : null;
              
              if (expansions) {
                // Include both original city and nearby larger cities
                locationParam = [cityName, ...expansions];
                logger.info(`Location: "${query.location}" → Expanded to: ${locationParam.join(', ')} (to improve search results)`);
              } else {
                // For larger cities or unknown cities, use as-is
                locationParam = [cityName];
                logger.info(`Location: "${query.location}" → Using: "${cityName}"`);
              }
            } else {
              // No location = location-agnostic search (better for remote or broad searches)
              logger.info(`⚠️ No location provided - using location-agnostic search (better for finding more candidates)`);
            }
            
            actorInput = {
              searchQuery: fuzzyQuery,
              locations: locationParam || undefined, // Use 'locations' (array) - required by Apify actor
              maxResults: query.maxResults || 50,
              maxItems: query.maxResults || 50, // Add maxItems to avoid warning and ensure results
              takePages: Math.ceil((query.maxResults || 50) / 10) // Estimate pages needed (10 items per page)
            };
            logger.info(`📝 Apify actor input - searchQuery: "${fuzzyQuery}", locations: ${locationParam ? JSON.stringify(locationParam) : 'none (location-agnostic)'}, maxResults: ${query.maxResults || 50}`);
            logger.info(`📋 Full query object received:`, {
              jobTitle: query.jobTitle,
              skills: query.skills,
              location: query.location,
              experienceLevel: query.experienceLevel,
              maxResults: query.maxResults
            });
          } else {
            // Standard format for other actors
            actorInput = {
            searchQuery,
            maxResults: query.maxResults || 50
            };
          }
          
          // Run the actor with retry logic for connection errors
          let retries = 3;
          let lastCallError: any = null;
          
          while (retries > 0) {
            try {
              // Add timeout wrapper (30 seconds for actor call)
              const callPromise = this.client.actor(actorId).call(actorInput);
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Actor call timeout after 30 seconds')), 30000);
              });
              
              run = await Promise.race([callPromise, timeoutPromise]) as any;
              
              logger.info(`📊 Run created: ID=${run?.id}, Status=${run?.status}, Actor=${actorId}`);
              logger.info(`📤 Actor input sent:`, JSON.stringify(actorInput, null, 2));
              
              // Check for free tier limit in run logs
              if (run && run.id) {
                try {
                  const runDetails = await this.client.run(run.id).get();
                  const statusMessage = runDetails.statusMessage || '';
                  const logs = runDetails.log || '';
                  
                  logger.info(`📋 Run details:`, {
                    id: runDetails.id,
                    status: runDetails.status,
                    statusMessage: statusMessage,
                    defaultDatasetId: runDetails.defaultDatasetId,
                    startedAt: runDetails.startedAt,
                    finishedAt: runDetails.finishedAt,
                    stats: runDetails.stats
                  });
                  
                  // Check if free tier limit was reached
                  if (statusMessage.toLowerCase().includes('free user run limit') ||
                      statusMessage.toLowerCase().includes('run limit reached') ||
                      logs.toLowerCase().includes('free users are limited') ||
                      logs.toLowerCase().includes('free user run limit')) {
                    throw new Error(
                      '🚫 Apify Free Tier Limit Reached!\n\n' +
                      'You have used all 10 free runs for today.\n' +
                      'Options:\n' +
                      '1. Wait 24 hours for the limit to reset\n' +
                      '2. Upgrade to a paid plan at https://apify.com/pricing\n' +
                      '3. Use a different Apify account (new API token)\n\n' +
                      'To avoid this in the future, the scraper will now stop immediately when the limit is detected.'
                    );
                  }
                  
                  // Log any warnings or errors from the run
                  if (statusMessage) {
                    logger.warn(`⚠️ Run status message: ${statusMessage}`);
                  }
                  if (logs && logs.length > 100) {
                    logger.info(`📝 Run logs (first 500 chars): ${logs.substring(0, 500)}`);
                  }
                } catch (limitCheckError: any) {
                  // If it's our free tier limit error, throw it
                  if (limitCheckError.message.includes('Free Tier Limit')) {
                    throw limitCheckError;
                  }
                  // Otherwise, ignore the check error and continue
                }
              }
          
          // If we get here, it worked!
          logger.info(`✅ Successfully using actor: ${actorId}`);
          break;
            } catch (callError: any) {
              lastCallError = callError;
              const errorCode = callError.code || '';
              const errorMessage = callError.message || String(callError);
              
              // Check if it's a connection error that we should retry
              if ((errorCode === 'ECONNRESET' || 
                   errorCode === 'ETIMEDOUT' || 
                   errorCode === 'ECONNREFUSED' ||
                   errorMessage.includes('aborted') ||
                   errorMessage.includes('ECONNRESET') ||
                   errorMessage.includes('timeout')) && retries > 1) {
                retries--;
                const waitTime = (4 - retries) * 2000; // 2s, 4s, 6s
                logger.warn(`⚠️ Connection error (${errorCode || errorMessage}). Retrying in ${waitTime/1000}s... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                // Not a retryable error or out of retries - throw to outer catch
                throw callError;
              }
            }
          }
          
          if (run) {
            break; // Successfully got run, exit actor loop
          } else {
            throw lastCallError || new Error('Failed to call actor after retries');
          }
        } catch (error: any) {
          lastError = error;
          const errorType = error.type || 'unknown';
          const errorMessage = error.message || String(error);
          
          logger.warn(`❌ Actor "${candidateId}" failed: ${errorMessage}`);
          logger.warn(`   → Error type: ${errorType}`);
          
          // Check if it's a "not found" error - try next actor
          if (errorType === 'record-not-found' || errorMessage.includes('not found')) {
            logger.info(`   → This actor doesn't exist or is not accessible. Trying next actor...`);
            continue;
          } else if (errorMessage.toLowerCase().includes('input') || 
                     errorMessage.toLowerCase().includes('invalid') ||
                     errorMessage.toLowerCase().includes('parameter')) {
            // Input format error - actor exists but doesn't accept this input format
            logger.warn(`   → Input format mismatch (actor may need different parameters). Trying next actor...`);
            continue;
          } else {
            // Other error (auth, rate limit, etc.) - still try next actor
            logger.warn(`   → Other error occurred. Trying next actor...`);
            continue;
          }
        }
      }

      if (!run) {
        const triedList = triedActors.join(', ');
        throw new Error(
          `❌ None of the LinkedIn actors worked!\n\n` +
          `Tried actors:\n  - ${triedList.split(', ').join('\n  - ')}\n\n` +
          `Last error: ${lastError?.message || 'Unknown'}\n\n` +
          `📋 HOW TO FIX:\n` +
          `1. Visit: https://apify.com/store\n` +
          `2. Search for: "LinkedIn"\n` +
          `3. Find an ACTIVE/PUBLIC actor (check it's not deprecated)\n` +
          `4. Copy the actor ID (format: "username/actor-name" or "username~actor-name")\n` +
          `5. Update line 190 in: scraper/src/services/providers/ApifyService.ts\n` +
          `6. Add the actor ID to the possibleActorIds array\n\n` +
          `Common actor ID formats:\n` +
          `- "username/actor-name" (Apify converts to username~actor-name internally)\n` +
          `- Example: "apify/linkedin-profile-scraper" or "jancurn/linkedin-scraper"`
        );
      }

      // Check run status for free tier limit before fetching results
      try {
        const runDetails = await this.client.run(run.id).get();
        const statusMessage = runDetails.statusMessage || '';
        const logs = runDetails.log || '';
        
        // Check if free tier limit was reached
        if (statusMessage.toLowerCase().includes('free user run limit') ||
            statusMessage.toLowerCase().includes('run limit reached') ||
            logs.toLowerCase().includes('free users are limited') ||
            logs.toLowerCase().includes('free user run limit')) {
          throw new Error(
            '🚫 Apify Free Tier Limit Reached!\n\n' +
            'You have used all 10 free runs for today.\n' +
            'Options:\n' +
            '1. Wait 24 hours for the limit to reset\n' +
            '2. Upgrade to a paid plan at https://apify.com/pricing\n' +
            '3. Use a different Apify account (new API token)\n\n' +
            'This run was consumed but returned 0 results due to the limit.'
          );
        }
      } catch (limitCheckError: any) {
        // If it's our free tier limit error, throw it
        if (limitCheckError.message.includes('Free Tier Limit')) {
          throw limitCheckError;
        }
        // Otherwise, ignore the check error and continue
      }

      // Wait for run to finish and get results with retry logic
      logger.info(`⏳ Waiting for run to finish: ${run.id}`);
      
      // Wait for run to complete (poll every 3 seconds, max 2 minutes)
      const maxWaitTime = 120000; // 2 minutes
      const pollInterval = 3000; // 3 seconds
      const startTime = Date.now();
      let finalRunStatus = run.status;
      
      while (finalRunStatus !== 'SUCCEEDED' && finalRunStatus !== 'FAILED' && finalRunStatus !== 'ABORTED' && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        try {
          const runStatus = await this.client.run(run.id).get();
          finalRunStatus = runStatus.status;
          logger.info(`   Run status: ${finalRunStatus}`);
        } catch (statusError: any) {
          logger.warn(`   Error checking run status: ${statusError.message}`);
        }
      }
      
      if (finalRunStatus !== 'SUCCEEDED') {
        const runDetails = await this.client.run(run.id).get().catch(() => null);
        logger.error(`❌ Run did not succeed. Status: ${finalRunStatus}`);
        if (runDetails) {
          logger.error(`   Status message: ${runDetails.statusMessage || 'None'}`);
          logger.error(`   Run stats:`, runDetails.stats);
        }
        throw new Error(`Apify run failed with status: ${finalRunStatus}. Check Apify dashboard for details.`);
      }
      
      logger.info(`✅ Run completed successfully: ${run.id}`);
      
      let items: any[] = [];
      let datasetRetries = 3;
      
      while (datasetRetries > 0) {
        try {
          logger.info(`📦 Fetching dataset: ${run.defaultDatasetId}`);
          // Add timeout for dataset fetch (20 seconds)
          const datasetPromise = this.client.dataset(run.defaultDatasetId).listItems();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Dataset fetch timeout after 20 seconds')), 20000);
          });
          
          const result = await Promise.race([datasetPromise, timeoutPromise]) as any;
          items = result.items || [];
          
          logger.info(`📊 Dataset response: ${items.length} items found`);
          if (result.total) {
            logger.info(`   Total items in dataset: ${result.total}`);
          }
          if (result.items && result.items.length > 0) {
            logger.info(`   Sample item keys: ${Object.keys(result.items[0]).join(', ')}`);
          }
          
          // If we got 0 items and the run completed, check if it's due to free tier limit
          if (items.length === 0 && finalRunStatus === 'SUCCEEDED') {
            try {
              const runDetails = await this.client.run(run.id).get();
              const statusMessage = runDetails.statusMessage || '';
              logger.warn(`⚠️ Run succeeded but returned 0 items. Status message: "${statusMessage}"`);
              
              if (statusMessage.toLowerCase().includes('free user run limit') ||
                  statusMessage.toLowerCase().includes('run limit reached')) {
                throw new Error(
                  '🚫 Apify Free Tier Limit Reached! This run returned 0 results because the daily limit (10 runs) was reached.'
                );
              }
              
              // Log additional diagnostic info
              logger.warn(`   Run finished at: ${runDetails.finishedAt}`);
              logger.warn(`   Run stats:`, runDetails.stats);
              if (runDetails.stats?.runTimeSecs) {
                logger.warn(`   Run duration: ${runDetails.stats.runTimeSecs}s`);
              }
            } catch (limitError: any) {
              if (limitError.message.includes('Free Tier Limit')) {
                throw limitError;
              }
            }
          }
          
          break; // Success
        } catch (datasetError: any) {
          datasetRetries--;
          const errorCode = datasetError.code || '';
          const errorMessage = datasetError.message || String(datasetError);
          
          // Check if it's a connection error that we should retry
          if ((errorCode === 'ECONNRESET' || 
               errorCode === 'ETIMEDOUT' || 
               errorCode === 'ECONNREFUSED' ||
               errorMessage.includes('aborted') ||
               errorMessage.includes('ECONNRESET') ||
               errorMessage.includes('timeout')) && datasetRetries > 0) {
            const waitTime = (4 - datasetRetries) * 2000; // 2s, 4s, 6s
            logger.warn(`⚠️ Dataset fetch error (${errorCode || errorMessage}). Retrying in ${waitTime/1000}s... (${datasetRetries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            // Not retryable or out of retries
            logger.error(`❌ Failed to fetch dataset after retries: ${errorMessage}`);
            throw new Error(`Failed to fetch dataset: ${errorMessage}`);
          }
        }
      }

      logger.info(`Apify LinkedIn scraping completed. Found ${items.length} profiles (requested: ${query.maxResults || 50})`);

      // Log detailed information when 0 results are found
      if (items.length === 0) {
        logger.warn(`⚠️ WARNING: Apify returned 0 profiles for search query: "${searchQuery}"`);
        logger.warn(`   Run ID: ${run.id}, Status: ${run.status}`);
        logger.warn(`   Query details:`, {
          jobTitle: query.jobTitle,
          skills: query.skills,
          location: query.location,
          experienceLevel: query.experienceLevel,
          maxResults: query.maxResults
        });
        logger.warn(`   This could be due to:`);
        logger.warn(`   - No profiles matching the search criteria`);
        logger.warn(`   - Search query too specific`);
        logger.warn(`   - Apify actor limitations or rate limiting`);
        logger.warn(`   - Try adjusting job requirements (location, skills, experience level)`);
      }

      // Debug: Log first profile structure to understand the format
      if (items.length > 0) {
        logger.debug('Sample profile structure:', JSON.stringify(Object.keys(items[0]), null, 2));
        logger.debug('Sample profile name fields:', {
          fullName: items[0].fullName,
          name: items[0].name,
          firstName: items[0].firstName,
          lastName: items[0].lastName,
          headline: items[0].headline,
          url: items[0].url
        });
      }

      // Limit results to requested amount (actors may return more)
      const limitedItems = items.slice(0, query.maxResults || 50);

      // Transform Apify results to ScrapedCandidate format
      return limitedItems.map((item: any) => this.transformLinkedInProfile(item));
    } catch (error: any) {
      logger.error('Error scraping LinkedIn via Apify:', error);
      throw new Error(`Apify LinkedIn scraping failed: ${error.message}`);
    }
  }

  /**
   * Build LinkedIn search query from job requirements
   */
  private buildLinkedInSearchQuery(query: LinkedInQuery): string {
    const parts: string[] = [];

    if (query.jobTitle) {
      parts.push(`"${query.jobTitle}"`);
    }

    if (query.skills && query.skills.length > 0) {
      // Add top 3 skills to search
      const topSkills = query.skills.slice(0, 3).join(' OR ');
      parts.push(`(${topSkills})`);
    }

    // Add experience level keywords to improve search relevance
    if (query.experienceLevel) {
      const expLevel = query.experienceLevel.toLowerCase();
      if (expLevel.includes('senior') || expLevel.includes('5+')) {
        parts.push('senior');
      } else if (expLevel.includes('mid') || expLevel.includes('2-5')) {
        parts.push('mid-level');
      } else if (expLevel.includes('entry') || expLevel.includes('junior') || expLevel.includes('0-2')) {
        parts.push('entry-level');
      }
    }

    if (query.location) {
      parts.push(query.location);
    }

    return parts.join(' ');
  }

  /**
   * Extract social profile URLs from LinkedIn profile data
   * Looks for GitHub, Twitter, personal websites, and other social links
   */
  private extractSocialProfiles(profile: any): {
    github?: string;
    linkedin?: string;
    website?: string;
    twitter?: string;
  } {
    const portfolioUrls: {
      github?: string;
      linkedin?: string;
      website?: string;
      twitter?: string;
    } = {};

    // Extract LinkedIn URL
    portfolioUrls.linkedin = profile.url || profile.linkedInUrl || profile.profileUrl;

    // Combine all possible URL sources
    const allUrls: string[] = [];
    
    // Add websites array if available (from contactInfo or directly)
    if (profile.websites && Array.isArray(profile.websites)) {
      profile.websites.forEach((site: any) => {
        if (typeof site === 'string') {
          allUrls.push(site);
        } else if (site.url) {
          allUrls.push(site.url);
        }
      });
    }
    
    // Add contactInfo.websites if available
    if (profile.contactInfo && profile.contactInfo.websites) {
      if (Array.isArray(profile.contactInfo.websites)) {
        profile.contactInfo.websites.forEach((site: any) => {
          if (typeof site === 'string') {
            allUrls.push(site);
          } else if (site.url) {
            allUrls.push(site.url);
          }
        });
      }
    }
    
    // Add single website field if available
    if (profile.website) {
      allUrls.push(profile.website);
    }
    
    // Add summary/description text to search for URLs
    const textFields: string[] = [];
    if (profile.summary) textFields.push(profile.summary);
    if (profile.headline) textFields.push(profile.headline);
    if (profile.bio) textFields.push(profile.bio);
    
    // Extract URLs from text fields
    const textContent = textFields.join(' ');
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const textUrls = textContent.match(urlPattern) || [];
    allUrls.push(...textUrls);

    // Remove duplicates and normalize
    const uniqueUrls = [...new Set(allUrls.map(url => url.trim().replace(/[.,;!?]+$/, '')))];

    // Pattern matching for different platforms
    const patterns = {
      github: /(?:github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-)*[a-zA-Z0-9]?|https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-)*[a-zA-Z0-9]?)/i,
      twitter: /(?:twitter\.com\/[a-zA-Z0-9_]+|x\.com\/[a-zA-Z0-9_]+|https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+)/i,
      website: /https?:\/\/(?!github\.com|twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com)[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i,
    };

    // Extract GitHub URLs
    for (const url of uniqueUrls) {
      if (!portfolioUrls.github && patterns.github.test(url)) {
        portfolioUrls.github = url.startsWith('http') ? url : `https://${url}`;
            continue;
      }
      
      // Extract Twitter/X URLs
      if (!portfolioUrls.twitter && patterns.twitter.test(url)) {
        portfolioUrls.twitter = url.startsWith('http') ? url : `https://${url}`;
        continue;
      }
      
      // Extract personal website (exclude social media platforms)
      if (!portfolioUrls.website && patterns.website.test(url)) {
        // Skip common social media domains
        if (!url.match(/(?:facebook|instagram|youtube|tiktok|pinterest|snapchat|reddit)\.com/i)) {
          portfolioUrls.website = url.startsWith('http') ? url : `https://${url}`;
        }
      }
    }

    return portfolioUrls;
  }

  /**
   * Transform Apify LinkedIn profile data to ScrapedCandidate
   */
  private transformLinkedInProfile(profile: any): ScrapedCandidate {
    // Extract work experience - harvestapi uses 'experience' array
    // Deduplicate work experience entries (merge same role+company, avoid repeating descriptions)
    const experienceArray = profile.experience || profile.positions || [];
    const workExperienceMap = new Map<string, any>();
    
    experienceArray.forEach((exp: any) => {
      const role = (exp.position || exp.title || exp.role || '').trim();
      const company = (exp.companyName || exp.company || '').trim();
      
      if (!role && !company) return; // Skip invalid entries
      
      // Create unique key for role+company combination
      const key = `${role.toLowerCase()}|${company.toLowerCase()}`;
      
      // Extract duration from dateRange or duration field
      let duration = exp.duration || '';
      if (!duration && exp.dateRange) {
        const start = exp.dateRange.start;
        const end = exp.dateRange.end;
        if (start && end) {
          const startText = start.month ? `${start.month} ${start.year}` : (start.year || '');
          const endText = end.text || (end.month ? `${end.month} ${end.year}` : (end.year || 'Present'));
          duration = `${startText} - ${endText}`;
        } else if (start) {
          const startText = start.month ? `${start.month} ${start.year}` : (start.year || '');
          duration = `${startText} - Present`;
        }
      }
      
      const description = (exp.description || '').trim();
      
      // If duplicate exists, merge descriptions (avoid repeating)
      if (workExperienceMap.has(key)) {
        const existing = workExperienceMap.get(key);
        // Only merge if descriptions are different (avoid exact duplicates)
        if (description && existing.description !== description && !existing.description.includes(description) && !description.includes(existing.description)) {
          // Merge descriptions, removing duplicate sentences
          const existingSentences = existing.description.split(/[.!?]\s+/).filter((s: string) => s.trim());
          const newSentences = description.split(/[.!?]\s+/).filter((s: string) => s.trim());
          const uniqueSentences = [...existingSentences];
          newSentences.forEach((sentence: string) => {
            const normalized = sentence.trim().toLowerCase();
            if (!existingSentences.some((existing: string) => existing.trim().toLowerCase() === normalized)) {
              uniqueSentences.push(sentence);
            }
          });
          existing.description = uniqueSentences.join('. ').trim();
        }
        // Keep the longer duration if available
        if (duration && (!existing.duration || duration.length > existing.duration.length)) {
          existing.duration = duration.trim();
        }
      } else {
        // New entry
        workExperienceMap.set(key, {
          role,
          company,
          duration: duration.trim(),
          description
        });
      }
    });
    
    // Convert map to array and filter out entries without role or company
    const workExperience = Array.from(workExperienceMap.values()).filter((exp: any) => exp.role || exp.company);

    // Extract education - harvestapi uses profileTopEducation array
    const education = (profile.profileTopEducation || profile.education || []).map((edu: any) => {
      // Handle different education formats
      const degree = edu.degree || edu.degreeName || '';
      const school = edu.schoolName || edu.school || edu.institutionName || '';
      const field = edu.fieldOfStudy || edu.field || edu.major || '';
      
      // Extract year from dateRange or timePeriod
      let year = '';
      if (edu.dateRange) {
        const startYear = edu.dateRange.start?.year;
        const endYear = edu.dateRange.end?.year;
        if (startYear && endYear) {
          year = `${startYear} - ${endYear}`;
        } else if (startYear) {
          year = `${startYear} - Present`;
        }
      } else if (edu.timePeriod) {
        year = edu.timePeriod;
      } else if (edu.startDate?.year) {
        const endYear = edu.endDate?.year || 'Present';
        year = `${edu.startDate.year} - ${endYear}`;
      }
      
      return {
        degree,
        school,
        field,
        year
      };
    }).filter((edu: any) => edu.school || edu.degree); // Only include if has school or degree

    // Extract skills - harvestapi uses topSkills (string) or skills array
    let skills: string[] = [];
    if (profile.topSkills) {
      // topSkills is a string like "Team Leadership • Microservices • Blockchain"
      skills = profile.topSkills.split('•').map((s: string) => s.trim()).filter(Boolean);
    } else if (profile.skills && Array.isArray(profile.skills)) {
      // skills is an array
      skills = profile.skills.map((skill: any) => skill.name || skill).filter(Boolean);
    } else if (profile.skills && typeof profile.skills === 'string') {
      // skills is a string
      skills = profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    
    // Also extract skills from experience entries
    if (experienceArray.length > 0) {
      const expSkills: string[] = [];
      experienceArray.forEach((exp: any) => {
        if (exp.skills && Array.isArray(exp.skills)) {
          exp.skills.forEach((skill: any) => {
            const skillName = typeof skill === 'string' ? skill : (skill.name || skill);
            if (skillName && !skills.includes(skillName) && !expSkills.includes(skillName)) {
              expSkills.push(skillName);
            }
          });
        }
      });
      skills = [...skills, ...expSkills];
    }

    // Build resume summary
    const resumeSummary = this.buildResumeSummary(profile, workExperience);

    // Extract social profiles (GitHub, Twitter, websites, etc.)
    const portfolioUrls = this.extractSocialProfiles(profile);

    // Handle location - harvestapi returns it as an object with parsed data
    let locationString: string | undefined;
    if (typeof profile.location === 'string') {
      locationString = profile.location.trim() || undefined;
    } else if (profile.location && typeof profile.location === 'object') {
      // Try parsed location first (most accurate)
      if (profile.location.parsed) {
        const parsed = profile.location.parsed;
        const locationParts: string[] = [];
        if (parsed.city) locationParts.push(parsed.city);
        if (parsed.state) locationParts.push(parsed.state);
        if (parsed.country) locationParts.push(parsed.country);
        locationString = locationParts.length > 0 ? locationParts.join(', ') : undefined;
      }
      
      // Fallback to linkedinText if parsed not available
      if (!locationString && profile.location.linkedinText) {
        locationString = profile.location.linkedinText;
      }
      
      // Last resort: try direct fields
      if (!locationString) {
        const locationParts: string[] = [];
        if (profile.location.city) locationParts.push(profile.location.city);
        if (profile.location.region) locationParts.push(profile.location.region);
        if (profile.location.country) locationParts.push(profile.location.country);
        locationString = locationParts.length > 0 ? locationParts.join(', ') : undefined;
      }
    } else {
      // Try alternative location fields
      locationString = profile.locationName || profile.locationText || undefined;
    }

    // Extract name - harvestapi might use different field names
    let candidateName = profile.fullName || profile.name || profile.full_name || profile.profileName;
    
    // Try firstName + lastName if full name not available
    if (!candidateName && (profile.firstName || profile.lastName)) {
      candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    }
    
    // Try headline or title as fallback (but this is not ideal)
    if (!candidateName && profile.headline) {
      // Extract first word from headline as a last resort
      const headlineWords = profile.headline.split(' ').filter(w => w.length > 0);
      if (headlineWords.length > 0) {
        candidateName = headlineWords[0];
      }
    }
    
    // If still no name, use URL slug as fallback (better than empty)
    if (!candidateName && profile.url) {
      const urlMatch = profile.url.match(/\/in\/([^/?]+)/);
      if (urlMatch && urlMatch[1]) {
        candidateName = urlMatch[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    
    candidateName = candidateName || 'Unknown Candidate';

    return {
      name: candidateName,
      email: undefined, // Email scraping is illegal/confidential - recruiters will contact via LinkedIn
      location: locationString,
      experience: this.extractExperience(profile, workExperience),
      skills,
      resumeSummary,
      profileUrl: profile.linkedinUrl || profile.url || profile.linkedInUrl || profile.profileUrl || undefined,
      workExperience,
      education,
      portfolioUrls,
      source: 'linkedin',
      rawData: profile
    };
  }

  /**
   * Extract years of experience from profile
   * Calculates actual years from work experience dates/durations
   */
  private extractExperience(profile: any, workExperience: any[]): number | undefined {
    // Try to get from profile directly first
    if (profile.yearsOfExperience) {
      const years = parseInt(profile.yearsOfExperience);
      if (!isNaN(years)) {
        return years;
      }
    }

    // Calculate from work experience dates/durations
    if (workExperience.length > 0) {
      let totalMonths = 0;
      
      // Try to get experience array with dateRange from raw profile data
      const experienceArray = profile.experience || profile.positions || [];
      
      if (experienceArray.length > 0) {
        const now = new Date();
        let earliestStartDate: Date | null = null;
        let latestEndDate: Date | null = null;
        
        for (const exp of experienceArray) {
          if (exp.dateRange) {
            const start = exp.dateRange.start;
            const end = exp.dateRange.end;
            
            if (start && start.year) {
              // Create date from year/month (use Jan 1 if month not available)
              const startDate = new Date(start.year, (start.month ? start.month - 1 : 0), 1);
              if (!earliestStartDate || startDate < earliestStartDate) {
                earliestStartDate = startDate;
              }
              
              // For end date, use end date if available, otherwise use "now" (current role)
              let endDate: Date;
              if (end && end.year) {
                endDate = new Date(end.year, (end.month ? end.month - 1 : 11), 31);
              } else {
                endDate = now; // Current role - use today
              }
              
              if (!latestEndDate || endDate > latestEndDate) {
                latestEndDate = endDate;
              }
            }
          }
        }
        
        // Calculate total years from earliest start to latest end
        if (earliestStartDate && latestEndDate) {
          const monthsDiff = (latestEndDate.getFullYear() - earliestStartDate.getFullYear()) * 12 
                           + (latestEndDate.getMonth() - earliestStartDate.getMonth());
          const years = Math.round((monthsDiff / 12) * 10) / 10; // Round to 1 decimal
          return Math.max(0, Math.min(years, 50)); // Cap at 50 years
        }
      }
      
      // Fallback: Parse duration strings (e.g., "4 yrs 5 mos", "1 yr 10 mos")
      // Sum up all durations if available
      let totalYearsFromDuration = 0;
      for (const exp of workExperience) {
        if (exp.duration) {
          const duration = exp.duration.toLowerCase();
          // Parse patterns like "4 yrs 5 mos", "1 yr 10 mos", "2 years", "6 months"
          const yearsMatch = duration.match(/(\d+)\s*(?:yr|year|yrs|years)/);
          const monthsMatch = duration.match(/(\d+)\s*(?:mo|mos|month|months)/);
          
          if (yearsMatch) {
            totalYearsFromDuration += parseInt(yearsMatch[1]);
          }
          if (monthsMatch) {
            totalYearsFromDuration += parseInt(monthsMatch[1]) / 12;
          }
        }
      }
      
      if (totalYearsFromDuration > 0) {
        return Math.round(totalYearsFromDuration * 10) / 10; // Round to 1 decimal
      }
      
      // Last fallback: Estimate from number of positions (conservative estimate)
      // Assume average 2-3 years per position
      return Math.min(workExperience.length * 2.5, 15);
    }

    return undefined;
  }

  /**
   * Build resume summary from profile data
   * Creates a well-structured, comprehensive summary highlighting key points
   */
  private buildResumeSummary(profile: any, workExperience: any[]): string {
    const sections: string[] = [];

    // 1. Professional Headline
    if (profile.headline) {
      sections.push(profile.headline);
    } else if (workExperience.length > 0) {
      const latestRole = workExperience[0];
      if (latestRole.role && latestRole.company) {
        sections.push(`${latestRole.role} at ${latestRole.company}`);
      }
    }

    // 2. Profile Summary/Bio (full summary, not truncated)
    if (profile.summary) {
      const summaryText = profile.summary.trim();
      if (summaryText) {
        sections.push(summaryText);
      }
    } else if (profile.about) {
      const aboutText = profile.about.trim();
      if (aboutText) {
        sections.push(aboutText);
      }
    }

    // 3. Key Work Experience Highlights (top 3 most recent, with key accomplishments)
    if (workExperience.length > 0) {
      const topRoles = workExperience.slice(0, 3);
      const experienceHighlights = topRoles.map(exp => {
        if (!exp.role || !exp.company) return null;
        let highlight = `${exp.role} at ${exp.company}`;
        if (exp.duration) {
          highlight += ` (${exp.duration})`;
        }
        // Add key accomplishment from description if available (first sentence only to avoid repetition)
        if (exp.description) {
          const firstSentence = exp.description.split(/[.!?]/)[0].trim();
          if (firstSentence && firstSentence.length > 20 && firstSentence.length < 150) {
            highlight += ` - ${firstSentence}`;
          }
        }
        return highlight;
      }).filter(Boolean);
      
      if (experienceHighlights.length > 0) {
        sections.push(`Key Experience:\n${experienceHighlights.join('\n')}`);
      }
    }

    // 4. Core Skills (top 8-10 skills for better visibility)
    if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
      const skillNames = profile.skills.slice(0, 10).map((s: any) => s.name || s).filter(Boolean);
      if (skillNames.length > 0) {
        sections.push(`Core Skills: ${skillNames.join(', ')}`);
      }
    }

    // 5. Location
    let locationText: string | undefined;
    if (typeof profile.location === 'string') {
      locationText = profile.location;
    } else if (profile.location && typeof profile.location === 'object') {
      const locationParts: string[] = [];
      if (profile.location.parsed) {
        const parsed = profile.location.parsed;
        if (parsed.city) locationParts.push(parsed.city);
        if (parsed.state) locationParts.push(parsed.state);
        if (parsed.country) locationParts.push(parsed.country);
      }
      if (locationParts.length === 0) {
        if (profile.location.city) locationParts.push(profile.location.city);
        if (profile.location.region) locationParts.push(profile.location.region);
        if (profile.location.country) locationParts.push(profile.location.country);
      }
      if (locationParts.length === 0 && profile.location.linkedinText) {
        locationText = profile.location.linkedinText;
      } else {
        locationText = locationParts.length > 0 ? locationParts.join(', ') : undefined;
      }
    }
    
    if (locationText) {
      sections.push(`Location: ${locationText}`);
    }

    // Join sections with double newlines for better readability
    return sections.join('\n\n');
  }

  /**
   * Transform job board posting to ScrapedCandidate
   * 
   * ⚠️ IMPORTANT: Job boards return JOB POSTINGS (employer listings), not candidate profiles.
   * Most job board scrapers don't provide candidate/resume data - they show available jobs.
   * 
   * For candidate sourcing, LinkedIn and GitHub are primary sources.
   * Job boards are supplementary and may return 0 candidates.
   */
  private transformJobBoardPosting(posting: any, source: string): ScrapedCandidate | null {
    if (!posting) {
      return null;
    }

    // Job boards typically return job postings (job listings from employers)
    // NOT candidate profiles. We can only extract candidate info if:
    // 1. The posting includes applicant/resume data (rare, usually requires paid access)
    // 2. The posting shows profile of someone who applied (rare)
    
    // Try to extract candidate info if available
    const candidateName = posting.applicantName || 
                         posting.profileName || 
                         posting.resumeOwner || 
                         posting.author || 
                         posting.candidateName ||
                         undefined;

    // If no candidate name, this is just a job posting (most common case)
    // Return null - we can't create a candidate from a job posting
    if (!candidateName) {
      // This is normal - job boards show jobs, not candidates
      return null;
    }

    // Extract work experience from posting/resume
    const workExperience = posting.experience?.map((exp: any) => ({
      role: exp.title || exp.position || exp.role || '',
      company: exp.company || exp.employer || '',
      duration: exp.duration || exp.period || '',
      description: exp.description || exp.summary || ''
    })) || [];

    // Extract skills
    const skills = posting.skills || 
                  posting.technologies || 
                  posting.tags || 
                  (posting.requiredSkills ? posting.requiredSkills.split(',').map((s: string) => s.trim()) : []) ||
                  [];

    // Build resume summary
    const resumeSummary = posting.summary || 
                         posting.description || 
                         posting.bio || 
                         `${candidateName}'s profile from ${source}`;

    return {
      name: candidateName,
      email: posting.email || undefined,
      location: posting.location || posting.city || undefined,
      experience: posting.yearsOfExperience || this.extractExperienceFromPosting(posting, workExperience),
      skills: Array.isArray(skills) ? skills : [],
      resumeSummary,
      profileUrl: posting.url || posting.profileUrl || posting.applicationUrl || undefined,
      workExperience,
      education: posting.education || [],
      portfolioUrls: {
        linkedin: posting.linkedinUrl,
        website: posting.website || posting.portfolio
      },
      source: 'linkedin', // Job boards are deprecated - LinkedIn is primary source
      rawData: posting
    };
  }


  /**
   * Extract years of experience from job board posting
   */
  private extractExperienceFromPosting(posting: any, workExperience: any[]): number | undefined {
    if (posting.yearsOfExperience) {
      return parseInt(posting.yearsOfExperience);
    }

    if (workExperience.length > 0) {
      return Math.min(workExperience.length * 2, 15);
    }

    return undefined;
  }
}
