/**
 * Bracket Persistence Controller
 *
 * Request handlers for the three bracket persistence API endpoints:
 *   - closeTournamentRegistration: PATCH /api/v1/tournaments/:id/close-registration
 *   - generateTournamentBracket:   POST  /api/v1/tournaments/:id/bracket
 *   - swapBracketSlots:            PATCH /api/v1/tournaments/:id/bracket/slots
 *
 * Feature: Phase 01.1 - Bracket Generation and Seeding Persistence
 * Requirements: DRAW-08
 */

import {
  closeRegistration,
  generateBracket,
  swapSlots
} from '../services/bracketPersistenceService.js';

/**
 * Map service error codes to HTTP status codes.
 * Any code not listed here falls through to the global error handler (500).
 */
const ERROR_STATUS = {
  TOURNAMENT_NOT_FOUND: 404,
  REGISTRATION_NOT_CLOSED: 409,
  ALREADY_CLOSED: 409,
  BRACKET_LOCKED: 409,
  BYE_SLOT_NOT_SWAPPABLE: 422,
  INSUFFICIENT_PLAYERS: 422
};

/**
 * Handle a structured service error by mapping it to an HTTP response,
 * or forward unrecognized errors to Express's global error handler.
 *
 * @param {Error} error - Error thrown by a service function (may have .code)
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware
 */
function handleServiceError(error, res, next) {
  const status = ERROR_STATUS[error.code];
  if (status) {
    return res.status(status).json({
      success: false,
      error: { code: error.code, message: error.message }
    });
  }
  // Unrecognized error — delegate to global error handler
  next(error);
}

/**
 * PATCH /api/v1/tournaments/:id/close-registration
 *
 * Closes tournament registration so bracket generation can proceed.
 * Requires: tournament must exist and registration must not already be closed.
 *
 * Response 200: { success: true, data: { registrationClosed: true } }
 * Response 404: TOURNAMENT_NOT_FOUND
 * Response 409: ALREADY_CLOSED
 */
export async function closeTournamentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    await closeRegistration(id);
    res.json({ success: true, data: { registrationClosed: true } });
  } catch (error) {
    handleServiceError(error, res, next);
  }
}

/**
 * POST /api/v1/tournaments/:id/bracket
 *
 * Generates a seeded bracket and persists Bracket + Round + Match records.
 * Body (optional): { randomSeed?, doublesMethod? }
 *
 * Response 201: { success: true, data: { bracketId, roundCount, matchCount } }
 * Response 404: TOURNAMENT_NOT_FOUND
 * Response 409: REGISTRATION_NOT_CLOSED | BRACKET_LOCKED
 * Response 422: INSUFFICIENT_PLAYERS
 */
export async function generateTournamentBracket(req, res, next) {
  try {
    const { id } = req.params;
    const { randomSeed, doublesMethod } = req.body;
    const result = await generateBracket(id, { randomSeed, doublesMethod });
    res.status(201).json({
      success: true,
      data: {
        bracketId: result.bracket.id,
        roundCount: result.roundCount,
        matchCount: result.matchCount
      }
    });
  } catch (error) {
    handleServiceError(error, res, next);
  }
}

/**
 * PATCH /api/v1/tournaments/:id/bracket/slots
 *
 * Atomically batch-swaps player slots across multiple matches.
 * Body: { swaps: [{ matchId, field, newPlayerId }] }
 *
 * Response 200: { success: true, data: { swapped: N } }
 * Response 404: TOURNAMENT_NOT_FOUND
 * Response 409: BRACKET_LOCKED
 * Response 422: BYE_SLOT_NOT_SWAPPABLE
 */
export async function swapBracketSlots(req, res, next) {
  try {
    const { id } = req.params;
    const { swaps } = req.body;
    const result = await swapSlots(id, swaps);
    res.json({ success: true, data: { swapped: result.swapped } });
  } catch (error) {
    handleServiceError(error, res, next);
  }
}
