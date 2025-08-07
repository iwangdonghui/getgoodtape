'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ThemeToggle from '../../components/ThemeToggle';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import DebugConsole from '../../components/DebugConsole';
import PerformanceMonitor from '../../components/PerformanceMonitor';
import NetworkMonitor from '../../components/NetworkMonitor';
import SystemDiagnostics from '../../components/SystemDiagnostics';
import APIStatusMonitor from '../../components/APIStatusMonitor';
import APIHealthChecker from '../../components/APIHealthChecker';
import StatusSyncDiagnostics from '../../components/StatusSyncDiagnostics';
import WebSocketStatus from '../../components/WebSocketStatus';
import WebSocketDiagnostics from '../../components/WebSocketDiagnostics';
import WebSocketTester from '../../components/WebSocketTester';
import NetworkSolutionGuide from '../../components/NetworkSolutionGuide';

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
  timestamp: string;
}

export default function DebugPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testUrl, setTestUrl] = useState(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    // 收集系统信息
    setSystemInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      localStorage: typeof Storage !== 'undefined',
      webSocket: typeof WebSocket !== 'undefined',
    });
  }, []);

  const addResult = (
    test: string,
    status: DebugResult['status'],
    message: string,
    data?: any
  ) => {
    setResults(prev => [
      ...prev,
      {
        test,
        status,
        message,
        data,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // 测试前端健康状态
  const testFrontendHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();

      if (response.ok) {
        addResult('Frontend Health', 'success', '前端API健康检查通过', data);
      } else {
        addResult(
          'Frontend Health',
          'error',
          `健康检查失败: ${data.error || '未知错误'}`,
          data
        );
      }
    } catch (error) {
      addResult(
        'Frontend Health',
        'error',
        `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  // 测试URL验证
  const testUrlValidation = async () => {
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl }),
      });
      const data = await response.json();

      if (response.ok && data.isValid) {
        addResult(
          'URL Validation',
          'success',
          `URL验证成功 - 平台: ${data.platform}`,
          data
        );
      } else {
        addResult(
          'URL Validation',
          'error',
          `URL验证失败: ${data.error?.message || '未知错误'}`,
          data
        );
      }
    } catch (error) {
      addResult(
        'URL Validation',
        'error',
        `验证请求失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  // 测试平台信息
  const testPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms');
      const data = await response.json();

      if (response.ok && data.success) {
        addResult(
          'Platforms',
          'success',
          `获取到 ${data.platforms.length} 个支持的平台`,
          data
        );
      } else {
        addResult(
          'Platforms',
          'error',
          `获取平台信息失败: ${data.error || '未知错误'}`,
          data
        );
      }
    } catch (error) {
      addResult(
        'Platforms',
        'error',
        `平台信息请求失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  // 测试WebSocket连接
  const testWebSocket = async () => {
    try {
      // 在开发环境中也使用生产Workers URL，因为本地没有运行Workers
      const wsUrl =
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';

      console.log('🔌 Testing WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addResult('WebSocket', 'success', 'WebSocket连接成功');
        ws.close();
      };

      ws.onerror = error => {
        addResult('WebSocket', 'error', `WebSocket连接失败: ${error}`);
      };

      ws.onclose = () => {
        addResult('WebSocket', 'success', 'WebSocket连接已关闭');
      };

      // 5秒后超时
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          addResult('WebSocket', 'error', 'WebSocket连接超时');
        }
      }, 5000);
    } catch (error) {
      addResult(
        'WebSocket',
        'error',
        `WebSocket测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  // 测试日志功能
  const testLogging = () => {
    console.log('这是一条普通日志信息');
    console.warn('这是一条警告信息');
    console.error('这是一条错误信息');
    console.info('这是一条调试信息');

    addResult('Logging Test', 'success', '日志测试完成，请查看调试控制台');
  };

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    addResult('Test Suite', 'pending', '开始运行所有测试...');
    console.log('🚀 开始运行 GetGoodTape 调试测试套件');

    await testFrontendHealth();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testPlatforms();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testUrlValidation();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testWebSocket();
    await new Promise(resolve => setTimeout(resolve, 1000));

    testLogging();

    addResult('Test Suite', 'success', '所有测试完成');
    console.log('✅ GetGoodTape 调试测试套件执行完成');
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header variant="app" />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            🔧 GetGoodTape 调试面板
          </h1>

          {/* 使用说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              使用说明
            </h2>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 右下角 🐛 按钮：打开调试控制台，查看实时日志</li>
              <li>• 右上角 📊 按钮：打开性能监控，查看FPS、内存等指标</li>
              <li>• 右下角 🌐 按钮：打开网络监控，查看API请求</li>
              <li>• 使用下方按钮测试各个功能模块</li>
              <li>• 所有测试结果会显示在页面底部</li>
            </ul>
          </div>

          {/* 环境信息 */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">环境信息</h2>
            {systemInfo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h3 className="font-medium mb-2">浏览器</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>平台: {systemInfo.platform}</li>
                    <li>语言: {systemInfo.language}</li>
                    <li>在线: {systemInfo.onLine ? '✅' : '❌'}</li>
                    <li>Cookie: {systemInfo.cookieEnabled ? '✅' : '❌'}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">功能支持</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      LocalStorage: {systemInfo.localStorage ? '✅' : '❌'}
                    </li>
                    <li>WebSocket: {systemInfo.webSocket ? '✅' : '❌'}</li>
                    <li>
                      Fetch API: {typeof fetch !== 'undefined' ? '✅' : '❌'}
                    </li>
                    <li>
                      ES6 Modules: {typeof Symbol !== 'undefined' ? '✅' : '❌'}
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">显示</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      屏幕: {systemInfo.screen.width}×{systemInfo.screen.height}
                    </li>
                    <li>
                      视口: {systemInfo.viewport.width}×
                      {systemInfo.viewport.height}
                    </li>
                    <li>色深: {systemInfo.screen.colorDepth}bit</li>
                    <li>环境: {process.env.NODE_ENV || 'development'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* WebSocket状态 */}
          <div className="mb-6">
            <WebSocketStatus />
          </div>

          {/* 新的WebSocket测试器 */}
          <div className="mb-6">
            <WebSocketTester />
          </div>

          {/* 网络解决方案指南 */}
          <div className="mb-6">
            <NetworkSolutionGuide />
          </div>

          {/* WebSocket诊断 */}
          <div className="mb-6">
            <WebSocketDiagnostics />
          </div>

          {/* 主题测试 */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">主题切换测试</h2>
            <div className="flex items-center space-x-4 mb-4">
              <span>主题切换按钮：</span>
              <ThemeToggle />
            </div>
            <p className="text-sm text-muted-foreground">
              点击按钮测试主题切换功能是否正常工作。
            </p>
          </div>

          {/* API 测试配置 */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">API 测试配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  测试URL
                </label>
                <Input
                  value={testUrl}
                  onChange={e => setTestUrl(e.target.value)}
                  placeholder="输入要测试的视频URL"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 测试按钮 */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">快速测试</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Button onClick={testFrontendHealth} disabled={isRunning}>
                健康检查
              </Button>
              <Button onClick={testPlatforms} disabled={isRunning}>
                平台信息
              </Button>
              <Button onClick={testUrlValidation} disabled={isRunning}>
                URL验证
              </Button>
              <Button onClick={testWebSocket} disabled={isRunning}>
                WebSocket
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Button
                onClick={testLogging}
                disabled={isRunning}
                variant="outline"
              >
                测试日志
              </Button>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="bg-primary hover:bg-primary/90"
              >
                {isRunning ? '运行中...' : '运行所有测试'}
              </Button>
              <Button onClick={clearResults} variant="outline">
                清空结果
              </Button>
            </div>
          </div>

          {/* API 健康检查 */}
          <APIHealthChecker className="mb-6" />

          {/* API 状态监控 */}
          <APIStatusMonitor className="mb-6" />

          {/* 系统诊断 */}
          <SystemDiagnostics className="mb-6" />

          {/* 测试结果 */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">API 测试结果</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-muted-foreground">暂无测试结果</p>
              ) : (
                results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : result.status === 'error'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{result.test}</span>
                      <span className="text-xs opacity-75">
                        {result.timestamp}
                      </span>
                    </div>
                    <p className="text-sm">{result.message}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer">
                          查看详细数据
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-black/5 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* 调试工具 */}
      <DebugConsole />
      <PerformanceMonitor enableLogging={true} />
      <NetworkMonitor />

      {/* 状态同步诊断 - 固定在右下角 */}
      <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto z-50">
        <StatusSyncDiagnostics
          jobId="demo_job_id"
          status="processing"
          progress={40}
        />
      </div>
    </div>
  );
}
