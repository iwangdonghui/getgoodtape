import { Context } from 'hono';
import { Env } from '../types';
import { ConversionService } from '../utils/conversion-service';
import { JobManager } from '../utils/job-manager';

interface WebSocketConnection {
  websocket: WebSocket;
  jobId: string;
  userId?: string;
}

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocketConnection>();

export class WebSocketManager {
  private env: Env;
  private conversionService: ConversionService;
  private jobManager: JobManager;

  constructor(env: Env) {
    this.env = env;
    this.conversionService = new ConversionService(env);
    this.jobManager = new JobManager(env);
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

      // Create WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());

      // Accept the WebSocket connection
      server.accept();

      // Set up event handlers
      this.setupWebSocketHandlers(server);

      // Return the client WebSocket to the browser
      return new Response(null, {
        status: 101,
        webSocket: client,
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
    websocket.addEventListener('message', async event => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(websocket, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
        this.sendError(websocket, 'Invalid message format');
      }
    });

    websocket.addEventListener('close', event => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.removeConnection(websocket);
    });

    websocket.addEventListener('error', event => {
      console.error('WebSocket error:', event);
      this.removeConnection(websocket);
    });
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
        this.sendMessage(websocket, { type: 'pong', timestamp: Date.now() });
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
   * Send error message
   */
  private sendError(websocket: WebSocket, error: string) {
    this.sendMessage(websocket, {
      type: 'error',
      payload: { error },
    });
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(websocket: WebSocket, message: any) {
    if (websocket.readyState === WebSocket.READY_STATE_OPEN) {
      websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Remove connection
   */
  private removeConnection(websocket: WebSocket) {
    for (const [jobId, connection] of activeConnections.entries()) {
      if (connection.websocket === websocket) {
        activeConnections.delete(jobId);
        break;
      }
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
      }
    }
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
