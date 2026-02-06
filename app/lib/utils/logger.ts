/**
 * Centralized logging utility for App Builder
 * Allows easy toggling of log levels and reduces console clutter
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'error';

const shouldLog = (level: LogLevel): boolean => {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) >= levels.indexOf(LOG_LEVEL);
};

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  },
  
  // Special formatted logs for common patterns
  request: (endpoint: string, data?: unknown) => {
    if (shouldLog('debug')) {
      console.log(`[REQUEST] ${endpoint}`, data || '');
    }
  },
  
  response: (endpoint: string, status: number, data?: unknown) => {
    if (shouldLog('debug')) {
      console.log(`[RESPONSE] ${endpoint} ${status}`, data || '');
    }
  },
  
  fileCreated: (path: string) => {
    if (shouldLog('info')) {
      console.log(`[FILE] Created: ${path}`);
    }
  },
  
  fileError: (path: string, error: string) => {
    logger.error(`[FILE] Failed: ${path}`, error);
  },
};
