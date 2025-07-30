import { useState } from 'react';
import { formatDuration } from '../lib/api-client';
import FilePreviewCard from './FilePreviewCard';

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
}

interface ConversionResultProps {
  downloadUrl?: string;
  filename?: string;
  metadata?: VideoMetadata;
  format: 'mp3' | 'mp4';
  quality: string;
  onReset: () => void;
  onNewConversion: () => void;
}

export default function ConversionResult({
  downloadUrl,
  filename,
  metadata,
  format,
  quality,
  onReset,
  onNewConversion,
}: ConversionResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setIsDownloading(true);
    try {
      // Ensure we use the correct URL - if it's relative, it will go through Next.js API routes
      const fullDownloadUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : downloadUrl; // Keep relative path for Next.js API routes

      console.log('Starting download from:', fullDownloadUrl);
      console.log('Download filename:', filename);
      console.log('Download format:', format);

      // Fetch the file as blob to handle CORS and ensure proper download
      const response = await fetch(fullDownloadUrl);

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      // Try to get filename from Content-Disposition header as backup
      const contentDisposition = response.headers.get('Content-Disposition');
      let serverFilename: string | undefined;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          serverFilename = filenameMatch[1];
          console.log('Server filename from header:', serverFilename);
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;

      // Extract filename with multiple fallback strategies
      let downloadFilename = filename;
      console.log('🔍 Download filename analysis:');
      console.log('  - filename prop:', filename);
      console.log('  - downloadUrl:', downloadUrl);
      console.log('  - format:', format);

      // Strategy 1: Use filename prop
      if (!downloadFilename) {
        console.log(
          'Filename prop is undefined, trying fallback strategies...'
        );

        // Strategy 2: Use server's Content-Disposition header
        if (serverFilename) {
          downloadFilename = serverFilename;
          console.log('Using server filename from header:', downloadFilename);
        }
        // Strategy 3: Extract from downloadUrl
        else if (downloadUrl) {
          const urlParts = downloadUrl.split('/');
          downloadFilename = urlParts[urlParts.length - 1];
          console.log('Using filename from URL:', downloadFilename);
        }
      } else {
        console.log('✅ Using filename prop directly:', downloadFilename);
      }

      link.download = downloadFilename || `converted.${format}`;
      console.log('🎯 Final download filename:', link.download);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      // Track download
      console.log('Download completed:', filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请稍后重试或联系客服。');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const getFileIcon = () => {
    return format === 'mp3' ? '🎵' : '🎬';
  };

  const getFileSizeEstimate = () => {
    if (!metadata?.duration) return 'Unknown';

    // Rough estimates based on format and quality
    const duration = metadata.duration;
    let sizePerSecond: number;

    if (format === 'mp3') {
      const bitrates = { low: 96, medium: 128, high: 320 };
      const bitrate = bitrates[quality as keyof typeof bitrates] || 128;
      sizePerSecond = (bitrate * 1000) / 8 / 1000; // KB per second
    } else {
      const bitrates = { low: 1000, medium: 2000, high: 4000 };
      const bitrate = bitrates[quality as keyof typeof bitrates] || 2000;
      sizePerSecond = (bitrate * 1000) / 8 / 1000; // KB per second
    }

    const totalSizeKB = duration * sizePerSecond;

    if (totalSizeKB < 1024) {
      return `~${Math.round(totalSizeKB)} KB`;
    } else {
      return `~${(totalSizeKB / 1024).toFixed(1)} MB`;
    }
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-green-50 to-mint-green/20 border border-green-200 rounded-xl p-6">
      {/* Success Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-2xl text-white">✓</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-deep-brown">转换完成！</h3>
          <p className="text-green-700">
            您的{format.toUpperCase()}文件已准备好下载
          </p>
        </div>
      </div>

      {/* 文件预览卡片 */}
      <div className="mb-6">
        <FilePreviewCard
          metadata={metadata}
          filename={filename}
          format={format}
          quality={quality}
          onDownload={handleDownload}
          isDownloading={isDownloading}
        />
      </div>

      {/* Video Metadata (Expandable) */}
      {metadata && (
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-sm text-deep-brown hover:text-warm-orange transition-colors"
          >
            <span>{showDetails ? '▼' : '▶'}</span>
            <span>视频详细信息</span>
          </button>

          {showDetails && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">标题:</span>
                  <p className="mt-1 text-gray-600">{metadata.title}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">上传者:</span>
                  <p className="mt-1 text-gray-600">{metadata.uploader}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">时长:</span>
                  <p className="mt-1 text-gray-600">
                    {formatDuration(metadata.duration)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">转换格式:</span>
                  <p className="mt-1 text-gray-600">
                    {format.toUpperCase()} ({quality} 质量)
                  </p>
                </div>
              </div>

              {metadata.thumbnail && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">缩略图:</span>
                  <img
                    src={metadata.thumbnail}
                    alt="Video thumbnail"
                    className="mt-2 w-32 h-18 object-cover rounded border"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onNewConversion}
          className="bg-warm-orange text-white px-8 py-3 rounded-lg font-semibold hover:bg-warm-orange/90 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🔄</span>
          <span>转换新文件</span>
        </button>

        <button
          onClick={onReset}
          className="px-6 py-3 text-deep-brown border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🏠</span>
          <span>返回首页</span>
        </button>
      </div>

      {/* Download Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-800 mb-2">💡 下载提示</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 文件将自动开始下载到您的默认下载文件夹</li>
          <li>• 如果下载没有开始，请检查浏览器的下载设置</li>
          <li>• 文件链接将在24小时后过期</li>
          <li>• 建议立即下载以避免链接失效</li>
        </ul>
      </div>
    </div>
  );
}
