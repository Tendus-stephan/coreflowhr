import { useState } from 'react'
import { Job } from '../App'

interface ScrapingControlsProps {
  job: Job
  onScrape: (options: { sources: string[]; maxCandidates: number }) => void
  scraping: boolean
}

export default function ScrapingControls({ job, onScrape, scraping }: ScrapingControlsProps) {
  const [sources, setSources] = useState<string[]>(['linkedin'])
  const [maxCandidates, setMaxCandidates] = useState(50)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onScrape({ sources, maxCandidates })
  }

  const toggleSource = (source: string) => {
    if (sources.includes(source)) {
      setSources(sources.filter(s => s !== source))
    } else {
      setSources([...sources, source])
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Scraping Controls</h2>
        <p className="text-sm text-gray-600 mt-1">{job.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Sources */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sources
          </label>
          <div className="space-y-2">
            {['linkedin', 'github', 'mightyrecruiter', 'jobspider'].map((source) => (
              <label key={source} className="flex items-center">
                <input
                  type="checkbox"
                  checked={sources.includes(source)}
                  onChange={() => toggleSource(source)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{source}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Max Candidates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Candidates
          </label>
          <input
            type="number"
            value={maxCandidates}
            onChange={(e) => setMaxCandidates(parseInt(e.target.value) || 50)}
            min={1}
            max={200}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Between 1 and 200</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={scraping || sources.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {scraping ? 'Scraping...' : 'Start Scraping'}
        </button>
      </form>
    </div>
  )
}
