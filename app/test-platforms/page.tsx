'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

export default function TestPlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatforms = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getPlatforms(forceRefresh);
      console.log('Platforms result:', result);

      if (result.success && result.platforms) {
        setPlatforms(result.platforms);
      } else {
        setError(result.error?.message || 'Failed to fetch platforms');
      }
    } catch (err) {
      console.error('Error fetching platforms:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    apiClient.clearPlatformsCache();
    fetchPlatforms(true);
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Platform Test Page</h1>

      <div className="mb-4 space-x-4">
        <button
          onClick={() => fetchPlatforms()}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        <button
          onClick={clearCache}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          Clear Cache & Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="text-xl font-semibold mb-2">
          Platform Count: {platforms.length}
        </h2>

        {platforms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform, index) => (
              <div key={index} className="bg-white p-4 rounded shadow">
                <h3 className="font-bold text-lg">{platform.name}</h3>
                <p className="text-gray-600">Domain: {platform.domain}</p>
                <p className="text-gray-600">
                  Max Duration: {platform.maxDuration}s
                </p>
                <p className="text-gray-600">Icon: {platform.icon}</p>
                <div className="mt-2">
                  <p className="text-sm font-medium">Supported Formats:</p>
                  <div className="flex gap-2 mt-1">
                    {platform.supportedFormats?.map((format: string) => (
                      <span
                        key={format}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No platforms found</p>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Raw Data:</h2>
        <pre className="text-xs overflow-auto bg-white p-2 rounded border">
          {JSON.stringify(platforms, null, 2)}
        </pre>
      </div>
    </div>
  );
}
