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
  /**
   * Validate a URL and detect its platform
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
}
