/**
 * Progress Monitoring and Recovery System
 * Monitors conversion jobs and automatically recovers stuck jobs
 */

import { JobManager } from './job-manager';
import { ConversionService } from './conversion-service';
import { Env } from '../types';

export interface MonitoringStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  stuckJobs: number;
  recoveredJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

export class ProgressMonitor {
  private env: Env;
  private jobManager: JobManager;
  private conversionService: ConversionService;
  private monitoringInterval: any | null = null;
  private isMonitoring = false;

  // Configuration
  private readonly STUCK_JOB_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  private readonly MONITORING_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.conversionService = new ConversionService(env);
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('⚠️ Progress monitoring is already running');
      return;
    }

    console.log('🔍 Starting progress monitoring system...');
    this.isMonitoring = true;

    // Run initial check
    this.performMonitoringCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck();
    }, this.MONITORING_INTERVAL);

    console.log(`✅ Progress monitoring started (checking every ${this.MONITORING_INTERVAL / 1000}s)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Progress monitoring is not running');
      return;
    }

    console.log('🛑 Stopping progress monitoring system...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Progress monitoring stopped');
  }

  /**
   * Perform a single monitoring check
   */
  private async performMonitoringCheck(): Promise<void> {
    try {
      console.log('🔍 Performing progress monitoring check...');

      // Get monitoring statistics
      const stats = await this.getMonitoringStats();
      
      // Log current status
      this.logMonitoringStats(stats);

      // Detect and recover stuck jobs
      const recoveredJobs = await this.jobManager.detectAndRecoverStuckJobs();
      
      if (recoveredJobs > 0) {
        console.log(`🔄 Recovered ${recoveredJobs} stuck jobs`);
        
        // Update stats after recovery
        const updatedStats = await this.getMonitoringStats();
        this.logRecoveryStats(updatedStats, recoveredJobs);
      }

      // Check for system health issues
      await this.checkSystemHealth(stats);

      console.log('✅ Monitoring check completed');

    } catch (error) {
      console.error('❌ Monitoring check failed:', error);
    }
  }

  /**
   * Get comprehensive monitoring statistics
   */
  async getMonitoringStats(): Promise<MonitoringStats> {
    try {
      const [
        totalJobs,
        queuedJobs,
        processingJobs,
        completedJobs,
        failedJobs,
        stuckJobs
      ] = await Promise.all([
        this.getJobCountByStatus(),
        this.getJobCountByStatus('queued'),
        this.getJobCountByStatus('processing'),
        this.getJobCountByStatus('completed'),
        this.getJobCountByStatus('failed'),
        this.getStuckJobCount()
      ]);

      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const averageProcessingTime = await this.calculateAverageProcessingTime();

      return {
        totalJobs,
        queuedJobs,
        processingJobs,
        completedJobs,
        failedJobs,
        stuckJobs,
        recoveredJobs: 0, // Will be updated after recovery
        averageProcessingTime,
        successRate: Math.round(successRate * 100) / 100
      };

    } catch (error) {
      console.error('❌ Failed to get monitoring stats:', error);
      return {
        totalJobs: 0,
        queuedJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        stuckJobs: 0,
        recoveredJobs: 0,
        averageProcessingTime: 0,
        successRate: 0
      };
    }
  }

  /**
   * Get job count by status
   */
  private async getJobCountByStatus(status?: string): Promise<number> {
    try {
      if (!status) {
        // Get total job count
        const activeJobs = await this.jobManager.getActiveJobs();
        return activeJobs.length;
      }

      const jobs = await this.jobManager.getActiveJobs();
      return jobs.filter(job => job.status === status).length;

    } catch (error) {
      console.error(`❌ Failed to get job count for status ${status}:`, error);
      return 0;
    }
  }

  /**
   * Get count of stuck jobs
   */
  private async getStuckJobCount(): Promise<number> {
    try {
      const stuckJobs = await this.jobManager.getStaleJobs(10); // 10 minutes threshold
      return stuckJobs.length;
    } catch (error) {
      console.error('❌ Failed to get stuck job count:', error);
      return 0;
    }
  }

  /**
   * Calculate average processing time
   */
  private async calculateAverageProcessingTime(): Promise<number> {
    try {
      const completedJobs = await this.jobManager.getActiveJobs();
      const recentCompleted = completedJobs
        .filter(job => job.status === 'completed')
        .filter(job => Date.now() - job.created_at < 24 * 60 * 60 * 1000) // Last 24 hours
        .slice(0, 100); // Last 100 jobs

      if (recentCompleted.length === 0) {
        return 0;
      }

      const totalProcessingTime = recentCompleted.reduce((sum, job) => {
        return sum + (job.updated_at - job.created_at);
      }, 0);

      return Math.round(totalProcessingTime / recentCompleted.length / 1000); // Convert to seconds

    } catch (error) {
      console.error('❌ Failed to calculate average processing time:', error);
      return 0;
    }
  }

  /**
   * Log monitoring statistics
   */
  private logMonitoringStats(stats: MonitoringStats): void {
    console.log('\n📊 Progress Monitoring Stats:');
    console.log(`   Total Jobs: ${stats.totalJobs}`);
    console.log(`   Queued: ${stats.queuedJobs}`);
    console.log(`   Processing: ${stats.processingJobs}`);
    console.log(`   Completed: ${stats.completedJobs}`);
    console.log(`   Failed: ${stats.failedJobs}`);
    console.log(`   Stuck: ${stats.stuckJobs}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Avg Processing Time: ${stats.averageProcessingTime}s`);
  }

  /**
   * Log recovery statistics
   */
  private logRecoveryStats(stats: MonitoringStats, recoveredCount: number): void {
    console.log('\n🔄 Recovery Stats:');
    console.log(`   Jobs Recovered: ${recoveredCount}`);
    console.log(`   Remaining Stuck: ${stats.stuckJobs}`);
    console.log(`   New Success Rate: ${stats.successRate}%`);
  }

  /**
   * Check system health and alert if needed
   */
  private async checkSystemHealth(stats: MonitoringStats): Promise<void> {
    const alerts: string[] = [];

    // Check for high failure rate
    if (stats.successRate < 80 && stats.totalJobs > 10) {
      alerts.push(`Low success rate: ${stats.successRate}%`);
    }

    // Check for too many stuck jobs
    if (stats.stuckJobs > 5) {
      alerts.push(`High number of stuck jobs: ${stats.stuckJobs}`);
    }

    // Check for long processing times
    if (stats.averageProcessingTime > 300) { // 5 minutes
      alerts.push(`Long average processing time: ${stats.averageProcessingTime}s`);
    }

    // Check for queue backup
    if (stats.queuedJobs > 20) {
      alerts.push(`Large queue backup: ${stats.queuedJobs} jobs`);
    }

    if (alerts.length > 0) {
      console.log('\n🚨 System Health Alerts:');
      alerts.forEach(alert => console.log(`   ⚠️ ${alert}`));
      
      // TODO: Send alerts to monitoring system
      await this.sendHealthAlerts(alerts, stats);
    } else {
      console.log('✅ System health: All metrics normal');
    }
  }

  /**
   * Send health alerts to monitoring system
   */
  private async sendHealthAlerts(alerts: string[], stats: MonitoringStats): Promise<void> {
    try {
      // TODO: Implement actual alerting (email, Slack, etc.)
      console.log('📧 Health alerts would be sent to monitoring system');
      
      // For now, just log the alert data
      const alertData = {
        timestamp: new Date().toISOString(),
        alerts,
        stats,
        environment: this.env.ENVIRONMENT || 'unknown'
      };
      
      console.log('Alert Data:', JSON.stringify(alertData, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to send health alerts:', error);
    }
  }

  /**
   * Force recovery of all stuck jobs
   */
  async forceRecoveryAll(): Promise<number> {
    try {
      console.log('🚨 Forcing recovery of all stuck jobs...');
      
      const recoveredCount = await this.jobManager.detectAndRecoverStuckJobs();
      
      console.log(`✅ Force recovery completed: ${recoveredCount} jobs recovered`);
      return recoveredCount;
      
    } catch (error) {
      console.error('❌ Force recovery failed:', error);
      return 0;
    }
  }

  /**
   * Get detailed job status report
   */
  async getDetailedReport(): Promise<string> {
    try {
      const stats = await this.getMonitoringStats();
      const stuckJobs = await this.jobManager.getStaleJobs(10);
      
      let report = '\n📋 Detailed Progress Monitoring Report\n';
      report += '='.repeat(50) + '\n\n';
      
      // Overall statistics
      report += '📊 Overall Statistics:\n';
      report += `   Total Jobs: ${stats.totalJobs}\n`;
      report += `   Success Rate: ${stats.successRate}%\n`;
      report += `   Average Processing Time: ${stats.averageProcessingTime}s\n\n`;
      
      // Job status breakdown
      report += '📈 Job Status Breakdown:\n';
      report += `   ⏳ Queued: ${stats.queuedJobs}\n`;
      report += `   🔄 Processing: ${stats.processingJobs}\n`;
      report += `   ✅ Completed: ${stats.completedJobs}\n`;
      report += `   ❌ Failed: ${stats.failedJobs}\n`;
      report += `   🚨 Stuck: ${stats.stuckJobs}\n\n`;
      
      // Stuck jobs details
      if (stuckJobs.length > 0) {
        report += '🚨 Stuck Jobs Details:\n';
        stuckJobs.forEach((job, index) => {
          const stuckTime = Math.round((Date.now() - job.updated_at) / 60000);
          report += `   ${index + 1}. Job ${job.id}: ${job.progress}% (stuck for ${stuckTime}m)\n`;
        });
        report += '\n';
      }
      
      // Recommendations
      report += '💡 Recommendations:\n';
      if (stats.stuckJobs > 0) {
        report += '   • Run force recovery to unstick jobs\n';
      }
      if (stats.successRate < 90) {
        report += '   • Investigate causes of job failures\n';
      }
      if (stats.queuedJobs > 10) {
        report += '   • Consider scaling up processing capacity\n';
      }
      if (stats.averageProcessingTime > 180) {
        report += '   • Optimize processing pipeline for better performance\n';
      }
      
      return report;
      
    } catch (error) {
      return `❌ Failed to generate detailed report: ${error}`;
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitoring configuration
   */
  getConfig() {
    return {
      stuckJobThreshold: this.STUCK_JOB_THRESHOLD,
      monitoringInterval: this.MONITORING_INTERVAL,
      maxRecoveryAttempts: this.MAX_RECOVERY_ATTEMPTS,
      isActive: this.isMonitoring
    };
  }
}

/**
 * Create and start progress monitor
 */
export function createProgressMonitor(env: Env): ProgressMonitor {
  return new ProgressMonitor(env);
}

/**
 * Run one-time monitoring check
 */
export async function runMonitoringCheck(env: Env): Promise<MonitoringStats> {
  const monitor = new ProgressMonitor(env);
  return await monitor.getMonitoringStats();
}