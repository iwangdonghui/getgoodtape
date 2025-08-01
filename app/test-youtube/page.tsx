'use client';

import { useState, useEffect } from 'react';
import VideoPreview from '../../components/VideoPreview';
import { apiClient, ValidationResponse } from '../../lib/api-client';

export default function TestYouTubePage() {
  const [url, setUrl] = useState('');
  const [urlValidation, setUrlValidation] = useState<ValidationResponse>({
    isValid: false,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!url.trim()) {
      setUrlValidation({ isValid: false });
      return;
    }

    const validateUrl = async () => {
      try {
        console.log('Validating URL:', url);
        const result = await apiClient.validateUrl(url);
        console.log('Validation result:', result);
        setUrlValidation(result);
      } catch (error) {
        console.error('Validation error:', error);
        setUrlValidation({
          isValid: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'Failed to validate URL',
            retryable: true,
          },
        });
      }
    };

    const timeoutId = setTimeout(validateUrl, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Universal Metadata Test</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Video URL (YouTube, Twitter, TikTok, Instagram, Facebook):
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://twitter.com/... or https://tiktok.com/..."
              className="w-full p-3 border border-border rounded-lg"
            />
            <div className="text-xs text-muted-foreground mt-1">
              <p>Try these examples:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
                <li>Twitter: https://twitter.com/username/status/123456789</li>
                <li>
                  TikTok: https://www.tiktok.com/@username/video/123456789
                </li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>isMounted: {isMounted.toString()}</p>
            <p>url: {url}</p>
            <p>urlValidation.isValid: {urlValidation.isValid.toString()}</p>
            <p>
              urlValidation.metadata exists:{' '}
              {(!!urlValidation.metadata).toString()}
            </p>
          </div>

          {url && urlValidation.isValid && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">✓ Valid YouTube URL detected</p>
              {urlValidation.platform && (
                <p className="text-sm text-green-600">
                  Platform:{' '}
                  {typeof urlValidation.platform === 'string'
                    ? urlValidation.platform
                    : urlValidation.platform.name}
                </p>
              )}
            </div>
          )}

          {url && urlValidation.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">✗ {urlValidation.error.message}</p>
            </div>
          )}

          {/* Video Preview */}
          {isMounted &&
            url &&
            urlValidation.isValid &&
            urlValidation.metadata && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Video Preview:</h2>
                <VideoPreview
                  title={urlValidation.metadata.title}
                  thumbnail={urlValidation.metadata.thumbnail}
                  duration={urlValidation.metadata.duration}
                  uploader={
                    urlValidation.metadata.channelTitle ||
                    urlValidation.metadata.uploader
                  }
                  platform={
                    typeof urlValidation.platform === 'string'
                      ? urlValidation.platform
                      : urlValidation.platform?.name
                  }
                />
              </div>
            )}

          {/* Debug Info */}
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-medium">
              Debug Info (Click to expand)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
              {JSON.stringify(urlValidation, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
