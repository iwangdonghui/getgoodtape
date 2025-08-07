'use client';

import { useState, useEffect, memo } from 'react';

interface WebSocketStatusProps {
  className?: string;
}

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  url: string;
  lastConnected?: string;
  error?: string;
  latency?: number;
}

const WebSocketStatus = memo(function WebSocketStatus({
  className = '',
}: WebSocketStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    url: 'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws',
  });

  const testWebSocketConnection = async (skipHttpTest = false) => {
    const wsUrl = connectionStatus.url;

    setConnectionStatus(prev => ({
      ...prev,
      status: 'connecting',
      error: undefined,
    }));

    try {
      const startTime = Date.now();

      // 首先测试HTTP连接到Workers (可选)
      let httpTestPassed = false;

      if (!skipHttpTest) {
        console.log('🔍 Testing HTTP connection to Workers first...');

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

          const httpTest = await fetch(
            'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/health',
            {
              method: 'GET',
              headers: { 'Cache-Control': 'no-cache' },
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (httpTest.ok) {
            console.log('✅ Workers HTTP connection successful');
            httpTestPassed = true;
          } else {
            console.warn(`⚠️ Workers API返回错误状态: ${httpTest.status}`);
          }
        } catch (httpError) {
          console.warn(
            '⚠️ Workers HTTP连接失败，但继续尝试WebSocket:',
            httpError
          );

          // 分析错误类型
          let errorDetail = '';
          if (httpError instanceof Error) {
            if (httpError.name === 'AbortError') {
              errorDetail = '连接超时 (8秒)';
            } else if (httpError.message.includes('Failed to fetch')) {
              errorDetail = '网络连接失败 - 可能是防火墙、代理或网络问题';
            } else {
              errorDetail = httpError.message;
            }
          }

          console.log(`HTTP测试失败详情: ${errorDetail}`);
          // 不直接返回，继续尝试WebSocket连接
        }
      } else {
        console.log('⏭️ 跳过HTTP测试，直接尝试WebSocket连接');
      }

      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        setConnectionStatus(prev => ({
          ...prev,
          status: 'error',
          error: '连接超时 (10秒) - 可能是网络防火墙或CORS问题',
        }));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;

        setConnectionStatus(prev => ({
          ...prev,
          status: 'connected',
          lastConnected: new Date().toLocaleTimeString(),
          latency,
          error: undefined,
        }));

        // 发送ping测试
        ws.send(JSON.stringify({ type: 'ping' }));

        // 短暂连接后关闭
        setTimeout(() => {
          ws.close();
          setConnectionStatus(prev => ({
            ...prev,
            status: 'disconnected',
          }));
        }, 2000);
      };

      ws.onerror = error => {
        clearTimeout(timeout);
        console.error('WebSocket连接错误:', error);
        setConnectionStatus(prev => ({
          ...prev,
          status: 'error',
          error: 'WebSocket连接失败 - 可能是网络限制或CORS问题',
        }));
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        console.log('WebSocket关闭:', event.code, event.reason);

        if (event.code !== 1000) {
          // 非正常关闭
          let errorMessage = `连接关闭: ${event.code}`;

          // 提供更详细的错误说明
          switch (event.code) {
            case 1006:
              errorMessage += ' (异常关闭 - 可能是网络问题、防火墙或CORS限制)';
              break;
            case 1002:
              errorMessage += ' (协议错误)';
              break;
            case 1003:
              errorMessage += ' (不支持的数据类型)';
              break;
            case 1005:
              errorMessage += ' (无状态码)';
              break;
            case 1011:
              errorMessage += ' (服务器错误)';
              break;
            default:
              if (event.reason) {
                errorMessage += ` (${event.reason})`;
              }
          }

          setConnectionStatus(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
          }));
        }
      };
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
      }));
    }
  };

  // 自动测试连接
  useEffect(() => {
    testWebSocketConnection();

    // 每30秒自动测试一次
    const interval = setInterval(testWebSocketConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return '🔄';
      case 'connected':
        return '✅';
      case 'disconnected':
        return '⚪';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return 'text-blue-600';
      case 'connected':
        return 'text-green-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return '连接中...';
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '连接失败';
      default:
        return '未知状态';
    }
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">WebSocket状态</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => testWebSocketConnection()}
            disabled={connectionStatus.status === 'connecting'}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {connectionStatus.status === 'connecting'
              ? '测试中...'
              : '🔄 完整测试'}
          </button>
          <button
            onClick={() => testWebSocketConnection(true)}
            disabled={connectionStatus.status === 'connecting'}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            🚀 直接测试WS
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* 连接状态 */}
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">状态:</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            {connectionStatus.latency && (
              <div className="text-sm text-gray-600">
                延迟: {connectionStatus.latency}ms
              </div>
            )}
          </div>
        </div>

        {/* 连接信息 */}
        <div className="text-sm text-gray-600">
          <div className="mb-1">
            <span className="font-medium">URL:</span> {connectionStatus.url}
          </div>
          {connectionStatus.lastConnected && (
            <div className="mb-1">
              <span className="font-medium">最后连接:</span>{' '}
              {connectionStatus.lastConnected}
            </div>
          )}
          {connectionStatus.error && (
            <div className="text-red-600">
              <span className="font-medium">错误:</span>{' '}
              {connectionStatus.error}
            </div>
          )}
        </div>

        {/* 开发环境说明 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">🔧 开发环境说明:</div>
              <ul className="text-xs space-y-1">
                <li>• 本地没有运行Workers服务器</li>
                <li>• 直接连接到生产环境Workers</li>
                <li>• WebSocket功能在生产环境中完全可用</li>
                <li>
                  • 如需本地测试，请运行{' '}
                  <code className="bg-yellow-100 px-1 rounded">
                    wrangler dev
                  </code>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 网络连接问题说明 */}
        {connectionStatus.status === 'error' &&
          (connectionStatus.error?.includes('Failed to fetch') ||
            connectionStatus.error?.includes('网络连接失败')) && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
              <div className="text-sm text-orange-800">
                <div className="font-medium mb-1">🌐 网络连接问题:</div>
                <ul className="text-xs space-y-1">
                  <li>
                    • <strong>Failed to fetch</strong>: 无法连接到Workers API
                  </li>
                  <li>
                    • <strong>可能原因</strong>:
                    企业防火墙、网络代理、DNS问题或临时网络故障
                  </li>
                  <li>
                    • <strong>解决方案</strong>:
                  </li>
                  <li className="ml-4">- 点击"直接测试WS"跳过HTTP测试</li>
                  <li className="ml-4">- 检查网络连接和防火墙设置</li>
                  <li className="ml-4">- 尝试使用移动网络或VPN</li>
                  <li className="ml-4">- 联系网络管理员开放外部API访问</li>
                  <li>
                    • <strong>说明</strong>: HTTP测试失败不影响WebSocket功能
                  </li>
                </ul>
              </div>
            </div>
          )}

        {/* WebSocket连接问题说明 */}
        {connectionStatus.status === 'error' &&
          connectionStatus.error?.includes('1006') && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="text-sm text-red-800">
                <div className="font-medium mb-1">🚫 WebSocket连接问题:</div>
                <ul className="text-xs space-y-1">
                  <li>
                    • <strong>错误1006</strong>: 连接异常关闭
                  </li>
                  <li>
                    • <strong>可能原因</strong>:
                    网络防火墙、CORS限制或代理服务器
                  </li>
                  <li>
                    • <strong>解决方案</strong>:
                  </li>
                  <li className="ml-4">- 检查网络连接和防火墙设置</li>
                  <li className="ml-4">- 尝试使用不同的网络环境</li>
                  <li className="ml-4">- 在生产环境中WebSocket通常工作正常</li>
                  <li>
                    • <strong>替代方案</strong>: 应用会自动使用HTTP轮询作为备选
                  </li>
                </ul>
              </div>
            </div>
          )}

        {/* 连接说明 */}
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="text-sm text-gray-700">
            <div className="font-medium mb-1">💡 WebSocket功能:</div>
            <ul className="text-xs space-y-1">
              <li>• 实时转换进度更新</li>
              <li>• 即时状态通知</li>
              <li>• 自动重连机制</li>
              <li>• 低延迟通信</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WebSocketStatus;
