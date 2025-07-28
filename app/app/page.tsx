'use client';

import { useState } from 'react';
import Logo from '../../components/Logo';

export default function AppPage() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp3' | 'mp4'>('mp3');
  const [quality, setQuality] = useState('high');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    downloadUrl?: string;
    filename?: string;
    error?: string;
  } | null>(null);

  const supportedPlatforms = [
    {
      name: 'YouTube',
      pattern: 'youtube.com|youtu.be',
      example: 'https://www.youtube.com/watch?v=...',
    },
    {
      name: 'TikTok',
      pattern: 'tiktok.com',
      example: 'https://www.tiktok.com/@user/video/...',
    },
    {
      name: 'Twitter',
      pattern: 'twitter.com|x.com',
      example: 'https://twitter.com/user/status/...',
    },
    {
      name: 'Facebook',
      pattern: 'facebook.com',
      example: 'https://www.facebook.com/watch?v=...',
    },
    {
      name: 'Instagram',
      pattern: 'instagram.com',
      example: 'https://www.instagram.com/p/...',
    },
  ];

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
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="粘贴视频链接..."
                  className="w-full px-4 py-3 rounded-lg border border-warm-orange/30 focus:outline-none focus:ring-2 focus:ring-mint-green focus:border-transparent"
                  disabled={isConverting}
                  required
                />
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
                disabled={isConverting || !url.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConverting ? '转换中...' : '开始转换'}
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
                <div key={platform.name} className="bg-white/50 rounded-lg p-4">
                  <h4 className="font-medium text-deep-brown mb-1">
                    {platform.name}
                  </h4>
                  <p className="text-xs text-deep-brown/60">
                    {platform.example}
                  </p>
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
