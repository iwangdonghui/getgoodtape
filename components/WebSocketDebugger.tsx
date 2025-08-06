'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface WebSocketMessage {
  timestamp: number;
  type: string;
  direction: 'sent' | 'received';
  data: any;
}

interface WebSocketDebuggerProps {
  jobId?: string;
  onMessageReceived?: (message: any) => void;
}

export default function WebSocketDebugger({
  jobId,
  onMessageReceived,
}: WebSocketDebuggerProps) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionUrl, setConnectionUrl] = useState('');

  const addMessage = (
    type: string,
    direction: 'sent' | 'received',
    data: any
  ) => {
    const message: WebSocketMessage = {
      timestamp: Date.now(),
      type,
      direction,
      data,
    };
    setMessages(prev => [...prev.slice(-49), message]); // Keep last 50 messages

    if (direction === 'received' && onMessageReceived) {
      onMessageReceived(data);
    }
  };

  const connectWebSocket = () => {
    try {
      // Try to determine the WebSocket URL
      const wsUrl =
        process.env.NODE_ENV === 'development'
          ? 'ws://localhost:8787/api/ws'
          : 'wss://your-workers-domain.workers.dev/api/ws';

      setConnectionUrl(wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔗 WebSocket Debug: Connected');
        setIsConnected(true);
        addMessage('connection', 'received', { status: 'connected' });

        // If we have a jobId, subscribe to it
        if (jobId) {
          const subscribeMessage = {
            type: 'subscribe',
            payload: { jobId },
          };
          ws.send(JSON.stringify(subscribeMessage));
          addMessage('subscribe', 'sent', subscribeMessage);
        }
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket Debug: Received message', data);
          addMessage(data.type || 'unknown', 'received', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          addMessage('parse_error', 'received', {
            error: error instanceof Error ? error.message : String(error),
            raw: event.data,
          });
        }
      };

      ws.onclose = event => {
        console.log(
          '🔌 WebSocket Debug: Disconnected',
          event.code,
          event.reason
        );
        setIsConnected(false);
        addMessage('connection', 'received', {
          status: 'disconnected',
          code: event.code,
          reason: event.reason,
        });
      };

      ws.onerror = error => {
        console.error('❌ WebSocket Debug: Error', error);
        addMessage('error', 'received', { error: 'WebSocket error occurred' });
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      addMessage('error', 'received', {
        error: 'Failed to create WebSocket connection',
      });
    }
  };

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
  };

  const sendTestMessage = () => {
    if (websocket && isConnected) {
      const testMessage = {
        type: 'ping',
        payload: { timestamp: Date.now() },
      };
      websocket.send(JSON.stringify(testMessage));
      addMessage('ping', 'sent', testMessage);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) +
      '.' +
      date.getMilliseconds().toString().padStart(3, '0')
    );
  };

  const getMessageColor = (type: string, direction: 'sent' | 'received') => {
    if (direction === 'sent') return 'text-blue-600';

    switch (type) {
      case 'progress_update':
        return 'text-green-600';
      case 'conversion_completed':
        return 'text-purple-600';
      case 'conversion_failed':
        return 'text-red-600';
      case 'error':
        return 'text-red-600';
      case 'connection':
        return 'text-gray-600';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔍 WebSocket调试器</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          ></div>
          <span className="text-sm">{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      <div className="mb-4 text-xs text-gray-600">
        <p>连接URL: {connectionUrl}</p>
        {jobId && <p>监听Job ID: {jobId}</p>}
      </div>

      <div className="flex gap-2 mb-4">
        {!isConnected ? (
          <Button onClick={connectWebSocket} size="sm">
            🔗 连接WebSocket
          </Button>
        ) : (
          <Button onClick={disconnectWebSocket} size="sm" variant="outline">
            🔌 断开连接
          </Button>
        )}

        <Button
          onClick={sendTestMessage}
          size="sm"
          variant="outline"
          disabled={!isConnected}
        >
          📤 发送测试消息
        </Button>

        <Button onClick={clearMessages} size="sm" variant="outline">
          🗑️ 清空日志
        </Button>
      </div>

      <div className="bg-black text-green-400 p-3 rounded font-mono text-xs h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-gray-500">等待WebSocket消息...</div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-400">
                [{formatTimestamp(message.timestamp)}]
              </span>
              <span
                className={`ml-2 ${getMessageColor(message.type, message.direction)}`}
              >
                {message.direction === 'sent' ? '📤' : '📥'} {message.type}
              </span>
              <div className="ml-4 text-gray-300 text-xs">
                {JSON.stringify(message.data, null, 2)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 关键指标显示 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-white p-2 rounded">
          <div className="font-medium">总消息数</div>
          <div className="text-lg">{messages.length}</div>
        </div>
        <div className="bg-white p-2 rounded">
          <div className="font-medium">进度更新</div>
          <div className="text-lg">
            {messages.filter(m => m.type === 'progress_update').length}
          </div>
        </div>
        <div className="bg-white p-2 rounded">
          <div className="font-medium">完成通知</div>
          <div className="text-lg">
            {messages.filter(m => m.type === 'conversion_completed').length}
          </div>
        </div>
        <div className="bg-white p-2 rounded">
          <div className="font-medium">错误消息</div>
          <div className="text-lg text-red-600">
            {
              messages.filter(
                m => m.type === 'error' || m.type === 'conversion_failed'
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
