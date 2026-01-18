/**
 * GitHub service for developer profile scraping
 * Uses GitHub REST API - FREE, no scraping needed
 */

import { GitHubQuery, ScrapedCandidate } from '../../types';
import { providerConfig } from '../../config/providers';
import { logger } from '../../utils/logger';
import { Octokit } from '@octokit/rest';

export class GitHubService {
  private octokit: Octokit | null = null;
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization
  }

  /**
   * Initialize GitHub API client
   */
  private async initializeClient(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const token = providerConfig.github?.token;
      
      this.octokit = new Octokit({
        auth: token || undefined, // Optional - works without token but with lower rate limits
        userAgent: 'CoreFlow-Candidate-Scraper/1.0'
      });

      this.initialized = true;
      logger.info('GitHub API client initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize GitHub API client:', error);
      this.initialized = true; // Mark as initialized even if failed to avoid retries
    }
  }

  /**
   * Check if GitHub API is accessible
   */
  async isConfigured(): Promise<boolean> {
    await this.initializeClient();
    return this.octokit !== null;
  }

  /**
   * Scrape GitHub developer profiles
   * Searches for developers by language, location, and keywords
   * Filters for users with "available for hire" status when possible
   */
  async scrapeDevelopers(query: GitHubQuery): Promise<ScrapedCandidate[]> {
    await this.initializeClient();

    if (!this.octokit) {
      throw new Error('GitHub API client not initialized');
    }

    logger.info('Starting GitHub developer scraping (FREE API)...', { query });

    const candidates: ScrapedCandidate[] = [];
    const maxResults = query.maxResults || 50;

    try {
      // GitHub location search is VERY restrictive - requires exact match
      // Strategy: Try WITH location first, then WITHOUT location if no results
      const hasLocation = query.location && query.location.trim().length > 0;
      const hasLanguage = query.language && query.language.trim().length > 0;
      const hasKeywords = query.keywords && query.keywords.length > 0;
      
      // Determine experience level filter from keywords
      const isSenior = query.keywords?.some(k => ['senior', 'lead', 'principal'].includes(k.toLowerCase())) || false;
      const isMid = query.keywords?.some(k => ['mid', 'middle', 'intermediate'].includes(k.toLowerCase())) || false;
      const isJunior = query.keywords?.some(k => ['junior', 'jr', 'entry', 'associate'].includes(k.toLowerCase())) || false;
      
      // Set follower thresholds based on experience level
      // Senior developers typically have more followers/repositories
      const followerThreshold = isSenior ? '>50' : isMid ? '>20' : isJunior ? '>5' : '>10';
      const repoThreshold = isSenior ? '>10' : isMid ? '>5' : '>3';
      
      // Extract technical keywords (excluding experience level words)
      const techKeywords = query.keywords?.filter(k => 
        !['senior', 'mid', 'junior', 'lead', 'principal', 'entry', 'associate', 'jr', 'middle', 'intermediate'].includes(k.toLowerCase())
      ) || [];
      
      // Build queries to try in order (from most specific to least specific)
      const queriesToTry: string[] = [];
      
      // 1. Try with location + language + tech keywords + experience filter (most specific for senior roles)
      if (hasLocation && hasLanguage) {
        let q1 = `location:"${query.location}" language:${query.language}`;
        if (techKeywords.length > 0) {
          const relevantKeywords = techKeywords
            .filter(k => k.length >= 3 && !['the', 'and', 'with', 'for', 'are', 'has', 'have'].includes(k.toLowerCase()))
            .slice(0, 2); // Use top 2 tech keywords
          if (relevantKeywords.length > 0) {
            q1 += ` ${relevantKeywords.join(' ')}`;
          }
        }
        if (isSenior || isMid) {
          q1 += ` followers:${followerThreshold}`;
        }
        queriesToTry.push(q1);
      }
      
      // 2. Try without location: language + tech keywords + experience filter
      if (hasLanguage) {
        let q2 = `language:${query.language}`;
        if (techKeywords.length > 0) {
          const relevantKeywords = techKeywords
            .filter(k => k.length >= 3 && !['the', 'and', 'with', 'for'].includes(k.toLowerCase()))
            .slice(0, 2); // Use top 2 tech keywords
          if (relevantKeywords.length > 0) {
            q2 += ` ${relevantKeywords.join(' ')}`;
          }
        }
        if (isSenior || isMid || isJunior) {
          q2 += ` followers:${followerThreshold}`;
        } else {
          q2 += ` followers:>10`;
        }
        queriesToTry.push(q2);
      }
      
      // 3. Try just language + experience filter (fallback)
      if (hasLanguage) {
        queriesToTry.push(`language:${query.language} followers:${followerThreshold}`);
      }
      
      // 4. Try just tech keywords + experience filter
      if (techKeywords.length > 0) {
        const relevantKeywords = techKeywords
          .filter(k => k.length >= 3)
          .slice(0, 2);
        if (relevantKeywords.length > 0) {
          queriesToTry.push(`${relevantKeywords.join(' ')} followers:${followerThreshold}`);
        }
      }
      
      // 5. Ultimate fallback: active developers based on experience level
      queriesToTry.push(`followers:${followerThreshold} type:user`);

      logger.info(`GitHub will try ${queriesToTry.length} different search queries (location is often too restrictive)`);

      let users: any[] = [];
      let successfulQuery = '';

      // Try each query until we get results
      for (const searchQuery of queriesToTry) {
        try {
          logger.info(`🔍 Trying GitHub query: ${searchQuery}`);
          
          // Try to get more results by requesting multiple pages if needed
          const perPage = Math.min(100, Math.max(maxResults, 30)); // Request at least 30, up to 100
          const response = await this.octokit.search.users({
            q: searchQuery,
            per_page: perPage,
            sort: 'followers',
            order: 'desc',
            page: 1
          });

          // Get results from first page
          users = response.data.items.slice(0, maxResults);
          logger.info(`   → Found ${users.length} developers from page 1`);
          
          // If we need more results and there are more pages, fetch them
          if (users.length < maxResults && response.data.total_count > users.length) {
            const pagesNeeded = Math.ceil(maxResults / perPage);
            const additionalUsers: any[] = [];
            
            for (let page = 2; page <= Math.min(pagesNeeded, 5); page++) { // Max 5 pages
              try {
                const nextResponse = await this.octokit.search.users({
                  q: searchQuery,
                  per_page: perPage,
                  sort: 'followers',
                  order: 'desc',
                  page
                });
                additionalUsers.push(...nextResponse.data.items);
                logger.info(`   → Found ${nextResponse.data.items.length} developers from page ${page}`);
                
                if (users.length + additionalUsers.length >= maxResults) {
                  break;
                }
              } catch (error: any) {
                logger.warn(`   → Failed to fetch page ${page}: ${error.message}`);
                break;
              }
            }
            
            users = [...users, ...additionalUsers].slice(0, maxResults);
            logger.info(`   → Total found: ${users.length} developers (across multiple pages)`);
          }
          
          if (users.length > 0) {
            successfulQuery = searchQuery;
            logger.info(`✅ Success with query: ${searchQuery}`);
            break;
          } else {
            logger.info(`   → No results. Trying next query...`);
          }
        } catch (error: any) {
          logger.warn(`   → Query failed: ${error.message}. Trying next...`);
          continue;
        }
      }

      if (users.length === 0) {
        logger.warn(`⚠️  All GitHub queries returned 0 results. This might indicate:`);
        logger.warn(`   - Location "${query.location}" is too restrictive`);
        logger.warn(`   - Try a broader search or remove location filter`);
        return [];
      }

      logger.info(`✅ Using successful query: ${successfulQuery}`);
      logger.info(`📊 Found ${users.length} developers to process`);

      // Fetch detailed profile for each user
      for (const user of users) {
        try {
          // Get user profile details
          const { data: profile } = await this.octokit.users.getByUsername({
            username: user.login
          });

          // Get user's repositories to extract skills
          const { data: repos } = await this.octokit.repos.listForUser({
            username: user.login,
            per_page: 10, // Get top 10 repos
            sort: 'updated',
            direction: 'desc'
          });

          // Try to find email from commits if profile email is not available
          let email = profile.email;
          if (!email && repos.length > 0) {
            try {
              // Check commits from the most recently updated repo
              const { data: commits } = await this.octokit.repos.listCommits({
                owner: user.login,
                repo: repos[0].name,
                per_page: 10,
                author: user.login
              });
              
              // Extract email from commit author
              for (const commit of commits) {
                if (commit.commit?.author?.email && 
                    commit.commit.author.email.includes('@') &&
                    !commit.commit.author.email.includes('users.noreply.github.com')) {
                  email = commit.commit.author.email;
                  logger.debug(`Found email from commits for ${user.login}: ${email}`);
                  break;
                }
              }
            } catch (error: any) {
              // If we can't fetch commits, continue without email
              logger.debug(`Could not fetch commits for ${user.login}: ${error.message}`);
            }
          }

          // Extract languages from repositories
          const languages = new Set<string>();
          for (const repo of repos.slice(0, 5)) {
            try {
              const { data: repoLanguages } = await this.octokit.repos.listLanguages({
                owner: user.login,
                repo: repo.name
              });
              Object.keys(repoLanguages).forEach(lang => languages.add(lang));
            } catch (error: any) {
              // Skip if repo language fetch fails
              logger.debug(`Failed to fetch languages for ${user.login}/${repo.name}: ${error.message}`);
            }
          }

          // Build candidate profile with email
          const candidate = this.transformGitHubProfile(profile, repos, Array.from(languages), email);
          candidates.push(candidate);

          // Rate limiting: GitHub API allows 60 requests/hour without token, 5000/hour with token
          // Add small delay to avoid hitting rate limits
          await this.delay(100); // 100ms delay between requests
        } catch (error: any) {
          logger.warn(`Failed to fetch profile for ${user.login}:`, error.message);
          // Continue with next user
        }
      }

      logger.info(`GitHub scraping completed. Found ${candidates.length} developer profiles`);
      return candidates;
    } catch (error: any) {
      logger.error('Error scraping GitHub:', error);
      throw new Error(`GitHub scraping failed: ${error.message}`);
    }
  }

  /**
   * Transform GitHub user profile to ScrapedCandidate
   */
  private transformGitHubProfile(
    profile: any,
    repos: any[],
    languages: string[],
    email?: string
  ): ScrapedCandidate {
    // Extract work experience from bio/profile (limited info available)
    const workExperience: any[] = [];
    
    // Try to extract from bio or company field
    if (profile.company) {
      workExperience.push({
        role: profile.bio?.split('at')[0]?.trim() || 'Developer',
        company: profile.company.replace(/@/g, '').trim(),
        duration: '',
        description: profile.bio || ''
      });
    }

    // Build resume summary from bio and top repos
    const resumeParts: string[] = [];
    if (profile.bio) {
      resumeParts.push(profile.bio);
    }
    if (repos.length > 0) {
      resumeParts.push(`Active developer with ${repos.length}+ repositories`);
    }
    if (languages.length > 0) {
      resumeParts.push(`Proficient in: ${languages.slice(0, 5).join(', ')}`);
    }
    const resumeSummary = resumeParts.join('. ') || `${profile.name || profile.login} - GitHub Developer`;

    return {
      name: profile.name || profile.login,
      email: email || profile.email || undefined, // Use email from commits if profile email not available
      location: profile.location || undefined,
      experience: this.estimateExperience(profile, repos),
      skills: languages.length > 0 ? languages : this.extractSkillsFromBio(profile.bio),
      resumeSummary,
      profileUrl: profile.html_url,
      workExperience,
      education: [], // GitHub doesn't provide education info
      portfolioUrls: {
        github: profile.html_url,
        website: profile.blog || undefined,
        linkedin: undefined // GitHub doesn't provide LinkedIn link directly
      },
      source: 'github',
      rawData: {
        profile,
        repos: repos.slice(0, 5),
        languages
      }
    };
  }

  /**
   * Estimate years of experience from GitHub profile
   */
  private estimateExperience(profile: any, repos: any[]): number | undefined {
    // Estimate based on account age
    if (profile.created_at) {
      const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.round(accountAge);
    }

    // Fallback: estimate from repository count
    if (repos.length > 0) {
      // Rough estimate: 1 year per 10 repos (very rough)
      return Math.min(Math.round(repos.length / 10), 15);
    }

    return undefined;
  }

  /**
   * Extract skills from bio text
   */
  private extractSkillsFromBio(bio: string | null | undefined): string[] {
    if (!bio) return [];

    // Common tech keywords
    const techKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Vue', 'Angular',
      'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
      'AWS', 'Docker', 'Kubernetes', 'Git', 'MongoDB', 'PostgreSQL',
      'Machine Learning', 'AI', 'Data Science', 'DevOps', 'CI/CD'
    ];

    const skills: string[] = [];
    const bioLower = bio.toLowerCase();

    for (const keyword of techKeywords) {
      if (bioLower.includes(keyword.toLowerCase())) {
        skills.push(keyword);
      }
    }

    return skills;
  }

  /**
   * Small delay to respect rate limits
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
