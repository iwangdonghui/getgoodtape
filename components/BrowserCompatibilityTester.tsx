'use client';

import { useEffect, useState } from 'react';

interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  features: {
    webp: boolean;
    avif: boolean;
    css_grid: boolean;
    css_flexbox: boolean;
    css_variables: boolean;
    intersection_observer: boolean;
    web_animations: boolean;
    touch_events: boolean;
    pointer_events: boolean;
    service_worker: boolean;
    web_share: boolean;
    clipboard_api: boolean;
  };
}

export default function BrowserCompatibilityTester() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [showTester, setShowTester] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const detectBrowser = () => {
      const ua = navigator.userAgent;
      let name = 'Unknown';
      let version = 'Unknown';
      let engine = 'Unknown';

      // 检测浏览器
      if (ua.includes('Chrome') && !ua.includes('Edg')) {
        name = 'Chrome';
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : 'Unknown';
        engine = 'Blink';
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        name = 'Safari';
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : 'Unknown';
        engine = 'WebKit';
      } else if (ua.includes('Firefox')) {
        name = 'Firefox';
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : 'Unknown';
        engine = 'Gecko';
      } else if (ua.includes('Edg')) {
        name = 'Edge';
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : 'Unknown';
        engine = 'Blink';
      }

      // 检测平台
      let platform = 'Unknown';
      if (ua.includes('iPhone')) platform = 'iPhone';
      else if (ua.includes('iPad')) platform = 'iPad';
      else if (ua.includes('Android')) platform = 'Android';
      else if (ua.includes('Mac')) platform = 'macOS';
      else if (ua.includes('Windows')) platform = 'Windows';
      else if (ua.includes('Linux')) platform = 'Linux';

      // 检测设备类型
      const isMobile = /iPhone|Android.*Mobile/i.test(ua);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

      // 检测功能支持
      const features = {
        webp: checkWebPSupport(),
        avif: checkAVIFSupport(),
        css_grid: CSS.supports('display', 'grid'),
        css_flexbox: CSS.supports('display', 'flex'),
        css_variables: CSS.supports('color', 'var(--test)'),
        intersection_observer: 'IntersectionObserver' in window,
        web_animations: 'animate' in document.createElement('div'),
        touch_events: 'ontouchstart' in window,
        pointer_events: 'onpointerdown' in window,
        service_worker: 'serviceWorker' in navigator,
        web_share: 'share' in navigator,
        clipboard_api: 'clipboard' in navigator,
      };

      setBrowserInfo({
        name,
        version,
        engine,
        platform,
        isMobile,
        isTablet,
        features,
      });
    };

    const checkWebPSupport = (): boolean => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    const checkAVIFSupport = (): boolean => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      try {
        return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      } catch {
        return false;
      }
    };

    detectBrowser();
  }, [isClient]);

  const runCompatibilityTests = () => {
    const results: string[] = [];

    if (!browserInfo) {
      results.push('❌ 无法检测浏览器信息');
      setTestResults(results);
      return;
    }

    // 基础功能测试
    results.push('=== 基础功能测试 ===');
    results.push(
      browserInfo.features.css_grid ? '✅ CSS Grid 支持' : '❌ CSS Grid 不支持'
    );
    results.push(
      browserInfo.features.css_flexbox
        ? '✅ CSS Flexbox 支持'
        : '❌ CSS Flexbox 不支持'
    );
    results.push(
      browserInfo.features.css_variables
        ? '✅ CSS 变量支持'
        : '❌ CSS 变量不支持'
    );

    // 移动端功能测试
    if (browserInfo.isMobile || browserInfo.isTablet) {
      results.push('=== 移动端功能测试 ===');
      results.push(
        browserInfo.features.touch_events
          ? '✅ 触摸事件支持'
          : '❌ 触摸事件不支持'
      );
      results.push(
        browserInfo.features.pointer_events
          ? '✅ 指针事件支持'
          : '❌ 指针事件不支持'
      );

      // 测试视窗单位
      const vh = window.innerHeight;
      const vhTest = document.createElement('div');
      vhTest.style.height = '100vh';
      document.body.appendChild(vhTest);
      const vhSupported = vhTest.offsetHeight === vh;
      document.body.removeChild(vhTest);
      results.push(
        vhSupported ? '✅ 视窗单位(vh)支持' : '❌ 视窗单位(vh)不支持'
      );
    }

    // 现代功能测试
    results.push('=== 现代功能测试 ===');
    results.push(
      browserInfo.features.intersection_observer
        ? '✅ Intersection Observer 支持'
        : '❌ Intersection Observer 不支持'
    );
    results.push(
      browserInfo.features.web_animations
        ? '✅ Web Animations 支持'
        : '❌ Web Animations 不支持'
    );
    results.push(
      browserInfo.features.service_worker
        ? '✅ Service Worker 支持'
        : '❌ Service Worker 不支持'
    );

    // 图片格式测试
    results.push('=== 图片格式测试 ===');
    results.push(browserInfo.features.webp ? '✅ WebP 支持' : '❌ WebP 不支持');
    results.push(browserInfo.features.avif ? '✅ AVIF 支持' : '❌ AVIF 不支持');

    // PWA功能测试
    results.push('=== PWA功能测试 ===');
    results.push(
      browserInfo.features.web_share
        ? '✅ Web Share API 支持'
        : '❌ Web Share API 不支持'
    );
    results.push(
      browserInfo.features.clipboard_api
        ? '✅ Clipboard API 支持'
        : '❌ Clipboard API 不支持'
    );

    setTestResults(results);
  };

  if (!isClient || !browserInfo) return null;

  return (
    <>
      {/* 兼容性测试按钮 */}
      <button
        onClick={() => setShowTester(!showTester)}
        className="fixed bottom-16 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        style={{
          display: process.env.NODE_ENV === 'development' ? 'block' : 'none',
        }}
      >
        🔧
      </button>

      {/* 兼容性测试面板 */}
      {showTester && (
        <div className="fixed bottom-28 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm max-h-96 overflow-y-auto text-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-deep-brown">浏览器兼容性</h3>
            <button
              onClick={() => setShowTester(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <div>
              <strong>浏览器:</strong> {browserInfo.name} {browserInfo.version}
            </div>
            <div>
              <strong>引擎:</strong> {browserInfo.engine}
            </div>
            <div>
              <strong>平台:</strong> {browserInfo.platform}
            </div>
            <div>
              <strong>设备:</strong>{' '}
              {browserInfo.isMobile
                ? '手机'
                : browserInfo.isTablet
                  ? '平板'
                  : '桌面'}
            </div>
          </div>

          <button
            onClick={runCompatibilityTests}
            className="w-full bg-blue-600 text-white py-2 rounded mb-3 hover:bg-blue-700 transition-colors"
          >
            运行兼容性测试
          </button>

          {testResults.length > 0 && (
            <div className="space-y-1 text-xs">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={result.startsWith('===') ? 'font-bold mt-2' : ''}
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
