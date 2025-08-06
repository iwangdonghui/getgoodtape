/**
 * 🚀 优化的API客户端 - 支持直连Workers和智能fallback
 */

import {
  selectApiEndpoint,
  performanceMonitor,
  getApiConfig,
} from './api-config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    retryable?: boolean;
  };
  metadata?: {
    endpoint: string;
    mode: 'direct' | 'proxy';
    latency: number;
    retryCount: number;
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  skipFallback?: boolean;
}

/**
 * 优化的API客户端类
 */
export class OptimizedApiClient {
  private currentEndpoint: string | null = null;
  private currentMode: 'direct' | 'proxy' | null = null;
  private websocketUrl: string | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化API客户端
   */
  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const { endpoint, mode, websocketUrl } = await selectApiEndpoint();
      this.currentEndpoint = endpoint;
      this.currentMode = mode;
      this.websocketUrl = websocketUrl;

      console.log(`🚀 API Client initialized: ${mode} mode (${endpoint})`);
    })();

    return this.initPromise;
  }

  /**
   * 发送API请求
   */
  async request<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    await this.initialize();

    const config = getApiConfig();
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options.retryAttempts ?? config.retryAttempts;

    while (retryCount <= maxRetries) {
      try {
        const response = await this.makeRequest<T>(path, options, retryCount);

        // 记录性能指标
        const latency = Date.now() - startTime;
        performanceMonitor.recordRequest(this.currentEndpoint!, latency);

        return {
          ...response,
          metadata: {
            endpoint: this.currentEndpoint!,
            mode: this.currentMode!,
            latency,
            retryCount,
          },
        };
      } catch (error) {
        retryCount++;

        // 如果是最后一次重试，或者不允许fallback，则抛出错误
        if (retryCount > maxRetries || options.skipFallback) {
          return {
            success: false,
            error: {
              type: 'REQUEST_FAILED',
              message: error instanceof Error ? error.message : 'Unknown error',
              retryable: false,
            },
            metadata: {
              endpoint: this.currentEndpoint!,
              mode: this.currentMode!,
              latency: Date.now() - startTime,
              retryCount: retryCount - 1,
            },
          };
        }

        // 尝试fallback到Next.js API
        if (this.currentMode === 'direct' && config.fallbackEnabled) {
          console.warn(
            `🔄 Direct request failed, trying fallback (attempt ${retryCount})`
          );
          await this.switchToFallback();
        }

        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // 这里不应该到达，但为了类型安全
    return {
      success: false,
      error: {
        type: 'MAX_RETRIES_EXCEEDED',
        message: 'Maximum retry attempts exceeded',
        retryable: false,
      },
    };
  }

  /**
   * 执行实际的HTTP请求
   */
  private async makeRequest<T>(
    path: string,
    options: RequestOptions,
    retryCount: number
  ): Promise<ApiResponse<T>> {
    const config = getApiConfig();
    const url = `${this.currentEndpoint}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout ?? config.timeout
    );

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 切换到fallback模式
   */
  private async switchToFallback(): Promise<void> {
    const config = getApiConfig();
    this.currentEndpoint = config.endpoints.nextjs;
    this.currentMode = 'proxy';
    console.log('🔄 Switched to fallback mode (Next.js API)');
  }

  /**
   * 获取WebSocket URL
   */
  async getWebSocketUrl(): Promise<string> {
    await this.initialize();
    return this.websocketUrl!;
  }

  /**
   * 获取当前连接信息
   */
  async getConnectionInfo() {
    await this.initialize();
    return {
      endpoint: this.currentEndpoint,
      mode: this.currentMode,
      websocketUrl: this.websocketUrl,
    };
  }

  /**
   * 重置连接（强制重新检测）
   */
  async resetConnection(): Promise<void> {
    this.currentEndpoint = null;
    this.currentMode = null;
    this.websocketUrl = null;
    this.initPromise = null;
    await this.initialize();
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return performanceMonitor.getMetrics();
  }
}

// 全局API客户端实例
export const apiClient = new OptimizedApiClient();

/**
 * 便捷的API调用函数
 */
export async function apiCall<T = any>(
  path: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiClient.request<T>(path, options);
}

/**
 * 特定的API调用函数
 */
export const api = {
  // 转换相关
  convert: (data: any) => apiCall('/convert', { method: 'POST', body: data }),
  convertFast: (data: any) =>
    apiCall('/convert-fast', { method: 'POST', body: data }),
  convertNoProxy: (data: any) =>
    apiCall('/convert-no-proxy', { method: 'POST', body: data }),

  // 状态查询
  getStatus: (jobId: string) => apiCall(`/status/${jobId}`),

  // 验证和平台
  validate: (data: any) => apiCall('/validate', { method: 'POST', body: data }),
  getPlatforms: () => apiCall('/platforms'),

  // 健康检查
  health: () => apiCall('/health'),

  // WebSocket信息
  getWebSocketInfo: () => apiCall('/ws/info'),
};
