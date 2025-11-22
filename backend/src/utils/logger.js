/**
 * Simple Logger Utility
 * Feature: 006-doubles-pairs - Phase 7 (T083)
 *
 * Provides structured logging for backend operations.
 * In production, this could be extended to use Winston, Pino, or send to external services.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Set minimum log level from environment (default: INFO for production, DEBUG for development)
const MIN_LEVEL = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * Format log message with timestamp and metadata
 */
function formatLog(level, category, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(metadata).length > 0
    ? ` ${JSON.stringify(metadata)}`
    : '';

  return `[${timestamp}] [${level}] [${category}] ${message}${metaStr}`;
}

/**
 * Log a debug message
 */
export function debug(category, message, metadata = {}) {
  if (LOG_LEVELS.DEBUG >= MIN_LEVEL) {
    console.debug(formatLog('DEBUG', category, message, metadata));
  }
}

/**
 * Log an info message
 */
export function info(category, message, metadata = {}) {
  if (LOG_LEVELS.INFO >= MIN_LEVEL) {
    console.info(formatLog('INFO', category, message, metadata));
  }
}

/**
 * Log a warning message
 */
export function warn(category, message, metadata = {}) {
  if (LOG_LEVELS.WARN >= MIN_LEVEL) {
    console.warn(formatLog('WARN', category, message, metadata));
  }
}

/**
 * Log an error message
 */
export function error(category, message, metadata = {}) {
  if (LOG_LEVELS.ERROR >= MIN_LEVEL) {
    console.error(formatLog('ERROR', category, message, metadata));
  }
}

/**
 * Create a logger instance for a specific category
 */
export function createLogger(category) {
  return {
    debug: (message, metadata) => debug(category, message, metadata),
    info: (message, metadata) => info(category, message, metadata),
    warn: (message, metadata) => warn(category, message, metadata),
    error: (message, metadata) => error(category, message, metadata),
  };
}

// Pre-configured loggers for pair operations
export const pairLogger = createLogger('PAIR');
export const pairRegistrationLogger = createLogger('PAIR_REGISTRATION');
export const pairRankingLogger = createLogger('PAIR_RANKING');

export default {
  debug,
  info,
  warn,
  error,
  createLogger,
  pairLogger,
  pairRegistrationLogger,
  pairRankingLogger,
};
