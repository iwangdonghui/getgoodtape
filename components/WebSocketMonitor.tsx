'use client';

import React, { useState, useEffect } from 'react';
import { useConversionWebSocket } from '../hooks/useConversionWebSocket';

interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averageLatency: number;
  lastConnectionTime?: Date;
  lastError?: string;
}

export default function WebSocketMonitor() {
  const conversion = useConversionWebSocket();
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageLatency: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 监听连接状态变化
    if (conversion.connectionState.status === 'connected') {
      setMetrics(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        successfulConnections: prev.successfulConnections + 1,
        lastConnectionTime: new Date(),
        averageLatency:
          conversion.connectionState.latency || prev.averageLatency,
      }));
    } else if (conversion.connectionState.status === 'failed') {
      setMetrics(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        failedConnections: prev.failedConnections + 1,
        lastError: conversion.connectionState.lastError,
      }));
    }
  }, [conversion.connectionState]);

  const getConnectionQuality = () => {
    if (metrics.totalConnections === 0) return 'unknown';
    const successRate =
      metrics.successfulConnections / metrics.totalConnections;
    if (successRate >= 0.9) return 'excellent';
    if (successRate >= 0.7) return 'good';
    if (successRate >= 0.5) return 'fair';
    return 'poor';
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '🟢';
      case 'good':
        return '🔵';
      case 'fair':
        return '🟡';
      case 'poor':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const resetMetrics = () => {
    setMetrics({
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
    });
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="显示WebSocket监控"
        >
          📊
        </button>
      </div>
    );
  }

  const quality = getConnectionQuality();

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl border z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">WebSocket 监控</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 当前连接状态 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">当前状态</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  conversion.isConnected
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-sm">
                {conversion.isConnected ? '已连接' : '已断开'}
              </span>
            </div>
          </div>

          {conversion.connectionState.latency && (
            <div className="text-xs text-gray-600">
              延迟: {conversion.connectionState.latency}ms
            </div>
          )}

          {conversion.connectionState.lastError && (
            <div className="text-xs text-red-600 mt-1">
              错误: {conversion.connectionState.lastError}
            </div>
          )}
        </div>

        {/* 连接质量 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">连接质量</span>
            <div
              className={`px-2 py-1 rounded text-xs ${getQualityColor(quality)}`}
            >
              {getQualityIcon(quality)} {quality.toUpperCase()}
            </div>
          </div>

          {metrics.totalConnections > 0 && (
            <div className="text-xs text-gray-600">
              成功率:{' '}
              {Math.round(
                (metrics.successfulConnections / metrics.totalConnections) * 100
              )}
              %
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>总连接数:</span>
            <span className="font-medium">{metrics.totalConnections}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>成功连接:</span>
            <span className="font-medium text-green-600">
              {metrics.successfulConnections}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>失败连接:</span>
            <span className="font-medium text-red-600">
              {metrics.failedConnections}
            </span>
          </div>
          {metrics.averageLatency > 0 && (
            <div className="flex justify-between text-sm">
              <span>平均延迟:</span>
              <span className="font-medium">
                {Math.round(metrics.averageLatency)}ms
              </span>
            </div>
          )}
        </div>

        {/* 最后连接时间 */}
        {metrics.lastConnectionTime && (
          <div className="text-xs text-gray-500 mb-3">
            最后连接: {metrics.lastConnectionTime.toLocaleTimeString()}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={resetMetrics}
            className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            重置统计
          </button>
          <button
            onClick={() => {
              conversion.reset();
              setTimeout(() => {
                // 尝试重新连接
                window.location.reload();
              }, 1000);
            }}
            className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            重新连接
          </button>
        </div>

        {/* 建议 */}
        {quality === 'poor' && (
          <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
            <strong>连接质量较差</strong>
            <br />
            建议: 检查网络连接或尝试刷新页面
          </div>
        )}

        {!conversion.isConnected && (
          <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
            <strong>WebSocket未连接</strong>
            <br />
            系统将使用HTTP轮询模式
          </div>
        )}
      </div>
    </div>
  );
}
