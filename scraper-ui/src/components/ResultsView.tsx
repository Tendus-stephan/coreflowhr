import { ScrapeResult } from '../App'
import CandidateDetail from './CandidateDetail'

interface ResultsViewProps {
  results: ScrapeResult[] | null
  candidates: any[]
  onRefresh: () => void
}

export default function ResultsView({ results, candidates, onRefresh }: ResultsViewProps) {
  return (
    <div className="space-y-6">
      {/* Scraping Results */}
      {results && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Scraping Results</h2>
          </div>
          <div className="p-4 space-y-3">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded p-3">
                <div className="font-medium text-gray-900 capitalize">{result.source}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Found: {result.candidatesFound} | Saved: {result.candidatesSaved}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    Errors: {result.errors.length}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200">
              <div className="font-medium text-gray-900">
                Total Saved: {results.reduce((sum, r) => sum + r.candidatesSaved, 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidates List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Candidates ({candidates.length})</h2>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto p-4 space-y-4">
          {candidates.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No candidates found
            </div>
          ) : (
            candidates.map((candidate) => (
              <CandidateDetail key={candidate.id} candidate={candidate} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

