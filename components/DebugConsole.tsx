'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

interface DebugConsoleProps {
  className?: string;
}

const DebugConsole = memo(function DebugConsole({
  className = '',
}: DebugConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data,
    };

    setLogs(prev => [...prev.slice(-99), newLog]); // 保持最新100条
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // 拦截console方法
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      addLog('info', args.join(' '), args.length > 1 ? args : undefined);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLog('warn', args.join(' '), args.length > 1 ? args : undefined);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addLog('error', args.join(' '), args.length > 1 ? args : undefined);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      addLog('debug', args.join(' '), args.length > 1 ? args : undefined);
    };

    // 拦截未捕获的错误
    const handleError = (event: ErrorEvent) => {
      addLog('error', `Uncaught Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog(
        'error',
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  const filteredLogs = logs.filter(
    log => filter === 'all' || log.level === filter
  );

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'debug':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
        >
          🐛
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 h-80 bg-white border border-gray-300 rounded-lg shadow-xl z-50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-sm">调试控制台</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
            <option value="debug">调试</option>
          </select>
          <Button
            onClick={clearLogs}
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

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">暂无日志</div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-2 rounded border ${getLevelColor(log.level)}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium uppercase">{log.level}</span>
                <span className="opacity-75">{log.timestamp}</span>
              </div>
              <div className="break-words">{log.message}</div>
              {log.data && (
                <details className="mt-1">
                  <summary className="cursor-pointer opacity-75">
                    详细信息
                  </summary>
                  <pre className="mt-1 p-1 bg-black/5 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between text-xs text-gray-600">
          <span>总计: {logs.length} 条日志</span>
          <span>过滤: {filteredLogs.length} 条</span>
        </div>
      </div>
    </div>
  );
});

export default DebugConsole;
