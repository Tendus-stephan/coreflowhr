import { useState, useEffect } from 'react';

interface ProviderStatus {
  linkedin: boolean;
  github: boolean;
  jobboard: boolean;
}

export default function ProviderStatus() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/providers/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.providers);
      }
    } catch (error) {
      console.error('Error fetching provider status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">Loading provider status...</p>
      </div>
    );
  }

  const providers = [
    { key: 'linkedin', label: 'LinkedIn', color: 'blue' },
    { key: 'github', label: 'GitHub', color: 'gray' },
    { key: 'jobboard', label: 'Job Boards', color: 'green' }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Scraping Providers Status
      </h2>
      <div className="flex gap-4">
        {providers.map(provider => {
          const isConfigured = status?.[provider.key as keyof ProviderStatus] || false;
          return (
            <div key={provider.key} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConfigured ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-700">{provider.label}</span>
              {!isConfigured && (
                <span className="text-xs text-red-600">(Not configured)</span>
              )}
            </div>
          );
        })}
      </div>
      {status && Object.values(status).every(v => !v) && (
        <p className="text-xs text-red-600 mt-2">
          ⚠️ No providers configured. Set up API keys in .env file.
        </p>
      )}
    </div>
  );
}

