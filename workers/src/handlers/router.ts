import { Hono } from 'hono';
import { DatabaseManager } from '../utils/database';
import { CacheManager } from '../utils/cache';
import { UrlValidator } from '../utils/url-validator';
import { ConversionService } from '../utils/conversion-service';
import { StorageManager } from '../utils/storage';
import { QueueManager } from '../utils/queue-manager';
import { ErrorType, ConvertRequest, PlatformsResponse, Env } from '../types';

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

    if (!validation.isValid) {
      return c.json(
        {
          isValid: false,
          error: validation.error,
        },
        400
      );
    }

    return c.json({
      isValid: true,
      platform: validation.platform,
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
            name: 'X (Twitter)',
            domain: 'x.com',
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

    const response: PlatformsResponse = { platforms };
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

    return c.json({
      success: true,
      jobId,
      status: 'queued',
      message: 'Conversion job started successfully',
      estimatedTime: '30-120 seconds',
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

// Download proxy endpoint
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

    return file;
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

export default router;
