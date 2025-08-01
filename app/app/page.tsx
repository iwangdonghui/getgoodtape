'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead, { pageSEO } from '../../components/SEOHead';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ConversionProgress from '../../components/ConversionProgress';
import ConversionResult from '../../components/ConversionResult';
import SupportedPlatforms from '../../components/SupportedPlatforms';
import BrandFeatures from '../../components/BrandFeatures';
import VideoPreview from '../../components/VideoPreview';
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
  metadata?: {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
  };
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
    error?: {
      type: string;
      message: string;
      retryable: boolean;
    };
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

      if (result.success && result.jobId) {
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
          error:
            typeof result.error === 'string'
              ? result.error
              : result.error?.message || 'Failed to start conversion',
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
              error:
                typeof result.error === 'string'
                  ? result.error
                  : result.error?.message || 'Conversion failed',
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
            error:
              typeof result.error === 'string'
                ? result.error
                : result.error?.message || 'Failed to get status',
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
      <div className="min-h-screen bg-background flex flex-col">
        <Header variant="app" />

        {/* Hero Section */}
        <main className="flex-1">
          <section className="py-12 lg:py-20 bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                YouTube to MP3 Converter
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Clean, fast, and reliable conversions by GetGoodTape
              </p>

              {/* Conversion Form */}
              {(conversionState.status === 'idle' ||
                conversionState.status === 'failed') && (
                <div className="max-w-2xl mx-auto">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* URL Input */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          type="url"
                          id="url"
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="Paste your video URL here..."
                          required
                          className={`h-14 text-lg px-6 ${
                            url && !urlValidation.isValid
                              ? 'border-red-300 focus:border-red-500'
                              : url && urlValidation.isValid
                                ? 'border-green-300 focus:border-green-500'
                                : ''
                          }`}
                        />
                        {url && urlValidation.isValid && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-500 text-xl">✓</span>
                          </div>
                        )}
                      </div>

                      {/* Validation Messages */}
                      {url &&
                        urlValidation.isValid &&
                        urlValidation.platform &&
                        (() => {
                          const platform = urlValidation.platform;
                          const platformName =
                            typeof platform === 'string'
                              ? platform
                              : platform &&
                                  typeof platform === 'object' &&
                                  'name' in platform
                                ? platform.name
                                : 'Unknown platform';

                          return (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              {platformName} video detected
                            </p>
                          );
                        })()}
                      {url && urlValidation.error && (
                        <p className="text-sm text-red-600 flex items-center gap-2">
                          <span className="text-red-500">✗</span>
                          {urlValidation.error.message}
                        </p>
                      )}

                      {/* Video Preview */}
                      {url &&
                        urlValidation.isValid &&
                        urlValidation.metadata && (
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
                        )}
                    </div>

                    {/* Format and Quality Selection */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Format Selection */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-3">
                          Format
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label
                            className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                              format === 'mp3'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              value="mp3"
                              checked={format === 'mp3'}
                              onChange={e =>
                                setFormat(e.target.value as 'mp3' | 'mp4')
                              }
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-lg mb-1">🎵</div>
                              <div className="font-medium">MP3</div>
                              <div className="text-xs text-muted-foreground">
                                Audio Only
                              </div>
                            </div>
                          </label>
                          <label
                            className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                              format === 'mp4'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              value="mp4"
                              checked={format === 'mp4'}
                              onChange={e =>
                                setFormat(e.target.value as 'mp3' | 'mp4')
                              }
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-lg mb-1">🎥</div>
                              <div className="font-medium">MP4</div>
                              <div className="text-xs text-muted-foreground">
                                Video + Audio
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Quality Selection */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-3">
                          Quality
                        </label>
                        <select
                          value={quality}
                          onChange={e => setQuality(e.target.value)}
                          className="w-full p-3 border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {format === 'mp3' ? (
                            <>
                              <option value="320">320 kbps (High)</option>
                              <option value="192">192 kbps (Medium)</option>
                              <option value="128">128 kbps (Low)</option>
                            </>
                          ) : (
                            <>
                              <option value="1080">1080p (High)</option>
                              <option value="720">720p (Medium)</option>
                              <option value="360">360p (Low)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl"
                      disabled={
                        !urlValidation.isValid || !url.trim() || isConverting
                      }
                    >
                      {isConverting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Converting...
                        </div>
                      ) : (
                        'Start Conversion'
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {/* Conversion Progress */}
              {(conversionState.status === 'validating' ||
                conversionState.status === 'queued' ||
                conversionState.status === 'processing') && (
                <div className="max-w-2xl mx-auto">
                  <ConversionProgress
                    status={conversionState.status}
                    progress={conversionState.progress}
                    jobId={conversionState.jobId}
                    estimatedTimeRemaining={
                      conversionState.estimatedTimeRemaining
                    }
                    currentStep={conversionState.currentStep}
                    queuePosition={conversionState.queuePosition}
                  />
                </div>
              )}

              {/* Conversion Result */}
              {conversionState.status === 'completed' && (
                <div className="max-w-2xl mx-auto">
                  <ConversionResult
                    downloadUrl={conversionState.downloadUrl}
                    filename={conversionState.filename}
                    metadata={conversionState.metadata}
                    format={format}
                    quality={quality}
                    onReset={resetConversion}
                    onNewConversion={startNewConversion}
                  />
                </div>
              )}

              {/* Error State */}
              {conversionState.status === 'failed' && (
                <div className="max-w-2xl mx-auto">
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
                </div>
              )}
            </div>
          </section>

          {/* Supported Platforms Section */}
          <SupportedPlatforms />

          {/* Brand Features Section */}
          <BrandFeatures />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
