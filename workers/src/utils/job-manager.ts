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
   * 🚀 OPTIMIZED: Now supports download URL expiration and R2 key storage
   */
  async completeJob(
    jobId: string,
    downloadUrl: string,
    filePath: string,
    metadata?: VideoMetadata,
    r2Key?: string,
    downloadExpiresAt?: number
  ): Promise<boolean> {
    try {
      // Calculate download URL expiration (24 hours from now if not provided)
      const expirationTime =
        downloadExpiresAt || Date.now() + 24 * 60 * 60 * 1000;

      // Atomic update: only complete if status is still 'processing'
      const result = await this.db.updateConversionJobAtomic(
        jobId,
        {
          status: 'completed',
          progress: 100,
          download_url: downloadUrl,
          download_expires_at: Math.floor(expirationTime / 1000), // Store as Unix timestamp
          r2_key: r2Key,
          file_path: filePath,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          updated_at: Date.now(),
        },
        'processing'
      );

      if (result) {
        console.log(
          `✅ Job ${jobId} completed successfully (atomic) with download expiration: ${new Date(expirationTime).toISOString()}`
        );
        if (r2Key) {
          console.log(`📁 R2 key stored: ${r2Key}`);
        }
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
   * Update job progress (FIXED: More robust with validation and error handling)
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    try {
      // 🐛 FIX: Validate progress value
      const validProgress = Math.min(100, Math.max(0, Math.round(progress)));
      
      console.log(`📊 JobManager: Updating progress for job ${jobId} to ${validProgress}%`);
      
      // 🐛 FIX: Check if job exists before updating
      const existingJob = await this.getJob(jobId);
      if (!existingJob) {
        throw new Error(`Job ${jobId} not found - cannot update progress`);
      }
      
      // 🐛 FIX: Don't update progress if job is already completed or failed
      if (existingJob.status === 'completed' || existingJob.status === 'failed') {
        console.warn(`⚠️ Skipping progress update for job ${jobId} - job is ${existingJob.status}`);
        return;
      }
      
      // 🐛 FIX: Only update if progress is actually increasing (prevent regression)
      if (validProgress < existingJob.progress && existingJob.progress < 100) {
        console.warn(`⚠️ Progress regression detected for job ${jobId}: ${existingJob.progress}% -> ${validProgress}%. Keeping current progress.`);
        return;
      }
      
      // Update with timestamp
      await this.updateJob(jobId, {
        progress: validProgress,
        updated_at: Date.now()
      });
      
      console.log(`✅ JobManager: Progress updated successfully for job ${jobId}: ${validProgress}%`);
      
    } catch (error) {
      console.error(`❌ JobManager: Failed to update progress for job ${jobId}:`, error);
      throw error; // Re-throw to allow caller to handle
    }
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
   * Detect and recover stuck jobs (FIXED: New method to handle stuck progress)
   */
  async detectAndRecoverStuckJobs(): Promise<number> {
    try {
      console.log('🔍 Checking for stuck jobs...');
      
      const stuckJobThreshold = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();
      
      // Get all processing jobs
      const processingJobs = await this.db.getJobsByStatus('processing');
      let recoveredCount = 0;
      
      for (const job of processingJobs) {
        const timeSinceUpdate = now - job.updated_at;
        
        // Check if job is stuck (no updates for more than threshold)
        if (timeSinceUpdate > stuckJobThreshold) {
          console.log(`🚨 Detected stuck job ${job.id}: ${Math.round(timeSinceUpdate / 1000)}s since last update`);
          
          // Attempt to recover the job
          if (job.progress === 0) {
            // Job never started properly - reset to queued
            console.log(`🔄 Resetting stuck job ${job.id} to queued (progress was 0%)`);
            await this.updateJob(job.id, {
              status: 'queued',
              progress: 0,
              error_message: undefined
            });
            recoveredCount++;
          } else if (job.progress < 100) {
            // Job was progressing but got stuck - fail it with helpful message
            console.log(`❌ Failing stuck job ${job.id} (progress was ${job.progress}%)`);
            await this.failJob(job.id, 
              `Conversion timed out after ${Math.round(timeSinceUpdate / 60000)} minutes. ` +
              'This may be due to network issues or server overload. Please try again.'
            );
            recoveredCount++;
          }
        }
      }
      
      if (recoveredCount > 0) {
        console.log(`✅ Recovered ${recoveredCount} stuck jobs`);
      } else {
        console.log('✅ No stuck jobs found');
      }
      
      return recoveredCount;
      
    } catch (error) {
      console.error('❌ Failed to detect and recover stuck jobs:', error);
      return 0;
    }
  }

  /**
   * Get jobs that haven't been updated recently (potential stuck jobs)
   */
  async getStaleJobs(thresholdMinutes: number = 10): Promise<ConversionJob[]> {
    try {
      const threshold = Date.now() - (thresholdMinutes * 60 * 1000);
      
      // Get processing jobs that haven't been updated recently
      const staleJobs = await this.db.getActiveConversionJobs(100);
      
      return staleJobs.filter(job => 
        job.status === 'processing' && 
        job.updated_at < threshold
      );
      
    } catch (error) {
      console.error('❌ Failed to get stale jobs:', error);
      return [];
    }
  }

  /**
   * Force progress update for a job (emergency recovery)
   */
  async forceProgressUpdate(jobId: string, progress: number, reason: string): Promise<boolean> {
    try {
      console.log(`🚨 Force updating progress for job ${jobId} to ${progress}% (reason: ${reason})`);
      
      await this.updateJob(jobId, {
        progress: Math.min(100, Math.max(0, progress)),
        updated_at: Date.now(),
        error_message: reason
      });
      
      console.log(`✅ Force progress update completed for job ${jobId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Force progress update failed for job ${jobId}:`, error);
      return false;
    }
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
