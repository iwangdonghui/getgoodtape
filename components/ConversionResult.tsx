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
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      // 🚀 OPTIMIZED: Support direct R2 downloads and API fallback
      const isDirectR2Url =
        downloadUrl.includes('r2.cloudflarestorage.com') ||
        downloadUrl.includes('mock-r2-download.example.com');

      let fullDownloadUrl: string;

      if (isDirectR2Url) {
        // Direct R2 download - no API needed!
        fullDownloadUrl = downloadUrl;
        console.log('🚀 Using direct R2 download:', fullDownloadUrl);
      } else {
        // Fallback to API route for compatibility
        fullDownloadUrl = downloadUrl.startsWith('http')
          ? downloadUrl
          : downloadUrl;
        console.log('🔄 Using API fallback download:', fullDownloadUrl);
      }

      console.log('Download filename:', filename);
      console.log('Download format:', format);

      // Faster progress for direct downloads
      setDownloadProgress(isDirectR2Url ? 30 : 10);

      // Fetch the file
      const response = await fetch(fullDownloadUrl);

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      setDownloadProgress(50);

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

      setDownloadProgress(80);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setDownloadProgress(95);

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;

      // Extract filename with multiple fallback strategies
      let downloadFilename: string;

      // Strategy 1: Use video title if available (preferred)
      if (metadata?.title) {
        // Clean the title for use as filename
        const cleanTitle = metadata.title
          .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        downloadFilename = `${cleanTitle}.${format}`;
      }
      // Strategy 2: Use filename prop
      else if (filename) {
        downloadFilename = filename;
      }
      // Strategy 3: Use server's Content-Disposition header
      else if (serverFilename) {
        downloadFilename = serverFilename;
      }
      // Strategy 4: Extract from downloadUrl
      else if (downloadUrl) {
        const urlParts = downloadUrl.split('/');
        downloadFilename = urlParts[urlParts.length - 1];
      }
      // Strategy 5: Fallback
      else {
        downloadFilename = `converted.${format}`;
      }

      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      setDownloadProgress(100);

      // Track download
      console.log('Download completed:', filename);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError(
        error instanceof Error ? error.message : 'Download failed'
      );
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadError(null);
      }, 2000);
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
    <div className="mt-4 sm:mt-6 bg-gradient-to-br from-cream to-mint-green/20 border border-mint-green/30 rounded-xl p-4 sm:p-6">
      {/* Success Header */}
      <div className="flex items-center space-x-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-mint-green rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-lg sm:text-2xl text-deep-brown">✓</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-deep-brown">
            Conversion Complete!
          </h3>
          <p className="text-sm sm:text-base text-deep-brown/70">
            Your {format.toUpperCase()} file is ready for download
          </p>
        </div>
      </div>

      {/* 🚀 NEW: Download Method Indicator */}
      {downloadUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {downloadUrl.includes('r2.cloudflarestorage.com') ||
            downloadUrl.includes('mock-r2-download.example.com') ? (
              <>
                <span className="text-green-600">⚡</span>
                <span className="font-medium text-green-800">优化下载</span>
                <span className="text-green-700">
                  - 直接从R2存储下载，无API中转
                </span>
              </>
            ) : (
              <>
                <span className="text-blue-600">🔄</span>
                <span className="font-medium text-blue-800">标准下载</span>
                <span className="text-blue-700">- 通过API重定向下载</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* File Preview Card */}
      <div className="mb-6">
        <FilePreviewCard
          metadata={metadata}
          filename={filename}
          format={format}
          quality={quality}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          downloadError={downloadError}
        />
      </div>

      {/* Video Metadata (Expandable) */}
      {metadata && (
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center text-sm text-deep-brown hover:text-warm-orange transition-colors min-h-[44px] font-medium"
          >
            <span>Video Details {showDetails ? '(Hide)' : '(Show)'}</span>
          </button>

          {showDetails && (
            <div className="mt-3 p-3 sm:p-4 bg-cream rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="sm:col-span-2">
                  <span className="font-medium text-deep-brown">Title:</span>
                  <p className="mt-1 text-deep-brown/70 break-words">
                    {metadata.title}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-deep-brown">Uploader:</span>
                  <p className="mt-1 text-deep-brown/70 break-words">
                    {metadata.uploader}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-deep-brown">Duration:</span>
                  <p className="mt-1 text-deep-brown/70">
                    {formatDuration(metadata.duration)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-deep-brown">Format:</span>
                  <p className="mt-1 text-deep-brown/70">
                    {format.toUpperCase()} ({quality} quality)
                  </p>
                </div>
              </div>

              {metadata.thumbnail && (
                <div className="mt-4">
                  <span className="font-medium text-deep-brown">
                    Thumbnail:
                  </span>
                  <img
                    src={metadata.thumbnail}
                    alt="Video thumbnail"
                    className="mt-2 w-24 h-14 sm:w-32 sm:h-18 object-cover rounded border border-warm-orange/30"
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
          className="bg-warm-orange text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-warm-orange-hover transition-colors flex items-center justify-center min-h-[44px] touch-action-manipulation"
        >
          <span>Convert New File</span>
        </button>

        <button
          onClick={onReset}
          className="px-4 sm:px-6 py-3 text-deep-brown bg-cream border border-warm-orange/30 rounded-lg hover:bg-warm-orange/10 transition-colors flex items-center justify-center min-h-[44px] touch-action-manipulation"
        >
          <span>Back to Home</span>
        </button>
      </div>

      {/* Download Tips */}
      <div className="mt-4 p-3 bg-cream border border-warm-orange/30 rounded-lg">
        <h5 className="font-medium text-deep-brown mb-2 text-sm sm:text-base">
          Download Tips
        </h5>
        <ul className="text-xs sm:text-sm text-deep-brown/70 space-y-1">
          <li>
            • File will automatically start downloading to your default download
            folder
          </li>
          <li>
            • If download doesn't start, please check your browser's download
            settings
          </li>
          <li>• File link will expire after 24 hours</li>
          <li>
            • We recommend downloading immediately to avoid link expiration
          </li>
        </ul>
      </div>
    </div>
  );
}
