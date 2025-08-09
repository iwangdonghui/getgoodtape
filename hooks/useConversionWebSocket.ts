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

  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('📨 WebSocket message received:', message);
    const { type, payload } = message;

    switch (type) {
      case 'conversion_started':
        setState(prev => ({
          ...prev,
          jobId: payload.jobId,
          status: payload.status,
          progress: payload.progress,
          error: null,
        }));
        break;

      case 'conversion_progress':
      case 'progress_update':
        setState(prev => ({
          ...prev,
          progress: payload.progress,
          status: payload.status,
        }));
        break;

      case 'conversion_complete':
      case 'conversion_completed':
        setState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          result: {
            downloadUrl: payload.downloadUrl,
            filename: payload.filename,
            fileSize: payload.fileSize,
          },
        }));
        break;

      case 'conversion_error':
      case 'conversion_failed':
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: payload.error || payload.message,
        }));
        break;

      case 'recovery_attempt':
        console.log('🔄 Recovery attempt:', payload.message);
        setState(prev => ({
          ...prev,
          status: 'processing',
          error: null,
        }));
        break;

      case 'recovery_success':
        console.log('✅ Recovery success:', payload.message);
        setState(prev => ({
          ...prev,
          status: 'processing',
          error: null,
        }));
        break;

      case 'recovery_failure':
        console.log('❌ Recovery failure:', payload.message);
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: payload.message || 'Recovery failed',
        }));
        break;

      // 🐛 FIX: Handle new connection management message types
      case 'connection_recovery':
        console.log('🔄 Connection recovery suggested:', payload.message);
        // Could trigger a UI notification here
        break;

      case 'connection_test':
        // Respond to connection test
        if (robustWsRef.current?.isConnected()) {
          robustWsRef.current.send({
            type: 'connection_test_response',
            timestamp: Date.now(),
            jobId: payload.jobId,
          });
        }
        break;

      case 'server_shutdown':
        console.log('🔄 Server shutdown notification:', payload.message);
        setState(prev => ({
          ...prev,
          error: 'Server is restarting, please refresh the page',
        }));
        break;

      case 'pong':
        // Handle pong response (already handled by RobustWebSocket)
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          error: payload.error,
        }));
        break;

      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }, []);

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
      // Determine WebSocket URL based on environment
      const isProduction =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'getgoodtape.com' ||
          window.location.hostname === 'www.getgoodtape.com');

      const wsUrl = isProduction
        ? 'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws'
        : 'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';

      console.log(
        '🔌 Connecting to Workers WebSocket with RobustWebSocket:',
        wsUrl
      );
      console.log(
        '🌍 Environment:',
        isProduction ? 'production' : 'development'
      );

      // Create new RobustWebSocket instance with enhanced configuration
      const robustWs = new RobustWebSocket(wsUrl, {
        maxReconnectAttempts: 8, // Increased attempts
        reconnectInterval: 2000, // Longer initial interval
        maxReconnectInterval: 60000, // Longer max interval
        reconnectDecay: 1.3, // Slower decay
        heartbeatInterval: 25000, // More frequent heartbeat
        connectionTimeout: 15000, // Longer timeout
        debug: true,
      });

      robustWsRef.current = robustWs;

      // Handle state changes with detailed logging
      robustWs.onStateChange(connectionState => {
        console.log('🔄 WebSocket state change:', connectionState);

        // Log specific state transitions
        if (connectionState.status === 'connected') {
          console.log('✅ WebSocket connected successfully');
        } else if (connectionState.status === 'disconnected') {
          console.log('❌ WebSocket disconnected');
        } else if (connectionState.status === 'reconnecting') {
          console.log(
            `🔄 WebSocket reconnecting (attempt ${connectionState.reconnectAttempts})`
          );
        } else if (connectionState.status === 'failed') {
          console.log(
            '💥 WebSocket connection failed:',
            connectionState.lastError
          );
        }

        setState(prev => ({
          ...prev,
          connectionState,
          isConnected: connectionState.status === 'connected',
        }));
      });

      // Handle all WebSocket messages
      robustWs.on('*', handleWebSocketMessage);

      // Handle specific message types for better logging
      robustWs.on('pong', data => {
        console.log('🏓 Pong received', data);
      });

      robustWs.on('conversion_progress', data => {
        handleWebSocketMessage(data);
      });

      robustWs.on('conversion_complete', data => {
        handleWebSocketMessage(data);
      });

      robustWs.on('conversion_error', data => {
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_attempt', data => {
        console.log('🔄 Recovery attempt:', data);
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_success', data => {
        console.log('✅ Recovery success:', data);
        handleWebSocketMessage(data);
      });

      robustWs.on('recovery_failure', data => {
        console.log('❌ Recovery failure:', data);
        handleWebSocketMessage(data);
      });

      // Start connection
      robustWs.connect();
    } catch (error) {
      console.error('Failed to create RobustWebSocket connection:', error);

      // Enhanced error reporting
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide specific guidance for common errors
        if (error.message.includes('SecurityError')) {
          errorMessage = 'Security error - check CORS/HTTPS settings';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network error - check firewall/proxy settings';
        } else if (error.message.includes('InvalidStateError')) {
          errorMessage = 'Invalid state - WebSocket not supported';
        }
      }

      setState(prev => ({
        ...prev,
        connectionState: {
          status: 'failed',
          reconnectAttempts: 0,
          lastError: errorMessage,
        },
        isConnected: false,
      }));
    }
  }, [handleWebSocketMessage]);

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
    if (robustWsRef.current) {
      robustWsRef.current.disconnect();
      robustWsRef.current = null;
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
