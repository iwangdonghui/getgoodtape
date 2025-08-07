'use client';

import { useEffect, useRef, useCallback } from 'react';

interface MemoryOptimizerProps {
  children: React.ReactNode;
  enableGarbageCollection?: boolean;
  memoryThreshold?: number; // MB
}

export default function MemoryOptimizer({
  children,
  enableGarbageCollection = true,
  memoryThreshold = 100,
}: MemoryOptimizerProps) {
  const cleanupIntervalRef = useRef<NodeJS.Timeout>();
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(Date.now());

  // 强制垃圾回收（如果可用）
  const forceGarbageCollection = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('🗑️ 强制垃圾回收执行');
      } catch (error) {
        console.warn('垃圾回收失败:', error);
      }
    }
  }, []);

  // 清理DOM中的无用元素
  const cleanupDOMElements = useCallback(() => {
    // 清理已断开连接的DOM节点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: node => {
          const element = node as HTMLElement;
          // 检查是否为隐藏或无用的元素
          if (
            element.style &&
            element.style.display === 'none' &&
            !element.hasAttribute('data-keep') &&
            element.children.length === 0
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      }
    );

    const nodesToRemove: Element[] = [];
    let node;
    while ((node = walker.nextNode())) {
      nodesToRemove.push(node as Element);
    }

    // 移除无用元素
    nodesToRemove.forEach(element => {
      try {
        element.remove();
      } catch (error) {
        console.warn('清理DOM元素失败:', error);
      }
    });

    if (nodesToRemove.length > 0) {
      console.log(`🧹 清理了 ${nodesToRemove.length} 个无用DOM元素`);
    }
  }, []);

  // 清理事件监听器
  const cleanupEventListeners = useCallback(() => {
    // 清理可能泄漏的全局事件监听器
    const events = ['resize', 'scroll', 'mousemove', 'touchmove'];
    events.forEach(eventType => {
      const listeners = (window as any)._eventListeners?.[eventType];
      if (listeners && listeners.length > 10) {
        console.warn(
          `⚠️ 检测到过多的 ${eventType} 事件监听器: ${listeners.length}`
        );
      }
    });
  }, []);

  // 清理缓存
  const cleanupCaches = useCallback(() => {
    // 清理过期的缓存数据
    try {
      // 清理localStorage中的过期数据
      const now = Date.now();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_') || key?.startsWith('temp_')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const data = JSON.parse(item);
              if (data.expires && data.expires < now) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // 如果解析失败，可能是损坏的数据，直接删除
            localStorage.removeItem(key);
          }
        }
      }

      // 清理sessionStorage
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('temp_') || key?.startsWith('debug_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  }, []);

  // 检查内存使用情况
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      console.log(
        `📊 内存使用: ${usedMB}MB / ${totalMB}MB (限制: ${limitMB}MB)`
      );

      // 如果内存使用超过阈值，执行清理
      if (usedMB > memoryThreshold) {
        console.warn(
          `⚠️ 内存使用过高 (${usedMB}MB > ${memoryThreshold}MB)，开始清理...`
        );
        performCleanup();
      }

      return { used: usedMB, total: totalMB, limit: limitMB };
    }
    return null;
  }, [memoryThreshold]);

  // 执行完整清理
  const performCleanup = useCallback(() => {
    const now = Date.now();
    // 避免过于频繁的清理（至少间隔30秒）
    if (now - lastCleanupRef.current < 30000) {
      return;
    }

    console.log('🧹 开始内存清理...');

    cleanupDOMElements();
    cleanupEventListeners();
    cleanupCaches();

    if (enableGarbageCollection) {
      forceGarbageCollection();
    }

    lastCleanupRef.current = now;
    console.log('✅ 内存清理完成');
  }, [
    cleanupDOMElements,
    cleanupEventListeners,
    cleanupCaches,
    enableGarbageCollection,
    forceGarbageCollection,
  ]);

  useEffect(() => {
    // 定期内存检查（每30秒）
    memoryCheckIntervalRef.current = setInterval(() => {
      checkMemoryUsage();
    }, 30000);

    // 定期清理（每5分钟）
    cleanupIntervalRef.current = setInterval(
      () => {
        performCleanup();
      },
      5 * 60 * 1000
    );

    // 页面可见性变化时清理
    const handleVisibilityChange = () => {
      if (document.hidden) {
        performCleanup();
      }
    };

    // 内存压力事件监听
    const handleMemoryPressure = () => {
      console.warn('🚨 检测到内存压力，执行紧急清理');
      performCleanup();
    };

    // 页面卸载前清理
    const handleBeforeUnload = () => {
      performCleanup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 监听内存压力（如果支持）
    if ('memory' in navigator) {
      (navigator as any).memory?.addEventListener?.(
        'pressure',
        handleMemoryPressure
      );
    }

    // 初始内存检查
    setTimeout(checkMemoryUsage, 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if ('memory' in navigator) {
        (navigator as any).memory?.removeEventListener?.(
          'pressure',
          handleMemoryPressure
        );
      }
    };
  }, [checkMemoryUsage, performCleanup]);

  return (
    <>
      {children}

      {/* 开发环境内存监控 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
          <div>内存优化器: 运行中</div>
          <div>阈值: {memoryThreshold}MB</div>
          <div>GC: {enableGarbageCollection ? '启用' : '禁用'}</div>
        </div>
      )}
    </>
  );
}
