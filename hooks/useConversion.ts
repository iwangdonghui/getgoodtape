import { useState, useCallback, useEffect, useRef } from 'react';
import {
  apiClient,
  ConvertRequest,
  JobStatus,
  ValidationResponse,
  isRetryableError,
  getErrorMessage,
} from '../lib/api-client';

export interface ConversionState {
  // URL validation
  url: string;
  urlError: string | null;
  isValidating: boolean;
  detectedPlatform: string | null;
  urlMetadata: {
    title?: string;
    duration?: number;
    thumbnail?: string;
  } | null;

  // Conversion settings
  format: 'mp3' | 'mp4';
  quality: string;

  // Conversion process
  isConverting: boolean;
  jobId: string | null;
  progress: number;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

  // Results
  result: {
    downloadUrl?: string;
    filename?: string;
    metadata?: JobStatus['metadata'];
  } | null;
  error: string | null;

  // Retry logic
  retryCount: number;
  canRetry: boolean;
}

export interface ConversionActions {
  setUrl: (url: string) => void;
  setFormat: (format: 'mp3' | 'mp4') => void;
  setQuality: (quality: string) => void;
  validateUrl: () => Promise<void>;
  startConversion: () => Promise<void>;
  reset: () => void;
  retry: () => Promise<void>;
}

const INITIAL_STATE: ConversionState = {
  url: '',
  urlError: null,
  isValidating: false,
  detectedPlatform: null,
  urlMetadata: null,
  format: 'mp3',
  quality: 'high',
  isConverting: false,
  jobId: null,
  progress: 0,
  status: 'idle',
  result: null,
  error: null,
  retryCount: 0,
  canRetry: false,
};

const MAX_RETRIES = 3;
const POLLING_INTERVAL = 2000; // 2 seconds

export function useConversion(): ConversionState & ConversionActions {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const setUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      url,
      urlError: null,
      detectedPlatform: null,
      urlMetadata: null,
    }));

    // Clear previous validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Debounce URL validation
    if (url.trim()) {
      validationTimeoutRef.current = setTimeout(() => {
        validateUrlInternal(url);
      }, 500);
    }
  }, []);

  const validateUrlInternal = async (url: string) => {
    if (!url.trim()) return;

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const response = await apiClient.validateUrl(url);

      if (response.success && response.platform) {
        setState(prev => ({
          ...prev,
          isValidating: false,
          detectedPlatform: response.platform!,
          urlMetadata: response.metadata || null,
          urlError: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isValidating: false,
          detectedPlatform: null,
          urlMetadata: null,
          urlError: response.error
            ? getErrorMessage(response.error)
            : 'URL validation failed',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        detectedPlatform: null,
        urlMetadata: null,
        urlError: 'Network error during validation',
      }));
    }
  };

  const validateUrl = useCallback(async () => {
    await validateUrlInternal(state.url);
  }, [state.url]);

  const setFormat = useCallback((format: 'mp3' | 'mp4') => {
    setState(prev => ({ ...prev, format }));
  }, []);

  const setQuality = useCallback((quality: string) => {
    setState(prev => ({ ...prev, quality }));
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.getStatus(jobId);

      if (response.success && response.status) {
        const jobStatus = response.status;

        setState(prev => ({
          ...prev,
          progress: jobStatus.progress,
          status: jobStatus.status,
        }));

        if (jobStatus.status === 'completed') {
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setState(prev => ({
            ...prev,
            isConverting: false,
            result: {
              downloadUrl: jobStatus.downloadUrl,
              filename: `converted.${prev.format}`,
              metadata: jobStatus.metadata,
            },
          }));
        } else if (jobStatus.status === 'failed') {
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setState(prev => ({
            ...prev,
            isConverting: false,
            error: jobStatus.error || 'Conversion failed',
            canRetry: true,
          }));
        }
      } else {
        // API error, but keep polling for a while
        console.warn('Failed to get job status:', response.error);
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling on network errors
    }
  }, []);

  const startConversion = useCallback(async () => {
    if (!state.url.trim() || !state.detectedPlatform) {
      setState(prev => ({ ...prev, error: 'Please enter a valid URL' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isConverting: true,
      progress: 0,
      status: 'queued',
      result: null,
      error: null,
      canRetry: false,
    }));

    try {
      const request: ConvertRequest = {
        url: state.url,
        format: state.format,
        quality: state.quality,
        platform: state.detectedPlatform,
      };

      const response = await apiClient.convert(request);

      if (response.success && response.jobId) {
        setState(prev => ({
          ...prev,
          jobId: response.jobId!,
        }));

        // Start polling for status
        pollingRef.current = setInterval(() => {
          pollJobStatus(response.jobId!);
        }, POLLING_INTERVAL);

        // Initial status check
        await pollJobStatus(response.jobId);
      } else {
        setState(prev => ({
          ...prev,
          isConverting: false,
          error: response.error
            ? getErrorMessage(response.error)
            : 'Failed to start conversion',
          canRetry: response.error ? isRetryableError(response.error) : true,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConverting: false,
        error: 'Network error during conversion',
        canRetry: true,
      }));
    }
  }, [
    state.url,
    state.format,
    state.quality,
    state.detectedPlatform,
    pollJobStatus,
  ]);

  const retry = useCallback(async () => {
    if (state.retryCount >= MAX_RETRIES) {
      setState(prev => ({ ...prev, error: 'Maximum retry attempts reached' }));
      return;
    }

    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      error: null,
      canRetry: false,
    }));

    await startConversion();
  }, [state.retryCount, startConversion]);

  const reset = useCallback(() => {
    // Clear polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Clear validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }

    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    setUrl,
    setFormat,
    setQuality,
    validateUrl,
    startConversion,
    reset,
    retry,
  };
}
