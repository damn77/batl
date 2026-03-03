/**
 * Match Controller
 *
 * Express request handler for match result submission.
 * Delegates business logic to matchResultService.
 *
 * Feature: 01-match-result-submission (Plan 01)
 * Feature: 06.1-match-result-resubmission (Plan 01)
 *
 * Exports:
 *   - submitMatchResult: Handler for PATCH /api/v1/matches/:id/result
 */

import * as matchResultService from '../services/matchResultService.js';

/**
 * PATCH /api/v1/matches/:id/result
 *
 * Submit or override a match result. Authenticated users only.
 *
 * Players:
 *   - Must be a match participant (player1, player2, or a pair member)
 *   - Cannot update the result if an organizer has already set it (ORGANIZER_LOCKED)
 *   - Cannot record special outcomes
 *
 * Organizers (ADMIN / ORGANIZER):
 *   - Can submit or override any match result at any time
 *   - Can record special outcomes (WALKOVER, FORFEIT, NO_SHOW)
 *   - Their submissions lock the match from further player edits
 *
 * submittedBy is NEVER read from the request body — always derived from req.user.role.
 */
export async function submitMatchResult(req, res, next) {
  try {
    const matchId = req.params.id;
    const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(req.user.role);
    const submitterPlayerId = req.user.playerId; // null for organizers without a player profile

    // Guard: only organizers may record special outcomes
    const isSpecialOutcome = !!req.body.outcome;
    if (isSpecialOutcome && !isOrganizer) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only organizers can record special outcomes'
        }
      });
    }

    // BB-04: Parse dry-run query parameter — passed through to matchResultService
    const dryRun = req.query.dryRun === 'true';

    const result = await matchResultService.submitResult({
      matchId,
      body: req.body,
      isOrganizer,
      submitterPlayerId,
      dryRun
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    // BB-04: Dry-run result — transaction was rolled back, return impact data
    if (err.code === 'DRY_RUN_RESULT') {
      return res.status(200).json({
        success: true,
        data: err.data
      });
    }

    // Structured errors from matchResultService carry statusCode and code
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      });
    }
    // Unexpected errors go to the global error handler
    next(err);
  }
}
