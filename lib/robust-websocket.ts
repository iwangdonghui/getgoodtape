/**
 * RobustWebSocket - WebSocket with automatic reconnection and enhanced error handling
 */

export interface RobustWebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectDecay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  debug?: boolean;
}

export interface ConnectionState {
  status:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'failed';
  reconnectAttempts: number;
  lastConnected?: Date;
  lastError?: string;
  latency?: number;
}

export type MessageHandler = (data: any) => void;
export type StateChangeHandler = (state: ConnectionState) => void;

export class RobustWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<RobustWebSocketOptions>;
  private state: ConnectionState;
  private messageHandlers = new Map<string, MessageHandler[]>();
  private stateChangeHandlers: StateChangeHandler[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private isManualClose = false;

  // 🐛 FIX: Enhanced connection recovery and message delivery
  private messageQueue: any[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private connectionId: string;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private lastSuccessfulConnection: number = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(url: string, options: RobustWebSocketOptions = {}) {
    this.url = url;
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectInterval: options.reconnectInterval ?? 1000,
      maxReconnectInterval: options.maxReconnectInterval ?? 30000,
      reconnectDecay: options.reconnectDecay ?? 1.5,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      connectionTimeout: options.connectionTimeout ?? 10000,
      debug: options.debug ?? false,
    };

    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0,
    };

    // 🐛 FIX: Generate unique connection ID for tracking
    this.connectionId = this.generateConnectionId();

    this.log('RobustWebSocket initialized', {
      url,
      options: this.options,
      connectionId: this.connectionId,
    });

    // 🐛 FIX: Start periodic health checks
    this.startHealthCheck();
  }

  /**
   * Connect to WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    this.isManualClose = false;
    this.updateState({ status: 'connecting' });
    this.log('Attempting to connect...');

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
      this.startConnectionTimeout();
    } catch (error) {
      this.log('Failed to create WebSocket', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isManualClose = true;
    this.clearAllTimers();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    // 🐛 FIX: Clear message queue on manual disconnect
    this.messageQueue = [];

    this.updateState({ status: 'disconnected', reconnectAttempts: 0 });
    this.log('Manually disconnected');
  }

  /**
   * Send message with enhanced error handling and queuing
   */
  send(data: any): boolean {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        this.log('Message sent successfully', { type: data.type || 'unknown' });

        // 🐛 FIX: Reset consecutive failures on successful send
        this.consecutiveFailures = 0;

        // 🐛 FIX: Process any queued messages
        this.processMessageQueue();

        return true;
      } else {
        // 🐛 FIX: Queue message if not connected but connection is being attempted
        if (
          this.state.status === 'connecting' ||
          this.state.status === 'reconnecting'
        ) {
          this.queueMessage(data);
          this.log('Message queued - connection in progress', {
            type: data.type || 'unknown',
          });
          return true; // Return true as message is queued
        } else {
          this.log('Cannot send message - not connected', {
            status: this.state.status,
            readyState: this.ws?.readyState,
          });
          return false;
        }
      }
    } catch (error) {
      this.log('Failed to send message', error);
      this.consecutiveFailures++;

      // 🐛 FIX: If too many consecutive failures, trigger reconnection
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.log('Too many consecutive send failures, triggering reconnection');
        this.handleConnectionError(
          new Error('Multiple send failures detected')
        );
      }

      return false;
    }
  }

  /**
   * Add message handler
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Remove message handler
   */
  off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add state change handler
   */
  onStateChange(handler: StateChangeHandler): void {
    this.stateChangeHandlers.push(handler);
  }

  /**
   * Remove state change handler
   */
  offStateChange(handler: StateChangeHandler): void {
    const index = this.stateChangeHandlers.indexOf(handler);
    if (index > -1) {
      this.stateChangeHandlers.splice(index, 1);
    }
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.clearConnectionTimeout();

      // 🐛 FIX: Record successful connection time
      this.lastSuccessfulConnection = Date.now();
      this.consecutiveFailures = 0;

      this.updateState({
        status: 'connected',
        reconnectAttempts: 0,
        lastConnected: new Date(),
        lastError: undefined,
      });

      this.log('Connected successfully');
      this.startHeartbeat();

      // 🐛 FIX: Process any queued messages
      this.processMessageQueue();
    };

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        this.log('Failed to parse message', error);
      }
    };

    this.ws.onclose = event => {
      this.clearTimers();
      this.log('Connection closed', { code: event.code, reason: event.reason });

      // Enhanced error handling for specific close codes
      if (event.code === 1006) {
        this.log(
          'Connection closed abnormally (1006) - possible network/CORS issue'
        );
        this.updateState({
          lastError:
            'Connection closed abnormally - check network/firewall settings',
        });
      } else if (event.code === 1002) {
        this.log('Protocol error (1002)');
        this.updateState({
          lastError: 'WebSocket protocol error',
        });
      } else if (event.code === 1011) {
        this.log('Server error (1011)');
        this.updateState({
          lastError: 'Server encountered an error',
        });
      }

      if (!this.isManualClose) {
        this.handleConnectionLoss(event);
      }
    };

    this.ws.onerror = error => {
      this.log('WebSocket error', error);
      this.updateState({
        lastError: 'WebSocket connection error - check network connectivity',
      });
      this.handleConnectionError(new Error('WebSocket connection error'));
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: any): void {
    // Handle pong response for latency calculation
    if (data.type === 'pong' && this.lastPingTime) {
      const latency = Date.now() - this.lastPingTime;
      this.updateState({ latency });
      this.log('Latency measured', { latency });
    }

    // Dispatch to registered handlers
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log('Message handler error', error);
        }
      });
    }

    // Dispatch to catch-all handlers
    const allHandlers = this.messageHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log('Catch-all handler error', error);
        }
      });
    }
  }

  /**
   * Handle connection loss and attempt reconnection
   */
  private handleConnectionLoss(event: CloseEvent): void {
    if (event.code === 1000) {
      // Normal closure
      this.updateState({ status: 'disconnected' });
      return;
    }

    if (this.state.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.updateState({
        status: 'failed',
        lastError: `Max reconnection attempts (${this.options.maxReconnectAttempts}) exceeded`,
      });
      this.log('Max reconnection attempts exceeded');
      return;
    }

    this.scheduleReconnection();
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.clearTimers();
    this.updateState({
      status: 'disconnected',
      lastError: error.message,
    });

    if (
      !this.isManualClose &&
      this.state.reconnectAttempts < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnection();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    const attempt = this.state.reconnectAttempts + 1;
    const delay = Math.min(
      this.options.reconnectInterval *
        Math.pow(this.options.reconnectDecay, attempt - 1),
      this.options.maxReconnectInterval
    );

    this.updateState({
      status: 'reconnecting',
      reconnectAttempts: attempt,
    });

    this.log(`Scheduling reconnection attempt ${attempt} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping', timestamp: this.lastPingTime });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Start connection timeout
   */
  private startConnectionTimeout(): void {
    this.connectionTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.CONNECTING) {
        this.ws.close();
        this.handleConnectionError(new Error('Connection timeout'));
      }
    }, this.options.connectionTimeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearConnectionTimeout();
  }

  /**
   * Update state and notify handlers
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(this.state);
      } catch (error) {
        this.log('State change handler error', error);
      }
    });
  }

  /**
   * 🐛 FIX: Queue message for later delivery
   */
  private queueMessage(data: any): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest message to make room
      this.messageQueue.shift();
      this.log('Message queue full, removed oldest message');
    }

    this.messageQueue.push({
      data,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  /**
   * 🐛 FIX: Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    if (
      this.messageQueue.length === 0 ||
      this.ws?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    this.log(`Processing ${this.messageQueue.length} queued messages`);

    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    for (const queuedMessage of messagesToProcess) {
      try {
        const message =
          typeof queuedMessage.data === 'string'
            ? queuedMessage.data
            : JSON.stringify(queuedMessage.data);

        this.ws!.send(message);
        this.log('Queued message sent', {
          type: queuedMessage.data.type || 'unknown',
        });
      } catch (error) {
        this.log('Failed to send queued message', error);

        // 🐛 FIX: Re-queue message if it failed and hasn't exceeded max attempts
        queuedMessage.attempts++;
        if (queuedMessage.attempts < 3) {
          this.messageQueue.push(queuedMessage);
        } else {
          this.log('Dropping message after max attempts', queuedMessage.data);
        }
      }
    }
  }

  /**
   * 🐛 FIX: Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute
  }

  /**
   * 🐛 FIX: Perform connection health check
   */
  private performHealthCheck(): void {
    const now = Date.now();

    // Check if connection has been down for too long
    if (
      this.state.status === 'disconnected' &&
      this.lastSuccessfulConnection > 0 &&
      now - this.lastSuccessfulConnection > 300000
    ) {
      // 5 minutes
      this.log('Connection has been down for too long, attempting recovery');
      if (!this.isManualClose) {
        this.connect();
      }
    }

    // Check for stale connections
    if (
      this.ws?.readyState === WebSocket.OPEN &&
      this.state.latency &&
      this.state.latency > 10000
    ) {
      // 10 seconds latency
      this.log('High latency detected, checking connection health');
      this.send({ type: 'ping', timestamp: Date.now() });
    }
  }

  /**
   * 🐛 FIX: Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🐛 FIX: Enhanced cleanup method
   */
  destroy(): void {
    this.isManualClose = true;
    this.clearAllTimers();

    if (this.ws) {
      this.ws.close(1000, 'Client cleanup');
      this.ws = null;
    }

    // Clear all handlers and queues
    this.messageHandlers.clear();
    this.stateChangeHandlers = [];
    this.messageQueue = [];

    this.log('RobustWebSocket destroyed');
  }

  /**
   * 🐛 FIX: Clear all timers including health check
   */
  private clearAllTimers(): void {
    this.clearTimers();

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: any): void {
    if (this.options.debug) {
      console.log(
        `[RobustWebSocket:${this.connectionId}] ${message}`,
        data || ''
      );
    }
  }
}
