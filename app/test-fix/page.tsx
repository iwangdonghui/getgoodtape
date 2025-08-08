'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export default function TestFixPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (
    test: string,
    status: TestResult['status'],
    message: string
  ) => {
    setResults(prev => [
      ...prev,
      {
        test,
        status,
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Health Check API
    addResult('Health Check API', 'pending', '测试健康检查API...');
    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();

      if (data.success) {
        addResult('Health Check API', 'success', '健康检查API正常工作');
      } else {
        addResult('Health Check API', 'error', `API错误: ${data.error}`);
      }
    } catch (error) {
      addResult('Health Check API', 'error', `请求失败: ${error}`);
    }

    // Test 2: WebSocket Connection
    addResult('WebSocket Connection', 'pending', '测试WebSocket连接...');
    try {
      const ws = new WebSocket(
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws'
      );

      const timeout = setTimeout(() => {
        ws.close();
        addResult('WebSocket Connection', 'error', '连接超时 (5秒)');
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        addResult('WebSocket Connection', 'success', 'WebSocket连接成功');
        ws.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        addResult('WebSocket Connection', 'error', 'WebSocket连接失败');
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        if (event.code !== 1000 && event.code !== 1005) {
          addResult('WebSocket Connection', 'error', `连接关闭: ${event.code}`);
        }
      };
    } catch (error) {
      addResult('WebSocket Connection', 'error', `WebSocket创建失败: ${error}`);
    }

    // Test 3: CORS Headers
    addResult('CORS Headers', 'pending', '检查CORS配置...');
    try {
      const response = await fetch('/api/health-check', {
        method: 'OPTIONS',
      });

      if (response.ok) {
        addResult('CORS Headers', 'success', 'CORS配置正常');
      } else {
        addResult('CORS Headers', 'error', `CORS检查失败: ${response.status}`);
      }
    } catch (error) {
      addResult('CORS Headers', 'error', `CORS测试失败: ${error}`);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'pending':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">🔧 WebSocket修复测试</h1>

          <div className="mb-6">
            <Button onClick={runTests} disabled={isRunning} className="w-full">
              {isRunning ? '测试中...' : '开始测试修复'}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">测试结果</h2>
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">
                      {getStatusIcon(result.status)}
                    </span>
                    <span className="font-medium">{result.test}</span>
                    <span
                      className={`text-sm ${getStatusColor(result.status)}`}
                    >
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700">{result.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {result.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && !isRunning && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">测试总结:</h3>
              <div className="text-sm text-blue-700">
                <p>
                  ✅ 成功: {results.filter(r => r.status === 'success').length}
                </p>
                <p>
                  ❌ 失败: {results.filter(r => r.status === 'error').length}
                </p>
                <p>
                  ⏳ 进行中:{' '}
                  {results.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">修复说明:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 添加了CORS代理API端点 (/api/health-check)</li>
              <li>• 改进了WebSocket错误处理和重连机制</li>
              <li>• 增强了错误消息的详细程度</li>
              <li>• 添加了超时处理和网络错误检测</li>
              <li>• 支持更多域名的CORS配置</li>
            </ul>
          </div>

          <div className="mt-4 text-center">
            <Button
              onClick={() => (window.location.href = '/websocket-test')}
              variant="outline"
            >
              前往完整测试页面
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
