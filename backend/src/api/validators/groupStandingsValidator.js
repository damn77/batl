/**
 * Joi validation schemas for group standings endpoints.
 *
 * Feature: 29-group-standings-and-tiebreakers, Plan 02
 * Requirements: GSTAND-04, GSTAND-05
 */

import Joi from 'joi';

/**
 * Schema for POST /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override
 * Validates the manual tie-resolution override request body.
 */
export const saveOverrideSchema = Joi.object({
  positions: Joi.array().items(
    Joi.object({
      entityId: Joi.string().uuid().required(),
      position: Joi.number().integer().min(1).required()
    })
  ).min(2).required()
    .messages({
      'array.min': 'positions must contain at least 2 entries',
      'any.required': 'positions is required'
    })
});
