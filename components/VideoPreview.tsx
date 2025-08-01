import React from 'react';

interface VideoPreviewProps {
  title?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  platform?: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const VideoPreview: React.FC<VideoPreviewProps> = ({
  title,
  thumbnail,
  duration,
  uploader,
  platform,
}) => {
  if (!title && !thumbnail) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4 animate-in slide-in-from-top-2 duration-300">
      <div className="flex gap-4">
        {/* Thumbnail */}
        {thumbnail && (
          <div className="relative flex-shrink-0">
            <img
              src={thumbnail}
              alt={title || 'Video thumbnail'}
              className="w-24 h-18 object-cover rounded-md"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {duration && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                {formatDuration(duration)}
              </div>
            )}
          </div>
        )}

        {/* Video Info */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-medium text-foreground text-sm leading-tight mb-1 line-clamp-2">
              {title}
            </h3>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {platform && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                {platform}
              </span>
            )}
            {uploader && <span>by {uploader}</span>}
          </div>

          {duration && !thumbnail && (
            <div className="mt-1 text-xs text-muted-foreground">
              Duration: {formatDuration(duration)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
