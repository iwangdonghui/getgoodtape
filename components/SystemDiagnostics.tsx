'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
  timestamp: string;
}

interface SystemDiagnosticsProps {
  className?: string;
}

const SystemDiagnostics = memo(function SystemDiagnostics({
  className = '',
}: SystemDiagnosticsProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (
    name: string,
    status: DiagnosticResult['status'],
    message: string,
    details?: any
  ) => {
    setResults(prev => [
      ...prev,
      {
        name,
        status,
        message,
        details,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // 检查浏览器兼容性
  const checkBrowserCompatibility = () => {
    addResult('Browser', 'pending', '检查浏览器兼容性...');

    const checks = {
      fetch: typeof fetch !== 'undefined',
      websocket: typeof WebSocket !== 'undefined',
      localStorage: typeof Storage !== 'undefined',
      es6: typeof Promise !== 'undefined',
      modules: typeof Symbol !== 'undefined',
    };

    const failedChecks = Object.entries(checks).filter(
      ([, supported]) => !supported
    );

    if (failedChecks.length === 0) {
      addResult('Browser', 'pass', '浏览器完全兼容', checks);
    } else {
      addResult(
        'Browser',
        'fail',
        `不支持的功能: ${failedChecks.map(([name]) => name).join(', ')}`,
        checks
      );
    }
  };

  // 检查网络连接
  const checkNetworkConnectivity = async () => {
    addResult('Network', 'pending', '检查网络连接...');

    try {
      // 测试基本连接
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
      });

      if (response.ok) {
        const data = await response.json();
        addResult('Network', 'pass', '前端API连接正常', data);
      } else {
        addResult('Network', 'warning', `前端API响应异常: ${response.status}`, {
          status: response.status,
        });
      }
    } catch (error) {
      addResult(
        'Network',
        'fail',
        `网络连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    }
  };

  // 检查API端点
  const checkAPIEndpoints = async () => {
    const endpoints = [
      { name: 'Health Check', url: '/api/health', method: 'GET' },
      { name: 'Platforms', url: '/api/platforms', method: 'GET' },
      {
        name: 'Validate',
        url: '/api/validate',
        method: 'POST',
        body: { url: 'https://www.youtube.com/watch?v=test' },
      },
    ];

    for (const endpoint of endpoints) {
      addResult(
        `API:${endpoint.name}`,
        'pending',
        `测试 ${endpoint.name} 端点...`
      );

      try {
        const options: RequestInit = {
          method: endpoint.method,
          cache: 'no-cache',
          headers: endpoint.body ? { 'Content-Type': 'application/json' } : {},
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.url, options);
        const data = await response.json();

        if (response.ok) {
          addResult(
            `API:${endpoint.name}`,
            'pass',
            `${endpoint.name} 端点正常`,
            data
          );
        } else {
          addResult(
            `API:${endpoint.name}`,
            'warning',
            `${endpoint.name} 端点响应异常: ${response.status}`,
            data
          );
        }
      } catch (error) {
        addResult(
          `API:${endpoint.name}`,
          'fail',
          `${endpoint.name} 端点连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
          error
        );
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 检查本地存储
  const checkLocalStorage = () => {
    addResult('Storage', 'pending', '检查本地存储...');

    try {
      const testKey = 'diagnostic_test';
      const testValue = 'test_value';

      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (retrieved === testValue) {
        addResult('Storage', 'pass', 'LocalStorage 功能正常');
      } else {
        addResult('Storage', 'fail', 'LocalStorage 读写异常');
      }
    } catch (error) {
      addResult(
        'Storage',
        'fail',
        `LocalStorage 不可用: ${error instanceof Error ? error.message : '未知错误'}`,
        error
      );
    }
  };

  // 检查性能指标
  const checkPerformance = () => {
    addResult('Performance', 'pending', '检查性能指标...');

    const metrics = {
      memory: (performance as any).memory
        ? {
            used: Math.round(
              (performance as any).memory.usedJSHeapSize / 1024 / 1024
            ),
            total: Math.round(
              (performance as any).memory.totalJSHeapSize / 1024 / 1024
            ),
            limit: Math.round(
              (performance as any).memory.jsHeapSizeLimit / 1024 / 1024
            ),
          }
        : null,
      timing: performance.timing
        ? {
            loadTime:
              performance.timing.loadEventEnd -
              performance.timing.navigationStart,
            domReady:
              performance.timing.domContentLoadedEventEnd -
              performance.timing.navigationStart,
          }
        : null,
      connection: (navigator as any).connection
        ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
            rtt: (navigator as any).connection.rtt,
          }
        : null,
    };

    let status: DiagnosticResult['status'] = 'pass';
    let message = '性能指标正常';

    if (metrics.memory && metrics.memory.used > 100) {
      status = 'warning';
      message = `内存使用较高: ${metrics.memory.used}MB`;
    }

    if (metrics.timing && metrics.timing.loadTime > 5000) {
      status = 'warning';
      message = `页面加载较慢: ${metrics.timing.loadTime}ms`;
    }

    addResult('Performance', status, message, metrics);
  };

  // 运行完整诊断
  const runFullDiagnostics = async () => {
    setIsRunning(true);
    clearResults();

    if (process.env.NODE_ENV === 'development')
      console.log('🔍 开始系统诊断...');

    checkBrowserCompatibility();
    await new Promise(resolve => setTimeout(resolve, 500));

    checkLocalStorage();
    await new Promise(resolve => setTimeout(resolve, 500));

    checkPerformance();
    await new Promise(resolve => setTimeout(resolve, 500));

    await checkNetworkConnectivity();
    await new Promise(resolve => setTimeout(resolve, 500));

    await checkAPIEndpoints();

    if (process.env.NODE_ENV === 'development') console.log('✅ 系统诊断完成');
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'fail':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-card rounded-xl p-6 border border-border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">系统诊断</h2>
        <div className="flex gap-2">
          <Button
            onClick={runFullDiagnostics}
            disabled={isRunning}
            className="bg-primary hover:bg-primary/90"
          >
            {isRunning ? '诊断中...' : '运行诊断'}
          </Button>
          <Button onClick={clearResults} variant="outline">
            清空结果
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            点击"运行诊断"开始系统检查
          </p>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span>{getStatusIcon(result.status)}</span>
                  <span className="font-medium">{result.name}</span>
                </div>
                <span className="text-xs opacity-75">{result.timestamp}</span>
              </div>
              <p className="text-sm">{result.message}</p>
              {result.details && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer">
                    查看详细信息
                  </summary>
                  <pre className="text-xs mt-1 p-2 bg-black/5 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default SystemDiagnostics;
