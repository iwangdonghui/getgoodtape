/**
 * 🚀 API层级简化 - 环境配置管理
 * 支持前端直连Workers，减少Next.js代理层
 */

export interface ApiEndpoints {
  workers: string;
  nextjs: string;
  websocket: string;
}

export interface ApiConfig {
  mode: 'direct' | 'proxy' | 'auto';
  endpoints: ApiEndpoints;
  timeout: number;
  retryAttempts: number;
  fallbackEnabled: boolean;
}

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isClient = typeof window !== 'undefined';

  // 开发环境端点
  const devEndpoints: ApiEndpoints = {
    workers: 'http://localhost:8787/api',
    nextjs: 'http://localhost:3000/api',
    websocket: 'ws://localhost:8787/api/ws',
  };

  // 生产环境端点
  const prodEndpoints: ApiEndpoints = {
    workers: 'https://your-workers-domain.workers.dev/api',
    nextjs: 'https://your-app-domain.com/api',
    websocket: 'wss://your-workers-domain.workers.dev/api/ws',
  };

  return {
    mode: 'auto', // 自动检测最佳模式
    endpoints: isDevelopment ? devEndpoints : prodEndpoints,
    timeout: 30000, // 30秒超时
    retryAttempts: 2,
    fallbackEnabled: true,
  };
}

/**
 * 检测Workers端点是否可用
 */
export async function checkWorkersAvailability(
  workersUrl: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    const response = await fetch(`${workersUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Workers endpoint not available:', error);
    return false;
  }
}

/**
 * 智能选择API端点
 */
export async function selectApiEndpoint(): Promise<{
  endpoint: string;
  mode: 'direct' | 'proxy';
  websocketUrl: string;
}> {
  const config = getApiConfig();

  // 如果强制使用代理模式
  if (config.mode === 'proxy') {
    return {
      endpoint: config.endpoints.nextjs,
      mode: 'proxy',
      websocketUrl: config.endpoints.websocket,
    };
  }

  // 如果强制使用直连模式
  if (config.mode === 'direct') {
    return {
      endpoint: config.endpoints.workers,
      mode: 'direct',
      websocketUrl: config.endpoints.websocket,
    };
  }

  // 自动模式：检测Workers可用性
  const workersAvailable = await checkWorkersAvailability(
    config.endpoints.workers
  );

  if (workersAvailable) {
    console.log('🚀 Using direct Workers connection (optimized)');
    return {
      endpoint: config.endpoints.workers,
      mode: 'direct',
      websocketUrl: config.endpoints.websocket,
    };
  } else {
    console.log('🔄 Falling back to Next.js API proxy');
    return {
      endpoint: config.endpoints.nextjs,
      mode: 'proxy',
      websocketUrl: config.endpoints.websocket,
    };
  }
}

/**
 * API性能监控
 */
export class ApiPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordRequest(endpoint: string, duration: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }

    const durations = this.metrics.get(endpoint)!;
    durations.push(duration);

    // 只保留最近100次请求的数据
    if (durations.length > 100) {
      durations.shift();
    }
  }

  getAverageLatency(endpoint: string): number {
    const durations = this.metrics.get(endpoint);
    if (!durations || durations.length === 0) return 0;

    const sum = durations.reduce((a, b) => a + b, 0);
    return sum / durations.length;
  }

  getMetrics() {
    const result: Record<string, { avgLatency: number; requestCount: number }> =
      {};

    for (const [endpoint, durations] of this.metrics.entries()) {
      result[endpoint] = {
        avgLatency: this.getAverageLatency(endpoint),
        requestCount: durations.length,
      };
    }

    return result;
  }
}

// 全局性能监控实例
export const performanceMonitor = new ApiPerformanceMonitor();
