/**
 * 🚀 优化的API Hook - 支持直连Workers和智能fallback
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, api, type ApiResponse } from '../lib/api-client-optimized';

export interface ApiConnectionInfo {
  endpoint: string | null;
  mode: 'direct' | 'proxy' | null;
  websocketUrl: string | null;
  isConnected: boolean;
  latency: number;
  lastCheck: Date | null;
}

export interface UseOptimizedApiReturn {
  // Connection info
  connectionInfo: ApiConnectionInfo;

  // API methods
  convert: (data: any) => Promise<ApiResponse>;
  convertFast: (data: any) => Promise<ApiResponse>;
  convertNoProxy: (data: any) => Promise<ApiResponse>;
  getStatus: (jobId: string) => Promise<ApiResponse>;
  validate: (data: any) => Promise<ApiResponse>;
  getPlatforms: () => Promise<ApiResponse>;

  // Connection management
  checkConnection: () => Promise<void>;
  resetConnection: () => Promise<void>;

  // Performance monitoring
  getPerformanceMetrics: () => any;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * 优化的API Hook
 */
export function useOptimizedApi(): UseOptimizedApiReturn {
  const [connectionInfo, setConnectionInfo] = useState<ApiConnectionInfo>({
    endpoint: null,
    mode: null,
    websocketUrl: null,
    isConnected: false,
    latency: 0,
    lastCheck: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 检查连接状态
   */
  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();

      // 获取连接信息
      const connInfo = await apiClient.getConnectionInfo();

      // 测试连接
      const healthResponse = await api.health();
      const latency = Date.now() - startTime;

      setConnectionInfo({
        endpoint: connInfo.endpoint,
        mode: connInfo.mode,
        websocketUrl: connInfo.websocketUrl,
        isConnected: healthResponse.success,
        latency,
        lastCheck: new Date(),
      });

      if (!healthResponse.success) {
        setError(healthResponse.error?.message || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionInfo(prev => ({
        ...prev,
        isConnected: false,
        lastCheck: new Date(),
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 重置连接
   */
  const resetConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.resetConnection();
      await checkConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  }, [checkConnection]);

  /**
   * 包装API调用以处理错误
   */
  const wrapApiCall = useCallback(
    (apiFunction: () => Promise<ApiResponse>) =>
      async (): Promise<ApiResponse> => {
        try {
          const response = await apiFunction();

          // 更新连接信息
          if (response.metadata) {
            setConnectionInfo(prev => ({
              ...prev,
              endpoint: response.metadata!.endpoint,
              mode: response.metadata!.mode,
              latency: response.metadata!.latency,
              isConnected: response.success,
              lastCheck: new Date(),
            }));
          }

          return response;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'API call failed');
          throw err;
        }
      },
    []
  );

  /**
   * 包装带参数的API调用
   */
  const wrapApiCallWithParams = useCallback(
    <T>(apiFunction: (params: T) => Promise<ApiResponse>) =>
      async (params: T): Promise<ApiResponse> => {
        try {
          const response = await apiFunction(params);

          // 更新连接信息
          if (response.metadata) {
            setConnectionInfo(prev => ({
              ...prev,
              endpoint: response.metadata!.endpoint,
              mode: response.metadata!.mode,
              latency: response.metadata!.latency,
              isConnected: response.success,
              lastCheck: new Date(),
            }));
          }

          return response;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'API call failed');
          throw err;
        }
      },
    []
  );

  /**
   * 获取性能指标
   */
  const getPerformanceMetrics = useCallback(() => {
    return apiClient.getPerformanceMetrics();
  }, []);

  // 初始化连接检查
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    connectionInfo,

    // API methods with error handling
    convert: wrapApiCallWithParams(api.convert),
    convertFast: wrapApiCallWithParams(api.convertFast),
    convertNoProxy: wrapApiCallWithParams(api.convertNoProxy),
    getStatus: wrapApiCallWithParams(api.getStatus),
    validate: wrapApiCallWithParams(api.validate),
    getPlatforms: wrapApiCall(api.getPlatforms),

    // Connection management
    checkConnection,
    resetConnection,

    // Performance monitoring
    getPerformanceMetrics,

    // States
    isLoading,
    error,
  };
}

/**
 * 简化的API Hook，只返回API调用方法
 */
export function useApi() {
  const {
    convert,
    convertFast,
    convertNoProxy,
    getStatus,
    validate,
    getPlatforms,
  } = useOptimizedApi();

  return {
    convert,
    convertFast,
    convertNoProxy,
    getStatus,
    validate,
    getPlatforms,
  };
}
