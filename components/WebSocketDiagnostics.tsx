'use client';

import { useState, memo } from 'react';

interface DiagnosticTest {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message: string;
  details?: string;
}

const WebSocketDiagnostics = memo(function WebSocketDiagnostics() {
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (
    name: string,
    status: DiagnosticTest['status'],
    message: string,
    details?: string
  ) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t =>
          t.name === name ? { ...t, status, message, details } : t
        );
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTests([]);

    // 1. 测试基本网络连接
    updateTest('网络连接', 'running', '检查基本网络连接...');
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      updateTest('网络连接', 'pass', '网络连接正常');
    } catch (error) {
      updateTest(
        '网络连接',
        'fail',
        '网络连接失败',
        error instanceof Error ? error.message : '未知错误'
      );
    }

    // 2. 测试Workers API连接
    updateTest('Workers API', 'running', '测试Workers API连接...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch('/api/health-check', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        updateTest(
          'Workers API',
          'pass',
          `Workers API正常 (${response.status})`,
          JSON.stringify(data, null, 2)
        );
      } else {
        updateTest(
          'Workers API',
          'fail',
          `Workers API错误 (${response.status})`,
          `状态码: ${response.status}, 状态文本: ${response.statusText}`
        );
      }
    } catch (error) {
      let errorMessage = 'Workers API连接失败';
      let errorDetails = '';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Workers API连接超时';
          errorDetails = '连接超时 (10秒) - 可能是网络问题或服务器响应慢';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Workers API网络错误';
          errorDetails =
            '网络连接失败 - 可能是CORS问题、防火墙限制或服务器不可达';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Workers API网络错误';
          errorDetails = '网络错误 - 检查网络连接和防火墙设置';
        } else {
          errorDetails = error.message;
        }
      } else {
        errorDetails = '未知错误';
      }

      updateTest('Workers API', 'fail', errorMessage, errorDetails);
    }

    // 3. 测试WebSocket支持
    updateTest('WebSocket支持', 'running', '检查浏览器WebSocket支持...');
    if (typeof WebSocket !== 'undefined') {
      updateTest('WebSocket支持', 'pass', '浏览器支持WebSocket');
    } else {
      updateTest('WebSocket支持', 'fail', '浏览器不支持WebSocket');
      setIsRunning(false);
      return;
    }

    // 4. 测试WebSocket连接
    updateTest('WebSocket连接', 'running', '尝试WebSocket连接...');
    try {
      const wsUrl =
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        updateTest(
          'WebSocket连接',
          'fail',
          '连接超时 (15秒)',
          '可能是防火墙或网络限制'
        );
      }, 15000);

      ws.onopen = () => {
        clearTimeout(timeout);
        updateTest('WebSocket连接', 'pass', 'WebSocket连接成功');

        // 测试消息发送
        updateTest('消息测试', 'running', '测试消息发送...');
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          updateTest(
            '消息测试',
            'pass',
            '消息收发正常',
            JSON.stringify(data, null, 2)
          );
        } catch (error) {
          updateTest('消息测试', 'pass', '收到消息', event.data);
        }

        // 关闭连接
        setTimeout(() => ws.close(), 1000);
      };

      ws.onerror = error => {
        clearTimeout(timeout);
        console.error('WebSocket错误:', error);

        // 提供更详细的错误信息
        let errorDetails = '可能原因:\n';
        errorDetails += '• 网络连接问题\n';
        errorDetails += '• 防火墙阻止WebSocket连接\n';
        errorDetails += '• CORS策略限制\n';
        errorDetails += '• 代理服务器不支持WebSocket\n';
        errorDetails += '• 服务器暂时不可用';

        updateTest('WebSocket连接', 'fail', 'WebSocket连接错误', errorDetails);
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        if (event.code === 1000) {
          // 正常关闭，不更新状态
        } else {
          const message = `连接关闭: ${event.code}`;
          let details = '';

          switch (event.code) {
            case 1006:
              details = '异常关闭 - 通常是网络问题、防火墙或CORS限制';
              break;
            case 1002:
              details = '协议错误';
              break;
            case 1003:
              details = '不支持的数据类型';
              break;
            case 1011:
              details = '服务器内部错误';
              break;
            default:
              details = event.reason || '未知原因';
          }

          updateTest('WebSocket连接', 'fail', message, details);
        }
      };
    } catch (error) {
      updateTest(
        'WebSocket连接',
        'fail',
        'WebSocket创建失败',
        error instanceof Error ? error.message : '未知错误'
      );
    }

    // 5. 环境信息检查
    updateTest('环境信息', 'running', '收集环境信息...');
    const envInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      protocol: window.location.protocol,
      host: window.location.host,
    };
    updateTest(
      '环境信息',
      'pass',
      '环境信息收集完成',
      JSON.stringify(envInfo, null, 2)
    );

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600';
      case 'running':
        return 'text-blue-600';
      case 'pass':
        return 'text-green-600';
      case 'fail':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          WebSocket连接诊断
        </h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? '🔄 诊断中...' : '🔍 开始诊断'}
        </button>
      </div>

      {tests.length > 0 && (
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="border border-gray-200 rounded p-3">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xl">{getStatusIcon(test.status)}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{test.name}</div>
                  <div className={`text-sm ${getStatusColor(test.status)}`}>
                    {test.message}
                  </div>
                </div>
              </div>

              {test.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    查看详细信息
                  </summary>
                  <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded overflow-x-auto whitespace-pre-wrap">
                    {test.details}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {tests.length === 0 && !isRunning && (
        <div className="text-center text-gray-500 py-8">
          <p>点击"开始诊断"来检查WebSocket连接问题</p>
          <p className="text-xs mt-1">
            诊断将测试网络连接、API可用性和WebSocket支持
          </p>
        </div>
      )}

      {/* 诊断说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">🔍 诊断项目:</div>
          <ul className="text-xs space-y-1">
            <li>
              • <strong>网络连接</strong>: 基本网络连通性
            </li>
            <li>
              • <strong>Workers API</strong>: Cloudflare Workers API可用性
            </li>
            <li>
              • <strong>WebSocket支持</strong>: 浏览器WebSocket功能
            </li>
            <li>
              • <strong>WebSocket连接</strong>: 实际WebSocket连接测试
            </li>
            <li>
              • <strong>环境信息</strong>: 浏览器和网络环境信息
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export default WebSocketDiagnostics;
