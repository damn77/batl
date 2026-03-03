/**
 * Consolation Opt-Out Controller
 *
 * Handles POST /api/v1/tournaments/:id/consolation-opt-out
 * Delegates business logic to consolationOptOutService.
 *
 * Phase: 05-loser-routing-and-consolation-progression
 * Requirement: LIFE-05
 */

import { recordOptOut } from '../services/consolationOptOutService.js';

/**
 * POST /api/v1/tournaments/:id/consolation-opt-out
 *
 * Request body:
 *   - playerId: string (required for singles; omit for doubles)
 *   - pairId: string (required for doubles; omit for singles)
 *
 * Authorization:
 *   - ORGANIZER/ADMIN: can opt out any player/pair
 *   - PLAYER: can only opt out themselves (singles) or their pair (doubles)
 *
 * Responses:
 *   201 { success: true, data: ConsolationOptOut } — opt-out recorded
 *   400 MISSING_ENTITY — neither playerId nor pairId provided
 *   400 AMBIGUOUS_ENTITY — both playerId and pairId provided
 *   400 NOT_CONSOLATION_TOURNAMENT — tournament is not MATCH_2
 *   403 NOT_AUTHORIZED — player attempting to opt out someone else
 *   404 TOURNAMENT_NOT_FOUND — tournament does not exist
 *   409 ALREADY_OPTED_OUT — duplicate opt-out attempt
 *   409 NEXT_MATCH_ALREADY_PLAYED — consolation match already completed
 */
export async function recordConsolationOptOut(req, res, next) {
  try {
    const tournamentId = req.params.id;
    const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(req.user.role);
    const submitterPlayerId = req.user.playerId;
    const { playerId, pairId } = req.body;

    // Validate that exactly one of playerId or pairId is provided
    if (!playerId && !pairId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ENTITY',
          message: 'Provide either playerId (singles) or pairId (doubles)'
        }
      });
    }

    if (playerId && pairId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AMBIGUOUS_ENTITY',
          message: 'Provide playerId OR pairId, not both'
        }
      });
    }

    const optOut = await recordOptOut({
      tournamentId,
      playerId: playerId || null,
      pairId: pairId || null,
      isOrganizer,
      submitterPlayerId
    });

    return res.status(201).json({ success: true, data: optOut });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
    next(err);
  }
}
