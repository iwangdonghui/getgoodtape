import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, ValidationResponse } from '../lib/api-client';
import { RobustWebSocket, ConnectionState } from '../lib/robust-websocket';

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
  connectionState: ConnectionState;
  isConnected: boolean; // Legacy compatibility
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
  connectionState: {
    status: 'disconnected',
    reconnectAttempts: 0,
  },
  isConnected: false,
};

// Constants moved to RobustWebSocket configuration

export function useConversionWebSocket(): ConversionState & ConversionActions {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE);
  const robustWsRef = useRef<RobustWebSocket | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (robustWsRef.current) {
        robustWsRef.current.disconnect();
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
    // Don't connect if already connected
    if (robustWsRef.current?.isConnected()) {
      return;
    }

    try {
      const wsUrl =
        'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';

      console.log('🔌 Connecting to Workers WebSocket with RobustWebSocket:', wsUrl);

      // Create new RobustWebSocket instance
      const robustWs = new RobustWebSocket(wsUrl, {
        maxReconnectAttempts: 5,
        reconnectInterval: 1000,
        maxReconnectInterval: 30000,
        reconnectDecay: 1.5,
        heartbeatInterval: 30000,
        connectionTimeout: 10000,
        debug: true,
      });

      robustWsRef.current = robustWs;

      // Handle state changes
      robustWs.onStateChange((connectionState) => {
        setState(prev => ({
          ...prev,
          connectionState,
          isConnected: connectionState.status === 'connected',
        }));
      });

      // Handle all WebSocket messages
      robustWs.on('*', handleWebSocketMessage);

      // Handle specific message types for better logging
      robustWs.on('pong', (data) => {
        console.log('🏓 Pong received', data);
      });

      robustWs.on('conversion_progress', (data) => {
        handleWebSocketMessage(data);
      });

      robustWs.on('conversion_complete', (data) => {
        handleWebSocketMessage(data);
      });

      robustWs.on('conversion_error', (data) => {
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_attempt', (data) => {
        console.log('🔄 Recovery attempt:', data);
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_success', (data) => {
        console.log('✅ Recovery success:', data);
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_failure', (data) => {
        console.log('❌ Recovery failure:', data);
        handleWebSocketMessage(data);
      });

      // Start connection
      robustWs.connect();

    } catch (error) {
      console.error('Failed to create RobustWebSocket connection:', error);
      setState(prev => ({
        ...prev,
        connectionState: {
          status: 'failed',
          reconnectAttempts: 0,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
        isConnected: false
      }));
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
    if (robustWsRef.current?.isConnected()) {
      robustWsRef.current.send({
        type: 'start_conversion',
        payload: {
          url: state.url,
          format: state.format,
          quality: state.quality,
          platform: state.detectedPlatform,
        },
      });
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
          if (robustWsRef.current?.isConnected()) {
            robustWsRef.current.send({
              type: 'subscribe_job',
              payload: { jobId: response.jobId },
            });
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
