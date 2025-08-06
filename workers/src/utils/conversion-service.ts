import { ConvertRequest, VideoMetadata, Env } from '../types';
import { JobManager } from './job-manager';
import { QueueManager } from './queue-manager';
import { StorageManager } from './storage';
import { DatabaseManager } from './database';
import { PresignedUrlManager } from './presigned-url-manager';

export class ConversionService {
  private env: Env;
  private jobManager: JobManager;
  private storage: StorageManager;
  private dbManager: DatabaseManager;
  private presignedUrlManager: PresignedUrlManager;
  private wsManager: any; // WebSocketManager - using any to avoid circular dependency

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
  setWebSocketManager(wsManager: any) {
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

      if (job.download_expires_at && job.download_expires_at > now + expirationBuffer) {
        // URL is still valid, return existing URL
        return job.download_url || null;
      }

      console.log(`🔄 Refreshing download URL for job ${jobId} (expires at: ${job.download_expires_at})`);

      // Generate new download URL
      const presignedDownload = await this.presignedUrlManager.generateDownloadUrl(
        job.r2_key,
        24 * 60 * 60 // 24 hours
      );

      // Update database with new URL and expiration
      const newExpirationTime = Date.now() + 24 * 60 * 60 * 1000;
      await this.dbManager.updateJob(jobId, {
        download_url: presignedDownload.downloadUrl,
        download_expires_at: Math.floor(newExpirationTime / 1000),
        updated_at: Date.now()
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
    additionalData?: any
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
   * Start a new conversion job
   */
  async startConversion(request: ConvertRequest): Promise<string> {
    // Create job in database
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
      downloadExpiresAt: job.download_expires_at ? new Date(job.download_expires_at * 1000).toISOString() : undefined,
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
    const CONVERSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
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

      // Handle timeout specifically
      if (error instanceof Error && error.message.includes('timeout')) {
        await this.jobManager.failJob(
          jobId,
          'Conversion timed out after 5 minutes. This may be due to network issues or video processing complexity. Please try again with a shorter video or different format.'
        );
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.jobManager.failJob(jobId, errorMessage);
      }
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
        currentStep: 'Extracting video metadata'
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
        currentStep: 'Preparing cloud storage'
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
        quality: request.quality
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
            currentStep: 'Trying alternative access method'
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
        currentStep: 'Verifying file upload'
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
          currentStep: 'Simulating file verification'
        });
        await this.updateProgressWithNotification(jobId, 95, 'processing', {
          currentStep: 'Generating download link'
        });
      } else {
        // 🚀 NEW: File was uploaded directly to R2, verify and generate download URL
        const r2Key = resultObj.r2_key as string || presignedUpload.key;
        console.log(`✅ File uploaded directly to R2 with key: ${r2Key}`);

        await this.updateProgressWithNotification(jobId, 85, 'processing', {
          currentStep: 'Verifying file in cloud storage'
        });

        // Verify file exists in R2
        const fileExists = await this.presignedUrlManager.verifyFileExists(r2Key);
        if (!fileExists) {
          throw new Error('File upload to R2 failed - file not found');
        }

        console.log(`✅ File verified in R2 storage: ${r2Key}`);

        await this.updateProgressWithNotification(jobId, 90, 'processing', {
          currentStep: 'Generating secure download link'
        });

        // Generate presigned download URL (valid for 24 hours)
        const presignedDownload = await this.presignedUrlManager.generateDownloadUrl(
          r2Key,
          24 * 60 * 60 // 24 hours
        );

        downloadUrl = presignedDownload.downloadUrl;
        finalFileName = this.presignedUrlManager.extractFilenameFromKey(r2Key);

        console.log(`✅ Generated download URL for: ${finalFileName}`);

        await this.updateProgressWithNotification(jobId, 95, 'processing', {
          currentStep: 'Download link ready'
        });
      }


      // Step 4: Complete job with final progress update (atomic operation)
      await this.updateProgressWithNotification(jobId, 100, 'completed', {
        currentStep: 'Conversion completed successfully'
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
        this.wsManager.sendCompletion(jobId, downloadUrl, finalFileName, metadata);
      }

      if (completionSuccess) {
        console.log(`✅ Job ${jobId} marked as completed successfully`);
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
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout for video processing

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
    const deletedCount = await this.jobManager.cleanupExpiredJobs();
    console.log(`Cleaned up ${deletedCount} expired jobs`);
  }
}
