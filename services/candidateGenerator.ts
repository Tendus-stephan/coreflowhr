import { Job } from '../types';

// Common first and last names for realistic candidate generation
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley',
  'Andrew', 'Kimberly', 'Paul', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Dorothy', 'Edward', 'Melissa',
  'Ronald', 'Deborah', 'Timothy', 'Stephanie', 'Jason', 'Rebecca', 'Jeffrey', 'Sharon',
  'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy',
  'Eric', 'Angela', 'Jonathan', 'Shirley', 'Stephen', 'Anna', 'Larry', 'Brenda',
  'Justin', 'Pamela', 'Scott', 'Emma', 'Brandon', 'Nicole', 'Benjamin', 'Helen'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
  'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers'
];

// Common cities for location generation
const CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
  'Nashville, TN', 'El Paso, TX', 'Detroit, MI', 'Oklahoma City, OK', 'Portland, OR',
  'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI',
  'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Mesa, AZ', 'Sacramento, CA',
  'Atlanta, GA', 'Kansas City, MO', 'Colorado Springs, CO', 'Raleigh, NC', 'Omaha, NE',
  'Miami, FL', 'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA', 'Minneapolis, MN'
];

// Common technical and professional skills
const RELATED_SKILLS: { [key: string]: string[] } = {
  'React': ['JavaScript', 'TypeScript', 'Node.js', 'HTML', 'CSS', 'Redux', 'Vue.js', 'Angular'],
  'JavaScript': ['TypeScript', 'Node.js', 'React', 'Vue.js', 'jQuery', 'ES6', 'Express'],
  'Python': ['Django', 'Flask', 'FastAPI', 'NumPy', 'Pandas', 'SQL', 'Machine Learning'],
  'Java': ['Spring Boot', 'Hibernate', 'Maven', 'REST API', 'Microservices', 'SQL'],
  'TypeScript': ['React', 'Node.js', 'Angular', 'JavaScript', 'Express', 'TypeScript'],
  'Node.js': ['Express', 'MongoDB', 'PostgreSQL', 'REST API', 'GraphQL', 'JavaScript'],
  'SQL': ['PostgreSQL', 'MySQL', 'MongoDB', 'Database Design', 'Query Optimization'],
  'HTML': ['CSS', 'JavaScript', 'React', 'Responsive Design', 'Web Development'],
  'CSS': ['HTML', 'JavaScript', 'SASS', 'Bootstrap', 'Tailwind CSS', 'Responsive Design']
};

// Extended skills dictionary for description parsing
const SKILL_KEYWORDS: { [key: string]: string[] } = {
  // Frontend
  'react': ['React', 'JavaScript', 'TypeScript', 'JSX', 'Redux', 'Context API'],
  'javascript': ['JavaScript', 'ES6', 'TypeScript', 'Node.js'],
  'typescript': ['TypeScript', 'JavaScript', 'React', 'Angular'],
  'angular': ['Angular', 'TypeScript', 'RxJS', 'NgRx'],
  'vue': ['Vue.js', 'Vuex', 'JavaScript'],
  'html': ['HTML5', 'CSS', 'Semantic HTML'],
  'css': ['CSS3', 'SASS', 'SCSS', 'Tailwind', 'Bootstrap'],
  'next.js': ['Next.js', 'React', 'SSR'],
  
  // Backend
  'python': ['Python', 'Django', 'Flask', 'FastAPI', 'NumPy', 'Pandas'],
  'java': ['Java', 'Spring Boot', 'Hibernate', 'Maven', 'Gradle'],
  'node': ['Node.js', 'Express', 'NestJS', 'TypeScript'],
  'php': ['PHP', 'Laravel', 'Symfony'],
  'ruby': ['Ruby', 'Rails', 'RSpec'],
  'go': ['Go', 'Golang', 'Gin'],
  'rust': ['Rust', 'Cargo'],
  
  // Databases
  'sql': ['SQL', 'PostgreSQL', 'MySQL', 'SQL Server'],
  'postgresql': ['PostgreSQL', 'SQL', 'Database Design'],
  'mysql': ['MySQL', 'SQL', 'Database Design'],
  'mongodb': ['MongoDB', 'NoSQL', 'Database Design'],
  'redis': ['Redis', 'Caching', 'NoSQL'],
  
  // Cloud & DevOps
  'aws': ['AWS', 'Cloud Computing', 'S3', 'EC2', 'Lambda'],
  'docker': ['Docker', 'Containerization', 'Kubernetes'],
  'kubernetes': ['Kubernetes', 'Docker', 'Container Orchestration'],
  'azure': ['Azure', 'Cloud Computing'],
  'gcp': ['Google Cloud', 'GCP', 'Cloud Computing'],
  
  // Other
  'git': ['Git', 'Version Control', 'GitHub', 'GitLab'],
  'api': ['REST API', 'GraphQL', 'API Design'],
  'graphql': ['GraphQL', 'API Design'],
  'agile': ['Agile', 'Scrum', 'Kanban'],
  'scrum': ['Scrum', 'Agile', 'Product Management']
};

/**
 * Extract skills and keywords from job description intelligently
 */
function extractSkillsFromDescription(description: string): string[] {
  if (!description || description.trim().length === 0) return [];
  
  const descriptionLower = description.toLowerCase();
  const extractedSkills: Set<string> = new Set();
  
  // Check for explicit skill mentions in SKILL_KEYWORDS dictionary
  Object.keys(SKILL_KEYWORDS).forEach(keyword => {
    // Match whole words to avoid false positives
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (keywordRegex.test(description)) {
      // Add the keyword (capitalized properly)
      const skillName = keyword === 'node' ? 'Node.js' 
                      : keyword === 'css' ? 'CSS'
                      : keyword === 'html' ? 'HTML'
                      : keyword === 'api' ? 'REST API'
                      : keyword === 'sql' ? 'SQL'
                      : keyword.charAt(0).toUpperCase() + keyword.slice(1);
      extractedSkills.add(skillName);
      
      // Add related skills
      SKILL_KEYWORDS[keyword].forEach(skill => {
        if (!extractedSkills.has(skill)) {
          extractedSkills.add(skill);
        }
      });
    }
  });
  
  // Look for common skill patterns in description
  const skillPatterns = [
    /(?:experience|proficient|skilled|knowledge|expertise|familiar).*?(?:with|in|using|in)\s+([A-Z][a-zA-Z0-9\s\.]+?)(?:\.|,|$|\s+and|\)|\s+for)/gi,
    /(?:strong|excellent|solid).*?(?:in|with)\s+([A-Z][a-zA-Z0-9\s\.]+?)(?:\.|,|$|\s+and|\))/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+experience/gi
  ];
  
  skillPatterns.forEach(pattern => {
    try {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let skill = match[1].trim();
          // Clean up skill name
          skill = skill.replace(/^(the|our|we|you|your|a|an)\s+/i, '');
          skill = skill.replace(/\s+(and|or|,).*$/, '');
          
          // Filter out common non-skill words and validate length
          if (skill.length > 1 && skill.length < 30 && 
              !['The', 'This', 'Our', 'We', 'You', 'Your', 'This role', 'This position'].includes(skill)) {
            extractedSkills.add(skill);
          }
        }
      }
    } catch (e) {
      // Ignore regex errors
    }
  });
  
  // Look for technology names (capitalized words that are known technologies)
  const knownTechs = [
    'React', 'Angular', 'Vue', 'Python', 'Java', 'Node.js', 'Node', 'Django', 'Flask', 
    'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes',
    'AWS', 'Azure', 'GCP', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SASS',
    'GraphQL', 'REST', 'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Agile', 'Scrum'
  ];
  
  knownTechs.forEach(tech => {
    const techRegex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (techRegex.test(description)) {
      extractedSkills.add(tech);
    }
  });
  
  // Return unique skills array (limit to reasonable number)
  return Array.from(extractedSkills).slice(0, 15); // Max 15 extracted skills
}

/**
 * Generate resume summary based on job description and requirements
 */
function generateIntelligentResumeSummary(
  jobTitle: string, 
  jobDescription: string,
  skills: string[], 
  experience: number,
  jobSkills: string[]
): string {
  const experienceText = experience >= 5 ? 'extensive' : experience >= 2 ? 'solid' : 'growing';
  const topSkills = skills.slice(0, 3).join(', ');
  
  // Extract key phrases from job description
  const descriptionLower = jobDescription.toLowerCase();
  let relevantContext = '';
  
  if (descriptionLower.includes('team')) {
    relevantContext = 'collaborative team environments';
  } else if (descriptionLower.includes('client')) {
    relevantContext = 'client-facing projects';
  } else if (descriptionLower.includes('startup') || descriptionLower.includes('fast-paced')) {
    relevantContext = 'fast-paced environments';
  } else if (descriptionLower.includes('enterprise')) {
    relevantContext = 'enterprise-level solutions';
  }
  
  // Build summary based on job description content
  let summary = `Experienced professional with ${experienceText} ${experience} years of experience specializing in ${topSkills}. `;
  
  if (jobDescription) {
    // Use job description to create more relevant summary
    const descWords = jobDescription.split(/\s+/).slice(0, 20).join(' '); // First 20 words for context
    summary += `Strong background in ${skills[0] || 'technology'} with proven expertise delivering high-quality solutions`;
    if (relevantContext) {
      summary += ` in ${relevantContext}`;
    }
    summary += '. ';
  }
  
  summary += `Demonstrated ability to leverage ${jobSkills.slice(0, 2).join(' and ') || 'modern technologies'} to solve complex problems and drive innovation. `;
  summary += `Passionate about continuous learning and staying current with industry best practices.`;
  
  return summary;
}

interface GeneratedCandidate {
  name: string;
  email: string;
  role: string;
  location: string;
  experience: number;
  skills: string[];
  resumeSummary: string;
  aiMatchScore: number;
  stage: 'New' | 'Screening';
  isTest: boolean;
}

/**
 * Calculate AI match score based on skill overlap
 */
function calculateMatchScore(candidateSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 75; // Default score if no job skills
  
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase().trim());
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase().trim());
  
  const matchingSkills = candidateSkillsLower.filter(skill => 
    jobSkillsLower.some(jobSkill => 
      skill === jobSkill || 
      skill.includes(jobSkill) || 
      jobSkill.includes(skill)
    )
  );
  
  const matchPercentage = (matchingSkills.length / jobSkills.length) * 100;
  
  // Base score on match percentage, with some variance for realism
  const baseScore = Math.min(95, Math.max(45, matchPercentage));
  const variance = (Math.random() - 0.5) * 10; // ±5 points variance
  
  return Math.round(baseScore + variance);
}

/**
 * Generate a single candidate
 */
export function generateCandidate(job: {
  id: string;
  title: string;
  skills: string[];
  location: string;
  experienceLevel: string;
  company?: string;
  description?: string;
}): GeneratedCandidate {
  // Generate random name
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName}`;
  
  // Generate email
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;
  
  // Generate location (use job location or random city)
  const location = job.location || CITIES[Math.floor(Math.random() * CITIES.length)];
  
  // Generate experience based on job requirements
  let experience = 2;
  if (job.experienceLevel?.includes('Senior') || job.experienceLevel?.includes('5+')) {
    experience = 5 + Math.floor(Math.random() * 5); // 5-10 years
  } else if (job.experienceLevel?.includes('Mid') || job.experienceLevel?.includes('2-5')) {
    experience = 2 + Math.floor(Math.random() * 4); // 2-6 years
  } else {
    experience = Math.floor(Math.random() * 3); // 0-3 years
  }
  
  // Generate skills - mix of job skills and related skills
  const jobSkills = job.skills || [];
  const extractedSkills = job.description ? extractSkillsFromDescription(job.description) : [];
  const allJobSkills = [...new Set([...jobSkills, ...extractedSkills])];
  
  const candidateSkills: string[] = [];
  
  // Add 60-80% of job skills
  const skillsToInclude = Math.floor(allJobSkills.length * (0.6 + Math.random() * 0.2));
  const shuffled = [...allJobSkills].sort(() => Math.random() - 0.5);
  candidateSkills.push(...shuffled.slice(0, skillsToInclude));
  
  // Add some related skills
  candidateSkills.forEach(skill => {
    const related = RELATED_SKILLS[skill];
    if (related) {
      const randomRelated = related[Math.floor(Math.random() * related.length)];
      if (!candidateSkills.includes(randomRelated)) {
        candidateSkills.push(randomRelated);
      }
    }
  });
  
  // Add a few random common skills
  const commonSkills = ['Git', 'Agile', 'Scrum', 'Communication', 'Problem Solving'];
  commonSkills.forEach(skill => {
    if (Math.random() > 0.5 && !candidateSkills.includes(skill)) {
      candidateSkills.push(skill);
    }
  });
  
  // Limit to 8-12 skills
  const finalSkills = candidateSkills.slice(0, 8 + Math.floor(Math.random() * 5));
  
  // NOTE: Match score is NOT calculated for newly sourced candidates
  // Scores are only calculated after CV upload in api.candidates.apply
  // Set to 0 as placeholder - will be null in database
  const aiMatchScore = 0;
  
  // Generate resume summary
  const resumeSummary = generateIntelligentResumeSummary(
    job.title,
    job.description || '',
    finalSkills,
    experience,
    allJobSkills
  );
  
  // All newly sourced candidates go to "New" stage
  // They will receive a screening email and can then upload CV to move to Screening
  const stage = 'New';

  return {
    name,
    email,
    role: job.title,
    location,
    experience,
    skills: finalSkills,
    resumeSummary,
    aiMatchScore,
    stage: stage as 'New' | 'Screening',
    isTest: true
  };
}

/**
 * Generate multiple candidates sequentially with progress callback
 */
export async function generateCandidates(
  job: {
    id: string;
    title: string;
    skills: string[];
    location: string;
    experienceLevel: string;
    company?: string;
    description?: string;
  },
  count: number = 20,
  onProgress?: (current: number, total: number, candidateName: string, candidate: GeneratedCandidate) => void
): Promise<GeneratedCandidate[]> {
  const candidates: GeneratedCandidate[] = [];
  
  for (let i = 0; i < count; i++) {
    const candidate = generateCandidate(job);
    candidates.push(candidate);
    
    if (onProgress) {
      onProgress(i + 1, count, candidate.name, candidate);
    }
    
    // Delay to simulate real sourcing time (0.5 seconds per candidate for realistic progress)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return candidates;
}










