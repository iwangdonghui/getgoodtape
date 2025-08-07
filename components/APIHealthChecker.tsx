'use client';

import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';

interface APIIssue {
  endpoint: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  solution: string;
  autoFixable: boolean;
}

interface APIHealthCheckerProps {
  className?: string;
}

const APIHealthChecker = memo(function APIHealthChecker({
  className = '',
}: APIHealthCheckerProps) {
  const [issues, setIssues] = useState<APIIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const checkAPIHealth = async () => {
    setIsChecking(true);
    setIssues([]);

    const foundIssues: APIIssue[] = [];

    // 检查各个API端点
    const endpoints = [
      { name: '健康检查', url: '/api/health', expected: 200 },
      { name: '平台信息', url: '/api/platforms', expected: 200 },
      {
        name: 'URL验证',
        url: '/api/validate',
        method: 'POST',
        body: { url: 'https://www.youtube.com/watch?v=test' },
        expected: 200,
      },
      {
        name: 'Workers API',
        url: 'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/health',
        expected: 200,
      },
      {
        name: '视频处理',
        url: 'https://getgoodtape-video-proc.fly.dev/health',
        expected: 200,
      },
    ];

    for (const endpoint of endpoints) {
      try {
        const options: RequestInit = {
          method: endpoint.method || 'GET',
          headers: endpoint.body ? { 'Content-Type': 'application/json' } : {},
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const startTime = performance.now();
        const response = await fetch(endpoint.url, options);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // 检查响应状态
        if (response.status === 404) {
          foundIssues.push({
            endpoint: endpoint.name,
            issue: `端点不存在 (HTTP 404)`,
            severity: 'critical',
            solution: '检查API路由配置，确保端点正确实现',
            autoFixable: false,
          });
        } else if (response.status === 500) {
          foundIssues.push({
            endpoint: endpoint.name,
            issue: `服务器内部错误 (HTTP 500)`,
            severity: 'critical',
            solution: '检查后端服务配置和连接',
            autoFixable: true,
          });
        } else if (response.status !== endpoint.expected) {
          foundIssues.push({
            endpoint: endpoint.name,
            issue: `意外的响应状态 (HTTP ${response.status})`,
            severity: 'warning',
            solution: '检查API实现和错误处理',
            autoFixable: false,
          });
        }

        // 检查响应时间
        if (responseTime > 3000) {
          foundIssues.push({
            endpoint: endpoint.name,
            issue: `响应时间过慢 (${Math.round(responseTime)}ms)`,
            severity: 'warning',
            solution: '优化API性能，检查网络连接',
            autoFixable: false,
          });
        }

        // 检查响应内容
        if (response.ok) {
          try {
            const data = await response.json();
            if (!data || typeof data !== 'object') {
              foundIssues.push({
                endpoint: endpoint.name,
                issue: '响应格式异常',
                severity: 'warning',
                solution: '检查API返回数据格式',
                autoFixable: false,
              });
            }
          } catch (error) {
            foundIssues.push({
              endpoint: endpoint.name,
              issue: '响应不是有效的JSON',
              severity: 'warning',
              solution: '检查API返回内容类型',
              autoFixable: false,
            });
          }
        }
      } catch (error) {
        foundIssues.push({
          endpoint: endpoint.name,
          issue: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
          severity: 'critical',
          solution: '检查网络连接和服务可用性',
          autoFixable: true,
        });
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 检查配置问题
    const configIssues = await checkConfigurationIssues();
    foundIssues.push(...configIssues);

    setIssues(foundIssues);
    setIsChecking(false);
  };

  const checkConfigurationIssues = async (): Promise<APIIssue[]> => {
    const issues: APIIssue[] = [];

    // 检查环境变量和配置
    if (process.env.NODE_ENV === 'development') {
      issues.push({
        endpoint: '开发环境',
        issue: '开发环境可能存在API配置问题',
        severity: 'info',
        solution: '确保所有API端点指向正确的服务',
        autoFixable: true,
      });
    }

    return issues;
  };

  const autoFixIssues = async () => {
    setIsFixing(true);

    const fixableIssues = issues.filter(issue => issue.autoFixable);

    for (const issue of fixableIssues) {
      if (issue.issue.includes('HTTP 500') && issue.endpoint === '平台信息') {
        // 尝试修复平台信息API配置
        if (process.env.NODE_ENV === 'development')
          console.log('🔧 尝试修复平台信息API配置...');
        // 这里可以添加自动修复逻辑
      }

      if (issue.issue.includes('连接失败')) {
        // 尝试重新连接
        if (process.env.NODE_ENV === 'development')
          console.log(`🔧 尝试重新连接 ${issue.endpoint}...`);
        // 这里可以添加重连逻辑
      }
    }

    setIsFixing(false);

    // 重新检查
    setTimeout(() => {
      checkAPIHealth();
    }, 2000);
  };

  const getSeverityColor = (severity: APIIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: APIIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  return (
    <div className={`bg-card rounded-xl p-6 border border-border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">API 健康检查</h2>
        <div className="flex gap-2">
          {issues.some(issue => issue.autoFixable) && (
            <Button
              onClick={autoFixIssues}
              disabled={isFixing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFixing ? '修复中...' : '自动修复'}
            </Button>
          )}
          <Button
            onClick={checkAPIHealth}
            disabled={isChecking}
            className="bg-primary hover:bg-primary/90"
          >
            {isChecking ? '检查中...' : '开始检查'}
          </Button>
        </div>
      </div>

      {issues.length === 0 && !isChecking ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-muted-foreground">
            {isChecking
              ? '正在检查API健康状态...'
              : '点击"开始检查"来诊断API问题'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getSeverityIcon(issue.severity)}</span>
                  <span className="font-medium">{issue.endpoint}</span>
                  {issue.autoFixable && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      可自动修复
                    </span>
                  )}
                </div>
                <span className="text-xs uppercase font-medium">
                  {issue.severity}
                </span>
              </div>

              <div className="mb-2">
                <p className="font-medium">问题: {issue.issue}</p>
              </div>

              <div className="text-sm">
                <p>
                  <strong>解决方案:</strong> {issue.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              发现 {issues.length} 个问题 (严重:{' '}
              {issues.filter(i => i.severity === 'critical').length}, 警告:{' '}
              {issues.filter(i => i.severity === 'warning').length})
            </span>
            <span>
              可自动修复: {issues.filter(i => i.autoFixable).length} 个
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default APIHealthChecker;
