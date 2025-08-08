'use client';

import React, { useState } from 'react';

export default function SimpleTestPage() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testHealthCheck = async () => {
    setIsLoading(true);
    setResult('测试中...');

    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();

      if (data.success) {
        setResult('✅ 健康检查API正常工作！\n' + JSON.stringify(data, null, 2));
      } else {
        setResult('❌ API错误: ' + data.error);
      }
    } catch (error) {
      setResult('❌ 请求失败: ' + String(error));
    }

    setIsLoading(false);
  };

  const testWebSocket = async () => {
    setIsLoading(true);
    setResult('测试WebSocket连接...');

    try {
      const ws = new WebSocket(
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws'
      );

      const timeout = setTimeout(() => {
        ws.close();
        setResult('❌ WebSocket连接超时');
        setIsLoading(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setResult('✅ WebSocket连接成功！');
        setIsLoading(false);
        ws.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setResult('❌ WebSocket连接失败');
        setIsLoading(false);
      };

      ws.onclose = event => {
        clearTimeout(timeout);
        if (event.code !== 1000 && event.code !== 1005) {
          setResult(`❌ WebSocket连接关闭: ${event.code}`);
          setIsLoading(false);
        }
      };
    } catch (error) {
      setResult('❌ WebSocket创建失败: ' + String(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🔧 简单修复测试</h1>

        <div className="space-y-4 mb-6">
          <button
            onClick={testHealthCheck}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '测试健康检查API'}
          </button>

          <button
            onClick={testWebSocket}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '测试WebSocket连接'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-semibold mb-2">测试结果:</h2>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">修复内容:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 创建了CORS代理API (/api/health-check)</li>
            <li>• 改进了WebSocket错误处理</li>
            <li>• 增加了超时和重连机制</li>
            <li>• 支持更多域名的CORS配置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
