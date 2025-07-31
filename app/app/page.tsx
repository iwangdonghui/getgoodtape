'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead, { pageSEO } from '../../components/SEOHead';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ConversionProgress from '../../components/ConversionProgress';
import ConversionResult from '../../components/ConversionResult';
import { apiClient } from '../../lib/api-client';

interface ConversionState {
  status:
    | 'idle'
    | 'validating'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed';
  jobId?: string;
  progress: number;
  error?: string;
  downloadUrl?: string;
  filename?: string;
  metadata?: any;
  estimatedTimeRemaining?: number;
  currentStep?: string;
  queuePosition?: number;
}

export default function AppPage() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [quality, setQuality] = useState('medium');
  const [conversionState, setConversionState] = useState<ConversionState>({
    status: 'idle',
    progress: 0,
  });
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    platform?:
      | string
      | {
          name: string;
          domain: string;
          supportedFormats: string[];
          maxDuration: number;
          icon: string;
          qualityOptions: Record<string, string[]>;
        };
    error?:
      | {
          type: string;
          message: string;
          retryable: boolean;
        }
      | string;
  }>({ isValid: false });

  // URL validation effect
  useEffect(() => {
    if (!url.trim()) {
      setUrlValidation({ isValid: false });
      return;
    }

    const validateUrl = async () => {
      try {
        const result = await apiClient.validateUrl(url);
        setUrlValidation(result);
      } catch (error) {
        setUrlValidation({
          isValid: false,
          error: 'Failed to validate URL',
        });
      }
    };

    const timeoutId = setTimeout(validateUrl, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlValidation.isValid) {
      return;
    }

    setConversionState({
      status: 'validating',
      progress: 0,
    });

    try {
      // Start conversion
      const result = await apiClient.convert({
        url,
        format,
        quality,
      });

      if (result.success) {
        setConversionState({
          status: 'queued',
          jobId: result.jobId,
          progress: 10,
        });

        // Start polling for status
        pollConversionStatus(result.jobId);
      } else {
        setConversionState({
          status: 'failed',
          progress: 0,
          error: result.error?.message || 'Failed to start conversion',
        });
      }
    } catch (error) {
      setConversionState({
        status: 'failed',
        progress: 0,
        error: 'Network error occurred',
      });
    }
  };

  const pollConversionStatus = async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await apiClient.getStatus(jobId);

        if (result.success) {
          setConversionState(prev => ({
            ...prev,
            status: result.status || prev.status,
            progress: result.progress || prev.progress,
            estimatedTimeRemaining: result.estimatedTimeRemaining,
            queuePosition: result.queuePosition,
          }));

          if (result.status === 'completed') {
            setConversionState(prev => ({
              ...prev,
              downloadUrl: result.downloadUrl,
              filename: result.filename,
              metadata: result.metadata,
            }));
            return;
          }

          if (result.status === 'failed') {
            setConversionState(prev => ({
              ...prev,
              error: result.error || 'Conversion failed',
            }));
            return;
          }

          attempts++;
          if (
            attempts < maxAttempts &&
            (result.status === 'queued' || result.status === 'processing')
          ) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        } else {
          setConversionState(prev => ({
            ...prev,
            status: 'failed',
            error: result.error?.message || 'Failed to get status',
          }));
        }
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  const resetConversion = () => {
    setConversionState({
      status: 'idle',
      progress: 0,
    });
    setUrl('');
  };

  const startNewConversion = () => {
    setConversionState({
      status: 'idle',
      progress: 0,
    });
  };

  const isConverting =
    conversionState.status !== 'idle' &&
    conversionState.status !== 'completed' &&
    conversionState.status !== 'failed';

  return (
    <>
      <SEOHead {...pageSEO.app} />
      <div className="min-h-screen bg-background">
        <Header variant="landing" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">
                Video to MP3/MP4 Converter
              </h1>
              <p className="text-muted-foreground">
                Convert your favorite videos to high-quality MP3 and MP4 files
              </p>
            </div>

            {/* Conversion Form */}
            {(conversionState.status === 'idle' ||
              conversionState.status === 'failed') && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="url"
                    className="block text-sm font-medium mb-2"
                  >
                    Video URL
                  </label>
                  <div className="relative">
                    <Input
                      type="url"
                      id="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="Paste video URL here..."
                      required
                      className={`${
                        url && !urlValidation.isValid
                          ? 'border-red-300 focus:border-red-500'
                          : url && urlValidation.isValid
                            ? 'border-green-300 focus:border-green-500'
                            : ''
                      }`}
                    />
                    {url && urlValidation.isValid && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-green-500">✓</span>
                      </div>
                    )}
                  </div>
                  {url && urlValidation.platform && (
                    <p className="text-sm text-green-600 mt-1">
                      {typeof urlValidation.platform === 'string'
                        ? urlValidation.platform
                        : urlValidation.platform.name}{' '}
                      video detected
                    </p>
                  )}
                  {url && urlValidation.error && (
                    <p className="text-sm text-red-600 mt-1">
                      {typeof urlValidation.error === 'string'
                        ? urlValidation.error
                        : urlValidation.error.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Format
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="mp3"
                          checked={format === 'mp3'}
                          onChange={e =>
                            setFormat(e.target.value as 'mp3' | 'mp4')
                          }
                          className="mr-2"
                        />
                        MP3 (Audio only)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="mp4"
                          checked={format === 'mp4'}
                          onChange={e =>
                            setFormat(e.target.value as 'mp3' | 'mp4')
                          }
                          className="mr-2"
                        />
                        MP4 (Video + Audio)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quality
                    </label>
                    <select
                      value={quality}
                      onChange={e => setQuality(e.target.value)}
                      className="w-full p-2 border rounded bg-background text-foreground"
                    >
                      <option value="high">High Quality</option>
                      <option value="medium">Medium Quality</option>
                      <option value="low">Low Quality</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!urlValidation.isValid || !url.trim()}
                >
                  Start Conversion
                </Button>
              </form>
            )}

            {/* Conversion Progress */}
            {(conversionState.status === 'validating' ||
              conversionState.status === 'queued' ||
              conversionState.status === 'processing') && (
              <ConversionProgress
                status={conversionState.status}
                progress={conversionState.progress}
                jobId={conversionState.jobId}
                estimatedTimeRemaining={conversionState.estimatedTimeRemaining}
                currentStep={conversionState.currentStep}
                queuePosition={conversionState.queuePosition}
              />
            )}

            {/* Conversion Result */}
            {conversionState.status === 'completed' && (
              <ConversionResult
                downloadUrl={conversionState.downloadUrl}
                filename={conversionState.filename}
                metadata={conversionState.metadata}
                format={format}
                quality={quality}
                onReset={resetConversion}
                onNewConversion={startNewConversion}
              />
            )}

            {/* Error State */}
            {conversionState.status === 'failed' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-red-500">❌</span>
                  <h3 className="font-semibold text-red-800">
                    Conversion Failed
                  </h3>
                </div>
                <p className="text-red-700 mb-4">
                  {conversionState.error || 'An unknown error occurred'}
                </p>
                <Button
                  onClick={resetConversion}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
