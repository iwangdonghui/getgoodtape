import { Context } from 'hono';
import { Env } from '../types';

/**
 * Check if origin is allowed for WebSocket connections
 */
function isOriginAllowed(origin: string): boolean {
  const allowedPatterns = [
    'https://getgoodtape.com',
    'https://www.getgoodtape.com',
    'http://localhost:3000',
    'http://localhost:8787',
    /^https:\/\/getgoodtape-.*\.vercel\.app$/,
  ];

  return allowedPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return pattern === origin;
    } else {
      return pattern.test(origin);
    }
  });
}

import { ConversionService } from '../utils/conversion-service';
import { JobManager } from '../utils/job-manager';

interface WebSocketConnection {
  websocket: WebSocket;
  jobId: string;
  userId?: string;
}

interface ConnectionHealth {
  lastPing: number;
  lastPong: number;
  pingCount: number;
  isHealthy: boolean;
  connectionId: string;
}

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocketConnection>();
const connectionHealth = new Map<WebSocket, ConnectionHealth>();

export class WebSocketManager {
  private env: Env;
  private conversionService: ConversionService;
  private jobManager: JobManager;
  private connections = new Map<string, WebSocket>();
  private jobSubscriptions = new Map<string, Set<WebSocket>>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly PING_TIMEOUT = 30000; // 30 seconds

  constructor(env: Env) {
    this.env = env;
    this.conversionService = new ConversionService(env);
    this.jobManager = new JobManager(env);
    this.startHealthCheck();
  }

  /**
   * Handle WebSocket upgrade request
   */
  async handleUpgrade(c: Context): Promise<Response> {
    try {
      const upgradeHeader = c.req.header('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return c.json({ error: 'Expected Upgrade: websocket' }, 426);
      }

      // Get origin for CORS validation
      const origin = c.req.header('Origin');
      console.log('WebSocket upgrade request from origin:', origin);

      // Validate origin for security
      if (origin && !isOriginAllowed(origin)) {
        console.warn('WebSocket connection rejected - invalid origin:', origin);
        return c.json({ error: 'Origin not allowed' }, 403);
      }

      // Create WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());

      // Accept the WebSocket connection
      server.accept();

      // Set up event handlers
      this.setupWebSocketHandlers(server);

      // Return the client WebSocket to the browser with proper headers
      const headers: Record<string, string> = {};

      if (origin && isOriginAllowed(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers,
      });
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      return c.json({ error: 'WebSocket upgrade failed' }, 500);
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocketHandlers(websocket: WebSocket) {
    // Generate unique connection ID for tracking
    const connectionId = this.generateConnectionId();

    websocket.addEventListener('message', async event => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(websocket, data);
      } catch (error) {
        console.error(`WebSocket message error [${connectionId}]:`, error);
        this.sendError(websocket, 'Invalid message format');

        // Log error details for debugging
        this.logConnectionError(
          connectionId,
          'MESSAGE_PARSE_ERROR',
          error as Error
        );
      }
    });

    websocket.addEventListener('close', event => {
      console.log(
        `WebSocket closed [${connectionId}]:`,
        event.code,
        event.reason
      );

      // Log close reason for analysis
      this.logConnectionClose(connectionId, event.code, event.reason);

      // Clean up resources
      this.removeConnection(websocket);
      this.cleanupConnectionResources(websocket, connectionId);
    });

    websocket.addEventListener('error', event => {
      console.error(`WebSocket error [${connectionId}]:`, event);

      // Log error details
      this.logConnectionError(
        connectionId,
        'WEBSOCKET_ERROR',
        new Error('WebSocket error occurred')
      );

      // Clean up resources
      this.removeConnection(websocket);
      this.cleanupConnectionResources(websocket, connectionId);
    });

    // Store connection ID for tracking
    (websocket as any).__connectionId = connectionId;

    // Initialize connection health tracking
    connectionHealth.set(websocket, {
      lastPing: 0,
      lastPong: Date.now(),
      pingCount: 0,
      isHealthy: true,
      connectionId,
    });

    console.log(`WebSocket connection established [${connectionId}]`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(websocket: WebSocket, data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'start_conversion':
        await this.handleStartConversion(websocket, payload);
        break;

      case 'subscribe_job':
        await this.handleSubscribeJob(websocket, payload);
        break;

      case 'ping':
        // Respond to ping with pong and include server timestamp
        this.sendMessage(websocket, {
          type: 'pong',
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          clientTimestamp: payload?.timestamp, // Echo back client timestamp for latency calculation
        });

        // Update connection health
        this.updateConnectionHealth(websocket);
        break;

      default:
        this.sendError(websocket, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle conversion start request
   */
  private async handleStartConversion(websocket: WebSocket, payload: any) {
    try {
      const { url, format, quality, platform } = payload;

      // Validate request
      if (!url || !format || !quality) {
        this.sendError(
          websocket,
          'Missing required fields: url, format, quality'
        );
        return;
      }

      // Start conversion
      const jobId = await this.conversionService.startConversion({
        url,
        format: format as 'mp3' | 'mp4',
        quality,
        platform,
      });

      // Store connection with jobId
      activeConnections.set(jobId, {
        websocket,
        jobId,
        userId: payload.userId,
      });

      // Send initial response
      this.sendMessage(websocket, {
        type: 'conversion_started',
        payload: {
          jobId,
          status: 'queued',
          progress: 0,
        },
      });

      // Start processing (this will trigger progress updates)
      this.processConversionWithUpdates(jobId, { url, format, quality });
    } catch (error) {
      console.error('Start conversion error:', error);
      this.sendError(websocket, 'Failed to start conversion');
    }
  }

  /**
   * Handle job subscription request
   */
  private async handleSubscribeJob(websocket: WebSocket, payload: any) {
    try {
      const { jobId } = payload;

      if (!jobId) {
        this.sendError(websocket, 'Missing jobId');
        return;
      }

      // Get current job status
      const job = await this.jobManager.getJob(jobId);
      if (!job) {
        this.sendError(websocket, 'Job not found');
        return;
      }

      // Store connection
      activeConnections.set(jobId, {
        websocket,
        jobId,
        userId: payload.userId,
      });

      // Send current status
      this.sendMessage(websocket, {
        type: 'job_status',
        payload: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          downloadUrl: job.download_url,
          filename: job.file_path ? job.file_path.split('/').pop() : undefined,
          metadata: job.metadata ? JSON.parse(job.metadata) : undefined,
        },
      });
    } catch (error) {
      console.error('Subscribe job error:', error);
      this.sendError(websocket, 'Failed to subscribe to job');
    }
  }

  /**
   * Process conversion with real-time updates
   */
  private async processConversionWithUpdates(jobId: string, request: any) {
    try {
      // This will be called by the queue processor
      // We'll modify ConversionService to send updates via WebSocket
      await this.conversionService.processConversion(jobId, request);
    } catch (error) {
      console.error('Conversion processing error:', error);
      this.broadcastToJob(jobId, {
        type: 'conversion_failed',
        payload: {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Broadcast message to all connections for a specific job
   */
  broadcastToJob(jobId: string, message: any) {
    const connection = activeConnections.get(jobId);
    if (
      connection &&
      connection.websocket.readyState === WebSocket.READY_STATE_OPEN
    ) {
      this.sendMessage(connection.websocket, message);
    }
  }

  /**
   * Send progress update to connected clients
   */
  sendProgressUpdate(
    jobId: string,
    progress: number,
    status: string,
    additionalData?: any
  ) {
    // 🐛 FIX: Add detailed logging for progress updates
    console.log(
      `📊 WebSocket: Sending progress update for job ${jobId}: ${progress}% (${status})`
    );

    const message = {
      type: 'progress_update',
      payload: {
        jobId,
        progress,
        status,
        timestamp: Date.now(),
        ...additionalData,
      },
    };

    this.broadcastToJob(jobId, message);
    console.log(
      `📤 WebSocket: Progress update sent to ${this.getConnectionCountForJob(jobId)} clients`
    );
  }

  /**
   * Send completion notification
   */
  sendCompletion(
    jobId: string,
    downloadUrl: string,
    filename: string,
    metadata?: any
  ) {
    // 🐛 FIX: Add detailed logging for completion
    console.log(
      `🎉 WebSocket: Sending completion notification for job ${jobId}`
    );
    console.log(`📁 File: ${filename}, URL: ${downloadUrl}`);

    const message = {
      type: 'conversion_completed',
      payload: {
        jobId,
        status: 'completed',
        progress: 100,
        downloadUrl,
        filename,
        metadata,
        timestamp: Date.now(),
      },
    };

    this.broadcastToJob(jobId, message);
    console.log(
      `📤 WebSocket: Completion notification sent to ${this.getConnectionCountForJob(jobId)} clients`
    );

    // 🐛 FIX: Extend cleanup delay to ensure message delivery
    setTimeout(() => {
      console.log(
        `🧹 WebSocket: Cleaning up connections for completed job ${jobId}`
      );
      this.removeConnectionByJobId(jobId);
    }, 10000); // Keep connection for 10 seconds after completion to ensure message delivery
  }

  /**
   * Send error message (simple version for backward compatibility)
   */
  private sendError(websocket: WebSocket, error: string) {
    try {
      if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
        this.sendMessage(websocket, {
          type: 'error',
          payload: { error },
        });
      } else {
        console.warn('Cannot send error - WebSocket not open:', error);
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      // Try to close the connection if sending fails
      try {
        websocket.close(1011, 'Error sending message');
      } catch (closeError) {
        console.error(
          'Failed to close WebSocket after send error:',
          closeError
        );
      }
    }
  }

  /**
   * Send enhanced error message with details and suggestions
   */
  sendEnhancedError(
    jobId: string,
    errorDetails: {
      message: string;
      suggestion?: string;
      canRetry?: boolean;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      errorType?: string;
      retryDelay?: number;
    }
  ) {
    this.broadcastToJob(jobId, {
      type: 'conversion_error',
      payload: {
        jobId,
        error: errorDetails.message,
        suggestion: errorDetails.suggestion,
        canRetry: errorDetails.canRetry || false,
        severity: errorDetails.severity || 'medium',
        errorType: errorDetails.errorType,
        retryDelay: errorDetails.retryDelay,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send recovery attempt notification
   */
  sendRecoveryAttempt(jobId: string, recoveryAction: string, message: string) {
    this.broadcastToJob(jobId, {
      type: 'recovery_attempt',
      payload: {
        jobId,
        action: recoveryAction,
        message,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send recovery success notification
   */
  sendRecoverySuccess(jobId: string, message: string) {
    this.broadcastToJob(jobId, {
      type: 'recovery_success',
      payload: {
        jobId,
        message,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send recovery failure notification
   */
  sendRecoveryFailure(jobId: string, message: string) {
    this.broadcastToJob(jobId, {
      type: 'recovery_failure',
      payload: {
        jobId,
        message,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send message to WebSocket with enhanced error handling
   */
  private sendMessage(websocket: WebSocket, message: any) {
    const connectionId = (websocket as any).__connectionId || 'unknown';

    try {
      if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
        const messageStr = JSON.stringify(message);
        websocket.send(messageStr);

        // Log message for debugging (only in development)
        if (this.env.ENVIRONMENT === 'development') {
          console.log(`📤 Sent message [${connectionId}]:`, message.type);
        }
      } else {
        console.warn(
          `Cannot send message - WebSocket not open [${connectionId}]. State: ${websocket.readyState}`
        );

        // Clean up connection if it's in a bad state
        if (
          websocket.readyState === WebSocket.READY_STATE_CLOSED ||
          websocket.readyState === WebSocket.READY_STATE_CLOSING
        ) {
          this.removeConnection(websocket);
        }
      }
    } catch (error) {
      console.error(`Failed to send message [${connectionId}]:`, error);

      // Log the error for monitoring
      this.logConnectionError(
        connectionId,
        'MESSAGE_SEND_ERROR',
        error as Error
      );

      // Try to close the connection gracefully
      try {
        if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
          websocket.close(1011, 'Message send error');
        }
      } catch (closeError) {
        console.error(
          `Failed to close WebSocket after send error [${connectionId}]:`,
          closeError
        );
      }

      // Clean up the connection
      this.removeConnection(websocket);
    }
  }

  /**
   * Remove connection by job ID
   */
  private removeConnectionByJobId(jobId: string) {
    activeConnections.delete(jobId);
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    return activeConnections.size;
  }

  /**
   * Get connection count for a specific job
   */
  private getConnectionCountForJob(jobId: string): number {
    return activeConnections.has(jobId) ? 1 : 0;
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    for (const [jobId, connection] of activeConnections.entries()) {
      if (connection.websocket.readyState !== WebSocket.READY_STATE_OPEN) {
        activeConnections.delete(jobId);
        connectionHealth.delete(connection.websocket);
      }
    }
  }

  /**
   * Update connection health when receiving ping
   */
  private updateConnectionHealth(websocket: WebSocket) {
    const health = connectionHealth.get(websocket);
    if (health) {
      health.lastPong = Date.now();
      health.pingCount++;
      health.isHealthy = true;
    } else {
      // Initialize health tracking for new connection
      connectionHealth.set(websocket, {
        lastPing: 0,
        lastPong: Date.now(),
        pingCount: 1,
        isHealthy: true,
        connectionId: this.generateConnectionId(),
      });
    }
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck() {
    const now = Date.now();
    const unhealthyConnections: WebSocket[] = [];

    for (const [websocket, health] of connectionHealth.entries()) {
      // Check if connection is stale (no pong received within timeout)
      if (now - health.lastPong > this.PING_TIMEOUT) {
        health.isHealthy = false;
        unhealthyConnections.push(websocket);
      }
    }

    // Close unhealthy connections
    for (const websocket of unhealthyConnections) {
      console.log('🔌 Closing unhealthy WebSocket connection');
      try {
        websocket.close(1000, 'Health check failed');
      } catch (error) {
        console.error('Error closing unhealthy connection:', error);
      }
      connectionHealth.delete(websocket);
    }

    // Log health statistics
    const totalConnections = connectionHealth.size;
    const healthyConnections = Array.from(connectionHealth.values()).filter(
      h => h.isHealthy
    ).length;

    if (totalConnections > 0) {
      console.log(
        `📊 WebSocket Health: ${healthyConnections}/${totalConnections} healthy connections`
      );
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection health statistics
   */
  getHealthStats() {
    const stats = {
      totalConnections: connectionHealth.size,
      healthyConnections: 0,
      unhealthyConnections: 0,
      averagePingCount: 0,
    };

    let totalPings = 0;
    for (const health of connectionHealth.values()) {
      if (health.isHealthy) {
        stats.healthyConnections++;
      } else {
        stats.unhealthyConnections++;
      }
      totalPings += health.pingCount;
    }

    if (stats.totalConnections > 0) {
      stats.averagePingCount = Math.round(totalPings / stats.totalConnections);
    }

    return stats;
  }

  /**
   * Log connection errors for monitoring
   */
  private logConnectionError(
    connectionId: string,
    errorType: string,
    error: Error
  ) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      connectionId,
      errorType,
      message: error.message,
      stack: error.stack,
    };

    console.error('🚨 WebSocket Connection Error:', errorLog);

    // TODO: Send to monitoring service
    // await this.sendToMonitoring('websocket_error', errorLog);
  }

  /**
   * Log connection close events
   */
  private logConnectionClose(
    connectionId: string,
    code: number,
    reason: string
  ) {
    const closeLog = {
      timestamp: new Date().toISOString(),
      connectionId,
      code,
      reason,
      isNormalClose: code === 1000,
    };

    console.log('📊 WebSocket Connection Closed:', closeLog);

    // TODO: Send to analytics
    // await this.sendToAnalytics('websocket_close', closeLog);
  }

  /**
   * Clean up connection-specific resources
   */
  private cleanupConnectionResources(
    websocket: WebSocket,
    connectionId: string
  ) {
    try {
      // Remove from health tracking
      connectionHealth.delete(websocket);

      // Remove from active connections
      for (const [jobId, connection] of activeConnections.entries()) {
        if (connection.websocket === websocket) {
          activeConnections.delete(jobId);
          console.log(
            `🧹 Cleaned up job subscription: ${jobId} [${connectionId}]`
          );
          break;
        }
      }

      // Clean up any job subscriptions
      for (const [jobId, subscribers] of this.jobSubscriptions.entries()) {
        if (subscribers.has(websocket)) {
          subscribers.delete(websocket);
          console.log(
            `🧹 Removed WebSocket from job ${jobId} subscribers [${connectionId}]`
          );

          // Remove empty subscription sets
          if (subscribers.size === 0) {
            this.jobSubscriptions.delete(jobId);
            console.log(`🧹 Removed empty subscription set for job ${jobId}`);
          }
        }
      }

      console.log(`✅ Connection resources cleaned up [${connectionId}]`);
    } catch (error) {
      console.error(
        `❌ Error cleaning up connection resources [${connectionId}]:`,
        error
      );
    }
  }

  /**
   * Enhanced connection removal with better error handling
   */
  private removeConnection(websocket: WebSocket) {
    const connectionId = (websocket as any).__connectionId || 'unknown';

    try {
      // Close WebSocket if still open
      if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
        websocket.close(1000, 'Server cleanup');
      }

      // Remove from connections map
      for (const [id, ws] of this.connections.entries()) {
        if (ws === websocket) {
          this.connections.delete(id);
          console.log(`🧹 Removed connection ${id} [${connectionId}]`);
          break;
        }
      }
    } catch (error) {
      console.error(`❌ Error removing connection [${connectionId}]:`, error);
    }
  }

  /**
   * Graceful shutdown of all connections
   */
  async gracefulShutdown() {
    console.log('🔄 Starting graceful WebSocket shutdown...');

    const shutdownPromises: Promise<void>[] = [];

    // Close all active connections
    for (const [id, websocket] of this.connections.entries()) {
      shutdownPromises.push(
        new Promise<void>(resolve => {
          try {
            if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
              websocket.close(1001, 'Server shutdown');
            }
            resolve();
          } catch (error) {
            console.error(`Error closing connection ${id}:`, error);
            resolve();
          }
        })
      );
    }

    // Wait for all connections to close (with timeout)
    await Promise.race([
      Promise.all(shutdownPromises),
      new Promise(resolve => setTimeout(resolve, 5000)), // 5 second timeout
    ]);

    // Clean up resources
    this.destroy();

    console.log('✅ WebSocket graceful shutdown completed');
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Clear all tracking data
    connectionHealth.clear();
    activeConnections.clear();
    this.connections.clear();
    this.jobSubscriptions.clear();

    console.log('🧹 WebSocketManager destroyed');
  }
}

// Global WebSocket manager instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(env: Env): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(env);
  }
  return wsManager;
}
