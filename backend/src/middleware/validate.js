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
  }),

  // Category schemas (002-category-system)
  categoryCreation: Joi.object({
    type: Joi.string().valid('SINGLES', 'DOUBLES').required()
      .messages({
        'any.only': 'Type must be SINGLES or DOUBLES',
        'any.required': 'Type is required'
      }),
    ageGroup: Joi.string().valid(
      'ALL_AGES',
      'AGE_20', 'AGE_25', 'AGE_30', 'AGE_35', 'AGE_40', 'AGE_45', 'AGE_50',
      'AGE_55', 'AGE_60', 'AGE_65', 'AGE_70', 'AGE_75', 'AGE_80'
    ).required()
      .messages({
        'any.only': 'Age group must be a valid value (ALL_AGES, AGE_20...AGE_80)',
        'any.required': 'Age group is required'
      }),
    gender: Joi.string().valid('MEN', 'WOMEN', 'MIXED').required()
      .messages({
        'any.only': 'Gender must be MEN, WOMEN, or MIXED',
        'any.required': 'Gender is required'
      }),
    description: Joi.string().max(500).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      })
  }),

  categoryUpdate: Joi.object({
    description: Joi.string().max(500).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      })
  }),

  categoryListQuery: Joi.object({
    type: Joi.string().valid('SINGLES', 'DOUBLES').optional(),
    ageGroup: Joi.string().valid(
      'ALL_AGES',
      'AGE_20', 'AGE_25', 'AGE_30', 'AGE_35', 'AGE_40', 'AGE_45', 'AGE_50',
      'AGE_55', 'AGE_60', 'AGE_65', 'AGE_70', 'AGE_75', 'AGE_80'
    ).optional(),
    gender: Joi.string().valid('MEN', 'WOMEN', 'MIXED').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
  }),

  // Tournament schemas (002-category-system, extended 003-tournament-registration)
  tournamentCreation: Joi.object({
    // Required fields (from 002-category-system)
    name: Joi.string().min(3).max(200).trim().required()
      .messages({
        'string.min': 'Tournament name must be at least 3 characters',
        'string.max': 'Tournament name cannot exceed 200 characters',
        'any.required': 'Tournament name is required'
      }),
    categoryId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Category ID must be a valid UUID',
        'any.required': 'Category ID is required'
      }),
    startDate: Joi.date().iso().required()
      .messages({
        'date.base': 'Start date must be a valid date',
        'any.required': 'Start date is required'
      }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
      .messages({
        'date.base': 'End date must be a valid date',
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date'
      }),

    // Optional fields (existing)
    description: Joi.string().max(1000).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 1000 characters'
      }),

    // Optional fields (NEW - Enhanced Details from 003)
    location: Joi.string().max(200).allow('').optional()
      .messages({
        'string.max': 'Location cannot exceed 200 characters'
      }),
    capacity: Joi.number().integer().min(1).max(1000).optional().allow(null)
      .messages({
        'number.base': 'Capacity must be a number',
        'number.integer': 'Capacity must be an integer',
        'number.min': 'Capacity must be at least 1',
        'number.max': 'Capacity cannot exceed 1000'
      }),
    organizerEmail: Joi.string().email().lowercase().trim().optional().allow('', null)
      .messages({
        'string.email': 'Organizer email must be a valid email address'
      }),
    organizerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
      .messages({
        'string.pattern.base': 'Organizer phone must be a valid phone number'
      }),
    entryFee: Joi.number().min(0).max(100000).optional().allow(null)
      .messages({
        'number.base': 'Entry fee must be a number',
        'number.min': 'Entry fee cannot be negative',
        'number.max': 'Entry fee cannot exceed 100000'
      }),
    rulesUrl: Joi.string().uri().max(500).optional().allow('', null)
      .messages({
        'string.uri': 'Rules URL must be a valid URL',
        'string.max': 'Rules URL cannot exceed 500 characters'
      }),
    prizeDescription: Joi.string().max(1000).optional().allow('', null)
      .messages({
        'string.max': 'Prize description cannot exceed 1000 characters'
      }),
    registrationOpenDate: Joi.date().iso().optional().allow(null)
      .messages({
        'date.base': 'Registration open date must be a valid date'
      }),
    registrationCloseDate: Joi.date().iso().min(Joi.ref('registrationOpenDate')).optional().allow(null)
      .messages({
        'date.base': 'Registration close date must be a valid date',
        'date.min': 'Registration close date must be after registration open date'
      }),
    minParticipants: Joi.number().integer().min(2).max(1000).optional().allow(null)
      .messages({
        'number.base': 'Minimum participants must be a number',
        'number.integer': 'Minimum participants must be an integer',
        'number.min': 'Minimum participants must be at least 2',
        'number.max': 'Minimum participants cannot exceed 1000'
      }),
    waitlistDisplayOrder: Joi.string().valid('REGISTRATION_TIME', 'ALPHABETICAL').optional()
      .messages({
        'any.only': 'Waitlist display order must be REGISTRATION_TIME or ALPHABETICAL'
      })
  }),

  tournamentUpdate: Joi.object({
    // Existing fields
    name: Joi.string().min(3).max(200).trim().optional(),
    categoryId: Joi.string().uuid().optional()
      .messages({
        'string.guid': 'Category ID must be a valid UUID'
      }),
    description: Joi.string().max(1000).allow('').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),

    // Enhanced fields (NEW - 003-tournament-registration)
    location: Joi.string().max(200).allow('', null).optional(),
    capacity: Joi.number().integer().min(1).max(1000).optional().allow(null),
    organizerEmail: Joi.string().email().lowercase().trim().optional().allow('', null),
    organizerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null),
    entryFee: Joi.number().min(0).max(100000).optional().allow(null),
    rulesUrl: Joi.string().uri().max(500).optional().allow('', null),
    prizeDescription: Joi.string().max(1000).optional().allow('', null),
    registrationOpenDate: Joi.date().iso().optional().allow(null),
    registrationCloseDate: Joi.date().iso().optional().allow(null),
    minParticipants: Joi.number().integer().min(2).max(1000).optional().allow(null),
    waitlistDisplayOrder: Joi.string().valid('REGISTRATION_TIME', 'ALPHABETICAL').optional()
  }).min(1),

  tournamentListQuery: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
    startDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
  }),

  // Registration schemas (002-category-system)
  registrationCreation: Joi.object({
    playerId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Player ID must be a valid UUID',
        'any.required': 'Player ID is required'
      }),
    categoryId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Category ID must be a valid UUID',
        'any.required': 'Category ID is required'
      })
  }),

  checkEligibility: Joi.object({
    playerId: Joi.string().uuid().required(),
    categoryId: Joi.string().uuid().required()
  }),

  playerRegistrationsQuery: Joi.object({
    status: Joi.string().valid('ACTIVE', 'WITHDRAWN', 'SUSPENDED').optional(),
    include: Joi.string().pattern(/^(category|ranking)(,category|,ranking)*$/).optional()
  }),

  categoryRegistrationsQuery: Joi.object({
    status: Joi.string().valid('ACTIVE', 'WITHDRAWN', 'SUSPENDED').optional(),
    include: Joi.string().pattern(/^player$/).optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(200).default(50).optional()
  }),

  withdrawalRequest: Joi.object({
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  bulkRegistration: Joi.object({
    playerId: Joi.string().uuid().required(),
    categoryIds: Joi.array().items(Joi.string().uuid()).min(1).max(10).required()
      .messages({
        'array.min': 'At least one category ID is required',
        'array.max': 'Maximum 10 categories allowed per bulk registration'
      })
  }),

  // Ranking schemas (002-category-system)
  categoryLeaderboardQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(200).default(10).optional(),
    offset: Joi.number().integer().min(0).default(0).optional()
  }),

  // Tournament Registration schemas (003-tournament-registration)
  tournamentRegistrationParams: Joi.object({
    tournamentId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Tournament ID must be a valid UUID',
        'any.required': 'Tournament ID is required'
      })
  }),

  tournamentUnregistrationParams: Joi.object({
    tournamentId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Tournament ID must be a valid UUID',
        'any.required': 'Tournament ID is required'
      })
  }),

  // Waitlist schemas (003-tournament-registration)
  waitlistQuery: Joi.object({
    orderBy: Joi.string().valid('registration', 'alphabetical').optional()
      .messages({
        'any.only': 'Order by must be either "registration" or "alphabetical"'
      })
  }),

  waitlistPromotionBody: Joi.object({
    reason: Joi.string().max(500).optional().allow('', null)
      .messages({
        'string.max': 'Reason cannot exceed 500 characters'
      })
  }),

  waitlistDemotionBody: Joi.object({
    reason: Joi.string().max(500).optional().allow('', null)
      .messages({
        'string.max': 'Reason cannot exceed 500 characters'
      })
  }),

  registrationParams: Joi.object({
    registrationId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Registration ID must be a valid UUID',
        'any.required': 'Registration ID is required'
      })
  })
};

export default {
  validateBody,
  validateQuery,
  schemas
};
