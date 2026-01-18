import { Job } from '../App'

interface JobListProps {
  jobs: Job[]
  selectedJob: Job | null
  onSelectJob: (job: Job) => void
  onRefresh: () => void
  loading: boolean
}

export default function JobList({ jobs, selectedJob, onSelectJob, onRefresh, loading }: JobListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No active jobs found
          </div>
        ) : (
          jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                selectedJob?.id === job.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{job.title}</div>
              {job.company && (
                <div className="text-sm text-gray-600">{job.company}</div>
              )}
              {job.location && (
                <div className="text-xs text-gray-500 mt-1">{job.location}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
