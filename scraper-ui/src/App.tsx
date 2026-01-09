import { useState, useEffect } from 'react';
import JobList from './components/JobList';
import ScrapingControls from './components/ScrapingControls';
import CandidatesView from './components/CandidatesView';
import ProviderStatus from './components/ProviderStatus';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  applicantsCount: number;
}

function App() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            CoreFlow Scraper Testing
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Test and monitor candidate scraping operations
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProviderStatus />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1">
            <JobList
              jobs={jobs}
              loading={loading}
              selectedJob={selectedJob}
              onSelectJob={setSelectedJob}
              onRefresh={fetchJobs}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedJob ? (
              <>
                <ScrapingControls
                  job={selectedJob}
                  onScrapingComplete={fetchJobs}
                />
                <CandidatesView jobId={selectedJob.id} />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select a job to start scraping
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

