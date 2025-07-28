/**
 * Cache utility functions for GetGoodTape using Cloudflare KV
 */

import { VideoMetadata, Platform, ConversionJob, Env } from '../types';

export class CacheManager {
  constructor(private env: Env) {}

  // Video Metadata Caching
  async cacheVideoMetadata(
    videoId: string,
    metadata: VideoMetadata,
    ttl: number = 3600
  ): Promise<void> {
    const key = `metadata:${videoId}`;
    await this.env.CACHE.put(key, JSON.stringify(metadata), {
      expirationTtl: ttl,
    });
  }

  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    const key = `metadata:${videoId}`;
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as VideoMetadata;
    } catch (error) {
      console.error('Failed to parse cached metadata:', error);
      return null;
    }
  }

  // Conversion Status Caching
  async cacheConversionStatus(
    jobId: string,
    status: ConversionJob['status'],
    progress: number,
    ttl: number = 1800
  ): Promise<void> {
    const key = `status:${jobId}`;
    const data = { status, progress, timestamp: Date.now() };
    await this.env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  }

  async getConversionStatus(
    jobId: string
  ): Promise<{
    status: ConversionJob['status'];
    progress: number;
    timestamp: number;
  } | null> {
    const key = `status:${jobId}`;
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached status:', error);
      return null;
    }
  }

  // Platform Information Caching
  async cachePlatforms(
    platforms: Platform[],
    ttl: number = 86400
  ): Promise<void> {
    const key = 'platforms';
    await this.env.CACHE.put(key, JSON.stringify(platforms), {
      expirationTtl: ttl,
    });
  }

  async getPlatforms(): Promise<Platform[] | null> {
    const key = 'platforms';
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as Platform[];
    } catch (error) {
      console.error('Failed to parse cached platforms:', error);
      return null;
    }
  }

  // Rate Limiting
  async checkRateLimit(
    ip: string,
    limit: number = 10,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    // Get current rate limit data
    const cached = await this.env.CACHE.get(key);
    let requests: number[] = [];

    if (cached) {
      try {
        const data = JSON.parse(cached);
        requests = data.requests || [];
      } catch (error) {
        console.error('Failed to parse rate limit data:', error);
      }
    }

    // Filter out old requests
    requests = requests.filter(timestamp => timestamp > windowStart);

    const allowed = requests.length < limit;
    const remaining = Math.max(0, limit - requests.length);
    const resetTime = requests.length > 0 ? requests[0] + window : now + window;

    if (allowed) {
      // Add current request
      requests.push(now);
      await this.env.CACHE.put(key, JSON.stringify({ requests }), {
        expirationTtl: window,
      });
    }

    return { allowed, remaining, resetTime };
  }

  // URL Validation Cache
  async cacheUrlValidation(
    url: string,
    isValid: boolean,
    platform?: string,
    ttl: number = 1800
  ): Promise<void> {
    const key = `url:${Buffer.from(url).toString('base64')}`;
    const data = { isValid, platform, timestamp: Date.now() };
    await this.env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  }

  async getUrlValidation(
    url: string
  ): Promise<{
    isValid: boolean;
    platform?: string;
    timestamp: number;
  } | null> {
    const key = `url:${Buffer.from(url).toString('base64')}`;
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached URL validation:', error);
      return null;
    }
  }

  // Generic Cache Operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await this.env.CACHE.put(key, JSON.stringify(value), options);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`Failed to parse cached value for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.env.CACHE.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const options = prefix ? { prefix } : undefined;
    const list = await this.env.CACHE.list(options);
    return list.keys.map(key => key.name);
  }

  // Cache Statistics
  async getCacheStats(): Promise<{
    metadataKeys: number;
    statusKeys: number;
    rateLimitKeys: number;
    urlValidationKeys: number;
    totalKeys: number;
  }> {
    const [
      metadataKeys,
      statusKeys,
      rateLimitKeys,
      urlValidationKeys,
      allKeys,
    ] = await Promise.all([
      this.env.CACHE.list({ prefix: 'metadata:' }),
      this.env.CACHE.list({ prefix: 'status:' }),
      this.env.CACHE.list({ prefix: 'rate:' }),
      this.env.CACHE.list({ prefix: 'url:' }),
      this.env.CACHE.list(),
    ]);

    return {
      metadataKeys: metadataKeys.keys.length,
      statusKeys: statusKeys.keys.length,
      rateLimitKeys: rateLimitKeys.keys.length,
      urlValidationKeys: urlValidationKeys.keys.length,
      totalKeys: allKeys.keys.length,
    };
  }

  // Cleanup expired entries (manual cleanup for debugging)
  async cleanup(): Promise<{ deleted: number }> {
    const allKeys = await this.env.CACHE.list();
    let deleted = 0;

    for (const key of allKeys.keys) {
      try {
        const value = await this.env.CACHE.get(key.name);
        if (!value) {
          deleted++;
        }
      } catch (error) {
        // Key might be expired or corrupted, try to delete it
        await this.env.CACHE.delete(key.name);
        deleted++;
      }
    }

    return { deleted };
  }
}
