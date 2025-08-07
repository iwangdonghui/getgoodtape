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

    this.log('RobustWebSocket initialized', { url, options: this.options });
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
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.updateState({ status: 'disconnected', reconnectAttempts: 0 });
    this.log('Manually disconnected');
  }

  /**
   * Send message
   */
  send(data: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        this.log('Message sent', data);
        return true;
      } catch (error) {
        this.log('Failed to send message', error);
        return false;
      }
    } else {
      this.log('Cannot send message - not connected');
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
      this.updateState({
        status: 'connected',
        reconnectAttempts: 0,
        lastConnected: new Date(),
        lastError: undefined,
      });
      this.log('Connected successfully');
      this.startHeartbeat();
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

      if (!this.isManualClose) {
        this.handleConnectionLoss(event);
      }
    };

    this.ws.onerror = error => {
      this.log('WebSocket error', error);
      this.handleConnectionError(new Error('WebSocket error'));
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
   * Log debug information
   */
  private log(message: string, data?: any): void {
    if (this.options.debug) {
      console.log(`[RobustWebSocket] ${message}`, data || '');
    }
  }
}
