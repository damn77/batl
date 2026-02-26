/**
 * Match Result Validator
 *
 * Joi schemas for validating match result submission and special outcome recording.
 * Feature: 01-match-result-submission (Plan 01)
 *
 * Exports:
 *   - submitResultSchema: Validates SETS and BIG_TIEBREAK result submissions
 *   - submitSpecialOutcomeSchema: Validates organizer-only special outcome recording
 */

import Joi from 'joi';

// Schema for a single set in SETS format
const setSchema = Joi.object({
  setNumber: Joi.number().integer().min(1).max(5).required(),
  player1Score: Joi.number().integer().min(0).max(7).required(),
  player2Score: Joi.number().integer().min(0).max(7).required(),
  tiebreakScore: Joi.number().integer().min(0).max(99).allow(null).default(null)
});

// Schema for a single set in BIG_TIEBREAK (super tiebreak) format
// One score must be >= 10, and the difference must be >= 2
const bigTiebreakSetSchema = Joi.object({
  setNumber: Joi.number().integer().min(1).max(3).required(),
  player1Score: Joi.number().integer().min(0).required(),
  player2Score: Joi.number().integer().min(0).required()
}).custom((value, helpers) => {
  const max = Math.max(value.player1Score, value.player2Score);
  const diff = Math.abs(value.player1Score - value.player2Score);
  if (max < 10 || diff < 2) {
    return helpers.error('any.invalid', {
      message: 'Super tiebreak score invalid (must have winner >= 10 and lead >= 2)'
    });
  }
  return value;
});

/**
 * Schema for submitting a regular match result (SETS or BIG_TIEBREAK format).
 * Used by both players and organizers for scored matches.
 */
export const submitResultSchema = Joi.object({
  formatType: Joi.string().valid('SETS', 'BIG_TIEBREAK').required(),
  winner: Joi.string().valid('PLAYER1', 'PLAYER2').required(),
  sets: Joi.when('formatType', {
    is: 'SETS',
    then: Joi.array().items(setSchema).min(1).max(5).required(),
    otherwise: Joi.array().items(bigTiebreakSetSchema).min(1).max(3).required()
  })
});

/**
 * Schema for recording a special outcome (organizer only).
 * No sets are required — just the outcome type and winner designation.
 */
export const submitSpecialOutcomeSchema = Joi.object({
  outcome: Joi.string().valid('WALKOVER', 'FORFEIT', 'NO_SHOW').required(),
  winner: Joi.string().valid('PLAYER1', 'PLAYER2').required()
});
