/**
 * Seeding Placement Validation Schemas
 *
 * Joi validation schemas for seeding placement API endpoints.
 * Feature: 010-seeding-placement
 */

import Joi from 'joi';

/**
 * Schema for generate bracket request
 * POST /api/v1/seeding/generate-bracket
 */
export const generateBracketSchema = Joi.object({
  tournamentId: Joi.string().optional().allow(null),
  categoryId: Joi.string().required().messages({
    'any.required': 'categoryId is required',
    'string.empty': 'categoryId cannot be empty'
  }),
  playerCount: Joi.number().integer().min(4).max(128).required().messages({
    'any.required': 'playerCount is required',
    'number.base': 'playerCount must be a number',
    'number.integer': 'playerCount must be an integer',
    'number.min': 'playerCount must be at least 4',
    'number.max': 'playerCount must be at most 128'
  }),
  randomSeed: Joi.string().optional().allow(null),
  unseededPlayers: Joi.array().optional().allow(null)
});
