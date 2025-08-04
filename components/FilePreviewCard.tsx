import { formatDuration } from '../lib/api-client';

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
}

interface FilePreviewCardProps {
  metadata?: VideoMetadata;
  filename?: string;
  format: 'mp3' | 'mp4';
  quality: string;
  onDownload: () => void;
  isDownloading: boolean;
  downloadProgress?: number;
  downloadError?: string | null;
}

export default function FilePreviewCard({
  metadata,
  filename,
  format,
  quality,
  onDownload,
  isDownloading,
  downloadProgress = 0,
  downloadError,
}: FilePreviewCardProps) {
  const getQualityLabel = () => {
    if (format === 'mp3') {
      switch (quality) {
        case 'high':
          return '320kbps';
        case 'medium':
          return '128kbps';
        case 'low':
          return '96kbps';
        default:
          return quality;
      }
    } else {
      switch (quality) {
        case 'high':
          return '720p';
        case 'medium':
          return '360p';
        case 'low':
          return '360p';
        default:
          return quality;
      }
    }
  };

  const getFileIcon = () => {
    return format === 'mp3' ? '🎵' : '🎬';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm mx-auto">
      {/* Thumbnail Area */}
      <div className="relative h-36 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200">
        {metadata?.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.title || 'Video thumbnail'}
            className="w-full h-full object-cover"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className =
                  'w-full h-full bg-gradient-to-br from-warm-orange to-tape-gold flex items-center justify-center text-4xl sm:text-6xl text-white';
                fallback.innerHTML = getFileIcon();
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-warm-orange to-tape-gold flex items-center justify-center text-4xl sm:text-6xl text-white">
            {getFileIcon()}
          </div>
        )}

        {/* Format Label */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-black/70 text-white px-2 py-1 rounded text-xs sm:text-sm font-medium">
          {format.toUpperCase()}
        </div>

        {/* Duration Label */}
        {metadata?.duration && (
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/70 text-white px-2 py-1 rounded text-xs sm:text-sm font-medium">
            {formatDuration(metadata.duration)}
          </div>
        )}
      </div>

      {/* File Information Area */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-deep-brown text-base sm:text-lg mb-2 line-clamp-2 break-words">
          {metadata?.title ||
            filename ||
            `Converted ${format.toUpperCase()} file`}
        </h3>

        <div className="flex items-center justify-between text-xs sm:text-sm text-deep-brown/70 mb-3 sm:mb-4">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-warm-orange rounded-full"></span>
            <span>{getQualityLabel()}</span>
          </span>

          {metadata?.uploader && (
            <span
              className="truncate max-w-20 sm:max-w-32"
              title={metadata.uploader}
            >
              {metadata.uploader}
            </span>
          )}
        </div>

        {/* Download Progress Bar */}
        {isDownloading && downloadProgress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-deep-brown/70 mb-1">
              <span>Downloading...</span>
              <span>{Math.round(downloadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-mint-green h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Error */}
        {downloadError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {downloadError}
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="w-full bg-mint-green hover:bg-mint-green-hover text-deep-brown py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] touch-action-manipulation"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-deep-brown border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm sm:text-base">
                {downloadProgress > 0
                  ? `${Math.round(downloadProgress)}%`
                  : 'Preparing...'}
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-base">Download File</span>
          )}
        </button>
      </div>
    </div>
  );
}
