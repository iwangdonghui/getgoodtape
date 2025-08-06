import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, ValidationResponse } from '../lib/api-client';

interface ConversionState {
  // URL validation
  url: string;
  urlError: string | null;
  detectedPlatform: string | null;
  urlMetadata: any;

  // Conversion settings
  format: 'mp3' | 'mp4';
  quality: string;

  // Conversion process
  isConverting: boolean;
  jobId: string | null;
  progress: number;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  currentStep?: string;
  queuePosition?: number;
  estimatedTimeRemaining?: number;

  // Results
  result: {
    downloadUrl?: string;
    filename?: string;
    metadata?: any;
  } | null;
  error: string | null;

  // WebSocket connection
  isConnected: boolean;
}

interface ConversionActions {
  setUrl: (url: string) => void;
  setFormat: (format: 'mp3' | 'mp4') => void;
  setQuality: (quality: string) => void;
  startConversion: () => Promise<void>;
  reset: () => void;
  retry: () => Promise<void>;
}

const INITIAL_STATE: ConversionState = {
  url: '',
  urlError: null,
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
  isConnected: false,
};

const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
const WS_MAX_RECONNECT_ATTEMPTS = 5;

export function useConversionWebSocket(): ConversionState & ConversionActions {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // URL validation effect
  useEffect(() => {
    if (!state.url.trim()) {
      setState(prev => ({
        ...prev,
        urlError: null,
        detectedPlatform: null,
        urlMetadata: null,
      }));
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await apiClient.validateUrl(state.url);
        setState(prev => ({
          ...prev,
          urlError: result.error?.message || null,
          detectedPlatform:
            typeof result.platform === 'string'
              ? result.platform
              : result.platform?.name || null,
          urlMetadata: result.metadata || null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          urlError: 'Failed to validate URL',
          detectedPlatform: null,
          urlMetadata: null,
        }));
      }
    }, 500);
  }, [state.url]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws`;

      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true }));
        reconnectAttemptsRef.current = 0;

        // Send ping to keep connection alive
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = event => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));
        wsRef.current = null;

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current++;
          console.log(
            `🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${WS_MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, WS_RECONNECT_INTERVAL);
        }
      };

      ws.onerror = error => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, isConnected: false }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  const handleWebSocketMessage = useCallback((message: any) => {
    const { type, payload } = message;

    switch (type) {
      case 'conversion_started':
        setState(prev => ({
          ...prev,
          jobId: payload.jobId,
          status: payload.status,
          progress: payload.progress,
          isConverting: true,
          error: null,
        }));
        break;

      case 'progress_update':
        setState(prev => ({
          ...prev,
          progress: payload.progress,
          status: payload.status,
          currentStep: payload.currentStep,
          queuePosition: payload.queuePosition,
          estimatedTimeRemaining: payload.estimatedTimeRemaining,
        }));
        break;

      case 'conversion_completed':
        setState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          isConverting: false,
          result: {
            downloadUrl: payload.downloadUrl,
            filename: payload.filename,
            metadata: payload.metadata,
          },
        }));
        break;

      case 'conversion_failed':
        setState(prev => ({
          ...prev,
          status: 'failed',
          isConverting: false,
          error: payload.error,
        }));
        break;

      case 'job_status':
        setState(prev => ({
          ...prev,
          jobId: payload.jobId,
          status: payload.status,
          progress: payload.progress,
          result: payload.downloadUrl
            ? {
                downloadUrl: payload.downloadUrl,
                filename: payload.filename,
                metadata: payload.metadata,
              }
            : null,
          isConverting:
            payload.status === 'processing' || payload.status === 'queued',
        }));
        break;

      case 'pong':
        // Keep-alive response
        break;

      case 'error':
        console.error('WebSocket error:', payload.error);
        setState(prev => ({
          ...prev,
          error: payload.error,
        }));
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }, []);

  const setUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, url }));
  }, []);

  const setFormat = useCallback((format: 'mp3' | 'mp4') => {
    setState(prev => ({ ...prev, format }));
  }, []);

  const setQuality = useCallback((quality: string) => {
    setState(prev => ({ ...prev, quality }));
  }, []);

  const startConversion = useCallback(async () => {
    if (!state.url.trim() || !state.detectedPlatform) {
      setState(prev => ({ ...prev, error: 'Please enter a valid URL' }));
      return;
    }

    // Connect WebSocket if not connected
    if (!state.isConnected) {
      connectWebSocket();
      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Send conversion request via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'start_conversion',
          payload: {
            url: state.url,
            format: state.format,
            quality: state.quality,
            platform: state.detectedPlatform,
          },
        })
      );
    } else {
      // Fallback to HTTP API if WebSocket is not available
      console.warn('WebSocket not available, falling back to HTTP API');
      try {
        const response = await apiClient.convert({
          url: state.url,
          format: state.format,
          quality: state.quality,
        });

        if (response.success && response.jobId) {
          setState(prev => ({
            ...prev,
            jobId: response.jobId || null,
            status: 'queued',
            progress: 0,
            isConverting: true,
            error: null,
          }));

          // Subscribe to job updates via WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'subscribe_job',
                payload: { jobId: response.jobId },
              })
            );
          }
        } else {
          setState(prev => ({
            ...prev,
            error:
              typeof response.error === 'string'
                ? response.error
                : response.error?.message || 'Failed to start conversion',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Network error occurred',
        }));
      }
    }
  }, [
    state.url,
    state.format,
    state.quality,
    state.detectedPlatform,
    state.isConnected,
    connectWebSocket,
  ]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const retry = useCallback(async () => {
    setState(prev => ({
      ...prev,
      error: null,
      status: 'idle',
      progress: 0,
      isConverting: false,
    }));
    await startConversion();
  }, [startConversion]);

  return {
    ...state,
    setUrl,
    setFormat,
    setQuality,
    startConversion,
    reset,
    retry,
  };
}
