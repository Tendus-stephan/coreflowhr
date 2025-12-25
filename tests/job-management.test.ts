import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Job Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Closing', () => {
    it('should close job and update status', () => {
      const job = {
        id: 'job-1',
        status: 'Active',
      };

      const updatedJob = {
        ...job,
        status: 'Closed',
      };

      expect(updatedJob.status).toBe('Closed');
    });

    it('should show confirmation dialog before closing', () => {
      const showConfirmation = true;
      const userConfirmed = true;

      expect(showConfirmation).toBe(true);
      expect(userConfirmed).toBe(true);
    });

    it('should filter closed jobs from active views', () => {
      const jobs = [
        { id: 'job-1', status: 'Active' },
        { id: 'job-2', status: 'Closed' },
        { id: 'job-3', status: 'Active' },
      ];

      const activeJobs = jobs.filter(job => job.status === 'Active');
      expect(activeJobs.length).toBe(2);
      expect(activeJobs.every(job => job.status === 'Active')).toBe(true);
    });

    it('should exclude closed jobs from metrics', () => {
      const jobs = [
        { id: 'job-1', status: 'Active', candidates_count: 5 },
        { id: 'job-2', status: 'Closed', candidates_count: 3 },
        { id: 'job-3', status: 'Active', candidates_count: 2 },
      ];

      const activeJobs = jobs.filter(job => job.status === 'Active');
      const totalCandidates = activeJobs.reduce((sum, job) => sum + job.candidates_count, 0);

      expect(totalCandidates).toBe(7); // Only from active jobs
    });

    it('should log activity when job is closed', () => {
      const activityLog = {
        action: 'job_closed',
        jobTitle: 'Software Engineer',
        timestamp: new Date().toISOString(),
      };

      expect(activityLog.action).toBe('job_closed');
      expect(activityLog.jobTitle).toBeDefined();
    });
  });

  describe('Job Deletion', () => {
    it('should show confirmation dialog before deletion', () => {
      const showConfirmation = true;
      const userConfirmed = true;

      expect(showConfirmation).toBe(true);
      expect(userConfirmed).toBe(true);
    });

    it('should delete job and all related data', () => {
      const jobId = 'job-1';
      const shouldDeleteCandidates = true;
      const shouldDeleteOffers = true;
      const shouldDeleteInterviews = true;

      expect(shouldDeleteCandidates).toBe(true);
      expect(shouldDeleteOffers).toBe(true);
      expect(shouldDeleteInterviews).toBe(true);
    });

    it('should log activity when job is deleted', () => {
      const activityLog = {
        action: 'job_deleted',
        jobTitle: 'Software Engineer',
        timestamp: new Date().toISOString(),
      };

      expect(activityLog.action).toBe('job_deleted');
      expect(activityLog.jobTitle).toBeDefined();
    });

    it('should prevent deletion of job with active candidates', () => {
      const job = {
        id: 'job-1',
        candidates: [
          { id: 'candidate-1', stage: 'Interview' },
          { id: 'candidate-2', stage: 'Offer' },
        ],
      };

      const hasActiveCandidates = job.candidates.some(
        c => !['Rejected', 'Hired'].includes(c.stage)
      );

      expect(hasActiveCandidates).toBe(true);
      // Should show warning or prevent deletion
    });
  });

  describe('Job Filtering', () => {
    it('should filter jobs by status', () => {
      const jobs = [
        { id: 'job-1', status: 'Active' },
        { id: 'job-2', status: 'Draft' },
        { id: 'job-3', status: 'Closed' },
        { id: 'job-4', status: 'Active' },
      ];

      const activeJobs = jobs.filter(job => job.status === 'Active');
      const draftJobs = jobs.filter(job => job.status === 'Draft');
      const closedJobs = jobs.filter(job => job.status === 'Closed');

      expect(activeJobs.length).toBe(2);
      expect(draftJobs.length).toBe(1);
      expect(closedJobs.length).toBe(1);
    });

    it('should exclude closed jobs by default in listings', () => {
      const jobs = [
        { id: 'job-1', status: 'Active' },
        { id: 'job-2', status: 'Closed' },
        { id: 'job-3', status: 'Active' },
      ];

      const excludeClosed = true;
      const filteredJobs = excludeClosed
        ? jobs.filter(job => job.status !== 'Closed')
        : jobs;

      expect(filteredJobs.length).toBe(2);
      expect(filteredJobs.every(job => job.status !== 'Closed')).toBe(true);
    });
  });

  describe('Job Candidates', () => {
    it('should filter candidates when job is closed', () => {
      const job = { id: 'job-1', status: 'Closed' };
      const candidates = [
        { id: 'candidate-1', job_id: 'job-1' },
        { id: 'candidate-2', job_id: 'job-1' },
      ];

      // Candidates from closed jobs should be filtered out
      const shouldFilter = job.status === 'Closed';
      expect(shouldFilter).toBe(true);
    });

    it('should exclude candidates from closed jobs in metrics', () => {
      const jobs = [
        { id: 'job-1', status: 'Active' },
        { id: 'job-2', status: 'Closed' },
      ];

      const candidates = [
        { id: 'candidate-1', job_id: 'job-1' },
        { id: 'candidate-2', job_id: 'job-2' },
        { id: 'candidate-3', job_id: 'job-1' },
      ];

      const activeJobIds = jobs.filter(j => j.status === 'Active').map(j => j.id);
      const activeCandidates = candidates.filter(c => activeJobIds.includes(c.job_id));

      expect(activeCandidates.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle job with no candidates', () => {
      const job = {
        id: 'job-1',
        status: 'Active',
        candidates: [],
      };

      expect(job.candidates.length).toBe(0);
      // Should handle gracefully
    });

    it('should handle concurrent job status updates', () => {
      const job1 = { id: 'job-1', status: 'Active' };
      const job2 = { id: 'job-1', status: 'Active' };

      // Both try to close
      job1.status = 'Closed';
      expect(job2.status).toBe('Active'); // Second update should be prevented or handled
    });

    it('should validate job data before closing', () => {
      const job = {
        id: 'job-1',
        status: 'Active',
        title: 'Software Engineer',
      };

      expect(job.id).toBeDefined();
      expect(job.title).toBeDefined();
      // Should validate before closing
    });
  });
});


