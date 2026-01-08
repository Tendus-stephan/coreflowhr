/**
 * CV Parser Service - MVP Implementation
 * Extracts text from PDF and DOCX files and parses basic information
 */

// PDF.js worker setup
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker path - use local worker file from public directory
if (typeof window !== 'undefined') {
    // Use local worker file copied to public directory
    // This avoids CDN loading issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

import mammoth from 'mammoth';

export interface WorkExperience {
    role: string;
    company: string;
    startDate?: string;
    endDate?: string;
    period: string; // Formatted period like "2021 - Present"
    description?: string;
}

export interface Project {
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
}

export interface PortfolioURLs {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    dribbble?: string;
    behance?: string;
    website?: string;
    stackoverflow?: string;
    medium?: string;
    [key: string]: string | undefined; // Allow other URLs
}

export interface ParsedCVData {
    fullText: string;
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    skills: string[];
    experienceYears?: number;
    matchScore?: number; // Added by API after calculation
    matchingSkillsCount?: number; // Count of skills that match job requirements
    workExperience?: WorkExperience[];
    projects?: Project[];
    portfolioUrls?: PortfolioURLs;
}

/**
 * Extract text from CV file (PDF, DOC, or DOCX)
 */
export async function extractTextFromCV(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Determine file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return extractTextFromPDF(file);
    } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
    ) {
        return extractTextFromDOCX(file);
    } else if (
        fileType === 'application/msword' ||
        fileName.endsWith('.doc')
    ) {
        // DOC files - try to extract or return error message
        throw new Error('DOC files are not supported. Please convert to DOCX or PDF.');
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
    }
}

/**
 * Extract text from PDF file using PDF.js
 */
async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Configure PDF.js with worker from local file
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            verbosity: 0, // Suppress console warnings
            standardFontDataUrl: '/node_modules/pdfjs-dist/cmaps/',
            cMapUrl: '/node_modules/pdfjs-dist/cmaps/',
            cMapPacked: true
        });
        
        const pdf = await loadingTask.promise;
        let fullText = '';

        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            
            try {
                // Try to extract text content
                const textContent = await page.getTextContent({
                    normalizeWhitespace: true,
                    disableCombineTextItems: false
                });
                
                // Extract text from items
                const pageText = textContent.items
                    .map((item: any) => {
                        // Get text from item (item.str contains the actual text)
                        let text = '';
                        if (item.str !== undefined && item.str !== null) {
                            text = String(item.str);
                        } else if (item.text !== undefined && item.text !== null) {
                            text = String(item.text);
                        }
                        
                        // Remove control characters and non-printable characters (0x00-0x1F, 0x7F-0x9F)
                        text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
                        return text.trim();
                    })
                    .filter((text: string) => text.length > 0 && !/^[\s\x00-\x1F]*$/.test(text)) // Remove empty and whitespace-only
                    .join(' ');
                
                fullText += pageText + '\n';
            } catch (pageError: any) {
                console.warn(`Warning: Failed to extract text from page ${i}:`, pageError);
                // Continue with other pages
            }
        }

        const cleanedText = fullText.trim();
        
        // Validate extracted text - if it contains too many control characters, it's likely corrupted
        const controlCharCount = (cleanedText.match(/[\x00-\x1F\x7F-\x9F]/g) || []).length;
        if (controlCharCount > cleanedText.length * 0.1) {
            console.warn('⚠️ Extracted PDF text contains many control characters - text extraction may have failed');
        }
        
        // Log preview for debugging
        console.log('📄 PDF Text Extracted:', {
            length: cleanedText.length,
            preview: cleanedText.substring(0, 200),
            controlCharCount
        });

        return cleanedText;
    } catch (error: any) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message || 'The file may be corrupted or password-protected.'}`);
    }
}

/**
 * Extract text from DOCX file using Mammoth
 */
async function extractTextFromDOCX(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value.trim();
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX. The file may be corrupted.');
    }
}

/**
 * Parse CV text using OpenAI (GPT-4o Mini) only - NO GEMINI
 */
export async function parseCVTextWithAI(text: string, jobSkills?: string[]): Promise<ParsedCVData> {
  // Use OpenAI ONLY via Supabase Edge Function (secure, reliable, guaranteed JSON)
  console.log('🤖 [CV Parser] Using OpenAI for CV parsing (via Supabase Edge Function)');
  console.log('🚫 [CV Parser] Gemini is NOT being used for CV parsing');
  
  const { parseCVWithOpenAI } = await import('./openaiService');
  const aiParsed = await parseCVWithOpenAI(text, jobSkills);
  
  console.log('✅ [CV Parser] OpenAI CV parsing completed:', {
    name: aiParsed.name ? 'Found' : 'Not found',
    email: aiParsed.email ? 'Found' : 'Not found',
    skillsCount: aiParsed.skills?.length || 0,
    workExpCount: aiParsed.workExperience?.length || 0
  });
  
  // Merge AI results with full text
  return {
    fullText: text,
    name: aiParsed.name,
    email: aiParsed.email,
    phone: aiParsed.phone,
    location: aiParsed.location,
    skills: aiParsed.skills || [],
    experienceYears: aiParsed.experienceYears,
    workExperience: aiParsed.workExperience,
    projects: aiParsed.projects,
    portfolioUrls: aiParsed.portfolioUrls
  };
}

/**
 * Parse basic information from CV text using regex patterns
 * This is the fallback method when AI parsing is not available
 */
export function parseCVText(text: string, jobSkills?: string[]): ParsedCVData {
    const fullText = text;

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    const email = emails[0] || undefined;

    // Extract phone (various formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,14}|\d{10,}/g;
    const phones = text.match(phoneRegex) || [];
    const phone = phones[0]?.replace(/\s+/g, ' ') || undefined;

    // Extract name (usually first line or first 2-3 words)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const name = extractName(lines);

    // Extract location
    const location = extractLocation(text, lines);

    // Extract skills (match against job skills if provided, or common tech skills)
    const skills = extractSkills(text, jobSkills);

    // Estimate years of experience
    const experienceYears = extractExperience(text);

    // Extract work experience
    const workExperience = extractWorkExperience(text);

    // Extract projects
    const projects = extractProjects(text);

    // Extract portfolio/website URLs
    const portfolioUrls = extractPortfolioURLs(text);

    return {
        fullText,
        name,
        email,
        phone,
        location,
        skills,
        experienceYears,
        workExperience,
        projects,
        portfolioUrls
    };
}

/**
 * Extract candidate name from CV text
 * Usually the first line or first substantial line
 */
function extractName(lines: string[]): string | undefined {
    if (lines.length === 0) return undefined;

    // Try first line if it looks like a name (2-4 words, no special chars at start)
    const firstLine = lines[0].trim();
    const wordCount = firstLine.split(/\s+/).length;
    
    // Check if first line looks like a name (2-4 words, mostly letters)
    if (wordCount >= 2 && wordCount <= 4) {
        const nameRegex = /^[A-Za-z\s'-]+$/;
        if (nameRegex.test(firstLine) && !firstLine.toLowerCase().includes('email') && 
            !firstLine.toLowerCase().includes('phone') && !firstLine.toLowerCase().includes('@')) {
            return firstLine;
        }
    }

    // Try second line if first line seems like header
    if (lines.length > 1) {
        const secondLine = lines[1].trim();
        const wordCount2 = secondLine.split(/\s+/).length;
        if (wordCount2 >= 2 && wordCount2 <= 4) {
            const nameRegex = /^[A-Za-z\s'-]+$/;
            if (nameRegex.test(secondLine)) {
                return secondLine;
            }
        }
    }

    return undefined;
}

/**
 * Extract location from CV text
 * Looks for common location patterns near contact information
 */
function extractLocation(text: string, lines: string[]): string | undefined {
    // Common location keywords
    const locationKeywords = ['location', 'address', 'city', 'based in', 'located in', 'residence', 'residing'];
    
    // Look for location on lines near contact info (usually first few lines)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();
        
        // Check if line contains location keyword
        for (const keyword of locationKeywords) {
            if (lowerLine.includes(keyword)) {
                // Extract text after keyword (e.g., "Location: New York, NY")
                const parts = line.split(/[:\-–]/);
                if (parts.length > 1) {
                    const location = parts.slice(1).join(' ').trim();
                    if (location.length > 0 && location.length < 100) {
                        return location;
                    }
                }
            }
        }
    }
    
    // Pattern 1: Look for city, state/country patterns (e.g., "New York, NY", "London, UK")
    const cityStatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2,}|\b(?:United States|USA|UK|United Kingdom|Canada|Australia|Germany|France|Spain|Italy|Netherlands|Sweden|Norway|Denmark|Finland|Poland|India|China|Japan|Singapore|Brazil|Mexico)\b)/gi;
    const cityMatches = text.match(cityStatePattern);
    if (cityMatches && cityMatches.length > 0) {
        // Return first match (most likely the candidate's location)
        return cityMatches[0].trim();
    }
    
    // Pattern 2: Look for standalone city names near the top of the CV
    const majorCities = [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
        'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington',
        'Boston', 'El Paso', 'Detroit', 'Nashville', 'Portland', 'Oklahoma City', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore',
        'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs',
        'Raleigh', 'Miami', 'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tulsa', 'Arlington', 'Tampa', 'New Orleans',
        'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast',
        'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
        'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig',
        'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener',
        'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong',
        'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kawasaki', 'Kyoto', 'Saitama',
        'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'
    ];
    
    // Check first 10 lines for city names
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        for (const city of majorCities) {
            if (line.includes(city)) {
                // Extract city and surrounding context (city, state/country)
                const cityIndex = line.indexOf(city);
                const context = line.substring(Math.max(0, cityIndex - 30), cityIndex + city.length + 30).trim();
                // Try to extract full location (city, state)
                const locationMatch = context.match(new RegExp(`([^,]{0,30},?\\s*)?${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,?\\s*[A-Z]{2,})?`, 'i'));
                if (locationMatch) {
                    return locationMatch[0].trim();
                }
                return city;
            }
        }
    }
    
    return undefined;
}

/**
 * Extract skills from CV text
 * Matches against job skills if provided, otherwise extracts common tech skills
 */
function extractSkills(text: string, jobSkills?: string[]): string[] {
    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();

    // If job skills provided, check for matches
    if (jobSkills && jobSkills.length > 0) {
        for (const skill of jobSkills) {
            const skillLower = skill.toLowerCase();
            // Check for skill mentioned in text (word boundary aware)
            const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(text)) {
                foundSkills.push(skill);
            }
        }
    }

    // Also extract common tech skills if not found in job skills
    const commonSkills = [
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust',
        'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
        'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
        'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'gitlab',
        'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
        'agile', 'scrum', 'jira', 'confluence', 'ci/cd', 'devops'
    ];

    for (const skill of commonSkills) {
        if (!foundSkills.includes(skill) && lowerText.includes(skill)) {
            foundSkills.push(skill);
        }
    }

    return foundSkills;
}

/**
 * Extract years of experience from CV text
 * Looks for patterns like "5 years", "5+ years", "3-5 years", etc.
 */
function extractExperience(text: string): number | undefined {
    // Pattern 1: "X years of experience" or "X+ years"
    const pattern1 = /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i;
    const match1 = text.match(pattern1);
    if (match1) {
        return parseInt(match1[1], 10);
    }

    // Pattern 2: "X-Y years"
    const pattern2 = /(\d+)[-–]\s*(\d+)\s*years/i;
    const match2 = text.match(pattern2);
    if (match2) {
        // Take average or max
        const min = parseInt(match2[1], 10);
        const max = parseInt(match2[2], 10);
        return Math.round((min + max) / 2);
    }

    // Pattern 3: Job dates (estimate from date ranges)
    const datePattern = /(\d{4})\s*[-–]\s*(\d{4}|present|current)/gi;
    const dateMatches = [...text.matchAll(datePattern)];
    if (dateMatches.length > 0) {
        const years: number[] = [];
        const currentYear = new Date().getFullYear();
        
        for (const match of dateMatches) {
            const startYear = parseInt(match[1], 10);
            const endYear = match[2].toLowerCase().includes('present') || match[2].toLowerCase().includes('current')
                ? currentYear
                : parseInt(match[2], 10);
            years.push(endYear - startYear);
        }

        if (years.length > 0) {
            // Sum all years (might overlap, but gives rough estimate)
            return years.reduce((sum, y) => sum + y, 0);
        }
    }

    return undefined;
}

/**
 * Calculate basic match score based on skills overlap
 * Returns both the score and the count of matching skills for display
 */
export function calculateBasicMatchScore(candidateSkills: string[], jobSkills: string[]): { score: number; matchingCount: number } {
    if (!jobSkills || jobSkills.length === 0) {
        return { score: 50, matchingCount: 0 }; // Default score if no job skills specified
    }

    if (candidateSkills.length === 0) {
        return { score: 0, matchingCount: 0 };
    }

    // Count matching skills (only skills that match job requirements)
    const matchingSkills = candidateSkills.filter(skill =>
        jobSkills.some(jobSkill => 
            skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
            jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );

    const matchingCount = matchingSkills.length;

    // Strict but fair scoring: Candidates must meet minimum threshold
    // Require at least 40% of job skills to match for passing score (bare minimum)
    // Scoring is strict: you need significant overlap to qualify
    const matchPercentage = (matchingCount / jobSkills.length) * 100;
    
    let score: number;
    if (matchPercentage >= 80) {
        // Excellent match (80-100% of job skills) = 85-100 score
        score = 85 + Math.round((matchPercentage - 80) / 20 * 15); // 85-100
    } else if (matchPercentage >= 60) {
        // Good match (60-79% of job skills) = 70-84 score
        score = 70 + Math.round((matchPercentage - 60) / 20 * 14); // 70-84
    } else if (matchPercentage >= 40) {
        // Minimum acceptable (40-59% of job skills) = 50-69 score
        score = 50 + Math.round((matchPercentage - 40) / 20 * 19); // 50-69
    } else {
        // Below minimum threshold (< 40% of job skills) = 0-49 score
        score = Math.round(matchPercentage * 1.2); // 0-47 max
    }
    
    // Ensure score is between 0-100
    score = Math.min(100, Math.max(0, score));
    
    return { score: Math.round(score), matchingCount };
}

/**
 * Extract work experience from CV text
 * Looks for patterns like "Software Engineer | Company Name | 2020 - 2023"
 */
function extractWorkExperience(text: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Common section headers for experience
    const experienceHeaders = ['experience', 'work experience', 'employment', 'employment history', 
                               'professional experience', 'career history', 'work history'];
    
    let inExperienceSection = false;
    let currentExperience: Partial<WorkExperience> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Check if we're entering experience section
        if (experienceHeaders.some(header => lowerLine.includes(header))) {
            inExperienceSection = true;
            continue;
        }
        
        // Check if we're leaving experience section (hit education, skills, etc.)
        if (inExperienceSection && (
            lowerLine.includes('education') || 
            lowerLine.includes('skills') || 
            lowerLine.includes('certification') ||
            lowerLine.includes('projects')
        )) {
            if (currentExperience && currentExperience.role && currentExperience.company) {
                experiences.push(currentExperience as WorkExperience);
            }
            break;
        }
        
        if (!inExperienceSection) continue;
        
        // Pattern 1: Role | Company | Date Range (e.g., "Software Engineer | Google | 2020 - Present")
        const pipePattern = /^([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/;
        const pipeMatch = line.match(pipePattern);
        if (pipeMatch) {
            if (currentExperience && currentExperience.role && currentExperience.company) {
                experiences.push(currentExperience as WorkExperience);
            }
            const [, role, company, period] = pipeMatch;
            currentExperience = {
                role: role.trim(),
                company: company.trim(),
                period: period.trim(),
                description: ''
            };
            continue;
        }
        
        // Pattern 2: Role at Company (e.g., "Senior Developer at Microsoft")
        const atPattern = /^(.+?)\s+(?:at|@)\s+(.+)$/i;
        const atMatch = line.match(atPattern);
        if (atMatch && !currentExperience) {
            const [, role, company] = atMatch;
            currentExperience = {
                role: role.trim(),
                company: company.trim(),
                period: '',
                description: ''
            };
            continue;
        }
        
        // Pattern 3: Date range (e.g., "2020 - Present", "Jan 2020 - Dec 2022")
        const dateRangePattern = /(\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*((?:\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})|Present|Current)/i;
        const dateMatch = line.match(dateRangePattern);
        if (dateMatch && currentExperience) {
            currentExperience.period = line.trim();
            currentExperience.startDate = dateMatch[1];
            currentExperience.endDate = dateMatch[2];
            continue;
        }
        
        // Pattern 4: Role on first line, Company on second, Dates on third
        if (currentExperience && !currentExperience.company && line.length > 0 && line.length < 100) {
            // If we have role but no company, this might be the company
            if (!line.match(dateRangePattern) && !line.match(/^[•\-\*]/)) {
                currentExperience.company = line;
                continue;
            }
        }
        
        // Collect description lines (bullet points or paragraphs)
        if (currentExperience && (
            line.startsWith('•') || 
            line.startsWith('-') || 
            line.startsWith('*') ||
            (line.length > 20 && line.length < 200 && !line.match(dateRangePattern))
        )) {
            const descLine = line.replace(/^[•\-\*]\s*/, '').trim();
            if (descLine.length > 0) {
                currentExperience.description = (currentExperience.description || '') + 
                    (currentExperience.description ? ' ' : '') + descLine;
            }
        }
        
        // If line looks like a new role/company (capitalized, not a date, not a bullet)
        if (currentExperience && currentExperience.role && currentExperience.company && 
            !line.match(dateRangePattern) && !line.match(/^[•\-\*]/) &&
            line.split(' ').length <= 5 && /^[A-Z]/.test(line)) {
            // Save current and start new
            experiences.push(currentExperience as WorkExperience);
            currentExperience = {
                role: line,
                company: '',
                period: '',
                description: ''
            };
        }
    }
    
    // Add last experience if exists
    if (currentExperience && currentExperience.role && currentExperience.company) {
        experiences.push(currentExperience as WorkExperience);
    }
    
    // Limit to most recent 5 experiences
    return experiences.slice(0, 5);
}

/**
 * Extract projects from CV text
 * Looks for projects section and extracts project names, descriptions, URLs
 */
function extractProjects(text: string): Project[] {
    const projects: Project[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const projectHeaders = ['projects', 'project', 'portfolio', 'key projects', 'selected projects'];
    let inProjectsSection = false;
    let currentProject: Partial<Project> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Check if entering projects section
        if (projectHeaders.some(header => lowerLine.includes(header))) {
            inProjectsSection = true;
            continue;
        }
        
        // Check if leaving projects section
        if (inProjectsSection && (
            lowerLine.includes('experience') ||
            lowerLine.includes('education') ||
            lowerLine.includes('skills')
        )) {
            if (currentProject && currentProject.name) {
                projects.push(currentProject as Project);
            }
            break;
        }
        
        if (!inProjectsSection) continue;
        
        // Extract URLs (GitHub, portfolio links)
        const urlPattern = /(https?:\/\/[^\s]+|(?:github|gitlab|behance|dribbble|portfolio)\.com\/[^\s]+)/gi;
        const urlMatch = line.match(urlPattern);
        if (urlMatch) {
            if (currentProject) {
                currentProject.url = urlMatch[0];
            }
        }
        
        // Project name (usually a line that's not a bullet, capitalized, short)
        if (!currentProject && line.length > 3 && line.length < 80 && /^[A-Z]/.test(line) && 
            !line.match(/^[•\-\*]/) && !line.match(/^\d/)) {
            currentProject = { name: line, description: '', technologies: [] };
            continue;
        }
        
        // Project description (bullet points or paragraphs)
        if (currentProject && (
            line.startsWith('•') || 
            line.startsWith('-') || 
            line.startsWith('*') ||
            (line.length > 20 && line.length < 300)
        )) {
            const descLine = line.replace(/^[•\-\*]\s*/, '').trim();
            if (descLine.length > 0) {
                currentProject.description = (currentProject.description || '') + 
                    (currentProject.description ? ' ' : '') + descLine;
            }
        }
        
        // Technologies used (common tech keywords)
        if (currentProject) {
            const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 
                                 'TypeScript', 'Django', 'Flask', 'Express', 'MongoDB', 'PostgreSQL',
                                 'MySQL', 'AWS', 'Docker', 'Kubernetes', 'Git'];
            const mentionedTechs = techKeywords.filter(tech => 
                new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)
            );
            if (mentionedTechs.length > 0) {
                currentProject.technologies = [
                    ...(currentProject.technologies || []),
                    ...mentionedTechs
                ].filter((v, i, a) => a.indexOf(v) === i); // Unique
            }
        }
    }
    
    if (currentProject && currentProject.name) {
        projects.push(currentProject as Project);
    }
    
    return projects.slice(0, 10); // Limit to 10 projects
}

/**
 * Extract portfolio and social URLs from CV text
 * Looks for GitHub, LinkedIn, portfolio websites, etc.
 */
function extractPortfolioURLs(text: string): PortfolioURLs {
    const urls: PortfolioURLs = {};
    
    // URL patterns for different platforms
    const patterns: { [key: string]: RegExp } = {
        github: /(?:github\.com\/[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9-]+)/gi,
        linkedin: /(?:linkedin\.com\/in\/[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+)/gi,
        portfolio: /(?:portfolio|website|personal site)[:\s]+(https?:\/\/[^\s]+)/gi,
        dribbble: /(?:dribbble\.com\/[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?dribbble\.com\/[a-zA-Z0-9-]+)/gi,
        behance: /(?:behance\.net\/[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?behance\.net\/[a-zA-Z0-9-]+)/gi,
        stackoverflow: /(?:stackoverflow\.com\/users\/\d+\/[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?stackoverflow\.com\/users\/\d+\/[a-zA-Z0-9-]+)/gi,
        medium: /(?:medium\.com\/@[a-zA-Z0-9-]+|https?:\/\/(?:www\.)?medium\.com\/@[a-zA-Z0-9-]+)/gi,
        website: /(?:website|portfolio)[:\s]+(https?:\/\/[^\s]+)/gi
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            let url = matches[0];
            // Ensure URL has protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            // Normalize key
            const normalizedKey = key === 'website' ? 'portfolio' : key;
            urls[normalizedKey] = url;
        }
    }
    
    // Also look for general website URLs in contact section
    const generalUrlPattern = /https?:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
    const generalUrls = text.match(generalUrlPattern);
    if (generalUrls && !urls.portfolio) {
        // Filter out email domains and common non-portfolio sites
        const portfolioUrls = generalUrls.filter(url => 
            !url.includes('@') && 
            !url.includes('mailto:') &&
            !url.match(/(?:gmail|yahoo|outlook|hotmail)\.com/) &&
            !url.match(/(?:facebook|twitter|x\.com|instagram)\.com/)
        );
        if (portfolioUrls.length > 0) {
            urls.website = portfolioUrls[0];
        }
    }
    
    return urls;
}

