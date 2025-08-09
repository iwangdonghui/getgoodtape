/**
 * Robust Job State Management System
 *
 * This module provides comprehensive job state management with:
 * - Race condition prevention through atomic operations
 * - Job locking mechanisms to prevent duplicate processing
 * - Timeout detection and recovery for stuck jobs
 * - Comprehensive state validation and cleanup procedures
 */

import { ConversionJob, ConversionStatus, Env } from '../types';
import { DatabaseManager } from './database';

export interface JobLock {
  jobId: string;
  lockId: string;
  lockedAt: number;
  lockedBy: string;
  expiresAt: number;
}

export interface JobStateTransition {
  from: ConversionStatus;
  to: ConversionStatus;
  timestamp: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface JobRecoveryResult {
  recoveredJobs: number;
  failedJobs: number;
  resetJobs: number;
  details: Array<{
    jobId: string;
    action: 'recovered' | 'failed' | 'reset';
    reason: string;
  }>;
}

export interface JobValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'warning' | 'error' | 'critical';
    message: string;
    field?: string;
  }>;
  canProceed: boolean;
}

export class JobStateManager {
  private db: DatabaseManager;
  private env: Env;
  private instanceId: string;

  // Configuration constants
  private readonly LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private readonly STUCK_JOB_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_PROCESSING_TIME = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseManager(env);
    this.instanceId = this.generateInstanceId();
  }

  /**
   * Attempt to acquire a lock for job processing
   * Returns lock ID if successful, null if job is already locked
   */
  async acquireJobLock(jobId: string): Promise<string | null> {
    try {
      const lockId = this.generateLockId();
      const now = Date.now();
      const expiresAt = now + this.LOCK_TIMEOUT;

      console.log(
        `🔒 Attempting to acquire lock for job ${jobId} with lock ID ${lockId}`
      );

      // First, check if job exists and is in a lockable state
      const job = await this.db.getConversionJob(jobId);
      if (!job) {
        console.warn(`⚠️ Cannot lock job ${jobId}: job not found`);
        return null;
      }

      // Only allow locking for queued jobs or stuck processing jobs
      if (job.status !== 'queued' && !this.isJobStuck(job)) {
        console.warn(
          `⚠️ Cannot lock job ${jobId}: job status is ${job.status} and not stuck`
        );
        return null;
      }

      // Check for existing locks in KV store
      const existingLockKey = `job_lock:${jobId}`;
      const existingLock = (await this.env.CACHE?.get(
        existingLockKey,
        'json'
      )) as JobLock | null;

      if (existingLock && existingLock.expiresAt > now) {
        console.warn(
          `⚠️ Job ${jobId} is already locked by ${existingLock.lockedBy} until ${new Date(existingLock.expiresAt).toISOString()}`
        );
        return null;
      }

      // Create new lock
      const lock: JobLock = {
        jobId,
        lockId,
        lockedAt: now,
        lockedBy: this.instanceId,
        expiresAt,
      };

      // Store lock in KV with expiration
      await this.env.CACHE?.put(existingLockKey, JSON.stringify(lock), {
        expirationTtl: Math.ceil(this.LOCK_TIMEOUT / 1000),
      });

      // Atomically update job status to processing if it's queued
      if (job.status === 'queued') {
        const success = await this.db.updateConversionJobAtomic(
          jobId,
          {
            status: 'processing',
            progress: 5,
            updated_at: now,
          },
          'queued'
        );

        if (!success) {
          // Another instance won the race, release our lock
          await this.env.CACHE?.delete(existingLockKey);
          console.warn(
            `⚠️ Lost race condition for job ${jobId}, releasing lock`
          );
          return null;
        }
      }

      console.log(
        `✅ Successfully acquired lock for job ${jobId} with lock ID ${lockId}`
      );
      return lockId;
    } catch (error) {
      console.error(`❌ Failed to acquire lock for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Release a job lock
   */
  async releaseJobLock(jobId: string, lockId: string): Promise<boolean> {
    try {
      const lockKey = `job_lock:${jobId}`;
      const existingLock = (await this.env.CACHE?.get(
        lockKey,
        'json'
      )) as JobLock | null;

      if (!existingLock) {
        console.warn(
          `⚠️ No lock found for job ${jobId} when trying to release`
        );
        return true; // Consider it released
      }

      if (existingLock.lockId !== lockId) {
        console.warn(
          `⚠️ Lock ID mismatch for job ${jobId}: expected ${lockId}, got ${existingLock.lockId}`
        );
        return false;
      }

      if (existingLock.lockedBy !== this.instanceId) {
        console.warn(
          `⚠️ Lock owner mismatch for job ${jobId}: expected ${this.instanceId}, got ${existingLock.lockedBy}`
        );
        return false;
      }

      await this.env.CACHE?.delete(lockKey);
      console.log(
        `🔓 Successfully released lock for job ${jobId} with lock ID ${lockId}`
      );
      return true;
    } catch (error) {
      console.error(`❌ Failed to release lock for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Extend a job lock if processing is taking longer than expected
   */
  async extendJobLock(
    jobId: string,
    lockId: string,
    additionalTime: number = this.LOCK_TIMEOUT
  ): Promise<boolean> {
    try {
      const lockKey = `job_lock:${jobId}`;
      const existingLock = (await this.env.CACHE?.get(
        lockKey,
        'json'
      )) as JobLock | null;

      if (
        !existingLock ||
        existingLock.lockId !== lockId ||
        existingLock.lockedBy !== this.instanceId
      ) {
        console.warn(
          `⚠️ Cannot extend lock for job ${jobId}: invalid lock or ownership`
        );
        return false;
      }

      const now = Date.now();
      const newExpiresAt = now + additionalTime;

      const extendedLock: JobLock = {
        ...existingLock,
        expiresAt: newExpiresAt,
      };

      await this.env.CACHE?.put(lockKey, JSON.stringify(extendedLock), {
        expirationTtl: Math.ceil(additionalTime / 1000),
      });

      console.log(
        `⏰ Extended lock for job ${jobId} until ${new Date(newExpiresAt).toISOString()}`
      );
      return true;
    } catch (error) {
      console.error(`❌ Failed to extend lock for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Perform atomic state transition with validation
   */
  async transitionJobState(
    jobId: string,
    fromStatus: ConversionStatus,
    toStatus: ConversionStatus,
    updates: Partial<ConversionJob> = {},
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(
        `🔄 Attempting state transition for job ${jobId}: ${fromStatus} → ${toStatus}`
      );

      // Validate the state transition
      if (!this.isValidStateTransition(fromStatus, toStatus)) {
        console.error(
          `❌ Invalid state transition for job ${jobId}: ${fromStatus} → ${toStatus}`
        );
        return false;
      }

      // Prepare update data
      const updateData: Partial<ConversionJob> = {
        ...updates,
        status: toStatus,
        updated_at: Date.now(),
      };

      // Perform atomic update
      const success = await this.db.updateConversionJobAtomic(
        jobId,
        updateData,
        fromStatus
      );

      if (success) {
        console.log(
          `✅ State transition successful for job ${jobId}: ${fromStatus} → ${toStatus}`
        );

        // Log the transition for audit purposes
        await this.logStateTransition(jobId, fromStatus, toStatus, reason);

        return true;
      } else {
        console.warn(
          `⚠️ State transition failed for job ${jobId}: job not in expected state ${fromStatus}`
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ State transition error for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Detect and recover stuck jobs
   */
  async detectAndRecoverStuckJobs(): Promise<JobRecoveryResult> {
    console.log('🔍 Starting stuck job detection and recovery...');

    const result: JobRecoveryResult = {
      recoveredJobs: 0,
      failedJobs: 0,
      resetJobs: 0,
      details: [],
    };

    try {
      const now = Date.now();
      const processingJobs = await this.db.getJobsByStatus('processing');

      for (const job of processingJobs) {
        const timeSinceUpdate = now - job.updated_at;
        const isStuck = this.isJobStuck(job);
        const isExpired = timeSinceUpdate > this.MAX_PROCESSING_TIME;

        if (isStuck || isExpired) {
          console.log(
            `🚨 Detected stuck job ${job.id}: ${Math.round(timeSinceUpdate / 1000)}s since last update`
          );

          // Check if job has an active lock
          const lockKey = `job_lock:${job.id}`;
          const existingLock = (await this.env.CACHE?.get(
            lockKey,
            'json'
          )) as JobLock | null;

          if (existingLock && existingLock.expiresAt > now) {
            console.log(
              `⏰ Job ${job.id} has active lock, extending timeout before recovery`
            );
            continue; // Skip jobs with active locks
          }

          // Determine recovery action based on job state
          if (job.progress === 0 || job.progress < 10) {
            // Job never started properly - reset to queued
            const success = await this.transitionJobState(
              job.id,
              'processing',
              'queued',
              { progress: 0, error_message: undefined },
              'Reset stuck job that never started'
            );

            if (success) {
              result.resetJobs++;
              result.details.push({
                jobId: job.id,
                action: 'reset',
                reason: `Job stuck at ${job.progress}% for ${Math.round(timeSinceUpdate / 60000)} minutes`,
              });
            }
          } else if (job.progress < 100) {
            // Job was progressing but got stuck - fail it
            const errorMessage = `Conversion timed out after ${Math.round(timeSinceUpdate / 60000)} minutes at ${job.progress}% progress. This may be due to network issues or server overload. Please try again.`;

            const success = await this.transitionJobState(
              job.id,
              'processing',
              'failed',
              { error_message: errorMessage },
              'Failed stuck job that was progressing'
            );

            if (success) {
              result.failedJobs++;
              result.details.push({
                jobId: job.id,
                action: 'failed',
                reason: errorMessage,
              });
            }
          }

          // Clean up any expired locks
          if (existingLock && existingLock.expiresAt <= now) {
            await this.env.CACHE?.delete(lockKey);
            console.log(`🧹 Cleaned up expired lock for job ${job.id}`);
          }
        }
      }

      result.recoveredJobs = result.resetJobs + result.failedJobs;

      console.log(
        `✅ Stuck job recovery completed: ${result.recoveredJobs} jobs recovered (${result.resetJobs} reset, ${result.failedJobs} failed)`
      );
      return result;
    } catch (error) {
      console.error('❌ Failed to detect and recover stuck jobs:', error);
      return result;
    }
  }

  /**
   * Comprehensive job state validation
   */
  async validateJobState(jobId: string): Promise<JobValidationResult> {
    const result: JobValidationResult = {
      isValid: true,
      issues: [],
      canProceed: true,
    };

    try {
      const job = await this.db.getConversionJob(jobId);

      if (!job) {
        result.isValid = false;
        result.canProceed = false;
        result.issues.push({
          type: 'critical',
          message: 'Job not found in database',
        });
        return result;
      }

      // Validate basic job properties
      if (!job.url || !job.url.trim()) {
        result.issues.push({
          type: 'error',
          message: 'Job URL is empty or invalid',
          field: 'url',
        });
        result.isValid = false;
      }

      if (!['mp3', 'mp4'].includes(job.format)) {
        result.issues.push({
          type: 'error',
          message: `Invalid format: ${job.format}`,
          field: 'format',
        });
        result.isValid = false;
      }

      if (job.progress < 0 || job.progress > 100) {
        result.issues.push({
          type: 'error',
          message: `Invalid progress value: ${job.progress}`,
          field: 'progress',
        });
        result.isValid = false;
      }

      // Validate status consistency
      if (job.status === 'completed' && job.progress !== 100) {
        result.issues.push({
          type: 'warning',
          message: `Completed job has progress ${job.progress}% instead of 100%`,
          field: 'progress',
        });
      }

      if (job.status === 'completed' && !job.download_url) {
        result.issues.push({
          type: 'error',
          message: 'Completed job missing download URL',
          field: 'download_url',
        });
        result.isValid = false;
      }

      if (job.status === 'failed' && !job.error_message) {
        result.issues.push({
          type: 'warning',
          message: 'Failed job missing error message',
          field: 'error_message',
        });
      }

      // Check for stuck jobs
      if (this.isJobStuck(job)) {
        result.issues.push({
          type: 'warning',
          message: `Job appears to be stuck (no updates for ${Math.round((Date.now() - job.updated_at) / 60000)} minutes)`,
          field: 'updated_at',
        });
      }

      // Check for expired jobs
      if (job.expires_at * 1000 < Date.now()) {
        result.issues.push({
          type: 'warning',
          message: 'Job has expired',
          field: 'expires_at',
        });
      }

      // Determine if processing can proceed
      result.canProceed =
        result.isValid &&
        !result.issues.some(issue => issue.type === 'critical');

      return result;
    } catch (error) {
      console.error(`❌ Job validation error for ${jobId}:`, error);
      result.isValid = false;
      result.canProceed = false;
      result.issues.push({
        type: 'critical',
        message: `Validation failed: ${error}`,
      });
      return result;
    }
  }

  /**
   * Cleanup expired jobs and locks
   */
  async performCleanup(): Promise<{
    expiredJobs: number;
    expiredLocks: number;
    orphanedJobs: number;
  }> {
    console.log('🧹 Starting job state cleanup...');

    const result = {
      expiredJobs: 0,
      expiredLocks: 0,
      orphanedJobs: 0,
    };

    try {
      // Clean up expired jobs from database
      result.expiredJobs = await this.db.deleteExpiredJobs();

      // Clean up expired locks from KV store
      // Note: KV automatically expires keys, but we can clean up manually for immediate effect
      const processingJobs = await this.db.getJobsByStatus('processing');
      const now = Date.now();

      for (const job of processingJobs) {
        const lockKey = `job_lock:${job.id}`;
        const lock = (await this.env.CACHE?.get(
          lockKey,
          'json'
        )) as JobLock | null;

        if (lock && lock.expiresAt <= now) {
          await this.env.CACHE?.delete(lockKey);
          result.expiredLocks++;

          // Check if job should be reset due to expired lock
          if (this.isJobStuck(job)) {
            await this.transitionJobState(
              job.id,
              'processing',
              'queued',
              { progress: 0, error_message: undefined },
              'Reset job with expired lock'
            );
            result.orphanedJobs++;
          }
        }
      }

      console.log(
        `✅ Cleanup completed: ${result.expiredJobs} expired jobs, ${result.expiredLocks} expired locks, ${result.orphanedJobs} orphaned jobs reset`
      );
      return result;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return result;
    }
  }

  /**
   * Get comprehensive job state statistics
   */
  async getJobStateStatistics(): Promise<{
    totalJobs: number;
    byStatus: Record<ConversionStatus, number>;
    stuckJobs: number;
    lockedJobs: number;
    averageProcessingTime: number;
    oldestProcessingJob?: {
      id: string;
      age: number;
      progress: number;
    };
  }> {
    try {
      const stats = await this.db.getStats();
      const processingJobs = await this.db.getJobsByStatus('processing');
      const now = Date.now();

      let stuckJobs = 0;
      let lockedJobs = 0;
      let totalProcessingTime = 0;
      let oldestJob: { id: string; age: number; progress: number } | undefined;

      for (const job of processingJobs) {
        const age = now - job.created_at;
        totalProcessingTime += age;

        if (this.isJobStuck(job)) {
          stuckJobs++;
        }

        // Check if job has active lock
        const lockKey = `job_lock:${job.id}`;
        const lock = (await this.env.CACHE?.get(
          lockKey,
          'json'
        )) as JobLock | null;
        if (lock && lock.expiresAt > now) {
          lockedJobs++;
        }

        // Track oldest job
        if (!oldestJob || age > oldestJob.age) {
          oldestJob = {
            id: job.id,
            age: Math.round(age / 1000), // Convert to seconds
            progress: job.progress,
          };
        }
      }

      const averageProcessingTime =
        processingJobs.length > 0
          ? Math.round(totalProcessingTime / processingJobs.length / 1000)
          : 0;

      // Get status counts
      const [queuedJobs, completedJobs, failedJobs] = await Promise.all([
        this.db.getJobsByStatus('queued'),
        this.db.getJobsByStatus('completed'),
        this.db.getJobsByStatus('failed'),
      ]);

      return {
        totalJobs: stats.totalJobs,
        byStatus: {
          queued: queuedJobs.length,
          processing: processingJobs.length,
          completed: completedJobs.length,
          failed: failedJobs.length,
        },
        stuckJobs,
        lockedJobs,
        averageProcessingTime,
        oldestProcessingJob: oldestJob,
      };
    } catch (error) {
      console.error('❌ Failed to get job state statistics:', error);
      throw error;
    }
  }

  // Private helper methods

  private isJobStuck(job: ConversionJob): boolean {
    const timeSinceUpdate = Date.now() - job.updated_at;
    return timeSinceUpdate > this.STUCK_JOB_THRESHOLD;
  }

  private isValidStateTransition(
    from: ConversionStatus,
    to: ConversionStatus
  ): boolean {
    const validTransitions: Record<ConversionStatus, ConversionStatus[]> = {
      queued: ['processing', 'failed'],
      processing: ['completed', 'failed', 'queued'], // Allow reset to queued for recovery
      completed: [], // Terminal state
      failed: ['queued'], // Allow retry
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  private async logStateTransition(
    jobId: string,
    from: ConversionStatus,
    to: ConversionStatus,
    reason?: string
  ): Promise<void> {
    try {
      const transition: JobStateTransition = {
        from,
        to,
        timestamp: Date.now(),
        reason,
        metadata: {
          instanceId: this.instanceId,
        },
      };

      // Store transition log in KV for audit purposes
      const logKey = `job_transition:${jobId}:${Date.now()}`;
      await this.env.CACHE?.put(logKey, JSON.stringify(transition), {
        expirationTtl: 7 * 24 * 60 * 60, // Keep for 7 days
      });
    } catch (error) {
      console.error(
        `❌ Failed to log state transition for job ${jobId}:`,
        error
      );
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  }
}
