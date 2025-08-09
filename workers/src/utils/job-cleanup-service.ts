/**
 * Job Cleanup Service
 *
 * This service runs periodically to:
 * - Detect and recover stuck jobs
 * - Clean up expired jobs and locks
 * - Validate job states and fix inconsistencies
 * - Monitor system health
 */

import { Env } from '../types';
import { JobManager } from './job-manager';
import { DatabaseManager } from './database';

export interface CleanupReport {
  timestamp: number;
  stuckJobsRecovered: number;
  expiredJobsDeleted: number;
  expiredLocksCleared: number;
  orphanedJobsReset: number;
  validationIssuesFixed: number;
  totalProcessingTime: number;
  errors: string[];
}

export class JobCleanupService {
  private env: Env;
  private jobManager: JobManager;
  private dbManager: DatabaseManager;
  private isRunning: boolean = false;
  private lastCleanup: number = 0;

  // Configuration
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_CLEANUP_INTERVAL = 2 * 60 * 1000; // Minimum 2 minutes between cleanups

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.dbManager = new DatabaseManager(env);
  }

  /**
   * Perform comprehensive cleanup of job states
   */
  async performCleanup(): Promise<CleanupReport> {
    const startTime = Date.now();
    const report: CleanupReport = {
      timestamp: startTime,
      stuckJobsRecovered: 0,
      expiredJobsDeleted: 0,
      expiredLocksCleared: 0,
      orphanedJobsReset: 0,
      validationIssuesFixed: 0,
      totalProcessingTime: 0,
      errors: [],
    };

    // Prevent concurrent cleanup runs
    if (this.isRunning) {
      console.log('⚠️ Cleanup already running, skipping this cycle');
      return report;
    }

    // Respect minimum cleanup interval
    if (startTime - this.lastCleanup < this.MIN_CLEANUP_INTERVAL) {
      console.log('⚠️ Cleanup called too frequently, skipping this cycle');
      return report;
    }

    this.isRunning = true;
    this.lastCleanup = startTime;

    try {
      console.log('🧹 Starting comprehensive job cleanup...');

      // Step 1: Detect and recover stuck jobs
      try {
        console.log('🔍 Step 1: Detecting and recovering stuck jobs...');
        report.stuckJobsRecovered =
          await this.jobManager.detectAndRecoverStuckJobs();
        console.log(`✅ Recovered ${report.stuckJobsRecovered} stuck jobs`);
      } catch (error) {
        const errorMsg = `Failed to recover stuck jobs: ${error}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }

      // Step 2: Clean up expired jobs and locks
      try {
        console.log('🗑️ Step 2: Cleaning up expired jobs and locks...');
        const cleanupResult = await this.jobManager.performCleanup();
        report.expiredJobsDeleted = cleanupResult.expiredJobs;
        report.expiredLocksCleared = cleanupResult.expiredLocks;
        report.orphanedJobsReset = cleanupResult.orphanedJobs;
        console.log(
          `✅ Cleaned up ${report.expiredJobsDeleted} expired jobs, ${report.expiredLocksCleared} expired locks, ${report.orphanedJobsReset} orphaned jobs`
        );
      } catch (error) {
        const errorMsg = `Failed to clean up expired items: ${error}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }

      // Step 3: Validate and fix job state inconsistencies
      try {
        console.log(
          '🔧 Step 3: Validating and fixing job state inconsistencies...'
        );
        report.validationIssuesFixed = await this.validateAndFixJobStates();
        console.log(
          `✅ Fixed ${report.validationIssuesFixed} validation issues`
        );
      } catch (error) {
        const errorMsg = `Failed to validate job states: ${error}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }

      // Step 4: Log system health statistics
      try {
        console.log('📊 Step 4: Gathering system health statistics...');
        await this.logSystemHealth();
      } catch (error) {
        const errorMsg = `Failed to log system health: ${error}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }

      report.totalProcessingTime = Date.now() - startTime;

      console.log(`✅ Cleanup completed in ${report.totalProcessingTime}ms`);
      console.log(
        `📊 Summary: ${report.stuckJobsRecovered} stuck jobs recovered, ${report.expiredJobsDeleted} expired jobs deleted, ${report.validationIssuesFixed} issues fixed`
      );

      if (report.errors.length > 0) {
        console.warn(
          `⚠️ Cleanup completed with ${report.errors.length} errors`
        );
      }
    } catch (error) {
      const errorMsg = `Critical cleanup failure: ${error}`;
      console.error(`🚨 ${errorMsg}`);
      report.errors.push(errorMsg);
      report.totalProcessingTime = Date.now() - startTime;
    } finally {
      this.isRunning = false;
    }

    return report;
  }

  /**
   * Validate job states and fix common inconsistencies
   */
  private async validateAndFixJobStates(): Promise<number> {
    let issuesFixed = 0;

    try {
      // Get all active jobs for validation
      const activeJobs = await this.jobManager.getActiveJobs();

      for (const job of activeJobs) {
        try {
          const validation = await this.jobManager.validateJobState(job.id);

          if (!validation.isValid) {
            console.log(
              `🔧 Fixing validation issues for job ${job.id}:`,
              validation.issues
            );

            // Fix common issues
            for (const issue of validation.issues) {
              if (issue.type === 'error' || issue.type === 'critical') {
                // Fix progress inconsistencies
                if (issue.field === 'progress') {
                  if (job.status === 'completed' && job.progress !== 100) {
                    await this.jobManager.updateJob(job.id, { progress: 100 });
                    issuesFixed++;
                    console.log(
                      `✅ Fixed progress for completed job ${job.id}: set to 100%`
                    );
                  } else if (job.progress < 0) {
                    await this.jobManager.updateJob(job.id, { progress: 0 });
                    issuesFixed++;
                    console.log(
                      `✅ Fixed negative progress for job ${job.id}: set to 0%`
                    );
                  } else if (job.progress > 100) {
                    await this.jobManager.updateJob(job.id, { progress: 100 });
                    issuesFixed++;
                    console.log(
                      `✅ Fixed excessive progress for job ${job.id}: set to 100%`
                    );
                  }
                }

                // Fix missing download URL for completed jobs
                if (
                  issue.field === 'download_url' &&
                  job.status === 'completed'
                ) {
                  // This is a critical issue - mark job as failed
                  await this.jobManager.failJob(
                    job.id,
                    'Completed job missing download URL - marked as failed for retry'
                  );
                  issuesFixed++;
                  console.log(
                    `✅ Fixed missing download URL for job ${job.id}: marked as failed`
                  );
                }

                // Fix missing error message for failed jobs
                if (
                  issue.field === 'error_message' &&
                  job.status === 'failed' &&
                  !job.error_message
                ) {
                  await this.jobManager.updateJob(job.id, {
                    error_message:
                      'Job failed due to unknown error - please retry',
                  });
                  issuesFixed++;
                  console.log(
                    `✅ Added error message for failed job ${job.id}`
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to validate/fix job ${job.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to validate job states:', error);
      throw error;
    }

    return issuesFixed;
  }

  /**
   * Log system health statistics
   */
  private async logSystemHealth(): Promise<void> {
    try {
      const stats = await this.jobManager.getJobStateStatistics();

      console.log('📊 System Health Report:');
      console.log(`  Total Jobs: ${stats.totalJobs}`);
      console.log(`  Jobs by Status:`);
      console.log(`    - Queued: ${stats.byStatus.queued}`);
      console.log(`    - Processing: ${stats.byStatus.processing}`);
      console.log(`    - Completed: ${stats.byStatus.completed}`);
      console.log(`    - Failed: ${stats.byStatus.failed}`);
      console.log(`  Stuck Jobs: ${stats.stuckJobs}`);
      console.log(`  Locked Jobs: ${stats.lockedJobs}`);
      console.log(`  Average Processing Time: ${stats.averageProcessingTime}s`);

      if (stats.oldestProcessingJob) {
        console.log(
          `  Oldest Processing Job: ${stats.oldestProcessingJob.id} (${stats.oldestProcessingJob.age}s old, ${stats.oldestProcessingJob.progress}% progress)`
        );
      }

      // Alert on concerning metrics
      if (stats.stuckJobs > 5) {
        console.warn(
          `⚠️ High number of stuck jobs detected: ${stats.stuckJobs}`
        );
      }

      if (stats.byStatus.processing > 20) {
        console.warn(
          `⚠️ High number of processing jobs: ${stats.byStatus.processing}`
        );
      }

      if (stats.averageProcessingTime > 600) {
        // 10 minutes
        console.warn(
          `⚠️ High average processing time: ${stats.averageProcessingTime}s`
        );
      }

      // Store health metrics in KV for monitoring
      const healthMetrics = {
        timestamp: Date.now(),
        ...stats,
      };

      await this.env.CACHE?.put(
        'system_health_metrics',
        JSON.stringify(healthMetrics),
        { expirationTtl: 24 * 60 * 60 } // Keep for 24 hours
      );
    } catch (error) {
      console.error('❌ Failed to log system health:', error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  startScheduler(): void {
    console.log(
      `🕐 Starting job cleanup scheduler (interval: ${this.CLEANUP_INTERVAL / 1000}s)`
    );

    // Run initial cleanup
    this.performCleanup().catch(error => {
      console.error('❌ Initial cleanup failed:', error);
    });

    // Schedule periodic cleanup
    setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Get the last cleanup report
   */
  async getLastCleanupReport(): Promise<CleanupReport | null> {
    try {
      const reportData = await this.env.CACHE?.get(
        'last_cleanup_report',
        'json'
      );
      return reportData as CleanupReport | null;
    } catch (error) {
      console.error('❌ Failed to get last cleanup report:', error);
      return null;
    }
  }

  /**
   * Force immediate cleanup (for manual triggers)
   */
  async forceCleanup(): Promise<CleanupReport> {
    console.log('🚨 Force cleanup triggered');
    this.lastCleanup = 0; // Reset to allow immediate cleanup
    const report = await this.performCleanup();

    // Store report for later retrieval
    try {
      await this.env.CACHE?.put(
        'last_cleanup_report',
        JSON.stringify(report),
        { expirationTtl: 24 * 60 * 60 } // Keep for 24 hours
      );
    } catch (error) {
      console.error('❌ Failed to store cleanup report:', error);
    }

    return report;
  }

  /**
   * Check if cleanup is currently running
   */
  isCleanupRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get time since last cleanup
   */
  getTimeSinceLastCleanup(): number {
    return Date.now() - this.lastCleanup;
  }
}
