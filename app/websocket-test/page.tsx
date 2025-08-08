'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import WebSocketDiagnostics from '../../components/WebSocketDiagnostics';

interface ConnectionTest {
  id: string;
  url: string;
  status: 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';
  error?: string;
  latency?: number;
  messages: Array<{
    type: 'sent' | 'received' | 'error';
    content: string;
    timestamp: Date;
  }>;
}

export default function WebSocketTestPage() {
  const [tests, setTests] = useState<ConnectionTest[]>([]);
  const [customUrl, setCustomUrl] = useState('');

  const defaultUrls = [
    'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws',
    'wss://echo.websocket.org',
  ];

  const addMessage = (
    testId: string,
    type: 'sent' | 'received' | 'error',
    content: string
  ) => {
    setTests(prev =>
      prev.map(test =>
        test.id === testId
          ? {
              ...test,
              messages: [
                ...test.messages,
                {
                  type,
                  content,
                  timestamp: new Date(),
                },
              ],
            }
          : test
      )
    );
  };

  const updateTestStatus = (
    testId: string,
    status: ConnectionTest['status'],
    error?: string,
    latency?: number
  ) => {
    setTests(prev =>
      prev.map(test =>
        test.id === testId ? { ...test, status, error, latency } : test
      )
    );
  };

  const testConnection = async (url: string) => {
    const testId = Date.now().toString();
    const newTest: ConnectionTest = {
      id: testId,
      url,
      status: 'connecting',
      messages: [],
    };

    setTests(prev => [...prev, newTest]);
    addMessage(testId, 'sent', `尝试连接到: ${url}`);

    try {
      const ws = new WebSocket(url);
      const startTime = Date.now();

      const timeout = setTimeout(() => {
        ws.close();
        updateTestStatus(testId, 'failed', '连接超时 (10秒)');
        addMessage(testId, 'error', '连接超时');
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        updateTestStatus(testId, 'connected', undefined, latency);
        addMessage(testId, 'received', `连接成功 (延迟: ${latency}ms)`);

        // 发送测试消息
        const testMessage = JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
          test: true,
        });
        ws.send(testMessage);
        addMessage(testId, 'sent', `发送: ${testMessage}`);

        // 5秒后关闭连接
        setTimeout(() => {
          ws.close(1000, 'Test completed');
        }, 5000);
      };

      ws.onmessage = event => {
        addMessage(testId, 'received', `收到: ${event.data}`);
      };

      ws.onerror = error => {
        clearTimeout(timeout);
        updateTestStatus(testId, 'failed', 'WebSocket错误');
        addMessage(testId, 'error', 'WebSocket连接错误');
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        if (event.code === 1000) {
          updateTestStatus(testId, 'closed');
          addMessage(testId, 'received', '连接正常关闭');
        } else {
          updateTestStatus(testId, 'failed', `连接关闭: ${event.code}`);
          addMessage(
            testId,
            'error',
            `连接异常关闭: ${event.code} - ${getCloseCodeDescription(event.code)}`
          );
        }
      };
    } catch (error) {
      updateTestStatus(
        testId,
        'failed',
        error instanceof Error ? error.message : '未知错误'
      );
      addMessage(testId, 'error', `连接失败: ${error}`);
    }
  };

  const getCloseCodeDescription = (code: number): string => {
    switch (code) {
      case 1006:
        return '异常关闭 - 网络问题或CORS限制';
      case 1002:
        return '协议错误';
      case 1003:
        return '不支持的数据类型';
      case 1011:
        return '服务器错误';
      default:
        return '未知原因';
    }
  };

  const getStatusColor = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'connecting':
        return 'text-blue-600';
      case 'connected':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'closed':
        return 'text-gray-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'connecting':
        return '🔄';
      case 'connected':
        return '✅';
      case 'failed':
        return '❌';
      case 'closed':
        return '⏹️';
      default:
        return '⚪';
    }
  };

  const clearTests = () => {
    setTests([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      <main className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">WebSocket 连接测试工具</h1>
            <p className="text-muted-foreground">
              测试WebSocket连接状态，诊断连接问题
            </p>
          </div>

          {/* 快速测试 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">快速连接测试</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {defaultUrls.map((url, index) => (
                  <Button
                    key={index}
                    onClick={() => testConnection(url)}
                    variant="outline"
                    className="text-left justify-start"
                  >
                    测试: {url.replace('wss://', '').substring(0, 40)}...
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="输入自定义WebSocket URL (wss://...)"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (customUrl.trim()) {
                      testConnection(customUrl.trim());
                      setCustomUrl('');
                    }
                  }}
                  disabled={!customUrl.trim()}
                >
                  测试
                </Button>
              </div>

              {tests.length > 0 && (
                <Button onClick={clearTests} variant="outline" size="sm">
                  清除测试结果
                </Button>
              )}
            </div>
          </div>

          {/* 测试结果 */}
          {tests.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">测试结果</h2>
              <div className="space-y-4">
                {tests.map(test => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {getStatusIcon(test.status)}
                        </span>
                        <div>
                          <p className="font-medium">{test.url}</p>
                          <p
                            className={`text-sm ${getStatusColor(test.status)}`}
                          >
                            {test.status.toUpperCase()}
                            {test.latency && ` (${test.latency}ms)`}
                          </p>
                        </div>
                      </div>
                      {test.error && (
                        <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                          {test.error}
                        </span>
                      )}
                    </div>

                    {test.messages.length > 0 && (
                      <div className="mt-3">
                        <details>
                          <summary className="text-sm cursor-pointer text-blue-600 mb-2">
                            查看消息日志 ({test.messages.length})
                          </summary>
                          <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                            {test.messages.map((message, index) => (
                              <div key={index} className="text-xs mb-1">
                                <span className="text-gray-500">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                                <span
                                  className={`ml-2 ${
                                    message.type === 'sent'
                                      ? 'text-blue-600'
                                      : message.type === 'received'
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                  }`}
                                >
                                  [{message.type.toUpperCase()}]
                                </span>
                                <span className="ml-2">{message.content}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 诊断工具 */}
          <WebSocketDiagnostics />
        </div>
      </main>

      <Footer />
    </div>
  );
}
