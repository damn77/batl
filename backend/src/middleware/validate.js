import Joi from 'joi';
import { createValidationError } from './errorHandler.js';

// Middleware to validate request body against Joi schema
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details
        }
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

// Middleware to validate query parameters
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details
        }
      });
    }

    // Store validated query in a separate property since req.query is read-only
    req.validatedQuery = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Email validation
  email: Joi.string().email().lowercase().trim().required(),

  // Password validation (min 8 characters)
  password: Joi.string().min(8).max(128).required(),

  // UUID validation
  uuid: Joi.string().uuid().required(),

  // Role validation
  role: Joi.string().valid('ADMIN', 'ORGANIZER', 'PLAYER').required(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required()
  }),

  // Player self-registration
  register: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/(?=.*[a-z])/) // At least one lowercase
      .pattern(/(?=.*[A-Z])/) // At least one uppercase
      .pattern(/(?=.*\d)/)     // At least one digit
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
      }),
    name: Joi.string().min(2).max(100).trim().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
  }),

  // User registration (for players) - alias for backward compatibility
  playerRegistration: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required(),
    name: Joi.string().min(2).max(100).trim().required(),
    phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).optional()
  }),

  // User creation (by admin)
  userCreation: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid('ADMIN', 'ORGANIZER', 'PLAYER').required()
  }),

  // User update
  userUpdate: Joi.object({
    email: Joi.string().email().lowercase().trim().optional(),
    role: Joi.string().valid('ADMIN', 'ORGANIZER', 'PLAYER').optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional()
  }).min(1),

  // User list query
  userListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid('ADMIN', 'ORGANIZER', 'PLAYER').optional(),
    isActive: Joi.string().valid('true', 'false').optional()
  }),

  // Player profile creation
  playerProfileCreation: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().lowercase().trim().optional().allow('', null),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
  }),

  // Player profile update
  playerProfileUpdate: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    email: Joi.string().email().lowercase().trim().optional().allow('', null),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
  }).min(1),

  // Player list query
  playerListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(100).optional(),
    hasAccount: Joi.string().valid('true', 'false').optional()
  }),

  // Password reset request
  passwordResetRequest: Joi.object({
    email: Joi.string().email().lowercase().trim().required()
  }),

  // Password reset confirm
  passwordResetConfirm: Joi.object({
    token: Joi.string().length(64).hex().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
};

export default {
  validateBody,
  validateQuery,
  schemas
};
