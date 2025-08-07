import { useState, useCallback, useEffect, useRef } from 'react';
import {
  apiClient,
  ConvertRequest,
  JobStatus,
  ValidationResponse,
  isRetryableError,
  getErrorMessage,
} from '../lib/api-client';
import { queryClient } from '../lib/query-client';

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
  queuePosition?: number;
  estimatedTimeRemaining?: number;

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
  forceRefresh: () => Promise<void>;
  checkHealth: () => Promise<boolean>;
}

const INITIAL_STATE: ConversionState = {
  url: '',
  urlError: null,
  isValidating: false,
  detectedPlatform: null,
  urlMetadata: null,
  format: 'mp3',
  quality: 'medium',
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
const POLLING_INTERVAL = 1000; // 1 second (更频繁的轮询)
const STUCK_PROGRESS_TIMEOUT = 15000; // 15 seconds (更快检测卡住)
const STUCK_PROGRESS_THRESHOLD = 75; // If progress > 75% and stuck, check for completion
const MAX_POLLING_ATTEMPTS = 300; // Maximum polling attempts (5 minutes at 1s intervals)
const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds (健康检查间隔)
const FORCE_REFRESH_THRESHOLD = 60000; // 1 minute (强制刷新阈值)

export function useConversion(): ConversionState & ConversionActions {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef<number>(Date.now());
  const stuckProgressCheckRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef<number>(0);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulPollRef = useRef<number>(Date.now());
  const forceRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (stuckProgressCheckRef.current) {
        clearTimeout(stuckProgressCheckRef.current);
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

      // Handle the actual API response format
      if (response.isValid && response.platform) {
        const platformName =
          typeof response.platform === 'string'
            ? response.platform
            : response.platform.name;

        setState(prev => ({
          ...prev,
          isValidating: false,
          detectedPlatform: platformName,
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

  // 健康检查函数
  const checkAPIHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (response.ok) {
        console.log('✅ API健康检查通过');
        return true;
      } else {
        console.warn('⚠️ API健康检查失败:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API健康检查错误:', error);
      return false;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      // Check if polling should continue
      if (!pollingRef.current) {
        console.log('🚫 Polling stopped, skipping status check for:', jobId);
        return;
      }

      // Check if we've exceeded maximum polling attempts
      pollingAttemptsRef.current += 1;
      if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
        console.log(`⏰ Maximum polling attempts reached for job: ${jobId}`);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setState(prev => ({
          ...prev,
          isConverting: false,
          error: 'Conversion timeout - please try again',
          canRetry: true,
        }));
        return;
      }

      // 检查是否需要强制刷新
      const timeSinceLastSuccess = Date.now() - lastSuccessfulPollRef.current;
      if (timeSinceLastSuccess > FORCE_REFRESH_THRESHOLD) {
        console.log('🔄 触发强制刷新 - 距离上次成功轮询已超过1分钟');
        try {
          const healthResponse = await fetch('/api/health', {
            headers: { 'Cache-Control': 'no-cache' },
          });
          const isHealthy = healthResponse.ok;

          if (!isHealthy) {
            console.warn('⚠️ API不健康，尝试恢复连接...');
            // 等待一段时间后重试
            setTimeout(() => pollJobStatus(jobId), 5000);
            return;
          }
        } catch (error) {
          console.error('❌ 健康检查失败:', error);
          setTimeout(() => pollJobStatus(jobId), 5000);
          return;
        }
      }

      console.log(
        `📡 Polling status for job: ${jobId} (attempt ${pollingAttemptsRef.current}/${MAX_POLLING_ATTEMPTS})`
      );

      // Add cache-busting parameter to prevent stale responses
      const timestamp = Date.now();
      const response = await fetch(`/api/status/${jobId}?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      const data = await response.json();
      console.log(`📊 Status response (cache-busted):`, data);

      // 更新最后成功轮询时间
      lastSuccessfulPollRef.current = Date.now();

      if (data.success) {
        // API returns flat structure, not nested under 'status'
        const jobStatus = {
          jobId: data.jobId,
          status: data.status,
          progress: data.progress,
          downloadUrl: data.downloadUrl,
          filename: data.filename,
          queuePosition: data.queuePosition,
          estimatedTimeRemaining: data.estimatedTimeRemaining,
          metadata: data.metadata,
          error: data.error,
        };

        console.log(
          `📈 Job ${jobId} status: ${jobStatus.status}, progress: ${jobStatus.progress}%`
        );

        if (jobStatus.status === 'completed') {
          console.log('🎉 Job completed! Stopping polling...');
          console.log(
            '🎯 Format:',
            state.format,
            'Platform:',
            state.detectedPlatform
          );
          console.log('pollingRef.current:', pollingRef.current);
          console.log('📁 Job status filename:', jobStatus.filename);
          console.log('📁 Job status downloadUrl:', jobStatus.downloadUrl);
          console.log('📊 Final progress value:', jobStatus.progress);

          // Stop polling FIRST
          if (pollingRef.current) {
            console.log('🛑 Clearing interval:', pollingRef.current);
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            console.log('✅ Polling stopped');
          } else {
            console.warn('⚠️ pollingRef.current is null, cannot stop polling');
          }

          // Invalidate React Query cache to prevent conflicts
          try {
            queryClient.invalidateQueries({
              queryKey: ['conversionStatus', jobId],
            });
            console.log('🗑️ Invalidated React Query cache for job:', jobId);
          } catch (error) {
            console.warn('Failed to invalidate React Query cache:', error);
          }

          // Clear stuck progress timer if it exists
          if (stuckProgressCheckRef.current) {
            console.log('🛑 Clearing stuck progress timer');
            clearTimeout(stuckProgressCheckRef.current);
            stuckProgressCheckRef.current = null;
          }

          // Update state with final completion data
          setState(prev => {
            console.log(
              '🔄 Setting completion state from:',
              prev.status,
              'to: completed'
            );
            console.log('🔄 Setting progress from:', prev.progress, 'to: 100');
            return {
              ...prev,
              progress: 100, // Force 100% for completed jobs regardless of reported progress
              status: 'completed',
              isConverting: false,
              result: {
                downloadUrl: jobStatus.downloadUrl,
                filename: jobStatus.filename, // Don't set fallback here, let ConversionResult handle it
                metadata: jobStatus.metadata,
              },
            };
          });
        } else if (jobStatus.status === 'failed') {
          console.log('❌ Job failed! Stopping polling...');

          // Stop polling
          if (pollingRef.current) {
            console.log(
              '🛑 Clearing interval for failed job:',
              pollingRef.current
            );
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setState(prev => ({
            ...prev,
            isConverting: false,
            error:
              typeof jobStatus.error === 'string'
                ? jobStatus.error
                : 'Conversion failed',
            canRetry: true,
          }));
        } else {
          // Update progress for non-completed jobs
          console.log(
            `🔄 Updating progress: ${jobStatus.progress}% (${jobStatus.status})`
          );
          console.log('🔍 jobStatus object:', jobStatus);
          console.log('🔍 jobStatus.progress type:', typeof jobStatus.progress);
          console.log('🔍 jobStatus.progress value:', jobStatus.progress);

          setState(prev => {
            console.log(`📊 Previous state:`, {
              progress: prev.progress,
              status: prev.status,
            });

            const progressValue =
              typeof jobStatus.progress === 'number' ? jobStatus.progress : 0;
            console.log('🔍 Calculated progress value:', progressValue);

            // Update last progress update time if progress actually changed
            if (progressValue !== prev.progress) {
              lastProgressUpdateRef.current = Date.now();
              console.log('⏰ Progress updated, resetting stuck timer');

              // Clear any existing stuck progress check
              if (stuckProgressCheckRef.current) {
                clearTimeout(stuckProgressCheckRef.current);
                stuckProgressCheckRef.current = null;
              }
            }

            // Set up stuck progress detection for high progress values
            if (
              progressValue > STUCK_PROGRESS_THRESHOLD &&
              progressValue < 100 &&
              !stuckProgressCheckRef.current
            ) {
              console.log(
                `⚠️ Setting up stuck progress detection for ${progressValue}%`
              );
              stuckProgressCheckRef.current = setTimeout(() => {
                console.log(
                  '🚨 Progress appears stuck, forcing completion check...'
                );
                pollJobStatus(jobId);
              }, STUCK_PROGRESS_TIMEOUT);
            }

            // Special handling for MP4 conversions at high progress
            if (
              state.format === 'mp4' &&
              progressValue >= 95 &&
              progressValue < 100
            ) {
              console.log(
                `🎬 MP4 conversion at ${progressValue}%, setting up completion check...`
              );
              setTimeout(() => {
                console.log('🔍 MP4 completion double-check...');
                pollJobStatus(jobId);
              }, 2000); // Check again in 2 seconds
            }

            const newState = {
              ...prev,
              progress: progressValue,
              status: jobStatus.status || 'processing',
              queuePosition: jobStatus.queuePosition,
              estimatedTimeRemaining: jobStatus.estimatedTimeRemaining,
            };
            console.log(`📈 New state:`, {
              progress: newState.progress,
              status: newState.status,
            });
            return newState;
          });
        }
      } else {
        // API error - check if it's a permanent error
        console.warn('Failed to get job status:', data.error);

        const errorObj = typeof data.error === 'object' ? data.error : null;
        if (
          errorObj?.type === 'VIDEO_NOT_FOUND' ||
          errorObj?.retryable === false
        ) {
          // Stop polling for permanent errors
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setState(prev => ({
            ...prev,
            isConverting: false,
            error:
              errorObj?.message ||
              (typeof data.error === 'string' ? data.error : 'Job not found'),
            canRetry: false,
          }));
        }
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
      // Map quality options to API values
      const getQualityValue = (quality: string, format: string): string => {
        if (format === 'mp3') {
          switch (quality) {
            case 'high':
              return '320'; // 高质量使用320k
            case 'medium':
              return '128'; // 中等质量使用128k (默认)
            case 'low':
              return '96'; // 低质量使用96k
            default:
              return '128';
          }
        } else {
          // mp4
          switch (quality) {
            case 'high':
              return '720';
            case 'medium':
              return '360';
            case 'low':
              return '360'; // Use 360 for low quality MP4
            default:
              return '360';
          }
        }
      };

      const request: ConvertRequest = {
        url: state.url,
        format: state.format,
        quality: getQualityValue(state.quality, state.format),
        platform: state.detectedPlatform,
      };

      console.log('Starting conversion with request:', request);
      const response = await apiClient.convert(request);
      console.log('Conversion response:', response);

      if (response.success && response.jobId) {
        console.log(
          '✅ Conversion started successfully, jobId:',
          response.jobId
        );

        setState(prev => ({
          ...prev,
          jobId: response.jobId!,
        }));

        // Reset polling attempts counter
        pollingAttemptsRef.current = 0;

        // Start polling for status
        console.log('🔄 Starting polling for job:', response.jobId);
        pollingRef.current = setInterval(() => {
          console.log('⏰ Polling job status for:', response.jobId);
          pollJobStatus(response.jobId!);
        }, POLLING_INTERVAL);

        // Initial status check
        console.log('🔍 Initial status check for:', response.jobId);
        await pollJobStatus(response.jobId);
      } else {
        const errorMessage = response.error
          ? getErrorMessage(response.error)
          : 'Failed to start conversion';

        console.error('Conversion failed:', errorMessage);

        setState(prev => ({
          ...prev,
          isConverting: false,
          error: errorMessage,
          canRetry: response.error ? isRetryableError(response.error) : true,
        }));
      }
    } catch (error) {
      console.error('Conversion error:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Network error during conversion';

      setState(prev => ({
        ...prev,
        isConverting: false,
        error: errorMessage,
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
      console.log('🧹 Cleaning up polling in reset');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up polling');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    };
  }, []);

  // 手动刷新状态
  const forceRefresh = useCallback(async () => {
    if (state.jobId) {
      console.log('🔄 手动强制刷新状态:', state.jobId);

      // 先检查API健康状态
      try {
        const healthResponse = await fetch('/api/health', {
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!healthResponse.ok) {
          console.warn('⚠️ API不健康，跳过状态刷新');
          return;
        }
      } catch (error) {
        console.error('❌ 健康检查失败:', error);
        return;
      }

      // 强制获取最新状态
      await pollJobStatus(state.jobId);
    }
  }, [state.jobId, pollJobStatus]);

  return {
    ...state,
    setUrl,
    setFormat,
    setQuality,
    validateUrl,
    startConversion,
    reset,
    retry,
    forceRefresh,
    checkHealth: checkAPIHealth,
  };
}
