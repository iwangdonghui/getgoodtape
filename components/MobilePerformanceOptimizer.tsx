'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface MobilePerformanceOptimizerProps {
  children: React.ReactNode;
}

export default function MobilePerformanceOptimizer({
  children,
}: MobilePerformanceOptimizerProps) {
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [shouldReduceAnimations, setShouldReduceAnimations] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 标记为客户端渲染
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // 检测网络连接质量
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const metrics: PerformanceMetrics = {
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        };
        setPerformanceMetrics(metrics);

        // 根据网络质量决定是否减少动画
        const isSlowConnection =
          metrics.effectiveType === 'slow-2g' ||
          metrics.effectiveType === '2g' ||
          metrics.downlink < 1.5 ||
          metrics.saveData;

        setShouldReduceAnimations(isSlowConnection);
      }
    };

    // 检测设备性能
    const detectDevicePerformance = () => {
      // 检测CPU核心数
      const cores = navigator.hardwareConcurrency || 1;

      // 检测内存（如果可用）
      const memory = (navigator as any).deviceMemory || 0;

      // 检测是否为低端设备
      const isLowEnd = cores <= 2 || memory <= 2;
      setIsLowEndDevice(isLowEnd);

      // 低端设备也应该减少动画
      if (isLowEnd) {
        setShouldReduceAnimations(true);
      }
    };

    // 检测用户偏好
    const checkUserPreferences = () => {
      // 检测用户是否偏好减少动画
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (prefersReducedMotion) {
        setShouldReduceAnimations(true);
      }
    };

    updateNetworkInfo();
    detectDevicePerformance();
    checkUserPreferences();

    // 监听网络变化
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, [isClient]);

  useEffect(() => {
    // 根据性能指标调整页面行为
    if (shouldReduceAnimations) {
      document.documentElement.classList.add('reduce-animations');
    } else {
      document.documentElement.classList.remove('reduce-animations');
    }

    if (isLowEndDevice) {
      document.documentElement.classList.add('low-end-device');
    } else {
      document.documentElement.classList.remove('low-end-device');
    }

    if (performanceMetrics?.saveData) {
      document.documentElement.classList.add('save-data');
    } else {
      document.documentElement.classList.remove('save-data');
    }
  }, [shouldReduceAnimations, isLowEndDevice, performanceMetrics]);

  // 预加载关键资源
  useEffect(() => {
    if (!isClient || !performanceMetrics) return;

    // 只在良好网络条件下预加载
    if (
      performanceMetrics.effectiveType === '4g' &&
      performanceMetrics.downlink > 2
    ) {
      // 预加载关键页面
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/app';
      document.head.appendChild(link);
    }
  }, [isClient, performanceMetrics]);

  return (
    <div
      className={`
        ${shouldReduceAnimations ? 'reduce-animations' : ''}
        ${isLowEndDevice ? 'low-end-device' : ''}
        ${performanceMetrics?.saveData ? 'save-data' : ''}
      `}
    >
      {children}

      {/* 性能提示 (仅开发环境且客户端) */}
      {isClient &&
        process.env.NODE_ENV === 'development' &&
        performanceMetrics && (
          <div className="fixed bottom-20 left-4 z-40 bg-black/80 text-white text-xs p-2 rounded max-w-xs">
            <div>网络: {performanceMetrics.effectiveType}</div>
            <div>下行: {performanceMetrics.downlink}Mbps</div>
            <div>延迟: {performanceMetrics.rtt}ms</div>
            {performanceMetrics.saveData && <div>省流量模式: 开启</div>}
            {isLowEndDevice && <div>低端设备: 是</div>}
            {shouldReduceAnimations && <div>减少动画: 是</div>}
          </div>
        )}
    </div>
  );
}
