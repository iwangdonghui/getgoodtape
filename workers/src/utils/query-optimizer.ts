// 查询优化器 - 监控和优化数据库查询性能

interface QueryMetrics {
  queryType: string;
  executionTime: number;
  timestamp: number;
  success: boolean;
  rowsAffected?: number;
}

interface QueryOptimizationConfig {
  slowQueryThreshold: number; // 慢查询阈值 (毫秒)
  enableLogging: boolean;
  enableMetrics: boolean;
}

export class QueryOptimizer {
  private metrics: QueryMetrics[] = [];
  private config: QueryOptimizationConfig;

  constructor(config: Partial<QueryOptimizationConfig> = {}) {
    this.config = {
      slowQueryThreshold: 1000, // 1秒
      enableLogging: true,
      enableMetrics: true,
      ...config,
    };
  }

  // 查询性能监控装饰器
  async measureQuery<T>(
    queryType: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await queryFn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;

      if (this.config.enableMetrics) {
        this.recordMetrics({
          queryType,
          executionTime,
          timestamp: Date.now(),
          success,
        });
      }

      if (this.config.enableLogging) {
        this.logQuery(queryType, executionTime, success);
      }
    }
  }

  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private logQuery(
    queryType: string,
    executionTime: number,
    success: boolean
  ): void {
    const level =
      executionTime > this.config.slowQueryThreshold ? 'warn' : 'info';
    const status = success ? 'SUCCESS' : 'FAILED';

    console[level](`[QUERY] ${queryType} - ${executionTime}ms - ${status}`);

    if (executionTime > this.config.slowQueryThreshold) {
      console.warn(
        `🐌 Slow query detected: ${queryType} took ${executionTime}ms`
      );
    }
  }

  // 获取查询统计信息
  getQueryStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    successRate: number;
    topSlowQueries: Array<{
      queryType: string;
      avgTime: number;
      count: number;
    }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        successRate: 0,
        topSlowQueries: [],
      };
    }

    const totalQueries = this.metrics.length;
    const successfulQueries = this.metrics.filter(m => m.success).length;
    const slowQueries = this.metrics.filter(
      m => m.executionTime > this.config.slowQueryThreshold
    ).length;
    const averageExecutionTime =
      this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const successRate = (successfulQueries / totalQueries) * 100;

    // 计算最慢的查询类型
    const queryTypeStats = new Map<
      string,
      { totalTime: number; count: number }
    >();

    this.metrics.forEach(metric => {
      const existing = queryTypeStats.get(metric.queryType) || {
        totalTime: 0,
        count: 0,
      };
      queryTypeStats.set(metric.queryType, {
        totalTime: existing.totalTime + metric.executionTime,
        count: existing.count + 1,
      });
    });

    const topSlowQueries = Array.from(queryTypeStats.entries())
      .map(([queryType, stats]) => ({
        queryType,
        avgTime: stats.totalTime / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      slowQueries,
      successRate: Math.round(successRate * 100) / 100,
      topSlowQueries,
    };
  }

  // 查询优化建议
  getOptimizationSuggestions(): string[] {
    const stats = this.getQueryStats();
    const suggestions: string[] = [];

    if (stats.slowQueries > stats.totalQueries * 0.1) {
      suggestions.push('考虑添加数据库索引来优化慢查询');
    }

    if (stats.averageExecutionTime > 500) {
      suggestions.push('平均查询时间较高，建议检查查询复杂度');
    }

    if (stats.successRate < 95) {
      suggestions.push('查询失败率较高，建议检查错误处理和重试机制');
    }

    const topSlow = stats.topSlowQueries[0];
    if (topSlow && topSlow.avgTime > 1000) {
      suggestions.push(`最慢的查询类型是 "${topSlow.queryType}"，建议优先优化`);
    }

    return suggestions;
  }

  // 清理旧的指标数据
  cleanup(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}

// 全局查询优化器实例
export const globalQueryOptimizer = new QueryOptimizer({
  slowQueryThreshold: 1000,
  enableLogging: true,
  enableMetrics: true,
});

// 查询优化装饰器函数
export function optimizeQuery() {
  return function <T extends unknown[], R>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      return globalQueryOptimizer.measureQuery(
        `${(target as any).constructor.name}.${propertyName}`,
        () => method.apply(this, args)
      );
    };
  };
}
