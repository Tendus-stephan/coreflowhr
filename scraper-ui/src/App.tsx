import { useState, useEffect } from 'react'
import JobList from './components/JobList'
import ScrapingControls from './components/ScrapingControls'
import ResultsView from './components/ResultsView'

export interface Job {
  id: string
  title: string
  status: string
  location?: string
  company?: string
  department?: string
}

export interface ScrapeResult {
  source: string
  candidatesFound: number
  candidatesSaved: number
  errors?: string[]
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [results, setResults] = useState<ScrapeResult[] | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs()
  }, [])

  // Fetch candidates when job is selected
  useEffect(() => {
    if (selectedJob) {
      fetchCandidates(selectedJob.id)
    }
  }, [selectedJob])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/candidates`)
      if (!response.ok) throw new Error('Failed to fetch candidates')
      const data = await response.json()
      setCandidates(data)
    } catch (err: any) {
      console.error('Error fetching candidates:', err)
    }
  }

  const handleScrape = async (options: {
    sources: string[]
    maxCandidates: number
  }) => {
    if (!selectedJob) {
      setError('Please select a job first')
      return
    }

    try {
      setScraping(true)
      setError(null)
      setResults(null)

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          ...options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scraping failed')
      }

      const data = await response.json()
      setResults(data.results)
      
      // Refresh candidates after scraping
      await fetchCandidates(selectedJob.id)
    } catch (err: any) {
      setError(err.message)
      console.error('Error scraping:', err)
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Scraper UI</h1>
          <p className="text-sm text-gray-600">Scrape candidates from LinkedIn and other sources</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Job List */}
          <div className="lg:col-span-1">
            <JobList
              jobs={jobs}
              selectedJob={selectedJob}
              onSelectJob={setSelectedJob}
              onRefresh={fetchJobs}
              loading={loading}
            />
          </div>

          {/* Right Column - Controls and Results */}
          <div className="lg:col-span-2 space-y-6">
            {selectedJob && (
              <>
                <ScrapingControls
                  job={selectedJob}
                  onScrape={handleScrape}
                  scraping={scraping}
                />

                <ResultsView
                  results={results}
                  candidates={candidates}
                  onRefresh={() => selectedJob && fetchCandidates(selectedJob.id)}
                />
              </>
            )}

            {!selectedJob && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select a job to start scraping
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
