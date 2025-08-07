'use client';

import { memo } from 'react';
import { ConnectionState } from '../lib/robust-websocket';

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatusIndicator = memo(function ConnectionStatusIndicator({
  connectionState,
  className = '',
  showDetails = false,
}: ConnectionStatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '🔄',
          text: '连接中',
          description: '正在建立连接...',
        };
      case 'connected':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✅',
          text: '已连接',
          description: '连接正常',
        };
      case 'reconnecting':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: '🔄',
          text: '重连中',
          description: `重连尝试 ${connectionState.reconnectAttempts}`,
        };
      case 'disconnected':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '⚫',
          text: '已断开',
          description: '连接已断开',
        };
      case 'failed':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '❌',
          text: '连接失败',
          description: connectionState.lastError || '连接失败',
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '❓',
          text: '未知状态',
          description: '未知连接状态',
        };
    }
  };

  const config = getStatusConfig(connectionState.status);

  const formatLastConnected = (date?: Date) => {
    if (!date) return '从未连接';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return '刚刚连接';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前连接`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前连接`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return '未知';
    
    if (latency < 100) {
      return `${latency}ms (优秀)`;
    } else if (latency < 300) {
      return `${latency}ms (良好)`;
    } else if (latency < 500) {
      return `${latency}ms (一般)`;
    } else {
      return `${latency}ms (较慢)`;
    }
  };

  if (!showDetails) {
    // Simple indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-3 h-3 rounded-full ${config.color} ${
          connectionState.status === 'connecting' || connectionState.status === 'reconnecting' 
            ? 'animate-pulse' 
            : ''
        }`} />
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </span>
      </div>
    );
  }

  // Detailed indicator
  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${config.color} ${
            connectionState.status === 'connecting' || connectionState.status === 'reconnecting' 
              ? 'animate-pulse' 
              : ''
          }`} />
          <span className={`font-semibold ${config.textColor}`}>
            {config.icon} {config.text}
          </span>
        </div>
        
        {connectionState.latency && (
          <span className="text-xs text-gray-500">
            延迟: {formatLatency(connectionState.latency)}
          </span>
        )}
      </div>

      <p className={`text-sm ${config.textColor} mb-2`}>
        {config.description}
      </p>

      <div className="space-y-1 text-xs text-gray-600">
        {connectionState.lastConnected && (
          <div>
            上次连接: {formatLastConnected(connectionState.lastConnected)}
          </div>
        )}
        
        {connectionState.reconnectAttempts > 0 && (
          <div>
            重连次数: {connectionState.reconnectAttempts}
          </div>
        )}
        
        {connectionState.status === 'failed' && connectionState.lastError && (
          <div className="text-red-600 mt-2">
            错误: {connectionState.lastError}
          </div>
        )}
      </div>

      {/* Connection quality indicator */}
      {connectionState.status === 'connected' && connectionState.latency && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">连接质量:</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-3 rounded-sm ${
                    connectionState.latency! < bar * 100
                      ? connectionState.latency! < 200 
                        ? 'bg-green-500' 
                        : connectionState.latency! < 400 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ConnectionStatusIndicator;
