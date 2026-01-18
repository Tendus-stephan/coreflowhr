interface Candidate {
  id: string
  name: string
  email?: string
  role?: string
  location?: string
  experience?: number
  skills?: string[] | string
  resume_summary?: string
  ai_match_score?: number
  ai_analysis?: string
  profile_url?: string
  portfolio_urls?: {
    linkedin?: string
    github?: string
    website?: string
    twitter?: string
  }
  work_experience?: Array<{
    role: string
    company: string
    duration?: string
    description?: string
  }>
  education?: Array<{
    degree: string
    school: string
    field?: string
    year?: string
  }>
  source?: string
  applied_date?: string
  stage?: string
}

interface CandidateDetailProps {
  candidate: Candidate
}

export default function CandidateDetail({ candidate }: CandidateDetailProps) {
  const skillsArray = Array.isArray(candidate.skills) 
    ? candidate.skills 
    : typeof candidate.skills === 'string' 
      ? JSON.parse(candidate.skills || '[]')
      : [];

  // Parse links from summary text (format: "🔗 Links:\nLinkedIn Profile: https://...\nGitHub: https://...")
  const parseLinksFromSummary = (summary?: string) => {
    if (!summary) return { linkedin: null, github: null, website: null, twitter: null };
    
    const links: { linkedin?: string; github?: string; website?: string; twitter?: string } = {};
    const linksSection = summary.match(/🔗 Links:([\s\S]*?)(?=\n\n|\n🎯|$)/);
    
    if (linksSection) {
      const linkLines = linksSection[1].split('\n').filter(line => line.trim());
      linkLines.forEach(line => {
        if (line.includes('LinkedIn Profile:') || line.includes('LinkedIn:')) {
          const url = line.split(/LinkedIn( Profile)?:/)[1]?.trim();
          if (url) links.linkedin = url;
        } else if (line.includes('GitHub:')) {
          const url = line.split('GitHub:')[1]?.trim();
          if (url) links.github = url;
        } else if (line.includes('Website:')) {
          const url = line.split('Website:')[1]?.trim();
          if (url) links.website = url;
        } else if (line.includes('Twitter:')) {
          const url = line.split('Twitter:')[1]?.trim();
          if (url) links.twitter = url;
        }
      });
    }
    
    // Also check for any URLs directly in summary
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = summary.match(urlRegex) || [];
    urls.forEach(url => {
      if (url.includes('linkedin.com') && !links.linkedin) links.linkedin = url;
      else if (url.includes('github.com') && !links.github) links.github = url;
      else if (url.includes('twitter.com') || url.includes('x.com')) {
        if (!links.twitter) links.twitter = url;
      } else if (!links.website && !url.includes('linkedin.com') && !url.includes('github.com')) {
        links.website = url;
      }
    });
    
    return links;
  };

  // Work experience is stored directly in work_experience field - no need to parse from ai_analysis

  // Parse education from summary or ai_analysis
  const parseEducation = (summary?: string, analysis?: string) => {
    const text = (summary || '') + '\n' + (analysis || '');
    // Look for education patterns in text
    // This is a simple parser - can be enhanced
    return [];
  };

  const links = candidate.portfolio_urls || parseLinksFromSummary(candidate.resume_summary || candidate.ai_analysis);
  // Use work_experience field directly (deduplicated and properly formatted)
  const workExperience = Array.isArray(candidate.work_experience) ? candidate.work_experience : [];
  const education = Array.isArray(candidate.education) ? candidate.education : [];

  // Clean summary to remove links section (we'll show links separately)
  const cleanSummary = candidate.resume_summary?.replace(/🔗 Links:[\s\S]*?(?=\n\n🎯|\n*$)/, '').trim();

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
          {candidate.role && (
            <p className="text-sm text-gray-600">{candidate.role}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {candidate.location && (
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <span className="ml-2 text-gray-600">{candidate.location}</span>
            </div>
          )}
          {candidate.experience !== null && candidate.experience !== undefined && (
            <div>
              <span className="font-medium text-gray-700">Experience:</span>
              <span className="ml-2 text-gray-600">{candidate.experience} years</span>
            </div>
          )}
          {candidate.source && (
            <div>
              <span className="font-medium text-gray-700">Source:</span>
              <span className="ml-2 text-gray-600 capitalize">{candidate.source}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skillsArray.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {skillsArray.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Links */}
        {(links.linkedin || links.github || links.website || links.twitter || candidate.profile_url) && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Links:</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.profile_url && (
                <a
                  href={candidate.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                >
                  🔗 LinkedIn Profile
                </a>
              )}
              {links.linkedin && (
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                >
                  🔗 LinkedIn
                </a>
              )}
              {links.github && (
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                >
                  🔗 GitHub
                </a>
              )}
              {links.website && (
                <a
                  href={links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors inline-flex items-center gap-1"
                >
                  🔗 Website
                </a>
              )}
              {links.twitter && (
                <a
                  href={links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium hover:bg-cyan-100 transition-colors inline-flex items-center gap-1"
                >
                  🔗 Twitter
                </a>
              )}
            </div>
          </div>
        )}

        {/* Resume Summary */}
        {cleanSummary && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Summary:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{cleanSummary}</p>
          </div>
        )}

        {/* AI Analysis */}
        {candidate.ai_analysis && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">AI Analysis:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.ai_analysis}</p>
          </div>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Work Experience:</h4>
            <ul className="space-y-2 text-sm">
              {workExperience.map((exp, index) => (
                <li key={index} className="border-l-2 border-blue-200 pl-3">
                  <div className="font-medium text-gray-900">{exp.role}</div>
                  <div className="text-gray-600">at {exp.company}</div>
                  {exp.duration && (
                    <div className="text-xs text-gray-500">{exp.duration}</div>
                  )}
                  {exp.description && (
                    <div className="text-xs text-gray-600 mt-1">{exp.description}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Education:</h4>
            <ul className="space-y-2 text-sm">
              {education.map((edu, index) => (
                <li key={index} className="border-l-2 border-green-200 pl-3">
                  <div className="font-medium text-gray-900">
                    {edu.degree}
                    {edu.field && <span className="text-gray-600"> - {edu.field}</span>}
                  </div>
                  <div className="text-gray-600">{edu.school}</div>
                  {edu.year && (
                    <div className="text-xs text-gray-500">{edu.year}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
          {candidate.applied_date && (
            <span>Applied: {new Date(candidate.applied_date).toLocaleDateString()}</span>
          )}
          {candidate.stage && (
            <span className="ml-4">Stage: {candidate.stage}</span>
          )}
        </div>
      </div>
    </div>
  )
}

