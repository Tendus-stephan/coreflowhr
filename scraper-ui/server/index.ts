/**
 * Express server for scraper testing UI
 * Provides REST API endpoints for scraping operations
 */

import express from 'express';
import cors from 'cors';
import { ScrapingService } from '../../scraper/src/services/ScrapingService.js';
import { DatabaseService } from '../../scraper/src/services/DatabaseService.js';
import { ScrapeOptions } from '../../scraper/src/types/index.js';
import { logger } from '../../scraper/src/utils/logger.js';

const app = express();
const PORT = process.env.SCRAPER_UI_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for scraping jobs (in production, use Redis or database)
const activeJobs = new Map<string, {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: any[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}>();

/**
 * GET /api/jobs
 * List all active jobs
 */
app.get('/api/jobs', async (req, res) => {
  try {
    const dbService = new DatabaseService();
    const jobs = await dbService.getActiveJobs();
    res.json({ success: true, jobs });
  } catch (error: any) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job details
 */
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const dbService = new DatabaseService();
    const job = await dbService.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error: any) {
    logger.error('Error fetching job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:jobId/candidates
 * Get scraped candidates for a job
 */
app.get('/api/jobs/:jobId/candidates', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const dbService = new DatabaseService();
    const candidates = await dbService.getCandidatesForJob(
      jobId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );
    
    res.json({ success: true, candidates });
  } catch (error: any) {
    logger.error('Error fetching candidates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobs/:jobId/scrape
 * Start scraping for a job
 */
app.post('/api/jobs/:jobId/scrape', async (req, res) => {
  const { jobId } = req.params;
  const options: ScrapeOptions = req.body || {};

  // Check if job is already being scraped
  if (activeJobs.has(jobId)) {
    const job = activeJobs.get(jobId)!;
    if (job.status === 'running') {
      return res.status(409).json({
        success: false,
        error: 'Scraping already in progress for this job',
        jobId
      });
    }
  }

  // Start scraping in background
  const scrapingService = new ScrapingService();
  
  activeJobs.set(jobId, {
    jobId,
    status: 'running',
    progress: 0,
    startedAt: new Date()
  });

  // Run scraping asynchronously
  scrapingService.scrapeForJob(jobId, options)
    .then(results => {
      activeJobs.set(jobId, {
        jobId,
        status: 'completed',
        progress: 100,
        results,
        startedAt: activeJobs.get(jobId)!.startedAt,
        completedAt: new Date()
      });
      logger.info(`Scraping completed for job ${jobId}`);
    })
    .catch(error => {
      activeJobs.set(jobId, {
        jobId,
        status: 'failed',
        progress: 0,
        error: error.message,
        startedAt: activeJobs.get(jobId)!.startedAt,
        completedAt: new Date()
      });
      logger.error(`Scraping failed for job ${jobId}:`, error);
    });

  res.json({
    success: true,
    message: 'Scraping started',
    jobId
  });
});

/**
 * GET /api/jobs/:jobId/scrape/status
 * Get scraping status for a job
 */
app.get('/api/jobs/:jobId/scrape/status', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'No scraping job found'
    });
  }

  res.json({
    success: true,
    status: job.status,
    progress: job.progress,
    results: job.results,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  });
});

/**
 * GET /api/providers/status
 * Check which scraping providers are configured
 */
app.get('/api/providers/status', async (req, res) => {
  try {
    const { validateProviderConfig } = await import('../../scraper/src/config/providers.js');
    
    const sources = ['linkedin', 'github', 'jobboard'];
    const status: Record<string, boolean> = {};
    
    for (const source of sources) {
      const validation = validateProviderConfig([source]);
      status[source] = validation.valid;
    }

    res.json({
      success: true,
      providers: status
    });
  } catch (error: any) {
    logger.error('Error checking provider status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Scraper UI server running on http://localhost:${PORT}`);
  console.log(`\n🚀 Scraper Testing UI Server`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api\n`);
});

