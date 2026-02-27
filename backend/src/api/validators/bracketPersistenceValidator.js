/**
 * Joi validation schemas for bracket persistence API endpoints.
 *
 * Feature: Phase 01.1 - Bracket Generation and Seeding Persistence
 * Requirements: DRAW-08
 */

import Joi from 'joi';

/**
 * Schema for POST /api/v1/tournaments/:id/bracket
 * Validates optional randomSeed and doublesMethod parameters.
 */
export const generateBracketSchema = Joi.object({
  randomSeed: Joi.string().optional(),
  doublesMethod: Joi.string().valid('PAIR_SCORE', 'AVERAGE_SCORE').optional().default('PAIR_SCORE')
});

/**
 * Schema for PATCH /api/v1/tournaments/:id/bracket/slots
 * Validates the swaps array — each swap must target a specific match field.
 */
export const swapSlotsSchema = Joi.object({
  swaps: Joi.array().items(
    Joi.object({
      matchId: Joi.string().uuid().required(),
      field: Joi.string().valid('player1Id', 'player2Id').required(),
      newPlayerId: Joi.string().uuid().allow(null).required()
    })
  ).min(1).required()
});
