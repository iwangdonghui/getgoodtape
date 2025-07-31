'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading indicator for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-orange"></div>
    <span className="ml-3 text-deep-brown/70">Loading...</span>
  </div>
);

// Lazy-loaded conversion progress component
export const LazyConversionProgress = dynamic(
  () => import('./ConversionProgress'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Client-side rendering to avoid server-side rendering overhead
  }
);

// Lazy-loaded conversion result component
export const LazyConversionResult = dynamic(
  () => import('./ConversionResult'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy-loaded conversion error component
export const LazyConversionError = dynamic(() => import('./ConversionError'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

// Lazy-loaded platform icons component
export const LazyPlatformIcons = dynamic(
  () => import('./PlatformIcons').then(mod => ({ default: mod.PlatformIcons })),
  {
    loading: () => (
      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
    ),
    ssr: false,
  }
);

// Higher-order component: add lazy loading functionality to any component
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

// Preload functions: preload components before user interaction
export const preloadComponents = {
  conversionProgress: () => import('./ConversionProgress'),
  conversionResult: () => import('./ConversionResult'),
  conversionError: () => import('./ConversionError'),
  platformIcons: () => import('./PlatformIcons'),
};

// Smart preloading: preload related components based on user behavior
export const smartPreload = {
  // Preload conversion-related components when user starts typing URL
  onUrlInput: () => {
    preloadComponents.conversionProgress();
    preloadComponents.conversionResult();
    preloadComponents.conversionError();
  },

  // Preload icon components when platform is detected
  onPlatformDetected: () => {
    preloadComponents.platformIcons();
  },

  // Preload result components when conversion starts
  onConversionStart: () => {
    preloadComponents.conversionResult();
    preloadComponents.conversionError();
  },
};
