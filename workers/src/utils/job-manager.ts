import { ConversionJob, VideoMetadata, Env } from '../types';
import { DatabaseManager } from './database';

export class JobManager {
  private db: DatabaseManager;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseManager(env);
  }

  /**
   * Create a new conversion job
   */
  async createJob(
    url: string,
    platform: string,
    format: 'mp3' | 'mp4',
    quality: string
  ): Promise<string> {
    const jobId = this.generateJobId();

    const job: Omit<ConversionJob, 'created_at' | 'updated_at' | 'expires_at'> =
      {
        id: jobId,
        url,
        platform,
        format,
        quality,
        status: 'queued',
        progress: 0,
      };

    await this.db.createConversionJob(job);
    return jobId;
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<ConversionJob | null> {
    return await this.db.getConversionJob(jobId);
  }

  /**
   * Update job status and progress
   */
  async updateJob(
    jobId: string,
    updates: Partial<ConversionJob>
  ): Promise<void> {
    const updateData = {
      ...updates,
      updated_at: Date.now(),
    };

    await this.db.updateConversionJob(jobId, updateData);
  }

  /**
   * Mark job as completed with download URL (atomic operation)
   */
  async completeJob(
    jobId: string,
    downloadUrl: string,
    filePath: string,
    metadata?: VideoMetadata
  ): Promise<boolean> {
    try {
      // Atomic update: only complete if status is still 'processing'
      const result = await this.db.updateConversionJobAtomic(
        jobId,
        {
          status: 'completed',
          progress: 100,
          download_url: downloadUrl,
          file_path: filePath,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          updated_at: Date.now(),
        },
        'processing'
      );

      if (result) {
        console.log(`✅ Job ${jobId} completed successfully (atomic)`);
      } else {
        console.log(`⚠️ Job ${jobId} was already completed by another process`);
      }

      return result;
    } catch (error) {
      console.error(`Failed to complete job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Mark job as failed with error message
   */
  async failJob(jobId: string, errorMessage: string): Promise<void> {
    await this.updateJob(jobId, {
      status: 'failed',
      error_message: errorMessage,
    });
  }

  /**
   * Start processing a job with atomic locking
   */
  async startProcessing(jobId: string): Promise<boolean> {
    try {
      // Atomic update: only update if status is still 'queued'
      const result = await this.db.updateConversionJobAtomic(
        jobId,
        {
          status: 'processing',
          progress: 10,
          updated_at: Date.now(),
        },
        'queued'
      );

      return result; // Returns true if update was successful (job was locked)
    } catch (error) {
      console.error(`Failed to start processing job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
    });
  }

  /**
   * Get all active jobs (for cleanup/monitoring)
   */
  async getActiveJobs(): Promise<ConversionJob[]> {
    return await this.db.getActiveConversionJobs();
  }

  /**
   * Clean up expired jobs
   */
  async cleanupExpiredJobs(): Promise<number> {
    const now = Date.now();
    return await this.db.deleteExpiredJobs(now);
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Estimate processing time based on format and platform
   */
  estimateProcessingTime(
    platform: string,
    format: 'mp3' | 'mp4',
    duration?: number
  ): number {
    // Base processing time in seconds
    let baseTime = format === 'mp3' ? 30 : 60;

    // Adjust based on platform complexity
    const platformMultiplier: Record<string, number> = {
      youtube: 1.2,
      tiktok: 0.8,
      twitter: 1.0,
      facebook: 1.3,
      instagram: 1.1,
    };

    const multiplier = platformMultiplier[platform.toLowerCase()] || 1.0;
    baseTime *= multiplier;

    // Adjust based on video duration (if available)
    if (duration) {
      // Add 1 second of processing per 10 seconds of video
      baseTime += duration / 10;
    }

    return Math.ceil(baseTime);
  }
}
