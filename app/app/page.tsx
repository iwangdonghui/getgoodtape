'use client';

import { useState } from 'react';
import Logo from '../../components/Logo';

export default function AppPage() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [quality, setQuality] = useState('high');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    downloadUrl?: string;
    filename?: string;
    error?: string;
  } | null>(null);

  const supportedPlatforms = [
    {
      name: 'YouTube',
      pattern: /(youtube\.com|youtu\.be)/i,
      example: 'https://www.youtube.com/watch?v=...',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      color: 'bg-red-50 border-red-200 text-red-600',
    },
    {
      name: 'TikTok',
      pattern: /tiktok\.com/i,
      example: 'https://www.tiktok.com/@user/video/...',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
      color: 'bg-black/5 border-black/20 text-black',
    },
    {
      name: 'Twitter',
      pattern: /(twitter\.com|x\.com)/i,
      example: 'https://twitter.com/user/status/...',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'bg-black/5 border-black/20 text-black',
    },
    {
      name: 'Facebook',
      pattern: /facebook\.com/i,
      example: 'https://www.facebook.com/watch?v=...',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: 'bg-blue-50 border-blue-200 text-blue-600',
    },
    {
      name: 'Instagram',
      pattern: /instagram\.com/i,
      example: 'https://www.instagram.com/p/...',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      color:
        'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-purple-600',
    },
  ];

  // 检测平台的函数
  const detectPlatform = (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setDetectedPlatform(null);
      setUrlError(null);
      return;
    }

    // 检查是否是有效的URL
    try {
      new URL(inputUrl);
    } catch {
      setUrlError('请输入有效的URL链接');
      setDetectedPlatform(null);
      return;
    }

    // 检测平台
    const platform = supportedPlatforms.find(p => p.pattern.test(inputUrl));

    if (platform) {
      setDetectedPlatform(platform.name);
      setUrlError(null);
    } else {
      setDetectedPlatform(null);
      setUrlError('暂不支持此平台，请使用支持的平台链接');
    }
  };

  // 处理URL输入变化
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    detectPlatform(newUrl);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsConverting(true);
    setProgress(0);
    setResult(null);

    try {
      // 模拟转换过程
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressInterval);
      setProgress(100);

      // 模拟成功结果
      setResult({
        downloadUrl: '#',
        filename: `converted_audio.${format}`,
      });
    } catch (error) {
      setResult({
        error: '转换失败，请检查链接是否有效或稍后重试。',
      });
    } finally {
      setIsConverting(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setProgress(0);
    setResult(null);
    setIsConverting(false);
    setDetectedPlatform(null);
    setUrlError(null);
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
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="粘贴视频链接..."
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-mint-green focus:border-transparent ${
                      urlError
                        ? 'border-red-300 bg-red-50'
                        : detectedPlatform
                          ? 'border-green-300 bg-green-50'
                          : 'border-warm-orange/30'
                    }`}
                    disabled={isConverting}
                    required
                  />

                  {/* Platform Detection Indicator */}
                  {detectedPlatform && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="flex items-center space-x-2">
                        <div className="text-green-600">
                          {
                            supportedPlatforms.find(
                              p => p.name === detectedPlatform
                            )?.icon
                          }
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {detectedPlatform}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* URL Status Messages */}
                {urlError && (
                  <div className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {urlError}
                  </div>
                )}

                {detectedPlatform && !urlError && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <span className="mr-1">✅</span>
                    已识别 {detectedPlatform} 链接
                  </div>
                )}

                {url && !detectedPlatform && !urlError && (
                  <div className="mt-2 text-sm text-yellow-600 flex items-center">
                    <span className="mr-1">🔍</span>
                    正在检测平台...
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
                        checked={format === 'mp3'}
                        onChange={e =>
                          setFormat(e.target.value as 'mp3' | 'mp4')
                        }
                        className="mr-2"
                        disabled={isConverting}
                      />
                      <span className="text-deep-brown">MP3 (音频)</span>
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
                        disabled={isConverting}
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
                    value={quality}
                    onChange={e => setQuality(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-warm-orange/30 focus:outline-none focus:ring-2 focus:ring-mint-green"
                    disabled={isConverting}
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
                  isConverting || !url.trim() || !detectedPlatform || !!urlError
                }
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConverting
                  ? '转换中...'
                  : !detectedPlatform && url.trim()
                    ? '请输入支持的平台链接'
                    : urlError
                      ? '链接格式错误'
                      : '开始转换'}
              </button>
            </form>

            {/* Progress Bar */}
            {isConverting && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-deep-brown mb-2">
                  <span>转换进度</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-warm-orange/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-warm-orange to-tape-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-6">
                {result.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{result.error}</p>
                    <button
                      onClick={resetForm}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                    >
                      重新尝试
                    </button>
                  </div>
                ) : (
                  <div className="bg-mint-green/20 border border-mint-green/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-deep-brown mb-2">
                      ✅ 转换完成！
                    </h3>
                    <p className="text-deep-brown/80 mb-4">
                      文件名: {result.filename}
                    </p>
                    <div className="flex space-x-3">
                      <a
                        href={result.downloadUrl}
                        className="btn-primary inline-block"
                        download={result.filename}
                      >
                        下载文件
                      </a>
                      <button
                        onClick={resetForm}
                        className="px-4 py-2 text-deep-brown border border-warm-orange/30 rounded-lg hover:bg-warm-orange/10 transition-colors"
                      >
                        转换新文件
                      </button>
                    </div>
                  </div>
                )}
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
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              🚧 开发模式说明
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 这是开发版本，转换功能为模拟实现</li>
              <li>• 实际转换需要后端服务支持</li>
              <li>• 当前进度：前端界面 ✅ | 后端API ⏳ | 视频处理服务 ✅</li>
              <li>
                • 访问{' '}
                <code className="bg-yellow-100 px-1 rounded">
                  localhost:3000
                </code>{' '}
                查看landing page
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
