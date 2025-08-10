/**
 * Platform-Specific Error Handling System
 * Provides comprehensive error classification, detection, and recovery strategies
 * for different video platforms (YouTube, Twitter/X, TikTok, Instagram, etc.)
 */

import { ErrorType } from '../types';

export interface PlatformErrorClassification {
  type: ErrorType;
  platform: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  fallbackActions: string[];
  userMessage: string;
  technicalMessage: string;
  suggestion?: string;
  alertRequired: boolean;
  estimatedRecoveryTime?: number; // in seconds
}

export interface PlatformErrorPattern {
  platform: string;
  patterns: RegExp[];
  classification: PlatformErrorClassification;
}

/**
 * Platform-specific error patterns and classifications
 */
export const PLATFORM_ERROR_PATTERNS: PlatformErrorPattern[] = [
  // YouTube Error Patterns
  {
    platform: 'youtube',
    patterns: [
      /sign in to confirm/i,
      /this video is not available/i,
      /video unavailable/i,
      /private video/i,
      /members-only content/i,
    ],
    classification: {
      type: ErrorType.ACCESS_DENIED,
      platform: 'youtube',
      severity: 'high',
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackActions: [],
      userMessage:
        'This YouTube video requires sign-in or is private. Please use a public video.',
      technicalMessage: 'YouTube access denied - video requires authentication',
      suggestion:
        'Try using a different public YouTube video, or use videos from other platforms like Twitter/X or TikTok.',
      alertRequired: false,
      estimatedRecoveryTime: 0,
    },
  },
  {
    platform: 'youtube',
    patterns: [
      /anti-bot/i,
      /bot detection/i,
      /too many requests/i,
      /rate limit/i,
      /temporarily restricted/i,
      /access from your location/i,
    ],
    classification: {
      type: ErrorType.ACCESS_DENIED,
      platform: 'youtube',
      severity: 'medium',
      retryable: true,
      maxRetries: 3,
      backoffStrategy: 'exponential',
      fallbackActions: [
        'use_proxy',
        'try_alternative_client',
        'wait_and_retry',
      ],
      userMessage:
        'YouTube has temporarily restricted access. Trying alternative methods...',
      technicalMessage: 'YouTube anti-bot detection triggered',
      suggestion:
        'This is a temporary YouTube restriction. Try again in a few minutes, or use videos from other platforms.',
      alertRequired: false,
      estimatedRecoveryTime: 300, // 5 minutes
    },
  },
  {
    platform: 'youtube',
    patterns: [/video too long/i, /duration exceeds/i, /maximum length/i],
    classification: {
      type: ErrorType.VIDEO_TOO_LONG,
      platform: 'youtube',
      severity: 'medium',
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackActions: ['suggest_shorter_video'],
      userMessage:
        'This video is too long for conversion. Please use a shorter video.',
      technicalMessage: 'Video duration exceeds maximum allowed length',
      suggestion:
        'Try using videos shorter than 10 minutes, or use audio-only format (MP3) for longer videos.',
      alertRequired: false,
    },
  },
  {
    platform: 'youtube',
    patterns: [/age.restricted/i, /age verification/i, /mature content/i],
    classification: {
      type: ErrorType.ACCESS_DENIED,
      platform: 'youtube',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      backoffStrategy: 'linear',
      fallbackActions: ['try_alternative_client'],
      userMessage:
        'This video has age restrictions. Trying alternative access methods...',
      technicalMessage: 'YouTube age-restricted content detected',
      suggestion:
        'Age-restricted videos may not always be accessible. Try using non-restricted content.',
      alertRequired: false,
    },
  },

  // Twitter/X Error Patterns
  {
    platform: 'twitter',
    patterns: [
      /tweet not found/i,
      /this tweet is unavailable/i,
      /protected tweets/i,
      /account suspended/i,
    ],
    classification: {
      type: ErrorType.VIDEO_NOT_FOUND,
      platform: 'twitter',
      severity: 'high',
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackActions: [],
      userMessage: 'This tweet is not available or has been deleted.',
      technicalMessage: 'Twitter content not accessible',
      suggestion:
        'Please check if the tweet exists and is public. Try using a different tweet.',
      alertRequired: false,
    },
  },
  {
    platform: 'twitter',
    patterns: [/rate limit exceeded/i, /too many requests/i, /api limit/i],
    classification: {
      type: ErrorType.RATE_LIMIT_EXCEEDED,
      platform: 'twitter',
      severity: 'low',
      retryable: true,
      maxRetries: 5,
      backoffStrategy: 'exponential',
      fallbackActions: ['wait_and_retry', 'use_alternative_api'],
      userMessage: 'Twitter rate limit reached. Waiting before retry...',
      technicalMessage: 'Twitter API rate limit exceeded',
      suggestion:
        'Please wait a moment and try again. Twitter limits how many requests we can make.',
      alertRequired: false,
      estimatedRecoveryTime: 900, // 15 minutes
    },
  },

  // TikTok Error Patterns
  {
    platform: 'tiktok',
    patterns: [
      /video not available/i,
      /content not found/i,
      /private account/i,
      /region blocked/i,
    ],
    classification: {
      type: ErrorType.VIDEO_NOT_FOUND,
      platform: 'tiktok',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      backoffStrategy: 'linear',
      fallbackActions: ['try_alternative_region', 'use_proxy'],
      userMessage:
        'This TikTok video is not available. Trying alternative access methods...',
      technicalMessage: 'TikTok content access restricted',
      suggestion:
        'The video might be region-restricted or from a private account. Try using a different TikTok video.',
      alertRequired: false,
    },
  },

  // Instagram Error Patterns
  {
    platform: 'instagram',
    patterns: [
      /login required/i,
      /private account/i,
      /content not available/i,
      /post not found/i,
    ],
    classification: {
      type: ErrorType.ACCESS_DENIED,
      platform: 'instagram',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      backoffStrategy: 'linear',
      fallbackActions: ['try_alternative_method'],
      userMessage:
        'This Instagram content requires login or is private. Trying alternative methods...',
      technicalMessage: 'Instagram access restricted',
      suggestion:
        'Make sure the Instagram post is public. Private posts cannot be converted.',
      alertRequired: false,
    },
  },

  // Generic Network Errors
  {
    platform: 'generic',
    patterns: [
      /network error/i,
      /connection timeout/i,
      /connection refused/i,
      /dns resolution failed/i,
      /ssl error/i,
      /certificate error/i,
    ],
    classification: {
      type: ErrorType.NETWORK_ERROR,
      platform: 'generic',
      severity: 'medium',
      retryable: true,
      maxRetries: 3,
      backoffStrategy: 'exponential',
      fallbackActions: ['retry_with_backoff', 'use_alternative_dns'],
      userMessage:
        'Network connection issue. Retrying with different settings...',
      technicalMessage: 'Network connectivity problem',
      suggestion:
        'This appears to be a temporary network issue. Please try again in a moment.',
      alertRequired: false,
      estimatedRecoveryTime: 60,
    },
  },

  // Generic Conversion Errors
  {
    platform: 'generic',
    patterns: [
      /conversion failed/i,
      /encoding error/i,
      /ffmpeg error/i,
      /format not supported/i,
    ],
    classification: {
      type: ErrorType.CONVERSION_FAILED,
      platform: 'generic',
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      backoffStrategy: 'linear',
      fallbackActions: ['try_different_format', 'reduce_quality'],
      userMessage: 'Conversion failed. Trying with different settings...',
      technicalMessage: 'Video conversion process failed',
      suggestion: 'Try selecting a different quality or format option.',
      alertRequired: false,
    },
  },
];

/**
 * Platform-specific fallback strategies
 */
export const PLATFORM_FALLBACK_STRATEGIES = {
  youtube: {
    primary: ['ios_client', 'android_client', 'web_client'],
    secondary: ['use_proxy', 'try_api_fallback'],
    emergency: ['suggest_alternative_platform'],
  },
  twitter: {
    primary: ['syndication_api', 'legacy_api'],
    secondary: ['use_proxy', 'wait_and_retry'],
    emergency: ['suggest_alternative_platform'],
  },
  tiktok: {
    primary: ['mobile_api', 'web_scraping'],
    secondary: ['use_proxy', 'try_different_region'],
    emergency: ['suggest_alternative_platform'],
  },
  instagram: {
    primary: ['public_api', 'web_scraping'],
    secondary: ['use_proxy'],
    emergency: ['suggest_alternative_platform'],
  },
  generic: {
    primary: ['retry_with_backoff'],
    secondary: ['use_proxy', 'try_alternative_dns'],
    emergency: ['manual_intervention_required'],
  },
};

/**
 * Platform Error Handler Class
 */
export class PlatformErrorHandler {
  /**
   * Classify an error based on platform and error message
   */
  static classifyError(
    error: Error | string,
    platform: string,
    url?: string
  ): PlatformErrorClassification {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const detectedPlatform = platform || this.detectPlatformFromUrl(url || '');

    // Find matching error pattern
    for (const pattern of PLATFORM_ERROR_PATTERNS) {
      if (
        pattern.platform === detectedPlatform ||
        pattern.platform === 'generic'
      ) {
        for (const regex of pattern.patterns) {
          if (regex.test(errorMessage)) {
            return {
              ...pattern.classification,
              platform: detectedPlatform,
            };
          }
        }
      }
    }

    // Default classification for unknown errors
    return {
      type: ErrorType.SERVER_ERROR,
      platform: detectedPlatform,
      severity: 'medium',
      retryable: true,
      maxRetries: 2,
      backoffStrategy: 'linear',
      fallbackActions: ['retry_with_backoff'],
      userMessage: 'An unexpected error occurred. Retrying...',
      technicalMessage: `Unclassified error: ${errorMessage}`,
      suggestion:
        'Please try again. If the problem persists, try using a different video.',
      alertRequired: false,
    };
  }

  /**
   * Detect platform from URL
   */
  static detectPlatformFromUrl(url: string): string {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    }
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'twitter';
    }
    if (urlLower.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (urlLower.includes('instagram.com')) {
      return 'instagram';
    }
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
      return 'facebook';
    }
    if (urlLower.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (urlLower.includes('dailymotion.com')) {
      return 'dailymotion';
    }

    return 'generic';
  }

  /**
   * Get platform-specific recovery suggestions
   */
  static getRecoverySuggestions(
    platform: string,
    errorType: ErrorType
  ): string[] {
    const suggestions: string[] = [];

    switch (platform) {
      case 'youtube':
        if (errorType === ErrorType.ACCESS_DENIED) {
          suggestions.push(
            'Try using a different YouTube video that is publicly accessible',
            'Use videos from other platforms like Twitter/X, TikTok, or Instagram',
            'Wait a few minutes and try again - YouTube restrictions are often temporary'
          );
        } else if (errorType === ErrorType.VIDEO_TOO_LONG) {
          suggestions.push(
            'Use videos shorter than 10 minutes',
            'Try converting to MP3 format for longer videos',
            'Look for shorter clips or highlights of the same content'
          );
        }
        break;

      case 'twitter':
        suggestions.push(
          'Make sure the tweet is public and not from a protected account',
          'Check if the tweet contains video content',
          'Try using the direct video URL if available'
        );
        break;

      case 'tiktok':
        suggestions.push(
          'Ensure the TikTok video is from a public account',
          'Try using a different TikTok video',
          'Check if the video is available in your region'
        );
        break;

      case 'instagram':
        suggestions.push(
          'Make sure the Instagram post is public',
          'Try using Instagram Reels or IGTV links',
          'Verify the post contains video content'
        );
        break;

      default:
        suggestions.push(
          'Try again in a few minutes',
          'Check your internet connection',
          'Use a different video URL'
        );
    }

    return suggestions;
  }

  /**
   * Get platform-specific user-friendly error message
   */
  static getUserFriendlyMessage(
    classification: PlatformErrorClassification,
    includeRecoveryTime: boolean = true
  ): string {
    let message = classification.userMessage;

    if (includeRecoveryTime && classification.estimatedRecoveryTime) {
      const minutes = Math.ceil(classification.estimatedRecoveryTime / 60);
      message += ` (Estimated recovery time: ${minutes} minute${minutes > 1 ? 's' : ''})`;
    }

    if (classification.suggestion) {
      message += `\n\nSuggestion: ${classification.suggestion}`;
    }

    return message;
  }

  /**
   * Determine if error should trigger fallback strategy
   */
  static shouldUseFallback(
    classification: PlatformErrorClassification
  ): boolean {
    return (
      classification.retryable && classification.fallbackActions.length > 0
    );
  }

  /**
   * Get next fallback action for a platform
   */
  static getNextFallbackAction(
    platform: string,
    attemptCount: number
  ): string | null {
    const strategies =
      PLATFORM_FALLBACK_STRATEGIES[platform] ||
      PLATFORM_FALLBACK_STRATEGIES.generic;

    if (attemptCount === 0 && strategies.primary.length > 0) {
      return strategies.primary[0];
    } else if (attemptCount === 1 && strategies.secondary.length > 0) {
      return strategies.secondary[0];
    } else if (attemptCount >= 2 && strategies.emergency.length > 0) {
      return strategies.emergency[0];
    }

    return null;
  }

  /**
   * Check if platform is currently experiencing known issues
   */
  static isPlatformDegraded(platform: string): boolean {
    // This could be enhanced to check against a real-time status API
    // For now, we'll implement basic logic

    switch (platform) {
      case 'youtube':
        // YouTube is frequently restricted, so we consider it degraded
        return true;
      case 'twitter':
      case 'tiktok':
      case 'instagram':
        // These platforms are generally more stable
        return false;
      default:
        return false;
    }
  }

  /**
   * Get platform reliability score (0-100)
   */
  static getPlatformReliabilityScore(platform: string): number {
    switch (platform) {
      case 'twitter':
        return 85; // High reliability
      case 'tiktok':
        return 80; // Good reliability
      case 'instagram':
        return 75; // Good reliability
      case 'youtube':
        return 45; // Lower reliability due to restrictions
      case 'facebook':
        return 60; // Medium reliability
      case 'vimeo':
        return 90; // Very high reliability
      default:
        return 70; // Default medium-high reliability
    }
  }
}
