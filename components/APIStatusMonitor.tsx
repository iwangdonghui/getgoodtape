'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';

interface APIEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  status: 'unknown' | 'online' | 'offline' | 'slow';
  responseTime: number;
  lastChecked: string;
  error?: string;
}

interface APIStatusMonitorProps {
  className?: string;
}

const APIStatusMonitor = memo(function APIStatusMonitor({
  className = '',
}: APIStatusMonitorProps) {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([
    {
      name: '健康检查',
      url: '/api/health',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: '',
    },
    {
      name: '平台信息',
      url: '/api/platforms',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: '',
    },
    {
      name: 'URL验证',
      url: '/api/validate',
      method: 'POST',
      status: 'unknown',
      responseTime: 0,
      lastChecked: '',
    },
    {
      name: 'Workers API',
      url: 'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/health',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: '',
    },
    {
      name: '视频处理',
      url: 'https://getgoodtape-video-proc.fly.dev/health',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: '',
    },
  ]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const checkEndpoint = async (endpoint: APIEndpoint): Promise<APIEndpoint> => {
    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method: endpoint.method,
        mode: endpoint.url.startsWith('http') ? 'cors' : 'same-origin',
        cache: 'no-cache',
      };

      if (endpoint.method === 'POST' && endpoint.url.includes('validate')) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({
          url: 'https://www.youtube.com/watch?v=test',
        });
      }

      const response = await fetch(endpoint.url, options);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      let status: APIEndpoint['status'] = 'online';
      if (responseTime > 2000) status = 'slow';
      if (!response.ok) status = 'offline';

      return {
        ...endpoint,
        status,
        responseTime,
        lastChecked: new Date().toLocaleTimeString(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      return {
        ...endpoint,
        status: 'offline',
        responseTime,
        lastChecked: new Date().toLocaleTimeString(),
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  const checkAllEndpoints = async () => {
    setIsMonitoring(true);
    if (process.env.NODE_ENV === 'development')
      console.log('🔍 开始检查API端点状态...');

    const promises = endpoints.map(endpoint => checkEndpoint(endpoint));
    const results = await Promise.all(promises);

    setEndpoints(results);
    if (process.env.NODE_ENV === 'development')
      console.log('✅ API端点状态检查完成');
    setIsMonitoring(false);
  };

  const checkSingleEndpoint = async (index: number) => {
    const endpoint = endpoints[index];
    const result = await checkEndpoint(endpoint);

    setEndpoints(prev => prev.map((ep, i) => (i === index ? result : ep)));
  };

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkAllEndpoints();
    }, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, [autoRefresh, endpoints]);

  const getStatusIcon = (status: APIEndpoint['status']) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'slow':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: APIEndpoint['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'slow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 500) return 'text-green-600';
    if (responseTime < 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatResponseTime = (ms: number) => {
    if (ms === 0) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`bg-card rounded-xl p-6 border border-border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">API 状态监控</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            className="text-xs px-3 py-1 h-auto"
          >
            {autoRefresh ? '自动刷新中' : '自动刷新'}
          </Button>
          <Button
            onClick={checkAllEndpoints}
            disabled={isMonitoring}
            className="bg-primary hover:bg-primary/90"
          >
            {isMonitoring ? '检查中...' : '检查状态'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {endpoints.map((endpoint, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getStatusColor(endpoint.status)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span>{getStatusIcon(endpoint.status)}</span>
                <span className="font-medium">{endpoint.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {endpoint.method}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${getResponseTimeColor(endpoint.responseTime)}`}
                >
                  {formatResponseTime(endpoint.responseTime)}
                </span>
                <Button
                  onClick={() => checkSingleEndpoint(index)}
                  className="text-xs px-2 py-1 h-auto"
                  variant="outline"
                >
                  重试
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-600 break-all mb-1">
              {endpoint.url}
            </div>

            <div className="flex justify-between items-center text-xs">
              <span>
                {endpoint.lastChecked && `最后检查: ${endpoint.lastChecked}`}
              </span>
              {endpoint.error && (
                <span className="text-red-600">错误: {endpoint.error}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            在线: {endpoints.filter(ep => ep.status === 'online').length} /{' '}
            {endpoints.length}
          </span>
          <span>
            平均响应时间:{' '}
            {endpoints.length > 0
              ? formatResponseTime(
                  Math.round(
                    endpoints.reduce((sum, ep) => sum + ep.responseTime, 0) /
                      endpoints.length
                  )
                )
              : '-'}
          </span>
        </div>
      </div>
    </div>
  );
});

export default APIStatusMonitor;
