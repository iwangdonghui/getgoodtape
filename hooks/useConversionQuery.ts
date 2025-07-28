import { useState, useCallback, useEffect } from 'react';
import { StatusResponse, ConvertResponse } from '../lib/api-client';
import {
  usePlatforms,
  useUrlValidation,
  useConversionStatus,
  useStartConversion,
  useOptimisticConversionUpdate,
  useErrorHandler,
} from './useQueries';

export interface ConversionState {
  // Form state
  url: string;
  format: 'mp3' | 'mp4';
  quality: string;

  // Validation state
  isValidating: boolean;
  isValidUrl: boolean;
  detectedPlatform: any;
  validationError: string | null;

  // Conversion state
  isConverting: boolean;
  jobId: string | null;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  result: any;

  // Retry state
  retryCount: number;
  canRetry: boolean;
  maxRetries: number;
}

export function useConversionQuery() {
  const [state, setState] = useState<ConversionState>({
    url: '',
    format: 'mp3',
    quality: 'medium',
    isValidating: false,
    isValidUrl: false,
    detectedPlatform: null,
    validationError: null,
    isConverting: false,
    jobId: null,
    status: 'idle',
    progress: 0,
    error: null,
    result: null,
    retryCount: 0,
    canRetry: true,
    maxRetries: 3,
  });

  // React Query hooks
  const { data: platforms, isLoading: platformsLoading } = usePlatforms();

  const {
    data: urlValidation,
    isLoading: urlValidating,
    error: urlValidationError,
    refetch: revalidateUrl,
  } = useUrlValidation(state.url, state.url.length > 10);

  // Temporarily disable conversion status polling until backend is fully configured
  const conversionStatus = null;
  const statusLoading = false;
  const statusError = null;

  const startConversionMutation = useStartConversion();
  const optimisticUpdate = useOptimisticConversionUpdate();
  const { handleError } = useErrorHandler();

  // Update validation state when URL validation changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isValidating: urlValidating,
      isValidUrl: !!urlValidation?.success,
      detectedPlatform: urlValidation?.platform,
      validationError: urlValidationError
        ? handleError(urlValidationError, 'URL validation')
        : null,
    }));
  }, [urlValidation, urlValidating, urlValidationError, handleError]);

  // Update conversion state when status changes (disabled until backend is configured)
  useEffect(() => {
    // TODO: Re-enable when backend is properly configured with real video processing
  }, [conversionStatus]);

  // Actions
  const setUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      url,
      isValidUrl: false,
      detectedPlatform: null,
      validationError: null,
    }));
  }, []);

  const setFormat = useCallback((format: 'mp3' | 'mp4') => {
    setState(prev => ({ ...prev, format }));
  }, []);

  const setQuality = useCallback((quality: string) => {
    setState(prev => ({ ...prev, quality }));
  }, []);

  const startConversion = useCallback(async () => {
    if (!state.isValidUrl || !state.url) {
      setState(prev => ({
        ...prev,
        error: '请输入有效的视频链接',
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isConverting: true,
        status: 'queued',
        progress: 0,
        error: null,
        result: null,
      }));

      const result: ConvertResponse = await startConversionMutation.mutateAsync(
        {
          url: state.url,
          format: state.format,
          quality: state.quality,
        }
      );

      setState(prev => ({
        ...prev,
        jobId: result.jobId || null,
        status: 'queued',
      }));

      // Optimistic update
      if (result.jobId) {
        optimisticUpdate.updateStatus(result.jobId, 'queued');
      }
    } catch (error: any) {
      const errorMessage = handleError(error, 'Start conversion');
      setState(prev => ({
        ...prev,
        isConverting: false,
        status: 'failed',
        error: errorMessage,
        retryCount: prev.retryCount + 1,
        canRetry: prev.retryCount < prev.maxRetries - 1,
      }));
    }
  }, [
    state.isValidUrl,
    state.url,
    state.format,
    state.quality,
    startConversionMutation,
    optimisticUpdate,
    handleError,
  ]);

  const retry = useCallback(async () => {
    if (!state.canRetry) return;

    setState(prev => ({
      ...prev,
      error: null,
      status: 'idle',
      isConverting: false,
    }));

    // Wait a bit before retrying
    setTimeout(() => {
      startConversion();
    }, 1000);
  }, [state.canRetry, startConversion]);

  const reset = useCallback(() => {
    setState({
      url: '',
      format: 'mp3',
      quality: 'medium',
      isValidating: false,
      isValidUrl: false,
      detectedPlatform: null,
      validationError: null,
      isConverting: false,
      jobId: null,
      status: 'idle',
      progress: 0,
      error: null,
      result: null,
      retryCount: 0,
      canRetry: true,
      maxRetries: 3,
    });
  }, []);

  const revalidate = useCallback(() => {
    if (state.url) {
      revalidateUrl();
    }
  }, [state.url, revalidateUrl]);

  // Get available quality options for current format and platform
  const getQualityOptions = useCallback(() => {
    if (!state.detectedPlatform) return [];

    const qualityOptions =
      state.detectedPlatform.qualityOptions?.[state.format] || [];
    return qualityOptions.map((option: string) => ({
      value: option,
      label: getQualityLabel(option, state.format),
    }));
  }, [state.detectedPlatform, state.format]);

  // Helper function to get quality labels
  const getQualityLabel = (quality: string, format: string) => {
    if (format === 'mp3') {
      const labels: Record<string, string> = {
        '128': '128 kbps (标准)',
        '192': '192 kbps (高质量)',
        '320': '320 kbps (最高质量)',
      };
      return labels[quality] || `${quality} kbps`;
    } else {
      const labels: Record<string, string> = {
        '360': '360p (标清)',
        '720': '720p (高清)',
        '1080': '1080p (全高清)',
      };
      return labels[quality] || `${quality}p`;
    }
  };

  return {
    // State
    ...state,
    platforms,
    platformsLoading,

    // Computed state
    isLoading: platformsLoading || urlValidating || statusLoading,
    qualityOptions: getQualityOptions(),

    // Actions
    setUrl,
    setFormat,
    setQuality,
    startConversion,
    retry,
    reset,
    revalidate,

    // Mutation states
    isStartingConversion: startConversionMutation.isPending,
    startConversionError: startConversionMutation.error,
  };
}
