'use client';

import React, { useState, useEffect } from 'react';
import { useConversionWebSocket } from '../hooks/useConversionWebSocket';
import WebSocketDebugger from './WebSocketDebugger';
import { Button } from '@/components/ui/button';

interface ConversionProgressDebugProps {
  url: string;
  format: string;
  quality: string;
}

export default function ConversionProgressDebug({
  url,
  format,
  quality,
}: ConversionProgressDebugProps) {
  const { state, startConversion, disconnect, isConnected, reconnect } =
    useConversionWebSocket();

  const [debugMessages, setDebugMessages] = useState<any[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // 轮询服务器状态作为对比
  const pollServerStatus = async () => {
    if (!state.jobId) return;

    try {
      const response = await fetch(`/api/status/${state.jobId}`);
      const data = await response.json();

      const logEntry = `[${new Date().toLocaleTimeString()}] Server Status: ${data.status}, Progress: ${data.progress}%`;
      setServerLogs(prev => [...prev.slice(-9), logEntry]);

      // 如果服务器显示完成但WebSocket没有更新，这就是问题所在
      if (data.status === 'completed' && state.status !== 'completed') {
        console.warn(
          '🐛 BUG DETECTED: Server shows completed but WebSocket state is not updated!'
        );
        setServerLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🐛 BUG: Server completed but WebSocket not updated!`,
        ]);
      }
    } catch (error) {
      console.error('Failed to poll server status:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && state.jobId) {
      interval = setInterval(pollServerStatus, 2000); // Poll every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, state.jobId]);

  const handleStartConversion = async () => {
    setDebugMessages([]);
    setServerLogs([]);
    setIsPolling(true);

    try {
      await startConversion(url, format, quality);
    } catch (error) {
      console.error('Failed to start conversion:', error);
      setIsPolling(false);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    setDebugMessages(prev => [
      ...prev.slice(-19),
      {
        timestamp: Date.now(),
        message,
      },
    ]);
  };

  useEffect(() => {
    if (state.status === 'completed' || state.status === 'failed') {
      setIsPolling(false);
    }
  }, [state.status]);

  const getProgressColor = () => {
    if (state.status === 'completed') return 'bg-green-500';
    if (state.status === 'failed') return 'bg-red-500';
    if (state.progress >= 80) return 'bg-blue-500';
    if (state.progress >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStepStatus = (stepNumber: number) => {
    const progressThresholds = [0, 20, 40, 80, 100];
    const currentThreshold = progressThresholds.findIndex(
      threshold => state.progress < threshold
    );

    if (currentThreshold === -1)
      return stepNumber <= 5 ? 'completed' : 'pending';
    return stepNumber < currentThreshold
      ? 'completed'
      : stepNumber === currentThreshold
        ? 'active'
        : 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🐛 转换进度调试工具</h2>

        {/* 连接状态 */}
        <div className="mb-4 flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          ></div>
          <span>WebSocket: {isConnected ? '已连接' : '未连接'}</span>

          {!isConnected && (
            <Button onClick={reconnect} size="sm" variant="outline">
              重新连接
            </Button>
          )}
        </div>

        {/* 转换控制 */}
        <div className="mb-6">
          <div className="mb-2">
            <strong>URL:</strong> {url}
          </div>
          <div className="mb-2">
            <strong>格式:</strong> {format} | <strong>质量:</strong> {quality}
          </div>

          <Button
            onClick={handleStartConversion}
            disabled={state.isConverting}
            className="mr-2"
          >
            {state.isConverting ? '转换中...' : '开始转换'}
          </Button>

          {state.isConverting && (
            <Button onClick={disconnect} variant="outline">
              停止转换
            </Button>
          )}
        </div>

        {/* 进度显示 */}
        {state.jobId && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">转换进度</span>
              <span className="text-2xl font-bold">{state.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${state.progress}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { step: 1, label: '队列中', threshold: 0 },
                { step: 2, label: '元数据', threshold: 20 },
                { step: 3, label: '转换中', threshold: 40 },
                { step: 4, label: '上传中', threshold: 80 },
                { step: 5, label: '完成', threshold: 100 },
              ].map(({ step, label, threshold }) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="text-center">
                    <div
                      className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-sm ${
                        status === 'completed'
                          ? 'bg-green-500'
                          : status === 'active'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                      }`}
                    >
                      {status === 'completed' ? '✓' : step}
                    </div>
                    <div className="text-xs">{label}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-sm text-gray-600">
              <div>
                <strong>状态:</strong> {state.status}
              </div>
              <div>
                <strong>当前步骤:</strong> {state.currentStep || '等待中'}
              </div>
              <div>
                <strong>Job ID:</strong> {state.jobId}
              </div>
            </div>
          </div>
        )}

        {/* 错误显示 */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800">错误信息</h3>
            <p className="text-red-700">{state.error}</p>
          </div>
        )}

        {/* 结果显示 */}
        {state.result && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-green-800">转换完成</h3>
            <p className="text-green-700">文件: {state.result.filename}</p>
            <Button
              onClick={() => window.open(state.result!.downloadUrl, '_blank')}
              className="mt-2"
            >
              下载文件
            </Button>
          </div>
        )}
      </div>

      {/* 服务器状态对比 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 服务器状态对比</h3>
        <div className="bg-gray-100 p-3 rounded font-mono text-sm h-32 overflow-y-auto">
          {serverLogs.length === 0 ? (
            <div className="text-gray-500">等待服务器状态...</div>
          ) : (
            serverLogs.map((log, index) => (
              <div
                key={index}
                className={log.includes('🐛') ? 'text-red-600 font-bold' : ''}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* WebSocket调试器 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <WebSocketDebugger
          jobId={state.jobId}
          onMessageReceived={handleWebSocketMessage}
        />
      </div>

      {/* 最近的WebSocket消息 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📨 最近的WebSocket消息</h3>
        <div className="bg-gray-100 p-3 rounded font-mono text-sm h-40 overflow-y-auto">
          {debugMessages.length === 0 ? (
            <div className="text-gray-500">等待WebSocket消息...</div>
          ) : (
            debugMessages.map((item, index) => (
              <div key={index} className="mb-2">
                <div className="text-gray-600 text-xs">
                  [{new Date(item.timestamp).toLocaleTimeString()}]
                </div>
                <div className="text-xs">
                  {JSON.stringify(item.message, null, 2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 调试建议 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🔍 调试建议
        </h3>
        <ul className="text-yellow-700 space-y-1 text-sm">
          <li>• 如果进度卡在40%，检查服务器状态对比是否显示"BUG"警告</li>
          <li>
            • 观察WebSocket消息是否包含progress_update和conversion_completed
          </li>
          <li>• 如果WebSocket断开，会自动重连，观察连接状态指示器</li>
          <li>• 服务器状态对比可以帮助确认是WebSocket问题还是服务器问题</li>
          <li>• 如果服务器完成但WebSocket没更新，说明是WebSocket通信问题</li>
        </ul>
      </div>
    </div>
  );
}
