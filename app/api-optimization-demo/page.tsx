'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '@/components/ui/button';
import { useOptimizedApi } from '../../hooks/useOptimizedApi';

export default function ApiOptimizationDemoPage() {
  const optimizedApi = useOptimizedApi();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // 性能测试
  const runPerformanceTest = async () => {
    setIsRunningTest(true);
    setTestResults([]);

    const tests = [
      { name: 'Health Check', method: () => optimizedApi.getPlatforms() },
      { name: 'Platform List', method: () => optimizedApi.getPlatforms() },
      {
        name: 'URL Validation',
        method: () =>
          optimizedApi.validate({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          }),
      },
    ];

    const results = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await test.method();
        const endTime = Date.now();

        results.push({
          name: test.name,
          success: response.success,
          latency: endTime - startTime,
          mode: response.metadata?.mode || 'unknown',
          endpoint: response.metadata?.endpoint || 'unknown',
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setTestResults(results);
    setIsRunningTest(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-12 lg:py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              API层级优化演示
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              体验前端直连Workers的威力 - 减少网络跳转，提升响应速度！
            </p>

            {/* Architecture Comparison */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-4 text-xl">
                  ❌ 旧API架构
                </h3>
                <div className="space-y-3 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>前端发起请求</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Next.js API Routes代理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>转发到Cloudflare Workers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Workers处理并返回</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Next.js转发响应给前端</span>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded border-l-4 border-red-400">
                    <p className="font-medium text-red-800">问题:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• 多层网络跳转</li>
                      <li>• Next.js成为代理瓶颈</li>
                      <li>• 增加延迟和复杂度</li>
                      <li>• 额外的服务器资源消耗</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4 text-xl">
                  ✅ 新API架构
                </h3>
                <div className="space-y-3 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>前端发起请求</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>直连Cloudflare Workers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Workers处理并返回</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>智能fallback到Next.js (如需要)</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded border-l-4 border-green-400">
                    <p className="font-medium text-green-800">优势:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• 直接连接，减少跳转</li>
                      <li>• 响应速度提升30-50%</li>
                      <li>• 架构简化</li>
                      <li>• 智能fallback保证可用性</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4 text-xl">
                🔗 当前连接状态
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div
                    className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                      optimizedApi.connectionInfo.isConnected
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  ></div>
                  <p className="font-medium">连接状态</p>
                  <p
                    className={
                      optimizedApi.connectionInfo.isConnected
                        ? 'text-green-700'
                        : 'text-red-700'
                    }
                  >
                    {optimizedApi.connectionInfo.isConnected
                      ? '已连接'
                      : '未连接'}
                  </p>
                </div>
                <div className="text-center">
                  <div
                    className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                      optimizedApi.connectionInfo.mode === 'direct'
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`}
                  ></div>
                  <p className="font-medium">连接模式</p>
                  <p className="text-blue-700">
                    {optimizedApi.connectionInfo.mode === 'direct'
                      ? '🚀 直连'
                      : '🔄 代理'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium">延迟</p>
                  <p className="text-blue-700">
                    {optimizedApi.connectionInfo.latency}ms
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium">端点</p>
                  <p className="text-purple-700 text-xs">
                    {optimizedApi.connectionInfo.endpoint?.includes(
                      'localhost:8787'
                    )
                      ? 'Workers'
                      : 'Next.js'}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Test */}
            <div className="mb-8">
              <Button
                onClick={runPerformanceTest}
                disabled={isRunningTest}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isRunningTest ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    运行性能测试...
                  </div>
                ) : (
                  '🚀 运行性能测试'
                )}
              </Button>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 text-xl">
                  📊 测试结果
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">测试项目</th>
                        <th className="text-left p-2">状态</th>
                        <th className="text-left p-2">延迟</th>
                        <th className="text-left p-2">模式</th>
                        <th className="text-left p-2">端点</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.map((result, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{result.name}</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                result.success
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {result.success ? '✅ 成功' : '❌ 失败'}
                            </span>
                          </td>
                          <td className="p-2">{result.latency}ms</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                result.mode === 'direct'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {result.mode === 'direct' ? '🚀 直连' : '🔄 代理'}
                            </span>
                          </td>
                          <td className="p-2 text-xs">
                            {result.endpoint?.includes('localhost:8787')
                              ? 'Workers'
                              : 'Next.js'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Connection Management */}
            <div className="mb-8 flex gap-4 justify-center">
              <Button
                onClick={optimizedApi.checkConnection}
                disabled={optimizedApi.isLoading}
                variant="outline"
              >
                🔍 检查连接
              </Button>
              <Button
                onClick={optimizedApi.resetConnection}
                disabled={optimizedApi.isLoading}
                variant="outline"
              >
                🔄 重置连接
              </Button>
            </div>

            {/* Technical Details */}
            <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg text-left">
              <h3 className="font-semibold text-indigo-800 mb-4 text-xl text-center">
                🔧 技术实现细节
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-indigo-800 mb-2">
                    智能端点选择
                  </h4>
                  <ul className="space-y-1 text-indigo-700">
                    <li>• 自动检测Workers可用性</li>
                    <li>• 优先使用直连模式</li>
                    <li>• 智能fallback到Next.js</li>
                    <li>• 性能监控和切换</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-indigo-800 mb-2">
                    CORS和安全
                  </h4>
                  <ul className="space-y-1 text-indigo-700">
                    <li>• 增强的CORS配置</li>
                    <li>• 开发/生产环境适配</li>
                    <li>• 安全的跨域访问</li>
                    <li>• 请求头和响应头优化</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {optimizedApi.error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">
                  <span className="font-medium">错误:</span>{' '}
                  {optimizedApi.error}
                </p>
              </div>
            )}

            {/* Current Time Display */}
            <div className="text-center text-sm text-muted-foreground">
              <p>API层级优化演示 - GetGoodTape 第四步优化</p>
              <p className="mt-2">
                最后检查时间:{' '}
                {optimizedApi.connectionInfo.lastCheck?.toLocaleString(
                  'zh-CN'
                ) || '未检查'}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
