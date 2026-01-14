import winston from 'winston';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Write logs to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Audit event types
export const AuditActions = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Player profiles
  PLAYER_PROFILE_CREATED: 'PLAYER_PROFILE_CREATED',
  PLAYER_PROFILE_UPDATED: 'PLAYER_PROFILE_UPDATED',
  PLAYER_PROFILE_LINKED: 'PLAYER_PROFILE_LINKED',

  // Password management
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // Authorization
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // System
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Tournament seeding (Feature 010)
  BRACKET_GENERATED: 'BRACKET_GENERATED',
  SEEDING_SCORE_CALCULATED: 'SEEDING_SCORE_CALCULATED'
};

// Log audit event to database
export const logAudit = async ({
  userId = null,
  action,
  entityType = null,
  entityId = null,
  changes = null,
  ipAddress,
  userAgent = null,
  metadata = {}
}) => {
  try {
    // Log to Winston
    logger.info('Audit event', {
      userId,
      action,
      entityType,
      entityId,
      ipAddress,
      metadata
    });

    // Store in database
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    // Log error but don't fail the request
    logger.error('Failed to log audit event', {
      error: error.message,
      action,
      userId
    });
  }
};

// Middleware to automatically log audit events
export const auditMiddleware = (action, entityType = null) => {
  return async (req, res, next) => {
    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to log audit after successful response
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract entity ID from response or request
        const entityId = data?.id || data?.user?.id || data?.player?.id || req.params.id;

        // Log audit event asynchronously (don't wait)
        logAudit({
          userId: req.user?.id,
          action,
          entityType,
          entityId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        }).catch(error => {
          logger.error('Audit logging failed', { error: error.message });
        });
      }

      // Call original json function
      return originalJson(data);
    };

    next();
  };
};

// Get audit logs for a specific user
export const getUserAuditLogs = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    action = null,
    startDate = null,
    endDate = null
  } = options;

  const where = { userId };

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export default {
  logger,
  logAudit,
  auditMiddleware,
  getUserAuditLogs,
  AuditActions
};
