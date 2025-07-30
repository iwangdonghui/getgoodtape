'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// 懒加载组件的加载指示器
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-orange"></div>
    <span className="ml-3 text-deep-brown/70">加载中...</span>
  </div>
);

// 懒加载转换进度组件
export const LazyConversionProgress = dynamic(
  () => import('./ConversionProgress'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // 客户端渲染，避免服务端渲染开销
  }
);

// 懒加载转换结果组件
export const LazyConversionResult = dynamic(
  () => import('./ConversionResult'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// 懒加载转换错误组件
export const LazyConversionError = dynamic(() => import('./ConversionError'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

// 懒加载平台图标组件
export const LazyPlatformIcons = dynamic(
  () => import('./PlatformIcons').then(mod => ({ default: mod.PlatformIcons })),
  {
    loading: () => (
      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
    ),
    ssr: false,
  }
);

// 高阶组件：为任何组件添加懒加载功能
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  options?: {
    loading?: () => JSX.Element;
    ssr?: boolean;
  }
) {
  return dynamic(() => Promise.resolve(Component), {
    loading: options?.loading || (() => <LoadingSpinner />),
    ssr: options?.ssr ?? true,
  });
}

// 预加载函数：在用户交互前预加载组件
export const preloadComponents = {
  conversionProgress: () => import('./ConversionProgress'),
  conversionResult: () => import('./ConversionResult'),
  conversionError: () => import('./ConversionError'),
  platformIcons: () => import('./PlatformIcons'),
};

// 智能预加载：根据用户行为预加载相关组件
export const smartPreload = {
  // 当用户开始输入URL时预加载转换相关组件
  onUrlInput: () => {
    preloadComponents.conversionProgress();
    preloadComponents.conversionResult();
    preloadComponents.conversionError();
  },

  // 当检测到平台时预加载图标组件
  onPlatformDetected: () => {
    preloadComponents.platformIcons();
  },

  // 当开始转换时预加载结果组件
  onConversionStart: () => {
    preloadComponents.conversionResult();
    preloadComponents.conversionError();
  },
};
