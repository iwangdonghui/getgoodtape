// 优化的日志记录工具
// 在生产环境中自动禁用日志，在开发环境中提供更好的日志格式

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'debug',
      prefix: '',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): [string, ...any[]] {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const levelIcon = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';
    const formattedMessage = `${levelIcon} ${timestamp} ${prefix}${message}`;

    return [formattedMessage, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  // 性能监控日志
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(
        `⏱️ ${this.config.prefix ? `[${this.config.prefix}] ` : ''}${label}`
      );
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(
        `⏱️ ${this.config.prefix ? `[${this.config.prefix}] ` : ''}${label}`
      );
    }
  }

  // 分组日志
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(
        `📁 ${this.config.prefix ? `[${this.config.prefix}] ` : ''}${label}`
      );
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // 表格日志
  table(data: any): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }
}

// 创建预配置的日志器实例
export const logger = new Logger();

// 为不同模块创建专用日志器
export const createLogger = (
  prefix: string,
  config?: Partial<LoggerConfig>
) => {
  return new Logger({ ...config, prefix });
};

// 专用日志器
export const apiLogger = createLogger('API');
export const conversionLogger = createLogger('CONVERSION');
export const performanceLogger = createLogger('PERFORMANCE');
export const debugLogger = createLogger('DEBUG');

// 性能监控装饰器
export function logPerformance<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: any[]) => {
    const functionName = name || fn.name || 'anonymous';
    performanceLogger.time(functionName);

    try {
      const result = fn(...args);

      // 如果是 Promise，等待完成后记录时间
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceLogger.timeEnd(functionName);
        });
      }

      performanceLogger.timeEnd(functionName);
      return result;
    } catch (error) {
      performanceLogger.timeEnd(functionName);
      performanceLogger.error(`${functionName} failed:`, error);
      throw error;
    }
  }) as T;
}

// 批量日志记录（避免过多的单独日志调用）
export class BatchLogger {
  private logs: Array<{ level: LogLevel; message: string; args: any[] }> = [];
  private timer: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(logger: Logger = new Logger()) {
    this.logger = logger;
  }

  add(level: LogLevel, message: string, ...args: any[]): void {
    this.logs.push({ level, message, args });

    // 延迟批量输出
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, 100);
  }

  flush(): void {
    if (this.logs.length === 0) return;

    this.logger.group(`Batch Logs (${this.logs.length} items)`);

    this.logs.forEach(({ level, message, args }) => {
      this.logger[level](message, ...args);
    });

    this.logger.groupEnd();
    this.logs = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// 条件日志记录
export const conditionalLog = (
  condition: boolean,
  level: LogLevel,
  message: string,
  ...args: any[]
) => {
  if (condition) {
    logger[level](message, ...args);
  }
};

// 频率限制日志记录
export class RateLimitedLogger {
  private lastLogTime = new Map<string, number>();
  private logger: Logger;

  constructor(logger: Logger = new Logger()) {
    this.logger = logger;
  }

  log(
    key: string,
    level: LogLevel,
    message: string,
    intervalMs: number = 1000,
    ...args: any[]
  ): void {
    const now = Date.now();
    const lastTime = this.lastLogTime.get(key) || 0;

    if (now - lastTime >= intervalMs) {
      this.logger[level](message, ...args);
      this.lastLogTime.set(key, now);
    }
  }
}

export const rateLimitedLogger = new RateLimitedLogger();

// 导出默认日志器
export default logger;
