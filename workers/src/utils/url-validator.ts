/**
 * URL validation and platform detection utilities for GetGoodTape
 */

import { Platform, PlatformConfig, ErrorType, ApiError } from '../types';

export interface UrlValidationResult {
  isValid: boolean;
  platform?: Platform;
  error?: ApiError;
  videoId?: string;
  normalizedUrl?: string;
  metadata?: VideoMetadata;
}

export interface VideoMetadata {
  title?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  isLive?: boolean;
  isPrivate?: boolean;
}

export interface ValidationCache {
  url: string;
  result: UrlValidationResult;
  timestamp: number;
  expiresAt: number;
}

export interface PlatformPattern {
  name: string;
  domain: string;
  patterns: RegExp[];
  extractVideoId: (url: string) => string | null;
  supportedFormats: string[];
  maxDuration: number;
  qualityOptions: {
    mp3?: string[];
    mp4?: string[];
  };
}

/**
 * Platform detection patterns and configurations
 */
export const PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    name: 'YouTube',
    domain: 'youtube.com',
    patterns: [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/i,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\//i,
    ],
    extractVideoId: (url: string) => {
      const patterns = [
        /[?&]v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /embed\/([^?]+)/,
        /v\/([^?]+)/,
        /shorts\/([^?]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 7200, // 2 hours
    qualityOptions: {
      mp3: ['128', '192', '320'],
      mp4: ['360', '720', '1080'],
    },
  },
  {
    name: 'TikTok',
    domain: 'tiktok.com',
    patterns: [
      /^https?:\/\/(www\.)?(tiktok\.com\/@[^/]+\/video\/|vm\.tiktok\.com\/)/i,
    ],
    extractVideoId: (url: string) => {
      const patterns = [/\/video\/(\d+)/, /vm\.tiktok\.com\/([^/]+)/];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 600, // 10 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'X (Twitter)',
    domain: 'x.com',
    patterns: [
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^/]+\/status\/\d+/i,
    ],
    extractVideoId: (url: string) => {
      const match = url.match(/status\/(\d+)/);
      return match ? match[1] : null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 1200, // 20 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'Facebook',
    domain: 'facebook.com',
    patterns: [
      /^https?:\/\/(www\.)?(facebook\.com|fb\.watch)\/.*\/videos?\//i,
      /^https?:\/\/(www\.)?fb\.watch\/[^/]+/i,
    ],
    extractVideoId: (url: string) => {
      const patterns = [/videos?\/(\d+)/, /fb\.watch\/([^/?]+)/];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 3600, // 1 hour
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'Instagram',
    domain: 'instagram.com',
    patterns: [/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^/]+/i],
    extractVideoId: (url: string) => {
      const match = url.match(/\/(p|reel|tv)\/([^/?]+)/);
      return match ? match[2] : null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 900, // 15 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
];

/**
 * URL Validator class for platform detection and validation
 */
export class UrlValidator {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_DURATION_DEFAULT = 7200; // 2 hours

  /**
   * Validate a URL with metadata extraction (enhanced validation)
   */
  static async validateUrlWithMetadata(
    url: string,
    env?: any,
    skipCache = false
  ): Promise<UrlValidationResult> {
    // First do basic validation
    const basicValidation = this.validateUrl(url);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Check cache if available and not skipped
    if (!skipCache && env?.VALIDATION_CACHE) {
      const cached = await this.getCachedValidation(url, env.VALIDATION_CACHE);
      if (cached) {
        console.log(`✅ Validation cache hit for: ${url}`);
        return cached.result;
      }
    }

    try {
      // Call video processing service for metadata extraction
      const processingServiceUrl = env?.PROCESSING_SERVICE_URL || 'http://localhost:8000';

      console.log(`🔍 Extracting metadata for validation: ${url}`);

      const response = await fetch(`${processingServiceUrl}/extract-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          validate_only: true,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this.handleValidationError(new Error(`Metadata extraction failed: ${errorText}`), basicValidation);
      }

      const metadata = await response.json();

      // Enhanced validation with metadata
      const enhancedResult = await this.validateWithMetadata(basicValidation, metadata);

      // Cache the result if cache is available
      if (env?.VALIDATION_CACHE) {
        await this.cacheValidation(url, enhancedResult, env.VALIDATION_CACHE);
      }

      return enhancedResult;

    } catch (error) {
      console.warn(`⚠️ Metadata validation failed for ${url}:`, error);
      return this.handleValidationError(error as Error, basicValidation);
    }
  }

  /**
   * Validate a URL and detect its platform (basic validation)
   */
  static validateUrl(url: string): UrlValidationResult {
    // Basic URL format validation
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: 'URL is required and must be a string',
          retryable: false,
        },
      };
    }

    // Trim whitespace
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: 'URL cannot be empty',
          retryable: false,
        },
      };
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: 'Invalid URL format',
          retryable: false,
        },
      };
    }

    // Check if protocol is HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: 'URL must use HTTP or HTTPS protocol',
          retryable: false,
        },
      };
    }

    // Detect platform
    const platformPattern = this.detectPlatform(trimmedUrl);

    if (!platformPattern) {
      return {
        isValid: false,
        error: {
          type: ErrorType.UNSUPPORTED_PLATFORM,
          message:
            'This platform is not supported. Please use a supported video platform.',
          retryable: false,
        },
      };
    }

    // Extract video ID
    const videoId = platformPattern.extractVideoId(trimmedUrl);

    if (!videoId) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: 'Could not extract video ID from URL',
          retryable: false,
        },
      };
    }

    // Convert platform pattern to Platform interface
    const platform: Platform = {
      name: platformPattern.name,
      domain: platformPattern.domain,
      supportedFormats: platformPattern.supportedFormats,
      maxDuration: platformPattern.maxDuration,
      icon: this.getPlatformIcon(platformPattern.name),
      qualityOptions: platformPattern.qualityOptions,
    };

    return {
      isValid: true,
      platform,
      videoId,
      normalizedUrl: trimmedUrl,
    };
  }

  /**
   * Detect platform from URL
   */
  static detectPlatform(url: string): PlatformPattern | null {
    for (const platform of PLATFORM_PATTERNS) {
      for (const pattern of platform.patterns) {
        if (pattern.test(url)) {
          return platform;
        }
      }
    }
    return null;
  }

  /**
   * Get platform icon (placeholder for now)
   */
  static getPlatformIcon(platformName: string): string {
    const icons: Record<string, string> = {
      YouTube: '🎥',
      TikTok: '🎵',
      'X (Twitter)': '🐦',
      Facebook: '📘',
      Instagram: '📷',
    };
    return icons[platformName] || '🎬';
  }

  /**
   * Convert PlatformConfig from database to Platform interface
   */
  static convertPlatformConfig(config: PlatformConfig): Platform {
    let supportedFormats: string[] = [];
    let qualityOptions: { mp3?: string[]; mp4?: string[] } = {};

    try {
      supportedFormats = JSON.parse(config.supported_formats);
    } catch {
      supportedFormats = ['mp3', 'mp4'];
    }

    try {
      if (config.config) {
        const parsedConfig = JSON.parse(config.config);
        qualityOptions = parsedConfig.quality_options || {};
      }
    } catch {
      qualityOptions = {
        mp3: ['128', '192', '320'],
        mp4: ['360', '720', '1080'],
      };
    }

    return {
      name: config.name,
      domain: config.domain,
      supportedFormats,
      maxDuration: config.max_duration,
      icon: this.getPlatformIcon(config.name),
      qualityOptions,
    };
  }

  /**
   * Validate format and quality options
   */
  static validateFormatAndQuality(
    platform: Platform,
    format: string,
    quality: string
  ): { isValid: boolean; error?: ApiError } {
    // Check if format is supported
    if (!platform.supportedFormats.includes(format)) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: `Format ${format} is not supported for ${platform.name}`,
          retryable: false,
        },
      };
    }

    // Check if quality is supported
    const qualityOptions = platform.qualityOptions[format as 'mp3' | 'mp4'];
    if (qualityOptions && !qualityOptions.includes(quality)) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: `Quality ${quality} is not supported for ${format} on ${platform.name}`,
          retryable: false,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate URL with extracted metadata
   */
  private static async validateWithMetadata(
    basicValidation: UrlValidationResult,
    metadata: any
  ): Promise<UrlValidationResult> {
    const platform = basicValidation.platform!;

    // Check if video is private
    if (metadata.is_private) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: '该视频为私有视频，无法访问。请确认视频是公开的。',
          retryable: false,
        },
      };
    }

    // Check if video is live stream
    if (metadata.is_live) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: '暂不支持直播流转换。请等待直播结束后重试。',
          retryable: true,
        },
      };
    }

    // Check duration limit
    const duration = metadata.duration || 0;
    const maxDuration = platform.maxDuration || this.MAX_DURATION_DEFAULT;

    if (duration > maxDuration) {
      const durationStr = this.formatDuration(duration);
      const maxDurationStr = this.formatDuration(maxDuration);

      return {
        isValid: false,
        error: {
          type: ErrorType.DURATION_TOO_LONG,
          message: `视频时长 ${durationStr} 超过平台限制 ${maxDurationStr}。请选择较短的视频。`,
          retryable: false,
        },
      };
    }

    // Check if video exists and is accessible
    if (!metadata.title && !metadata.uploader) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: '无法访问该视频。请检查链接是否正确或视频是否已被删除。',
          retryable: true,
        },
      };
    }

    // Return enhanced validation result with metadata
    const videoMetadata: VideoMetadata = {
      title: metadata.title,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      uploader: metadata.uploader,
      uploadDate: metadata.upload_date,
      viewCount: metadata.view_count,
      isLive: metadata.is_live,
      isPrivate: metadata.is_private,
    };

    return {
      ...basicValidation,
      metadata: videoMetadata,
    };
  }

  /**
   * Handle validation errors with user-friendly messages
   */
  private static handleValidationError(
    error: Error,
    basicValidation: UrlValidationResult
  ): UrlValidationResult {
    const errorMessage = error.message.toLowerCase();

    // Network or timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.NETWORK_ERROR,
          message: '网络连接超时。请检查网络连接后重试。',
          retryable: true,
        },
      };
    }

    // YouTube specific errors
    if (errorMessage.includes('sign in to confirm') || errorMessage.includes('private')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.ACCESS_DENIED,
          message: '该视频需要登录或为私有视频。请确认视频是公开可访问的。',
          retryable: false,
        },
      };
    }

    // Video not found
    if (errorMessage.includes('not found') || errorMessage.includes('unavailable')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.INVALID_URL,
          message: '视频不存在或已被删除。请检查链接是否正确。',
          retryable: false,
        },
      };
    }

    // Geo-blocking
    if (errorMessage.includes('not available') || errorMessage.includes('region')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.ACCESS_DENIED,
          message: '该视频在当前地区不可用。请尝试使用其他地区的视频链接。',
          retryable: false,
        },
      };
    }

    // Age restriction
    if (errorMessage.includes('age') || errorMessage.includes('restricted')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.ACCESS_DENIED,
          message: '该视频有年龄限制。请确认视频是公开可访问的。',
          retryable: false,
        },
      };
    }

    // Copyright issues
    if (errorMessage.includes('copyright') || errorMessage.includes('blocked')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.ACCESS_DENIED,
          message: '该视频因版权问题无法访问。请选择其他视频。',
          retryable: false,
        },
      };
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.RATE_LIMIT_EXCEEDED,
          message: '请求过于频繁。请稍后重试。',
          retryable: true,
        },
      };
    }

    // Platform specific errors
    if (errorMessage.includes('youtube') && errorMessage.includes('quota')) {
      return {
        isValid: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'YouTube API 配额已用完。请稍后重试或联系管理员。',
          retryable: true,
        },
      };
    }

    // Fallback to basic validation if metadata extraction fails
    console.warn(`Metadata validation failed, falling back to basic validation: ${error.message}`);
    return {
      ...basicValidation,
      error: {
        type: ErrorType.VALIDATION_WARNING,
        message: '无法获取视频详细信息，但链接格式正确。转换可能仍然成功。',
        retryable: true,
      },
    };
  }

  /**
   * Get cached validation result
   */
  private static async getCachedValidation(
    url: string,
    cache: any
  ): Promise<ValidationCache | null> {
    try {
      const cacheKey = `validation:${this.generateCacheKey(url)}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        const parsedCache: ValidationCache = JSON.parse(cached);

        // Check if cache is still valid
        if (Date.now() < parsedCache.expiresAt) {
          return parsedCache;
        }

        // Remove expired cache
        await cache.delete(cacheKey);
      }
    } catch (error) {
      console.warn('Failed to get cached validation:', error);
    }

    return null;
  }

  /**
   * Cache validation result
   */
  private static async cacheValidation(
    url: string,
    result: UrlValidationResult,
    cache: any
  ): Promise<void> {
    try {
      const cacheKey = `validation:${this.generateCacheKey(url)}`;
      const cacheData: ValidationCache = {
        url,
        result,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
      };

      await cache.put(cacheKey, JSON.stringify(cacheData), {
        expirationTtl: Math.floor(this.CACHE_DURATION / 1000),
      });

      console.log(`💾 Cached validation result for: ${url}`);
    } catch (error) {
      console.warn('Failed to cache validation:', error);
    }
  }

  /**
   * Generate cache key for URL
   */
  private static generateCacheKey(url: string): string {
    // Normalize URL for consistent caching
    try {
      const parsedUrl = new URL(url);
      // Remove tracking parameters
      const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
      return btoa(cleanUrl).replace(/[^a-zA-Z0-9]/g, '');
    } catch {
      return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  /**
   * Format duration in human-readable format
   */
  private static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
    }
  }

  /**
   * Get error suggestions based on error type and platform
   */
  static getErrorSuggestions(error: ApiError, platform?: Platform): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case ErrorType.INVALID_URL:
        suggestions.push('请检查URL格式是否正确');
        suggestions.push('确保链接是完整的视频页面URL');
        if (platform) {
          suggestions.push(`确保链接来自 ${platform.name} 平台`);
        }
        break;

      case ErrorType.ACCESS_DENIED:
        suggestions.push('确认视频是公开的，不需要登录');
        suggestions.push('检查视频是否有地区限制');
        suggestions.push('尝试使用其他公开视频');
        break;

      case ErrorType.DURATION_TOO_LONG:
        suggestions.push('选择时长较短的视频');
        if (platform) {
          suggestions.push(`${platform.name} 平台限制：最长 ${this.formatDuration(platform.maxDuration)}`);
        }
        suggestions.push('考虑分段下载长视频');
        break;

      case ErrorType.NETWORK_ERROR:
        suggestions.push('检查网络连接是否正常');
        suggestions.push('稍后重试');
        suggestions.push('尝试刷新页面');
        break;

      case ErrorType.RATE_LIMIT_EXCEEDED:
        suggestions.push('等待几分钟后重试');
        suggestions.push('避免频繁提交请求');
        break;

      default:
        suggestions.push('请重试或联系技术支持');
        break;
    }

    return suggestions;
  }
}
