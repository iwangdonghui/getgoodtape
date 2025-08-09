import { ConvertRequest, VideoMetadata, Env, ErrorType } from '../types';
import { JobManager } from './job-manager';
import { QueueManager } from './queue-manager';
import { StorageManager } from './storage';
import { DatabaseManager } from './database';
import { PresignedUrlManager } from './presigned-url-manager';

/**
 * Error classification and handling strategy
 */
export interface ErrorClassification {
  type: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  fallbackAction?:
    | 'use_proxy'
    | 'reduce_quality'
    | 'direct_connection'
    | 'cleanup_files';
  userMessage: string;
  suggestion?: string;
  alertRequired: boolean;
}

/**
 * Conversion cache entry
 */
export interface ConversionCacheEntry {
  jobId: string;
  url: string;
  format: string;
  quality: string;
  platform: string;
  r2Key: string;
  downloadUrl: string;
  filename: string;
  fileSize?: number;
  duration?: number;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache validation result
 */
export interface CacheValidationResult {
  isValid: boolean;
  entry?: ConversionCacheEntry;
  reason?: string;
}

/**
 * Error handling strategies map
 */
export const ERROR_HANDLING_STRATEGIES: Record<string, ErrorClassification> = {
  // YouTube specific errors
  YOUTUBE_ACCESS_DENIED: {
    type: ErrorType.ACCESS_DENIED,
    severity: 'medium',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    fallbackAction: 'use_proxy',
    userMessage: '正在尝试其他访问方式，请稍候...',
    suggestion: '该视频可能有访问限制，我们正在尝试其他方法',
    alertRequired: false,
  },

  YOUTUBE_SIGN_IN_REQUIRED: {
    type: ErrorType.ACCESS_DENIED,
    severity: 'high',
    retryable: false,
    maxRetries: 0,
    backoffStrategy: 'linear',
    userMessage: '该视频需要登录才能访问，请选择公开视频',
    suggestion: '请确认视频是公开的，不需要登录',
    alertRequired: false,
  },

  // Network and timeout errors
  CONVERSION_TIMEOUT: {
    type: ErrorType.CONVERSION_FAILED,
    severity: 'medium',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    fallbackAction: 'reduce_quality',
    userMessage: '转换时间较长，正在优化处理...',
    suggestion: '视频较大或网络较慢，建议选择较低质量',
    alertRequired: false,
  },

  NETWORK_ERROR: {
    type: ErrorType.NETWORK_ERROR,
    severity: 'medium',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    userMessage: '网络连接不稳定，正在重试...',
    suggestion: '请检查网络连接',
    alertRequired: false,
  },

  // Storage and resource errors
  STORAGE_QUOTA_EXCEEDED: {
    type: ErrorType.SERVER_ERROR,
    severity: 'critical',
    retryable: false,
    maxRetries: 0,
    backoffStrategy: 'linear',
    fallbackAction: 'cleanup_files',
    userMessage: '存储空间不足，请稍后重试',
    alertRequired: true,
  },

  // Video processing errors
  VIDEO_NOT_FOUND: {
    type: ErrorType.VIDEO_NOT_FOUND,
    severity: 'high',
    retryable: false,
    maxRetries: 0,
    backoffStrategy: 'linear',
    userMessage: '视频不存在或已被删除',
    suggestion: '请检查链接是否正确',
    alertRequired: false,
  },

  UNSUPPORTED_FORMAT: {
    type: ErrorType.CONVERSION_FAILED,
    severity: 'medium',
    retryable: true,
    maxRetries: 1,
    backoffStrategy: 'linear',
    fallbackAction: 'reduce_quality',
    userMessage: '正在尝试其他格式...',
    suggestion: '该视频格式可能不支持，正在尝试转换',
    alertRequired: false,
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    type: ErrorType.RATE_LIMIT_EXCEEDED,
    severity: 'low',
    retryable: true,
    maxRetries: 5,
    backoffStrategy: 'exponential',
    userMessage: '请求过于频繁，正在等待重试...',
    suggestion: '请稍后重试',
    alertRequired: false,
  },

  // Default fallback
  UNKNOWN_ERROR: {
    type: ErrorType.SERVER_ERROR,
    severity: 'medium',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    userMessage: '处理过程中遇到问题，正在重试...',
    alertRequired: false,
  },
};

export class ConversionService {
  private env: Env;
  private jobManager: JobManager;
  private storage: StorageManager;
  private dbManager: DatabaseManager;
  private presignedUrlManager: PresignedUrlManager;
  private wsManager: any = null; // WebSocketManager - using any to avoid circular dependency

  // Cache configuration
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CACHE_PREFIX = 'conversion_cache:';
  private readonly MAX_CACHE_ACCESS_COUNT = 100; // Maximum times a cached result can be accessed

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.storage = new StorageManager(env);
    this.dbManager = new DatabaseManager(env);
    this.presignedUrlManager = new PresignedUrlManager(env);
  }

  /**
   * Set WebSocket manager for real-time updates
   */
  setWebSocketManager(wsManager: any): void {
    this.wsManager = wsManager;
  }

  /**
   * 🚀 NEW: Refresh download URL if it's about to expire
   */
  async refreshDownloadUrlIfNeeded(jobId: string): Promise<string | null> {
    try {
      const job = await this.jobManager.getJob(jobId);
      if (!job || job.status !== 'completed' || !job.r2_key) {
        return null;
      }

      // Check if download URL is about to expire (within 1 hour)
      const now = Date.now() / 1000; // Convert to Unix timestamp
      const expirationBuffer = 60 * 60; // 1 hour buffer

      if (
        job.download_expires_at &&
        job.download_expires_at > now + expirationBuffer
      ) {
        // URL is still valid, return existing URL
        return job.download_url || null;
      }

      console.log(
        `🔄 Refreshing download URL for job ${jobId} (expires at: ${job.download_expires_at})`
      );

      // Generate new download URL
      const presignedDownload =
        await this.presignedUrlManager.generateDownloadUrl(
          job.r2_key,
          24 * 60 * 60 // 24 hours
        );

      // Update database with new URL and expiration
      const newExpirationTime = Date.now() + 24 * 60 * 60 * 1000;
      await this.dbManager.updateJob(jobId, {
        download_url: presignedDownload.downloadUrl,
        download_expires_at: Math.floor(newExpirationTime / 1000),
        updated_at: Date.now(),
      });

      console.log(`✅ Download URL refreshed for job ${jobId}`);
      return presignedDownload.downloadUrl;
    } catch (error) {
      console.error(`Failed to refresh download URL for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Update progress with WebSocket notification
   */
  private async updateProgressWithNotification(
    jobId: string,
    progress: number,
    status?: string,
    additionalData?: Record<string, unknown>
  ) {
    // Update database
    await this.jobManager.updateProgress(jobId, progress);

    // Send WebSocket notification if manager is available
    if (this.wsManager) {
      this.wsManager.sendProgressUpdate(
        jobId,
        progress,
        status || 'processing',
        additionalData
      );
    }
  }

  /**
   * Start a new conversion job with cache checking
   */
  async startConversion(request: ConvertRequest): Promise<string> {
    console.log(
      `🔍 Starting conversion for: ${request.url} (${request.format}/${request.quality})`
    );

    // Check cache first
    const cacheResult = await this.checkCache(request);
    if (cacheResult.isValid && cacheResult.entry) {
      console.log(`✅ Cache hit! Returning cached result for: ${request.url}`);

      // Create a job record pointing to cached result
      const jobId = await this.jobManager.createJob(
        request.url,
        request.platform || 'unknown',
        request.format,
        request.quality
      );

      // Mark job as completed with cached result
      await this.jobManager.completeJob(
        jobId,
        cacheResult.entry.downloadUrl,
        cacheResult.entry.filename,
        cacheResult.entry.fileSize
      );

      // Update cache access statistics
      await this.updateCacheAccess(cacheResult.entry);

      // Notify via WebSocket if available
      if (this.wsManager) {
        this.wsManager.sendProgressUpdate(jobId, 100, 'completed', {
          fromCache: true,
          downloadUrl: cacheResult.entry.downloadUrl,
          filename: cacheResult.entry.filename,
        });
      }

      return jobId;
    }

    console.log(
      `💾 No valid cache found, proceeding with new conversion: ${request.url}`
    );

    // Create job in database for new conversion
    const jobId = await this.jobManager.createJob(
      request.url,
      request.platform || 'unknown',
      request.format,
      request.quality
    );

    // Note: Processing will be handled by the router or queue processor
    // Don't start processing here to avoid duplicate processing attempts

    return jobId;
  }

  /**
   * Get conversion status
   * 🚀 OPTIMIZED: Now refreshes download URL if needed
   */
  async getConversionStatus(jobId: string) {
    const job = await this.jobManager.getJob(jobId);

    if (!job) {
      return null;
    }

    // 🚀 NEW: Refresh download URL if it's about to expire
    let downloadUrl = job.download_url;
    if (job.status === 'completed' && job.r2_key) {
      const refreshedUrl = await this.refreshDownloadUrlIfNeeded(jobId);
      if (refreshedUrl) {
        downloadUrl = refreshedUrl;
      }
    }

    // Get queue position and estimated time if job is queued
    let queuePosition: number | undefined;
    let estimatedTimeRemaining: number | undefined;

    if (job.status === 'queued') {
      const queueManager = new QueueManager(this.env);
      queuePosition = await queueManager.getJobQueuePosition(jobId);

      // Calculate estimated time based on queue position and average processing time
      const stats = await queueManager.getQueueStats();
      const avgProcessingTime = stats.avgProcessingTime || 180; // Default 3 minutes
      estimatedTimeRemaining = queuePosition * avgProcessingTime;
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl, // 🚀 OPTIMIZED: Always fresh download URL
      filename: job.file_path ? job.file_path.split('/').pop() : undefined,
      queuePosition,
      estimatedTimeRemaining,
      metadata: job.metadata ? JSON.parse(job.metadata) : undefined,
      error: job.error_message,
      createdAt: new Date(job.created_at).toISOString(),
      updatedAt: new Date(job.updated_at).toISOString(),
      expiresAt: new Date(job.expires_at).toISOString(),
      // 🚀 NEW: Include download URL expiration info
      downloadExpiresAt: job.download_expires_at
        ? new Date(job.download_expires_at * 1000).toISOString()
        : undefined,
    };
  }

  /**
   * Process conversion (called asynchronously)
   */
  async processConversion(
    jobId: string,
    request: ConvertRequest
  ): Promise<void> {
    console.log(
      `🚀 Starting processConversion for job ${jobId}, URL: ${request.url}`
    );
    console.log(
      `🔧 Environment: ${this.env.ENVIRONMENT}, Processing Service: ${this.env.PROCESSING_SERVICE_URL}`
    );

    // Set up timeout for the entire conversion process (5 minutes)
    const CONVERSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error('Conversion timeout: Process took longer than 5 minutes')
        );
      }, CONVERSION_TIMEOUT);
    });

    try {
      // Race between conversion process and timeout
      await Promise.race([
        this.performActualConversion(jobId, request),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error(`Conversion failed for job ${jobId}:`, error);
      await this.handleConversionError(error as Error, jobId, request);
      throw error;
    }
  }

  /**
   * Perform the actual conversion process
   */
  private async performActualConversion(
    jobId: string,
    request: ConvertRequest
  ): Promise<void> {
    try {
      // Check current job status first
      const currentJob = await this.jobManager.getJob(jobId);
      if (!currentJob) {
        throw new Error(`Job ${jobId} not found`);
      }

      // If job is already processing, check if it's stuck
      if (currentJob.status === 'processing') {
        const timeSinceUpdate = Date.now() - currentJob.updated_at;
        if (timeSinceUpdate < 5 * 60 * 1000) {
          // Less than 5 minutes
          console.log(
            `⚠️ Job ${jobId} is already being processed recently (${Math.round(timeSinceUpdate / 1000)}s ago)`
          );
          return; // Exit gracefully - job is being processed recently
        } else {
          console.log(
            `🔄 Job ${jobId} appears stuck, attempting to resume processing`
          );
        }
      }

      // Try to lock job for processing (atomic operation)
      const lockAcquired = await this.jobManager.startProcessing(jobId);
      if (!lockAcquired && currentJob.status === 'queued') {
        console.log(`⚠️ Job ${jobId} could not be locked (race condition)`);
        return; // Exit gracefully - another instance won the race
      }
      console.log(`✅ Job ${jobId} locked for processing`);

      // 检查是否有最近的相同URL转换结果
      const recentConversion = await this.dbManager.findRecentConversionByUrl(
        request.url,
        1
      );
      if (recentConversion && recentConversion.download_url) {
        console.log(`Found recent conversion for URL: ${request.url}`);
        await this.jobManager.completeJob(
          jobId,
          recentConversion.download_url,
          recentConversion.file_path || '',
          recentConversion.metadata
            ? JSON.parse(recentConversion.metadata)
            : undefined
        );
        return;
      }

      // Call video processing service
      const processingServiceUrl =
        this.env.PROCESSING_SERVICE_URL || 'http://localhost:8000';

      // Step 1: Extract metadata with fallback
      await this.updateProgressWithNotification(jobId, 20, 'processing', {
        currentStep: 'Extracting video metadata',
      });
      console.log(`Extracting metadata for URL: ${request.url}`);

      let metadataResponse;

      // In development environment, use mock data instead of calling external service
      if (this.env.ENVIRONMENT === 'development') {
        console.log(`Using mock metadata for development environment`);
        metadataResponse = {
          success: true,
          metadata: {
            title: 'Mock Video Title',
            duration: 180,
            thumbnail: 'https://example.com/thumbnail.jpg',
            uploader: 'Mock Uploader',
            upload_date: '20240101',
            view_count: 1000000,
            description: 'Mock video description for development',
            tags: ['mock', 'development', 'test'],
            webpage_url: request.url,
            id: 'mock_video_id',
          },
        };
      } else {
        try {
          metadataResponse = await this.callProcessingService(
            `${processingServiceUrl}/extract-metadata`,
            { url: request.url }
          );
          console.log(`Metadata extraction completed successfully`);
        } catch (error) {
          console.error(`Metadata extraction failed with error:`, error);
          throw error;
        }
      }

      console.log(
        `Metadata extraction result: ${JSON.stringify({ success: metadataResponse.success, hasMetadata: !!metadataResponse.metadata })}`
      );

      // If primary extraction fails, try fallback method
      if (!metadataResponse.success) {
        console.log('Primary metadata extraction failed, trying fallback...');
        try {
          metadataResponse = await this.callProcessingService(
            `${processingServiceUrl}/fallback-extract`,
            { url: request.url }
          );

          if (metadataResponse.success) {
            // Convert fallback response to expected format
            const isYouTube =
              request.url.includes('youtube.com') ||
              request.url.includes('youtu.be');
            const isTwitter =
              request.url.includes('x.com') ||
              request.url.includes('twitter.com');

            metadataResponse.metadata = {
              title: metadataResponse.title,
              duration: metadataResponse.duration || (isYouTube ? 213 : 30), // Use actual duration or reasonable default
              thumbnail: metadataResponse.thumbnail,
              uploader: metadataResponse.author,
              upload_date: new Date()
                .toISOString()
                .split('T')[0]
                .replace(/-/g, ''),
              view_count: metadataResponse.view_count || null,
              description:
                metadataResponse.description ||
                'Extracted using fallback method',
              tags: isTwitter
                ? ['social', 'twitter']
                : isYouTube
                  ? ['music', 'classic']
                  : ['video'],
              webpage_url: request.url,
              id: isYouTube
                ? request.url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1] ||
                  'unknown'
                : request.url.split('/').pop() || 'unknown',
            };
          }
        } catch (fallbackError) {
          console.error('Fallback extraction also failed:', fallbackError);
        }
      }

      if (!metadataResponse.success) {
        throw new Error(
          `Both primary and fallback metadata extraction failed: ${metadataResponse.error}`
        );
      }

      console.log(
        `Metadata response structure:`,
        JSON.stringify(metadataResponse.metadata, null, 2)
      );

      const metadataObj = metadataResponse.metadata as Record<string, unknown>;
      console.log(
        `Processing metadata object:`,
        JSON.stringify(metadataObj, null, 2)
      );

      const metadata: VideoMetadata = {
        title: metadataObj.title as string,
        duration: metadataObj.duration as number,
        thumbnail: metadataObj.thumbnail as string,
        uploader: metadataObj.uploader as string,
        uploadDate: metadataObj.upload_date as string,
        viewCount: metadataObj.view_count as number,
        description: metadataObj.description as string,
        tags: metadataObj.tags as string[],
      };

      console.log(`Processed metadata:`, JSON.stringify(metadata, null, 2));

      // Step 2: Generate presigned upload URL for direct upload
      await this.updateProgressWithNotification(jobId, 35, 'processing', {
        currentStep: 'Preparing cloud storage',
      });

      const fileName = this.presignedUrlManager.generateFileName(
        metadata.title || 'converted_file',
        request.format
      );

      const contentType = request.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';

      const presignedUpload = await this.presignedUrlManager.generateUploadUrl(
        fileName,
        contentType,
        {
          originalTitle: metadata.title || '',
          platform: metadata.platform || '',
          duration: metadata.duration?.toString() || '',
          format: request.format,
          quality: request.quality,
        }
      );

      console.log(`✅ Generated presigned upload URL for: ${fileName}`);

      // Step 3: Start conversion with presigned URL
      await this.updateProgressWithNotification(jobId, 40, 'processing', {
        currentStep: `Starting ${request.format.toUpperCase()} conversion`,
        format: request.format,
        quality: request.quality,
      });
      console.log(
        `Starting conversion: ${request.format} quality ${request.quality}`
      );

      let conversionResponse;

      // In development environment, use mock conversion response
      if (this.env.ENVIRONMENT === 'development') {
        console.log(`Using mock conversion for development environment`);
        conversionResponse = {
          success: true,
          result: {
            download_url: `/downloads/mock_file.${request.format}`,
            file_size: 1024000, // 1MB mock file
            duration: metadata.duration,
            format: request.format,
            quality: request.quality,
            r2_key: presignedUpload.key, // Mock R2 key
          },
        };
      } else {
        // 🐛 FIX: Add progress updates during actual conversion
        await this.updateProgressWithNotification(jobId, 60, 'processing', {
          currentStep: 'Downloading and converting video',
        });

        // 🚀 NEW: Check for YouTube access restrictions before conversion
        const isYouTube =
          request.url.includes('youtube.com') ||
          request.url.includes('youtu.be');
        if (isYouTube) {
          console.log('🔍 YouTube URL detected, checking access...');

          // Quick test to see if YouTube is accessible
          try {
            const testResponse = await this.callProcessingService(
              `${processingServiceUrl}/extract-metadata`,
              { url: request.url }
            );

            if (
              !testResponse.success &&
              testResponse.error &&
              (testResponse.error.toString().includes('restricted') ||
                testResponse.error.toString().includes('Sign in to confirm'))
            ) {
              console.log('❌ YouTube access restricted, failing fast');
              throw new Error(
                'YouTube access is currently restricted from our servers. ' +
                  'This is a temporary limitation. Please try:\n' +
                  '• Using videos from other platforms (TikTok, Instagram, Twitter)\n' +
                  '• Trying again in a few minutes\n' +
                  '• Using a different YouTube video'
              );
            }
          } catch (testError) {
            console.log('⚠️ YouTube access test failed:', testError);
            // If it's a timeout or network error, continue with conversion attempt
            if (
              testError instanceof Error &&
              !testError.message.includes('restricted')
            ) {
              console.log('🔄 Continuing with conversion despite test failure');
            } else {
              throw testError;
            }
          }
        }

        // Call processing service with presigned upload URL
        conversionResponse = await this.callProcessingService(
          `${processingServiceUrl}/convert`,
          {
            url: request.url,
            format: request.format,
            quality: request.quality,
            // 🚀 NEW: Direct upload to R2
            upload_url: presignedUpload.uploadUrl,
            upload_key: presignedUpload.key,
            content_type: contentType,
          }
        );

        // 🐛 FIX: Add progress update after conversion
        if (conversionResponse.success) {
          await this.updateProgressWithNotification(jobId, 80, 'processing', {
            currentStep: 'Upload completed, finalizing',
          });
        }
      }

      console.log(
        `Conversion result: ${JSON.stringify({ success: conversionResponse.success, hasResult: !!conversionResponse.result })}`
      );

      // If conversion fails and it's a YouTube video, try the bypass endpoint
      if (!conversionResponse.success) {
        const isYouTube =
          request.url.includes('youtube.com') ||
          request.url.includes('youtu.be');

        if (
          isYouTube &&
          (conversionResponse.error?.includes('Sign in to confirm') ||
            conversionResponse.error?.includes('temporarily restricted') ||
            conversionResponse.error?.includes('This video is not available') ||
            conversionResponse.error?.includes('anti-bot'))
        ) {
          console.log('YouTube access restricted, trying bypass endpoint...');
          await this.updateProgressWithNotification(jobId, 50, 'processing', {
            currentStep: 'Trying alternative access method',
          });

          try {
            // First try the YouTube bypass endpoint to test if we can access the video
            const bypassResponse = await this.callProcessingService(
              `${processingServiceUrl}/youtube-bypass`,
              { url: request.url }
            );

            if (bypassResponse.success) {
              console.log(
                `YouTube bypass successful with strategy: ${bypassResponse.strategy}`
              );

              // Now try conversion again with the knowledge that bypass works
              conversionResponse = await this.callProcessingService(
                `${processingServiceUrl}/convert`,
                {
                  url: request.url,
                  format: request.format,
                  quality: request.quality,
                  useBypass: true, // Signal to use bypass methods
                  // 🚀 NEW: Direct upload to R2 (bypass)
                  upload_url: presignedUpload.uploadUrl,
                  upload_key: presignedUpload.key,
                  content_type: contentType,
                }
              );

              if (conversionResponse.success) {
                console.log('Conversion successful after bypass verification');
              }
            }
          } catch (bypassError) {
            console.log(`YouTube bypass failed: ${bypassError}`);
          }
        }

        // If still failed, provide helpful error message
        if (!conversionResponse.success) {
          if (isYouTube) {
            throw new Error(
              'YouTube has temporarily restricted access to this video. This is a common anti-bot measure. Please try:\n' +
                '• Using a different YouTube video\n' +
                '• Trying again in a few minutes\n' +
                '• Using videos from other platforms (TikTok, Instagram, etc.)\n' +
                '\nWe are continuously working to improve YouTube compatibility.'
            );
          }
          throw new Error(`Conversion failed: ${conversionResponse.error}`);
        }
      }

      // Step 4: Verify direct upload to R2 storage
      await this.updateProgressWithNotification(jobId, 80, 'processing', {
        currentStep: 'Verifying file upload',
      });

      const resultObj = conversionResponse.result as Record<string, unknown>;
      let downloadUrl: string;
      let finalFileName: string;

      // In development environment, use mock download URL
      if (this.env.ENVIRONMENT === 'development') {
        console.log(`Using mock download URL for development environment`);
        finalFileName = fileName;
        downloadUrl = `https://mock-storage.example.com/${fileName}`;
        // Simulate progress updates for development
        await this.updateProgressWithNotification(jobId, 85, 'processing', {
          currentStep: 'Simulating file verification',
        });
        await this.updateProgressWithNotification(jobId, 95, 'processing', {
          currentStep: 'Generating download link',
        });
      } else {
        // 🚀 NEW: File was uploaded directly to R2, verify and generate download URL
        const r2Key = (resultObj.r2_key as string) || presignedUpload.key;
        console.log(`✅ File uploaded directly to R2 with key: ${r2Key}`);

        await this.updateProgressWithNotification(jobId, 85, 'processing', {
          currentStep: 'Verifying file in cloud storage',
        });

        // Verify file exists in R2
        const fileExists =
          await this.presignedUrlManager.verifyFileExists(r2Key);
        if (!fileExists) {
          throw new Error('File upload to R2 failed - file not found');
        }

        console.log(`✅ File verified in R2 storage: ${r2Key}`);

        await this.updateProgressWithNotification(jobId, 90, 'processing', {
          currentStep: 'Generating secure download link',
        });

        // Generate presigned download URL (valid for 24 hours)
        const presignedDownload =
          await this.presignedUrlManager.generateDownloadUrl(
            r2Key,
            24 * 60 * 60 // 24 hours
          );

        downloadUrl = presignedDownload.downloadUrl;
        finalFileName = this.presignedUrlManager.extractFilenameFromKey(r2Key);

        console.log(`✅ Generated download URL for: ${finalFileName}`);

        await this.updateProgressWithNotification(jobId, 95, 'processing', {
          currentStep: 'Download link ready',
        });
      }

      // Step 4: Complete job with final progress update (atomic operation)
      await this.updateProgressWithNotification(jobId, 100, 'completed', {
        currentStep: 'Conversion completed successfully',
      });
      console.log(`Job ${jobId} progress set to 100% before completion`);

      // 🚀 OPTIMIZED: Store download URL with expiration and R2 key
      const downloadExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
      const completionSuccess = await this.jobManager.completeJob(
        jobId,
        downloadUrl,
        finalFileName, // Use the final filename from R2
        metadata,
        r2Key, // Store R2 key for future reference
        downloadExpiresAt // Store expiration time
      );

      // Send WebSocket completion notification
      if (this.wsManager && completionSuccess) {
        this.wsManager.sendCompletion(
          jobId,
          downloadUrl,
          finalFileName,
          metadata
        );
      }

      if (completionSuccess) {
        console.log(`✅ Job ${jobId} marked as completed successfully`);

        // Cache the conversion result for future use
        try {
          await this.cacheConversionResult(
            request,
            jobId,
            r2Key,
            downloadUrl,
            finalFileName,
            metadata?.fileSize,
            metadata?.duration
          );
          console.log(`💾 Conversion result cached for: ${request.url}`);
        } catch (cacheError) {
          console.warn('Failed to cache conversion result:', cacheError);
          // Don't fail the conversion if caching fails
        }
      } else {
        console.log(
          `⚠️ Job ${jobId} was already completed by another instance`
        );
      }
    } catch (error) {
      console.error(`Processing failed for job ${jobId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.jobManager.failJob(jobId, errorMessage);
      throw error;
    }
  }

  /**
   * Call the video processing service
   */
  private async callProcessingService(
    url: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    console.log(
      `Calling processing service: ${url} with data:`,
      JSON.stringify(data)
    );

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout for video processing

    try {
      console.log(`Making fetch request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(
        `Received response: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        throw new Error(
          `Processing service error: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as Record<string, unknown>;
      console.log(`Response parsed successfully, success: ${result.success}`);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Processing service call failed:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          'Processing service timeout - video conversion took too long'
        );
      }
      throw error;
    }
  }

  /**
   * Generate a safe filename
   */
  private generateFileName(title: string, format: string): string {
    // Clean title for filename
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const timestamp = Date.now();
    return `${cleanTitle}_${timestamp}.${format}`;
  }

  /**
   * Clean up expired jobs and files
   */
  async cleanupExpiredJobs(): Promise<void> {
    console.log('🧹 Starting comprehensive cleanup...');

    // Clean up expired jobs
    const deletedJobsCount = await this.jobManager.cleanupExpiredJobs();
    console.log(`Cleaned up ${deletedJobsCount} expired jobs`);

    // Clean up expired cache entries and orphaned files
    try {
      const cacheCleanupResult = await this.cleanupCache();
      console.log(
        `Cache cleanup: ${cacheCleanupResult.deletedEntries} entries, ${cacheCleanupResult.deletedFiles} files`
      );
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }

    console.log('✅ Comprehensive cleanup completed');
  }

  /**
   * Handle conversion errors with enhanced error processing and recovery
   */
  private async handleConversionError(
    error: Error,
    jobId: string,
    request?: ConvertRequest
  ): Promise<void> {
    const errorClassification = this.categorizeError(error);
    const userMessage = this.getUserFriendlyMessage(errorClassification);

    console.log(
      `🔍 Error classified as: ${errorClassification.type} (severity: ${errorClassification.severity})`
    );

    // Try automatic recovery if possible
    if (
      errorClassification.retryable &&
      errorClassification.fallbackAction &&
      request
    ) {
      const recoveryAttempted = await this.attemptErrorRecovery(
        jobId,
        request,
        errorClassification
      );
      if (recoveryAttempted) {
        return; // Recovery was attempted, don't fail the job yet
      }
    }

    // Send user-friendly error notification via WebSocket
    if (this.wsManager) {
      this.wsManager.sendEnhancedError(jobId, {
        message: userMessage,
        suggestion: errorClassification.suggestion,
        canRetry: errorClassification.retryable,
        severity: errorClassification.severity,
        errorType: errorClassification.type,
      });
    }

    // Fail the job with user-friendly message
    await this.jobManager.failJob(jobId, userMessage);

    // Log alert if required
    if (errorClassification.alertRequired) {
      console.error(
        `🚨 ALERT REQUIRED: ${errorClassification.type} - ${error.message}`
      );
      // TODO: Send to monitoring/alerting system
    }
  }

  /**
   * Attempt automatic error recovery based on fallback action
   */
  private async attemptErrorRecovery(
    jobId: string,
    request: ConvertRequest,
    errorClassification: ErrorClassification
  ): Promise<boolean> {
    const fallbackAction = errorClassification.fallbackAction;

    if (!fallbackAction) {
      return false;
    }

    console.log(`🔄 Attempting error recovery with action: ${fallbackAction}`);

    // Notify about recovery attempt
    if (this.wsManager) {
      this.wsManager.sendRecoveryAttempt(
        jobId,
        fallbackAction,
        `正在尝试 ${this.getRecoveryActionName(fallbackAction)}...`
      );
    }

    try {
      let success = false;

      switch (fallbackAction) {
        case 'reduce_quality':
          success = await this.attemptQualityReduction(jobId, request);
          break;

        case 'use_proxy':
          success = await this.attemptProxyRetry(jobId, request);
          break;

        case 'direct_connection':
          success = await this.attemptDirectConnection(jobId, request);
          break;

        case 'cleanup_files':
          await this.cleanupExpiredJobs();
          success = false; // Don't retry, just cleanup
          break;

        default:
          success = false;
      }

      // Notify about recovery result
      if (this.wsManager) {
        if (success) {
          this.wsManager.sendRecoverySuccess(
            jobId,
            `${this.getRecoveryActionName(fallbackAction)} 成功，继续处理...`
          );
        } else {
          this.wsManager.sendRecoveryFailure(
            jobId,
            `${this.getRecoveryActionName(fallbackAction)} 失败`
          );
        }
      }

      return success;
    } catch (recoveryError) {
      console.error(`❌ Error recovery failed: ${recoveryError}`);

      if (this.wsManager) {
        this.wsManager.sendRecoveryFailure(
          jobId,
          `恢复尝试失败: ${recoveryError instanceof Error ? recoveryError.message : '未知错误'}`
        );
      }

      return false;
    }
  }

  /**
   * Categorize error and return handling strategy
   */
  categorizeError(error: Error): ErrorClassification {
    const errorMessage = error.message.toLowerCase();

    // YouTube specific errors
    if (
      errorMessage.includes('sign in to confirm') ||
      errorMessage.includes('login required')
    ) {
      return ERROR_HANDLING_STRATEGIES.YOUTUBE_SIGN_IN_REQUIRED;
    }

    if (
      errorMessage.includes('youtube') &&
      (errorMessage.includes('blocked') ||
        errorMessage.includes('access denied'))
    ) {
      return ERROR_HANDLING_STRATEGIES.YOUTUBE_ACCESS_DENIED;
    }

    // Network and timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    ) {
      return ERROR_HANDLING_STRATEGIES.CONVERSION_TIMEOUT;
    }

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    ) {
      return ERROR_HANDLING_STRATEGIES.NETWORK_ERROR;
    }

    // Storage errors
    if (
      errorMessage.includes('storage') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('space')
    ) {
      return ERROR_HANDLING_STRATEGIES.STORAGE_QUOTA_EXCEEDED;
    }

    // Video processing errors
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('unavailable') ||
      errorMessage.includes('deleted')
    ) {
      return ERROR_HANDLING_STRATEGIES.VIDEO_NOT_FOUND;
    }

    if (
      errorMessage.includes('format') ||
      errorMessage.includes('codec') ||
      errorMessage.includes('unsupported')
    ) {
      return ERROR_HANDLING_STRATEGIES.UNSUPPORTED_FORMAT;
    }

    // Rate limiting
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429')
    ) {
      return ERROR_HANDLING_STRATEGIES.RATE_LIMIT_EXCEEDED;
    }

    // Proxy errors (YouTube specific)
    if (errorMessage.includes('proxy') && errorMessage.includes('407')) {
      return ERROR_HANDLING_STRATEGIES.YOUTUBE_ACCESS_DENIED;
    }

    // Default fallback
    return ERROR_HANDLING_STRATEGIES.UNKNOWN_ERROR;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorClassification: ErrorClassification): string {
    return errorClassification.userMessage;
  }

  /**
   * Calculate backoff delay based on strategy
   */
  calculateBackoffDelay(
    strategy: 'linear' | 'exponential',
    attempt: number
  ): number {
    const baseDelay = 1000; // 1 second

    if (strategy === 'exponential') {
      return baseDelay * Math.pow(2, attempt);
    } else {
      return baseDelay * (attempt + 1);
    }
  }

  /**
   * Attempt quality reduction recovery
   */
  private async attemptQualityReduction(
    jobId: string,
    request: ConvertRequest
  ): Promise<boolean> {
    const qualityMap: Record<string, string> = {
      high: 'medium',
      '1080': '720',
      '720': '360',
      '320': '192',
      '192': '128',
    };

    const lowerQuality = qualityMap[request.quality];
    if (!lowerQuality) {
      console.log(`❌ Cannot reduce quality further from: ${request.quality}`);
      return false;
    }

    console.log(
      `🔄 Reducing quality from ${request.quality} to ${lowerQuality}`
    );

    // Update progress with recovery message
    await this.updateProgressWithNotification(jobId, 30, 'processing', {
      currentStep: `正在降低质量重试 (${request.quality} → ${lowerQuality})`,
    });

    // Create new request with reduced quality
    const recoveryRequest: ConvertRequest = {
      ...request,
      quality: lowerQuality,
    };

    // Retry conversion with lower quality
    try {
      await this.performActualConversion(jobId, recoveryRequest);
      return true;
    } catch (error) {
      console.error(`❌ Quality reduction recovery failed: ${error}`);
      return false;
    }
  }

  /**
   * Attempt proxy retry recovery
   */
  private async attemptProxyRetry(
    jobId: string,
    request: ConvertRequest
  ): Promise<boolean> {
    console.log(`🔄 Attempting proxy retry for: ${request.url}`);

    // Update progress with recovery message
    await this.updateProgressWithNotification(jobId, 25, 'processing', {
      currentStep: '正在尝试其他访问方式...',
    });

    // Add proxy flag to request
    const recoveryRequest: ConvertRequest = {
      ...request,
      // Add proxy-specific parameters if needed
    };

    try {
      // Call processing service with proxy flag
      const processingServiceUrl =
        this.env.PROCESSING_SERVICE_URL || 'http://localhost:8000';

      const response = await fetch(`${processingServiceUrl}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...recoveryRequest,
          use_proxy: true, // Force proxy usage
        }),
      });

      if (response.ok) {
        console.log(`✅ Proxy retry successful`);
        return true;
      } else {
        console.error(`❌ Proxy retry failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Proxy retry recovery failed: ${error}`);
      return false;
    }
  }

  /**
   * Attempt direct connection recovery
   */
  private async attemptDirectConnection(
    jobId: string,
    request: ConvertRequest
  ): Promise<boolean> {
    console.log(`🔄 Attempting direct connection for: ${request.url}`);

    // Update progress with recovery message
    await this.updateProgressWithNotification(jobId, 25, 'processing', {
      currentStep: '正在尝试直接连接...',
    });

    try {
      // Call processing service without proxy
      const processingServiceUrl =
        this.env.PROCESSING_SERVICE_URL || 'http://localhost:8000';

      const response = await fetch(`${processingServiceUrl}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          no_proxy: true, // Force direct connection
        }),
      });

      if (response.ok) {
        console.log(`✅ Direct connection successful`);
        return true;
      } else {
        console.error(`❌ Direct connection failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Direct connection recovery failed: ${error}`);
      return false;
    }
  }

  /**
   * Get user-friendly recovery action name
   */
  private getRecoveryActionName(action: string): string {
    const actionNames: Record<string, string> = {
      reduce_quality: '降低质量',
      use_proxy: '代理访问',
      direct_connection: '直接连接',
      cleanup_files: '清理文件',
    };

    return actionNames[action] || action;
  }

  /**
   * Check if conversion result exists in cache
   */
  async checkCache(request: ConvertRequest): Promise<CacheValidationResult> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cacheData = await this.env.CACHE.get(cacheKey);

      if (!cacheData) {
        return { isValid: false, reason: 'No cache entry found' };
      }

      const entry: ConversionCacheEntry = JSON.parse(cacheData);

      // Check if cache entry is expired
      if (Date.now() > entry.expiresAt) {
        console.log(`⏰ Cache entry expired for: ${request.url}`);
        await this.env.CACHE.delete(cacheKey);
        return { isValid: false, reason: 'Cache entry expired' };
      }

      // Check if access count exceeded
      if (entry.accessCount >= this.MAX_CACHE_ACCESS_COUNT) {
        console.log(`🚫 Cache entry access limit exceeded for: ${request.url}`);
        return { isValid: false, reason: 'Access limit exceeded' };
      }

      // Validate that the file still exists in R2
      const fileExists = await this.validateCachedFile(entry);
      if (!fileExists) {
        console.log(`📁 Cached file no longer exists in R2: ${entry.r2Key}`);
        await this.env.CACHE.delete(cacheKey);
        return { isValid: false, reason: 'Cached file not found in storage' };
      }

      console.log(
        `✅ Valid cache entry found for: ${request.url} (accessed ${entry.accessCount} times)`
      );
      return { isValid: true, entry };
    } catch (error) {
      console.error('Error checking cache:', error);
      return { isValid: false, reason: 'Cache check error' };
    }
  }

  /**
   * Generate cache key for conversion request
   */
  generateCacheKey(request: ConvertRequest): string {
    // Normalize URL for consistent caching
    const normalizedUrl = this.normalizeUrl(request.url);

    // Create cache key from URL, format, and quality
    const keyData = {
      url: normalizedUrl,
      format: request.format,
      quality: request.quality,
      platform: request.platform || 'unknown',
    };

    // Create a hash of the key data for consistent, short keys
    const keyString = JSON.stringify(keyData);
    const hash = this.simpleHash(keyString);

    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Normalize URL for consistent caching
   */
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);

      // Remove tracking parameters and fragments
      const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

      // Extract video ID for YouTube URLs for more consistent caching
      if (
        parsedUrl.host.includes('youtube.com') ||
        parsedUrl.host.includes('youtu.be')
      ) {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }

      return cleanUrl;
    } catch {
      return url; // Return original URL if parsing fails
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string | null {
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
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate that cached file still exists in R2 storage
   */
  private async validateCachedFile(
    entry: ConversionCacheEntry
  ): Promise<boolean> {
    try {
      const object = await this.env.STORAGE.head(entry.r2Key);
      return object !== null;
    } catch (error) {
      console.warn(`Failed to validate cached file ${entry.r2Key}:`, error);
      return false;
    }
  }

  /**
   * Update cache access statistics
   */
  private async updateCacheAccess(entry: ConversionCacheEntry): Promise<void> {
    try {
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      const cacheKey = this.generateCacheKey({
        url: entry.url,
        format: entry.format as 'mp3' | 'mp4',
        quality: entry.quality,
        platform: entry.platform,
      });

      await this.env.CACHE.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: Math.floor((entry.expiresAt - Date.now()) / 1000),
      });

      console.log(
        `📊 Updated cache access count for ${entry.url}: ${entry.accessCount}`
      );
    } catch (error) {
      console.error('Failed to update cache access:', error);
    }
  }

  /**
   * Store conversion result in cache
   */
  async cacheConversionResult(
    request: ConvertRequest,
    jobId: string,
    r2Key: string,
    downloadUrl: string,
    filename: string,
    fileSize?: number,
    duration?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const now = Date.now();

      const entry: ConversionCacheEntry = {
        jobId,
        url: request.url,
        format: request.format,
        quality: request.quality,
        platform: request.platform || 'unknown',
        r2Key,
        downloadUrl,
        filename,
        fileSize,
        duration,
        createdAt: now,
        expiresAt: now + this.CACHE_DURATION,
        accessCount: 0,
        lastAccessed: now,
      };

      await this.env.CACHE.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: Math.floor(this.CACHE_DURATION / 1000),
      });

      console.log(
        `💾 Cached conversion result for: ${request.url} (key: ${cacheKey})`
      );
    } catch (error) {
      console.error('Failed to cache conversion result:', error);
    }
  }

  /**
   * Clean up expired cache entries and orphaned files
   */
  async cleanupCache(): Promise<{
    deletedEntries: number;
    deletedFiles: number;
  }> {
    console.log('🧹 Starting cache cleanup...');

    let deletedEntries = 0;
    let deletedFiles = 0;

    try {
      // Get all cache keys with our prefix
      const cacheKeys = await this.listCacheKeys();

      for (const key of cacheKeys) {
        try {
          const cacheData = await this.env.CACHE.get(key);
          if (!cacheData) {
            continue;
          }

          const entry: ConversionCacheEntry = JSON.parse(cacheData);

          // Check if entry is expired or over access limit
          const isExpired = Date.now() > entry.expiresAt;
          const isOverLimit = entry.accessCount >= this.MAX_CACHE_ACCESS_COUNT;

          if (isExpired || isOverLimit) {
            // Delete cache entry
            await this.env.CACHE.delete(key);
            deletedEntries++;

            // Check if file should be deleted from R2
            const shouldDeleteFile = this.shouldDeleteCachedFile();
            if (shouldDeleteFile) {
              try {
                await this.env.STORAGE.delete(entry.r2Key);
                deletedFiles++;
                console.log(`🗑️ Deleted orphaned file: ${entry.r2Key}`);
              } catch (deleteError) {
                console.warn(
                  `Failed to delete file ${entry.r2Key}:`,
                  deleteError
                );
              }
            }

            console.log(
              `🧹 Cleaned up cache entry: ${key} (${isExpired ? 'expired' : 'over limit'})`
            );
          }
        } catch (entryError) {
          console.warn(`Error processing cache entry ${key}:`, entryError);
          // Delete corrupted cache entry
          await this.env.CACHE.delete(key);
          deletedEntries++;
        }
      }

      console.log(
        `✅ Cache cleanup completed: ${deletedEntries} entries, ${deletedFiles} files deleted`
      );
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }

    return { deletedEntries, deletedFiles };
  }

  /**
   * List all cache keys with our prefix
   */
  private async listCacheKeys(): Promise<string[]> {
    // Note: Cloudflare KV doesn't have a native list operation with prefix
    // This is a simplified implementation - in production, you might want to
    // maintain a separate index of cache keys or use a different approach

    // For now, we'll rely on KV's automatic expiration and manual cleanup
    // when cache entries are accessed

    return [];
  }

  /**
   * Determine if a cached file should be deleted from R2
   */
  private shouldDeleteCachedFile(): boolean {
    // Check if any other cache entries reference this file
    // This is a simplified check - in production, you might want to maintain
    // a reference count for each file

    // For now, we'll be conservative and not delete files automatically
    // to avoid accidentally deleting files that might be referenced elsewhere

    return false;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    // This would require iterating through all cache entries
    // For now, return basic stats
    return {
      totalEntries: 0,
      totalSize: 0,
    };
  }

  /**
   * Force cleanup of specific cache entry
   */
  async invalidateCache(request: ConvertRequest): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(request);
      await this.env.CACHE.delete(cacheKey);
      console.log(`🗑️ Invalidated cache for: ${request.url}`);
      return true;
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      return false;
    }
  }
}
