import { Hono } from 'hono';
import { DatabaseManager } from '../utils/database';
import { CacheManager } from '../utils/cache';
import { UrlValidator } from '../utils/url-validator';
import { ConversionService } from '../utils/conversion-service';
import { StorageManager } from '../utils/storage';
import { QueueManager } from '../utils/queue-manager';
import { FileCleanupService } from '../utils/file-cleanup';
import { getWebSocketManager } from './websocket';
import { ErrorType, ConvertRequest, Env } from '../types';

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube video metadata using YouTube Data API
 */
async function getYouTubeMetadata(url: string, apiKey: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found or private');
  }

  const video = data.items[0];
  const snippet = video.snippet;
  const contentDetails = video.contentDetails;
  const statistics = video.statistics;

  // Parse duration from ISO 8601 format (PT4M13S) to seconds
  const duration = parseDuration(contentDetails.duration);

  return {
    title: snippet.title,
    description: snippet.description,
    duration: duration,
    durationText: formatDuration(duration),
    thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    viewCount: statistics.viewCount ? parseInt(statistics.viewCount) : 0,
    likeCount: statistics.likeCount ? parseInt(statistics.likeCount) : 0,
    videoId: videoId,
    platform: 'YouTube',
  };
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export const router = new Hono<{ Bindings: Env }>();

// URL validation endpoint
router.post('/validate', async c => {
  try {
    const body = (await c.req.json()) as { url: string };

    if (!body.url) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'URL is required',
            retryable: false,
          },
        },
        400
      );
    }

    // Check cache first (only if CACHE is available)
    let cachedValidation = null;
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        cachedValidation = await cache.getUrlValidation(body.url);

        if (cachedValidation) {
          return c.json({
            isValid: cachedValidation.isValid,
            platform: cachedValidation.platform,
            cached: true,
            timestamp: cachedValidation.timestamp,
          });
        }
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }

    // Validate URL
    const validation = UrlValidator.validateUrl(body.url);

    if (!validation.isValid) {
      return c.json(
        {
          isValid: false,
          error: validation.error,
        },
        400
      );
    }

    // Try to get metadata immediately for all platforms
    let videoMetadata = null;
    console.log('🔍 Attempting to fetch metadata for platform:', {
      platformName: validation.platform?.name,
      url: body.url,
    });

    // For YouTube URLs, try YouTube API first (faster and more reliable)
    if (validation.platform?.name === 'YouTube' && c.env.YOUTUBE_API_KEY) {
      try {
        console.log(
          '🎯 YouTube URL detected - fetching metadata via YouTube API'
        );
        videoMetadata = await getYouTubeMetadata(
          body.url,
          c.env.YOUTUBE_API_KEY
        );
        console.log('✅ YouTube metadata fetched successfully via API:', {
          title: videoMetadata?.title,
          duration: videoMetadata?.duration,
        });
      } catch (error) {
        console.error(
          '❌ YouTube API failed, will try video-processor:',
          error
        );
      }
    }

    // If YouTube API failed or it's not YouTube, try video-processor for all platforms
    if (!videoMetadata && c.env.PROCESSING_SERVICE_URL) {
      try {
        console.log(
          '🎯 Fetching metadata via video-processor for:',
          validation.platform?.name
        );
        const metadataResponse = await fetch(
          `${c.env.PROCESSING_SERVICE_URL}/extract-metadata`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: body.url }),
          }
        );

        if (metadataResponse.ok) {
          const metadataResult = (await metadataResponse.json()) as {
            success: boolean;
            metadata?: {
              title: string;
              description?: string;
              duration: number;
              duration_text?: string;
              thumbnail?: string;
              uploader?: string;
              upload_date?: string;
              view_count?: number;
              like_count?: number;
              id?: string;
            };
          };
          if (metadataResult.success && metadataResult.metadata) {
            videoMetadata = {
              title: metadataResult.metadata.title,
              description: metadataResult.metadata.description,
              duration: metadataResult.metadata.duration,
              durationText: metadataResult.metadata.duration_text,
              thumbnail: metadataResult.metadata.thumbnail,
              channelTitle: metadataResult.metadata.uploader,
              uploader: metadataResult.metadata.uploader,
              publishedAt: metadataResult.metadata.upload_date,
              viewCount: metadataResult.metadata.view_count,
              likeCount: metadataResult.metadata.like_count,
              videoId: metadataResult.metadata.id,
              platform: validation.platform?.name,
            };
            console.log(
              '✅ Metadata fetched successfully via video-processor:',
              {
                title: videoMetadata?.title,
                duration: videoMetadata?.duration,
              }
            );
          }
        } else {
          console.error(
            '❌ Video-processor metadata extraction failed:',
            metadataResponse.status
          );
        }
      } catch (error) {
        console.error('❌ Video-processor request failed:', error);
      }
    }

    if (!videoMetadata) {
      console.log('⚠️ No metadata could be fetched for this URL');
    }

    // Cache the result (only if CACHE is available)
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        await cache.cacheUrlValidation(
          body.url,
          validation.isValid,
          validation.platform?.name
        );
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }

    return c.json({
      isValid: true,
      platform: validation.platform,
      metadata: videoMetadata, // Include metadata if available
      videoId: validation.videoId,
      normalizedUrl: validation.normalizedUrl,
    });
  } catch (error) {
    console.error('URL validation error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during URL validation',
          retryable: true,
        },
      },
      500
    );
  }
});

// Platform information endpoint
router.get('/platforms', async c => {
  try {
    let platforms = null;

    // Try to get from cache first (only if CACHE is available)
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        platforms = await cache.getPlatforms();
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }

    if (!platforms) {
      // Try to get from database (only if DB is available)
      if (c.env.DB) {
        try {
          const db = new DatabaseManager(c.env);
          const platformConfigs = await db.getAllPlatforms();

          // Convert to Platform interface
          platforms = platformConfigs.map(config =>
            UrlValidator.convertPlatformConfig(config)
          );

          // Cache the result (only if CACHE is available)
          if (c.env.CACHE) {
            try {
              const cache = new CacheManager(c.env);
              await cache.cachePlatforms(platforms);
            } catch (error) {
              console.warn('Cache error (continuing without cache):', error);
            }
          }
        } catch (error) {
          console.warn(
            'Database error, falling back to static platforms:',
            error
          );
        }
      }

      // Fallback to static platform data if no database
      if (!platforms) {
        platforms = [
          {
            name: 'YouTube',
            domain: 'youtube.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 7200,
            icon: '🎥',
            qualityOptions: {
              mp3: ['128', '192', '320'],
              mp4: ['360', '720', '1080'],
            },
          },
          {
            name: 'X (Twitter)',
            domain: 'x.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 1200,
            icon: '🐦',
            qualityOptions: {
              mp3: ['128', '192', '320'],
              mp4: ['360', '720', '1080'],
            },
          },
          {
            name: 'TikTok',
            domain: 'tiktok.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 600,
            icon: '🎵',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'Twitter',
            domain: 'twitter.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 1200,
            icon: '🐦',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'Facebook',
            domain: 'facebook.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 3600,
            icon: '📘',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'Instagram',
            domain: 'instagram.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 900,
            icon: '📷',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
        ];
      }
    }

    const response = { success: true, platforms };
    return c.json(response);
  } catch (error) {
    console.error('Platforms endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to fetch platform information',
          retryable: true,
        },
      },
      500
    );
  }
});

// Conversion endpoints
router.post('/convert', async c => {
  try {
    const body = (await c.req.json()) as ConvertRequest;

    // Validate required fields
    if (!body.url || !body.format || !body.quality) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'URL, format, and quality are required',
            retryable: false,
          },
        },
        400
      );
    }

    // Validate URL and detect platform
    const validation = UrlValidator.validateUrl(body.url);

    if (!validation.isValid) {
      return c.json(
        {
          error: validation.error,
        },
        400
      );
    }

    // Validate format and quality
    const formatValidation = UrlValidator.validateFormatAndQuality(
      validation.platform!,
      body.format,
      body.quality
    );

    if (!formatValidation.isValid) {
      return c.json(
        {
          error: formatValidation.error,
        },
        400
      );
    }

    // Add platform to request
    const conversionRequest: ConvertRequest = {
      ...body,
      platform: validation.platform?.name,
    };

    // Start conversion
    const conversionService = new ConversionService(c.env);
    const jobId = await conversionService.startConversion(conversionRequest);

    // Try to process immediately if capacity allows
    try {
      const queueManager = new QueueManager(c.env);
      const capacity = await queueManager.getCapacityInfo();

      if (capacity.availableSlots > 0) {
        // Process immediately in background
        c.executionCtx.waitUntil(
          conversionService
            .processConversion(jobId, conversionRequest)
            .catch(error =>
              console.error(`Immediate processing failed for ${jobId}:`, error)
            )
        );

        return c.json({
          success: true,
          jobId,
          status: 'processing',
          message: 'Conversion started immediately',
          estimatedTime: '30-120 seconds',
        });
      }
    } catch (error) {
      console.error('Failed to start immediate processing:', error);
    }

    return c.json({
      success: true,
      jobId,
      status: 'queued',
      message: 'Conversion job queued successfully',
      estimatedTime: '15-60 seconds',
    });
  } catch (error) {
    console.error('Conversion endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during conversion request',
          retryable: true,
        },
      },
      500
    );
  }
});

router.get('/status/:jobId', async c => {
  try {
    const jobId = c.req.param('jobId');

    if (!jobId) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'Job ID is required',
            retryable: false,
          },
        },
        400
      );
    }

    const conversionService = new ConversionService(c.env);
    const status = await conversionService.getConversionStatus(jobId);

    if (!status) {
      return c.json(
        {
          error: {
            type: ErrorType.VIDEO_NOT_FOUND,
            message: 'Job not found',
            retryable: false,
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during status check',
          retryable: true,
        },
      },
      500
    );
  }
});

// Get direct download URL (fast, bypasses proxy)
router.get('/download-url/:fileName', async c => {
  try {
    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }

    const storage = new StorageManager(c.env);

    try {
      const downloadUrl = await storage.generateDownloadUrl(fileName);

      return c.json({
        success: true,
        downloadUrl,
        expiresIn: 3600,
        message: 'Direct download URL generated successfully',
      });
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      return c.json(
        {
          error: {
            type: ErrorType.VIDEO_NOT_FOUND,
            message: 'File not found or unable to generate download URL',
            retryable: false,
          },
        },
        404
      );
    }
  } catch (error) {
    console.error('Download URL endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during URL generation',
          retryable: true,
        },
      },
      500
    );
  }
});

// Download proxy endpoint (fallback for compatibility)
router.get('/download/:fileName', async c => {
  try {
    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }

    const storage = new StorageManager(c.env);
    const file = await storage.getFile(fileName);

    if (!file) {
      return c.json(
        {
          error: {
            type: ErrorType.VIDEO_NOT_FOUND,
            message: 'File not found',
            retryable: false,
          },
        },
        404
      );
    }

    // Add download headers to trigger browser download
    const headers = new Headers(file.headers);
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(file.body, {
      status: file.status,
      headers,
    });
  } catch (error) {
    console.error('Download endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during file download',
          retryable: true,
        },
      },
      500
    );
  }
});

// File streaming endpoint for large files
router.get('/stream/:fileName', async c => {
  try {
    const fileName = c.req.param('fileName');
    const range = c.req.header('Range');

    if (!fileName) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }

    const storage = new StorageManager(c.env);

    if (range) {
      // Handle range requests for streaming
      const fileMetadata = await storage.getFileMetadata(fileName);
      if (!fileMetadata) {
        return c.json(
          {
            error: {
              type: ErrorType.VIDEO_NOT_FOUND,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }

      // Parse range header
      const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
      if (!rangeMatch) {
        return c.json(
          {
            error: {
              type: ErrorType.INVALID_URL,
              message: 'Invalid range header',
              retryable: false,
            },
          },
          400
        );
      }

      const start = parseInt(rangeMatch[1], 10);
      const fileSize = fileMetadata.size as number;
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;
      const contentLength = end - start + 1;

      // For now, return the full file since R2 range requests need special handling
      const file = await storage.getFile(fileName);
      if (!file) {
        return c.json(
          {
            error: {
              type: ErrorType.VIDEO_NOT_FOUND,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }

      return new Response(file.body, {
        status: 206, // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': contentLength.toString(),
          'Content-Type':
            file.headers.get('Content-Type') || 'application/octet-stream',
          'Accept-Ranges': 'bytes',
        },
      });
    } else {
      // Regular file request
      const file = await storage.getFile(fileName);
      if (!file) {
        return c.json(
          {
            error: {
              type: ErrorType.VIDEO_NOT_FOUND,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }

      const headers = new Headers(file.headers);
      headers.set('Accept-Ranges', 'bytes');

      return new Response(file.body, {
        status: file.status,
        headers,
      });
    }
  } catch (error) {
    console.error('Stream endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error during file streaming',
          retryable: true,
        },
      },
      500
    );
  }
});

// Admin/monitoring endpoints
router.get('/admin/jobs', async c => {
  try {
    // Simple authentication check (in production, use proper auth)
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = new DatabaseManager(c.env);
    const activeJobs = await db.getActiveConversionJobs();

    return c.json({
      success: true,
      jobs: activeJobs,
      count: activeJobs.length,
    });
  } catch (error) {
    console.error('Admin jobs endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

// Queue management endpoints
router.get('/admin/queue/stats', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const queueManager = new QueueManager(c.env);
    const stats = await queueManager.getQueueStats();
    const capacity = await queueManager.getCapacityInfo();

    return c.json({
      success: true,
      stats,
      capacity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Queue stats endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.get('/admin/queue/jobs/:status', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const status = c.req.param('status');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const queueManager = new QueueManager(c.env);
    const jobs = await queueManager.getJobsByStatus(status, limit, offset);

    return c.json({
      success: true,
      jobs,
      count: jobs.length,
      pagination: {
        limit,
        offset,
        hasMore: jobs.length === limit,
      },
    });
  } catch (error) {
    console.error('Queue jobs endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.post('/admin/queue/cleanup', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const olderThanHours = body.olderThanHours || 168; // Default: 7 days

    const queueManager = new QueueManager(c.env);
    const deletedCount = await queueManager.cleanupOldJobs(olderThanHours);
    const timeoutCount = await queueManager.handleTimeoutJobs();

    return c.json({
      success: true,
      deletedJobs: deletedCount,
      timeoutJobs: timeoutCount,
      message: `Cleaned up ${deletedCount} old jobs and reset ${timeoutCount} timeout jobs`,
    });
  } catch (error) {
    console.error('Queue cleanup endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.get('/admin/queue/position/:jobId', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('jobId');
    const queueManager = new QueueManager(c.env);
    const position = await queueManager.getJobQueuePosition(jobId);

    if (position === -1) {
      return c.json(
        {
          success: false,
          error: 'Job not found or not in queue',
        },
        404
      );
    }

    return c.json({
      success: true,
      jobId,
      position,
      message: `Job is at position ${position} in the queue`,
    });
  } catch (error) {
    console.error('Queue position endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

// File management endpoints
router.get('/admin/storage/stats', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const cleanupService = new FileCleanupService(c.env);
    const storageStats = await cleanupService.getStorageStats();
    const cleanupStats = cleanupService.getStats();

    return c.json({
      success: true,
      storage: storageStats,
      cleanup: cleanupStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Storage stats endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.post('/admin/storage/cleanup', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const cleanupType = body.type || 'all'; // 'all', 'age', 'size', 'orphaned'

    const cleanupService = new FileCleanupService(c.env);
    let result;

    switch (cleanupType) {
      case 'age': {
        result = await cleanupService.performCleanup();
        break;
      }
      case 'size': {
        const deletedBySize = await cleanupService.cleanupBySize();
        result = { filesDeleted: deletedBySize, type: 'size-based' };
        break;
      }
      case 'orphaned': {
        const deletedOrphaned = await cleanupService.cleanupOrphanedFiles();
        result = { filesDeleted: deletedOrphaned, type: 'orphaned' };
        break;
      }
      case 'all':
      default: {
        const cleanupResult = await cleanupService.performCleanup();
        const sizeResult = await cleanupService.cleanupBySize();
        const orphanedResult = await cleanupService.cleanupOrphanedFiles();
        result = {
          ...cleanupResult,
          additionalFilesDeleted: sizeResult + orphanedResult,
          type: 'comprehensive',
        };
        break;
      }
    }

    return c.json({
      success: true,
      result,
      message: `Cleanup completed: ${result.filesDeleted || 0} files processed`,
    });
  } catch (error) {
    console.error('Storage cleanup endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.get('/admin/storage/files', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const storage = new StorageManager(c.env);
    const files = await storage.listFiles();

    // Get metadata for each file
    const fileDetails = await Promise.all(
      files.slice(0, 100).map(async key => {
        // Limit to 100 files
        const fileName = key.replace('conversions/', '');
        const metadata = await storage.getFileMetadata(fileName);
        return {
          fileName,
          key,
          metadata,
        };
      })
    );

    return c.json({
      success: true,
      files: fileDetails,
      total: files.length,
      showing: Math.min(files.length, 100),
    });
  } catch (error) {
    console.error('Storage files endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

router.delete('/admin/storage/files/:fileName', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const fileName = c.req.param('fileName');
    if (!fileName) {
      return c.json(
        {
          error: {
            type: ErrorType.INVALID_URL,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }

    const storage = new StorageManager(c.env);
    const deleted = await storage.deleteFile(fileName);

    if (!deleted) {
      return c.json(
        {
          error: {
            type: ErrorType.VIDEO_NOT_FOUND,
            message: 'File not found or could not be deleted',
            retryable: false,
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      message: `File ${fileName} deleted successfully`,
    });
  } catch (error) {
    console.error('Storage delete endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

// WebSocket endpoint for real-time conversion updates
router.get('/ws', async c => {
  try {
    const wsManager = getWebSocketManager(c.env);
    return await wsManager.handleUpgrade(c);
  } catch (error) {
    console.error('WebSocket endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'WebSocket connection failed',
          retryable: true,
        },
      },
      500
    );
  }
});

// WebSocket connection info endpoint
router.get('/ws/info', async c => {
  try {
    const wsManager = getWebSocketManager(c.env);
    return c.json({
      success: true,
      activeConnections: wsManager.getConnectionCount(),
      endpoint: '/api/ws',
      protocols: ['websocket'],
    });
  } catch (error) {
    console.error('WebSocket info endpoint error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to get WebSocket info',
          retryable: true,
        },
      },
      500
    );
  }
});

// Test presigned URL generation endpoint
router.post('/test-presigned-url', async c => {
  try {
    const { PresignedUrlManager } = await import(
      '../utils/presigned-url-manager'
    );
    const presignedUrlManager = new PresignedUrlManager(c.env);

    const body = await c.req.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return c.json({ error: 'Missing filename or contentType' }, 400);
    }

    // Generate upload URL
    const uploadUrl = await presignedUrlManager.generateUploadUrl(
      filename,
      contentType,
      { test: 'true' }
    );

    // Generate download URL (using the same key)
    const downloadUrl = await presignedUrlManager.generateDownloadUrl(
      uploadUrl.key
    );

    return c.json({
      success: true,
      upload: uploadUrl,
      download: downloadUrl,
      message: 'Presigned URLs generated successfully',
    });
  } catch (error) {
    console.error('Test presigned URL error:', error);
    return c.json(
      {
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to generate presigned URLs',
          retryable: true,
        },
      },
      500
    );
  }
});

export default router;
