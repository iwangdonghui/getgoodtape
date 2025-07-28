'use client';

import { useState, useEffect } from 'react';
import Logo from '../../components/Logo';
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
    conversion.setUrl(e.target.value);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-sm border-b border-warm-orange/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <h1 className="text-xl font-bold text-deep-brown">
                  GetGoodTape
                </h1>
                <p className="text-xs text-deep-brown/60">
                  Development Version
                </p>
              </div>
            </div>
            <div className="text-sm text-deep-brown/70 bg-mint-green/20 px-3 py-1 rounded-full">
              Dev Mode
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Conversion Form */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-warm-orange/20">
            <h2 className="text-2xl font-bold text-deep-brown mb-6 text-center">
              视频转换工具
            </h2>

            <form onSubmit={handleConvert} className="space-y-6">
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
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-mint-green focus:border-transparent ${
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
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-deep-brown mb-2">
                    输出格式
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="mp3"
                        checked={conversion.format === 'mp3'}
                        onChange={e =>
                          conversion.setFormat(e.target.value as 'mp3' | 'mp4')
                        }
                        className="mr-2"
                        disabled={conversion.isConverting}
                      />
                      <span className="text-deep-brown">MP3 (音频)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="mp4"
                        checked={conversion.format === 'mp4'}
                        onChange={e =>
                          conversion.setFormat(e.target.value as 'mp3' | 'mp4')
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
                    className="w-full px-4 py-3 rounded-lg border border-warm-orange/30 focus:outline-none focus:ring-2 focus:ring-mint-green"
                    disabled={conversion.isConverting}
                  >
                    <option value="high">高质量</option>
                    <option value="medium">中等质量</option>
                    <option value="low">低质量 (更快)</option>
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
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {conversion.isConverting
                  ? `转换中... (${conversion.progress}%)`
                  : conversion.isValidating
                    ? '验证中...'
                    : !conversion.detectedPlatform && conversion.url.trim()
                      ? '请输入支持的平台链接'
                      : conversion.urlError
                        ? '链接格式错误'
                        : '开始转换'}
              </button>
            </form>

            {/* Progress Bar */}
            {conversion.isConverting && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-deep-brown mb-2">
                  <span>
                    转换进度
                    {conversion.status !== 'idle' && (
                      <span className="ml-2 text-xs text-gray-600">
                        (
                        {conversion.status === 'queued'
                          ? '排队中'
                          : conversion.status === 'processing'
                            ? '处理中'
                            : conversion.status}
                        )
                      </span>
                    )}
                  </span>
                  <span>{Math.round(conversion.progress)}%</span>
                </div>
                <div className="w-full bg-warm-orange/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-warm-orange to-tape-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${conversion.progress}%` }}
                  ></div>
                </div>
                {conversion.jobId && (
                  <div className="mt-2 text-xs text-gray-500">
                    任务ID: {conversion.jobId}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {(conversion.error || conversion.result) && (
              <div className="mt-6">
                {conversion.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{conversion.error}</p>
                    <div className="mt-3 flex space-x-3">
                      {conversion.canRetry && (
                        <button
                          onClick={conversion.retry}
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          重试 ({conversion.retryCount}/3)
                        </button>
                      )}
                      <button
                        onClick={conversion.reset}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                      >
                        重新开始
                      </button>
                    </div>
                  </div>
                ) : conversion.result ? (
                  <div className="bg-mint-green/20 border border-mint-green/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-deep-brown mb-2">
                      ✅ 转换完成！
                    </h3>

                    {/* Video metadata */}
                    {conversion.result.metadata && (
                      <div className="mb-4 p-3 bg-white/50 rounded-lg">
                        <h4 className="font-medium text-deep-brown mb-2">
                          视频信息
                        </h4>
                        <div className="text-sm text-deep-brown/80 space-y-1">
                          <p>
                            <strong>标题:</strong>{' '}
                            {conversion.result.metadata.title}
                          </p>
                          <p>
                            <strong>时长:</strong>{' '}
                            {formatDuration(
                              conversion.result.metadata.duration
                            )}
                          </p>
                          <p>
                            <strong>上传者:</strong>{' '}
                            {conversion.result.metadata.uploader}
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="text-deep-brown/80 mb-4">
                      文件名: {conversion.result.filename}
                    </p>
                    <div className="flex space-x-3">
                      <a
                        href={conversion.result.downloadUrl}
                        className="btn-primary inline-block"
                        download={conversion.result.filename}
                      >
                        下载文件
                      </a>
                      <button
                        onClick={conversion.reset}
                        className="px-4 py-2 text-deep-brown border border-warm-orange/30 rounded-lg hover:bg-warm-orange/10 transition-colors"
                      >
                        转换新文件
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Supported Platforms */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-warm-orange/20">
            <h3 className="text-lg font-semibold text-deep-brown mb-4">
              支持的平台
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supportedPlatforms.map(platform => (
                <div
                  key={platform.name}
                  className={`rounded-lg p-4 border ${platform.color}`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex-shrink-0">{platform.icon}</div>
                    <h4 className="font-medium">{platform.name}</h4>
                  </div>
                  <p className="text-xs opacity-70">{platform.example}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              🚀 API集成状态
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 前端界面 ✅ 完成</li>
              <li>• 后端API ✅ 已集成</li>
              <li>• 视频处理服务 ✅ 已连接</li>
              <li>• 文件存储系统 ✅ 已配置</li>
              <li>• 任务队列管理 ✅ 已实现</li>
              <li>
                • API端点:{' '}
                <code className="bg-blue-100 px-1 rounded">
                  {process.env.NEXT_PUBLIC_API_URL ||
                    'http://localhost:8787/api'}
                </code>
              </li>
              <li>
                • 访问{' '}
                <code className="bg-blue-100 px-1 rounded">localhost:3000</code>{' '}
                查看landing page
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
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
