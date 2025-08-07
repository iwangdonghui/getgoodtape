'use client';

import { useState, useEffect, memo } from 'react';

interface StatusSyncDiagnosticsProps {
  jobId?: string | null;
  status: string;
  progress: number;
  className?: string;
}

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'checking';
  message: string;
  details?: any;
  timestamp: string;
}

const StatusSyncDiagnostics = memo(function StatusSyncDiagnostics({
  jobId,
  status,
  progress,
  className = '',
}: StatusSyncDiagnosticsProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (
    name: string,
    status: DiagnosticResult['status'],
    message: string,
    details?: any
  ) => {
    const result: DiagnosticResult = {
      name,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString(),
    };
    setResults(prev => [...prev.filter(r => r.name !== name), result]);
  };

  // 状态同步诊断
  const runDiagnostics = async () => {
    if (!jobId) {
      addResult('Job ID', 'fail', '没有活动的任务ID');
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      // 1. 检查API健康状态
      addResult('API健康检查', 'checking', '检查API服务状态...');
      try {
        const healthResponse = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (healthResponse.ok) {
          addResult('API健康检查', 'pass', 'API服务正常');
        } else {
          addResult(
            'API健康检查',
            'fail',
            `API服务异常: ${healthResponse.status}`
          );
        }
      } catch (error) {
        addResult(
          'API健康检查',
          'fail',
          `API连接失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }

      // 2. 检查任务状态
      addResult('任务状态检查', 'checking', '获取最新任务状态...');
      try {
        const statusResponse = await fetch(
          `/api/status/${jobId}?t=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
          }
        );

        const statusData = await statusResponse.json();

        if (statusData.success) {
          const serverStatus = statusData.status;
          const serverProgress = statusData.progress;

          addResult(
            '任务状态检查',
            'pass',
            `服务器状态: ${serverStatus}, 进度: ${serverProgress}%`,
            statusData
          );

          // 3. 检查状态一致性
          if (serverStatus !== status) {
            addResult(
              '状态一致性',
              'warning',
              `状态不一致 - 前端: ${status}, 服务器: ${serverStatus}`
            );
          } else {
            addResult('状态一致性', 'pass', '前端和服务器状态一致');
          }

          // 4. 检查进度一致性
          if (Math.abs(serverProgress - progress) > 5) {
            addResult(
              '进度一致性',
              'warning',
              `进度差异较大 - 前端: ${progress}%, 服务器: ${serverProgress}%`
            );
          } else {
            addResult('进度一致性', 'pass', '前端和服务器进度基本一致');
          }
        } else {
          addResult(
            '任务状态检查',
            'fail',
            `获取状态失败: ${statusData.error}`
          );
        }
      } catch (error) {
        addResult(
          '任务状态检查',
          'fail',
          `状态检查失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }

      // 5. 检查网络连接
      addResult('网络连接检查', 'checking', '测试网络连接质量...');
      const startTime = Date.now();
      try {
        await fetch('/api/health', { method: 'HEAD' });
        const latency = Date.now() - startTime;

        if (latency < 1000) {
          addResult('网络连接检查', 'pass', `网络延迟: ${latency}ms (良好)`);
        } else if (latency < 3000) {
          addResult('网络连接检查', 'warning', `网络延迟: ${latency}ms (较慢)`);
        } else {
          addResult('网络连接检查', 'fail', `网络延迟: ${latency}ms (很慢)`);
        }
      } catch (error) {
        addResult('网络连接检查', 'fail', '网络连接失败');
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 自动诊断（当状态卡住时）
  useEffect(() => {
    if (status === 'processing' && jobId) {
      const timer = setTimeout(() => {
        console.log('🔍 自动运行状态同步诊断...');
        runDiagnostics();
      }, 30000); // 30秒后自动诊断

      return () => clearTimeout(timer);
    }
  }, [status, jobId]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'checking':
        return '🔄';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-600';
      case 'fail':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'checking':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!jobId) return null;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">状态同步诊断</h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {isRunning ? '🔄 诊断中...' : '🔍 运行诊断'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-2 bg-gray-50 rounded"
            >
              <span className="text-lg">{getStatusIcon(result.status)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {result.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {result.timestamp}
                  </span>
                </div>
                <p className={`text-sm ${getStatusColor(result.status)}`}>
                  {result.message}
                </p>
                {result.details && (
                  <details className="mt-1">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      详细信息
                    </summary>
                    <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isRunning && (
        <div className="text-center text-gray-500 py-4">
          <p>点击"运行诊断"检查状态同步问题</p>
          <p className="text-xs mt-1">当转换进度卡住时会自动运行诊断</p>
        </div>
      )}

      {/* 快速操作 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            当前状态: {status} ({progress}%)
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              🔄 刷新页面
            </button>
            <button
              onClick={() => {
                if (jobId) {
                  navigator.clipboard.writeText(jobId);
                  alert('任务ID已复制到剪贴板');
                }
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              📋 复制任务ID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StatusSyncDiagnostics;
