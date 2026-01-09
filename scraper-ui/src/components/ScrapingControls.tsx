import { useState, useEffect } from 'react';

interface Job {
  id: string;
  title: string;
}

interface ScrapingStatus {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: any[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface ScrapingControlsProps {
  job: Job;
  onScrapingComplete: () => void;
}

export default function ScrapingControls({
  job,
  onScrapingComplete
}: ScrapingControlsProps) {
  const [sources, setSources] = useState<string[]>(['linkedin']);
  const [maxCandidates, setMaxCandidates] = useState(50);
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [scraping, setScraping] = useState(false);
  const [status, setStatus] = useState<ScrapingStatus | null>(null);

  useEffect(() => {
    if (scraping) {
      const interval = setInterval(() => {
        fetchStatus();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [scraping, job.id]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/scrape/status`);
      const data = await response.json();
      if (data.success) {
        setStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setScraping(false);
          onScrapingComplete();
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleStartScraping = async () => {
    setScraping(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sources,
          maxCandidates,
          minMatchScore
        })
      });

      const data = await response.json();
      if (data.success) {
        // Start polling for status
        setTimeout(fetchStatus, 1000);
      } else {
        alert(`Error: ${data.error}`);
        setScraping(false);
      }
    } catch (error: any) {
      alert(`Error starting scraping: ${error.message}`);
      setScraping(false);
    }
  };

  const toggleSource = (source: string) => {
    setSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Scraping Controls
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sources
            </label>
            <div className="flex gap-3">
              {['linkedin', 'github', 'jobboard'].map(source => (
                <label key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sources.includes(source)}
                    onChange={() => toggleSource(source)}
                    disabled={scraping}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {source}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Candidates
              </label>
              <input
                type="number"
                value={maxCandidates}
                onChange={e => setMaxCandidates(parseInt(e.target.value, 10))}
                disabled={scraping}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Match Score
              </label>
              <input
                type="number"
                value={minMatchScore}
                onChange={e => setMinMatchScore(parseInt(e.target.value, 10))}
                disabled={scraping}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
          </div>

          <button
            onClick={handleStartScraping}
            disabled={scraping || sources.length === 0}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {scraping ? 'Scraping...' : 'Start Scraping'}
          </button>

          {status && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Status: {status.status}
                </span>
                {status.status === 'running' && (
                  <span className="text-sm text-gray-600">
                    {status.progress}%
                  </span>
                )}
              </div>

              {status.status === 'running' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              )}

              {status.status === 'completed' && status.results && (
                <div className="mt-3 space-y-2">
                  {status.results.map((result: any, idx: number) => (
                    <div
                      key={idx}
                      className={`text-sm p-2 rounded ${
                        result.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <div className="font-medium capitalize">{result.source}</div>
                      <div>
                        Found: {result.candidatesFound} • Saved:{' '}
                        {result.candidatesSaved}
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="text-xs mt-1">
                          Errors: {result.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {status.status === 'failed' && status.error && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                  Error: {status.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

