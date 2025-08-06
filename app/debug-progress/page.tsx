'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ConversionProgressDebug from '../../components/ConversionProgressDebug';
import { Button } from '@/components/ui/button';

export default function DebugProgressPage() {
  const [testUrl, setTestUrl] = useState(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('192');
  const [isCustomUrl, setIsCustomUrl] = useState(false);

  const testUrls = [
    {
      name: 'YouTube测试视频',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: '经典测试视频，约3分钟',
    },
    {
      name: 'YouTube短视频',
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      description: '短视频，约1分钟',
    },
    {
      name: '自定义URL',
      url: '',
      description: '输入你自己的视频URL',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      <main className="flex-1">
        <section className="py-12 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                🐛 进度卡在40%问题调试
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                这个工具帮助诊断和修复前端进度显示问题。它会同时监控WebSocket消息和服务器状态，帮你找出问题所在。
              </p>
            </div>

            {/* 测试URL选择 */}
            <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">选择测试视频</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {testUrls.map((test, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      (index === 2 && isCustomUrl) ||
                      (index !== 2 && testUrl === test.url)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (index === 2) {
                        setIsCustomUrl(true);
                        setTestUrl('');
                      } else {
                        setIsCustomUrl(false);
                        setTestUrl(test.url);
                      }
                    }}
                  >
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {test.description}
                    </p>
                    {test.url && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        {test.url}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {isCustomUrl && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    自定义视频URL
                  </label>
                  <input
                    type="url"
                    value={testUrl}
                    onChange={e => setTestUrl(e.target.value)}
                    placeholder="输入YouTube、Twitter或其他支持的视频URL"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* 格式和质量选择 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    输出格式
                  </label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mp3">MP3 (音频)</option>
                    <option value="mp4">MP4 (视频)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">质量</label>
                  <select
                    value={quality}
                    onChange={e => setQuality(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {format === 'mp3' ? (
                      <>
                        <option value="128">128 kbps</option>
                        <option value="192">192 kbps</option>
                        <option value="320">320 kbps</option>
                      </>
                    ) : (
                      <>
                        <option value="720">720p</option>
                        <option value="1080">1080p</option>
                        <option value="480">480p</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* 问题说明 */}
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4">
                🐛 已知问题
              </h2>
              <div className="text-red-700 space-y-2">
                <p>
                  <strong>症状:</strong>{' '}
                  前端进度条卡在40%不动，但服务器端转换实际已完成
                </p>
                <p>
                  <strong>影响:</strong> 用户看不到转换完成，无法下载文件
                </p>
                <p>
                  <strong>可能原因:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>WebSocket连接在转换过程中断开</li>
                  <li>服务器端没有发送正确的进度更新消息</li>
                  <li>前端WebSocket消息处理有bug</li>
                  <li>API层级简化后的通信问题</li>
                </ul>
              </div>
            </div>

            {/* 调试工具 */}
            {testUrl && (
              <ConversionProgressDebug
                url={testUrl}
                format={format}
                quality={quality}
              />
            )}

            {/* 修复状态 */}
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                🔧 已应用的修复
              </h2>
              <div className="text-green-700 space-y-2">
                <p>
                  ✅ <strong>ConversionService进度更新增强:</strong>{' '}
                  在实际转换过程中添加了60%和80%的进度更新
                </p>
                <p>
                  ✅ <strong>WebSocket调试工具:</strong>{' '}
                  实时监控WebSocket消息和连接状态
                </p>
                <p>
                  ✅ <strong>服务器状态对比:</strong>{' '}
                  轮询服务器状态，对比WebSocket状态，检测不一致
                </p>
                <p>
                  ✅ <strong>增强错误处理:</strong>{' '}
                  更好的WebSocket重连和错误恢复机制
                </p>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">
                📖 使用说明
              </h2>
              <div className="text-blue-700 space-y-2">
                <p>
                  <strong>1. 选择测试视频:</strong>{' '}
                  选择一个测试URL或输入自定义URL
                </p>
                <p>
                  <strong>2. 开始转换:</strong> 点击"开始转换"按钮
                </p>
                <p>
                  <strong>3. 观察调试信息:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>WebSocket连接状态（绿色=已连接，红色=断开）</li>
                  <li>进度条和步骤指示器</li>
                  <li>服务器状态对比（会显示🐛如果检测到bug）</li>
                  <li>WebSocket消息日志</li>
                </ul>
                <p>
                  <strong>4. 分析问题:</strong>{' '}
                  如果进度卡住，检查是否有"BUG"警告或WebSocket断开
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
