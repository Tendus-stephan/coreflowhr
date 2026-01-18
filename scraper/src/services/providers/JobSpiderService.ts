/**
 * JobSpider service for resume database scraping
 * FREE resume database - no fees for searching
 */

import { JobSpiderQuery, ScrapedCandidate } from '../../types';
import { logger } from '../../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class JobSpiderService {
  private baseUrl = 'https://www.jobspider.com';

  /**
   * Check if JobSpider is accessible
   * NOTE: JobSpider requires account login to access resume database
   * This currently attempts public scraping, but may require authentication
   */
  isConfigured(): boolean {
    // JobSpider requires FREE account - check if credentials are available
    // For now, we attempt public access (may fail and need auth)
    return true;
  }

  /**
   * Scrape candidate resumes from JobSpider
   * 
   * ⚠️ IMPORTANT: JobSpider requires FREE account login to access resume database.
   * This method attempts public access, but will likely need authentication.
   * 
   * Setup required:
   * 1. Create FREE account at https://www.jobspider.com (Employers section)
   * 2. Check for API access in dashboard
   * 3. OR provide session cookies for authenticated scraping
   */
  async scrapeResumes(query: JobSpiderQuery): Promise<ScrapedCandidate[]> {
    logger.info('Starting JobSpider resume scraping (FREE resume database)...', { query });
    logger.warn('⚠️  JobSpider requires account login. This may fail without authentication.');

    try {
      // Build search URL for JobSpider resume search
      const searchParams = new URLSearchParams();
      
      if (query.jobTitle) {
        searchParams.append('keyword', query.jobTitle);
      }
      
      if (query.location) {
        searchParams.append('location', query.location);
      }
      
      if (query.skills && query.skills.length > 0) {
        searchParams.append('skills', query.skills.join(' '));
      }

      // Try to access JobSpider's resume search
      // Note: This likely requires authentication (login session)
      const searchUrl = `${this.baseUrl}/job/resume_search.asp?${searchParams.toString()}`;
      
      logger.info(`Searching JobSpider: ${searchUrl}`);
      logger.warn('Note: If this fails, you may need to create a FREE account at https://www.jobspider.com');

      // Make request to JobSpider
      // TODO: Add session cookie support for authenticated access
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          // TODO: Add Cookie header with session if available
          // 'Cookie': 'session_id=...'
        },
        timeout: 30000
      });

      // Parse HTML response to extract resume data
      const candidates = this.parseResumeResults(response.data, query.maxResults || 50);

      logger.info(`JobSpider scraping completed. Found ${candidates.length} resumes`);

      return candidates;
    } catch (error: any) {
      logger.error('Error scraping JobSpider:', error);
      throw new Error(`JobSpider scraping failed: ${error.message}`);
    }
  }

  /**
   * Parse HTML response to extract resume/candidate data
   */
  private parseResumeResults(html: string, maxResults: number): ScrapedCandidate[] {
    const candidates: ScrapedCandidate[] = [];
    const $ = cheerio.load(html);

    try {
      // Note: This selector structure needs to be verified against actual JobSpider HTML
      // Adjust selectors based on actual JobSpider resume search results page structure
      
      // Try to find resume rows/listings (JobSpider typically uses table or list structure)
      $('tr[onclick*="resume"], .resume-row, .resume-item, table tr').each((index, element) => {
        if (candidates.length >= maxResults) return false; // Stop when quota reached

        try {
          const $el = $(element);
          
          // Extract resume data (adjust selectors based on actual HTML structure)
          const name = $el.find('td:first-child, .name, .candidate-name, a').first().text().trim() || '';
          
          const location = $el.find('td:nth-child(2), .location, .city').first().text().trim() || undefined;
          
          const title = $el.find('td:nth-child(3), .title, .job-title').first().text().trim() || '';
          
          const summary = $el.find('td:last-child, .summary, .description').first().text().trim() || '';
          
          const resumeUrl = $el.find('a').first().attr('href') || undefined;
          const fullUrl = resumeUrl ? (resumeUrl.startsWith('http') ? resumeUrl : `${this.baseUrl}${resumeUrl}`) : undefined;

          if (name && name.length > 1) { // Basic validation - name should exist
            const candidate = this.transformResume({
              name,
              location,
              title,
              summary,
              url: fullUrl,
              skills: [],
              email: undefined, // Usually not in search results
              experience: undefined,
              workExperience: [],
              education: []
            });

            candidates.push(candidate);
          }
        } catch (error: any) {
          logger.debug(`Error parsing resume item ${index}:`, error.message);
          // Continue with next item
        }
      });

      logger.info(`Parsed ${candidates.length} resumes from JobSpider HTML`);
    } catch (error: any) {
      logger.error('Error parsing JobSpider HTML:', error);
      // Return empty array if parsing fails
    }

    return candidates;
  }

  /**
   * Transform JobSpider resume data to ScrapedCandidate
   */
  private transformResume(resume: any): ScrapedCandidate {
    return {
      name: resume.name || resume.fullName || '',
      email: resume.email || undefined,
      location: resume.location || resume.city || undefined,
      experience: resume.yearsOfExperience || undefined,
      skills: resume.skills || resume.keywords || [],
      resumeSummary: resume.summary || resume.objective || resume.profileSummary || '',
      profileUrl: resume.url || resume.resumeUrl || undefined,
      workExperience: resume.experience?.map((exp: any) => ({
        role: exp.title || exp.position || '',
        company: exp.company || exp.employer || '',
        duration: exp.duration || exp.period || '',
        description: exp.description || exp.summary || ''
      })) || [],
      education: resume.education || [],
      portfolioUrls: {
        linkedin: resume.linkedinUrl,
        website: resume.website || resume.portfolio
      },
      source: 'jobspider',
      rawData: resume
    };
  }
}



