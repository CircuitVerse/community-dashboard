/**
 * Structured logger utility for consistent logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

class StructuredLogger implements Logger {
  constructor(private enabled: boolean = true, private minLevel: LogLevel = 'info') {}

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(this.minLevel);
    
    return currentLevelIndex >= minLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
    const timestamp = new Date().toISOString();
    const logEntry: Record<string, unknown> = {
      timestamp,
      level: level.toUpperCase(),
      message,
    };
    
    if (context) {
      logEntry.context = context;
    }
    
    if (error) {
      logEntry.error = error instanceof Error 
        ? { message: error.message, stack: error.stack } 
        : error;
    }
    
    return logEntry;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(JSON.stringify(this.formatMessage('debug', message, context)));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(JSON.stringify(this.formatMessage('info', message, context)));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.formatMessage('warn', message, context)));
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.formatMessage('error', message, context, error)));
    }
  }
}

/**
 * Creates a logger instance with specified configuration
 * @param enabled - Whether logging is enabled
 * @param minLevel - Minimum log level to output
 * @returns Logger instance
 */
export function createLogger(enabled: boolean = true, minLevel: LogLevel = 'info'): Logger {
  return new StructuredLogger(enabled, minLevel);
}

/**
 * Default logger instance for general use
 */
export const logger = createLogger(process.env.NODE_ENV !== 'test');