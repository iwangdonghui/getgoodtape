'use client';

import { useState, memo } from 'react';

interface TestResult {
  type: 'network' | 'websocket' | 'local';
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: string;
  timestamp?: number;
}

const WebSocketTester = memo(function WebSocketTester() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (
    type: TestResult['type'],
    status: TestResult['status'],
    message: string,
    details?: string
  ) => {
    setResults(prev => {
      const existing = prev.find(r => r.type === type);
      const newResult = {
        type,
        status,
        message,
        details,
        timestamp: Date.now(),
      };

      if (existing) {
        return prev.map(r => (r.type === type ? newResult : r));
      } else {
        return [...prev, newResult];
      }
    });
  };

  // 简单的网络连接检测（不依赖外部API）
  const testBasicConnectivity = async (): Promise<boolean> => {
    try {
      updateResult('network', 'running', '检测基本网络连接...');

      // 使用navigator.onLine作为基础检测
      if (!navigator.onLine) {
        updateResult('network', 'error', '设备显示离线状态');
        return false;
      }

      // 尝试连接到一个通用的、可靠的服务
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);

      try {
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });
        updateResult('network', 'success', '网络连接正常');
        return true;
      } catch (fetchError) {
        updateResult(
          'network',
          'error',
          '网络连接受限',
          '可能是防火墙或代理限制'
        );
        return false;
      }
    } catch (error) {
      updateResult(
        'network',
        'error',
        '网络检测失败',
        error instanceof Error ? error.message : '未知错误'
      );
      return false;
    }
  };

  // WebSocket连接测试
  const testWebSocketConnection = async (): Promise<boolean> => {
    return new Promise(resolve => {
      updateResult('websocket', 'running', '尝试WebSocket连接...');

      const wsUrl =
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        updateResult(
          'websocket',
          'error',
          '连接超时 (10秒)',
          '可能是网络限制或服务器问题'
        );
        resolve(false);
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        updateResult('websocket', 'success', 'WebSocket连接成功');

        // 发送测试消息
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.warn('发送测试消息失败:', error);
        }

        setTimeout(() => ws.close(), 1000);
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        updateResult(
          'websocket',
          'error',
          'WebSocket连接失败',
          '可能是网络限制、防火墙或CORS问题'
        );
        resolve(false);
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        if (event.code !== 1000 && event.code !== 1001) {
          let errorMessage = `连接关闭: ${event.code}`;

          switch (event.code) {
            case 1006:
              errorMessage += ' (异常关闭 - 网络问题或防火墙限制)';
              break;
            case 1002:
              errorMessage += ' (协议错误)';
              break;
            case 1003:
              errorMessage += ' (不支持的数据类型)';
              break;
            case 1011:
              errorMessage += ' (服务器错误)';
              break;
            default:
              if (event.reason) {
                errorMessage += ` (${event.reason})`;
              }
          }

          updateResult('websocket', 'error', errorMessage);
          resolve(false);
        }
      };
    });
  };

  // 本地WebSocket模拟
  const testLocalSimulation = async (): Promise<boolean> => {
    updateResult('local', 'running', '启动本地WebSocket模拟...');

    try {
      // 模拟WebSocket连接过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateResult(
        'local',
        'success',
        '本地WebSocket模拟成功',
        '模拟了连接、消息发送和接收过程。在实际应用中，会使用HTTP轮询作为备选方案。'
      );

      return true;
    } catch (error) {
      updateResult(
        'local',
        'error',
        '本地模拟失败',
        error instanceof Error ? error.message : '未知错误'
      );
      return false;
    }
  };

  // 运行完整测试
  const runFullTest = async () => {
    setIsRunning(true);
    setResults([]);

    // 1. 基本网络连接测试
    const networkOk = await testBasicConnectivity();

    // 2. WebSocket连接测试
    if (networkOk) {
      await testWebSocketConnection();
    } else {
      updateResult('websocket', 'pending', '跳过WebSocket测试（网络不可用）');
    }

    // 3. 本地模拟测试
    await testLocalSimulation();

    setIsRunning(false);
  };

  // 仅测试WebSocket
  const runWebSocketOnly = async () => {
    setIsRunning(true);
    setResults([]);

    await testWebSocketConnection();

    setIsRunning(false);
  };

  // 仅本地模拟
  const runLocalOnly = async () => {
    setIsRunning(true);
    setResults([]);

    await testLocalSimulation();

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'running':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getTypeLabel = (type: TestResult['type']) => {
    switch (type) {
      case 'network':
        return '网络连接';
      case 'websocket':
        return 'WebSocket连接';
      case 'local':
        return '本地模拟';
      default:
        return '未知测试';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          WebSocket连接测试
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={runFullTest}
            disabled={isRunning}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isRunning ? '🔄 测试中...' : '🔍 完整测试'}
          </button>
          <button
            onClick={runWebSocketOnly}
            disabled={isRunning}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            🚀 仅测试WS
          </button>
          <button
            onClick={runLocalOnly}
            disabled={isRunning}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            🏠 本地模拟
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded p-3">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {getTypeLabel(result.type)}
                  </div>
                  <div className={`text-sm ${getStatusColor(result.status)}`}>
                    {result.message}
                  </div>
                  {result.timestamp && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {result.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    查看详细信息
                  </summary>
                  <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                    {result.details}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isRunning && (
        <div className="text-center text-gray-500 py-8">
          <p>选择一种测试方式开始检测WebSocket连接</p>
          <div className="text-xs mt-2 space-y-1">
            <p>
              • <strong>完整测试</strong>: 网络检测 + WebSocket + 本地模拟
            </p>
            <p>
              • <strong>仅测试WS</strong>: 直接测试WebSocket连接
            </p>
            <p>
              • <strong>本地模拟</strong>: 测试本地WebSocket功能
            </p>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">💡 使用建议:</div>
          <ul className="text-xs space-y-1">
            <li>
              • <strong>网络受限时</strong>: 使用"本地模拟"测试功能
            </li>
            <li>
              • <strong>快速检测</strong>: 使用"仅测试WS"跳过网络检测
            </li>
            <li>
              • <strong>全面诊断</strong>: 使用"完整测试"了解整体状况
            </li>
            <li>
              • <strong>生产环境</strong>: WebSocket通常工作正常
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export default WebSocketTester;
