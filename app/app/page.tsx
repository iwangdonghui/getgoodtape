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
import { useConversion } from '../../hooks/useConversion';
import { apiClient, ValidationResponse } from '../../lib/api-client';

export default function AppPage() {
  const conversion = useConversion();
  const [urlValidation, setUrlValidation] = useState<ValidationResponse>({
    isValid: false,
  });
  const [isMounted, setIsMounted] = useState(false);

  // Client-side mounting effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync URL validation with conversion hook
  useEffect(() => {
    if (conversion.detectedPlatform) {
      setUrlValidation({
        isValid: true,
        platform: conversion.detectedPlatform,
        metadata: conversion.urlMetadata || undefined,
      });
    } else if (conversion.urlError) {
      setUrlValidation({
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: conversion.urlError,
          retryable: true,
        },
      });
    } else {
      setUrlValidation({ isValid: false });
    }
  }, [
    conversion.detectedPlatform,
    conversion.urlError,
    conversion.urlMetadata,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlValidation.isValid) {
      return;
    }

    await conversion.startConversion();
  };

  const resetConversion = () => {
    conversion.reset();
  };

  const startNewConversion = () => {
    conversion.reset();
  };

  const isConverting = conversion.isConverting;

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
              {(conversion.status === 'idle' ||
                conversion.status === 'failed') && (
                <div className="max-w-2xl mx-auto">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* URL Input */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          type="url"
                          id="url"
                          value={conversion.url}
                          onChange={e => conversion.setUrl(e.target.value)}
                          placeholder="Paste your video URL here..."
                          required
                          className={`h-14 text-lg px-6 ${
                            conversion.url && !urlValidation.isValid
                              ? 'border-red-300 focus:border-red-500'
                              : conversion.url && urlValidation.isValid
                                ? 'border-green-300 focus:border-green-500'
                                : ''
                          }`}
                        />
                        {conversion.url && urlValidation.isValid && (
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <span className="text-green-500 text-xl">✓</span>
                          </div>
                        )}
                      </div>

                      {/* Validation Messages */}
                      {conversion.url &&
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
                      {conversion.url && urlValidation.error && (
                        <p className="text-sm text-red-600 flex items-center gap-2">
                          <span className="text-red-500">✗</span>
                          {urlValidation.error.message}
                        </p>
                      )}

                      {/* Video Preview */}
                      {isMounted &&
                        conversion.url &&
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
                              conversion.format === 'mp3'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              value="mp3"
                              checked={conversion.format === 'mp3'}
                              onChange={e =>
                                conversion.setFormat(
                                  e.target.value as 'mp3' | 'mp4'
                                )
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
                              conversion.format === 'mp4'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              value="mp4"
                              checked={conversion.format === 'mp4'}
                              onChange={e =>
                                conversion.setFormat(
                                  e.target.value as 'mp3' | 'mp4'
                                )
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
                          value={conversion.quality}
                          onChange={e => conversion.setQuality(e.target.value)}
                          className="w-full p-3 border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {conversion.format === 'mp3' ? (
                            <>
                              <option value="high">320 kbps (High)</option>
                              <option value="medium">192 kbps (Medium)</option>
                              <option value="low">128 kbps (Low)</option>
                            </>
                          ) : (
                            <>
                              <option value="high">1080p (High)</option>
                              <option value="medium">720p (Medium)</option>
                              <option value="low">360p (Low)</option>
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
                        !urlValidation.isValid ||
                        !conversion.url.trim() ||
                        isConverting
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
              {(conversion.status === 'queued' ||
                conversion.status === 'processing') && (
                <div className="max-w-2xl mx-auto">
                  <ConversionProgress
                    status={conversion.status}
                    progress={conversion.progress}
                    jobId={conversion.jobId}
                    estimatedTimeRemaining={conversion.estimatedTimeRemaining}
                    queuePosition={conversion.queuePosition}
                    onForceRefresh={conversion.forceRefresh}
                    onCheckHealth={conversion.checkHealth}
                  />
                </div>
              )}

              {/* Conversion Result */}
              {conversion.status === 'completed' && (
                <div className="max-w-2xl mx-auto">
                  <ConversionResult
                    downloadUrl={conversion.result?.downloadUrl}
                    filename={conversion.result?.filename}
                    metadata={conversion.result?.metadata}
                    format={conversion.format}
                    quality={conversion.quality}
                    onReset={resetConversion}
                    onNewConversion={startNewConversion}
                  />
                </div>
              )}

              {/* Error State */}
              {conversion.status === 'failed' && (
                <div className="max-w-2xl mx-auto">
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-red-500">❌</span>
                      <h3 className="font-semibold text-red-800">
                        Conversion Failed
                      </h3>
                    </div>
                    <p className="text-red-700 mb-4">
                      {conversion.error || 'An unknown error occurred'}
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
