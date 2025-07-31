import { ConvertRequest, VideoMetadata, Env } from '../types';
import { JobManager } from './job-manager';
import { QueueManager } from './queue-manager';
import { StorageManager } from './storage';
import { DatabaseManager } from './database';

export class ConversionService {
  private env: Env;
  private jobManager: JobManager;
  private storage: StorageManager;
  private dbManager: DatabaseManager;

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.storage = new StorageManager(env);
    this.dbManager = new DatabaseManager(env);
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

    // Start processing asynchronously
    this.processConversion(jobId, request).catch(error => {
      console.error(`Conversion failed for job ${jobId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.jobManager.failJob(jobId, errorMessage);
    });

    return jobId;
  }

  /**
   * Get conversion status
   */
  async getConversionStatus(jobId: string) {
    const job = await this.jobManager.getJob(jobId);

    if (!job) {
      return null;
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
      downloadUrl: job.download_url,
      filename: job.file_path ? job.file_path.split('/').pop() : undefined,
      queuePosition,
      estimatedTimeRemaining,
      metadata: job.metadata ? JSON.parse(job.metadata) : undefined,
      error: job.error_message,
      createdAt: new Date(job.created_at).toISOString(),
      updatedAt: new Date(job.updated_at).toISOString(),
      expiresAt: new Date(job.expires_at).toISOString(),
    };
  }

  /**
   * Process conversion (called asynchronously)
   */
  async processConversion(
    jobId: string,
    request: ConvertRequest
  ): Promise<void> {
    try {
      // Mark job as processing
      await this.jobManager.startProcessing(jobId);

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
      await this.jobManager.updateProgress(jobId, 20);
      console.log(`Extracting metadata for URL: ${request.url}`);

      let metadataResponse = await this.callProcessingService(
        `${processingServiceUrl}/extract-metadata`,
        { url: request.url }
      );

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

      const metadataObj = metadataResponse.metadata as Record<string, unknown>;
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

      // Step 2: Start conversion
      await this.jobManager.updateProgress(jobId, 40);
      console.log(
        `Starting conversion: ${request.format} quality ${request.quality}`
      );

      let conversionResponse = await this.callProcessingService(
        `${processingServiceUrl}/convert`,
        {
          url: request.url,
          format: request.format,
          quality: request.quality,
        }
      );

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
          await this.jobManager.updateProgress(jobId, 50);

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

      // Step 3: Download file from processing service and upload to R2 storage
      await this.jobManager.updateProgress(jobId, 80);
      const fileName = this.generateFileName(metadata.title, request.format);
      const resultObj = conversionResponse.result as Record<string, unknown>;

      // Download the file from the processing service
      const relativeUrl = resultObj.download_url as string;
      const fileUrl = `${processingServiceUrl}${relativeUrl}`;
      console.log(`Downloading file from processing service: ${fileUrl}`);

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(
          `Failed to download file from processing service: ${fileResponse.status}`
        );
      }

      const fileContent = await fileResponse.arrayBuffer();
      console.log(`Downloaded file content: ${fileContent.byteLength} bytes`);

      // Upload to R2 storage
      const downloadUrl = await this.storage.uploadFileContent(
        fileName,
        fileContent,
        request.format,
        {
          originalTitle: metadata.title,
          platform: request.platform || 'unknown',
          duration: metadata.duration.toString(),
        }
      );

      // Step 4: Complete job
      await this.jobManager.updateProgress(jobId, 100);
      await this.jobManager.completeJob(
        jobId,
        downloadUrl,
        fileName, // Use the generated filename instead of the temporary file path
        metadata
      );
    } catch (error) {
      console.error(`Processing failed for job ${jobId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.jobManager.failJob(jobId, errorMessage);
    }
  }

  /**
   * Call the video processing service
   */
  private async callProcessingService(
    url: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Processing service error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      clearTimeout(timeoutId);
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
