/**
 * Main scraping service orchestrator
 * Coordinates between providers and processes candidates
 */

import { Job, ScrapeOptions, ScrapeResult, ScrapedCandidate } from '../types';
import { ApifyService } from './providers/ApifyService';
import { ScraperAPIService } from './providers/ScraperAPIService';
import { DatabaseService } from './DatabaseService';
import { CandidateProcessor } from './CandidateProcessor';
import { buildLinkedInQuery, buildGitHubQuery, buildJobBoardQuery } from '../utils/queryBuilder';
import { validateProviderConfig } from '../config/providers';
import { logger } from '../utils/logger';

export class ScrapingService {
  private apifyService: ApifyService;
  private scraperAPIService: ScraperAPIService;
  private databaseService: DatabaseService;
  private candidateProcessor: CandidateProcessor;

  constructor() {
    this.apifyService = new ApifyService();
    this.scraperAPIService = new ScraperAPIService();
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

    // Determine sources to scrape
    const sources = options.sources || ['linkedin', 'github', 'jobboard'];
    
    // Validate provider configuration
    const validation = validateProviderConfig(sources);
    if (!validation.valid) {
      logger.warn('Missing provider configuration:', validation.missing);
      // Continue with available providers
    }

    const results: ScrapeResult[] = [];
    const maxCandidates = options.maxCandidates || 50;
    const minMatchScore = options.minMatchScore || 60;

    // Scrape from each source
    for (const source of sources) {
      try {
        let candidates: ScrapedCandidate[] = [];

        if (source === 'linkedin') {
          candidates = await this.scrapeLinkedIn(job, options);
        } else if (source === 'github') {
          candidates = await this.scrapeGitHub(job, options);
        } else if (source === 'jobboard') {
          candidates = await this.scrapeJobBoards(job, options);
        }

        // Process and save candidates
        const saved = await this.processAndSaveCandidates(
          job,
          candidates,
          maxCandidates,
          minMatchScore
        );

        results.push({
          success: true,
          candidatesFound: candidates.length,
          candidatesSaved: saved,
          source
        });

        logger.info(`Completed ${source} scraping: ${saved} candidates saved`);
      } catch (error: any) {
        logger.error(`Error scraping from ${source}:`, error);
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
   * Scrape LinkedIn profiles
   */
  private async scrapeLinkedIn(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    const query = buildLinkedInQuery(job, options.maxCandidates || 50);
    
    // Try Apify first (preferred), fallback to ScraperAPI
    if (this.apifyService.isConfigured()) {
      try {
        return await this.apifyService.scrapeLinkedIn(query);
      } catch (error: any) {
        logger.warn('Apify LinkedIn scraping failed, trying ScraperAPI:', error.message);
      }
    }

    if (this.scraperAPIService.isConfigured()) {
      return await this.scraperAPIService.scrapeLinkedIn(query);
    }

    throw new Error('No LinkedIn scraping provider configured (Apify or ScraperAPI required)');
  }

  /**
   * Scrape GitHub profiles
   */
  private async scrapeGitHub(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    // GitHub scraping will be implemented in Phase 2
    // For now, return empty array
    logger.info('GitHub scraping not yet implemented (Phase 2)');
    return [];
  }

  /**
   * Scrape job boards
   */
  private async scrapeJobBoards(job: Job, options: ScrapeOptions): Promise<ScrapedCandidate[]> {
    if (!this.scraperAPIService.isConfigured()) {
      logger.warn('ScraperAPI not configured, skipping job boards');
      return [];
    }

    const query = buildJobBoardQuery(job, options.maxCandidates || 50);
    const candidates: ScrapedCandidate[] = [];

    // Scrape multiple job boards
    const boards = ['indeed', 'stackoverflow'];
    
    for (const board of boards) {
      try {
        const boardCandidates = await this.scraperAPIService.scrapeJobBoard(board, query);
        candidates.push(...boardCandidates);
      } catch (error: any) {
        logger.warn(`Error scraping ${board}:`, error.message);
      }
    }

    return candidates;
  }

  /**
   * Process and save candidates to database
   */
  private async processAndSaveCandidates(
    job: Job,
    candidates: ScrapedCandidate[],
    maxCandidates: number,
    minMatchScore: number
  ): Promise<number> {
    let saved = 0;

    // Process each candidate
    for (const candidate of candidates.slice(0, maxCandidates)) {
      try {
        // Process and validate
        const processed = this.candidateProcessor.processCandidate(candidate, job);

        if (!processed.isValid) {
          logger.debug(`Skipping invalid candidate: ${processed.validationErrors.join(', ')}`);
          continue;
        }

        // Check match score
        if (processed.matchScore < minMatchScore) {
          logger.debug(`Skipping candidate ${processed.name} (match score ${processed.matchScore} < ${minMatchScore})`);
          continue;
        }

        // Save to database
        const result = await this.databaseService.saveCandidate(job, processed, processed.matchScore);

        if (result.success) {
          saved++;
        } else {
          logger.debug(`Failed to save candidate ${processed.name}: ${result.error}`);
        }
      } catch (error: any) {
        logger.error(`Error processing candidate ${candidate.name}:`, error);
      }
    }

    return saved;
  }
}


