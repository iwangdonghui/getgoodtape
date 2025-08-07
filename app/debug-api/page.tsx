'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '@/components/ui/button';

export default function DebugApiPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoints = [
    {
      name: 'Convert API',
      url: '/api/convert',
      method: 'POST',
      body: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        format: 'mp3',
        quality: '128',
      },
    },
    {
      name: 'Validate API',
      url: '/api/validate',
      method: 'POST',
      body: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    },
    {
      name: 'WebSocket Connection',
      url: '/api/ws',
      method: 'GET',
      body: null,
    },
  ];

  const testEndpoint = async (endpoint: any) => {
    try {
      const startTime = Date.now();

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        success: response.ok,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        statusText: 'Network Error',
        responseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    const results = [];
    for (const endpoint of testEndpoints) {
      const result = await testEndpoint(endpoint);
      results.push(result);
      setTestResults([...results]);
    }

    setIsLoading(false);
  };

  const testWebSocket = () => {
    const wsUrl =
      'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';
    console.log('🔌 Testing WebSocket connection to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setTestResults(prev => [
          ...prev,
          {
            name: 'Direct WebSocket Test',
            url: wsUrl,
            status: 200,
            statusText: 'Connected',
            success: true,
            data: 'WebSocket connection successful',
            timestamp: new Date().toISOString(),
          },
        ]);
        ws.close();
      };

      ws.onerror = error => {
        console.error('❌ WebSocket connection failed:', error);
        setTestResults(prev => [
          ...prev,
          {
            name: 'Direct WebSocket Test',
            url: wsUrl,
            status: 0,
            statusText: 'Connection Failed',
            success: false,
            error: 'WebSocket connection failed',
            timestamp: new Date().toISOString(),
          },
        ]);
      };

      ws.onclose = event => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
      };
    } catch (error) {
      console.error('❌ WebSocket test error:', error);
      setTestResults(prev => [
        ...prev,
        {
          name: 'Direct WebSocket Test',
          url: wsUrl,
          status: 0,
          statusText: 'Test Failed',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      <main className="flex-1">
        <section className="py-12 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                🔧 API连接调试工具
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                测试前端API路由是否正确连接到Workers后端
              </p>
            </div>

            <div className="mb-8 flex gap-4 justify-center">
              <Button
                onClick={runAllTests}
                disabled={isLoading}
                className="px-6 py-3"
              >
                {isLoading ? '测试中...' : '测试所有API'}
              </Button>

              <Button
                onClick={testWebSocket}
                variant="outline"
                className="px-6 py-3"
              >
                测试WebSocket连接
              </Button>
            </div>

            {/* 测试结果 */}
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {result.success ? '✅' : '❌'} {result.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {result.timestamp}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>URL:</strong> {result.url}
                    </div>
                    <div>
                      <strong>状态:</strong> {result.status} {result.statusText}
                    </div>
                    {result.responseTime && (
                      <div>
                        <strong>响应时间:</strong> {result.responseTime}ms
                      </div>
                    )}
                  </div>

                  {result.error && (
                    <div className="mt-4 p-3 bg-red-100 rounded text-red-700">
                      <strong>错误:</strong> {result.error}
                    </div>
                  )}

                  {result.data && (
                    <div className="mt-4">
                      <strong>响应数据:</strong>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {typeof result.data === 'string'
                          ? result.data
                          : JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {testResults.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                点击上方按钮开始测试API连接
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
