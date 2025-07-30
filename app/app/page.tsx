'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import PerformanceMonitor from '../../components/PerformanceMonitor';
import MobileTestHelper from '../../components/MobileTestHelper';
import MobileKeyboardHandler from '../../components/MobileKeyboardHandler';
import MobileTouchFeedback from '../../components/MobileTouchFeedback';
import MobilePerformanceOptimizer from '../../components/MobilePerformanceOptimizer';
import BrowserCompatibilityTester from '../../components/BrowserCompatibilityTester';
import SEOHead, { pageSEO } from '../../components/SEOHead';
import {
  LazyConversionProgress,
  LazyConversionResult,
  LazyConversionError,
  smartPreload,
} from '../../components/LazyComponents';

import { useConversion } from '../../hooks/useConversion';
import { apiClient, formatDuration } from '../../lib/api-client';

export default function AppPage() {
  const conversion = useConversion();
  const [supportedPlatforms, setSupportedPlatforms] = useState<any[]>([]);

  // Load supported platforms on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      const response = await apiClient.getPlatforms();
      if (response.success && response.platforms) {
        // Transform API response to match UI expectations
        const platforms = response.platforms.map(platform => ({
          name: platform.name,
          supported: platform.supported,
          formats: platform.formats,
          maxDuration: platform.maxDuration,
          example: getPlatformExample(platform.name),
          icon: getPlatformIcon(platform.name),
          color: getPlatformColor(platform.name),
        }));
        setSupportedPlatforms(platforms);
      } else {
        // Fallback to default platforms if API fails
        setSupportedPlatforms(getDefaultPlatforms());
      }
    };

    loadPlatforms();
  }, []);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    await conversion.startConversion();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    conversion.setUrl(url);

    // 智能预加载：当用户开始输入URL时预加载转换相关组件
    if (url.length > 10) {
      smartPreload.onUrlInput();
    }
  };

  return (
    <>
      <SEOHead {...pageSEO.app} />
      <MobilePerformanceOptimizer>
        <MobileKeyboardHandler>
          <div className="min-h-screen bg-cream mobile-safe-area mobile-scroll-optimized">
            {/* Header */}
            <header className="bg-white/50 backdrop-blur-sm border-b border-warm-orange/20">
              <div className="mobile-container py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    className="mobile-link space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
                  >
                    <Logo size="md" />
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold text-deep-brown">
                        GetGoodTape
                      </h1>
                      <p className="text-xs text-deep-brown/60">Beta Version</p>
                    </div>
                  </Link>
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <Link
                      href="/"
                      className="mobile-link text-xs sm:text-sm text-deep-brown/70 hover:text-deep-brown transition-colors"
                    >
                      ← Back
                    </Link>
                    <div className="text-xs sm:text-sm text-deep-brown/70 bg-mint-green/20 px-2 sm:px-3 py-1 rounded-full">
                      Beta
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="mobile-container py-6 sm:py-8">
              <div className="max-w-4xl mx-auto">
                {/* Conversion Form */}
                <div className="mobile-card mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-deep-brown mb-4 sm:mb-6 text-center">
                    视频转换工具
                  </h2>

                  <form
                    onSubmit={handleConvert}
                    className="space-y-4 sm:space-y-6"
                  >
                    {/* URL Input */}
                    <div>
                      <label
                        htmlFor="url"
                        className="block text-sm font-medium text-deep-brown mb-2"
                      >
                        视频链接
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          id="url"
                          value={conversion.url}
                          onChange={handleUrlChange}
                          placeholder="粘贴视频链接..."
                          className={`mobile-input ${
                            conversion.urlError
                              ? 'border-red-300 bg-red-50'
                              : conversion.detectedPlatform
                                ? 'border-green-300 bg-green-50'
                                : 'border-warm-orange/30'
                          }`}
                          disabled={conversion.isConverting}
                          required
                        />

                        {/* Platform Detection Indicator */}
                        {conversion.detectedPlatform && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="flex items-center space-x-2">
                              <div className="text-green-600">
                                {
                                  supportedPlatforms.find(
                                    p => p.name === conversion.detectedPlatform
                                  )?.icon
                                }
                              </div>
                              <span className="text-sm font-medium text-green-600">
                                {conversion.detectedPlatform}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Loading indicator */}
                        {conversion.isValidating && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-warm-orange"></div>
                          </div>
                        )}
                      </div>

                      {/* URL Status Messages */}
                      {conversion.urlError && (
                        <div className="mt-2 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {conversion.urlError}
                        </div>
                      )}

                      {conversion.detectedPlatform && !conversion.urlError && (
                        <div className="mt-2 text-sm text-green-600 flex items-center">
                          <span className="mr-1">✅</span>
                          已识别 {conversion.detectedPlatform} 链接
                          {conversion.urlMetadata?.title && (
                            <span className="ml-2 text-xs text-gray-600">
                              - {conversion.urlMetadata.title}
                            </span>
                          )}
                        </div>
                      )}

                      {conversion.isValidating && (
                        <div className="mt-2 text-sm text-yellow-600 flex items-center">
                          <span className="mr-1">🔍</span>
                          正在验证链接...
                        </div>
                      )}

                      {conversion.url &&
                        !conversion.detectedPlatform &&
                        !conversion.urlError &&
                        !conversion.isValidating && (
                          <div className="mt-2 text-sm text-yellow-600 flex items-center">
                            <span className="mr-1">❓</span>
                            未识别的平台，请检查链接
                          </div>
                        )}
                    </div>

                    {/* Format Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-deep-brown mb-2">
                          输出格式
                        </label>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                          <label className="flex items-center mobile-link justify-start">
                            <input
                              type="radio"
                              value="mp3"
                              checked={conversion.format === 'mp3'}
                              onChange={e =>
                                conversion.setFormat(
                                  e.target.value as 'mp3' | 'mp4'
                                )
                              }
                              className="mr-2"
                              disabled={conversion.isConverting}
                            />
                            <span className="text-deep-brown">MP3 (音频)</span>
                          </label>
                          <label className="flex items-center mobile-link justify-start">
                            <input
                              type="radio"
                              value="mp4"
                              checked={conversion.format === 'mp4'}
                              onChange={e =>
                                conversion.setFormat(
                                  e.target.value as 'mp3' | 'mp4'
                                )
                              }
                              className="mr-2"
                              disabled={conversion.isConverting}
                            />
                            <span className="text-deep-brown">MP4 (视频)</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="quality"
                          className="block text-sm font-medium text-deep-brown mb-2"
                        >
                          质量选择
                        </label>
                        <select
                          id="quality"
                          value={conversion.quality}
                          onChange={e => conversion.setQuality(e.target.value)}
                          className="mobile-input"
                          disabled={conversion.isConverting}
                        >
                          <option value="high">
                            高质量 (
                            {conversion.format === 'mp3' ? '320kbps' : '720p'})
                          </option>
                          <option value="medium">
                            中等质量 (
                            {conversion.format === 'mp3' ? '128kbps' : '360p'})
                            - 推荐
                          </option>
                          <option value="low">
                            低质量 (
                            {conversion.format === 'mp3' ? '96kbps' : '360p'}) -
                            更快下载
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Convert Button */}
                    <button
                      type="submit"
                      disabled={
                        conversion.isConverting ||
                        !conversion.url.trim() ||
                        !conversion.detectedPlatform ||
                        !!conversion.urlError ||
                        conversion.isValidating
                      }
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed touch-action-manipulation"
                    >
                      {conversion.isConverting
                        ? `转换中... (${conversion.progress}%)`
                        : conversion.isValidating
                          ? '验证中...'
                          : !conversion.detectedPlatform &&
                              conversion.url.trim()
                            ? '请输入支持的平台链接'
                            : conversion.urlError
                              ? '链接格式错误'
                              : '开始转换'}
                    </button>
                  </form>

                  {/* Progress Display */}
                  {(() => {
                    console.log('🔄 App rendering ConversionProgress with:', {
                      status: conversion.status,
                      progress: conversion.progress,
                      jobId: conversion.jobId,
                      error: conversion.error,
                    });
                    return null;
                  })()}
                  <LazyConversionProgress
                    status={conversion.status}
                    progress={conversion.progress}
                    jobId={conversion.jobId}
                    error={conversion.error}
                    queuePosition={conversion.queuePosition}
                    estimatedTimeRemaining={conversion.estimatedTimeRemaining}
                  />

                  {/* Result or Error Display */}
                  {conversion.error && (
                    <LazyConversionError
                      error={conversion.error}
                      canRetry={conversion.canRetry}
                      retryCount={conversion.retryCount}
                      onRetry={conversion.retry}
                      onReset={conversion.reset}
                      jobId={conversion.jobId}
                    />
                  )}

                  {conversion.result && !conversion.error && (
                    <LazyConversionResult
                      downloadUrl={conversion.result.downloadUrl}
                      filename={conversion.result.filename}
                      metadata={conversion.result.metadata}
                      format={conversion.format}
                      quality={conversion.quality}
                      onReset={conversion.reset}
                      onNewConversion={() => {
                        conversion.reset();
                        // Focus on URL input
                        setTimeout(() => {
                          const urlInput = document.getElementById(
                            'url'
                          ) as HTMLInputElement;
                          if (urlInput) {
                            urlInput.focus();
                          }
                        }, 100);
                      }}
                    />
                  )}
                </div>

                {/* Supported Platforms */}
                <div className="mobile-card">
                  <h3 className="text-base sm:text-lg font-semibold text-deep-brown mb-3 sm:mb-4">
                    支持的平台
                  </h3>
                  <div className="mobile-grid gap-3 sm:gap-4">
                    {supportedPlatforms.map(platform => (
                      <div
                        key={platform.name}
                        className={`rounded-lg p-3 sm:p-4 border ${platform.color}`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                          <div className="flex-shrink-0">{platform.icon}</div>
                          <h4 className="font-medium text-sm sm:text-base">
                            {platform.name}
                          </h4>
                        </div>
                        <p className="text-xs opacity-70 break-all">
                          {platform.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>

            {/* 性能监控组件 */}
            <PerformanceMonitor
              enableLogging={process.env.NODE_ENV === 'development'}
              onMetrics={metrics => {
                // 在生产环境中可以发送到分析服务
                if (process.env.NODE_ENV === 'production') {
                  // TODO: 发送到分析服务 (如 Google Analytics, Vercel Analytics)
                  console.log('Performance metrics:', metrics);
                }
              }}
            />

            {/* 移动端测试工具 (仅开发环境) */}
            <MobileTestHelper />

            {/* 浏览器兼容性测试工具 (仅开发环境) */}
            <BrowserCompatibilityTester />
          </div>
        </MobileKeyboardHandler>
      </MobilePerformanceOptimizer>
    </>
  );
}

// Helper functions for platform UI
function getPlatformExample(name: string): string {
  const examples: Record<string, string> = {
    YouTube: 'https://www.youtube.com/watch?v=...',
    TikTok: 'https://www.tiktok.com/@user/video/...',
    Twitter: 'https://twitter.com/user/status/...',
    Facebook: 'https://www.facebook.com/watch?v=...',
    Instagram: 'https://www.instagram.com/p/...',
  };
  return examples[name] || `https://${name.toLowerCase()}.com/...`;
}

function getPlatformIcon(name: string) {
  const icons: Record<string, JSX.Element> = {
    YouTube: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    TikTok: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    Twitter: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    Facebook: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    Instagram: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  };

  return (
    icons[name] || (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    )
  );
}

function getPlatformColor(name: string): string {
  const colors: Record<string, string> = {
    YouTube: 'bg-red-50 border-red-200 text-red-600',
    TikTok: 'bg-black/5 border-black/20 text-black',
    Twitter: 'bg-black/5 border-black/20 text-black',
    Facebook: 'bg-blue-50 border-blue-200 text-blue-600',
    Instagram:
      'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-purple-600',
  };
  return colors[name] || 'bg-gray-50 border-gray-200 text-gray-600';
}

function getDefaultPlatforms() {
  return [
    {
      name: 'YouTube',
      supported: true,
      formats: ['mp3', 'mp4'],
      example: getPlatformExample('YouTube'),
      icon: getPlatformIcon('YouTube'),
      color: getPlatformColor('YouTube'),
    },
    {
      name: 'TikTok',
      supported: true,
      formats: ['mp3', 'mp4'],
      example: getPlatformExample('TikTok'),
      icon: getPlatformIcon('TikTok'),
      color: getPlatformColor('TikTok'),
    },
    {
      name: 'Twitter',
      supported: true,
      formats: ['mp3', 'mp4'],
      example: getPlatformExample('Twitter'),
      icon: getPlatformIcon('Twitter'),
      color: getPlatformColor('Twitter'),
    },
    {
      name: 'Facebook',
      supported: true,
      formats: ['mp3', 'mp4'],
      example: getPlatformExample('Facebook'),
      icon: getPlatformIcon('Facebook'),
      color: getPlatformColor('Facebook'),
    },
    {
      name: 'Instagram',
      supported: true,
      formats: ['mp3', 'mp4'],
      example: getPlatformExample('Instagram'),
      icon: getPlatformIcon('Instagram'),
      color: getPlatformColor('Instagram'),
    },
  ];
}
