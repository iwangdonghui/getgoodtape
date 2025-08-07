'use client';

import { useEffect, useRef, memo } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface PerformanceMonitorProps {
  onMetrics?: (metrics: Partial<PerformanceMetrics>) => void;
  enableLogging?: boolean;
}

const PerformanceMonitor = memo(function PerformanceMonitor({
  onMetrics,
  enableLogging = false,
}: PerformanceMonitorProps) {
  const metricsRef = useRef<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    // 检查浏览器支持
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            const pageLoadTime =
              navEntry.loadEventEnd - navEntry.loadEventStart;
            metricsRef.current.pageLoadTime = pageLoadTime;
            break;

          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metricsRef.current.firstContentfulPaint = entry.startTime;
            }
            break;

          case 'largest-contentful-paint':
            metricsRef.current.largestContentfulPaint = entry.startTime;
            break;

          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              metricsRef.current.cumulativeLayoutShift =
                (metricsRef.current.cumulativeLayoutShift || 0) +
                (entry as any).value;
            }
            break;

          case 'first-input':
            metricsRef.current.firstInputDelay =
              (entry as any).processingStart - entry.startTime;
            break;
        }
      }

      // 发送指标
      if (onMetrics) {
        onMetrics(metricsRef.current);
      }

      // 控制台日志（开发环境）
      if (enableLogging && process.env.NODE_ENV === 'development') {
        console.log('🚀 Performance Metrics:', metricsRef.current);
      }
    });

    // 观察不同类型的性能指标
    try {
      observer.observe({
        entryTypes: [
          'navigation',
          'paint',
          'largest-contentful-paint',
          'layout-shift',
          'first-input',
        ],
      });
    } catch (error) {
      // 降级处理：某些浏览器可能不支持所有指标
      try {
        observer.observe({ entryTypes: ['navigation', 'paint'] });
      } catch (fallbackError) {
        console.warn('Performance monitoring not supported in this browser');
      }
    }

    // 页面卸载时发送最终指标
    const handleBeforeUnload = () => {
      if (onMetrics && Object.keys(metricsRef.current).length > 0) {
        onMetrics(metricsRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      observer.disconnect();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [onMetrics, enableLogging]);

  // 手动触发性能报告
  useEffect(() => {
    const reportPerformance = () => {
      if (typeof window === 'undefined') return;

      // 获取基本性能指标
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        const metrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded:
            navigation.domContentLoadedEventEnd -
            navigation.domContentLoadedEventStart,
          timeToFirstByte: navigation.responseStart - navigation.requestStart,
        };

        if (enableLogging) {
          if (process.env.NODE_ENV === 'development')
            console.log('📊 Basic Performance Metrics:', metrics);
        }
      }
    };

    // 页面加载完成后报告
    if (document.readyState === 'complete') {
      reportPerformance();
    } else {
      window.addEventListener('load', reportPerformance);
      return () => window.removeEventListener('load', reportPerformance);
    }
  }, [enableLogging]);

  return null; // 这是一个无UI的监控组件
});

// 性能优化建议函数
export function getPerformanceRecommendations(
  metrics: Partial<PerformanceMetrics>
): string[] {
  const recommendations: string[] = [];

  if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 2000) {
    recommendations.push('首次内容绘制时间较长，考虑优化关键资源加载');
  }

  if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
    recommendations.push('最大内容绘制时间较长，考虑优化图片和字体加载');
  }

  if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
    recommendations.push('累积布局偏移较大，检查图片和动态内容的尺寸设置');
  }

  if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
    recommendations.push('首次输入延迟较长，考虑减少主线程阻塞');
  }

  return recommendations;
}

// Web Vitals 评分函数
export function getWebVitalsScore(metrics: Partial<PerformanceMetrics>): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: Record<string, { value: number; score: number; threshold: string }>;
} {
  const details: Record<
    string,
    { value: number; score: number; threshold: string }
  > = {};
  let totalScore = 0;
  let metricCount = 0;

  // FCP 评分
  if (metrics.firstContentfulPaint) {
    const fcp = metrics.firstContentfulPaint;
    const fcpScore = fcp <= 1800 ? 100 : fcp <= 3000 ? 50 : 0;
    details.FCP = {
      value: fcp,
      score: fcpScore,
      threshold: '≤1.8s (good), ≤3.0s (needs improvement)',
    };
    totalScore += fcpScore;
    metricCount++;
  }

  // LCP 评分
  if (metrics.largestContentfulPaint) {
    const lcp = metrics.largestContentfulPaint;
    const lcpScore = lcp <= 2500 ? 100 : lcp <= 4000 ? 50 : 0;
    details.LCP = {
      value: lcp,
      score: lcpScore,
      threshold: '≤2.5s (good), ≤4.0s (needs improvement)',
    };
    totalScore += lcpScore;
    metricCount++;
  }

  // CLS 评分
  if (metrics.cumulativeLayoutShift) {
    const cls = metrics.cumulativeLayoutShift;
    const clsScore = cls <= 0.1 ? 100 : cls <= 0.25 ? 50 : 0;
    details.CLS = {
      value: cls,
      score: clsScore,
      threshold: '≤0.1 (good), ≤0.25 (needs improvement)',
    };
    totalScore += clsScore;
    metricCount++;
  }

  // FID 评分
  if (metrics.firstInputDelay) {
    const fid = metrics.firstInputDelay;
    const fidScore = fid <= 100 ? 100 : fid <= 300 ? 50 : 0;
    details.FID = {
      value: fid,
      score: fidScore,
      threshold: '≤100ms (good), ≤300ms (needs improvement)',
    };
    totalScore += fidScore;
    metricCount++;
  }

  const averageScore = metricCount > 0 ? totalScore / metricCount : 0;
  const grade =
    averageScore >= 90
      ? 'A'
      : averageScore >= 75
        ? 'B'
        : averageScore >= 60
          ? 'C'
          : averageScore >= 40
            ? 'D'
            : 'F';

  return { score: averageScore, grade, details };
}

export default PerformanceMonitor;
