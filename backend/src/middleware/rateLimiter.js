import rateLimit from 'express-rate-limit';
import { logAudit, AuditActions } from '../services/auditService.js';

// Rate limiter for login endpoint (5 attempts per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log rate limit exceeded events
  handler: async (req, res) => {
    await logAudit({
      userId: null,
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      entityType: 'Auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: 900
      }
    });
  }
});

// Rate limiter for registration endpoint (3 attempts per hour)
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: 3600 // 1 hour in seconds
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for password reset request (3 attempts per hour)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.',
      retryAfter: 3600 // 1 hour in seconds
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: 900
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// T125: Rate limiter for tournament rules modification (20 changes per 15 minutes)
export const ruleModificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 rule changes
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many rule modification requests. Please try again later.',
      retryAfter: 900
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count successful requests (not errors)
  skipFailedRequests: true
});

export default {
  loginLimiter,
  registrationLimiter,
  passwordResetLimiter,
  apiLimiter,
  ruleModificationLimiter
};
