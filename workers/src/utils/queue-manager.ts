import { ConversionJob, Env } from '../types';
import { DatabaseManager } from './database';

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
}

export class QueueManager {
  private db: DatabaseManager;
  private env: Env;
  private maxConcurrentJobs: number;
  private jobTimeoutMs: number;

  constructor(
    env: Env,
    maxConcurrentJobs: number = 5,
    jobTimeoutMs: number = 10 * 60 * 1000
  ) {
    this.env = env;
    this.db = new DatabaseManager(env);
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.jobTimeoutMs = jobTimeoutMs;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    if (!this.env.DB) {
      return {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      };
    }

    const stats = await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN status = 'completed' THEN updated_at - created_at ELSE NULL END) as avgProcessingTime
      FROM conversion_jobs 
      WHERE created_at > strftime('%s', 'now', '-24 hours')
    `
    ).first<QueueStats>();

    return (
      stats || {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      }
    );
  }

  /**
   * Get next jobs to process based on priority
   */
  async getNextJobs(limit: number = 1): Promise<ConversionJob[]> {
    if (!this.env.DB) {
      return [];
    }

    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM conversion_jobs 
      WHERE status = 'queued' 
      ORDER BY 
        CASE 
          WHEN format = 'mp3' THEN 1 
          ELSE 2 
        END,
        created_at ASC
      LIMIT ?
    `
    )
      .bind(limit)
      .all<ConversionJob>();

    return jobs.results || [];
  }

  /**
   * Check for stuck/timeout jobs and reset them
   */
  async handleTimeoutJobs(): Promise<number> {
    if (!this.env.DB) {
      return 0;
    }

    const timeoutThreshold = Math.floor(
      (Date.now() - this.jobTimeoutMs) / 1000
    );

    const result = await this.env.DB.prepare(
      `
      UPDATE conversion_jobs 
      SET status = 'failed', 
          error_message = 'Job timeout - processing took too long',
          updated_at = strftime('%s', 'now')
      WHERE status = 'processing' 
        AND updated_at < ?
    `
    )
      .bind(timeoutThreshold)
      .run();

    const timeoutCount = result.meta.changes || 0;

    if (timeoutCount > 0) {
      console.log(`Reset ${timeoutCount} timeout jobs`);
    }

    return timeoutCount;
  }

  /**
   * Get jobs by status with pagination
   */
  async getJobsByStatus(
    status: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversionJob[]> {
    if (!this.env.DB) {
      return [];
    }

    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM conversion_jobs 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    )
      .bind(status, limit, offset)
      .all<ConversionJob>();

    return jobs.results || [];
  }

  /**
   * Get recent jobs with optional filtering
   */
  async getRecentJobs(
    hours: number = 24,
    platform?: string,
    format?: string,
    limit: number = 100
  ): Promise<ConversionJob[]> {
    if (!this.env.DB) {
      return [];
    }

    let query = `
      SELECT * FROM conversion_jobs 
      WHERE created_at > strftime('%s', 'now', '-${hours} hours')
    `;
    const params: (string | number)[] = [];

    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }

    if (format) {
      query += ' AND format = ?';
      params.push(format);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const jobs = await this.env.DB.prepare(query)
      .bind(...params)
      .all<ConversionJob>();
    return jobs.results || [];
  }

  /**
   * Calculate job priority based on various factors
   */
  calculateJobPriority(job: ConversionJob): number {
    let priority = 100; // Base priority

    // MP3 jobs get higher priority (faster to process)
    if (job.format === 'mp3') {
      priority += 20;
    }

    // Older jobs get higher priority
    const ageHours = (Date.now() - job.created_at) / (1000 * 60 * 60);
    priority += Math.min(ageHours * 5, 50);

    // Platform-based priority adjustments
    const platformPriority: Record<string, number> = {
      tiktok: 10,
      youtube: 5,
      twitter: 8,
      instagram: 7,
      facebook: 3,
    };

    priority += platformPriority[job.platform.toLowerCase()] || 0;

    return Math.round(priority);
  }

  /**
   * Get queue position for a specific job
   */
  async getJobQueuePosition(jobId: string): Promise<number> {
    if (!this.env.DB) {
      return -1;
    }

    const job = await this.db.getConversionJob(jobId);
    if (!job || job.status !== 'queued') {
      return -1;
    }

    const result = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as position FROM conversion_jobs 
      WHERE status = 'queued' 
        AND (
          (format = 'mp3' AND ? = 'mp4') OR
          (format = ? AND created_at < ?)
        )
    `
    )
      .bind(job.format, job.format, job.created_at)
      .first<{ position: number }>();

    return (result?.position || 0) + 1;
  }

  /**
   * Update usage statistics
   */
  async updateUsageStats(job: ConversionJob): Promise<void> {
    if (!this.env.DB || job.status !== 'completed') {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const duration = job.updated_at - job.created_at;

    await this.env.DB.prepare(
      `
      INSERT INTO usage_stats (date, platform, format, total_conversions, successful_conversions, total_duration)
      VALUES (?, ?, ?, 1, 1, ?)
      ON CONFLICT(date, platform, format) DO UPDATE SET
        total_conversions = total_conversions + 1,
        successful_conversions = successful_conversions + 1,
        total_duration = total_duration + ?,
        updated_at = strftime('%s', 'now')
    `
    )
      .bind(today, job.platform, job.format, duration, duration)
      .run();
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanHours: number = 168): Promise<number> {
    // Default: 7 days
    if (!this.env.DB) {
      return 0;
    }

    const cutoffTime = Math.floor(
      (Date.now() - olderThanHours * 60 * 60 * 1000) / 1000
    );

    const result = await this.env.DB.prepare(
      `
      DELETE FROM conversion_jobs 
      WHERE (status = 'completed' OR status = 'failed') 
        AND updated_at < ?
    `
    )
      .bind(cutoffTime)
      .run();

    const deletedCount = result.meta.changes || 0;

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old jobs`);
    }

    return deletedCount;
  }

  /**
   * Get processing capacity info
   */
  async getCapacityInfo(): Promise<{
    maxConcurrent: number;
    currentProcessing: number;
    availableSlots: number;
    queueLength: number;
  }> {
    const stats = await this.getQueueStats();

    return {
      maxConcurrent: this.maxConcurrentJobs,
      currentProcessing: stats.processing,
      availableSlots: Math.max(0, this.maxConcurrentJobs - stats.processing),
      queueLength: stats.queued,
    };
  }
}
