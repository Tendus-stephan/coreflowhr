import { useState, useEffect } from 'react';

interface Candidate {
  id: string;
  name: string;
  email: string;
  location: string;
  skills: string[];
  ai_match_score: number;
  stage: string;
  created_at: string;
  profile_url?: string;
}

interface CandidatesViewProps {
  jobId: string;
}

export default function CandidatesView({ jobId }: CandidatesViewProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [jobId]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/candidates?limit=50`);
      const data = await response.json();
      if (data.success) {
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCandidates();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Scraped Candidates
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading candidates...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No scraped candidates yet. Start scraping to find candidates.
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map(candidate => (
              <div
                key={candidate.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {candidate.name}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {candidate.ai_match_score}% match
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {candidate.stage}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{candidate.email}</p>
                    {candidate.location && (
                      <p className="text-sm text-gray-500 mt-1">
                        📍 {candidate.location}
                      </p>
                    )}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {candidate.skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{candidate.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                    {candidate.profile_url && (
                      <a
                        href={candidate.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                      >
                        View Profile →
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Scraped: {new Date(candidate.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

