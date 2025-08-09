/**
 * Admin API endpoints for job state management
 *
 * Provides endpoints for:
 * - Monitoring job state statistics
 * - Manual job recovery operations
 * - System health checks
 * - Cleanup operations
 */

import { Env } from '../../types';
import { JobManager } from '../../utils/job-manager';
import { JobCleanupService } from '../../utils/job-cleanup-service';

export class JobManagementAPI {
  private env: Env;
  private jobManager: JobManager;
  private cleanupService: JobCleanupService;

  constructor(env: Env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.cleanupService = new JobCleanupService(env);
  }

  /**
   * Handle job management API requests
   */
  async handleRequest(request: Request, pathname: string): Promise<Response> {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!this.isAuthorized(authHeader)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      switch (pathname) {
        case '/admin/job-management/stats':
          return await this.getJobStatistics();

        case '/admin/job-management/health':
          return await this.getSystemHealth();

        case '/admin/job-management/cleanup':
          return await this.performCleanup(request);

        case '/admin/job-management/recover-stuck':
          return await this.recoverStuckJobs();

        case '/admin/job-management/validate-job':
          return await this.validateJob(request);

        case '/admin/job-management/force-fail':
          return await this.forceFailJob(request);

        case '/admin/job-management/force-reset':
          return await this.forceResetJob(request);

        case '/admin/job-management/extend-lock':
          return await this.extendJobLock(request);

        case '/admin/job-management/release-lock':
          return await this.releaseJobLock(request);

        default:
          return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Job management API error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Get comprehensive job statistics
   */
  private async getJobStatistics(): Promise<Response> {
    const stats = await this.jobManager.getJobStateStatistics();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...stats,
          timestamp: Date.now(),
          cleanupRunning: this.cleanupService.isCleanupRunning(),
          timeSinceLastCleanup: this.cleanupService.getTimeSinceLastCleanup(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Get system health information
   */
  private async getSystemHealth(): Promise<Response> {
    try {
      // Get health metrics from cache
      const healthMetrics = await this.env.CACHE?.get(
        'system_health_metrics',
        'json'
      );
      const lastCleanupReport =
        await this.cleanupService.getLastCleanupReport();

      // Get current database stats
      const dbStats = await this.jobManager['db'].getStats();

      const healthData = {
        timestamp: Date.now(),
        database: {
          status: 'healthy',
          ...dbStats,
        },
        cache: {
          status: this.env.CACHE ? 'healthy' : 'unavailable',
        },
        storage: {
          status: this.env.STORAGE ? 'healthy' : 'unavailable',
        },
        lastHealthMetrics: healthMetrics,
        lastCleanupReport,
        cleanupStatus: {
          running: this.cleanupService.isCleanupRunning(),
          timeSinceLastCleanup: this.cleanupService.getTimeSinceLastCleanup(),
        },
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: healthData,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get system health',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Perform manual cleanup
   */
  private async performCleanup(request: Request): Promise<Response> {
    const method = request.method;

    if (method === 'GET') {
      // Get last cleanup report
      const lastReport = await this.cleanupService.getLastCleanupReport();
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            lastReport,
            cleanupRunning: this.cleanupService.isCleanupRunning(),
            timeSinceLastCleanup: this.cleanupService.getTimeSinceLastCleanup(),
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (method === 'POST') {
      // Force cleanup
      const report = await this.cleanupService.forceCleanup();
      return new Response(
        JSON.stringify({
          success: true,
          data: report,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Recover stuck jobs manually
   */
  private async recoverStuckJobs(): Promise<Response> {
    const recoveredCount = await this.jobManager.detectAndRecoverStuckJobs();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recoveredJobs: recoveredCount,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Validate a specific job
   */
  private async validateJob(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId parameter required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const validation = await this.jobManager.validateJobState(jobId);
    const job = await this.jobManager.getJob(jobId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          jobId,
          job,
          validation,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Force fail a job
   */
  private async forceFailJob(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST method required' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as { jobId: string; reason?: string };

    if (!body.jobId) {
      return new Response(JSON.stringify({ error: 'jobId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reason = body.reason || 'Manually failed by administrator';
    const success = await this.jobManager.failJob(body.jobId, reason);

    return new Response(
      JSON.stringify({
        success,
        data: {
          jobId: body.jobId,
          reason,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Force reset a job to queued state
   */
  private async forceResetJob(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST method required' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as { jobId: string; reason?: string };

    if (!body.jobId) {
      return new Response(JSON.stringify({ error: 'jobId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const job = await this.jobManager.getJob(body.jobId);
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reason = body.reason || 'Manually reset by administrator';
    const success = await this.jobManager.transitionJobState(
      body.jobId,
      job.status,
      'queued',
      { progress: 0, error_message: undefined },
      reason
    );

    return new Response(
      JSON.stringify({
        success,
        data: {
          jobId: body.jobId,
          previousStatus: job.status,
          reason,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Extend a job lock
   */
  private async extendJobLock(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST method required' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as {
      jobId: string;
      lockId: string;
      additionalTime?: number;
    };

    if (!body.jobId || !body.lockId) {
      return new Response(
        JSON.stringify({ error: 'jobId and lockId required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const success = await this.jobManager.extendJobLock(
      body.jobId,
      body.lockId,
      body.additionalTime
    );

    return new Response(
      JSON.stringify({
        success,
        data: {
          jobId: body.jobId,
          lockId: body.lockId,
          additionalTime: body.additionalTime,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Release a job lock
   */
  private async releaseJobLock(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST method required' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as { jobId: string; lockId: string };

    if (!body.jobId || !body.lockId) {
      return new Response(
        JSON.stringify({ error: 'jobId and lockId required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const success = await this.jobManager.releaseJobLock(
      body.jobId,
      body.lockId
    );

    return new Response(
      JSON.stringify({
        success,
        data: {
          jobId: body.jobId,
          lockId: body.lockId,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Check if request is authorized
   */
  private isAuthorized(authHeader: string | null): boolean {
    if (!authHeader) return false;

    const token = authHeader.replace('Bearer ', '');
    return token === this.env.ADMIN_TOKEN;
  }
}

/**
 * Helper function to create job management routes
 */
export function createJobManagementRoutes(env: Env) {
  const api = new JobManagementAPI(env);

  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      return await api.handleRequest(request, url.pathname);
    },
  };
}
