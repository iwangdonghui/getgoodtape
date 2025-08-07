'use client';

import React, { useCallback, useEffect, useRef, useMemo } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
}

interface UsePerformanceOptimizationOptions {
  enableLogging?: boolean;
  throttleMs?: number;
  debounceMs?: number;
  maxRenderCount?: number;
}

export function usePerformanceOptimization(
  componentName: string,
  options: UsePerformanceOptimizationOptions = {}
) {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    throttleMs = 16, // 60fps
    debounceMs = 300,
    maxRenderCount = 100,
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  const renderTimesRef = useRef<number[]>([]);
  const lastLogTimeRef = useRef<number>(0);

  // 记录渲染性能
  const recordRender = useCallback(() => {
    const now = performance.now();
    const metrics = metricsRef.current;

    metrics.renderCount++;

    if (metrics.lastRenderTime > 0) {
      const renderTime = now - metrics.lastRenderTime;
      renderTimesRef.current.push(renderTime);

      // 保持最近100次渲染的记录
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }

      // 计算平均渲染时间
      metrics.averageRenderTime =
        renderTimesRef.current.reduce((a, b) => a + b, 0) /
        renderTimesRef.current.length;
    }

    metrics.lastRenderTime = now;

    // 记录内存使用（如果可用）
    if ('memory' in performance) {
      metrics.memoryUsage = Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    }

    // 性能警告
    if (enableLogging) {
      const timeSinceLastLog = now - lastLogTimeRef.current;

      // 每5秒最多记录一次日志
      if (timeSinceLastLog > 5000) {
        if (metrics.renderCount > maxRenderCount) {
          console.warn(
            `⚠️ ${componentName}: 渲染次数过多 (${metrics.renderCount})`
          );
        }

        if (metrics.averageRenderTime > 16) {
          console.warn(
            `⚠️ ${componentName}: 平均渲染时间过长 (${metrics.averageRenderTime.toFixed(2)}ms)`
          );
        }

        lastLogTimeRef.current = now;
      }
    }
  }, [componentName, enableLogging, maxRenderCount]);

  // 节流函数
  const throttle = useCallback(
    <T extends (...args: any[]) => any>(
      func: T,
      delay: number = throttleMs
    ): T => {
      const lastCallRef = useRef<number>(0);

      return ((...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCallRef.current >= delay) {
          lastCallRef.current = now;
          return func(...args);
        }
      }) as T;
    },
    [throttleMs]
  );

  // 防抖函数
  const debounce = useCallback(
    <T extends (...args: any[]) => any>(
      func: T,
      delay: number = debounceMs
    ): T => {
      const timeoutRef = useRef<NodeJS.Timeout>();

      return ((...args: Parameters<T>) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          func(...args);
        }, delay);
      }) as T;
    },
    [debounceMs]
  );

  // 优化的 useMemo，带有依赖项变化检测
  const optimizedMemo = useCallback(
    <T>(
      factory: () => T,
      deps: React.DependencyList,
      debugName?: string
    ): T => {
      const prevDepsRef = useRef<React.DependencyList>();
      const memoizedValueRef = useRef<T>();

      // 检查依赖项是否真的发生了变化
      const depsChanged =
        !prevDepsRef.current ||
        deps.length !== prevDepsRef.current.length ||
        deps.some((dep, index) => dep !== prevDepsRef.current![index]);

      if (depsChanged) {
        if (enableLogging && debugName && prevDepsRef.current) {
          console.log(`🔄 ${componentName}.${debugName}: 依赖项变化，重新计算`);
        }

        memoizedValueRef.current = factory();
        prevDepsRef.current = deps;
      }

      return memoizedValueRef.current!;
    },
    [componentName, enableLogging]
  );

  // 批量状态更新
  const batchUpdates = useCallback((updates: (() => void)[]) => {
    // 使用 React 18 的自动批处理
    updates.forEach(update => update());
  }, []);

  // 虚拟化列表辅助函数
  const getVisibleRange = useCallback(
    (
      scrollTop: number,
      containerHeight: number,
      itemHeight: number,
      totalItems: number,
      overscan: number = 5
    ) => {
      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - overscan
      );
      const endIndex = Math.min(
        totalItems - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );

      return { startIndex, endIndex };
    },
    []
  );

  // 图片懒加载辅助
  const createIntersectionObserver = useCallback(
    (
      callback: (entries: IntersectionObserverEntry[]) => void,
      options?: IntersectionObserverInit
    ) => {
      if (
        typeof window === 'undefined' ||
        !('IntersectionObserver' in window)
      ) {
        return null;
      }

      return new IntersectionObserver(callback, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      });
    },
    []
  );

  // 获取性能指标
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // 重置性能指标
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
    };
    renderTimesRef.current = [];
  }, []);

  // 每次渲染时记录性能
  useEffect(() => {
    recordRender();
  });

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (enableLogging) {
        const metrics = metricsRef.current;
        console.log(`📊 ${componentName} 性能总结:`, {
          totalRenders: metrics.renderCount,
          averageRenderTime: metrics.averageRenderTime.toFixed(2) + 'ms',
          finalMemoryUsage: metrics.memoryUsage
            ? metrics.memoryUsage + 'MB'
            : 'N/A',
        });
      }
    };
  }, [componentName, enableLogging]);

  return {
    // 性能监控
    recordRender,
    getMetrics,
    resetMetrics,

    // 优化工具
    throttle,
    debounce,
    optimizedMemo,
    batchUpdates,

    // 虚拟化和懒加载
    getVisibleRange,
    createIntersectionObserver,

    // 当前指标
    renderCount: metricsRef.current.renderCount,
    averageRenderTime: metricsRef.current.averageRenderTime,
    memoryUsage: metricsRef.current.memoryUsage,
  };
}

// 高阶组件：为组件添加性能监控
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props: P) => {
    const { recordRender } = usePerformanceOptimization(
      componentName || Component.displayName || Component.name || 'Unknown'
    );

    React.useEffect(() => {
      recordRender();
    });

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent;
}

// React.memo 的优化版本
export function optimizedMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(
    Component,
    propsAreEqual ||
      ((prevProps, nextProps) => {
        // 深度比较优化
        const prevKeys = Object.keys(prevProps);
        const nextKeys = Object.keys(nextProps);

        if (prevKeys.length !== nextKeys.length) {
          return false;
        }

        return prevKeys.every(key => {
          const prevValue = (prevProps as any)[key];
          const nextValue = (nextProps as any)[key];

          // 对于函数，检查引用相等性
          if (
            typeof prevValue === 'function' &&
            typeof nextValue === 'function'
          ) {
            return prevValue === nextValue;
          }

          // 对于对象，进行浅比较
          if (typeof prevValue === 'object' && typeof nextValue === 'object') {
            if (prevValue === null || nextValue === null) {
              return prevValue === nextValue;
            }

            const prevObjKeys = Object.keys(prevValue);
            const nextObjKeys = Object.keys(nextValue);

            if (prevObjKeys.length !== nextObjKeys.length) {
              return false;
            }

            return prevObjKeys.every(
              objKey => prevValue[objKey] === nextValue[objKey]
            );
          }

          return prevValue === nextValue;
        });
      })
  );
}
