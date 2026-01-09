import { useState } from 'react';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  applicantsCount: number;
}

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  selectedJob: Job | null;
  onSelectJob: (job: Job) => void;
  onRefresh: () => void;
}

export default function JobList({
  jobs,
  loading,
  selectedJob,
  onSelectJob,
  onRefresh
}: JobListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="divide-y">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No active jobs found
          </div>
        ) : (
          jobs.map(job => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job)}
              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                selectedJob?.id === job.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{job.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                {job.department} • {job.location}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {job.applicantsCount} applicants
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

