/**
 * Apify service for LinkedIn scraping
 * Uses Apify's pre-built LinkedIn profile scrapers
 */

import ApifyClient from 'apify-client';
import { LinkedInQuery, ScrapedCandidate } from '../../types';
import { providerConfig } from '../../config/providers';
import { logger } from '../../utils/logger';

export class ApifyService {
  private client: ApifyClient | null = null;

  constructor() {
    if (providerConfig.apify?.apiToken) {
      this.client = new ApifyClient({
        token: providerConfig.apify.apiToken
      });
    }
  }

  /**
   * Check if Apify is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Scrape LinkedIn profiles using Apify actors
   * 
   * Note: This uses Apify's LinkedIn Profile Scraper actor
   * Actor ID: apify/linkedin-profile-scraper
   */
  async scrapeLinkedIn(query: LinkedInQuery): Promise<ScrapedCandidate[]> {
    if (!this.client) {
      throw new Error('Apify API token not configured');
    }

    logger.info('Starting LinkedIn scraping via Apify...', { query });

    try {
      // Use Apify's LinkedIn Profile Scraper actor
      // This actor searches LinkedIn and extracts profile data
      const actorId = 'apify/linkedin-profile-scraper';
      
      // Build search query for LinkedIn
      const searchQuery = this.buildLinkedInSearchQuery(query);

      // Run the actor
      const run = await this.client.actor(actorId).call({
        searchQuery,
        maxResults: query.maxResults || 50,
        extendOutputFunction: `async ({ data, item, helpers, page, customData, label }) => {
          return item;
        }`,
        extendScraperFunction: `async ({ page, request, session, helpers, Apify }) => {
          // Custom scraper logic if needed
        }`
      });

      // Wait for run to finish and get results
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      logger.info(`Apify LinkedIn scraping completed. Found ${items.length} profiles`);

      // Transform Apify results to ScrapedCandidate format
      return items.map((item: any) => this.transformLinkedInProfile(item));
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

    if (query.location) {
      parts.push(query.location);
    }

    return parts.join(' ');
  }

  /**
   * Transform Apify LinkedIn profile data to ScrapedCandidate
   */
  private transformLinkedInProfile(profile: any): ScrapedCandidate {
    // Extract work experience
    const workExperience = profile.positions?.map((pos: any) => ({
      role: pos.title || '',
      company: pos.companyName || '',
      duration: pos.duration || '',
      description: pos.description || ''
    })) || [];

    // Extract education
    const education = profile.education?.map((edu: any) => ({
      degree: edu.degree || '',
      school: edu.schoolName || '',
      field: edu.fieldOfStudy || '',
      year: edu.timePeriod || ''
    })) || [];

    // Extract skills
    const skills = profile.skills?.map((skill: any) => skill.name || skill) || [];

    // Build resume summary
    const resumeSummary = this.buildResumeSummary(profile, workExperience);

    return {
      name: profile.fullName || profile.name || '',
      email: profile.email || undefined,
      location: profile.location || undefined,
      experience: this.extractExperience(profile, workExperience),
      skills,
      resumeSummary,
      profileUrl: profile.url || profile.linkedInUrl || undefined,
      workExperience,
      education,
      portfolioUrls: {
        linkedin: profile.url || profile.linkedInUrl,
        website: profile.websites?.[0]
      },
      source: 'linkedin',
      rawData: profile
    };
  }

  /**
   * Extract years of experience from profile
   */
  private extractExperience(profile: any, workExperience: any[]): number | undefined {
    // Try to get from profile directly
    if (profile.yearsOfExperience) {
      return parseInt(profile.yearsOfExperience);
    }

    // Calculate from work experience
    if (workExperience.length > 0) {
      // Simple heuristic: count positions as years (rough estimate)
      return Math.min(workExperience.length * 2, 15); // Cap at 15 years
    }

    return undefined;
  }

  /**
   * Build resume summary from profile data
   */
  private buildResumeSummary(profile: any, workExperience: any[]): string {
    const parts: string[] = [];

    if (profile.headline) {
      parts.push(profile.headline);
    }

    if (profile.summary) {
      parts.push(profile.summary.substring(0, 200)); // Limit summary length
    } else if (workExperience.length > 0) {
      const latestRole = workExperience[0];
      parts.push(`${latestRole.role} at ${latestRole.company}`);
    }

    if (profile.location) {
      parts.push(`Based in ${profile.location}`);
    }

    return parts.join('. ') + '.';
  }
}

