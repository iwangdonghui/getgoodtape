/**
 * Database utility functions for GetGoodTape
 */

import { ConversionJob, PlatformConfig, UsageStats, Env } from '../types';
import { getGlobalMockDatabase } from './mock-database';

export class DatabaseManager {
  constructor(private env: Env) {}

  // Conversion Jobs
  async createConversionJob(
    job: Omit<ConversionJob, 'created_at' | 'updated_at' | 'expires_at'>
  ): Promise<ConversionJob> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 24 * 60 * 60; // 24 hours from now

    // Use mock database for development environment
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      const mockJob = await mockDb.createJob(
        job.id,
        job.url,
        job.platform,
        job.format as 'mp3' | 'mp4',
        job.quality
      );
      return {
        ...mockJob,
        format: job.format as 'mp3' | 'mp4',
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
      } as ConversionJob;
    }

    const stmt = this.env.DB.prepare(`
      INSERT INTO conversion_jobs (
        id, url, platform, format, quality, status, progress,
        file_path, download_url, metadata, error_message,
        created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt
      .bind(
        job.id,
        job.url,
        job.platform,
        job.format,
        job.quality,
        job.status,
        job.progress,
        job.file_path || null,
        job.download_url || null,
        job.metadata || null,
        job.error_message || null,
        now,
        now,
        expiresAt
      )
      .run();

    return {
      ...job,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    };
  }

  async getConversionJob(id: string): Promise<ConversionJob | null> {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      return await mockDb.getJob(id);
    }

    const stmt = this.env.DB.prepare(
      'SELECT * FROM conversion_jobs WHERE id = ?'
    );
    const result = await stmt.bind(id).first<ConversionJob>();
    return result || null;
  }

  async updateConversionJob(
    id: string,
    updates: Partial<ConversionJob>
  ): Promise<void> {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      await mockDb.updateJob(id, updates);
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    const fields = Object.keys(updates).filter(
      key => key !== 'id' && key !== 'created_at'
    );
    const values = fields.map(field => updates[field as keyof ConversionJob]);

    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = this.env.DB.prepare(`
      UPDATE conversion_jobs
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `);

    await stmt.bind(...values, now, id).run();
  }

  /**
   * Atomic update: only update if current status matches expected status
   * Returns true if update was successful, false if status didn't match
   */
  async updateConversionJobAtomic(
    id: string,
    updates: Partial<ConversionJob>,
    expectedStatus: string
  ): Promise<boolean> {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      await mockDb.updateJob(id, updates);
      return true; // Mock always succeeds
    }

    const now = Math.floor(Date.now() / 1000);

    const fields = Object.keys(updates).filter(
      key => key !== 'id' && key !== 'created_at'
    );
    const values = fields.map(field => updates[field as keyof ConversionJob]);

    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = this.env.DB.prepare(`
      UPDATE conversion_jobs
      SET ${setClause}, updated_at = ?
      WHERE id = ? AND status = ?
    `);

    const result = await stmt.bind(...values, now, id, expectedStatus).run();
    return (result.meta.changes || 0) > 0;
  }

  async deleteExpiredJobs(timestamp?: number): Promise<number> {
    const now = timestamp
      ? Math.floor(timestamp / 1000)
      : Math.floor(Date.now() / 1000);
    const stmt = this.env.DB.prepare(
      'DELETE FROM conversion_jobs WHERE expires_at < ?'
    );
    const result = await stmt.bind(now).run();
    return result.meta.changes || 0;
  }

  async getActiveConversionJobs(limit: number = 100): Promise<ConversionJob[]> {
    const stmt = this.env.DB.prepare(`
      SELECT * FROM conversion_jobs
      WHERE status IN ('queued', 'processing')
      ORDER BY created_at ASC
      LIMIT ?
    `);
    const result = await stmt.bind(limit).all<ConversionJob>();
    return result.results || [];
  }

  // 新增：检查重复URL的优化查询
  async findRecentConversionByUrl(
    url: string,
    hoursBack: number = 1
  ): Promise<ConversionJob | null> {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      return await mockDb.findRecentConversionByUrl(url, hoursBack);
    }

    const cutoffTime = Math.floor(Date.now() / 1000) - hoursBack * 3600;
    const stmt = this.env.DB.prepare(`
      SELECT * FROM conversion_jobs
      WHERE url = ? AND created_at > ? AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const result = await stmt.bind(url, cutoffTime).first<ConversionJob>();
    return result || null;
  }

  // 新增：批量状态更新
  async batchUpdateJobStatus(jobIds: string[], status: string): Promise<void> {
    if (jobIds.length === 0) return;

    const placeholders = jobIds.map(() => '?').join(',');
    const stmt = this.env.DB.prepare(`
      UPDATE conversion_jobs
      SET status = ?, updated_at = ?
      WHERE id IN (${placeholders})
    `);

    const now = Math.floor(Date.now() / 1000);
    await stmt.bind(status, now, ...jobIds).run();
  }

  async getJobsByStatus(status: string): Promise<ConversionJob[]> {
    const stmt = this.env.DB.prepare(
      'SELECT * FROM conversion_jobs WHERE status = ? ORDER BY created_at DESC'
    );
    const result = await stmt.bind(status).all<ConversionJob>();
    return result.results || [];
  }

  // Platforms
  async getAllPlatforms(): Promise<PlatformConfig[]> {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      return await mockDb.getPlatforms();
    }

    // Return all active platforms
    const stmt = this.env.DB.prepare(
      'SELECT * FROM platforms WHERE is_active = 1 ORDER BY name'
    );
    const result = await stmt.all<PlatformConfig>();
    return result.results || [];
  }

  async getPlatformByDomain(domain: string): Promise<PlatformConfig | null> {
    const stmt = this.env.DB.prepare(
      'SELECT * FROM platforms WHERE domain = ? AND is_active = 1'
    );
    const result = await stmt.bind(domain).first<PlatformConfig>();
    return result || null;
  }

  async updatePlatform(
    id: number,
    updates: Partial<PlatformConfig>
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const fields = Object.keys(updates).filter(
      key => key !== 'id' && key !== 'created_at'
    );
    const values = fields.map(field => updates[field as keyof PlatformConfig]);

    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = this.env.DB.prepare(`
      UPDATE platforms 
      SET ${setClause}, updated_at = ? 
      WHERE id = ?
    `);

    await stmt.bind(...values, now, id).run();
  }

  // Usage Stats
  async recordUsageStats(
    stats: Omit<UsageStats, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.env.DB.prepare(`
      INSERT OR REPLACE INTO usage_stats (
        date, platform, format, total_conversions, 
        successful_conversions, total_duration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt
      .bind(
        stats.date,
        stats.platform,
        stats.format,
        stats.total_conversions,
        stats.successful_conversions,
        stats.total_duration,
        now,
        now
      )
      .run();
  }

  async getUsageStats(
    startDate: string,
    endDate: string
  ): Promise<UsageStats[]> {
    const stmt = this.env.DB.prepare(`
      SELECT * FROM usage_stats 
      WHERE date >= ? AND date <= ? 
      ORDER BY date DESC, platform, format
    `);

    const result = await stmt.bind(startDate, endDate).all<UsageStats>();
    return result.results || [];
  }

  // Utility methods
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    try {
      const stmt = this.env.DB.prepare('SELECT 1 as test');
      await stmt.first();

      return {
        status: 'healthy',
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error}`);
    }
  }

  async getStats(): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalPlatforms: number;
    activePlatforms: number;
    todayJobs: number;
    successRate: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = Math.floor(new Date(today).getTime() / 1000);

    const [
      totalJobs,
      activeJobs,
      totalPlatforms,
      activePlatforms,
      todayJobs,
      successStats,
    ] = await Promise.all([
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM conversion_jobs'
      ).first<{ count: number }>(),
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM conversion_jobs WHERE status IN (?, ?)'
      )
        .bind('queued', 'processing')
        .first<{ count: number }>(),
      this.env.DB.prepare('SELECT COUNT(*) as count FROM platforms').first<{
        count: number;
      }>(),
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM platforms WHERE is_active = 1'
      ).first<{ count: number }>(),
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM conversion_jobs WHERE created_at >= ?'
      )
        .bind(todayStart)
        .first<{ count: number }>(),
      this.env.DB.prepare(
        `
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
          FROM conversion_jobs
          WHERE created_at >= ?
        `
      )
        .bind(todayStart)
        .first<{ total: number; completed: number }>(),
    ]);

    const successRate = successStats?.total
      ? (successStats.completed / successStats.total) * 100
      : 0;

    return {
      totalJobs: totalJobs?.count || 0,
      activeJobs: activeJobs?.count || 0,
      totalPlatforms: totalPlatforms?.count || 0,
      activePlatforms: activePlatforms?.count || 0,
      todayJobs: todayJobs?.count || 0,
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}
