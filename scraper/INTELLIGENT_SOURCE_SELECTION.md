# Intelligent Source Selection for Candidate Sourcing

## Overview

The scraper now intelligently analyzes each job to determine the best sources for candidate sourcing and distributes candidates equally across selected sources. This ensures optimal resource usage and better candidate coverage.

## How It Works

### 1. Job Analysis

The system analyzes each job based on:
- **Job Title**: Keywords like "Developer", "Engineer", "Manager", "HR Specialist"
- **Department**: Engineering, IT, Marketing, HR, Sales, etc.
- **Skills**: Programming languages, technologies, tools
- **Description**: Full job description text

### 2. Job Classification

Jobs are classified as either **Technical** or **Non-Technical**:

**Technical Jobs:**
- Software Developer, Engineer, Programmer
- Data Scientist, ML Engineer, DevOps
- Any role requiring programming/coding skills
- Department: Engineering, IT, Technology

**Non-Technical Jobs:**
- HR, Marketing, Sales, Operations
- Finance, Legal, Healthcare, Education
- Design, Customer Service, Administrative
- Any role not requiring technical/coding skills

### 3. Source Priority by Job Type

#### Technical Jobs
Priority order:
1. **GitHub** (Priority 3) - Best for technical roles, shows actual code and contributions
2. **LinkedIn** (Priority 2) - Professional profiles and work history for tech candidates
3. **Job Boards** (Priority 1) - Active technical job seekers

#### Non-Technical Jobs
Priority order:
1. **LinkedIn** (Priority 3) - Best for non-technical roles, covers all industries
2. **Job Boards** (Priority 2) - Active job seekers in non-technical fields
3. **GitHub** - Skipped (not relevant for non-technical roles)

### 4. Equal Distribution

When multiple sources are selected, candidates are distributed **equally** across them:

**Example 1: Technical Job (60 candidates requested)**
- GitHub: 30 candidates
- LinkedIn: 30 candidates
- Total: 60 candidates

**Example 2: Non-Technical Job (50 candidates requested)**
- LinkedIn: 25 candidates
- Job Boards: 25 candidates
- GitHub: 0 (skipped)
- Total: 50 candidates

**Example 3: Technical Job (50 candidates, 3 sources)**
- GitHub: 17 candidates (16 + 1 remainder)
- LinkedIn: 17 candidates
- Job Boards: 16 candidates
- Total: 50 candidates

## Configuration

### Manual Override

You can still manually specify sources via `ScrapeOptions`:

```typescript
const options: ScrapeOptions = {
  sources: ['linkedin', 'github'], // Only use these sources
  maxCandidates: 100
};
```

If sources are manually specified, the system will:
- Still respect the job classification (e.g., skip GitHub for non-technical jobs)
- Distribute candidates equally across the specified sources

### Default Behavior

If no sources are specified, the system will:
- Auto-detect best sources based on job analysis
- Use all available sources that make sense for the job type
- Distribute candidates equally

## Examples

### Example 1: Frontend Developer (Technical)

```typescript
Job: {
  title: "Senior Frontend Developer",
  department: "Engineering",
  skills: ["React", "TypeScript", "JavaScript"]
}
```

**Analysis:**
- ✅ Technical job (title + department + skills)
- Recommended sources: GitHub, LinkedIn, Job Boards
- Distribution: 17 GitHub, 17 LinkedIn, 16 Job Boards (50 total)

### Example 2: HR Specialist (Non-Technical)

```typescript
Job: {
  title: "HR Specialist",
  department: "Human Resources",
  skills: ["Recruitment", "Employee Relations"]
}
```

**Analysis:**
- ❌ Non-technical job
- Recommended sources: LinkedIn, Job Boards (GitHub skipped)
- Distribution: 25 LinkedIn, 25 Job Boards (50 total)

### Example 3: Marketing Manager (Non-Technical)

```typescript
Job: {
  title: "Marketing Manager",
  department: "Marketing",
  skills: ["SEO", "Content Marketing", "Analytics"]
}
```

**Analysis:**
- ❌ Non-technical job (despite "Analytics" - context matters)
- Recommended sources: LinkedIn, Job Boards
- Distribution: 25 LinkedIn, 25 Job Boards (50 total)

## Logging

The system provides detailed logging:

```
[INFO] Analyzing job: "Senior Frontend Developer" (Engineering) - Technical: true
[INFO] Job classification: Technical
[INFO] Recommended sources: github (17 candidates, priority: 3), linkedin (17 candidates, priority: 2), jobboard (16 candidates, priority: 1)
[INFO] Scraping from GITHUB: 17 candidates requested. Reason: GitHub is best for technical roles - shows actual code and contributions
[INFO] Scraping from LINKEDIN: 17 candidates requested. Reason: LinkedIn provides professional profiles and work history for tech candidates
[INFO] Scraping from JOBBOARD: 16 candidates requested. Reason: Job boards catch active technical job seekers
```

## Benefits

1. **Cost Optimization**: Only use relevant sources (e.g., skip GitHub for non-technical jobs)
2. **Better Coverage**: Distribute candidates across multiple sources for better diversity
3. **Intelligent Selection**: Automatically determine best sources based on job requirements
4. **Flexible**: Manual override still available when needed
5. **Transparent**: Detailed logging shows decision-making process

## Implementation Files

- `scraper/src/utils/jobAnalyzer.ts` - Job analysis and source recommendation logic
- `scraper/src/services/ScrapingService.ts` - Main scraping orchestration with intelligent source selection



## Overview

The scraper now intelligently analyzes each job to determine the best sources for candidate sourcing and distributes candidates equally across selected sources. This ensures optimal resource usage and better candidate coverage.

## How It Works

### 1. Job Analysis

The system analyzes each job based on:
- **Job Title**: Keywords like "Developer", "Engineer", "Manager", "HR Specialist"
- **Department**: Engineering, IT, Marketing, HR, Sales, etc.
- **Skills**: Programming languages, technologies, tools
- **Description**: Full job description text

### 2. Job Classification

Jobs are classified as either **Technical** or **Non-Technical**:

**Technical Jobs:**
- Software Developer, Engineer, Programmer
- Data Scientist, ML Engineer, DevOps
- Any role requiring programming/coding skills
- Department: Engineering, IT, Technology

**Non-Technical Jobs:**
- HR, Marketing, Sales, Operations
- Finance, Legal, Healthcare, Education
- Design, Customer Service, Administrative
- Any role not requiring technical/coding skills

### 3. Source Priority by Job Type

#### Technical Jobs
Priority order:
1. **GitHub** (Priority 3) - Best for technical roles, shows actual code and contributions
2. **LinkedIn** (Priority 2) - Professional profiles and work history for tech candidates
3. **Job Boards** (Priority 1) - Active technical job seekers

#### Non-Technical Jobs
Priority order:
1. **LinkedIn** (Priority 3) - Best for non-technical roles, covers all industries
2. **Job Boards** (Priority 2) - Active job seekers in non-technical fields
3. **GitHub** - Skipped (not relevant for non-technical roles)

### 4. Equal Distribution

When multiple sources are selected, candidates are distributed **equally** across them:

**Example 1: Technical Job (60 candidates requested)**
- GitHub: 30 candidates
- LinkedIn: 30 candidates
- Total: 60 candidates

**Example 2: Non-Technical Job (50 candidates requested)**
- LinkedIn: 25 candidates
- Job Boards: 25 candidates
- GitHub: 0 (skipped)
- Total: 50 candidates

**Example 3: Technical Job (50 candidates, 3 sources)**
- GitHub: 17 candidates (16 + 1 remainder)
- LinkedIn: 17 candidates
- Job Boards: 16 candidates
- Total: 50 candidates

## Configuration

### Manual Override

You can still manually specify sources via `ScrapeOptions`:

```typescript
const options: ScrapeOptions = {
  sources: ['linkedin', 'github'], // Only use these sources
  maxCandidates: 100
};
```

If sources are manually specified, the system will:
- Still respect the job classification (e.g., skip GitHub for non-technical jobs)
- Distribute candidates equally across the specified sources

### Default Behavior

If no sources are specified, the system will:
- Auto-detect best sources based on job analysis
- Use all available sources that make sense for the job type
- Distribute candidates equally

## Examples

### Example 1: Frontend Developer (Technical)

```typescript
Job: {
  title: "Senior Frontend Developer",
  department: "Engineering",
  skills: ["React", "TypeScript", "JavaScript"]
}
```

**Analysis:**
- ✅ Technical job (title + department + skills)
- Recommended sources: GitHub, LinkedIn, Job Boards
- Distribution: 17 GitHub, 17 LinkedIn, 16 Job Boards (50 total)

### Example 2: HR Specialist (Non-Technical)

```typescript
Job: {
  title: "HR Specialist",
  department: "Human Resources",
  skills: ["Recruitment", "Employee Relations"]
}
```

**Analysis:**
- ❌ Non-technical job
- Recommended sources: LinkedIn, Job Boards (GitHub skipped)
- Distribution: 25 LinkedIn, 25 Job Boards (50 total)

### Example 3: Marketing Manager (Non-Technical)

```typescript
Job: {
  title: "Marketing Manager",
  department: "Marketing",
  skills: ["SEO", "Content Marketing", "Analytics"]
}
```

**Analysis:**
- ❌ Non-technical job (despite "Analytics" - context matters)
- Recommended sources: LinkedIn, Job Boards
- Distribution: 25 LinkedIn, 25 Job Boards (50 total)

## Logging

The system provides detailed logging:

```
[INFO] Analyzing job: "Senior Frontend Developer" (Engineering) - Technical: true
[INFO] Job classification: Technical
[INFO] Recommended sources: github (17 candidates, priority: 3), linkedin (17 candidates, priority: 2), jobboard (16 candidates, priority: 1)
[INFO] Scraping from GITHUB: 17 candidates requested. Reason: GitHub is best for technical roles - shows actual code and contributions
[INFO] Scraping from LINKEDIN: 17 candidates requested. Reason: LinkedIn provides professional profiles and work history for tech candidates
[INFO] Scraping from JOBBOARD: 16 candidates requested. Reason: Job boards catch active technical job seekers
```

## Benefits

1. **Cost Optimization**: Only use relevant sources (e.g., skip GitHub for non-technical jobs)
2. **Better Coverage**: Distribute candidates across multiple sources for better diversity
3. **Intelligent Selection**: Automatically determine best sources based on job requirements
4. **Flexible**: Manual override still available when needed
5. **Transparent**: Detailed logging shows decision-making process

## Implementation Files

- `scraper/src/utils/jobAnalyzer.ts` - Job analysis and source recommendation logic
- `scraper/src/services/ScrapingService.ts` - Main scraping orchestration with intelligent source selection

