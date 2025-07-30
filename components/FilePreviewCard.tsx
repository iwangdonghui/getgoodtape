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
}

export default function FilePreviewCard({
  metadata,
  filename,
  format,
  quality,
  onDownload,
  isDownloading,
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
      {/* 缩略图区域 */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
        {metadata?.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.title || '视频缩略图'}
            className="w-full h-full object-cover"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className =
                  'w-full h-full bg-gradient-to-br from-warm-orange to-tape-gold flex items-center justify-center text-6xl';
                fallback.innerHTML = getFileIcon();
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-warm-orange to-tape-gold flex items-center justify-center text-6xl">
            {getFileIcon()}
          </div>
        )}

        {/* 格式标签 */}
        <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
          {format.toUpperCase()}
        </div>

        {/* 时长标签 */}
        {metadata?.duration && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
            {formatDuration(metadata.duration)}
          </div>
        )}
      </div>

      {/* 文件信息区域 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
          {metadata?.title || filename || `转换后的${format.toUpperCase()}文件`}
        </h3>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>{getQualityLabel()}</span>
          </span>

          {metadata?.uploader && (
            <span className="truncate max-w-32" title={metadata.uploader}>
              {metadata.uploader}
            </span>
          )}
        </div>

        {/* 下载按钮 */}
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>下载中...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>下载文件</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
