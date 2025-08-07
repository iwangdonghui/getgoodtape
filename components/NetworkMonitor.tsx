'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: string;
  size?: number;
}

interface NetworkMonitorProps {
  className?: string;
}

const NetworkMonitor = memo(function NetworkMonitor({
  className = '',
}: NetworkMonitorProps) {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isMonitoring) return;

    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // 拦截 fetch 请求
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] as string;
      const options = args[1] as RequestInit;
      const method = options?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        const newRequest: NetworkRequest = {
          id: Date.now().toString(),
          url: url.toString(),
          method,
          status: response.status,
          duration,
          timestamp: new Date().toLocaleTimeString(),
          size: parseInt(response.headers.get('content-length') || '0'),
        };

        setRequests(prev => [...prev.slice(-49), newRequest]); // 保持最新50条
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        const newRequest: NetworkRequest = {
          id: Date.now().toString(),
          url: url.toString(),
          method,
          status: 0,
          duration,
          timestamp: new Date().toLocaleTimeString(),
        };

        setRequests(prev => [...prev.slice(-49), newRequest]);
        throw error;
      }
    };

    // 拦截 XMLHttpRequest
    const xhrRequests = new Map();

    (XMLHttpRequest.prototype.open as any) = function (
      this: XMLHttpRequest,
      method: string,
      url: string,
      ...args: any[]
    ) {
      const startTime = performance.now();
      xhrRequests.set(this, { method, url, startTime });
      return (originalXHROpen as any).call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const requestData = xhrRequests.get(this);
      if (requestData) {
        this.addEventListener('loadend', () => {
          const endTime = performance.now();
          const duration = Math.round(endTime - requestData.startTime);

          const newRequest: NetworkRequest = {
            id: Date.now().toString(),
            url: requestData.url,
            method: requestData.method,
            status: this.status,
            duration,
            timestamp: new Date().toLocaleTimeString(),
            size: this.responseText?.length || 0,
          };

          setRequests(prev => [...prev.slice(-49), newRequest]);
          xhrRequests.delete(this);
        });
      }
      return originalXHRSend.call(this, ...args);
    };

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, [isMonitoring]);

  const clearRequests = () => {
    setRequests([]);
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-gray-500';
    if (status < 300) return 'text-green-600';
    if (status < 400) return 'text-blue-600';
    if (status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-16 right-4 z-40 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
        >
          🌐
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-16 right-4 w-96 h-80 bg-white border border-gray-300 rounded-lg shadow-xl z-40 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-sm">网络监控</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`text-xs px-2 py-1 h-auto ${
              isMonitoring
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isMonitoring ? '停止' : '开始'}
          </Button>
          <Button
            onClick={clearRequests}
            className="text-xs px-2 py-1 h-auto"
            variant="outline"
          >
            清空
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            className="text-xs px-2 py-1 h-auto"
            variant="outline"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Requests */}
      <div className="flex-1 overflow-y-auto text-xs">
        {requests.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            {isMonitoring ? '等待网络请求...' : '点击"开始"监控网络请求'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {requests.map(request => (
              <div
                key={request.id}
                className="p-2 border border-gray-200 rounded bg-gray-50"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{request.method}</span>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(request.status)}>
                      {request.status || 'ERR'}
                    </span>
                    <span className="text-gray-500">{request.timestamp}</span>
                  </div>
                </div>
                <div className="text-gray-700 break-all mb-1">
                  {request.url.length > 50
                    ? `${request.url.substring(0, 50)}...`
                    : request.url}
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{formatDuration(request.duration)}</span>
                  <span>{formatSize(request.size)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between text-xs text-gray-600">
          <span>总计: {requests.length} 个请求</span>
          <span>状态: {isMonitoring ? '监控中' : '已停止'}</span>
        </div>
      </div>
    </div>
  );
});

export default NetworkMonitor;
