// 管理员路由 - 查询性能监控和系统统计

import { Hono } from 'hono';
import { Env } from '../types';
import { DatabaseManager } from '../utils/database';
import { CacheManager } from '../utils/cache';
import { globalQueryOptimizer } from '../utils/query-optimizer';

const admin = new Hono<{ Bindings: Env }>();

// 查询性能统计
admin.get('/query-stats', async c => {
  try {
    const stats = globalQueryOptimizer.getQueryStats();
    const suggestions = globalQueryOptimizer.getOptimizationSuggestions();

    return c.json({
      success: true,
      data: {
        queryStats: stats,
        optimizationSuggestions: suggestions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get query stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve query statistics',
      },
      500
    );
  }
});

// 系统统计信息
admin.get('/system-stats', async c => {
  try {
    const db = new DatabaseManager(c.env);
    const cache = new CacheManager(c.env);

    const [dbStats, cacheStats] = await Promise.all([
      db.getStats(),
      cache.getCacheStats(),
    ]);

    return c.json({
      success: true,
      data: {
        database: dbStats,
        cache: cacheStats,
        query: globalQueryOptimizer.getQueryStats(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to retrieve system statistics',
      },
      500
    );
  }
});

// 缓存管理
admin.post('/cache/clear', async c => {
  try {
    const cache = new CacheManager(c.env);
    const { prefix } = await c.req.json();

    if (prefix) {
      const keys = await cache.list(prefix);
      await Promise.all(keys.map(key => cache.delete(key)));

      return c.json({
        success: true,
        message: `Cleared ${keys.length} cache entries with prefix: ${prefix}`,
      });
    } else {
      // 清理所有缓存需要谨慎处理
      return c.json(
        {
          success: false,
          error: 'Prefix is required for cache clearing',
        },
        400
      );
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to clear cache',
      },
      500
    );
  }
});

// 数据库清理
admin.post('/database/cleanup', async c => {
  try {
    const db = new DatabaseManager(c.env);
    // const { hoursOld = 24 } = await c.req.json();

    const deletedCount = await db.deleteExpiredJobs();

    return c.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired jobs`,
      deletedCount,
    });
  } catch (error) {
    console.error('Failed to cleanup database:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to cleanup database',
      },
      500
    );
  }
});

// 查询优化建议
admin.get('/optimization-report', async c => {
  try {
    const db = new DatabaseManager(c.env);
    const cache = new CacheManager(c.env);

    const [dbStats, cacheStats, queryStats] = await Promise.all([
      db.getStats(),
      cache.getCacheStats(),
      globalQueryOptimizer.getQueryStats(),
    ]);

    const report = {
      summary: {
        totalQueries: queryStats.totalQueries,
        averageQueryTime: queryStats.averageExecutionTime,
        cacheHitRate:
          Object.values(cacheStats.hitRate).reduce((a, b) => a + b, 0) /
            Object.keys(cacheStats.hitRate).length || 0,
        successRate: queryStats.successRate,
      },
      recommendations: [
        ...globalQueryOptimizer.getOptimizationSuggestions(),
        ...(queryStats.averageExecutionTime > 500
          ? ['考虑增加更多数据库索引']
          : []),
        ...(dbStats.activeJobs > 100 ? ['考虑增加处理能力或优化任务队列'] : []),
        ...(Object.values(cacheStats.hitRate).some(rate => rate < 80)
          ? ['优化缓存策略以提高命中率']
          : []),
      ],
      details: {
        database: dbStats,
        cache: cacheStats,
        queries: queryStats,
      },
    };

    return c.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate optimization report:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate optimization report',
      },
      500
    );
  }
});

// 实时性能监控
admin.get('/performance/realtime', async c => {
  try {
    const db = new DatabaseManager(c.env);

    // 获取最近5分钟的活动
    const recentJobs = await db.getActiveConversionJobs(50);
    const now = Date.now();
    const fiveMinutesAgo = Math.floor((now - 5 * 60 * 1000) / 1000);

    const recentActivity = recentJobs.filter(
      job => job.updated_at && job.updated_at > fiveMinutesAgo
    );

    const metrics = {
      activeJobs: recentJobs.length,
      recentActivity: recentActivity.length,
      processingJobs: recentJobs.filter(job => job.status === 'processing')
        .length,
      queuedJobs: recentJobs.filter(job => job.status === 'queued').length,
      averageProgress:
        recentJobs.reduce((sum, job) => sum + (job.progress || 0), 0) /
          recentJobs.length || 0,
    };

    return c.json({
      success: true,
      data: {
        metrics,
        recentJobs: recentActivity.slice(0, 10), // 最近10个活动任务
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get realtime performance:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get realtime performance data',
      },
      500
    );
  }
});

export default admin;
