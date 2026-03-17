/**
 * Joi validation schemas for group draw endpoints.
 *
 * Feature: 27-group-formation, Plan 02
 * Requirements: GFORM-01, GFORM-06
 */

import Joi from 'joi';

/**
 * Schema for POST /api/v1/tournaments/:id/group-draw
 * Validates the group draw generation request body.
 */
export const generateGroupDrawSchema = Joi.object({
  groupCount: Joi.number().integer().min(2).required()
    .messages({
      'number.base': 'groupCount must be a number',
      'number.integer': 'groupCount must be an integer',
      'number.min': 'groupCount must be at least 2',
      'any.required': 'groupCount is required'
    }),
  seededRounds: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'seededRounds must be a number',
      'number.integer': 'seededRounds must be an integer',
      'number.min': 'seededRounds cannot be negative'
    }),
  randomSeed: Joi.string().optional()
});

/**
 * Schema for POST /api/v1/tournaments/:id/group-draw/swap
 * Validates the participant swap request body.
 */
export const swapGroupParticipantsSchema = Joi.object({
  participantAId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'participantAId must be a valid UUID',
      'any.required': 'participantAId is required'
    }),
  participantBId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'participantBId must be a valid UUID',
      'any.required': 'participantBId is required'
    })
});
