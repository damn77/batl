/**
 * Group Draw Controller
 *
 * Handles HTTP requests for group draw generation and participant swap.
 * Delegates all business logic to groupPersistenceService.
 *
 * Feature: 27-group-formation, Plan 02
 * Requirements: GFORM-01 through GFORM-07
 */

import {
  generateGroupDraw as generateGroupDrawService,
  swapGroupParticipants as swapGroupParticipantsService
} from '../services/groupPersistenceService.js';

/**
 * Map a service error code to an HTTP status code.
 *
 * @param {string} code - Machine-readable error code from service
 * @returns {number} HTTP status code
 */
function mapErrorToStatus(code) {
  switch (code) {
    case 'TOURNAMENT_NOT_FOUND':
    case 'PARTICIPANT_NOT_FOUND':
      return 404;
    case 'REGISTRATION_NOT_CLOSED':
    case 'INVALID_GROUP_COUNT':
    case 'INSUFFICIENT_PLAYERS':
    case 'UNBALANCED_GROUPS':
    case 'SAME_GROUP_SWAP':
      return 400;
    case 'TOURNAMENT_LOCKED':
    case 'INVALID_STATUS':
      return 409;
    default:
      return 500;
  }
}

/**
 * POST /api/v1/tournaments/:id/group-draw
 *
 * Generate group draw for a tournament. Creates groups with snake-draft seeding
 * and round-robin fixtures for each group.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateDraw = async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const { groupCount, seededRounds, randomSeed } = req.body;

    const result = await generateGroupDrawService(tournamentId, {
      groupCount,
      seededRounds,
      randomSeed
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = mapErrorToStatus(err.code);
    return res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message
      }
    });
  }
};

/**
 * POST /api/v1/tournaments/:id/group-draw/swap
 *
 * Swap two participants between groups and regenerate fixtures for both
 * affected groups atomically.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const swapParticipants = async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const { participantAId, participantBId } = req.body;

    const result = await swapGroupParticipantsService(
      tournamentId,
      participantAId,
      participantBId
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = mapErrorToStatus(err.code);
    return res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message
      }
    });
  }
};
