// API client for GetGoodTape conversion service
import { apiCache, platformCache, withCache } from './cache-manager';

export interface ConvertRequest {
  url: string;
  format: 'mp3' | 'mp4';
  quality: string;
  platform?: string;
}

export interface ConvertResponse {
  success: boolean;
  jobId?: string;
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  filename?: string;
  queuePosition?: number;
  estimatedTimeRemaining?: number;
  metadata?: {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface StatusResponse {
  success: boolean;
  // Success case - API returns flat structure, not nested
  jobId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  downloadUrl?: string;
  filename?: string;
  queuePosition?: number;
  estimatedTimeRemaining?: number;
  metadata?: {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
  };
  // Error cases
  error?:
    | string
    | {
        type: string;
        message: string;
        retryable: boolean;
      };
}

export interface PlatformInfo {
  name: string;
  supported: boolean;
  formats: string[];
  maxDuration?: number;
}

export interface PlatformsResponse {
  success: boolean;
  platforms?: PlatformInfo[];
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
}

export interface ValidationResponse {
  isValid: boolean;
  platform?:
    | string
    | {
        name: string;
        domain: string;
        supportedFormats: string[];
        maxDuration: number;
        icon: string;
        qualityOptions: Record<string, string[]>;
      };
  videoId?: string;
  normalizedUrl?: string;
  metadata?: {
    title?: string;
    duration?: number;
    thumbnail?: string;
  };
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Use relative API paths for local development, absolute for production
    this.baseUrl = '/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Re-throw with more context
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          'Network connection failed. Please check your internet connection.'
        );
      }
      throw error;
    }
  }

  /**
   * Start a new conversion job
   */
  async convert(request: ConvertRequest): Promise<ConvertResponse> {
    try {
      return await this.request<ConvertResponse>('/convert', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('Convert API error:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<StatusResponse> {
    try {
      return await this.request<StatusResponse>(`/status/${jobId}`);
    } catch (error) {
      console.error('Status API error:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
          retryable: true,
        },
      };
    }
  }

  /**
   * Validate URL and get platform info (with caching)
   */
  async validateUrl(url: string): Promise<ValidationResponse> {
    const cacheKey = `validate_${url}`;

    // 尝试从缓存获取
    const cached = apiCache.get<ValidationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.request<ValidationResponse>('/validate', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      // 只缓存有效的URL验证结果
      if (result.isValid) {
        apiCache.set(cacheKey, result, 10 * 60 * 1000); // 缓存10分钟
      }

      return result;
    } catch (error) {
      console.error('Validation API error:', error);
      return {
        isValid: false,
        error: {
          type: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get supported platforms (with caching)
   */
  async getPlatforms(): Promise<PlatformsResponse> {
    const cacheKey = 'platforms';

    // 尝试从缓存获取
    const cached = platformCache.get<PlatformsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.request<PlatformsResponse>('/platforms');

      // 只缓存成功的响应
      if (result.success) {
        platformCache.set(cacheKey, result, 30 * 60 * 1000); // 缓存30分钟
      }

      return result;
    } catch (error) {
      console.error('Platforms API error:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
          retryable: true,
        },
      };
    }
  }

  /**
   * Download file
   */
  getDownloadUrl(fileName: string): string {
    return `${this.baseUrl}/download/${fileName}`;
  }

  /**
   * Get streaming URL for large files
   */
  getStreamUrl(fileName: string): string {
    return `${this.baseUrl}/stream/${fileName}`;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility functions
export const isRetryableError = (error: { retryable?: boolean }): boolean => {
  return error.retryable === true;
};

export const getErrorMessage = (error: { message?: string }): string => {
  return error.message || 'An unknown error occurred';
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
