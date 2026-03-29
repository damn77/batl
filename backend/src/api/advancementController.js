/**
 * Advancement Controller
 *
 * HTTP request handlers for group-to-knockout advancement in COMBINED format tournaments.
 * Delegates all business logic to advancementService.
 *
 * Endpoints:
 *   GET    /api/v1/tournaments/:id/advancement/preview  — compute waterfall preview (read-only)
 *   POST   /api/v1/tournaments/:id/advancement           — confirm and generate brackets (201)
 *   DELETE /api/v1/tournaments/:id/advancement           — revert advancement (200)
 *
 * Feature: 30-combined-format-advancement, Plan 02
 * Requirements: COMB-01, COMB-07, ADV-03, ADV-04
 *
 * Error code → HTTP status mapping:
 *   TOURNAMENT_NOT_FOUND     → 404
 *   NO_BRACKETS              → 404
 *   INVALID_FORMAT           → 400
 *   INVALID_STATUS           → 400
 *   INVALID_BRACKET_SIZE     → 400
 *   NO_ADVANCEMENT_CONFIG    → 400
 *   UNRESOLVED_TIES          → 409
 *   ALREADY_ADVANCED         → 409
 *   MATCHES_HAVE_RESULTS     → 409
 *
 * ADV-04 note: mainBracketSize and secondaryBracketSize (part of formatConfig) are already
 * protected from modification once the tournament has IN_PROGRESS/COMPLETED matches by the
 * FORMAT_CHANGE_NOT_ALLOWED guard in tournamentRulesService.setTournamentFormat(). No
 * additional guard is needed here.
 */

import {
  computeAdvancementPreview,
  confirmAdvancement,
  revertAdvancement
} from '../services/advancementService.js';

/**
 * Map a service error code to an HTTP status code.
 *
 * @param {string} code - Machine-readable error code from service
 * @returns {number} HTTP status code
 */
function mapErrorToStatus(code) {
  switch (code) {
    case 'TOURNAMENT_NOT_FOUND':
    case 'NO_BRACKETS':
      return 404;
    case 'INVALID_FORMAT':
    case 'INVALID_STATUS':
    case 'INVALID_BRACKET_SIZE':
    case 'NO_ADVANCEMENT_CONFIG':
      return 400;
    case 'UNRESOLVED_TIES':
    case 'ALREADY_ADVANCED':
    case 'MATCHES_HAVE_RESULTS':
      return 409;
    default:
      return 500;
  }
}

/**
 * GET /api/v1/tournaments/:id/advancement/preview
 *
 * Compute waterfall advancement preview: assign group finishers to main/secondary/eliminated slots.
 * Read-only — does not persist any changes.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export async function previewAdvancement(req, res, next) {
  try {
    const { id } = req.params;
    const preview = await computeAdvancementPreview(id);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    const status = mapErrorToStatus(err.code);
    if (status !== 500) {
      return res.status(status).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
      });
    }
    return next(err);
  }
}

/**
 * POST /api/v1/tournaments/:id/advancement
 *
 * Confirm advancement: atomically generate main and secondary knockout brackets
 * from group standings. Returns 201 on success.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export async function handleConfirmAdvancement(req, res, next) {
  try {
    const { id } = req.params;
    const result = await confirmAdvancement(id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = mapErrorToStatus(err.code);
    if (status !== 500) {
      return res.status(status).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
      });
    }
    return next(err);
  }
}

/**
 * DELETE /api/v1/tournaments/:id/advancement
 *
 * Revert advancement: delete generated brackets and unlock group phase.
 * Blocked if any knockout matches have results (MATCHES_HAVE_RESULTS → 409).
 * Returns 404 if no brackets exist (NO_BRACKETS).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export async function handleRevertAdvancement(req, res, next) {
  try {
    const { id } = req.params;
    const result = await revertAdvancement(id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = mapErrorToStatus(err.code);
    if (status !== 500) {
      return res.status(status).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
      });
    }
    return next(err);
  }
}
