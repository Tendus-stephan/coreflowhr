/**
 * Scraper UI Backend API Server
 * Provides API endpoints for jobs, scraping, and results
 */

// Node 18.17 and earlier: polyfill global File so undici (used by apify-client/fetch) does not throw
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('./polyfill-file.cjs');

import express from 'express';
import cors from 'cors';
import { ScrapingService } from '../../scraper/src/services/ScrapingService';
import { DatabaseService } from '../../scraper/src/services/DatabaseService';
import { logger } from '../../scraper/src/utils/logger';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const scrapingService = new ScrapingService();
const databaseService = new DatabaseService();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all active jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await databaseService.getActiveJobs();
    res.json(jobs);
  } catch (error: any) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await databaseService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    logger.error('Error fetching job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scrape candidates for a job
app.post('/api/scrape', async (req, res) => {
  try {
    const { jobId, sources, maxCandidates, minMatchScore } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    logger.info(`Starting scraping for job ${jobId}`, { sources, maxCandidates, minMatchScore });

    const results = await scrapingService.scrapeForJob(jobId, {
      sources,
      maxCandidates,
      minMatchScore
    });

    res.json({
      success: true,
      results,
      totalSaved: results.reduce((sum, r) => sum + r.candidatesSaved, 0)
    });
  } catch (error: any) {
    logger.error('Error scraping:', error);
    logger.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Return detailed error information
    res.status(500).json({ 
      error: error.message,
      success: false,
      results: [],
      totalSaved: 0,
      diagnostic: {
        errorType: error.name,
        errorCode: error.code,
        message: error.message
      }
    });
  }
});

// Get scraped candidates for a job
app.get('/api/jobs/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const candidates = await databaseService.getCandidatesForJob(id, limit, offset);
    res.json(candidates);
  } catch (error: any) {
    logger.error('Error fetching candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scraping status/statistics
app.get('/api/status', async (req, res) => {
  try {
    // This could return provider status, recent scraping activity, etc.
    res.json({ status: 'ready' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic endpoint to check scraper configuration
app.get('/api/diagnostic', async (req, res) => {
  try {
    const diagnostics: any = {
      server: {
        status: 'running',
        port: PORT,
        timestamp: new Date().toISOString()
      },
      apify: {
        configured: false,
        hasToken: false,
        tokenLength: 0,
        error: null
      },
      database: {
        connected: false,
        error: null
      }
    };

    // Check Apify configuration
    try {
      const { providerConfig } = await import('../../scraper/src/config/providers');
      const hasToken = !!providerConfig.apify?.apiToken;
      diagnostics.apify.hasToken = hasToken;
      diagnostics.apify.tokenLength = providerConfig.apify?.apiToken?.length || 0;
      
      if (hasToken) {
        const { ApifyService } = await import('../../scraper/src/services/providers/ApifyService');
        const apifyService = new ApifyService();
        diagnostics.apify.configured = await apifyService.isConfigured();
      }
    } catch (apifyError: any) {
      diagnostics.apify.error = apifyError.message;
    }

    // Check database connection
    try {
      const testJob = await databaseService.getActiveJobs();
      diagnostics.database.connected = true;
      diagnostics.database.jobsCount = testJob.length;
    } catch (dbError: any) {
      diagnostics.database.error = dbError.message;
    }

    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message,
      diagnostics: null 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Scraper UI API server running on http://localhost:${PORT}`);
  logger.info(`Scraper UI API server started on port ${PORT}`);
});
