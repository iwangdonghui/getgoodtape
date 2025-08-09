import { ConversionJob, VideoMetadata, Env } from '../types';
import { DatabaseManager } from './database';
import { JobStateManager } from './job-state-manager';

export class JobManager {
  private db: DatabaseManager;
  private env: Env;
  private stateManager: JobStateManager;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseManager(env);
    this.stateManager = new JobStateManager(env);
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
   * Mark job as completed with download URL (atomic operation with state management)
   * 🚀 OPTIMIZED: Now supports download URL expiration and R2 key storage with robust state transitions
   */
  async completeJob(
    jobId: string,
    downloadUrl: string,
    filePath: string,
    metadata?: VideoMetadata,
    r2Key?: string,
    downloadExpiresAt?: number,
    lockId?: string
  ): Promise<boolean> {
    try {
      console.log(
        `✅ Attempting to complete job ${jobId} with robust state management`
      );

      // Calculate download URL expiration (24 hours from now if not provided)
      const expirationTime =
        downloadExpiresAt || Date.now() + 24 * 60 * 60 * 1000;

      // Use state manager for atomic transition
      const success = await this.stateManager.transitionJobState(
        jobId,
        'processing',
        'completed',
        {
          progress: 100,
          download_url: downloadUrl,
          download_expires_at: Math.floor(expirationTime / 1000), // Store as Unix timestamp
          r2_key: r2Key,
          file_path: filePath,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
        'Job completed successfully'
      );

      if (success) {
        console.log(
          `✅ Job ${jobId} completed successfully with download expiration: ${new Date(expirationTime).toISOString()}`
        );
        if (r2Key) {
          console.log(`📁 R2 key stored: ${r2Key}`);
        }

        // Release lock if provided
        if (lockId) {
          await this.stateManager.releaseJobLock(jobId, lockId);
        }
      } else {
        console.warn(
          `⚠️ Job ${jobId} completion failed - may have been completed by another process`
        );
      }

      return success;
    } catch (error) {
      console.error(`❌ Failed to complete job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Mark job as failed with error message using robust state management
   */
  async failJob(
    jobId: string,
    errorMessage: string,
    lockId?: string
  ): Promise<boolean> {
    try {
      console.log(
        `❌ Attempting to fail job ${jobId} with message: ${errorMessage}`
      );

      // Get current job to determine current state
      const job = await this.getJob(jobId);
      if (!job) {
        console.error(`❌ Cannot fail job ${jobId}: job not found`);
        return false;
      }

      // Use state manager for atomic transition
      const success = await this.stateManager.transitionJobState(
        jobId,
        job.status,
        'failed',
        {
          error_message: errorMessage,
        },
        `Job failed: ${errorMessage}`
      );

      if (success) {
        console.log(`✅ Job ${jobId} marked as failed successfully`);

        // Release lock if provided
        if (lockId) {
          await this.stateManager.releaseJobLock(jobId, lockId);
        }
      } else {
        console.warn(
          `⚠️ Failed to mark job ${jobId} as failed - may be in invalid state`
        );
      }

      return success;
    } catch (error) {
      console.error(`❌ Error failing job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Start processing a job with robust locking mechanism
   */
  async startProcessing(
    jobId: string
  ): Promise<{ success: boolean; lockId?: string }> {
    try {
      console.log(
        `🔒 Attempting to start processing job ${jobId} with robust locking`
      );

      // First validate the job state
      const validation = await this.stateManager.validateJobState(jobId);
      if (!validation.canProceed) {
        console.error(
          `❌ Cannot start processing job ${jobId}: validation failed`,
          validation.issues
        );
        return { success: false };
      }

      // Attempt to acquire lock
      const lockId = await this.stateManager.acquireJobLock(jobId);
      if (!lockId) {
        console.warn(`⚠️ Could not acquire lock for job ${jobId}`);
        return { success: false };
      }

      console.log(
        `✅ Successfully started processing job ${jobId} with lock ${lockId}`
      );
      return { success: true, lockId };
    } catch (error) {
      console.error(`❌ Failed to start processing job ${jobId}:`, error);
      return { success: false };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async startProcessingLegacy(jobId: string): Promise<boolean> {
    const result = await this.startProcessing(jobId);
    return result.success;
  }

  /**
   * Update job progress (FIXED: More robust with validation and error handling)
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    try {
      // 🐛 FIX: Validate progress value
      const validProgress = Math.min(100, Math.max(0, Math.round(progress)));

      console.log(
        `📊 JobManager: Updating progress for job ${jobId} to ${validProgress}%`
      );

      // 🐛 FIX: Check if job exists before updating
      const existingJob = await this.getJob(jobId);
      if (!existingJob) {
        throw new Error(`Job ${jobId} not found - cannot update progress`);
      }

      // 🐛 FIX: Don't update progress if job is already completed or failed
      if (
        existingJob.status === 'completed' ||
        existingJob.status === 'failed'
      ) {
        console.warn(
          `⚠️ Skipping progress update for job ${jobId} - job is ${existingJob.status}`
        );
        return;
      }

      // 🐛 FIX: Only update if progress is actually increasing (prevent regression)
      if (validProgress < existingJob.progress && existingJob.progress < 100) {
        console.warn(
          `⚠️ Progress regression detected for job ${jobId}: ${existingJob.progress}% -> ${validProgress}%. Keeping current progress.`
        );
        return;
      }

      // Update with timestamp
      await this.updateJob(jobId, {
        progress: validProgress,
        updated_at: Date.now(),
      });

      console.log(
        `✅ JobManager: Progress updated successfully for job ${jobId}: ${validProgress}%`
      );
    } catch (error) {
      console.error(
        `❌ JobManager: Failed to update progress for job ${jobId}:`,
        error
      );
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
   * Detect and recover stuck jobs using robust state management
   */
  async detectAndRecoverStuckJobs(): Promise<number> {
    try {
      console.log(
        '🔍 Starting comprehensive stuck job detection and recovery...'
      );

      const result = await this.stateManager.detectAndRecoverStuckJobs();

      console.log(
        `✅ Stuck job recovery completed: ${result.recoveredJobs} jobs recovered`
      );
      console.log(
        `📊 Recovery details: ${result.resetJobs} reset, ${result.failedJobs} failed`
      );

      // Log detailed results
      for (const detail of result.details) {
        console.log(
          `  - Job ${detail.jobId}: ${detail.action} (${detail.reason})`
        );
      }

      return result.recoveredJobs;
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
      const threshold = Date.now() - thresholdMinutes * 60 * 1000;

      // Get processing jobs that haven't been updated recently
      const staleJobs = await this.db.getActiveConversionJobs(100);

      return staleJobs.filter(
        job => job.status === 'processing' && job.updated_at < threshold
      );
    } catch (error) {
      console.error('❌ Failed to get stale jobs:', error);
      return [];
    }
  }

  /**
   * Force progress update for a job (emergency recovery)
   */
  async forceProgressUpdate(
    jobId: string,
    progress: number,
    reason: string
  ): Promise<boolean> {
    try {
      console.log(
        `🚨 Force updating progress for job ${jobId} to ${progress}% (reason: ${reason})`
      );

      await this.updateJob(jobId, {
        progress: Math.min(100, Math.max(0, progress)),
        updated_at: Date.now(),
        error_message: reason,
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

  /**
   * Validate job state comprehensively
   */
  async validateJobState(jobId: string) {
    return await this.stateManager.validateJobState(jobId);
  }

  /**
   * Extend job lock for long-running operations
   */
  async extendJobLock(
    jobId: string,
    lockId: string,
    additionalTime?: number
  ): Promise<boolean> {
    return await this.stateManager.extendJobLock(jobId, lockId, additionalTime);
  }

  /**
   * Release job lock manually
   */
  async releaseJobLock(jobId: string, lockId: string): Promise<boolean> {
    return await this.stateManager.releaseJobLock(jobId, lockId);
  }

  /**
   * Perform comprehensive cleanup of expired jobs and locks
   */
  async performCleanup() {
    return await this.stateManager.performCleanup();
  }

  /**
   * Get comprehensive job state statistics
   */
  async getJobStateStatistics() {
    return await this.stateManager.getJobStateStatistics();
  }

  /**
   * Transition job state with validation
   */
  async transitionJobState(
    jobId: string,
    fromStatus: string,
    toStatus: string,
    updates?: Partial<ConversionJob>,
    reason?: string
  ) {
    return await this.stateManager.transitionJobState(
      jobId,
      fromStatus as 'queued' | 'processing' | 'completed' | 'failed',
      toStatus as 'queued' | 'processing' | 'completed' | 'failed',
      updates,
      reason
    );
  }
}
