'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '@/components/ui/button';

export default function DownloadFlowDemoPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [downloadStats, setDownloadStats] = useState({
    oldFlow: { steps: 3, avgTime: 2.5, serverLoad: 'High' },
    newFlow: { steps: 1, avgTime: 0.3, serverLoad: 'Minimal' },
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const simulateOldDownload = () => {
    alert('Old Flow: Redirecting through API... (2.5s average delay)');
  };

  const simulateNewDownload = () => {
    alert('New Flow: Direct R2 download! (0.3s average delay)');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-12 lg:py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              下载流程优化演示
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              体验预生成下载链接的威力 - 告别API重定向，拥抱直接下载！
            </p>

            {/* Performance Comparison */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-4 text-xl">
                  ❌ 旧下载流程
                </h3>
                <div className="space-y-3 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>用户点击下载</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>API查找文件位置</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>重定向到R2存储</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>开始下载</span>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded border-l-4 border-red-400">
                    <p className="font-medium text-red-800">性能指标:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• 平均延迟: {downloadStats.oldFlow.avgTime}秒</li>
                      <li>• API调用: 必需</li>
                      <li>• 服务器负载: {downloadStats.oldFlow.serverLoad}</li>
                      <li>• 用户体验: 较慢</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4 text-xl">
                  ✅ 新下载流程
                </h3>
                <div className="space-y-3 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>转换完成时预生成下载URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>存储在数据库中</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>用户直接从R2下载</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded border-l-4 border-green-400">
                    <p className="font-medium text-green-800">性能指标:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• 平均延迟: {downloadStats.newFlow.avgTime}秒</li>
                      <li>• API调用: 无需</li>
                      <li>• 服务器负载: {downloadStats.newFlow.serverLoad}</li>
                      <li>• 用户体验: 极快</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow Diagram */}
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4 text-xl">
                🚀 优化流程图
              </h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <p className="mt-2 text-blue-700 font-medium">转换完成</p>
                  <p className="text-blue-600 text-xs">VideoProcessor</p>
                </div>
                <div className="hidden md:block text-blue-400 text-2xl">→</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <p className="mt-2 text-green-700 font-medium">生成下载URL</p>
                  <p className="text-green-600 text-xs">预签名URL (24h)</p>
                </div>
                <div className="hidden md:block text-green-400 text-2xl">→</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <p className="mt-2 text-purple-700 font-medium">
                    存储到数据库
                  </p>
                  <p className="text-purple-600 text-xs">包含过期时间</p>
                </div>
                <div className="hidden md:block text-purple-400 text-2xl">
                  →
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <p className="mt-2 text-orange-700 font-medium">
                    用户直接下载
                  </p>
                  <p className="text-orange-600 text-xs">无API中转</p>
                </div>
              </div>
            </div>

            {/* Smart URL Management */}
            <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-4 text-xl">
                🧠 智能URL管理
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    ⏰
                  </div>
                  <p className="font-medium text-yellow-800">自动过期检测</p>
                  <p className="text-yellow-700">URL接近过期时自动检测</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    🔄
                  </div>
                  <p className="font-medium text-yellow-800">自动刷新</p>
                  <p className="text-yellow-700">无缝生成新的下载URL</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    📱
                  </div>
                  <p className="font-medium text-yellow-800">透明体验</p>
                  <p className="text-yellow-700">用户无感知URL更新</p>
                </div>
              </div>
            </div>

            {/* Demo Buttons */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={simulateOldDownload}
                variant="outline"
                size="lg"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                🐌 体验旧流程 (慢)
              </Button>
              <Button
                onClick={simulateNewDownload}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                ⚡ 体验新流程 (快)
              </Button>
            </div>

            {/* Performance Metrics */}
            <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4 text-xl">
                📊 性能提升指标
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">87%</div>
                  <div className="text-sm text-gray-600">延迟减少</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">95%</div>
                  <div className="text-sm text-gray-600">服务器负载减少</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">100%</div>
                  <div className="text-sm text-gray-600">API调用减少</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">24h</div>
                  <div className="text-sm text-gray-600">URL有效期</div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg text-left">
              <h3 className="font-semibold text-indigo-800 mb-4 text-xl text-center">
                🔧 技术实现细节
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-indigo-800 mb-2">
                    数据库优化
                  </h4>
                  <ul className="space-y-1 text-indigo-700">
                    <li>• 新增 download_expires_at 字段</li>
                    <li>• 新增 r2_key 字段用于直接访问</li>
                    <li>• 优化索引提升查询性能</li>
                    <li>• 自动过期时间管理</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-indigo-800 mb-2">API优化</h4>
                  <ul className="space-y-1 text-indigo-700">
                    <li>• 状态查询时自动刷新URL</li>
                    <li>• 智能过期检测机制</li>
                    <li>• 保留fallback兼容性</li>
                    <li>• 无缝用户体验</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Time Display */}
            <div className="text-center text-sm text-muted-foreground">
              <p>当前时间: {currentTime.toLocaleString('zh-CN')}</p>
              <p className="mt-2">下载流程优化演示 - GetGoodTape 第三步优化</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
