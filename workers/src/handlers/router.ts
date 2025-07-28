import { Hono } from 'hono';
import { DatabaseManager } from '../utils/database';
import { CacheManager } from '../utils/cache';
import { UrlValidator } from '../utils/url-validator';
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

    // TODO: Implement actual conversion logic
    return c.json({
      message:
        'Conversion endpoint - validation passed, conversion logic to be implemented',
      validation: {
        platform: validation.platform?.name,
        videoId: validation.videoId,
        format: body.format,
        quality: body.quality,
      },
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
  const jobId = c.req.param('jobId');
  // TODO: Implement status check logic
  return c.json({ jobId, message: 'Status endpoint - to be implemented' });
});

// Download proxy endpoint
router.get('/download/:fileId', async c => {
  const fileId = c.req.param('fileId');
  // TODO: Implement download logic
  return c.json({ fileId, message: 'Download endpoint - to be implemented' });
});
