/**
 * MightyRecruiter service for resume database scraping
 * FREE access to 21+ million resumes
 */

import { MightyRecruiterQuery, ScrapedCandidate } from '../../types';
import { logger } from '../../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class MightyRecruiterService {
  private baseUrl = 'https://www.mightyrecruiter.com';

  /**
   * Check if MightyRecruiter is accessible
   * NOTE: MightyRecruiter requires account login to access resume database
   * This currently attempts public scraping, but may require authentication
   */
  isConfigured(): boolean {
    // MightyRecruiter requires FREE account - check if credentials are available
    // For now, we attempt public access (may fail and need auth)
    return true;
  }

  /**
   * Scrape candidate resumes from MightyRecruiter
   * 
   * ⚠️ IMPORTANT: MightyRecruiter requires FREE account login to access resume database.
   * This method attempts public access, but will likely need authentication.
   * 
   * Setup required:
   * 1. Create FREE account at https://www.mightyrecruiter.com
   * 2. Check for API access in dashboard
   * 3. OR provide session cookies for authenticated scraping
   */
  async scrapeResumes(query: MightyRecruiterQuery): Promise<ScrapedCandidate[]> {
    logger.info('Starting MightyRecruiter resume scraping (FREE - 21M+ resumes)...', { query });
    logger.warn('⚠️  MightyRecruiter requires account login. This may fail without authentication.');

    try {
      // Build search URL for MightyRecruiter resume search
      // Note: This will need to be adapted based on actual MightyRecruiter search structure
      // MightyRecruiter typically requires login - URL structure may be different
      const searchParams = new URLSearchParams();
      
      if (query.jobTitle) {
        searchParams.append('q', query.jobTitle);
      }
      
      if (query.location) {
        searchParams.append('location', query.location);
      }
      
      if (query.skills && query.skills.length > 0) {
        searchParams.append('skills', query.skills.join(','));
      }

      // Try to access MightyRecruiter's resume search
      // Note: This likely requires authentication (login session)
      const searchUrl = `${this.baseUrl}/resumes/search?${searchParams.toString()}`;
      
      logger.info(`Searching MightyRecruiter: ${searchUrl}`);
      logger.warn('Note: If this fails, you may need to create a FREE account at https://www.mightyrecruiter.com');

      // Make request to MightyRecruiter
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
      // Note: This will need HTML parsing (cheerio or similar)
      const candidates = this.parseResumeResults(response.data, query.maxResults || 50);

      logger.info(`MightyRecruiter scraping completed. Found ${candidates.length} resumes`);

      return candidates;
    } catch (error: any) {
      logger.error('Error scraping MightyRecruiter:', error);
      throw new Error(`MightyRecruiter scraping failed: ${error.message}`);
    }
  }

  /**
   * Parse HTML response to extract resume/candidate data
   */
  private parseResumeResults(html: string, maxResults: number): ScrapedCandidate[] {
    const candidates: ScrapedCandidate[] = [];
    const $ = cheerio.load(html);

    try {
      // Note: This selector structure needs to be verified against actual MightyRecruiter HTML
      // Adjust selectors based on actual MightyRecruiter resume search results page structure
      
      // Try to find resume cards/listings
      $('.resume-card, .resume-item, .resume-listing, [data-resume-id]').each((index, element) => {
        if (candidates.length >= maxResults) return false; // Stop when quota reached

        try {
          const $el = $(element);
          
          // Extract resume data (adjust selectors based on actual HTML structure)
          const name = $el.find('.name, .candidate-name, [data-name]').first().text().trim() ||
                      $el.find('h2, h3, h4').first().text().trim() ||
                      '';
          
          const location = $el.find('.location, .city, [data-location]').first().text().trim() || undefined;
          
          const title = $el.find('.title, .job-title, [data-title]').first().text().trim() || '';
          
          const summary = $el.find('.summary, .objective, .resume-summary, .description').first().text().trim() || '';
          
          const resumeUrl = $el.find('a').first().attr('href') || undefined;
          const fullUrl = resumeUrl ? (resumeUrl.startsWith('http') ? resumeUrl : `${this.baseUrl}${resumeUrl}`) : undefined;
          
          // Extract skills (if available)
          const skills: string[] = [];
          $el.find('.skill, .tag, .keyword').each((_, skillEl) => {
            const skill = $(skillEl).text().trim();
            if (skill) skills.push(skill);
          });

          if (name) {
            const candidate = this.transformResume({
              name,
              location,
              title,
              summary,
              url: fullUrl,
              skills,
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

      logger.info(`Parsed ${candidates.length} resumes from MightyRecruiter HTML`);
    } catch (error: any) {
      logger.error('Error parsing MightyRecruiter HTML:', error);
      // Return empty array if parsing fails
    }

    return candidates;
  }

  /**
   * Transform MightyRecruiter resume data to ScrapedCandidate
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
      source: 'mightyrecruiter',
      rawData: resume
    };
  }
}

