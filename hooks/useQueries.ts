import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  StatusResponse,
  PlatformsResponse,
  ValidationResponse,
} from '../lib/api-client';
import { queryKeys, cacheUtils, errorUtils } from '../lib/query-client';

// Platform queries
export function usePlatforms() {
  return useQuery({
    queryKey: queryKeys.platforms,
    queryFn: () => apiClient.getPlatforms(),
    staleTime: 10 * 60 * 1000, // 10 minutes - platforms don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    meta: {
      errorMessage: '获取平台信息失败',
    },
  });
}

// URL validation queries
export function useUrlValidation(url: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.urlValidation(url),
    queryFn: () => apiClient.validateUrl(url),
    enabled: enabled && !!url && url.length > 10,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry validation errors
      if (errorUtils.isClientError(error)) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: 'URL验证失败',
    },
  });
}

// Conversion status queries with polling
export function useConversionStatus(
  jobId: string | null,
  options: {
    enabled?: boolean;
    pollInterval?: number;
    onSuccess?: (data: StatusResponse) => void;
    onError?: (error: any) => void;
  } = {}
) {
  const {
    enabled = true,
    pollInterval = 2000, // 2 seconds
    onSuccess,
    onError,
  } = options;

  return useQuery({
    queryKey: queryKeys.conversionStatus(jobId || ''),
    queryFn: () => apiClient.getStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: query => {
      // Stop polling if conversion is complete or failed
      const data = query.state.data as StatusResponse | undefined;
      if (
        data?.status?.status === 'completed' ||
        data?.status?.status === 'failed'
      ) {
        return false;
      }
      return pollInterval;
    },
    staleTime: 0, // Always fresh for real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if job not found
      if (error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    meta: {
      errorMessage: '获取转换状态失败',
    },
  });
}

// Conversion mutations
export function useStartConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      url: string;
      format: 'mp3' | 'mp4';
      quality: string;
    }) => apiClient.convert(request),
    onSuccess: (data, variables) => {
      // Invalidate URL validation cache for this URL
      cacheUtils.invalidateUrlValidation(variables.url);

      // Prefetch status for the new job
      if (data.jobId) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.conversionStatus(data.jobId),
          queryFn: () => apiClient.getStatus(data.jobId!),
        });
      }
    },
    onError: error => {
      console.error('Conversion start failed:', error);
    },
    meta: {
      errorMessage: '启动转换失败',
    },
  });
}

// Optimistic updates for conversion status
export function useOptimisticConversionUpdate() {
  const queryClient = useQueryClient();

  return {
    updateProgress: (jobId: string, progress: number, status?: string) => {
      queryClient.setQueryData(
        queryKeys.conversionStatus(jobId),
        (oldData: any) => ({
          ...oldData,
          progress,
          status: status || oldData?.status,
          lastUpdated: new Date().toISOString(),
        })
      );
    },

    updateStatus: (jobId: string, status: string, additionalData?: any) => {
      queryClient.setQueryData(
        queryKeys.conversionStatus(jobId),
        (oldData: any) => ({
          ...oldData,
          status,
          ...additionalData,
          lastUpdated: new Date().toISOString(),
        })
      );
    },

    markComplete: (jobId: string, result: any) => {
      queryClient.setQueryData(
        queryKeys.conversionStatus(jobId),
        (oldData: any) => ({
          ...oldData,
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date().toISOString(),
        })
      );
    },

    markFailed: (jobId: string, error: string) => {
      queryClient.setQueryData(
        queryKeys.conversionStatus(jobId),
        (oldData: any) => ({
          ...oldData,
          status: 'failed',
          error,
          failedAt: new Date().toISOString(),
        })
      );
    },
  };
}

// Background sync for offline support
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  return {
    syncWhenOnline: () => {
      // Refetch all active queries when coming back online
      queryClient.refetchQueries({
        type: 'active',
      });
    },

    syncConversionStatus: (jobId: string) => {
      // Force refetch specific conversion status
      queryClient.refetchQueries({
        queryKey: queryKeys.conversionStatus(jobId),
      });
    },

    prefetchCriticalData: () => {
      // Prefetch platforms data
      cacheUtils.prefetchPlatforms();
    },
  };
}

// Cache management hooks
export function useCacheManagement() {
  return {
    clearCache: cacheUtils.clearAll,
    invalidatePlatforms: cacheUtils.invalidatePlatforms,
    invalidateUrlValidation: cacheUtils.invalidateUrlValidation,
    invalidateConversionStatus: cacheUtils.invalidateConversionStatus,
    removeConversionStatus: cacheUtils.removeConversionStatus,
  };
}

// Error handling hook
export function useErrorHandler() {
  return {
    handleError: (error: any, context?: string) => {
      const message = errorUtils.getUserFriendlyMessage(error);
      console.error(`Error in ${context || 'unknown context'}:`, error);

      // You can integrate with toast notifications here
      // toast.error(message);

      return message;
    },

    isRetryableError: (error: any) => {
      return !errorUtils.isClientError(error);
    },
  };
}
