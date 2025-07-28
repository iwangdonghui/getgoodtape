import { ConvertRequest, VideoMetadata, Env } from '../types';
import { JobManager } from './job-manager';
import { StorageManager } from './storage';

export class ConversionService {
  private env: Env;
  private jobManager: JobManager;
  private storage: StorageManager;

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.storage = new StorageManager(env);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.download_url,
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
  private async processConversion(jobId: string, request: ConvertRequest): Promise<void> {
    try {
      // Mark job as processing
      await this.jobManager.startProcessing(jobId);

      // Call video processing service
      const processingServiceUrl = this.env.PROCESSING_SERVICE_URL || 'http://localhost:8000';
      
      // Step 1: Extract metadata
      await this.jobManager.updateProgress(jobId, 20);
      const metadataResponse = await this.callProcessingService(
        `${processingServiceUrl}/extract-metadata`,
        { url: request.url }
      );

      if (!metadataResponse.success) {
        throw new Error(`Metadata extraction failed: ${metadataResponse.error}`);
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
      const conversionResponse = await this.callProcessingService(
        `${processingServiceUrl}/convert`,
        {
          url: request.url,
          format: request.format,
          quality: request.quality,
        }
      );

      if (!conversionResponse.success) {
        throw new Error(`Conversion failed: ${conversionResponse.error}`);
      }

      // Step 3: Upload to R2 storage
      await this.jobManager.updateProgress(jobId, 80);
      const fileName = this.generateFileName(metadata.title, request.format);
      const resultObj = conversionResponse.result as Record<string, unknown>;
      const downloadUrl = await this.storage.uploadFile(
        fileName,
        resultObj.file_path as string,
        request.format
      );

      // Step 4: Complete job
      await this.jobManager.updateProgress(jobId, 100);
      await this.jobManager.completeJob(
        jobId,
        downloadUrl,
        resultObj.file_path as string,
        metadata
      );

    } catch (error) {
      console.error(`Processing failed for job ${jobId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.jobManager.failJob(jobId, errorMessage);
    }
  }

  /**
   * Call the video processing service
   */
  private async callProcessingService(url: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Processing service error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as Record<string, unknown>;
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
