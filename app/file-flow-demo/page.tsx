'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ConversionProgressWebSocket from '../../components/ConversionProgressWebSocket';
import ConversionResult from '../../components/ConversionResult';
import VideoPreview from '../../components/VideoPreview';
import { useConversionWebSocket } from '../../hooks/useConversionWebSocket';

export default function FileFlowDemoPage() {
  const conversion = useConversionWebSocket();
  const [isMounted, setIsMounted] = useState(false);

  // Client-side mounting effect
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await conversion.startConversion();
  };

  const resetConversion = () => {
    conversion.reset();
  };

  const startNewConversion = () => {
    conversion.reset();
  };

  const isValidUrl = conversion.detectedPlatform && !conversion.urlError;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-12 lg:py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              File Flow Optimization Demo
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the power of direct R2 upload with presigned URLs - no
              more Worker bottlenecks!
            </p>

            {/* Architecture Comparison */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-4 text-xl">
                  ❌ Old File Flow
                </h3>
                <div className="space-y-3 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>VideoProcessor converts file</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Worker downloads file (bottleneck)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Worker uploads to R2 (double transfer)</span>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded border-l-4 border-red-400">
                    <p className="font-medium text-red-800">Problems:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Worker becomes data bottleneck</li>
                      <li>• High memory/CPU usage</li>
                      <li>• Slow for large files</li>
                      <li>• Double network transfer</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4 text-xl">
                  ✅ New File Flow
                </h3>
                <div className="space-y-3 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Worker generates presigned upload URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>VideoProcessor converts file</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>VideoProcessor uploads directly to R2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Worker verifies upload & generates download URL</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded border-l-4 border-green-400">
                    <p className="font-medium text-green-800">Benefits:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Direct upload path</li>
                      <li>• Minimal Worker resource usage</li>
                      <li>• Faster for large files</li>
                      <li>• Single network transfer</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow Diagram */}
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4 text-xl">
                🚀 Optimized Flow Diagram
              </h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <p className="mt-2 text-blue-700 font-medium">
                    Generate Presigned URL
                  </p>
                  <p className="text-blue-600 text-xs">Worker → R2</p>
                </div>
                <div className="hidden md:block text-blue-400 text-2xl">→</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <p className="mt-2 text-green-700 font-medium">
                    Convert Video
                  </p>
                  <p className="text-green-600 text-xs">VideoProcessor</p>
                </div>
                <div className="hidden md:block text-green-400 text-2xl">→</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <p className="mt-2 text-purple-700 font-medium">
                    Direct Upload
                  </p>
                  <p className="text-purple-600 text-xs">VideoProcessor → R2</p>
                </div>
                <div className="hidden md:block text-purple-400 text-2xl">
                  →
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <p className="mt-2 text-orange-700 font-medium">
                    Verify & Complete
                  </p>
                  <p className="text-orange-600 text-xs">Worker verifies</p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    conversion.isConnected
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  WebSocket:{' '}
                  {conversion.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium">
                  File Flow: Optimized
                </span>
              </div>
            </div>

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
                        placeholder="Paste your video URL here to test optimized file flow..."
                        required
                        className={`h-14 text-lg px-6 ${
                          conversion.url && !isValidUrl
                            ? 'border-red-300 focus:border-red-500'
                            : conversion.url && isValidUrl
                              ? 'border-green-300 focus:border-green-500'
                              : ''
                        }`}
                      />
                      {conversion.url && isValidUrl && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-500 text-xl">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Validation Messages */}
                    {conversion.url &&
                      isValidUrl &&
                      conversion.detectedPlatform && (
                        <p className="text-sm text-green-600 flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          {conversion.detectedPlatform} video detected - ready
                          for optimized processing
                        </p>
                      )}
                    {conversion.url && conversion.urlError && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <span className="text-red-500">✗</span>
                        {conversion.urlError}
                      </p>
                    )}

                    {/* Video Preview */}
                    {isMounted &&
                      conversion.url &&
                      isValidUrl &&
                      conversion.urlMetadata && (
                        <VideoPreview
                          title={conversion.urlMetadata.title}
                          thumbnail={conversion.urlMetadata.thumbnail}
                          duration={conversion.urlMetadata.duration}
                          uploader={
                            conversion.urlMetadata.channelTitle ||
                            conversion.urlMetadata.uploader
                          }
                          platform={conversion.detectedPlatform || undefined}
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
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={
                      !isValidUrl ||
                      !conversion.url.trim() ||
                      conversion.isConverting
                    }
                  >
                    {conversion.isConverting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing with Optimized Flow...
                      </div>
                    ) : (
                      '🚀 Start Optimized Conversion'
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Conversion Progress */}
            {(conversion.status === 'queued' ||
              conversion.status === 'processing') && (
              <div className="max-w-2xl mx-auto">
                <ConversionProgressWebSocket
                  status={conversion.status}
                  progress={conversion.progress}
                  jobId={conversion.jobId || undefined}
                  estimatedTimeRemaining={conversion.estimatedTimeRemaining}
                  queuePosition={conversion.queuePosition}
                  currentStep={conversion.currentStep}
                  isConnected={conversion.isConnected}
                />

                {/* Progress Explanation */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    🔍 What's happening behind the scenes:
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    {conversion.progress >= 35 && (
                      <p>
                        ✅ Presigned upload URL generated for direct R2 access
                      </p>
                    )}
                    {conversion.progress >= 40 && (
                      <p>
                        ✅ VideoProcessor received upload URL and started
                        conversion
                      </p>
                    )}
                    {conversion.progress >= 80 && (
                      <p>
                        ✅ File converted and uploaded directly to R2 (bypassing
                        Worker)
                      </p>
                    )}
                    {conversion.progress >= 90 && (
                      <p>
                        ✅ Worker verified upload and generated secure download
                        link
                      </p>
                    )}
                  </div>
                </div>
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

                {/* Success Message */}
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    🎉 Optimization Success!
                  </h4>
                  <p className="text-sm text-green-700">
                    Your file was processed using the optimized flow with direct
                    R2 upload, resulting in faster processing and reduced server
                    load.
                  </p>
                </div>
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
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
