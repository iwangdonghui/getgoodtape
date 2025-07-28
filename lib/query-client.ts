import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for our use case
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Exponential backoff for retries
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect for cached data
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Exponential backoff for mutation retries
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  platforms: ['platforms'] as const,
  urlValidation: (url: string) => ['url-validation', url] as const,
  conversionStatus: (jobId: string) => ['conversion-status', jobId] as const,
  conversionHistory: ['conversion-history'] as const,
} as const;

// Cache management utilities
export const cacheUtils = {
  // Invalidate all platform-related queries
  invalidatePlatforms: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
  },

  // Invalidate URL validation for a specific URL
  invalidateUrlValidation: (url: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.urlValidation(url) });
  },

  // Invalidate conversion status for a specific job
  invalidateConversionStatus: (jobId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.conversionStatus(jobId),
    });
  },

  // Remove conversion status from cache (when job is complete)
  removeConversionStatus: (jobId: string) => {
    queryClient.removeQueries({ queryKey: queryKeys.conversionStatus(jobId) });
  },

  // Clear all cached data
  clearAll: () => {
    queryClient.clear();
  },

  // Prefetch platforms data
  prefetchPlatforms: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.platforms,
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  },

  // Set conversion status data manually (for optimistic updates)
  setConversionStatus: (jobId: string, data: any) => {
    queryClient.setQueryData(queryKeys.conversionStatus(jobId), data);
  },

  // Get cached conversion status
  getConversionStatus: (jobId: string) => {
    return queryClient.getQueryData(queryKeys.conversionStatus(jobId));
  },
};

// Error handling utilities
export const errorUtils = {
  // Check if error is a network error
  isNetworkError: (error: any): boolean => {
    return (
      error?.name === 'NetworkError' ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('network') ||
      !error?.status
    );
  },

  // Check if error is a client error (4xx)
  isClientError: (error: any): boolean => {
    return error?.status >= 400 && error?.status < 500;
  },

  // Check if error is a server error (5xx)
  isServerError: (error: any): boolean => {
    return error?.status >= 500 && error?.status < 600;
  },

  // Get user-friendly error message
  getUserFriendlyMessage: (error: any): string => {
    if (errorUtils.isNetworkError(error)) {
      return '网络连接失败，请检查您的网络连接';
    }

    if (error?.status === 404) {
      return '请求的资源未找到';
    }

    if (error?.status === 429) {
      return '请求过于频繁，请稍后重试';
    }

    if (errorUtils.isClientError(error)) {
      return error?.message || '请求参数错误';
    }

    if (errorUtils.isServerError(error)) {
      return '服务器暂时不可用，请稍后重试';
    }

    return error?.message || '发生未知错误，请重试';
  },
};

// Performance monitoring
export const performanceUtils = {
  // Log query performance
  logQueryPerformance: (queryKey: string, duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${queryKey} took ${duration}ms`);
    }
  },

  // Log mutation performance
  logMutationPerformance: (mutationKey: string, duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Mutation ${mutationKey} took ${duration}ms`);
    }
  },
};
